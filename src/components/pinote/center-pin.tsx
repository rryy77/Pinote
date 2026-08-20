import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/colors';

/**
 * The fixed placement cursor at the map's center. A soft pulse radiates from the
 * exact drop point (like a ride-hail pickup pin), signalling "this is where your
 * memo lands" — the app's signature gesture.
 */
export function CenterPin() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.4 + pulse.value * 1.9 }],
    opacity: 0.4 * (1 - pulse.value),
  }));

  return (
    <View style={styles.fill} pointerEvents="none">
      <Animated.View style={[styles.ring, ringStyle]} />
      <Ionicons name="location" size={42} color={colors.brand} style={[styles.pin, styles.pinFill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ring: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 64,
    height: 64,
    marginLeft: -32,
    marginTop: -32,
    borderRadius: 32,
    backgroundColor: colors.brand,
  },
  pin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },
  pinFill: {
    marginLeft: -21,
    marginTop: -34,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
