import { create } from 'zustand';

import * as repo from '@/db/memos';
import type { MemoPatch } from '@/db/memos';
import type { Memo, NewMemo } from '@/types/memo';

/**
 * In-memory cache of all memos, kept in sync with the SQLite store. Screens read
 * `memos` reactively; mutations write through the {@link repo} and update the cache
 * so the map and list reflect changes immediately.
 */
type MemoStore = {
  memos: Memo[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  add: (input: NewMemo) => Promise<Memo>;
  update: (id: string, patch: MemoPatch) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const byUpdatedDesc = (a: Memo, b: Memo) => b.updatedAt - a.updatedAt;

export const useMemoStore = create<MemoStore>((set, get) => ({
  memos: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const memos = await repo.listMemos();
      set({ memos, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  add: async (input) => {
    const memo = await repo.createMemo(input);
    set({ memos: [memo, ...get().memos] });
    return memo;
  },

  update: async (id, patch) => {
    const updated = await repo.updateMemo(id, patch);
    if (!updated) return;
    set({
      memos: get()
        .memos.map((m) => (m.id === id ? updated : m))
        .sort(byUpdatedDesc),
    });
  },

  remove: async (id) => {
    await repo.deleteMemo(id);
    set({ memos: get().memos.filter((m) => m.id !== id) });
  },
}));
