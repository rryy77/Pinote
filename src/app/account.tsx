import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/pinote/button';
import { colors } from '@/constants/colors';
import { isSupabaseConfigured } from '@/lib/supabase';
import { APPLE_READY, GOOGLE_READY, useAuthStore } from '@/store/useAuthStore';

/**
 * Account / sign-in screen for the sharing features. Personal memos never need an
 * account; this only unlocks groups and shared maps.
 *
 * Apple / Google are the shipping providers (added once their provider config is
 * ready). The anonymous button is a dev shortcut to exercise the group + realtime
 * flow before those are wired.
 */
export default function AccountScreen() {
  const user = useAuthStore((s) => s.user);
  const displayName = useAuthStore((s) => s.displayName);
  const busy = useAuthStore((s) => s.busy);
  const signInWithApple = useAuthStore((s) => s.signInWithApple);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signInAnonymously = useAuthStore((s) => s.signInAnonymously);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const isAnon = user?.is_anonymous ?? false;

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      Alert.alert('サインインに失敗しました', String((e as Error)?.message ?? e));
    }
  };

  const confirmDelete = () => {
    Alert.alert('アカウントを削除', 'あなたの共有データ（作成したグループ・メモ）も削除されます。元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除する', style: 'destructive', onPress: () => void deleteAccount() },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'アカウント' }} />

      {!isSupabaseConfigured && (
        <View style={styles.warn}>
          <Ionicons name="warning-outline" size={16} color="#B45309" />
          <Text style={styles.warnText}>バックエンド未設定です（app.json の supabase キーを確認）。</Text>
        </View>
      )}

      {user ? (
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={colors.brand} />
          </View>
          <Text style={styles.name}>{displayName || 'ゲスト'}</Text>
          <Text style={styles.sub}>{isAnon ? 'テスト用ログイン（匿名）' : user.email ?? 'サインイン済み'}</Text>
          <Text style={styles.uid}>ID: {user.id.slice(0, 8)}…</Text>

          <Text style={styles.leadSub}>次のステップでグループ作成・招待・共有マップを追加します。</Text>
          <View style={styles.actions}>
            <Button label="サインアウト" variant="ghost" onPress={() => void signOut()} disabled={busy} />
            <Button label="アカウントを削除" variant="danger" onPress={confirmDelete} disabled={busy} />
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.lead}>友達・家族とメモを共有</Text>
          <Text style={styles.leadSub}>
            グループを作って招待すると、メンバー全員で同じ地図のメモを見られます。
          </Text>

          <View style={styles.actions}>
            <Button
              label={APPLE_READY ? 'Appleでサインイン' : 'Appleでサインイン（準備中）'}
              onPress={() => void run(signInWithApple)}
              disabled={!APPLE_READY || busy}
            />
            <Button
              label={GOOGLE_READY ? 'Googleでサインイン' : 'Googleでサインイン（設定待ち）'}
              variant="ghost"
              onPress={() => void run(signInWithGoogle)}
              disabled={!GOOGLE_READY || busy}
            />
            {!APPLE_READY && (
              <Text style={styles.hint}>
                Appleサインインは Apple Developer Program 登録後に有効になります。
              </Text>
            )}
            {!GOOGLE_READY && (
              <Text style={styles.hint}>
                Googleサインインは app.json にクライアントIDを設定すると有効になります。
              </Text>
            )}
            <View style={styles.divider} />
            <Button
              label="テスト用ログイン（匿名）"
              variant="ghost"
              onPress={() => void signInAnonymously()}
              loading={busy}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 20, gap: 16 },
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3E2',
    borderRadius: 12,
    padding: 12,
  },
  warnText: { color: '#B45309', fontSize: 13, flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  name: { fontSize: 20, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 14, color: colors.subInk },
  uid: { fontSize: 12, color: colors.faint, marginTop: 2 },
  lead: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 4 },
  leadSub: { fontSize: 14, color: colors.subInk, textAlign: 'center', lineHeight: 21 },
  hint: { fontSize: 12, color: colors.subInk, textAlign: 'center', lineHeight: 17 },
  actions: { alignSelf: 'stretch', gap: 12, marginTop: 18 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginVertical: 4 },
});
