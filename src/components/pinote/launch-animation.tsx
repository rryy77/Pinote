import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/colors';

const ICON = require('../../../assets/images/icon.png');

type Props = {
  /** Called once the reveal finishes so the overlay can unmount. */
  onDone: () => void;
};

/**
 * Launch flourish that bridges the native splash (app icon on a dark field) into
 * the map. It starts visually identical to the splash — same dark background and
 * centered icon — so there's no cut, then plays a coral ripple and a subtle icon
 * pulse before the whole overlay zooms and fades away to reveal the map beneath.
 */
export function LaunchAnimation({ onDone }: Props) {
  const reveal = useSharedValue(0); // 0 = covering (looks like splash), 1 = gone
  const pulse = useSharedValue(0); // icon breath
  const ring = useSharedValue(0); // ripple ring

  useEffect(() => {
    // Gentle icon breath.
    pulse.value = withDelay(
      160,
      withSequence(
        withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 340, easing: Easing.inOut(Easing.quad) }),
      ),
    );
    // Coral ripple emanating from the icon.
    ring.value = withDelay(200, withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) }));
    // Zoom + fade the whole overlay to hand off to the map.
    reveal.value = withDelay(
      920,
      withTiming(1, { duration: 620, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, [reveal, pulse, ring, onDone]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: 1 - reveal.value,
    transform: [{ scale: 1 + reveal.value * 0.16 }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.08 + reveal.value * 0.1 }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - ring.value),
    transform: [{ scale: 0.4 + ring.value * 3.4 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, overlayStyle]}>
      <Animated.View style={[styles.ring, ringStyle]} />
      <Animated.View style={iconStyle}>
        <Image source={ICON} style={styles.icon} contentFit="contain" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0A0C',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  // Matches the native splash (app.json splash imageWidth: 300) so the handoff
  // from the OS splash into this overlay has no size jump.
  icon: {
    width: 300,
    height: 300,
  },
  ring: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 2.5,
    borderColor: colors.brand,
  },
});
