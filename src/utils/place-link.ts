import { searchPlaces } from './geosearch';

/**
 * Turns something shared into Pinote (a map URL, a `geo:` link, or plain text)
 * into a place we can drop a pin for: a name and/or coordinates.
 *
 * Coordinates are extracted directly from Apple / Google Maps links when present;
 * short links (maps.app.goo.gl …) are expanded by following redirects; and when
 * only a name/address is known we fall back to `Location.geocodeAsync`.
 */
export type ParsedPlace = { title?: string; lat?: number; lng?: number };

const hasCoords = (p: ParsedPlace): boolean =>
  typeof p.lat === 'number' && typeof p.lng === 'number';

/** Pull a "lat,lng" pair out of a string, validating the ranges. */
function coordsFromString(s: string): { lat: number; lng: number } | null {
  const m = s.match(/(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  // Reject "0,0" and other degenerate pairs that are almost always a false hit.
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

const cleanName = (v: string): string => decodeURIComponent(v.replace(/\+/g, ' ')).trim();

/** True if a string reads like a postal address rather than a place name. */
export function looksLikeAddress(s: string): boolean {
  // Postal mark, a JP postal code (123-4567), or a 都道府県…市区郡町村 pattern.
  return /〒|\d{3}-?\d{4}|[都道府県][^\s、,]{0,12}[市区郡町村]/.test(s);
}

/** Prefer the first name-like candidate that isn't an address; else the first non-empty. */
function pickName(cands: (string | undefined)[]): string | undefined {
  const list = cands.filter((c): c is string => !!c && c.length > 0);
  return list.find((c) => !looksLikeAddress(c)) ?? list[0];
}

/**
 * Extract a shop name from a Google Maps `/place/<…>` path. Google formats these
 * as "日本、〒614-8054 京都府八幡市…１０６−３ 一蘭 京都八幡店" — country + postal +
 * address, with the *name last*. We strip the country/postal prefix and take the
 * text after the final address digit (the banchi), which is the business name.
 */
function nameFromPlacePath(rawPath: string): string | undefined {
  let s = cleanName(rawPath);
  s = s.replace(/^日本[\s、,]*/, '').replace(/〒\s*\d{3}[-−‐]?\d{4}\s*/, '').trim();
  if (!s) return undefined;
  const digits = [...s.matchAll(/[0-9０-９]/g)];
  if (digits.length > 0) {
    const idx = digits[digits.length - 1].index ?? -1;
    const after = s.slice(idx + 1).replace(/^[\s\-−‐ー・,、･]+/, '').trim();
    if (after && !looksLikeAddress(after)) return after;
  }
  return s;
}

/** Parse a fully-resolved URL / geo link / text into a place. */
export function parsePlaceUrl(raw: string): ParsedPlace {
  const out: ParsedPlace = {};

  // geo:lat,lng
  const geo = raw.match(/geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (geo) {
    const c = coordsFromString(`${geo[1]},${geo[2]}`);
    if (c) {
      out.lat = c.lat;
      out.lng = c.lng;
    }
  }

  let url: URL | null = null;
  try {
    url = new URL(raw);
  } catch {
    url = null;
  }

  if (url) {
    const params = url.searchParams;

    // The "@lat,lng" viewport marker (Google) — anywhere in the URL.
    const at = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at && !hasCoords(out)) {
      out.lat = parseFloat(at[1]);
      out.lng = parseFloat(at[2]);
    }

    // Coordinate-bearing query params (Apple: ll/sll/coordinate; Google: q/query/center).
    for (const key of ['ll', 'sll', 'coordinate', 'center', 'q', 'query', 'daddr', 'destination']) {
      const v = params.get(key);
      if (!v) continue;
      const c = coordsFromString(v);
      if (c && !hasCoords(out)) {
        out.lat = c.lat;
        out.lng = c.lng;
      }
    }

    // Name candidates, in preference order. Search params (q/name) tend to be the
    // clean business name; the /place/<…> path is often the formatted *address*.
    // pickName() drops address-like candidates so the memo title stays the shop name.
    const nameParams: (string | undefined)[] = ['name', 'q', 'query']
      .map((k) => params.get(k) ?? undefined)
      .map((v) => (v && !coordsFromString(v) ? cleanName(v) : undefined));
    const placeMatch = url.pathname.match(/\/place\/([^/@]+)/);
    const placeCand = placeMatch ? nameFromPlacePath(placeMatch[1]) : undefined;
    const addressCand = params.get('address') ? cleanName(params.get('address')!) : undefined;
    out.title = pickName([...nameParams, placeCand, addressCand]);
  } else if (!hasCoords(out)) {
    // Not a URL: maybe a bare "lat,lng".
    const c = coordsFromString(raw);
    if (c) {
      out.lat = c.lat;
      out.lng = c.lng;
    }
  }

  return out;
}

/** Follow redirects to expand a short link into its final URL. */
async function resolveRedirect(raw: string): Promise<string> {
  try {
    const res = await fetch(raw, { method: 'GET', redirect: 'follow' });
    return res.url || raw;
  } catch {
    return raw;
  }
}

const SHORT_LINK =
  /(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|share\.google|maps\.app\.google|apple\.co)\//i;

/**
 * Resolve shared content (URL or free text) into a place, expanding short links
 * and geocoding a name/address when no coordinates are embedded.
 */
export async function resolveSharedPlace(input: string): Promise<ParsedPlace> {
  const raw = (input ?? '').trim();
  if (!raw) return {};

  // Isolate a URL if the shared text wraps one (common with app share sheets).
  const urlMatch = raw.match(/https?:\/\/\S+/);
  let working = urlMatch ? urlMatch[0] : raw;

  if (SHORT_LINK.test(working)) working = await resolveRedirect(working);

  const parsed = parsePlaceUrl(working);

  // Plain text with no URL and nothing parsed → use the text as the name.
  if (!urlMatch && !parsed.title && !hasCoords(parsed)) {
    parsed.title = raw.slice(0, 80);
  }

  // Location + clean-name recovery via POI search. Runs when we lack coordinates,
  // or when the only name we found looks like an address (so we can replace it
  // with the search result's clean business name).
  const titleIsAddress = !parsed.title || looksLikeAddress(parsed.title);
  if ((!hasCoords(parsed) || titleIsAddress) && parsed.title) {
    try {
      const hits = await searchPlaces(parsed.title);
      if (hits[0]) {
        if (!hasCoords(parsed)) {
          parsed.lat = hits[0].latitude;
          parsed.lng = hits[0].longitude;
        }
        if (titleIsAddress && hits[0].name && !looksLikeAddress(hits[0].name)) {
          parsed.title = hits[0].name;
        }
      }
    } catch {
      // Best-effort; the user can still place the pin / rename manually.
    }
  }

  return parsed;
}
