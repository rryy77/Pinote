import { File, Paths } from 'expo-file-system';

/**
 * The app's main (accent) color. The user can pick from a few presets; the
 * choice is persisted and read synchronously at startup by
 * {@link module:constants/colors} so every StyleSheet picks it up. Changing it
 * requires an app reload (see the appearance screen).
 */

export type AccentPreset = {
  id: string;
  label: string;
  brand: string;
  brandDark: string;
};

export const ACCENTS: AccentPreset[] = [
  { id: 'coral', label: 'コーラル', brand: '#FF5B4A', brandDark: '#E8452F' },
  { id: 'blue', label: 'ブルー', brand: '#2E7CF6', brandDark: '#1E63D0' },
  { id: 'teal', label: 'グリーン', brand: '#12B886', brandDark: '#0E9A72' },
  { id: 'purple', label: 'パープル', brand: '#7C5CFC', brandDark: '#6344E0' },
  { id: 'pink', label: 'ピンク', brand: '#EC4899', brandDark: '#D62E82' },
  { id: 'orange', label: 'オレンジ', brand: '#F97316', brandDark: '#E2620C' },
];

const DEFAULT = ACCENTS[0];
const FILE = 'accent.id';

export function getStoredAccentId(): string {
  try {
    const file = new File(Paths.document, FILE);
    return file.exists ? file.textSync().trim() || DEFAULT.id : DEFAULT.id;
  } catch {
    return DEFAULT.id;
  }
}

export function getAccent(): AccentPreset {
  const id = getStoredAccentId();
  return ACCENTS.find((a) => a.id === id) ?? DEFAULT;
}

export function setStoredAccentId(id: string): void {
  try {
    const file = new File(Paths.document, FILE);
    if (file.exists) file.delete();
    file.create();
    file.write(id);
  } catch {
    // A failed write just means the choice won't persist — not fatal.
  }
}
