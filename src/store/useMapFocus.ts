import { create } from 'zustand';

/**
 * A one-shot request to reveal something on the main map. Screens presented over
 * the map (library, collection detail, memo detail) set this and then dismiss
 * back to the map; the map consumes it — centering, filtering, and highlighting
 * as needed — so everything happens on the *same* map instead of a new screen.
 */
export type MapFocus =
  | { kind: 'collection'; id: string }
  | { kind: 'memo'; id: string; lat: number; lng: number }
  | null;

type State = {
  focus: MapFocus;
  requestFocus: (focus: MapFocus) => void;
  clearFocus: () => void;
};

export const useMapFocus = create<State>((set) => ({
  focus: null,
  requestFocus: (focus) => set({ focus }),
  clearFocus: () => set({ focus: null }),
}));
