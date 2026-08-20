import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export type Coords = { latitude: number; longitude: number };
export type PermissionState = 'undetermined' | 'granted' | 'denied';

/**
 * Request the user's current position on the exact spot, for creating a memo.
 * Throws `Error('permission-denied')` if foreground location is not granted.
 */
export async function getCurrentCoords(): Promise<Coords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('permission-denied');
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

/**
 * Foreground-only location hook: requests permission, resolves the current
 * position, and exposes permission state plus a `refresh` action for the UI.
 */
export function useCurrentLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermission('denied');
        return;
      }
      setPermission('granted');
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      setError('現在地を取得できませんでした');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { coords, permission, loading, error, refresh };
}
