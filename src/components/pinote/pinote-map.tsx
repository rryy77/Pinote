import { AppleMaps, GoogleMaps } from 'expo-maps';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

/**
 * A thin cross-platform wrapper around `expo-maps`: Apple Maps on iOS (no API
 * key required), Google Maps on Android, and a placeholder on web. It renders
 * single memo pins plus aggregated cluster bubbles, and exposes an imperative
 * `setCamera` for recentering.
 *
 * Note: `onMarkerPress` / `onClusterPress` rely on click events that require iOS 18+.
 */

export type PinMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  /** Pin tint color. */
  tint: string;
  /** SF Symbol name (used on iOS only). */
  symbol: string;
};

export type ClusterMarker = {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  /** Bubble color — the category tint of the grouped memos. */
  tint: string;
  /** Member coordinates, used to frame the group when the bubble is tapped. */
  points: { latitude: number; longitude: number }[];
};

export type CameraTarget = { latitude: number; longitude: number; zoom?: number };
export type CameraChange = { latitude: number; longitude: number; zoom: number };

export type PinoteMapHandle = {
  setCamera: (target: CameraTarget) => void;
};

type LatLng = { latitude: number; longitude: number };

type Props = {
  markers: PinMarker[];
  clusters?: ClusterMarker[];
  initialCamera?: CameraTarget;
  /** Show the blue user-location dot. */
  showUserLocation?: boolean;
  /** Ordered coordinates to draw as a route line (e.g. a trip's visit order). */
  route?: LatLng[];
  /** Route line color (defaults to the brand accent). */
  routeColor?: string;
  /** Apple POI category names to display (iOS). Empty hides all POIs. */
  poiCategories?: string[];
  onMarkerPress?: (id: string) => void;
  onClusterPress?: (id: string) => void;
  onCameraMove?: (change: CameraChange) => void;
  /** Tapping an empty spot on the map returns its coordinates. */
  onMapPress?: (coords: { latitude: number; longitude: number }) => void;
};

const DEFAULT_ZOOM = 15;

export const PinoteMap = forwardRef<PinoteMapHandle, Props>(function PinoteMap(
  {
    markers,
    clusters = [],
    initialCamera,
    showUserLocation = true,
    route,
    routeColor,
    poiCategories = [],
    onMarkerPress,
    onClusterPress,
    onCameraMove,
    onMapPress,
  },
  ref,
) {
  const routeLine =
    route && route.length > 1
      ? [
          {
            id: 'route',
            coordinates: route.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
            color: routeColor ?? colors.brand,
            width: 4,
          },
        ]
      : undefined;
  const appleRef = useRef<AppleMaps.MapView>(null);
  const googleRef = useRef<GoogleMaps.MapView>(null);

  useImperativeHandle(
    ref,
    () => ({
      setCamera: (target) => {
        const config = {
          coordinates: { latitude: target.latitude, longitude: target.longitude },
          zoom: target.zoom ?? DEFAULT_ZOOM,
        };
        appleRef.current?.setCameraPosition(config);
        googleRef.current?.setCameraPosition(config);
      },
    }),
    [],
  );

  const cameraPosition = initialCamera
    ? {
        coordinates: {
          latitude: initialCamera.latitude,
          longitude: initialCamera.longitude,
        },
        zoom: initialCamera.zoom ?? DEFAULT_ZOOM,
      }
    : undefined;

  const emitCamera = onCameraMove
    ? (e: { coordinates: { latitude?: number; longitude?: number }; zoom: number }) =>
        onCameraMove({
          latitude: e.coordinates.latitude ?? 0,
          longitude: e.coordinates.longitude ?? 0,
          zoom: e.zoom,
        })
    : undefined;

  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        ref={appleRef}
        style={StyleSheet.absoluteFill}
        cameraPosition={cameraPosition}
        properties={{
          isMyLocationEnabled: showUserLocation,
          // No blue tap-selection highlight; POIs are shown only for the active
          // category filter (empty = hide all) so the map stays calm by default.
          selectionEnabled: false,
          pointsOfInterest: { including: poiCategories as never },
          // Flat 2D map; no 3D toggle (kept simple per design).
          elevation: 'FLAT' as never,
        }}
        // Hide all of Apple's built-in controls — we provide our own column and
        // keep the map surface clean.
        uiSettings={{
          myLocationButtonEnabled: false,
          togglePitchEnabled: false,
          compassEnabled: false,
        }}
        polylines={routeLine}
        markers={markers.map((m) => ({
          id: m.id,
          coordinates: { latitude: m.latitude, longitude: m.longitude },
          title: m.title,
          tintColor: m.tint,
          systemImage: m.symbol,
        }))}
        annotations={clusters.map((c) => ({
          id: c.id,
          coordinates: { latitude: c.latitude, longitude: c.longitude },
          text: String(c.count),
          backgroundColor: c.tint,
          textColor: colors.onAccent,
          title: `${c.count}件ここにあります`,
        }))}
        onMarkerClick={(marker) => {
          if (marker.id) onMarkerPress?.(marker.id);
        }}
        onAnnotationClick={(annotation) => {
          if (annotation.id) onClusterPress?.(annotation.id);
        }}
        onMapClick={
          onMapPress
            ? (e) =>
                onMapPress({
                  latitude: e.coordinates.latitude ?? 0,
                  longitude: e.coordinates.longitude ?? 0,
                })
            : undefined
        }
        onCameraMove={emitCamera}
      />
    );
  }

  if (Platform.OS === 'android') {
    return (
      <GoogleMaps.View
        ref={googleRef}
        style={StyleSheet.absoluteFill}
        cameraPosition={cameraPosition}
        properties={{ isMyLocationEnabled: showUserLocation }}
        uiSettings={{ myLocationButtonEnabled: showUserLocation }}
        polylines={routeLine}
        markers={[
          ...markers.map((m) => ({
            id: m.id,
            coordinates: { latitude: m.latitude, longitude: m.longitude },
            title: m.title,
          })),
          ...clusters.map((c) => ({
            id: c.id,
            coordinates: { latitude: c.latitude, longitude: c.longitude },
            title: `${c.count}件のメモ`,
          })),
        ]}
        onMarkerClick={(marker) => {
          if (!marker.id) return;
          if (marker.id.startsWith('cluster:')) onClusterPress?.(marker.id);
          else onMarkerPress?.(marker.id);
        }}
        onMapClick={
          onMapPress
            ? (e) =>
                onMapPress({
                  latitude: e.coordinates.latitude ?? 0,
                  longitude: e.coordinates.longitude ?? 0,
                })
            : undefined
        }
        onCameraMove={emitCamera}
      />
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.fallback]}>
      <Text style={styles.fallbackText}>地図は iOS / Android アプリでご利用いただけます。</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    padding: 24,
  },
  fallbackText: {
    color: colors.subInk,
    textAlign: 'center',
  },
});
