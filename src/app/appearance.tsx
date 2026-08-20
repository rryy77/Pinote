import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { useThemeStore } from '@/store/useThemeStore';
import { ACCENTS, getStoredAccentId, setStoredAccentId } from '@/utils/accent';

/** Appearance settings: light/dark (live) and the main accent color (reloads). */
export default function AppearanceScreen() {
  const router = useRouter();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const current = getStoredAccentId();
  const [selected, setSelected] = useState(current);

  const preview = ACCENTS.find((a) => a.id === selected) ?? ACCENTS[0];

  // Picking a new color asks to restart (which is how it applies app-wide).
  const onPickAccent = (id: string) => {
    setSelected(id);
    if (id === current) return;
    Alert.alert('メインカラーを変更', 'アプリを再起動して反映します。再起動しますか？', [
      { text: 'キャンセル', style: 'cancel', onPress: () => setSelected(current) },
      {
        text: '再起動する',
        onPress: async () => {
          setStoredAccentId(id);
          try {
            await Updates.reloadAsync();
          } catch {
            Alert.alert('保存しました', '次回アプリを開いたときに反映されます。', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '見た目',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.brand} />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Live preview reflecting the selected accent. */}
        <View style={styles.preview}>
          <View style={[styles.previewPin, { backgroundColor: preview.brand }]}>
            <Ionicons name="location" size={22} color="#FFFFFF" />
          </View>
          <View style={[styles.previewCta, { backgroundColor: preview.brand }]}>
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.previewCtaText}>ここにメモを残す</Text>
          </View>
        </View>

        <Text style={styles.label}>メインカラー</Text>
        <View style={styles.grid}>
          {ACCENTS.map((a) => (
            <Pressable key={a.id} onPress={() => onPickAccent(a.id)} style={styles.swatchWrap}>
              <View style={[styles.swatch, { backgroundColor: a.brand }]}>
                {selected === a.id && <Ionicons name="checkmark" size={22} color="#FFFFFF" />}
              </View>
              <Text style={styles.swatchLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>明るさ</Text>
        <View style={styles.segment}>
          <Seg label="ライト" active={mode === 'light'} onPress={() => setMode('light')} />
          <Seg label="ダーク" active={mode === 'dark'} onPress={() => setMode('dark')} />
        </View>

        <Text style={styles.note}>
          メインカラーを選ぶと、確認のうえアプリを再起動して反映します。
        </Text>
      </ScrollView>
    </View>
  );
}

function Seg({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.seg, active && styles.segActive]}>
      <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 8 },
  preview: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
  },
  previewPin: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 28,
    borderRadius: 16,
  },
  previewCtaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.subInk,
    marginTop: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  swatchWrap: { alignItems: 'center', gap: 6, width: 84 },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLabel: { fontSize: 12, fontWeight: '600', color: colors.subInk },
  segment: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.bg,
  },
  seg: { flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segText: { fontSize: 15, fontWeight: '700', color: colors.subInk },
  segTextActive: { color: colors.ink },
  apply: {
    marginTop: 28,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  note: {
    marginTop: 10,
    fontSize: 13,
    color: colors.subInk,
    textAlign: 'center',
  },
});
