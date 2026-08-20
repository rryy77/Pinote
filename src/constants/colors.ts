import { DynamicColorIOS, type OpaqueColorValue, Platform } from 'react-native';

import { getAccent } from '@/utils/accent';

/**
 * Pinote's visual identity. The brand is a warm coral — the color of the
 * "drop a pin / leave a mark on a place" moment that the app is built around.
 * Category pins keep their own hues; the coral is reserved for the primary
 * action and the placement cursor so the main gesture always reads as the hero.
 *
 * Structural neutrals (bg / surface / ink / …) are theme-aware: on iOS they are
 * `DynamicColorIOS` values that resolve to the light or dark variant based on
 * the current appearance, which the user can override in-app via
 * {@link useThemeStore} → `Appearance.setColorScheme`. Accent colors (coral,
 * category tints, amber) stay the same in both themes.
 */

type ColorValue = string | OpaqueColorValue;

/** A light/dark pair — dynamic on iOS, light-only elsewhere. */
function dyn(light: string, dark: string): ColorValue {
  return Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : light;
}

// The user-chosen accent, read once at startup. Changing it persists the choice
// and reloads the app so every StyleSheet re-reads this.
const accent = getAccent();

export const colors = {
  // Accent — user-configurable, identical in light and dark.
  brand: accent.brand,
  brandDark: accent.brandDark,
  amber: '#F5A623',
  /** Text/icons that sit on top of a colored (accent) surface — always white. */
  onAccent: '#FFFFFF',

  // A soft translucent tint of the accent (works over light or dark surfaces).
  brandSoft: accent.brand + '22',
  bg: dyn('#F4F5F7', '#000000'),
  surface: dyn('#FFFFFF', '#1C1C1E'),
  /** Muted fill for thumbnails, inputs, chips. */
  surfaceMuted: dyn('#EEF1F4', '#2C2C2E'),
  ink: dyn('#191B23', '#F5F6F8'),
  subInk: dyn('#6B7180', '#9BA0AA'),
  /** Faint icons, chevrons, disabled glyphs. */
  faint: dyn('#C4C7CC', '#5A5E66'),
  hairline: dyn('#E7E8EC', '#2C2C2E'),
} as const;
