import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/pinote/button';
import { colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupStore } from '@/store/useGroupStore';

/**
 * "Which map am I looking at?" — switch between the personal (local) map and any
 * group map, and manage groups (create / join / open details). Selecting a source
 * sets it active and jumps straight back to the map.
 */
export default function GroupsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const groups = useGroupStore((s) => s.groups);
  const loaded = useGroupStore((s) => s.loaded);
  const activeGroupId = useGroupStore((s) => s.activeGroupId);
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup);
  const loadGroups = useGroupStore((s) => s.loadGroups);
  const joinByCode = useGroupStore((s) => s.joinByCode);

  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) void loadGroups().catch(() => {});
  }, [user, loadGroups]);

  // Selecting a source switches the map in the background and returns to it at
  // once — memos load as the map appears, so there's no waiting on this screen.
  const pick = (id: string | null) => {
    void setActiveGroup(id);
    router.dismissAll();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadGroups();
    } finally {
      setRefreshing(false);
    }
  };

  const onJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    try {
      const id = await joinByCode(code);
      setCode('');
      pick(id);
    } catch {
      Alert.alert('参加できませんでした', 'コードが正しいか、期限切れでないか確認してください。');
      setJoining(false);
    }
  };

  const close = (
    <Pressable onPress={() => router.back()} hitSlop={10}>
      <Ionicons name="close" size={26} color={colors.brand} />
    </Pressable>
  );

  // Sharing requires an account.
  if (!user) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '共有マップ', headerLeft: () => close }} />
        <View style={styles.empty}>
          <Ionicons name="people-circle-outline" size={64} color={colors.faint} />
          <Text style={styles.emptyTitle}>友達・家族と地図を共有</Text>
          <Text style={styles.emptySub}>
            グループを作って招待すると、メンバー全員で同じ地図のメモを見られます。まずはサインインしてください。
          </Text>
          <Button label="サインイン / 新規登録" onPress={() => router.push('/account')} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '共有マップ', headerLeft: () => close }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Personal map — pinned at the very top, styled distinctly so it never
            gets lost as groups grow. */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <Pressable
            onPress={() => pick(null)}
            style={({ pressed }) => [
              styles.personalCard,
              activeGroupId === null && styles.personalCardActive,
              pressed && styles.pressed,
            ]}>
            <View style={styles.personalIcon}>
              <Ionicons name="person" size={22} color={colors.onAccent} />
            </View>
            <View style={styles.groupBody}>
              <Text style={styles.personalName}>自分の地図</Text>
              <Text style={styles.personalSub}>この端末だけの個人メモ</Text>
            </View>
            {activeGroupId === null && (
              <Ionicons name="checkmark-circle" size={24} color={colors.brand} />
            )}
          </Pressable>
        </Animated.View>

        <View style={styles.sharedHeader}>
          <View style={styles.sharedTitleRow}>
            <Ionicons name="people" size={16} color={colors.subInk} />
            <Text style={styles.section}>共有グループ</Text>
          </View>
          <Pressable onPress={() => void onRefresh()} hitSlop={8}>
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <Ionicons name="refresh" size={18} color={colors.brand} />
            )}
          </Pressable>
        </View>

        {!loaded ? (
          <ActivityIndicator style={{ marginVertical: 20 }} color={colors.brand} />
        ) : groups.length === 0 ? (
          <Animated.Text entering={FadeInDown} style={styles.hint}>
            まだグループがありません。作成するか、コードで参加しましょう。
          </Animated.Text>
        ) : (
          <View style={styles.group}>
            {groups.map((g, i) => (
              <Animated.View key={g.id} entering={FadeInDown.duration(280).delay(i * 45)}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.groupRow}>
                  <Pressable style={styles.groupRowMain} onPress={() => pick(g.id)}>
                    <View style={[styles.emojiWrap, { backgroundColor: g.color + '22' }]}>
                      <Text style={styles.emoji}>{g.icon}</Text>
                    </View>
                    <View style={styles.groupBody}>
                      <Text style={styles.groupName} numberOfLines={1}>
                        {g.name}
                      </Text>
                      <Text style={styles.groupSub}>
                        {g.ownerId === user.id ? 'オーナー' : 'メンバー'}
                      </Text>
                    </View>
                    {activeGroupId === g.id && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.brand} />
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => router.push({ pathname: '/groups/invite', params: { id: g.id } })}
                    hitSlop={6}
                    style={styles.iconBtn}>
                    <Ionicons name="person-add" size={19} color={colors.brand} />
                  </Pressable>
                  <Pressable
                    onPress={() => router.push({ pathname: '/groups/[id]', params: { id: g.id } })}
                    hitSlop={6}
                    style={styles.detailBtn}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.subInk} />
                  </Pressable>
                </View>
              </Animated.View>
            ))}
          </View>
        )}

        <Button
          label="新しいグループを作成"
          onPress={() => router.push('/groups/new')}
          style={{ marginTop: 10 }}
        />

        <Text style={[styles.section, { marginTop: 22 }]}>招待コードで参加</Text>
        <View style={styles.joinRow}>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="例: 7KQ4M2"
            placeholderTextColor={colors.subInk}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.codeInput}
            maxLength={12}
          />
          <Button label="参加" onPress={() => void onJoin()} loading={joining} disabled={!code.trim()} />
        </View>

        {user.is_anonymous && (
          <Text style={styles.anonNote}>
            ※ 今は匿名ログインです。端末を変えるとグループにアクセスできなくなります。設定→アカウントで
            Google サインインしておくと安全です。
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 8 },
  section: { fontSize: 13, fontWeight: '800', color: colors.subInk },

  // Personal map — a bold, distinct card so it stays recognisable above groups.
  personalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.hairline,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  personalCardActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  personalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalName: { fontSize: 17, fontWeight: '800', color: colors.ink },
  personalSub: { fontSize: 12, color: colors.subInk, marginTop: 1 },

  sharedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 2,
  },
  sharedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  group: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
  groupRow: { flexDirection: 'row', alignItems: 'center' },
  groupRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  iconBtn: { paddingHorizontal: 8, paddingVertical: 16 },
  detailBtn: { paddingLeft: 6, paddingRight: 14, paddingVertical: 16 },
  emojiWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
  groupBody: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '700', color: colors.ink },
  groupSub: { fontSize: 12, color: colors.subInk, marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginLeft: 66 },
  hint: { fontSize: 13, color: colors.subInk, paddingVertical: 8 },
  joinRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  anonNote: { fontSize: 12, color: colors.subInk, lineHeight: 18, marginTop: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  emptySub: { fontSize: 14, color: colors.subInk, textAlign: 'center', lineHeight: 21, marginBottom: 8 },
  pressed: { opacity: 0.7 },
});
