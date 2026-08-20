import * as Crypto from 'expo-crypto';

import type { Collection, CollectionItem, NewCollection, NewItem } from '@/types/collection';
import type { CategoryId, Memo } from '@/types/memo';
import { getDb } from './client';

/**
 * The single data access point for collections ("制覇リスト" / trips) and their
 * items. Like {@link module:db/memos}, UI/store code goes through here so a
 * future cloud-sync layer can be added without changing callers.
 */

type CollectionRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: number;
  updated_at: number;
  total: number;
  visited: number;
};

type ItemRow = {
  id: string;
  collection_id: string;
  title: string;
  lat: number;
  lng: number;
  category: string;
  memo_id: string | null;
  visited: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
};

function toCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    total: row.total ?? 0,
    visited: row.visited ?? 0,
  };
}

function toItem(row: ItemRow): CollectionItem {
  return {
    id: row.id,
    collectionId: row.collection_id,
    title: row.title,
    lat: row.lat,
    lng: row.lng,
    category: row.category as CategoryId,
    memoId: row.memo_id,
    visited: row.visited === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Every collection, newest first, each with its item / visited counts. */
export async function listCollections(): Promise<Collection[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CollectionRow>(`
    SELECT c.*,
      COUNT(i.id) AS total,
      COALESCE(SUM(i.visited), 0) AS visited
    FROM collections c
    LEFT JOIN collection_items i ON i.collection_id = c.id
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `);
  return rows.map(toCollection);
}

export async function createCollection(input: NewCollection): Promise<Collection> {
  const db = await getDb();
  const now = Date.now();
  const id = Crypto.randomUUID();
  await db.runAsync(
    'INSERT INTO collections (id, name, icon, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    input.name.trim(),
    input.icon,
    input.color,
    now,
    now,
  );
  return { id, name: input.name.trim(), icon: input.icon, color: input.color, createdAt: now, updatedAt: now, total: 0, visited: 0 };
}

export type CollectionPatch = Partial<Pick<Collection, 'name' | 'icon' | 'color'>>;

export async function updateCollection(id: string, patch: CollectionPatch): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name.trim()); }
  if (patch.icon !== undefined) { fields.push('icon = ?'); values.push(patch.icon); }
  if (patch.color !== undefined) { fields.push('color = ?'); values.push(patch.color); }
  fields.push('updated_at = ?'); values.push(now);
  await db.runAsync(`UPDATE collections SET ${fields.join(', ')} WHERE id = ?`, ...values, id);
}

/** Delete a collection and all of its items. */
export async function deleteCollection(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM collection_items WHERE collection_id = ?', id);
  await db.runAsync('DELETE FROM collections WHERE id = ?', id);
}

/** Every item across all collections (for the in-memory cache). */
export async function listAllItems(): Promise<CollectionItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ItemRow>(
    'SELECT * FROM collection_items ORDER BY sort_order ASC',
  );
  return rows.map(toItem);
}

/** Items of a collection, in insertion order. */
export async function listItems(collectionId: string): Promise<CollectionItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ItemRow>(
    'SELECT * FROM collection_items WHERE collection_id = ? ORDER BY sort_order ASC',
    collectionId,
  );
  return rows.map(toItem);
}

async function touchCollection(collectionId: string, at: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE collections SET updated_at = ? WHERE id = ?', at, collectionId);
}

/** Add an item (candidate by default; a visited/linked item when specified). */
export async function addItem(input: NewItem): Promise<CollectionItem> {
  const db = await getDb();
  const now = Date.now();
  const id = Crypto.randomUUID();
  const item: CollectionItem = {
    id,
    collectionId: input.collectionId,
    title: input.title.trim(),
    lat: input.lat,
    lng: input.lng,
    category: input.category ?? 'other',
    memoId: input.memoId ?? null,
    visited: input.visited ?? false,
    sortOrder: now,
    createdAt: now,
    updatedAt: now,
  };
  await db.runAsync(
    'INSERT INTO collection_items (id, collection_id, title, lat, lng, category, memo_id, visited, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    item.id,
    item.collectionId,
    item.title,
    item.lat,
    item.lng,
    item.category,
    item.memoId,
    item.visited ? 1 : 0,
    item.sortOrder,
    item.createdAt,
    item.updatedAt,
  );
  await touchCollection(input.collectionId, now);
  return item;
}

/** Add an existing memo to a collection as an already-visited item. */
export async function addMemoAsItem(collectionId: string, memo: Memo): Promise<CollectionItem> {
  return addItem({
    collectionId,
    title: memo.title,
    lat: memo.lat,
    lng: memo.lng,
    category: memo.category,
    memoId: memo.id,
    visited: true,
  });
}

/** Flip a candidate item to visited, linking it to the memo just created. */
export async function markVisited(itemId: string, memoId: string): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  const row = await db.getFirstAsync<ItemRow>('SELECT * FROM collection_items WHERE id = ?', itemId);
  await db.runAsync(
    'UPDATE collection_items SET visited = 1, memo_id = ?, updated_at = ? WHERE id = ?',
    memoId,
    now,
    itemId,
  );
  if (row) await touchCollection(row.collection_id, now);
}

export async function removeItem(itemId: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<ItemRow>('SELECT * FROM collection_items WHERE id = ?', itemId);
  await db.runAsync('DELETE FROM collection_items WHERE id = ?', itemId);
  if (row) await touchCollection(row.collection_id, Date.now());
}
