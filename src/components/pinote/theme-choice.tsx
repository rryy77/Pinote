import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import type { ThemeMode } from '@/utils/theme';

type Props = { onPick: (mode: ThemeMode) => void };

/** First-run appearance choice, shown right after onboarding. */
export function ThemeChoice({ onPick }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.overlay, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="contrast" size={38} color={colors.onAccent} />
        </View>
        <Text style={styles.title}>見た目を選ぶ</Text>
        <Text style={styles.subtitle}>あとで左上のボタンからいつでも切り替えられます。</Text>
      </View>

      <View style={styles.cards}>
        <ThemeCard
          mode="light"
          label="ライト"
          bg="#FFFFFF"
          fg="#191B23"
          sub="#8A8F98"
          onPress={() => onPick('light')}
        />
        <ThemeCard
          mode="dark"
          label="ダーク"
          bg="#000000"
          fg="#F5F6F8"
          sub="#9BA0AA"
          onPress={() => onPick('dark')}
        />
      </View>
    </View>
  );
}

function ThemeCard({
  label,
  bg,
  fg,
  sub,
  onPress,
}: {
  mode: ThemeMode;
  label: string;
  bg: string;
  fg: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.preview, { backgroundColor: bg }]}>
        <View style={[styles.previewPin, { backgroundColor: colors.brand }]}>
          <Ionicons name="location" size={18} color="#FFFFFF" />
        </View>
        <View style={[styles.previewLine, { backgroundColor: fg, width: '60%' }]} />
        <View style={[styles.previewLine, { backgroundColor: sub, width: '40%' }]} />
      </View>
      <Text style={styles.cardLabel}>{label}</Text>
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
  cards: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
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
