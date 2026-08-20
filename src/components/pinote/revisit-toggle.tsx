import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
};

/** "また行きたい" (want-to-revisit) toggle row. */
export function RevisitToggle({ value, onChange }: Props) {
  return (
    <Pressable style={styles.row} onPress={() => onChange(!value)}>
      <View style={styles.labelRow}>
        <Ionicons name="repeat" size={18} color="#B45309" />
        <Text style={styles.label}>また行きたい</Text>
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
    gap: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
});
