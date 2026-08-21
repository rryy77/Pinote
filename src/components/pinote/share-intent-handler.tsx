import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useShareIntentContext } from 'expo-share-intent';

import { resolveSharedPlace } from '@/utils/place-link';

/** A human-readable site name from a URL (e.g. "tabelog.com"), or ''. */
function siteName(raw: string): string {
  const urlMatch = raw.match(/https?:\/\/\S+/);
  if (!urlMatch) return '';
  try {
    return new URL(urlMatch[0]).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Listens for content shared into Pinote from the iOS share sheet (a map URL,
 * an Instagram/website link, or plain text). It resolves a place — name and,
 * when possible, coordinates — then opens the "new memo" screen pre-filled and
 * defaulted to 行きたい (want-to-go), so a shared spot becomes a planned pin in
 * one tap. Rendered inside the router tree so `router.push` is available.
 */
export function ShareIntentHandler() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const processing = useRef(false);

  useEffect(() => {
    if (!hasShareIntent || processing.current) return;
    processing.current = true;

    const shared = shareIntent.webUrl ?? shareIntent.text ?? '';
    const metaTitle =
      typeof shareIntent.meta?.title === 'string' ? shareIntent.meta.title.trim() : '';

    (async () => {
      let place: Awaited<ReturnType<typeof resolveSharedPlace>> = {};
      try {
        place = await resolveSharedPlace(shared);
      } catch {
        // Fall through with whatever we have; the user can finish manually.
      }
      // Best available name: a parsed place name → the shared page title → the
      // site name from the URL. Something is almost always better than nothing.
      // The memo body is intentionally left blank for the user to fill in.
      const title = place.title || metaTitle || siteName(shared);

      router.push({
        pathname: '/memo/new',
        params: {
          from: 'share',
          wantToGo: '1',
          ...(title ? { prefillTitle: title } : {}),
          ...(place.lat != null && place.lng != null
            ? { prefillLat: String(place.lat), prefillLng: String(place.lng) }
            : {}),
        },
      });

      resetShareIntent();
      processing.current = false;
    })();
  }, [hasShareIntent, shareIntent, resetShareIntent, router]);

  return null;
}
