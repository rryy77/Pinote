import type { CategoryId } from '@/types/memo';

/**
 * A themed "制覇リスト" / trip: a named group of places the user wants to visit
 * and check off (e.g. a ramen tour). Progress is `visited / total`.
 */
export type Collection = {
  id: string;
  name: string;
  /** A single emoji shown as the collection's badge. */
  icon: string;
  /** Accent color (hex) used for the badge and progress bar. */
  color: string;
  createdAt: number;
  updatedAt: number;
  /** Total item count (populated by list queries; 0 for a fresh object). */
  total: number;
  /** Visited ("制覇") item count. */
  visited: number;
};

/**
 * One entry in a collection. A *candidate* has `memoId: null, visited: false`;
 * once the user goes there it becomes visited and is linked to a memo (which
 * holds the photo / rating).
 */
export type CollectionItem = {
  id: string;
  collectionId: string;
  title: string;
  lat: number;
  lng: number;
  category: CategoryId;
  /** Linked memo id once visited, or null while still a candidate. */
  memoId: string | null;
  visited: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type NewCollection = {
  name: string;
  icon: string;
  color: string;
};

export type NewItem = {
  collectionId: string;
  title: string;
  lat: number;
  lng: number;
  category?: CategoryId;
  memoId?: string | null;
  visited?: boolean;
};
