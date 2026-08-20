import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

import { CATEGORIES } from '@/constants/categories';
import type { CategoryId } from '@/types/memo';

type Props = {
  value: CategoryId;
  onChange: (id: CategoryId) => void;
};

/** Horizontal set of category chips for the memo form. */
export function CategoryPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {CATEGORIES.map((c) => {
        const selected = c.id === value;
        return (
          <Pressable
            key={c.id}
            onPress={() => onChange(c.id)}
            style={[
              styles.chip,
              { borderColor: c.tint },
              selected && { backgroundColor: c.tint },
            ]}>
            <Ionicons name={c.icon} size={15} color={selected ? colors.onAccent : c.tint} />
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  chipTextSelected: {
    color: colors.onAccent,
  },
});
