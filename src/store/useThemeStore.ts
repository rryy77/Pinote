import { Appearance } from 'react-native';
import { create } from 'zustand';

import { getStoredTheme, setStoredTheme, type ThemeMode } from '@/utils/theme';

/**
 * In-app light/dark control. We drive the whole app's appearance with
 * `Appearance.setColorScheme`, which flips every `DynamicColorIOS` value in
 * {@link module:constants/colors} plus system components. The choice is
 * persisted; `chosen` is false until the user has picked once (used to show the
 * first-run theme prompt).
 */
type ThemeStore = {
  /** The active mode actually shown (falls back to the system scheme). */
  mode: ThemeMode;
  /** Whether the user has explicitly chosen a theme. */
  chosen: boolean;
  hydrate: () => void;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

function systemMode(): ThemeMode {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: systemMode(),
  chosen: false,

  hydrate: () => {
    const stored = getStoredTheme();
    if (stored) {
      Appearance.setColorScheme(stored);
      set({ mode: stored, chosen: true });
    } else {
      // No choice yet: leave the system appearance in place until the user picks.
      set({ mode: systemMode(), chosen: false });
    }
  },

  setMode: (mode) => {
    setStoredTheme(mode);
    Appearance.setColorScheme(mode);
    set({ mode, chosen: true });
  },

  toggle: () => get().setMode(get().mode === 'dark' ? 'light' : 'dark'),
}));
