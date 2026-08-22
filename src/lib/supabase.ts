import 'react-native-url-polyfill/auto';

import { Directory, File, Paths } from 'expo-file-system';
import Constants from 'expo-constants';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client for Pinote's cloud sharing layer (groups, shared memos,
 * realtime). Personal memos stay in local SQLite; this is only for the social
 * features and is used lazily — screens/stores import {@link supabase}.
 *
 * The session is persisted on-device via expo-file-system (already a dependency),
 * so we avoid pulling in a native storage module and can iterate JS-only.
 */

// Public project config. The anon key is safe to ship in the client (all access
// is gated by Row Level Security). Prefer app.json `extra`, but fall back to the
// inline values so it works even when the embedded manifest is stale.
const FALLBACK_URL = 'https://ehiezxoqygqbchwfraqd.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoaWV6eG9xeWdxYmNod2ZyYXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyODQ5MDgsImV4cCI6MjEwMjg2MDkwOH0.LPei1o6oa0n3m3BrqwqYfDQM_4rKHHDG4CoVtHun6kc';

const extra = Constants.expoConfig?.extra ?? {};
const SUPABASE_URL = (extra.supabaseUrl as string | undefined) ?? FALLBACK_URL;
const SUPABASE_ANON_KEY = (extra.supabaseAnonKey as string | undefined) ?? FALLBACK_ANON_KEY;

/** True when the backend keys are configured; screens can gate cloud features. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// A tiny async key/value store backed by files in the app's document directory.
const AUTH_DIR = new Directory(Paths.document, 'sb-auth');
const authFile = (key: string) => new File(AUTH_DIR, `${encodeURIComponent(key)}.txt`);

const fileStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const f = authFile(key);
      return f.exists ? f.textSync() : null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (!AUTH_DIR.exists) AUTH_DIR.create();
      const f = authFile(key);
      if (f.exists) f.delete();
      f.create();
      f.write(value);
    } catch {
      // Persistence is best-effort; a failed write just means re-login next launch.
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      const f = authFile(key);
      if (f.exists) f.delete();
    } catch {
      // ignore
    }
  },
};

export const supabase: SupabaseClient = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '', {
  auth: {
    storage: fileStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL-based session detection on native (that's a web OAuth concern).
    detectSessionInUrl: false,
  },
});
