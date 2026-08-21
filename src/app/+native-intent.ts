import { getShareExtensionKey } from 'expo-share-intent';

/**
 * Expo Router hands every incoming deep link here before routing. The iOS share
 * extension re-opens Pinote with a link like `pinote://dataUrl=pinoteShareKey?…`,
 * which matches no screen (→ "Unmatched Route"). We detect that link and redirect
 * to the home screen, where `ShareIntentHandler` consumes the shared data and
 * opens the pre-filled memo form.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
      return '/';
    }
    return path;
  } catch {
    return '/';
  }
}
