import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useCollectionStore } from '@/store/useCollectionStore';
import { useMemoStore } from '@/store/useMemoStore';
import { useThemeStore } from '@/store/useThemeStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const load = useMemoStore((s) => s.load);
  const loadCollections = useCollectionStore((s) => s.load);
  const hydrateTheme = useThemeStore((s) => s.hydrate);

  // Apply the saved appearance before first paint so there's no light flash.
  useEffect(() => {
    hydrateTheme();
  }, [hydrateTheme]);

  useEffect(() => {
    Promise.all([load(), loadCollections()]).finally(() => SplashScreen.hideAsync());
  }, [load, loadCollections]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
