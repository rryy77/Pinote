import { File, Paths } from 'expo-file-system';

import type { CategoryId } from '@/types/memo';
import { createMemo, listMemos } from './memos';

/**
 * Backup / restore for Pinote. Memos and their photos (as base64) are bundled
 * into a single JSON file the user can save anywhere (Files, iCloud Drive…) and
 * later import — the safety net for device-only storage.
 */

const BACKUP_VERSION = 1;

type BackupMemo = {
  title: string;
  body: string;
  category: CategoryId;
  lat: number;
  lng: number;
  rating: number;
  wantRevisit: boolean;
  createdAt: number;
  updatedAt: number;
  photo?: string;
  photoExt?: string;
};

/** Serialize all memos (with embedded photos) into a JSON string. */
async function buildBackupJson(): Promise<string> {
  const memos = await listMemos();
  const out: BackupMemo[] = memos.map((m) => {
    let photo: string | undefined;
    let photoExt: string | undefined;
    if (m.photoUri) {
      try {
        const f = new File(m.photoUri);
        if (f.exists) {
          photo = f.base64Sync();
          photoExt = f.extension || '.jpg';
        }
      } catch {
        // A missing photo file shouldn't abort the whole backup.
      }
    }
    return {
      title: m.title,
      body: m.body,
      category: m.category,
      lat: m.lat,
      lng: m.lng,
      rating: m.rating,
      wantRevisit: m.wantRevisit,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      photo,
      photoExt,
    };
  });
  return JSON.stringify({ app: 'pinote', version: BACKUP_VERSION, exportedAt: Date.now(), memos: out });
}

/** Write a backup file to the cache directory and return its uri (to share). */
export async function writeBackupFile(): Promise<string> {
  const json = await buildBackupJson();
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `pinote-backup-${stamp}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  return file.uri;
}

/** Restore memos from a backup file. Returns the number of memos imported. */
export async function importBackup(uri: string): Promise<number> {
  const text = new File(uri).textSync();
  const data = JSON.parse(text) as { app?: string; memos?: BackupMemo[] };
  if (!data || !Array.isArray(data.memos)) {
    throw new Error('このファイルは Pinote のバックアップではありません。');
  }

  let count = 0;
  for (const m of data.memos) {
    let photoSource: string | undefined;
    if (m.photo) {
      const tmp = new File(Paths.cache, `import-${Date.now()}-${count}${m.photoExt ?? '.jpg'}`);
      if (tmp.exists) tmp.delete();
      tmp.create();
      tmp.write(m.photo, { encoding: 'base64' });
      photoSource = tmp.uri;
    }
    await createMemo({
      title: m.title ?? '',
      body: m.body ?? '',
      category: (m.category ?? 'other') as CategoryId,
      lat: m.lat,
      lng: m.lng,
      rating: m.rating ?? 0,
      wantRevisit: m.wantRevisit ?? false,
      photoUri: photoSource,
    });
    count += 1;
  }
  return count;
}
