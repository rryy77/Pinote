import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/pinote/button';
import { colors } from '@/constants/colors';
import { useGroupStore } from '@/store/useGroupStore';

const ICONS = ['📍', '🏠', '👨‍👩‍👧', '🧑‍🤝‍🧑', '🍜', '☕️', '✈️', '🗺️', '❤️', '⭐️'];
const COLORS = ['#FF5B4A', '#F59E0B', '#0D9488', '#2563EB', '#8B5CF6', '#EC4899', '#6B7280'];

/** Create a new group map: pick a name, an emoji and a color, then start it. */
export default function NewGroupScreen() {
  const router = useRouter();
  const createGroup = useGroupStore((s) => s.createGroup);
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const id = await createGroup(name.trim(), icon, color);
      // Switch to the new group and jump straight to the map (dismiss both modals).
      // setActiveGroup loads memos/members in the background — don't block on it.
      void setActiveGroup(id);
      router.dismissAll();
    } catch (e) {
      Alert.alert('作成できませんでした', String((e as Error)?.message ?? e));
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'グループを作成',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.brand} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.preview}>
          <View style={[styles.previewIcon, { backgroundColor: color + '22' }]}>
            <Text style={styles.previewEmoji}>{icon}</Text>
          </View>
          <Text style={styles.previewName}>{name.trim() || 'グループ名'}</Text>
        </View>

        <Text style={styles.label}>グループ名</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="例: 家族の地図 / ラーメン部"
          placeholderTextColor={colors.subInk}
          style={styles.input}
          autoFocus
          maxLength={40}
        />

        <Text style={styles.label}>アイコン</Text>
        <View style={styles.grid}>
          {ICONS.map((e) => (
            <Pressable
              key={e}
              onPress={() => setIcon(e)}
              style={[styles.iconCell, icon === e && { borderColor: color, backgroundColor: color + '18' }]}>
              <Text style={styles.iconEmoji}>{e}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>カラー</Text>
        <View style={styles.grid}>
          {COLORS.map((c) => (
            <Pressable key={c} onPress={() => setColor(c)} style={styles.swatchCell}>
              <View style={[styles.swatch, { backgroundColor: c }]}>
                {color === c && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <Button label="作成する" onPress={save} loading={saving} disabled={!canSave} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 8 },
  preview: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  previewIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  previewEmoji: { fontSize: 34 },
  previewName: { fontSize: 18, fontWeight: '800', color: colors.ink },
  label: { fontSize: 14, fontWeight: '700', color: colors.subInk, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  iconCell: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 24 },
  swatchCell: { padding: 2 },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actions: { marginTop: 24 },
});
