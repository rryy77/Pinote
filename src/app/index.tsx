import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryFilter, type CategoryFilterValue } from '@/components/pinote/category-filter';
import { CenterPin } from '@/components/pinote/center-pin';
import { MemoCard } from '@/components/pinote/memo-card';
import { ModeSwitch } from '@/components/pinote/mode-switch';
import { Onboarding } from '@/components/pinote/onboarding';
import { ThemeChoice } from '@/components/pinote/theme-choice';
import { ToolsMenu } from '@/components/pinote/tools-menu';
import {
  PinoteMap,
  type ClusterMarker,
  type PinMarker,
  type PinoteMapHandle,
} from '@/components/pinote/pinote-map';
import { getCategory } from '@/constants/categories';
import { colors } from '@/constants/colors';
import { useCurrentLocation } from '@/location/use-current-location';
import { useCollectionStore } from '@/store/useCollectionStore';
import { useMemoStore } from '@/store/useMemoStore';
import { useThemeStore } from '@/store/useThemeStore';
import { clusterMemos } from '@/utils/cluster';
import { formatDistance, haversine } from '@/utils/distance';
import { hasOnboarded, setOnboarded } from '@/utils/onboarding';

/** Fallback camera (Tokyo Station) until the user's location resolves. */
const DEFAULT_CAMERA = { latitude: 35.681236, longitude: 139.767125, zoom: 13 };

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
/** Radius large enough for the theme-reveal circle to cover the whole screen. */
const REVEAL_MAX_R = Math.hypot(SCREEN_W, SCREEN_H);

