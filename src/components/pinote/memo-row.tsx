import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

import { getCategory } from '@/constants/categories';
import type { Memo } from '@/types/memo';
import { RatingStars } from './rating-input';

type Props = {
  memo: Memo;
  /** Pre-formatted distance label (e.g. "120m"), or null when unknown. */
  distance?: string | null;
  onPress: () => void;
  onLongPress?: () => void;
};

/** Shared list row showing a memo's photo/icon, title, rating and meta. */
export function MemoRow({ memo, distance, onPress, onLongPress }: Props) {
  const cat = getCategory(memo.category);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {memo.photoUri ? (
        <Image source={{ uri: memo.photoUri }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.iconWrap, { backgroundColor: cat.tint + '1A' }]}>
          <Ionicons name={cat.icon} size={22} color={cat.tint} />
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {memo.title}
        </Text>
        {memo.rating > 0 && <RatingStars value={memo.rating} size={13} />}
        {memo.body.length > 0 && (
          <Text style={styles.snippet} numberOfLines={1}>
            {memo.body}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {cat.label}
            {distance ? ` ・ ${distance}` : ''}
          </Text>
          {memo.wantRevisit && (
            <View style={styles.revisit}>
              <Ionicons name="repeat" size={13} color="#B45309" />
              <Text style={styles.revisitText}>また行きたい</Text>
            </View>
          )}
        </View>
        {memo.tags.length > 0 && (
          <Text style={styles.tags} numberOfLines={1}>
            {memo.tags.map((t) => `#${t}`).join(' ')}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  pressed: {
    opacity: 0.6,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  snippet: {
    fontSize: 14,
    color: colors.subInk,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  meta: {
    fontSize: 12,
    color: colors.subInk,
  },
  revisit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  revisitText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  tags: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand,
  },
});
