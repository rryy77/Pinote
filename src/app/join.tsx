import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/pinote/button';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupStore } from '@/store/useGroupStore';

/**
 * Entry point for an invite deep link (`pinote://join?code=XXXX`). If signed in we
 * join automatically and drop the user onto that group's map; otherwise we ask
 * them to sign in first (the code is preserved and joined once they do).
 */
export default function JoinScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const joinByCode = useGroupStore((s) => s.joinByCode);
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup);

  const [status, setStatus] = useState<'idle' | 'joining' | 'error'>('idle');
  const attempted = useRef(false);

  useEffect(() => {
    if (!hydrated || !user || !code || attempted.current) return;
    attempted.current = true;
    setStatus('joining');
    (async () => {
      try {
        const id = await joinByCode(code);
        void setActiveGroup(id);
        router.replace('/');
      } catch {
        setStatus('error');
      }
    })();
  }, [hydrated, user, code, joinByCode, setActiveGroup, router]);

  const goHome = () => router.replace('/');

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'グループに参加' }} />
      <View style={styles.body}>
        {!code ? (
          <>
            <Ionicons name="alert-circle-outline" size={56} color={colors.faint} />
            <Text style={styles.title}>無効な招待リンクです</Text>
            <Button label="地図に戻る" onPress={goHome} />
          </>
        ) : !hydrated ? (
          <ActivityIndicator color={colors.brand} />
        ) : !user ? (
          <>
            <Ionicons name="people-circle-outline" size={56} color={colors.brand} />
            <Text style={styles.title}>グループへの招待</Text>
            <Text style={styles.sub}>参加コード: {code}</Text>
            <Text style={styles.sub}>参加するにはサインインが必要です。</Text>
            <Button label="サインイン / 新規登録" onPress={() => router.push('/account')} />
          </>
        ) : status === 'error' ? (
          <>
            <Ionicons name="alert-circle-outline" size={56} color={colors.faint} />
            <Text style={styles.title}>参加できませんでした</Text>
            <Text style={styles.sub}>コードが正しいか、期限切れでないか確認してください。</Text>
            <Button label="地図に戻る" onPress={goHome} />
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.sub}>グループに参加しています…</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 15, color: colors.subInk, textAlign: 'center', lineHeight: 22 },
});
