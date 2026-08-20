import { Directory, File, Paths } from 'expo-file-system';

/**
 * Photo persistence for memos. The image picker returns a temporary uri that
 * the OS may purge; we copy the picked file into the app's document directory
 * (named by memo id) so it survives, and delete it when the memo is removed.
 */

const PHOTO_DIR = 'photos';

function photosDir(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** True when `uri` already points inside our permanent photo storage. */
export function isStoredPhoto(uri: string): boolean {
  return uri.includes(`/${PHOTO_DIR}/`);
}

/** Copy a picked image into permanent storage for `memoId`; returns its uri. */
export function savePhoto(sourceUri: string, memoId: string): string {
  const dir = photosDir();
  const src = new File(sourceUri);
  const ext = src.extension || '.jpg';
  const dest = new File(dir, `${memoId}${ext}`);
  if (dest.exists) dest.delete();
  src.copy(dest);
  return dest.uri;
}

/** Best-effort delete of a stored photo. */
export function deletePhoto(uri: string | null): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Ignore — a missing photo file is not fatal.
  }
}
