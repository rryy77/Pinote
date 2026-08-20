import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/pinote/button';
import { colors } from '@/constants/colors';
import { useCollectionStore } from '@/store/useCollectionStore';

const EMOJIS = ['🍜', '☕️', '🍣', '🍔', '🍶', '🏯', '⛩️', '🏖️', '🗻', '🌸', '🎡', '⭐️'];
const COLORS = ['#FF5B4A', '#EF4444', '#F59E0B', '#0D9488', '#2563EB', '#8B5CF6', '#EC4899', '#111827'];

export default function NewCollectionScreen() {
  const router = useRouter();
  const create = useCollectionStore((s) => s.createCollection);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const c = await create({ name, icon, color });
      router.replace({ pathname: '/collections/[id]', params: { id: c.id } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: 'コレクションを作成',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.brand} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.preview, { backgroundColor: color + '22' }]}>
          <Text style={styles.previewEmoji}>{icon}</Text>
        </View>

        <Text style={styles.label}>名前</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="例: 渋谷ラーメンめぐり"
          placeholderTextColor="#9AA0A6"
          style={styles.input}
          autoFocus
          returnKeyType="done"
        />

        <Text style={styles.label}>アイコン</Text>
        <View style={styles.grid}>
          {EMOJIS.map((e) => (
            <Pressable
              key={e}
              onPress={() => setIcon(e)}
              style={[styles.emojiCell, icon === e && { borderColor: color, backgroundColor: color + '18' }]}>
              <Text style={styles.emoji}>{e}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>カラー</Text>
        <View style={styles.grid}>
          {COLORS.map((c) => (
            <Pressable key={c} onPress={() => setColor(c)} style={[styles.colorCell, { backgroundColor: c }]}>
              {color === c && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <Button label="作成する" onPress={save} loading={saving} disabled={!canSave} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 8 },
  preview: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  previewEmoji: { fontSize: 44 },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#60646C',
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D8DBDF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#FFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  emojiCell: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  colorCell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { marginTop: 24 },
});
