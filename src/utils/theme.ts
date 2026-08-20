import { File, Paths } from 'expo-file-system';

/** Persisted appearance choice. Absent = the user hasn't chosen yet. */
export type ThemeMode = 'light' | 'dark';

const FILE = 'theme.mode';

export function getStoredTheme(): ThemeMode | null {
  try {
    const file = new File(Paths.document, FILE);
    if (!file.exists) return null;
    const v = file.textSync().trim();
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function setStoredTheme(mode: ThemeMode): void {
  try {
    const file = new File(Paths.document, FILE);
    if (file.exists) file.delete();
    file.create();
    file.write(mode);
  } catch {
    // A failed write just means the choice won't persist — not fatal.
  }
}
