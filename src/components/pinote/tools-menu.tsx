import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import { Pressable, StyleSheet, type ColorValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/colors';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type ToolAction = {
  key: string;
  icon: IoniconName;
  color: ColorValue;
  size?: number;
  onPress: () => void;
};

type Props = {
  open: boolean;
  onToggle: () => void;
  insetTop: number;
  actions: ToolAction[];
  /** Top offset (from insetTop) of the first expanded item. Leaves room for a
   *  standalone button placed under the toggle. Defaults to 116. */
  itemBaseTop?: number;
};

/**
 * A single "tools" button (top-right) that expands, iOS-folder style, into its
 * actions with a staggered spring pop, and collapses in reverse. Controlled so
 * the map can close it on an outside tap.
 */
export function ToolsMenu({ open, onToggle, insetTop, actions, itemBaseTop = 116 }: Props) {
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withSpring(open ? 1 : 0, { damping: 14, mass: 0.6, stiffness: 180 });
  }, [open, spin]);

  const mainIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 90}deg` }],
  }));

  return (
    <>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.button,
          open && styles.buttonActive,
          { right: 16, top: insetTop + 64 },
          pressed && styles.pressed,
        ]}>
        <Animated.View style={mainIconStyle}>
          <Ionicons
            name={open ? 'close' : 'ellipsis-horizontal'}
            size={22}
            color={open ? colors.onAccent : colors.ink}
          />
        </Animated.View>
      </Pressable>

      {actions.map((a, i) => (
        <ToolItem
          key={a.key}
          action={a}
          index={i}
          count={actions.length}
          open={open}
          top={insetTop + itemBaseTop + i * 52}
        />
      ))}
    </>
  );
}

function ToolItem({
  action,
  index,
  count,
  open,
  top,
}: {
  action: ToolAction;
  index: number;
  count: number;
  open: boolean;
  top: number;
}) {
  const v = useSharedValue(0);

  useEffect(() => {
    // Stagger outward when opening, and in reverse when closing.
    const delay = open ? index * 45 : (count - 1 - index) * 28;
    v.value = withDelay(
      delay,
      open
        ? withSpring(1, { damping: 12, mass: 0.6, stiffness: 170 })
        : withTiming(0, { duration: 140 }),
    );
  }, [open, index, count, v]);

  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ scale: 0.4 + 0.6 * v.value }, { translateY: (1 - v.value) * -12 }],
  }));

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={[styles.button, { right: 16, top }, style]}>
      <Pressable
        onPress={action.onPress}
        style={({ pressed }) => [styles.fill, pressed && styles.pressed]}>
        <Ionicons name={action.icon} size={action.size ?? 20} color={action.color} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  buttonActive: {
    backgroundColor: colors.brand,
  },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
