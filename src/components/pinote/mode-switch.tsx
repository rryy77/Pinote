import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors } from '@/constants/colors';

export type ViewMode = 'view' | 'create';

const SEG_W = 96;

/**
 * The bottom 見る / 残す toggle. The coral pill slides horizontally between the
 * two segments (iOS segmented-control style) instead of snapping.
 */
export function ModeSwitch({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const p = useSharedValue(mode === 'create' ? 1 : 0);
  useEffect(() => {
    p.value = withSpring(mode === 'create' ? 1 : 0, { damping: 16, stiffness: 200, mass: 0.7 });
  }, [mode, p]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * SEG_W }] }));

  return (
    <View style={styles.switch}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      <Pressable style={styles.seg} onPress={() => onChange('view')}>
        <Ionicons name="map" size={16} color={mode === 'view' ? colors.onAccent : colors.subInk} />
        <Text style={[styles.text, mode === 'view' && styles.textActive]}>見る</Text>
      </Pressable>
      <Pressable style={styles.seg} onPress={() => onChange('create')}>
        <Ionicons
          name="add-circle"
          size={16}
          color={mode === 'create' ? colors.onAccent : colors.subInk}
        />
        <Text style={[styles.text, mode === 'create' && styles.textActive]}>残す</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  switch: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: SEG_W,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  seg: {
    width: SEG_W,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.subInk,
  },
  textActive: {
    color: colors.onAccent,
  },
});
