import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
};

/** "行きたい" (want-to-go) toggle row — a place you plan to visit but haven't yet. */
export function WantToGoToggle({ value, onChange }: Props) {
  return (
    <Pressable style={styles.row} onPress={() => onChange(!value)}>
      <View style={styles.labelRow}>
        <Ionicons name="bookmark" size={18} color={colors.brand} />
        <View>
          <Text style={styles.label}>行きたい</Text>
          <Text style={styles.sub}>まだ行ってない予定の場所</Text>
        </View>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.brand }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  sub: {
    fontSize: 12,
    color: colors.subInk,
    marginTop: 1,
  },
});
