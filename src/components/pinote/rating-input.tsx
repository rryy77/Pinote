import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = {
  value: number;
  /** When provided the stars are tappable; tapping the current value clears it. */
  onChange?: (value: number) => void;
  size?: number;
};

const FILLED = '#F5A623';
const EMPTY = '#CBD0D6';

/** A 0–5 star rating, read-only by default or editable when `onChange` is set. */
export function RatingStars({ value, onChange, size = 20 }: Props) {
  const editable = typeof onChange === 'function';
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const icon = (
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? FILLED : EMPTY}
          />
        );
        return editable ? (
          <Pressable key={n} hitSlop={6} onPress={() => onChange!(value === n ? 0 : n)}>
            {icon}
          </Pressable>
        ) : (
          <View key={n}>{icon}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 2,
  },
});
