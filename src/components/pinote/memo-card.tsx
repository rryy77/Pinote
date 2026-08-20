import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCategory } from '@/constants/categories';
import { colors } from '@/constants/colors';
import type { Memo } from '@/types/memo';

import { RatingStars } from './rating-input';

type Props = {
  memo: Memo;
  /** Pre-formatted distance from the user (e.g. "1.2km"), or null. */
  distance: string | null;
  onClose: () => void;
  onOpenDetail: () => void;
};

/**
 * A compact info card shown over the map when a memo pin is tapped — so the
 * user can glance at a place without leaving the map. Tapping it (or "詳しく・
 * 編集") opens the full detail screen.
 */
export function MemoCard({ memo, distance, onClose, onOpenDetail }: Props) {
  const cat = getCategory(memo.category);
  return (
    <Pressable onPress={onOpenDetail} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
        <Ionicons name="close" size={16} color={colors.subInk} />
      </Pressable>

      <View style={styles.row}>
        {memo.photoUri ? (
          <Image source={{ uri: memo.photoUri }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbIcon, { backgroundColor: cat.tint + '1A' }]}>
            <Ionicons name={cat.icon} size={26} color={cat.tint} />
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <View style={[styles.catChip, { backgroundColor: cat.tint + '1A' }]}>
              <Ionicons name={cat.icon} size={12} color={cat.tint} />
              <Text style={[styles.catText, { color: cat.tint }]}>{cat.label}</Text>
            </View>
            {distance && <Text style={styles.distance}>{distance}</Text>}
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {memo.title}
          </Text>

          {memo.rating > 0 && (
            <View style={styles.stars}>
              <RatingStars value={memo.rating} size={14} />
            </View>
          )}
          {memo.body.length > 0 && (
            <Text style={styles.preview} numberOfLines={1}>
              {memo.body}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        {memo.wantRevisit ? (
          <View style={styles.revisit}>
            <Ionicons name="repeat" size={13} color="#B45309" />
            <Text style={styles.revisitText}>また行きたい</Text>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.detailBtn}>
          <Text style={styles.detailText}>詳しく・編集</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.brand} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  pressed: {
    opacity: 0.96,
  },
  close: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  thumbIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingRight: 24,
    gap: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  catText: {
    fontSize: 11,
    fontWeight: '800',
  },
  distance: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subInk,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  stars: {
    marginTop: 1,
  },
  preview: {
    fontSize: 13,
    color: colors.subInk,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  revisit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  revisitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brand,
  },
});
