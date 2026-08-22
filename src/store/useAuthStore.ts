import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

/**
 * Auth state for Pinote's sharing features. Sign-in is optional — personal memos
 * work without an account; this only gates groups / shared maps.
 *
 * Providers: Apple / Google (native id-token → supabase.auth.signInWithIdToken)
 * plus an anonymous dev sign-in for testing the group + realtime flow early.
 */

const extra = Constants.expoConfig?.extra ?? {};
const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId as string | undefined;
const GOOGLE_IOS_CLIENT_ID = extra.googleIosClientId as string | undefined;

const isPlaceholder = (v?: string) => !v || v.startsWith('REPLACE');

/** True once the Google OAuth client IDs are filled into app.json `extra`. */
export const GOOGLE_READY = !isPlaceholder(GOOGLE_WEB_CLIENT_ID) && !isPlaceholder(GOOGLE_IOS_CLIENT_ID);

/**
 * Apple sign-in is iOS-only and needs the Sign in with Apple entitlement, which
 * requires the paid Apple Developer Program. Flip `appleSignInEnabled` to true in
 * app.json `extra` once the program + entitlement are set up.
 */
export const APPLE_READY = Platform.OS === 'ios' && extra.appleSignInEnabled === true;

let googleConfigured = false;
function configureGoogle() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID, // audience of the idToken Supabase verifies
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
  googleConfigured = true;
}

/** A user backing out of the OS sign-in sheet isn't an error — don't surface it. */
function isUserCancel(e: unknown): boolean {
  if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return true;
  const code = (e as { code?: string })?.code;
  return code === 'ERR_REQUEST_CANCELED';
}

type AuthStore = {
  session: Session | null;
  user: User | null;
  displayName: string;
  hydrated: boolean;
  busy: boolean;
  /** Load the persisted session and subscribe to auth changes. Call once at start. */
  hydrate: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Delete the account and all its data (App Store requirement), then sign out. */
  deleteAccount: () => Promise<void>;
  /** Create/refresh this user's profile row (used after sign-in). */
  ensureProfile: (name?: string) => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
};

let subscribed = false;

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  user: null,
  displayName: '',
  hydrated: false,
  busy: false,

  hydrate: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null, hydrated: true });
    if (data.session) void get().ensureProfile();

    if (!subscribed) {
      subscribed = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
      });
    }
  },

  signInWithApple: async () => {
    set({ busy: true });
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('Appleのトークンを取得できませんでした。');
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
      // Apple only sends the name on the very first authorization.
      const name = credential.fullName
        ? [credential.fullName.familyName, credential.fullName.givenName].filter(Boolean).join(' ')
        : undefined;
      await get().ensureProfile(name || undefined);
    } catch (e) {
      if (isUserCancel(e)) return;
      throw e;
    } finally {
      set({ busy: false });
    }
  },

  signInWithGoogle: async () => {
    set({ busy: true });
    try {
      configureGoogle();
      await GoogleSignin.hasPlayServices();
      const res = await GoogleSignin.signIn();
      if (!isSuccessResponse(res)) return; // user cancelled
      const idToken = res.data.idToken;
      if (!idToken) {
        throw new Error('GoogleのIDトークンを取得できませんでした（webClientIdの設定を確認）。');
      }
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
      if (error) throw error;
      await get().ensureProfile(res.data.user.name ?? undefined);
    } catch (e) {
      if (isUserCancel(e)) return;
      throw e;
    } finally {
      set({ busy: false });
    }
  },

  signInAnonymously: async () => {
    set({ busy: true });
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      await get().ensureProfile('ゲスト');
    } finally {
      set({ busy: false });
    }
  },

  signOut: async () => {
    set({ busy: true });
    try {
      // Also clear the Google native session so the next sign-in re-prompts.
      try {
        await GoogleSignin.signOut();
      } catch {
        // no active Google session — ignore
      }
      await supabase.auth.signOut();
      set({ session: null, user: null, displayName: '' });
    } finally {
      set({ busy: false });
    }
  },

  deleteAccount: async () => {
    set({ busy: true });
    try {
      const { error } = await supabase.rpc('delete_account');
      if (error) throw error;
      await supabase.auth.signOut();
      set({ session: null, user: null, displayName: '' });
    } finally {
      set({ busy: false });
    }
  },

  ensureProfile: async (name) => {
    const user = get().user ?? (await supabase.auth.getUser()).data.user;
    if (!user) return;
    // Read existing profile; create it (with a default name) if missing.
    const { data: existing } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    if (existing) {
      set({ displayName: existing.display_name ?? '' });
      return;
    }
    const displayName = name ?? 'ゲスト';
    await supabase.from('profiles').upsert({ id: user.id, display_name: displayName });
    set({ displayName });
  },

  setDisplayName: async (name) => {
    const user = get().user;
    if (!user) return;
    await supabase.from('profiles').update({ display_name: name }).eq('id', user.id);
    set({ displayName: name });
  },
}));
