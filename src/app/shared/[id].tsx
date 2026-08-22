import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/pinote/button';
import { RatingStars } from '@/components/pinote/rating-input';
import { getCategory } from '@/constants/categories';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupStore } from '@/store/useGroupStore';

/** Read-only detail for a memo on a group map, with author attribution, delete
 *  (author/owner), and a report action (UGC moderation). */
export default function SharedMemoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const sharedMemos = useGroupStore((s) => s.sharedMemos);
  const groups = useGroupStore((s) => s.groups);
  const removeSharedMemo = useGroupStore((s) => s.removeSharedMemo);

  const memo = sharedMemos.find((m) => m.id === id);

  if (!memo) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'メモ' }} />
        <View style={styles.center}>
          <Text style={styles.sub}>このメモは見つかりませんでした。</Text>
        </View>
      </View>
    );
  }

  const group = groups.find((g) => g.id === memo.groupId);
  const canDelete = memo.authorId === user?.id || group?.ownerId === user?.id;
  const cat = getCategory(memo.category);

  const onDelete = () => {
    Alert.alert('メモを削除', 'このグループのメモを削除します。よろしいですか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeSharedMemo(memo.id);
            router.back();
          } catch (e) {
            Alert.alert('削除できませんでした', String((e as Error)?.message ?? e));
          }
        },
      },
    ]);
  };

  const onReport = () => {
    Alert.alert('このメモを報告', '不適切な内容として運営に報告しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '報告する',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('reports').insert({ reporter_id: user?.id, memo_id: memo.id });
            Alert.alert('報告しました', 'ご協力ありがとうございます。24時間以内に確認します。');
          } catch {
            Alert.alert('送信できませんでした', 'しばらくして再度お試しください。');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: memo.title || 'メモ' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {memo.photoUrl && (
          <Image source={{ uri: memo.photoUrl }} style={styles.photo} contentFit="cover" />
        )}

        <View style={styles.titleRow}>
          <View style={[styles.catDot, { backgroundColor: cat.tint }]}>
            <Ionicons name={cat.icon} size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>{memo.title}</Text>
        </View>

        {memo.wantToGo && (
          <View style={styles.badge}>
            <Ionicons name="bookmark" size={13} color={colors.brand} />
            <Text style={styles.badgeText}>行きたい</Text>
          </View>
        )}

        <Text style={styles.author}>
          <Ionicons name="person-circle-outline" size={14} color={colors.subInk} /> {memo.authorName}
          {memo.authorId === user?.id ? '（あなた）' : ''}
        </Text>

        {memo.rating > 0 && (
          <View style={styles.rating}>
            <RatingStars value={memo.rating} onChange={() => {}} size={22} />
          </View>
        )}

        {memo.body.trim().length > 0 && <Text style={styles.body}>{memo.body}</Text>}

        {memo.tags.length > 0 && (
          <View style={styles.tags}>
            {memo.tags.map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>#{t}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          {canDelete && <Button label="メモを削除" variant="danger" onPress={onDelete} />}
          {memo.authorId !== user?.id && (
            <Button label="報告する" variant="ghost" onPress={onReport} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  sub: { fontSize: 15, color: colors.subInk, textAlign: 'center', lineHeight: 22 },
  content: { padding: 20, gap: 10 },
  photo: { width: '100%', height: 200, borderRadius: 16, backgroundColor: colors.surfaceMuted },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.ink },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.brandSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '800', color: colors.brand },
  author: { fontSize: 14, color: colors.subInk },
  rating: { marginTop: 2 },
  body: { fontSize: 16, color: colors.ink, lineHeight: 24, marginTop: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tag: { backgroundColor: colors.surfaceMuted, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 13, fontWeight: '600', color: colors.subInk },
  actions: { marginTop: 24, gap: 12 },
});
