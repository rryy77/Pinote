import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import type { ThemeMode } from '@/utils/theme';

type Props = {
  /** Apply the chosen theme live as it's selected (preview before confirming). */
  onApply: (mode: ThemeMode) => void;
  /** Fired the moment 決定 is pressed (so the next screen can cross-fade in). */
  onConfirm: () => void;
  /** Called once the exit animation finishes and the overlay should unmount. */
  onDone: () => void;
};

/**
 * First-run appearance choice, shown right after onboarding. Picking a theme
 * applies it live and plays a scale-and-fade reveal of the map underneath, so
 * the hand-off into the app feels deliberate rather than an abrupt cut.
 */
export function ThemeChoice({ onApply, onConfirm, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const picked = useRef(false);
  const exit = useSharedValue(0);
  const [selected, setSelected] = useState<ThemeMode | null>(null);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    transform: [{ scale: 1 + exit.value * 0.06 }],
  }));

  // Selecting previews the theme live; nothing is committed until 決定.
  const select = (mode: ThemeMode) => {
    setSelected(mode);
    onApply(mode);
  };

  const confirm = () => {
    if (!selected || picked.current) return;
    picked.current = true;
    onConfirm(); // let the next screen begin cross-fading in
    exit.value = withTiming(1, { duration: 460 }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        overlayStyle,
      ]}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="contrast" size={38} color={colors.onAccent} />
        </View>
        <Text style={styles.title}>見た目を選ぶ</Text>
        <Text style={styles.subtitle}>あとで設定からいつでも切り替えられます。</Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.cards}>
          <ThemeCard
            label="ライト"
            bg="#FFFFFF"
            fg="#191B23"
            sub="#8A8F98"
            selected={selected === 'light'}
            onPress={() => select('light')}
          />
          <ThemeCard
            label="ダーク"
            bg="#000000"
            fg="#F5F6F8"
            sub="#9BA0AA"
            selected={selected === 'dark'}
            onPress={() => select('dark')}
          />
        </View>

        <Pressable
          onPress={confirm}
          disabled={!selected}
          style={({ pressed }) => [
            styles.confirm,
            !selected && styles.confirmDisabled,
            pressed && selected && styles.pressed,
          ]}>
          <Text style={styles.confirmText}>決定</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function ThemeCard({
  label,
  bg,
  fg,
  sub,
  selected,
  onPress,
}: {
  label: string;
  bg: string;
  fg: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.preview, { backgroundColor: bg }, selected && styles.previewSelected]}>
        <View style={[styles.previewPin, { backgroundColor: colors.brand }]}>
          <Ionicons name="location" size={18} color="#FFFFFF" />
        </View>
        <View style={[styles.previewLine, { backgroundColor: fg, width: '60%' }]} />
        <View style={[styles.previewLine, { backgroundColor: sub, width: '40%' }]} />
        {selected && (
          <View style={styles.check}>
            <Ionicons name="checkmark-circle" size={26} color={colors.brand} />
          </View>
        )}
      </View>
      <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    zIndex: 100,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.ink,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.subInk,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  bottom: {
    gap: 20,
    marginBottom: 8,
  },
  cards: {
    flexDirection: 'row',
    gap: 16,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 16,
    gap: 8,
    justifyContent: 'center',
  },
  previewSelected: {
    borderWidth: 3,
    borderColor: colors.brand,
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.surface,
    borderRadius: 13,
  },
  confirm: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDisabled: {
    backgroundColor: colors.faint,
  },
  confirmText: {
    color: colors.onAccent,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardLabelSelected: {
    color: colors.brand,
  },
  previewPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  previewLine: {
    height: 8,
    borderRadius: 4,
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
});
