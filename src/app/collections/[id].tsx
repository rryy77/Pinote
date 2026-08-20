import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/pinote/button';
import { MemoRow } from '@/components/pinote/memo-row';
import { ProgressBar } from '@/components/pinote/progress-bar';
import { getCategory } from '@/constants/categories';
import { colors } from '@/constants/colors';
import { useCollectionStore } from '@/store/useCollectionStore';
import { useMemoStore } from '@/store/useMemoStore';
import type { CollectionItem } from '@/types/collection';

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const collection = useCollectionStore((s) => s.collections.find((c) => c.id === id));
  const allItems = useCollectionStore((s) => s.items);
  const addMemoAsItem = useCollectionStore((s) => s.addMemoAsItem);
  const removeItem = useCollectionStore((s) => s.removeItem);
  const removeCollection = useCollectionStore((s) => s.removeCollection);
  const memos = useMemoStore((s) => s.memos);

  const [pickerOpen, setPickerOpen] = useState(false);

  const items = useMemo(() => allItems.filter((i) => i.collectionId === id), [allItems, id]);

  const { candidates, visited } = useMemo(() => {
    const c: CollectionItem[] = [];
    const v: CollectionItem[] = [];
    for (const it of items) (it.visited ? v : c).push(it);
    return { candidates: c, visited: v };
  }, [items]);

  if (!collection) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'コレクション' }} />
        <Text style={styles.missingText}>コレクションが見つかりませんでした。</Text>
        <Button label="戻る" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const total = items.length;
  const done = visited.length;
  const ratio = total > 0 ? done / total : 0;
  const complete = total > 0 && done === total;

  const confirmDeleteCollection = () => {
    Alert.alert('コレクションを削除', `「${collection.name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await removeCollection(collection.id);
          router.back();
        },
      },
    ]);
  };

  const visitCandidate = (item: CollectionItem) =>
    router.push({
      pathname: '/memo/new',
      params: {
        lat: String(item.lat),
        lng: String(item.lng),
        title: item.title,
        collectionItemId: item.id,
      },
    });

  const memoOf = (memoId: string | null) => (memoId ? memos.find((m) => m.id === memoId) : undefined);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: collection.name,
          headerRight: () => (
            <Pressable onPress={confirmDeleteCollection} hitSlop={10}>
              <Ionicons name="trash-outline" size={22} color={colors.brand} />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Progress header */}
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: collection.color + '22' }]}>
            <Text style={styles.emoji}>{collection.icon}</Text>
          </View>
          <Text style={styles.name}>{collection.name}</Text>
          <View style={styles.progressRow}>
            <Text style={[styles.count, { color: collection.color }]}>
              {total === 0 ? '候補を追加しましょう' : `${done} / ${total} 制覇`}
            </Text>
            {complete && <Ionicons name="trophy" size={16} color={collection.color} />}
          </View>
          <View style={styles.barWrap}>
            <ProgressBar value={ratio} color={collection.color} height={10} />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <ActionChip
            icon="search"
            label="候補を追加"
            onPress={() => router.push({ pathname: '/search', params: { addTo: collection.id } })}
          />
          <ActionChip icon="albums-outline" label="メモから追加" onPress={() => setPickerOpen(true)} />
          <ActionChip
            icon="map"
            label="地図で見る"
            disabled={total === 0}
            onPress={() => router.navigate({ pathname: '/', params: { collection: collection.id } })}
          />
        </View>

        {/* Candidates */}
        {candidates.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>これから（{candidates.length}）</Text>
            {candidates.map((item) => {
              const cat = getCategory(item.category);
              return (
                <View key={item.id} style={styles.candidateRow}>
                  <View style={[styles.candIcon, { backgroundColor: cat.tint + '1A' }]}>
                    <Ionicons name={cat.icon} size={20} color={cat.tint} />
                  </View>
                  <View style={styles.candBody}>
                    <Text style={styles.candTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.candSub}>気になる（候補）</Text>
                  </View>
                  <Pressable
                    onPress={() => visitCandidate(item)}
                    style={({ pressed }) => [
                      styles.goBtn,
                      { backgroundColor: collection.color },
                      pressed && styles.pressed,
                    ]}>
                    <Ionicons name="checkmark" size={15} color={colors.onAccent} />
                    <Text style={styles.goText}>行った</Text>
                  </Pressable>
                  <Pressable onPress={() => removeItem(item.id)} hitSlop={8} style={styles.remove}>
                    <Ionicons name="close" size={18} color={colors.faint} />
                  </Pressable>
                </View>
              );
            })}
          </>
        )}

        {/* Visited */}
        {visited.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>制覇済み（{visited.length}）</Text>
            {visited.map((item) => {
              const memo = memoOf(item.memoId);
              if (memo) {
                return (
                  <MemoRow
                    key={item.id}
                    memo={memo}
                    onPress={() => router.push({ pathname: '/memo/[id]', params: { id: memo.id } })}
                    onLongPress={() => removeItem(item.id)}
                  />
                );
              }
              const cat = getCategory(item.category);
              return (
                <View key={item.id} style={styles.candidateRow}>
                  <View style={[styles.candIcon, { backgroundColor: cat.tint + '1A' }]}>
                    <Ionicons name={cat.icon} size={20} color={cat.tint} />
                  </View>
                  <View style={styles.candBody}>
                    <Text style={styles.candTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.candSub, { color: collection.color }]}>✓ 制覇</Text>
                  </View>
                  <Pressable onPress={() => removeItem(item.id)} hitSlop={8} style={styles.remove}>
                    <Ionicons name="close" size={18} color={colors.faint} />
                  </Pressable>
                </View>
              );
            })}
          </>
        )}

        {total === 0 && (
          <View style={styles.empty}>
            <Ionicons name="add-circle-outline" size={40} color={colors.faint} />
            <Text style={styles.emptyText}>
              「候補を追加」で行きたい場所を並べ、{'\n'}行ったら「行った」でチェックしましょう。
            </Text>
          </View>
        )}
      </ScrollView>

      <MemoPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        addedMemoIds={new Set(items.map((i) => i.memoId).filter(Boolean) as string[])}
        onPick={(memo) => addMemoAsItem(collection.id, memo)}
      />
    </View>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.chip, disabled && styles.chipDisabled, pressed && styles.pressed]}>
      <Ionicons name={icon} size={18} color={disabled ? colors.faint : colors.ink} />
      <Text style={[styles.chipText, disabled && { color: colors.faint }]}>{label}</Text>
    </Pressable>
  );
}

function MemoPicker({
  visible,
  onClose,
  addedMemoIds,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  addedMemoIds: Set<string>;
  onPick: (memo: import('@/types/memo').Memo) => void;
}) {
  const memos = useMemoStore((s) => s.memos);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.pickerHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.pickerTitle}>メモから追加</Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={styles.pickerDone}>完了</Text>
        </Pressable>
      </View>
      <FlatList
        data={memos}
        keyExtractor={(m) => m.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>メモがまだありません</Text>
          </View>
        }
        renderItem={({ item }) => {
          const added = addedMemoIds.has(item.id);
          const cat = getCategory(item.category);
          return (
            <Pressable
              disabled={added}
              onPress={() => onPick(item)}
              style={({ pressed }) => [styles.pickRow, pressed && styles.pressed]}>
              <View style={[styles.candIcon, { backgroundColor: cat.tint + '1A' }]}>
                <Ionicons name={cat.icon} size={20} color={cat.tint} />
              </View>
              <Text style={styles.pickTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Ionicons
                name={added ? 'checkmark-circle' : 'add-circle-outline'}
                size={24}
                color={added ? colors.brand : colors.faint}
              />
            </Pressable>
          );
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 36 },
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.ink,
    marginTop: 12,
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  count: { fontSize: 15, fontWeight: '800' },
  barWrap: { alignSelf: 'stretch', marginTop: 10 },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.bg,
  },
  chipDisabled: { opacity: 0.6 },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.subInk,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  candIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candBody: { flex: 1, gap: 2 },
  candTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  candSub: { fontSize: 12, fontWeight: '600', color: colors.subInk },
  goBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
  },
  goText: { color: colors.onAccent, fontSize: 13, fontWeight: '800' },
  remove: { padding: 2 },
  pressed: { opacity: 0.6 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.subInk,
    textAlign: 'center',
    lineHeight: 22,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  missingText: { fontSize: 16, color: colors.subInk },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  pickerTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  pickerDone: { fontSize: 16, fontWeight: '700', color: colors.brand },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  pickTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
});
