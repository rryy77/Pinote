import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CollectionRow } from '@/components/pinote/collection-row';
import { MemoRow } from '@/components/pinote/memo-row';
import { colors } from '@/constants/colors';
import { useCurrentLocation } from '@/location/use-current-location';
import { useCollectionStore } from '@/store/useCollectionStore';
import { useMemoStore } from '@/store/useMemoStore';
import type { Memo } from '@/types/memo';
import { formatDistance, haversine } from '@/utils/distance';

type Tab = 'memo' | 'collection' | 'timeline';

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function dayLabel(ms: number): string {
  return new Date(ms).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

/** The "見返す" hub: browse memos, collections (制覇リスト), and a date timeline. */
export default function LibraryScreen() {
  const router = useRouter();
  const memos = useMemoStore((s) => s.memos);
  const collections = useCollectionStore((s) => s.collections);
  const { coords } = useCurrentLocation();

  const [tab, setTab] = useState<Tab>('memo');
  const [query, setQuery] = useState('');

  const memoResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? memos.filter((m) => m.title.toLowerCase().includes(q) || m.body.toLowerCase().includes(q))
      : memos;
    if (coords) {
      return [...list].sort(
        (a, b) =>
          haversine(coords, { latitude: a.lat, longitude: a.lng }) -
          haversine(coords, { latitude: b.lat, longitude: b.lng }),
      );
    }
    return list;
  }, [memos, query, coords]);

  // Timeline: memos grouped into date sections, newest first.
  const sections = useMemo(() => {
    const byDay = [...memos].sort((a, b) => b.createdAt - a.createdAt);
    const map = new Map<string, { title: string; data: Memo[] }>();
    for (const m of byDay) {
      const key = dayKey(m.createdAt);
      if (!map.has(key)) map.set(key, { title: dayLabel(m.createdAt), data: [] });
      map.get(key)!.data.push(m);
    }
    return Array.from(map.values());
  }, [memos]);

  const distanceLabel = (m: Memo): string | null =>
    coords ? formatDistance(haversine(coords, { latitude: m.lat, longitude: m.lng })) : null;

  const openMemo = (id: string) => router.push({ pathname: '/memo/[id]', params: { id } });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'ライブラリ',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.brand} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.segment}>
        <SegBtn label="メモ" active={tab === 'memo'} onPress={() => setTab('memo')} />
        <SegBtn label="コレクション" active={tab === 'collection'} onPress={() => setTab('collection')} />
        <SegBtn label="記録" active={tab === 'timeline'} onPress={() => setTab('timeline')} />
      </View>

      {tab === 'memo' && (
        <>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#8A8F98" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="メモを検索（名前・本文）"
              placeholderTextColor="#9AA0A6"
              style={styles.input}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
          </View>
          <FlatList
            data={memoResults}
            keyExtractor={(m) => m.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={memoResults.length === 0 ? styles.emptyWrap : undefined}
            ListEmptyComponent={
              <Empty icon="document-text-outline" text={query ? '一致するメモがありません' : 'メモがまだありません'} />
            }
            renderItem={({ item }) => (
              <MemoRow memo={item} distance={distanceLabel(item)} onPress={() => openMemo(item.id)} />
            )}
          />
        </>
      )}

      {tab === 'collection' && (
        <FlatList
          data={collections}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={
            <Pressable
              onPress={() => router.push('/collections/new')}
              style={({ pressed }) => [styles.createBtn, pressed && styles.pressed]}>
              <Ionicons name="add-circle" size={22} color={colors.brand} />
              <Text style={styles.createText}>コレクションを作成</Text>
            </Pressable>
          }
          contentContainerStyle={collections.length === 0 ? styles.emptyGrow : undefined}
          ListEmptyComponent={
            <Empty
              icon="albums-outline"
              text={'◯◯めぐりや旅の制覇リストを作れます。\n上の「作成」から始めましょう。'}
            />
          }
          renderItem={({ item }) => (
            <CollectionRow
              collection={item}
              onPress={() => router.push({ pathname: '/collections/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}

      {tab === 'timeline' && (
        <SectionList
          sections={sections}
          keyExtractor={(m) => m.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={sections.length === 0 ? styles.emptyWrap : undefined}
          ListEmptyComponent={<Empty icon="time-outline" text="まだ記録がありません" />}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <MemoRow memo={item} distance={distanceLabel(item)} onPress={() => openMemo(item.id)} />
          )}
        />
      )}
    </View>
  );
}

function SegBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segBtn, active && styles.segBtnActive]}>
      <Text style={[styles.segText, active && styles.segTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function Empty({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color="#C4C7CC" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  segment: {
    flexDirection: 'row',
    gap: 6,
    margin: 16,
    marginBottom: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.bg,
  },
  segBtn: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.subInk,
  },
  segTextActive: {
    color: colors.ink,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  createText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brand,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.subInk,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.6,
  },
  emptyWrap: {
    flexGrow: 1,
  },
  emptyGrow: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 22,
  },
});
