import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '@/constants/colors';

import { Button } from '@/components/pinote/button';
import { CategoryPicker } from '@/components/pinote/category-picker';
import { PhotoField } from '@/components/pinote/photo-field';
import { PinoteMap } from '@/components/pinote/pinote-map';
import { RatingStars } from '@/components/pinote/rating-input';
import { RevisitToggle } from '@/components/pinote/revisit-toggle';
import { TagInput } from '@/components/pinote/tag-input';
import { WantToGoToggle } from '@/components/pinote/want-to-go-toggle';
import { DEFAULT_CATEGORY, getCategory } from '@/constants/categories';
import { useCollectionStore } from '@/store/useCollectionStore';
import { useMapFocus } from '@/store/useMapFocus';
import { useMemoStore } from '@/store/useMemoStore';
import type { CategoryId } from '@/types/memo';

export default function NewMemoScreen() {
  const router = useRouter();
  const {
    lat,
    lng,
    title: titleParam,
    collectionItemId,
    prefillTitle,
    prefillBody,
    prefillLat,
    prefillLng,
    wantToGo: wantToGoParam,
    from,
  } = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    title?: string;
    collectionItemId?: string;
    prefillTitle?: string;
    prefillBody?: string;
    prefillLat?: string;
    prefillLng?: string;
    wantToGo?: string;
    from?: string;
  }>();
  const add = useMemoStore((s) => s.add);
  const markVisited = useCollectionStore((s) => s.markVisited);
  const bodyRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const bodyY = useRef(0);

  const initialLat = Number(lat ?? prefillLat);
  const initialLng = Number(lng ?? prefillLng);
  const hasInitial = Number.isFinite(initialLat) && Number.isFinite(initialLng);
  const fromShare = from === 'share';

  const [title, setTitle] = useState(titleParam ?? prefillTitle ?? '');
  const [body, setBody] = useState(prefillBody ?? '');
  const [category, setCategory] = useState<CategoryId>(DEFAULT_CATEGORY);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [wantRevisit, setWantRevisit] = useState(false);
  const [wantToGo, setWantToGo] = useState(wantToGoParam === '1');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // The location is chosen on the map before opening this screen; here it is fixed
  // (shown only for confirmation).
  const pin = hasInitial ? { latitude: initialLat, longitude: initialLng } : null;

  const cat = getCategory(category);
  const canSave = title.trim().length > 0 && pin !== null && !saving;

  const save = async () => {
    if (!canSave || !pin) return;
    setSaving(true);
    try {
      const memo = await add({
        title,
        body,
        category,
        lat: pin.latitude,
        lng: pin.longitude,
        rating,
        wantRevisit,
        wantToGo,
        tags,
        photoUri,
      });
      // Coming from a collection candidate → mark it 制覇 and link the memo.
      if (collectionItemId) {
        await markVisited(collectionItemId, memo.id);
      } else {
        // Otherwise return to the map and fly to / highlight the new pin so the
        // user sees exactly where it landed (esp. from share / search flows).
        useMapFocus.getState().requestFocus({
          kind: 'memo',
          id: memo.id,
          lat: pin.latitude,
          lng: pin.longitude,
        });
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.brand} />
            </Pressable>
          ),
          headerRight: () =>
            canSave ? (
              <Pressable onPress={save} hitSlop={10}>
                <Text style={styles.headerSave}>保存</Text>
              </Pressable>
            ) : null,
        }}
      />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Text style={styles.label}>場所</Text>
        {pin ? (
          <>
            {/* Fixed preview only — the spot is already chosen, so the map is
                non-interactive (no pan/zoom). */}
            <View style={styles.mapPreview} pointerEvents="none">
              <PinoteMap
                markers={[
                  {
                    id: 'new',
                    latitude: pin.latitude,
                    longitude: pin.longitude,
                    title: title.trim() || 'ここに保存',
                    tint: cat.tint,
                    symbol: cat.symbol,
                  },
                ]}
                initialCamera={{ ...pin, zoom: 16 }}
                showUserLocation
              />
            </View>
            <View style={styles.hintRow}>
              <Ionicons name="location-outline" size={13} color={colors.subInk} />
              <Text style={styles.mapHint}>
                {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)} に保存します
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.noPin}>
            <View style={styles.hintRow}>
              <Ionicons name="warning-outline" size={15} color="#B45309" />
              <Text style={styles.coords}>
                {fromShare ? '共有先の場所が特定できませんでした' : '位置情報が取得できませんでした'}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                router.replace({
                  pathname: '/search',
                  params: {
                    ...(title.trim() ? { q: title.trim() } : {}),
                    ...(body.trim() ? { body: body.trim() } : {}),
                    wantToGo: wantToGo ? '1' : '',
                    from: 'share',
                  },
                })
              }
              style={({ pressed }) => [styles.pickPlace, pressed && styles.pressed]}>
              <Ionicons name="search" size={16} color={colors.onAccent} />
              <Text style={styles.pickPlaceText}>名前で場所を検索して選ぶ</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.label}>名前</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="例: 味噌ラーメンが最高だった店"
          placeholderTextColor={colors.subInk}
          style={styles.input}
          autoFocus
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => bodyRef.current?.focus()}
          inputAccessoryViewID="memoKeyboard"
        />

        <Text style={styles.label}>メモ</Text>
        <TextInput
          ref={bodyRef}
          value={body}
          onChangeText={setBody}
          placeholder="味・値段・行った日など、後で見返したいこと"
          placeholderTextColor={colors.subInk}
          style={[styles.input, styles.multiline]}
          multiline
          inputAccessoryViewID="memoKeyboard"
          onLayout={(e) => {
            bodyY.current = e.nativeEvent.layout.y;
          }}
          onFocus={() =>
            scrollRef.current?.scrollTo({ y: Math.max(0, bodyY.current - 24), animated: true })
          }
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
          <WantToGoToggle value={wantToGo} onChange={setWantToGo} />
        </View>

        <View style={styles.revisitRow}>
          <RevisitToggle value={wantRevisit} onChange={setWantRevisit} />
        </View>

        <View style={styles.actions}>
          <Button label="保存する" onPress={save} loading={saving} disabled={!canSave} />
          <Button label="キャンセル" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID="memoKeyboard">
          <View style={styles.kbdBar}>
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={8}>
              <Text style={styles.kbdDone}>完了</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerSave: {
    color: colors.brand,
    fontSize: 17,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    gap: 8,
  },
  mapPreview: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  mapHint: {
    fontSize: 12,
    color: colors.subInk,
  },
  noPin: {
    gap: 12,
    marginTop: 6,
  },
  pickPlace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.brand,
  },
  pickPlaceText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
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
  revisitRow: {
    marginTop: 12,
  },
  coords: {
    color: '#B45309',
    fontSize: 13,
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  kbdBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  kbdDone: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brand,
  },
});
