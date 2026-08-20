import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { Button } from '@/components/pinote/button';
import { CategoryPicker } from '@/components/pinote/category-picker';
import { PhotoField } from '@/components/pinote/photo-field';
import { PinoteMap } from '@/components/pinote/pinote-map';
import { RatingStars } from '@/components/pinote/rating-input';
import { RevisitToggle } from '@/components/pinote/revisit-toggle';
import { TagInput } from '@/components/pinote/tag-input';
import { getCategory } from '@/constants/categories';
import { colors } from '@/constants/colors';
import { useCollectionStore } from '@/store/useCollectionStore';
import { useMemoStore } from '@/store/useMemoStore';
import type { CategoryId } from '@/types/memo';

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MemoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const memo = useMemoStore((s) => s.memos.find((m) => m.id === id));
  const update = useMemoStore((s) => s.update);
  const remove = useMemoStore((s) => s.remove);
  const collections = useCollectionStore((s) => s.collections);
  const addMemoToCollection = useCollectionStore((s) => s.addMemoAsItem);
  const insets = useSafeAreaInsets();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(memo?.title ?? '');
  const [body, setBody] = useState(memo?.body ?? '');
  const [category, setCategory] = useState<CategoryId>(memo?.category ?? 'other');
  const [photoUri, setPhotoUri] = useState<string | null>(memo?.photoUri ?? null);
  const [rating, setRating] = useState(memo?.rating ?? 0);
  const [wantRevisit, setWantRevisit] = useState(memo?.wantRevisit ?? false);
  const [tags, setTags] = useState<string[]>(memo?.tags ?? []);
  const [lat, setLat] = useState(memo?.lat ?? 0);
  const [lng, setLng] = useState(memo?.lng ?? 0);
  const [saving, setSaving] = useState(false);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);

  const cat = useMemo(() => getCategory(memo?.category ?? 'other'), [memo?.category]);

  if (!memo) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'メモ' }} />
        <Text style={styles.missingText}>メモが見つかりませんでした。</Text>
        <Button label="戻る" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const startEdit = () => {
    setTitle(memo.title);
    setBody(memo.body);
    setCategory(memo.category);
    setPhotoUri(memo.photoUri);
    setRating(memo.rating);
    setWantRevisit(memo.wantRevisit);
    setTags(memo.tags);
    setLat(memo.lat);
    setLng(memo.lng);
    setEditing(true);
  };

  const save = async () => {
    if (title.trim().length === 0) return;
    setSaving(true);
    try {
      await update(memo.id, { title, body, category, photoUri, rating, wantRevisit, tags, lat, lng });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('メモを削除', `「${memo.title}」を削除しますか？この操作は取り消せません。`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await remove(memo.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: editing ? '編集' : 'メモ',
          headerRight: () =>
            editing ? null : (
              <Pressable onPress={startEdit} hitSlop={10}>
                <Ionicons name="create-outline" size={24} color={colors.brand} />
              </Pressable>
            ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.mapPreview}>
          <PinoteMap
            markers={[
              {
                id: memo.id,
                latitude: editing ? lat : memo.lat,
                longitude: editing ? lng : memo.lng,
                title: memo.title,
                tint: cat.tint,
                symbol: cat.symbol,
              },
            ]}
            initialCamera={{ latitude: memo.lat, longitude: memo.lng, zoom: 16 }}
            showUserLocation={false}
            onMapPress={
              editing
                ? (c) => {
                    setLat(c.latitude);
                    setLng(c.longitude);
                  }
                : undefined
            }
          />
          {editing && (
            <View style={styles.mapHintBadge} pointerEvents="none">
              <Ionicons name="hand-left-outline" size={14} color={colors.onAccent} />
              <Text style={styles.mapHintText}>タップで場所を変更</Text>
            </View>
          )}
        </View>

        {editing ? (
          <>
            <Text style={styles.label}>名前</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} />

            <Text style={styles.label}>メモ</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              style={[styles.input, styles.multiline]}
              multiline
            />

            <Text style={styles.label}>カテゴリ</Text>
            <CategoryPicker value={category} onChange={setCategory} />

            <Text style={styles.label}>タグ</Text>
            <TagInput value={tags} onChange={setTags} />

            <Text style={styles.label}>写真</Text>
            <PhotoField uri={photoUri} onChange={setPhotoUri} />

            <Text style={styles.label}>評価</Text>
            <RatingStars value={rating} onChange={setRating} size={30} />

            <View style={styles.revisitRow}>
              <RevisitToggle value={wantRevisit} onChange={setWantRevisit} />
            </View>

            <View style={styles.actions}>
              <Button
                label="保存する"
                onPress={save}
                loading={saving}
                disabled={title.trim().length === 0}
              />
              <Button label="キャンセル" variant="ghost" onPress={() => setEditing(false)} />
            </View>
          </>
        ) : (
          <>
            {memo.photoUri && (
              <Image source={{ uri: memo.photoUri }} style={styles.photo} contentFit="cover" />
            )}

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: cat.tint + '1A' }]}>
                <Ionicons name={cat.icon} size={15} color={cat.tint} />
                <Text style={[styles.badgeText, { color: cat.tint }]}>{cat.label}</Text>
              </View>
              {memo.wantRevisit && (
                <View style={styles.revisitBadge}>
                  <Ionicons name="repeat" size={15} color="#B45309" />
                  <Text style={styles.revisitBadgeText}>また行きたい</Text>
                </View>
              )}
            </View>

            <Text style={styles.title}>{memo.title}</Text>
            {memo.rating > 0 && (
              <View style={styles.ratingRow}>
                <RatingStars value={memo.rating} size={22} />
              </View>
            )}
            {memo.body.length > 0 && <Text style={styles.body}>{memo.body}</Text>}

            {memo.tags.length > 0 && (
              <View style={styles.tagRow}>
                {memo.tags.map((t) => (
                  <View key={t} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>#{t}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.meta}>作成: {formatDate(memo.createdAt)}</Text>
            {memo.updatedAt !== memo.createdAt && (
              <Text style={styles.meta}>更新: {formatDate(memo.updatedAt)}</Text>
            )}
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color={colors.subInk} />
              <Text style={[styles.meta, styles.metaInline]}>
                {memo.lat.toFixed(5)}, {memo.lng.toFixed(5)}
              </Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() => setCollectionPickerOpen(true)}
                style={({ pressed }) => [styles.addToCollection, pressed && { opacity: 0.7 }]}>
                <Ionicons name="albums-outline" size={18} color={colors.brand} />
                <Text style={styles.addToCollectionText}>コレクションに追加</Text>
              </Pressable>
              <Button label="削除する" variant="danger" onPress={confirmDelete} />
            </View>
          </>
        )}
      </ScrollView>

      <CollectionPicker
        visible={collectionPickerOpen}
        collections={collections}
        insetTop={insets.top}
        onClose={() => setCollectionPickerOpen(false)}
        onCreateNew={() => {
          setCollectionPickerOpen(false);
          router.push('/collections/new');
        }}
        onPick={async (collectionId) => {
          await addMemoToCollection(collectionId, memo);
          setCollectionPickerOpen(false);
          Alert.alert('追加しました', 'コレクションに追加しました。');
        }}
      />
    </KeyboardAvoidingView>
  );
}

function CollectionPicker({
  visible,
  collections,
  insetTop,
  onClose,
  onCreateNew,
  onPick,
}: {
  visible: boolean;
  collections: import('@/types/collection').Collection[];
  insetTop: number;
  onClose: () => void;
  onCreateNew: () => void;
  onPick: (collectionId: string) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.pickerHeader, { paddingTop: insetTop + 12 }]}>
        <Text style={styles.pickerTitle}>コレクションに追加</Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={styles.pickerDone}>閉じる</Text>
        </Pressable>
      </View>
      <ScrollView>
        <Pressable
          onPress={onCreateNew}
          style={({ pressed }) => [styles.pickRow, pressed && { opacity: 0.6 }]}>
          <Ionicons name="add-circle" size={24} color={colors.brand} />
          <Text style={[styles.pickTitle, { color: colors.brand }]}>新しいコレクションを作成</Text>
        </Pressable>
        {collections.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => onPick(c.id)}
            style={({ pressed }) => [styles.pickRow, pressed && { opacity: 0.6 }]}>
            <View style={[styles.pickBadge, { backgroundColor: c.color + '22' }]}>
              <Text style={{ fontSize: 20 }}>{c.icon}</Text>
            </View>
            <Text style={styles.pickTitle} numberOfLines={1}>
              {c.name}
            </Text>
            <Text style={styles.pickCount}>
              {c.total === 0 ? '' : `${c.visited}/${c.total}`}
            </Text>
          </Pressable>
        ))}
        {collections.length === 0 && (
          <Text style={styles.pickEmpty}>コレクションがまだありません。上から作成できます。</Text>
        )}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: 20,
    gap: 8,
  },
  mapPreview: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: colors.surfaceMuted,
  },
  mapHintBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  mapHintText: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: '700',
  },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: colors.surfaceMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  revisitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3E2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  revisitBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
  },
  ratingRow: {
    marginTop: 8,
  },
  revisitRow: {
    marginTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 8,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
    marginTop: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.brandSoft,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand,
  },
  meta: {
    fontSize: 13,
    color: colors.subInk,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  metaInline: {
    marginTop: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.subInk,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  addToCollection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  addToCollectionText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brand,
  },
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  pickBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
  pickCount: { fontSize: 13, fontWeight: '700', color: colors.subInk },
  pickEmpty: { padding: 24, textAlign: 'center', color: colors.subInk },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  missingText: {
    fontSize: 16,
    color: colors.subInk,
  },
});
