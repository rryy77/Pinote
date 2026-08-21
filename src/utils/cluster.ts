import type { Memo } from '@/types/memo';

/** A map point after clustering: either a single memo or an aggregated cluster. */
export type ClusterPoint =
  | { type: 'memo'; memo: Memo }
  | {
      type: 'cluster';
      id: string;
      latitude: number;
      longitude: number;
      count: number;
      /** The shared category of the cluster's members (clusters never mix categories). */
      category: string;
      memoIds: string[];
      /** Member coordinates, so a tap can zoom to frame them. */
      points: { latitude: number; longitude: number }[];
    };

/** Approx. cluster radius in screen pixels used to derive the grid cell size. */
const CLUSTER_PX = 72;

/** Grid cell size in degrees for a given zoom (Web-Mercator pixel scale). */
function cellSize(zoom: number): number {
  const z = Math.max(1, Math.min(20, zoom));
  return (CLUSTER_PX * 360) / (256 * Math.pow(2, z));
}

/**
 * Grid-cluster memos based on the current zoom. Cells shrink as you zoom in, so
 * nearby pins merge when zoomed out and separate when zoomed in. Clustering
 * depends only on zoom (not the map center), so panning never re-clusters.
 *
 * Cells are keyed by category too, so a cluster only ever groups memos of one
 * category — the bubble can then be tinted and read as "N of this kind here".
 */
export function clusterMemos(memos: Memo[], zoom: number): ClusterPoint[] {
  if (memos.length === 0) return [];
  const cell = cellSize(zoom);
  const cells = new Map<string, Memo[]>();

  for (const m of memos) {
    const key = `${m.category}:${Math.floor(m.lng / cell)}:${Math.floor(m.lat / cell)}`;
    const group = cells.get(key);
    if (group) group.push(m);
    else cells.set(key, [m]);
  }

  const points: ClusterPoint[] = [];
  for (const [key, group] of cells) {
    if (group.length === 1) {
      points.push({ type: 'memo', memo: group[0] });
      continue;
    }
    const latitude = group.reduce((s, m) => s + m.lat, 0) / group.length;
    const longitude = group.reduce((s, m) => s + m.lng, 0) / group.length;
    points.push({
      type: 'cluster',
      id: `cluster:${key}`,
      latitude,
      longitude,
      count: group.length,
      category: group[0].category,
      memoIds: group.map((m) => m.id),
      points: group.map((m) => ({ latitude: m.lat, longitude: m.lng })),
    });
  }
  return points;
}
