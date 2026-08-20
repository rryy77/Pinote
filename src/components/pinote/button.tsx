import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors } from '@/constants/colors';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

const BG: Record<NonNullable<Props['variant']>, string> = {
  primary: colors.brand,
  danger: '#EF4444',
  ghost: 'transparent',
};

/** Shared filled/ghost button used across the memo screens. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: Props) {
  const isGhost = variant === 'ghost';
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: BG[variant] },
        isGhost && styles.ghost,
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.brand : '#FFFFFF'} />
      ) : (
        <Text style={[styles.label, isGhost && styles.ghostLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  ghost: {
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  inactive: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  ghostLabel: {
    color: colors.brand,
  },
});
