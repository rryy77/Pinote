import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/pinote/button';
import { colors } from '@/constants/colors';
import * as groupsRepo from '@/cloud/groups';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupStore } from '@/store/useGroupStore';
import type { GroupMember } from '@/types/group';

/** Invite deep link a friend taps to join (also works pasted as a code). */
const joinLink = (code: string) => `pinote://join?code=${code}`;

/** Group detail: see members, share an invite, and leave/delete the group. */
export default function GroupDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const groups = useGroupStore((s) => s.groups);
  const leaveGroup = useGroupStore((s) => s.leaveGroup);
  const deleteGroup = useGroupStore((s) => s.deleteGroup);
  const createInvite = useGroupStore((s) => s.createInvite);

  const group = groups.find((g) => g.id === id);
  const isOwner = group?.ownerId === user?.id;

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    groupsRepo
      .listMembers(id)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const onInvite = async () => {
    if (!id) return;
    setInviting(true);
    try {
      const c = await createInvite(id);
      setCode(c);
    } catch (e) {
      Alert.alert('招待コードを作れませんでした', String((e as Error)?.message ?? e));
    } finally {
      setInviting(false);
    }
  };

  const onShare = async () => {
    if (!code) return;
    await Share.share({
      message: `Pinote グループ「${group?.name ?? ''}」に招待します。\nアプリで参加コード: ${code}\nリンク: ${joinLink(code)}`,
    });
  };

  const onLeave = () => {
    if (!id) return;
    Alert.alert('グループを退出', 'このグループの共有メモが見られなくなります。よろしいですか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '退出する',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await leaveGroup(id);
            router.back();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const onDelete = () => {
    if (!id) return;
    Alert.alert('グループを削除', 'メンバー全員のメモも含めて完全に削除されます。元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteGroup(id);
            router.back();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: group?.name ?? 'グループ' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {group && (
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: group.color + '22' }]}>
              <Text style={styles.emoji}>{group.icon}</Text>
            </View>
            <Text style={styles.name}>{group.name}</Text>
            <Text style={styles.role}>{isOwner ? 'あなたがオーナー' : 'メンバー'}</Text>
          </View>
        )}

        <Text style={styles.section}>友達を招待</Text>
        <View style={styles.card}>
          {code ? (
            <>
              <Text style={styles.codeLabel}>参加コード</Text>
              <Text style={styles.code}>{code}</Text>
              <Button label="招待を共有" onPress={() => void onShare()} />
              <Text style={styles.codeHint}>
                相手はこのコードを「共有マップ → 招待コードで参加」に入力すると参加できます。
              </Text>
            </>
          ) : (
            <Button label="招待コードを発行" onPress={() => void onInvite()} loading={inviting} />
          )}
        </View>

        <Text style={styles.section}>メンバー（{members.length}）</Text>
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            members.map((m, i) => (
              <View key={m.userId}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.memberRow}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={18} color={colors.brand} />
                  </View>
                  <Text style={styles.memberName}>
                    {m.displayName}
                    {m.userId === user?.id ? '（あなた）' : ''}
                  </Text>
                  {m.role === 'owner' && <Text style={styles.ownerTag}>オーナー</Text>}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.danger}>
          {isOwner ? (
            <Button label="グループを削除" variant="danger" onPress={onDelete} disabled={busy} />
          ) : (
            <Button label="グループを退出" variant="danger" onPress={onLeave} disabled={busy} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 6 },
  header: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 34 },
  name: { fontSize: 20, fontWeight: '800', color: colors.ink },
  role: { fontSize: 13, color: colors.subInk },
  section: { fontSize: 13, fontWeight: '800', color: colors.subInk, marginTop: 14, marginBottom: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 12 },
  codeLabel: { fontSize: 12, fontWeight: '700', color: colors.subInk, textAlign: 'center' },
  code: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 6,
    color: colors.brand,
    textAlign: 'center',
  },
  codeHint: { fontSize: 12, color: colors.subInk, lineHeight: 18, textAlign: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },
  ownerTag: { fontSize: 12, fontWeight: '700', color: colors.brand },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline },
  danger: { marginTop: 24 },
});
