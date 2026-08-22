import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ShareIntentProvider } from 'expo-share-intent';

import { ShareIntentHandler } from '@/components/pinote/share-intent-handler';
import { useAuthStore } from '@/store/useAuthStore';
import { useCollectionStore } from '@/store/useCollectionStore';
import { useMemoStore } from '@/store/useMemoStore';
import { useThemeStore } from '@/store/useThemeStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const load = useMemoStore((s) => s.load);
  const loadCollections = useCollectionStore((s) => s.load);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateAuth = useAuthStore((s) => s.hydrate);

  // Apply the saved appearance before first paint so there's no light flash.
  useEffect(() => {
    hydrateTheme();
  }, [hydrateTheme]);

  useEffect(() => {
    Promise.all([load(), loadCollections()]).finally(() => SplashScreen.hideAsync());
  }, [load, loadCollections]);

  // Restore any Supabase session (sharing features). Non-blocking — the app works
  // offline without an account.
  useEffect(() => {
    void hydrateAuth();
  }, [hydrateAuth]);

  return (
    <ShareIntentProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <ShareIntentHandler />
          <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="memo/new"
            options={{ presentation: 'modal', title: 'メモを作成' }}
          />
          <Stack.Screen name="memo/[id]" options={{ title: 'メモ' }} />
          <Stack.Screen name="search" options={{ presentation: 'modal', title: '場所を探す' }} />
          <Stack.Screen name="list" options={{ presentation: 'modal', title: 'ライブラリ' }} />
          <Stack.Screen
            name="collections/new"
            options={{ presentation: 'modal', title: 'コレクションを作成' }}
          />
          <Stack.Screen name="collections/[id]" options={{ title: 'コレクション' }} />
          <Stack.Screen name="backup" options={{ presentation: 'modal', title: 'バックアップ' }} />
          <Stack.Screen name="appearance" options={{ presentation: 'modal', title: '見た目' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal', title: '設定' }} />
          <Stack.Screen name="account" options={{ presentation: 'modal', title: 'アカウント' }} />
          <Stack.Screen name="groups/index" options={{ presentation: 'modal', title: '共有マップ' }} />
          <Stack.Screen name="groups/new" options={{ presentation: 'modal', title: 'グループを作成' }} />
          <Stack.Screen name="groups/invite" options={{ presentation: 'modal', title: '友達を招待' }} />
          <Stack.Screen name="groups/[id]" options={{ title: 'グループ' }} />
          <Stack.Screen name="shared/[id]" options={{ title: 'メモ' }} />
          <Stack.Screen name="join" options={{ presentation: 'modal', title: 'グループに参加' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </GestureHandlerRootView>
    </ShareIntentProvider>
  );
}