/** The two ways to use the map: browse saved memos, or drop a new one. */
type Mode = 'view' | 'create';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const memos = useMemoStore((s) => s.memos);
  const { coords } = useCurrentLocation();
  const { lat, lng, collection } = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    collection?: string;
  }>();
  const collections = useCollectionStore((s) => s.collections);
  const allItems = useCollectionStore((s) => s.items);
  const mapRef = useRef<PinoteMapHandle>(null);
  const didCenter = useRef(false);
  const centerRef = useRef<{ latitude: number; longitude: number }>({
    latitude: DEFAULT_CAMERA.latitude,
    longitude: DEFAULT_CAMERA.longitude,
  });
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mode, setMode] = useState<Mode>('view');
  const [filter, setFilter] = useState<CategoryFilterValue>('all');
  const [zoom, setZoom] = useState(DEFAULT_CAMERA.zoom);
  const [centerAddress, setCenterAddress] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [showThemePick, setShowThemePick] = useState(false);

  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);

  // Theme switch "circular reveal": the new background spreads from the button.
  const [reveal, setReveal] = useState<{ x: number; y: number; color: string } | null>(null);
  const revealP = useSharedValue(0);
  const revealStyle = useAnimatedStyle(() => ({ transform: [{ scale: revealP.value }] }));

  const finishThemeToggle = (target: 'light' | 'dark') => {
    setThemeMode(target);
    setReveal(null);
  };
  const runThemeToggle = () => {
    const target = themeMode === 'dark' ? 'light' : 'dark';
    setReveal({
      x: SCREEN_W - 16 - 22,
      y: insets.top + 116 + 3 * 52 + 22,
      color: target === 'dark' ? '#000000' : '#F4F5F7',
    });
    revealP.value = 0;
    revealP.value = withTiming(1, { duration: 460 }, (finished) => {
      if (finished) runOnJS(finishThemeToggle)(target);
    });
  };

  useEffect(() => {
    if (!hasOnboarded()) setShowIntro(true);
  }, []);

  // A collection filter arriving via "地図で見る": show only its pins and fit the map.
  const activeCollection = collectionId ? collections.find((c) => c.id === collectionId) : null;
  const collectionItems = useMemo(
    () => (collectionId ? allItems.filter((i) => i.collectionId === collectionId) : []),
    [allItems, collectionId],
  );

  useEffect(() => {
    setCollectionId(collection || null);
  }, [collection]);

  useEffect(() => {
    if (collectionId && collectionItems.length > 0) {
      const first = collectionItems[0];
      setMode('view');
      setSelectedId(null);
      mapRef.current?.setCamera({ latitude: first.lat, longitude: first.lng, zoom: 13 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId]);

  const clearCollection = () => {
    setCollectionId(null);
    router.setParams({ collection: '' });
  };

  // Selecting a category shows only that category's memos, plus Apple's nearby
  // places of that kind (e.g. 食事 → restaurants). "all" shows every memo, no POIs.
  const visibleMemos = useMemo(
    () => (filter === 'all' ? memos : memos.filter((m) => m.category === filter)),
    [memos, filter],
  );
  const memoLayer = useMemo(() => {
    const markerList: PinMarker[] = [];
    const clusterList: ClusterMarker[] = [];
    for (const p of clusterMemos(visibleMemos, zoom)) {
      if (p.type === 'memo') {
        const c = getCategory(p.memo.category);
        markerList.push({
          id: p.memo.id,
          latitude: p.memo.lat,
          longitude: p.memo.lng,
          title: p.memo.title,
          tint: c.tint,
          symbol: c.symbol,
        });
      } else {
        clusterList.push({
          id: p.id,
          latitude: p.latitude,
          longitude: p.longitude,
          count: p.count,
        });
      }
    }
    return { markers: markerList, clusters: clusterList };
  }, [visibleMemos, zoom]);

  // In collection mode the map shows just that collection's places: visited pins
  // keep their category color, candidates are muted grey.
  const collectionMarkers: PinMarker[] = useMemo(
    () =>
      collectionItems.map((it) => {
        const c = getCategory(it.category);
        return {
          id: it.id,
          latitude: it.lat,
          longitude: it.lng,
          title: it.title,
          tint: it.visited ? c.tint : '#9AA0A6',
          symbol: it.visited ? c.symbol : 'mappin',
        };
      }),
    [collectionItems],
  );

  // Trip route: connect the visited places in the order they were visited so the
  // collection reads like a travel log line on the map.
  const collectionRoute = useMemo(
    () =>
      collectionItems
        .filter((it) => it.visited)
        .slice()
        .sort((a, b) => a.updatedAt - b.updatedAt)
        .map((it) => ({ latitude: it.lat, longitude: it.lng })),
    [collectionItems],
  );

  const markers = activeCollection ? collectionMarkers : memoLayer.markers;
  const clusters = activeCollection ? [] : memoLayer.clusters;
  // Apple POIs are a discovery aid in 見る mode only. In 残す mode they flood the
  // map and hide the user's own memos, so we suppress them there.
  const poiCategories =
    activeCollection || filter === 'all' || mode === 'create' ? [] : getCategory(filter).poi;

  const selectedMemo = useMemo(
    () => (selectedId ? memos.find((m) => m.id === selectedId) ?? null : null),
    [memos, selectedId],
  );

  const focusLat = Number(lat);
  const focusLng = Number(lng);
  const hasFocus = Number.isFinite(focusLat) && Number.isFinite(focusLng);

  // Center on a memo when opened from its detail screen ("地図で見る").
  useEffect(() => {
    if (hasFocus) {
      didCenter.current = true;
      centerRef.current = { latitude: focusLat, longitude: focusLng };
      const id = setTimeout(
        () => mapRef.current?.setCamera({ latitude: focusLat, longitude: focusLng, zoom: 16 }),
        80,
      );
      return () => clearTimeout(id);
    }
  }, [hasFocus, focusLat, focusLng]);

  // Center the map on the user the first time their location resolves.
  useEffect(() => {
    if (coords && !didCenter.current) {
      didCenter.current = true;
      centerRef.current = coords;
      mapRef.current?.setCamera({ ...coords, zoom: 15 });
    }
  }, [coords]);

  useEffect(() => () => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
  }, []);

  const onCameraMove = (c: { latitude: number; longitude: number; zoom: number }) => {
    centerRef.current = { latitude: c.latitude, longitude: c.longitude };
    const stepped = Math.round(c.zoom * 2) / 2;
    setZoom((prev) => (prev === stepped ? prev : stepped));

    // The center address is only needed for the "残す" (create) footer.
    if (mode !== 'create') return;
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      try {
        const res = await Location.reverseGeocodeAsync(centerRef.current);
        const a = res[0];
        setCenterAddress(
          a ? [a.city, a.district ?? a.street ?? a.name].filter(Boolean).join('') || null : null,
        );
      } catch {
        // ignore
      }
    }, 450);
  };

  const recenter = () => {
    if (coords) mapRef.current?.setCamera({ ...coords, zoom: 15 });
  };

  const expandCluster = (id: string) => {
    const c = clusters.find((x) => x.id === id);
    if (c) {
      mapRef.current?.setCamera({
        latitude: c.latitude,
        longitude: c.longitude,
        zoom: Math.min(zoom + 2, 18),
      });
    }
  };

  // In "view" mode, tapping a pin surfaces its info card on the map (no page jump).
  // In collection mode, a visited pin opens its linked memo.
  const onMarkerPress = (id: string) => {
    if (activeCollection) {
      const item = collectionItems.find((i) => i.id === id);
      if (item?.memoId) router.push({ pathname: '/memo/[id]', params: { id: item.memoId } });
      return;
    }
    if (mode === 'view') setSelectedId(id);
  };

  const enterCreate = () => {
    setSelectedId(null);
    setMenuOpen(false);
    setMode('create');
    // Prime the footer address for the current center.
    onCameraMove({ ...centerRef.current, zoom });
  };

  const enterView = () => {
    setMenuOpen(false);
    setMode('view');
  };

  // Create a memo at the map center (where the fixed center pin points).
  const addHere = () => {
    const c = centerRef.current;
    router.push({
      pathname: '/memo/new',
      params: { lat: String(c.latitude), lng: String(c.longitude) },
    });
  };

  const distanceOf = (m: { lat: number; lng: number }): string | null =>
    coords ? formatDistance(haversine(coords, { latitude: m.lat, longitude: m.lng })) : null;

  const bottomBase = insets.bottom + 8;

  return (
    <View style={styles.container}>
      <PinoteMap
        ref={mapRef}
        markers={markers}
        clusters={clusters}
        route={activeCollection ? collectionRoute : undefined}
        routeColor={activeCollection?.color}
        poiCategories={poiCategories}
        initialCamera={
          hasFocus
            ? { latitude: focusLat, longitude: focusLng, zoom: 16 }
            : coords
              ? { ...coords, zoom: 15 }
              : DEFAULT_CAMERA
        }
        onMarkerPress={onMarkerPress}
        onClusterPress={expandCluster}
        onMapPress={() => {
          setSelectedId(null);
          setMenuOpen(false);
        }}
        onCameraMove={onCameraMove}
      />

      {/* The placement cursor only belongs to "残す" (create) mode. */}
      {mode === 'create' && <CenterPin />}

      {activeCollection ? (
        <View style={[styles.banner, { top: insets.top + 8 }]}>
          <Text style={styles.bannerEmoji}>{activeCollection.icon}</Text>
          <View style={styles.bannerBody}>
            <Text style={styles.bannerName} numberOfLines={1}>
              {activeCollection.name}
            </Text>
            <Text style={[styles.bannerCount, { color: activeCollection.color }]}>
              {activeCollection.visited}/{activeCollection.total} 制覇
            </Text>
          </View>
          <Pressable onPress={clearCollection} hitSlop={8} style={styles.bannerClose}>
            <Ionicons name="close" size={18} color={colors.subInk} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.filterBar, { top: insets.top + 8 }]} pointerEvents="box-none">
          <CategoryFilter value={filter} onChange={setFilter} />
        </View>
      )}

      {/* One consolidated "tools" button (top-right) that pops open its actions,
          iOS-folder style. */}
      <ToolsMenu
        open={menuOpen}
        onToggle={() => setMenuOpen((v) => !v)}
        insetTop={insets.top}
        actions={[
          {
            key: 'search',
            icon: 'search',
            color: colors.ink,
            onPress: () => {
              setMenuOpen(false);
              router.push('/search');
            },
          },
          {
            key: 'list',
            icon: 'list',
            size: 22,
            color: colors.ink,
            onPress: () => {
              setMenuOpen(false);
              router.push('/list');
            },
          },
          {
            key: 'recenter',
            icon: 'locate',
            color: colors.brand,
            onPress: () => {
              setMenuOpen(false);
              recenter();
            },
          },
          {
            key: 'theme',
            icon: themeMode === 'dark' ? 'sunny' : 'moon',
            color: colors.ink,
            onPress: runThemeToggle,
          },
          {
            key: 'appearance',
            icon: 'color-palette-outline',
            color: colors.ink,
            onPress: () => {
              setMenuOpen(false);
              router.push('/appearance');
            },
          },
        ]}
      />

      {/* Info card (view mode) sits just above the mode switch. */}
      {mode === 'view' && !activeCollection && selectedMemo && (
        <View style={[styles.cardWrap, { bottom: bottomBase + 56 }]} pointerEvents="box-none">
          <MemoCard
            memo={selectedMemo}
            distance={distanceOf(selectedMemo)}
            onClose={() => setSelectedId(null)}
            onOpenDetail={() =>
              router.push({ pathname: '/memo/[id]', params: { id: selectedMemo.id } })
            }
          />
        </View>
      )}

      {/* Hero capture card (create mode) anchored in the bottom thumb zone. */}
      {mode === 'create' && (
        <View style={[styles.footer, { bottom: bottomBase + 56 }]}>
          <View style={styles.footerAddrRow}>
            <Ionicons name="navigate" size={15} color={colors.brand} />
            <View style={styles.footerAddrText}>
              <Text style={styles.footerEyebrow}>ここに残す？</Text>
              <Text style={styles.footerAddr} numberOfLines={1}>
                {centerAddress ?? '地図を動かして場所を合わせる'}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={addHere}
            style={({ pressed }) => [styles.heroCta, pressed && styles.heroCtaPressed]}>
            <Ionicons name="add-circle" size={24} color={colors.onAccent} />
            <Text style={styles.heroCtaText}>ここにメモを残す</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/search')}
            style={({ pressed }) => [styles.footerSearch, pressed && styles.pressed]}>
            <Ionicons name="search" size={15} color={colors.subInk} />
            <Text style={styles.footerSearchText}>お店の名前で探して残す</Text>
          </Pressable>
        </View>
      )}

      {/* Mode switch at the very bottom (hidden while viewing a collection). */}
      {!activeCollection && (
        <View style={[styles.modeSwitchWrap, { bottom: bottomBase }]}>
          <ModeSwitch mode={mode} onChange={(m) => (m === 'create' ? enterCreate() : enterView())} />
        </View>
      )}

      {reveal && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.reveal,
            {
              left: reveal.x - REVEAL_MAX_R,
              top: reveal.y - REVEAL_MAX_R,
              width: REVEAL_MAX_R * 2,
              height: REVEAL_MAX_R * 2,
              borderRadius: REVEAL_MAX_R,
              backgroundColor: reveal.color,
            },
            revealStyle,
          ]}
        />
      )}

      {showIntro && (
        <Onboarding
          onDone={() => {
            setOnboarded();
            setShowIntro(false);
            setShowThemePick(true);
          }}
        />
      )}

      {showThemePick && (
        <ThemeChoice
          onPick={(m) => {
            setThemeMode(m);
            setShowThemePick(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  filterBar: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  bannerEmoji: {
    fontSize: 24,
  },
  bannerBody: {
    flex: 1,
  },
  bannerName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  bannerCount: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  bannerClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  footer: {
    position: 'absolute',
    left: 12,
    right: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 26,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  footerAddrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  footerAddrText: {
    flex: 1,
  },
  footerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: colors.brand,
  },
  footerAddr: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 1,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  heroCtaPressed: {
    backgroundColor: colors.brandDark,
  },
  heroCtaText: {
    color: colors.onAccent,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 4,
  },
  footerSearchText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.subInk,
  },
  modeSwitchWrap: {
    position: 'absolute',
    alignSelf: 'center',
  },
  reveal: {
    position: 'absolute',
    zIndex: 50,
  },
  pressed: {
    opacity: 0.85,
  },
});
