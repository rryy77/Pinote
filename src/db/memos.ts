import * as Crypto from 'expo-crypto';

import type { CategoryId, Memo, NewMemo } from '@/types/memo';
import { deletePhoto, isStoredPhoto, savePhoto } from '@/utils/photo';
import { getDb } from './client';

/**
 * The single data access point for memos. UI and store code should go through
 * these functions rather than touching SQL directly, so a future cloud-sync
 * layer can be added here without changing callers.
 */

type MemoRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  lat: number;
  lng: number;
  rating: number;
  want_revisit: number;
  photo_uri: string | null;
  created_at: number;
  updated_at: number;
};

function toMemo(row: MemoRow): Memo {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category as CategoryId,
    lat: row.lat,
    lng: row.lng,
    rating: row.rating,
    wantRevisit: row.want_revisit === 1,
    photoUri: row.photo_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** All memos, newest-updated first. */
export async function listMemos(): Promise<Memo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MemoRow>('SELECT * FROM memos ORDER BY updated_at DESC');
  return rows.map(toMemo);
}

/** A single memo by id, or null if it does not exist. */
export async function getMemo(id: string): Promise<Memo | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<MemoRow>('SELECT * FROM memos WHERE id = ?', id);
  return row ? toMemo(row) : null;
}

/** Insert a new memo at the given coordinates and return the stored record. */
export async function createMemo(input: NewMemo): Promise<Memo> {
  const db = await getDb();
  const now = Date.now();
  const id = Crypto.randomUUID();
  const photoUri = input.photoUri ? savePhoto(input.photoUri, id) : null;
  const memo: Memo = {
    id,
    title: input.title.trim(),
    body: input.body.trim(),
    category: input.category,
    lat: input.lat,
    lng: input.lng,
    rating: input.rating ?? 0,
    wantRevisit: input.wantRevisit ?? false,
    photoUri,
    createdAt: now,
    updatedAt: now,
  };
  await db.runAsync(
    'INSERT INTO memos (id, title, body, category, lat, lng, rating, want_revisit, photo_uri, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    memo.id,
    memo.title,
    memo.body,
    memo.category,
    memo.lat,
    memo.lng,
    memo.rating,
    memo.wantRevisit ? 1 : 0,
    memo.photoUri,
    memo.createdAt,
    memo.updatedAt,
  );
  return memo;
}

export type MemoPatch = Partial<
  Pick<Memo, 'title' | 'body' | 'category' | 'lat' | 'lng' | 'rating' | 'wantRevisit' | 'photoUri'>
>;

/**
 * Resolve the photo uri to store, given the patch value.
 * - `undefined` keeps the existing photo.
 * - `null` removes it (and deletes the file).
 * - an already-stored uri is kept as-is.
 * - a new (picker) uri is copied into permanent storage, replacing any old one.
 */
function resolvePhoto(id: string, existing: string | null, next: string | null | undefined): string | null {
  if (next === undefined) return existing;
  if (next === null) {
    deletePhoto(existing);
    return null;
  }
  if (existing && next === existing) return existing;
  if (isStoredPhoto(next)) return next;
  deletePhoto(existing);
  return savePhoto(next, id);
}

/** Update a memo's editable fields and bump its updated_at timestamp. */
export async function updateMemo(id: string, patch: MemoPatch): Promise<Memo | null> {
  const db = await getDb();
  const existing = await getMemo(id);
  if (!existing) return null;

  const title = (patch.title ?? existing.title).trim();
  const body = (patch.body ?? existing.body).trim();
  const category = patch.category ?? existing.category;
  const lat = patch.lat ?? existing.lat;
  const lng = patch.lng ?? existing.lng;
  const rating = patch.rating ?? existing.rating;
  const wantRevisit = patch.wantRevisit ?? existing.wantRevisit;
  const photoUri = resolvePhoto(id, existing.photoUri, patch.photoUri);
  const now = Date.now();

  await db.runAsync(
    'UPDATE memos SET title = ?, body = ?, category = ?, lat = ?, lng = ?, rating = ?, want_revisit = ?, photo_uri = ?, updated_at = ? WHERE id = ?',
    title,
    body,
    category,
    lat,
    lng,
    rating,
    wantRevisit ? 1 : 0,
    photoUri,
    now,
    id,
  );
  return { ...existing, title, body, category, lat, lng, rating, wantRevisit, photoUri, updatedAt: now };
}

/** Permanently delete a memo and its photo. */
export async function deleteMemo(id: string): Promise<void> {
  const db = await getDb();
  const existing = await getMemo(id);
  deletePhoto(existing?.photoUri ?? null);
  await db.runAsync('DELETE FROM memos WHERE id = ?', id);
}
