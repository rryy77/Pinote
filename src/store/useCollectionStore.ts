import { create } from 'zustand';

import * as repo from '@/db/collections';
import type { CollectionPatch } from '@/db/collections';
import type { Collection, CollectionItem, NewCollection, NewItem } from '@/types/collection';
import type { Memo } from '@/types/memo';

/**
 * In-memory cache of collections + all their items, kept in sync with SQLite.
 * Screens read reactively; mutations write through {@link repo} and refresh the
 * cache (collections are re-fetched so their visited/total counts stay correct).
 */
type CollectionStore = {
  collections: Collection[];
  items: CollectionItem[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  itemsOf: (collectionId: string) => CollectionItem[];
  createCollection: (input: NewCollection) => Promise<Collection>;
  updateCollection: (id: string, patch: CollectionPatch) => Promise<void>;
  removeCollection: (id: string) => Promise<void>;
  addItem: (input: NewItem) => Promise<CollectionItem>;
  addMemoAsItem: (collectionId: string, memo: Memo) => Promise<void>;
  markVisited: (itemId: string, memoId: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
};

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  collections: [],
  items: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const [collections, items] = await Promise.all([
        repo.listCollections(),
        repo.listAllItems(),
      ]);
      set({ collections, items, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  itemsOf: (collectionId) => get().items.filter((i) => i.collectionId === collectionId),

  createCollection: async (input) => {
    const collection = await repo.createCollection(input);
    set({ collections: [collection, ...get().collections] });
    return collection;
  },

  updateCollection: async (id, patch) => {
    await repo.updateCollection(id, patch);
    set({ collections: await repo.listCollections() });
  },

  removeCollection: async (id) => {
    await repo.deleteCollection(id);
    set({
      collections: get().collections.filter((c) => c.id !== id),
      items: get().items.filter((i) => i.collectionId !== id),
    });
  },

  addItem: async (input) => {
    const item = await repo.addItem(input);
    set({ items: [...get().items, item], collections: await repo.listCollections() });
    return item;
  },

  addMemoAsItem: async (collectionId, memo) => {
    const item = await repo.addMemoAsItem(collectionId, memo);
    set({ items: [...get().items, item], collections: await repo.listCollections() });
  },

  markVisited: async (itemId, memoId) => {
    await repo.markVisited(itemId, memoId);
    const items = get().items.map((i) =>
      i.id === itemId ? { ...i, visited: true, memoId } : i,
    );
    set({ items, collections: await repo.listCollections() });
  },

  removeItem: async (itemId) => {
    await repo.removeItem(itemId);
    set({
      items: get().items.filter((i) => i.id !== itemId),
      collections: await repo.listCollections(),
    });
  },
}));
