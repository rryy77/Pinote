import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const STEPS: { icon: IoniconName; title: string; text: string }[] = [
  {
    icon: 'navigate',
    title: '場所を合わせる',
    text: '地図を動かして、中央のピンを残したい場所にあわせます。',
  },
  {
    icon: 'add-circle',
    title: 'メモを残す',
    text: '「ここにメモを残す」で、写真・評価つきでその場所を記録。',
  },
  {
    icon: 'search',
    title: 'あとで見返す',
    text: 'カテゴリで絞り込んだり、名前で検索して思い出せます。',
  },
];

type Props = { onDone: () => void };

/** First-run intro: explains the place-first capture loop in one screen. */
export function Onboarding({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.overlay, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.header}>
        <View style={styles.pinBadge}>
          <Ionicons name="location" size={40} color={colors.onAccent} />
        </View>
        <Text style={styles.title}>Pinote</Text>
        <Text style={styles.tagline}>行った場所を、地図に残す。</Text>
      </View>

      <View style={styles.steps}>
        {STEPS.map((s) => (
          <View key={s.title} style={styles.step}>
            <View style={styles.stepIcon}>
              <Ionicons name={s.icon} size={22} color={colors.brand} />
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onDone}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
        <Text style={styles.ctaText}>はじめる</Text>
      </Pressable>
    </View>
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
    gap: 6,
  },
  pinBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.brand,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.ink,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.subInk,
  },
  steps: {
    gap: 22,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBody: {
    flex: 1,
    gap: 3,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.subInk,
  },
  cta: {
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  ctaPressed: {
    backgroundColor: colors.brandDark,
  },
  ctaText: {
    color: colors.onAccent,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
