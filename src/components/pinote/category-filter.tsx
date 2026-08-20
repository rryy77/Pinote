import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { CATEGORIES } from '@/constants/categories';
import { colors } from '@/constants/colors';
import type { CategoryId } from '@/types/memo';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
export type CategoryFilterValue = CategoryId | 'all';

type Props = {
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
};

/** Horizontal, scrollable category filter chips (with an "all" option). */
export function CategoryFilter({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      <Chip
        label="すべて"
        icon="apps"
        tint={colors.ink}
        selected={value === 'all'}
        onPress={() => onChange('all')}
      />
      {CATEGORIES.map((c) => (
        <Chip
          key={c.id}
          label={c.label}
          icon={c.icon}
          tint={c.tint}
          selected={value === c.id}
          onPress={() => onChange(c.id)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  icon,
  tint,
  selected,
  onPress,
}: {
  label: string;
  icon: IoniconName;
  tint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: tint }, selected && { backgroundColor: tint }]}>
      <Ionicons name={icon} size={14} color={selected ? '#FFFFFF' : tint} />
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3C4149',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});
