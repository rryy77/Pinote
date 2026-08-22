import type { CategoryId } from '@/types/memo';

/** Role within a group. The creator is the owner; everyone else is a member. */
export type GroupRole = 'owner' | 'member';

/** A shared map that members create memos on together. */
export type Group = {
  id: string;
  name: string;
  /** Emoji shown as the group's glyph. */
  icon: string;
  /** Accent color (hex) used for the group's banner/badges. */
  color: string;
  ownerId: string;
  createdAt: number;
};

/** A member of a group, with their profile name resolved for display. */
export type GroupMember = {
  userId: string;
  role: GroupRole;
  displayName: string;
  joinedAt: number;
};

/**
 * A memo on a group's shared map. Mirrors the local {@link Memo} shape closely so
 * it can flow through the same map/cluster/card pipeline, plus author attribution.
 */
export type SharedMemo = {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  category: CategoryId;
  lat: number;
  lng: number;
  rating: number;
  wantToGo: boolean;
  tags: string[];
  photoUrl: string | null;
  createdAt: number;
  updatedAt: number;
};

/** Fields required to create a shared memo. */
export type NewSharedMemo = {
  groupId: string;
  title: string;
  body: string;
  category: CategoryId;
  lat: number;
  lng: number;
  rating?: number;
  wantToGo?: boolean;
  tags?: string[];
  photoUrl?: string | null;
};
