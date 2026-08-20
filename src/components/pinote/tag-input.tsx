import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/constants/colors';

/** Frequently useful tags offered as one-tap suggestions. */
export const SUGGESTED_TAGS = [
  '絶景',
  '穴場',
  '神グルメ',
  'コスパ',
  '映え',
  '記念日',
  '静か',
  '子連れOK',
  'ひとり',
  '再訪したい',
];

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
};

function clean(tag: string): string {
  return tag.replace(/^#+/, '').trim();
}

/** Tag editor: removable chips + one-tap suggestions + free text entry. */
export function TagInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const tag = clean(raw);
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
    setDraft('');
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const suggestions = SUGGESTED_TAGS.filter((t) => !value.includes(t));

  return (
    <View style={styles.wrap}>
      {value.length > 0 && (
        <View style={styles.chips}>
          {value.map((t) => (
            <Pressable key={t} onPress={() => remove(t)} style={styles.chip}>
              <Text style={styles.chipText}>#{t}</Text>
              <Ionicons name="close" size={13} color={colors.onAccent} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <Text style={styles.hash}>#</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="タグを追加（例: 絶景）"
          placeholderTextColor={colors.subInk}
          style={styles.input}
          autoCapitalize="none"
          returnKeyType="done"
          blurOnSubmit={false}
          onSubmitEditing={() => add(draft)}
        />
        {draft.trim().length > 0 && (
          <Pressable onPress={() => add(draft)} hitSlop={8}>
            <Ionicons name="add-circle" size={24} color={colors.brand} />
          </Pressable>
        )}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestRow}>
          {suggestions.map((t) => (
            <Pressable key={t} onPress={() => add(t)} style={styles.suggestChip}>
              <Text style={styles.suggestText}>#{t}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.onAccent,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  hash: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.subInk,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  suggestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceMuted,
  },
  suggestText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subInk,
  },
});
