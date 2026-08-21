/** A category identifier used to color/label a memo's map pin. */
export type CategoryId = 'food' | 'cafe' | 'shop' | 'hotel' | 'parking' | 'spot' | 'other';

/** A location-anchored memo, as stored in the local SQLite database. */
export type Memo = {
  id: string;
  title: string;
  body: string;
  category: CategoryId;
  /** Latitude in decimal degrees. */
  lat: number;
  /** Longitude in decimal degrees. */
  lng: number;
  /** Star rating 0–5 (0 means unrated). */
  rating: number;
  /** "Want to revisit" flag. */
  wantRevisit: boolean;
  /** "Want to go" flag — a planned place not visited yet (行きたい). */
  wantToGo: boolean;
  /** Free-form tags (without the leading #), e.g. ["絶景", "穴場"]. */
  tags: string[];
  /** Persistent local uri of an attached photo, or null. */
  photoUri: string | null;
  /** Creation time, epoch milliseconds. */
  createdAt: number;
  /** Last update time, epoch milliseconds. */
  updatedAt: number;
};

/**
 * Fields required to create a new memo. `photoUri`, when provided, is a *source*
 * uri from the image picker; the repository copies it into permanent storage.
 */
export type NewMemo = {
  title: string;
  body: string;
  category: CategoryId;
  lat: number;
  lng: number;
  rating?: number;
  wantRevisit?: boolean;
  wantToGo?: boolean;
  tags?: string[];
  photoUri?: string | null;
};
