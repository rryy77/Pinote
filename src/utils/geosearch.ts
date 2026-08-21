import * as Location from 'expo-location';

/**
 * Place search that understands *business / POI names* (e.g. "一蘭 京都河原町店"),
 * not just postal addresses.
 *
 * Apple's `Location.geocodeAsync` only resolves addresses, so shop names return
 * nothing. We search Komoot's Photon first (free, no API key, POI-aware, and —
 * unlike Nominatim, which 403s app requests — usable without a custom User-Agent)
 * and fall back to Apple geocoding for plain addresses.
 */
export type PlaceHit = {
  latitude: number;
  longitude: number;
  /** Full label with area, for disambiguating list results. */
  label: string;
  /** Clean POI name only (no address), e.g. "一蘭 京都八幡店". */
  name: string;
};

const PHOTON = 'https://photon.komoot.io/api/';

type PhotonFeature = {
  geometry?: { type?: string; coordinates?: [number, number] };
  properties?: Record<string, string>;
};

type Near = { latitude: number; longitude: number };

async function photonSearch(query: string, near?: Near): Promise<PlaceHit[]> {
  // Bias results toward the user's location so a broad query ("一蘭") ranks
  // nearby branches first, and pull a generous number of candidates to sort.
  let url = `${PHOTON}?q=${encodeURIComponent(query)}&limit=30&lang=default`;
  if (near) url += `&lat=${near.latitude}&lon=${near.longitude}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: PhotonFeature[] };
  const hits: PlaceHit[] = [];
  for (const f of data.features ?? []) {
    const c = f.geometry?.coordinates;
    if (!c || c.length < 2) continue;
    const longitude = c[0];
    const latitude = c[1];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const p = f.properties ?? {};
    const primary =
      p.name || [p.street, p.housenumber].filter(Boolean).join(' ') || p.osm_value || '';
    const area = p.city || p.district || p.county || p.state || p.country || '';
    const label = [primary, area].filter(Boolean).join(' ') || primary || query;
    hits.push({ latitude, longitude, label, name: primary || query });
  }
  return hits;
}

async function appleSearch(query: string): Promise<PlaceHit[]> {
  try {
    const locs = await Location.geocodeAsync(query);
    return locs
      .slice(0, 6)
      .map((l) => ({ latitude: l.latitude, longitude: l.longitude, label: query, name: query }));
  } catch {
    return [];
  }
}

/**
 * Search places by name or address, POI-aware. When `near` is given, results are
 * biased toward and sorted by distance from that location (nearest first).
 * Empty query → no results.
 */
export async function searchPlaces(query: string, near?: Near): Promise<PlaceHit[]> {
  const q = query.trim();
  if (!q) return [];
  let hits: PlaceHit[] = [];
  try {
    hits = await photonSearch(q, near);
  } catch {
    hits = [];
  }
  if (hits.length === 0) hits = await appleSearch(q);
  if (near) {
    const d = (h: PlaceHit) =>
      (h.latitude - near.latitude) ** 2 + (h.longitude - near.longitude) ** 2;
    hits = [...hits].sort((a, b) => d(a) - d(b));
  }
  return hits;
}
