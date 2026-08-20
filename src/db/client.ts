import * as SQLite from 'expo-sqlite';

/**
 * Local SQLite connection for Pinote.
 *
 * A single shared connection is opened lazily and reused. Schema changes are
 * applied through {@link migrate}, versioned via `PRAGMA user_version` so future
 * columns (e.g. photo path, cloud sync ids) can be added incrementally.
 */

const DB_NAME = 'pinote.db';
const LATEST_VERSION = 4;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS memos (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'other',
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_memos_updated_at ON memos (updated_at DESC);
    `);
    version = 1;
  }

  if (version < 2) {
    // Add photo / rating / revisit fields for richer memos.
    await db.execAsync(`
      ALTER TABLE memos ADD COLUMN rating INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE memos ADD COLUMN want_revisit INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE memos ADD COLUMN photo_uri TEXT;
    `);
    version = 2;
  }

  if (version < 3) {
    // Collections ("制覇リスト" / trips) and their items. An item is a candidate
    // place (memo_id NULL, visited 0) until the user visits it, then it links to
    // a memo and flips to visited 1.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '📍',
        color TEXT NOT NULL DEFAULT '#FF5B4A',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS collection_items (
        id TEXT PRIMARY KEY NOT NULL,
        collection_id TEXT NOT NULL,
        title TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        category TEXT NOT NULL DEFAULT 'other',
        memo_id TEXT,
        visited INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_items_collection ON collection_items (collection_id, sort_order);
    `);
    version = 3;
  }

  if (version < 4) {
    // Free-form tags (e.g. #絶景 #穴場), stored as a JSON string array.
    await db.execAsync(`
      ALTER TABLE memos ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
    `);
    version = 4;
  }

  if (version !== LATEST_VERSION) version = LATEST_VERSION;
  await db.execAsync(`PRAGMA user_version = ${version}`);
}

/** Returns the shared database connection, initializing it on first use. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}
