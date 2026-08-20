import { File, Paths } from 'expo-file-system';

/** A tiny flag file marking that the first-run intro has been seen. */
const FLAG = 'onboarded.flag';

export function hasOnboarded(): boolean {
  try {
    return new File(Paths.document, FLAG).exists;
  } catch {
    return false;
  }
}

export function setOnboarded(): void {
  try {
    const file = new File(Paths.document, FLAG);
    if (!file.exists) file.create();
  } catch {
    // A failed flag write just means the intro may show again — not fatal.
  }
}
