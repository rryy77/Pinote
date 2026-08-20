import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';

type Props = {
  /** Completion ratio 0–1. */
  value: number;
  color?: string;
  height?: number;
};

/** A rounded "制覇率" progress bar. */
export function ProgressBar({ value, color = colors.brand, height = 8 }: Props) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={{
          width: `${pct * 100}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.hairline,
    overflow: 'hidden',
  },
});
