import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import type { Collection } from '@/types/collection';

import { ProgressBar } from './progress-bar';

type Props = {
  collection: Collection;
  onPress: () => void;
};

/** List row for a collection: emoji badge, name and 制覇 progress. */
export function CollectionRow({ collection, onPress }: Props) {
  const { total, visited } = collection;
  const ratio = total > 0 ? visited / total : 0;
  const done = total > 0 && visited === total;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.badge, { backgroundColor: collection.color + '22' }]}>
        <Text style={styles.emoji}>{collection.icon}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {collection.name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.count, done && { color: collection.color }]}>
            {total === 0 ? 'まだ空です' : `${visited}/${total} 制覇`}
          </Text>
          {done && <Ionicons name="trophy" size={13} color={collection.color} />}
        </View>
        <ProgressBar value={ratio} color={collection.color} />
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
  badge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
  },
  body: {
    flex: 1,
    gap: 5,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subInk,
  },
});
