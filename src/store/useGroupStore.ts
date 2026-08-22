import type { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';

import * as groupsRepo from '@/cloud/groups';
import * as sharedRepo from '@/cloud/shared-memos';
import { supabase } from '@/lib/supabase';
import type { Group, GroupMember, NewSharedMemo, SharedMemo } from '@/types/group';

/**
 * Cloud sharing state: the groups you belong to, the currently-active group map,
 * its members, and its memos — kept live via Supabase Realtime. The personal
 * (local SQLite) map is represented by `activeGroupId === null`.
 *
 * Realtime: while a group is active we subscribe to its shared_memos and refetch
 * on any change, so every member's map updates within a second of an edit.
 */
type GroupStore = {
  groups: Group[];
  loaded: boolean;
  activeGroupId: string | null;
  members: GroupMember[];
  sharedMemos: SharedMemo[];
  loadingMemos: boolean;

  loadGroups: () => Promise<void>;
  setActiveGroup: (id: string | null) => Promise<void>;
  refreshActive: () => Promise<void>;

  createGroup: (name: string, icon: string, color: string) => Promise<string>;
  joinByCode: (code: string) => Promise<string>;
  createInvite: (groupId: string) => Promise<string>;
  leaveGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;

  addSharedMemo: (input: NewSharedMemo) => Promise<SharedMemo>;
  removeSharedMemo: (id: string) => Promise<void>;

  /** Reset everything (e.g. on sign-out). */
  reset: () => void;
};

// The active Realtime subscription (kept outside state so it doesn't trigger renders).
let channel: RealtimeChannel | null = null;

function unsubscribe() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  groups: [],
  loaded: false,
  activeGroupId: null,
  members: [],
  sharedMemos: [],
  loadingMemos: false,

  loadGroups: async () => {
    const groups = await groupsRepo.listGroups();
    set({ groups, loaded: true });
    // If the active group vanished (left/deleted), fall back to the personal map.
    const active = get().activeGroupId;
    if (active && !groups.some((g) => g.id === active)) {
      await get().setActiveGroup(null);
    }
  },

  setActiveGroup: async (id) => {
    unsubscribe();
    set({ activeGroupId: id, members: [], sharedMemos: [] });
    if (!id) return;

    set({ loadingMemos: true });
    try {
      const [memos, members] = await Promise.all([
        sharedRepo.listByGroup(id),
        groupsRepo.listMembers(id),
      ]);
      // Guard against a race where the user switched again while loading.
      if (get().activeGroupId !== id) return;
      set({ sharedMemos: memos, members });
    } finally {
      if (get().activeGroupId === id) set({ loadingMemos: false });
    }

    channel = supabase
      .channel(`shared_memos:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shared_memos', filter: `group_id=eq.${id}` },
        () => {
          void get().refreshActive();
        },
      )
      .subscribe();
  },

  refreshActive: async () => {
    const id = get().activeGroupId;
    if (!id) return;
    try {
      const memos = await sharedRepo.listByGroup(id);
      if (get().activeGroupId === id) set({ sharedMemos: memos });
    } catch {
      // transient; the next realtime event or manual refresh will catch up
    }
  },

  createGroup: async (name, icon, color) => {
    const id = await groupsRepo.createGroup(name, icon, color);
    // Optimistically add it so the UI can navigate immediately (no refetch round
    // trip); the next loadGroups reconciles created_at etc.
    const { data } = await supabase.auth.getSession();
    const ownerId = data.session?.user?.id ?? '';
    const group: Group = { id, name, icon, color, ownerId, createdAt: Date.now() };
    set({ groups: [...get().groups, group] });
    return id;
  },

  joinByCode: async (code) => {
    const id = await groupsRepo.joinByCode(code);
    await get().loadGroups();
    return id;
  },

  createInvite: (groupId) => groupsRepo.createInvite(groupId),

  leaveGroup: async (groupId) => {
    await groupsRepo.leaveGroup(groupId);
    if (get().activeGroupId === groupId) await get().setActiveGroup(null);
    await get().loadGroups();
  },

  deleteGroup: async (groupId) => {
    await groupsRepo.deleteGroup(groupId);
    if (get().activeGroupId === groupId) await get().setActiveGroup(null);
    await get().loadGroups();
  },

  addSharedMemo: async (input) => {
    const memo = await sharedRepo.createSharedMemo(input);
    // Optimistically show it; realtime refetch will reconcile ordering.
    if (get().activeGroupId === input.groupId) {
      set({ sharedMemos: [memo, ...get().sharedMemos.filter((m) => m.id !== memo.id)] });
    }
    return memo;
  },

  removeSharedMemo: async (id) => {
    await sharedRepo.removeSharedMemo(id);
    set({ sharedMemos: get().sharedMemos.filter((m) => m.id !== id) });
  },

  reset: () => {
    unsubscribe();
    set({ groups: [], loaded: false, activeGroupId: null, members: [], sharedMemos: [] });
  },
}));
