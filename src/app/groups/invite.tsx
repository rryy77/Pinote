import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/pinote/button';
import { colors } from '@/constants/colors';
import { useGroupStore } from '@/store/useGroupStore';

/** Invite deep link a friend taps to join (also works pasted as a plain code). */
const joinLink = (code: string) => `pinote://join?code=${code}`;

/**
 * One-tap invite: opened straight from a group's 招待 (person-add) button. It
 * issues a fresh code, copies it to the clipboard automatically, and offers copy
 * / share again — no digging through the group detail screen.
 */
export default function InviteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groups = useGroupStore((s) => s.groups);
  const createInvite = useGroupStore((s) => s.createInvite);
  const group = groups.find((g) => g.id === id);

  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  // Issue a code once and auto-copy it, so it's ready to paste immediately.
  useEffect(() => {
    if (!id || started.current) return;
    started.current = true;
    (async () => {
      try {
        const c = await createInvite(id);
        setCode(c);
        await Clipboard.setStringAsync(c);
        setCopied(true);
      } catch {
        setError(true);
      }
    })();
  }, [id, createInvite]);

  const onCopy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
  };

  const onShare = async () => {
    if (!code) return;
    await Share.share({
      message: `Pinote グループ「${group?.name ?? ''}」に招待します。\n参加コード: ${code}\nリンク: ${joinLink(code)}`,
    });
  };

  const close = (
    <Pressable onPress={() => router.back()} hitSlop={10}>
      <Ionicons name="close" size={26} color={colors.brand} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '友達を招待', headerLeft: () => close }} />
      <View style={styles.body}>
        <View style={[styles.icon, { backgroundColor: (group?.color ?? colors.brand) + '22' }]}>
          <Ionicons name="person-add" size={30} color={group?.color ?? colors.brand} />
        </View>
        <Text style={styles.title}>{group ? `「${group.name}」に招待` : '友達を招待'}</Text>

        {error ? (
          <>
            <Text style={styles.sub}>招待コードを作れませんでした。通信環境を確認してもう一度お試しください。</Text>
            <Button label="閉じる" variant="ghost" onPress={() => router.back()} />
          </>
        ) : !code ? (
          <ActivityIndicator color={colors.brand} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <Text style={styles.codeLabel}>参加コード</Text>
            <Pressable onPress={() => void onCopy()} style={styles.codeBox}>
              <Text style={styles.code}>{code}</Text>
            </Pressable>

            {copied && (
              <View style={styles.copiedRow}>
                <Ionicons name="checkmark-circle" size={15} color={colors.brand} />
                <Text style={styles.copiedText}>コピーしました</Text>
              </View>
            )}

            <View style={styles.actions}>
              <Button label={copied ? 'もう一度コピー' : 'コードをコピー'} onPress={() => void onCopy()} />
              <Button label="招待を共有" variant="ghost" onPress={() => void onShare()} />
            </View>

            <Text style={styles.hint}>
              相手は「共有マップ → 招待コードで参加」にこのコードを入力すると参加できます。
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 28, gap: 12 },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  sub: { fontSize: 15, color: colors.subInk, textAlign: 'center', lineHeight: 22, marginVertical: 8 },
  codeLabel: { fontSize: 13, fontWeight: '700', color: colors.subInk, marginTop: 8 },
  codeBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    marginTop: 2,
  },
  code: { fontSize: 40, fontWeight: '900', letterSpacing: 8, color: colors.brand },
  copiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copiedText: { fontSize: 13, fontWeight: '700', color: colors.brand },
  actions: { alignSelf: 'stretch', gap: 12, marginTop: 12 },
  hint: { fontSize: 13, color: colors.subInk, textAlign: 'center', lineHeight: 20, marginTop: 8 },
});
