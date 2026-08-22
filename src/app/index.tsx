import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryFilter, type CategoryFilterValue } from '@/components/pinote/category-filter';
import { CenterPin } from '@/components/pinote/center-pin';
import { LaunchAnimation } from '@/components/pinote/launch-animation';
import { MemoCard } from '@/components/pinote/memo-card';
import { ModeSwitch } from '@/components/pinote/mode-switch';
import { Onboarding } from '@/components/pinote/onboarding';
import { SignInIntro } from '@/components/pinote/sign-in-intro';
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
import { useAuthStore } from '@/store/useAuthStore';
import { useCollectionStore } from '@/store/useCollectionStore';
import { useGroupStore } from '@/store/useGroupStore';
import { useMapFocus } from '@/store/useMapFocus';
import { useMemoStore } from '@/store/useMemoStore';
import { useThemeStore } from '@/store/useThemeStore';
import type { SharedMemo } from '@/types/group';
import type { Memo } from '@/types/memo';
import { clusterMemos } from '@/utils/cluster';
import { formatDistance, haversine } from '@/utils/distance';
import { hasOnboarded, setOnboarded } from '@/utils/onboarding';

/** Fallback camera (Tokyo Station) until the user's location resolves. */
const DEFAULT_CAMERA = { latitude: 35.681236, longitude: 139.767125, zoom: 13 };

/** A camera that frames all given points (center + a zoom that fits their span). */
function cameraForPoints(
  pts: { latitude: number; longitude: number }[],
): { latitude: number; longitude: number; zoom: number } | null {
  if (pts.length === 0) return null;
  if (pts.length === 1) return { ...pts[0], zoom: 15 };
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of pts) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
  }
  const span = Math.max(maxLat - minLat, maxLng - minLng) || 0.01;
  const zoom = Math.max(3, Math.min(16, Math.log2(360 / span) - 1.2));
  return { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2, zoom };
}

/** Adapt a cloud shared memo to the local Memo shape so it flows through the same
 *  map/cluster/card pipeline. `wantRevisit` doesn't exist on shared memos. */
function sharedToMemo(s: SharedMemo): Memo {
  return {
    id: s.id,
    title: s.title,
    body: s.body,
    category: s.category,
    lat: s.lat,
    lng: s.lng,
    rating: s.rating,
    wantRevisit: false,
    wantToGo: s.wantToGo,
    tags: s.tags,
    photoUri: s.photoUrl,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

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
  const collections = useCollectionStore((s) => s.collections);
  const allItems = useCollectionStore((s) => s.items);
  const mapFocus = useMapFocus((s) => s.focus);
  const clearMapFocus = useMapFocus((s) => s.clearFocus);
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
  const [showSignIn, setShowSignIn] = useState(false);
  const [showLaunch, setShowLaunch] = useState(true);
  // The group banner is a brief (~3s) hint on switch, then it hides so the
  // category filter isn't blocked; the right-side button remains to switch maps.
  const [bannerVisible, setBannerVisible] = useState(false);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const authUser = useAuthStore((s) => s.user);

  // Cloud sharing: which map is showing (null = personal SQLite), plus its memos.
  const activeGroupId = useGroupStore((s) => s.activeGroupId);
  const groups = useGroupStore((s) => s.groups);
  const sharedMemos = useGroupStore((s) => s.sharedMemos);
  const loadGroups = useGroupStore((s) => s.loadGroups);
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup);
  const resetGroups = useGroupStore((s) => s.reset);
  const activeGroup = activeGroupId ? groups.find((g) => g.id === activeGroupId) ?? null : null;

  // Load the user's groups when signed in; drop cloud state entirely on sign-out.
  useEffect(() => {
    if (authUser) void loadGroups().catch(() => {});
    else resetGroups();
  }, [authUser, loadGroups, resetGroups]);

  // A group map and a collection lens are mutually exclusive on screen.
  useEffect(() => {
    if (activeGroupId) setCollectionId(null);
  }, [activeGroupId]);

  // Show the group banner for ~3s each time you switch into a group, then hide it.
  useEffect(() => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    if (activeGroupId) {
      setBannerVisible(true);
      bannerTimer.current = setTimeout(() => setBannerVisible(false), 3000);
    } else {
      setBannerVisible(false);
    }
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, [activeGroupId]);

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

  // Consume a "show this on the map" request (from the library / detail screens),
  // so the reveal always happens on this same map — centered and highlighted.
  useEffect(() => {
    if (!mapFocus) return;
    didCenter.current = true;
    setMode('view');
    setMenuOpen(false);

    if (mapFocus.kind === 'collection') {
      setCollectionId(mapFocus.id);
      setSelectedId(null);
      const pts = allItems
        .filter((i) => i.collectionId === mapFocus.id)
        .map((i) => ({ latitude: i.lat, longitude: i.lng }));
      const cam = cameraForPoints(pts);
      if (cam) setTimeout(() => mapRef.current?.setCamera(cam), 120);
    } else {
      // A single memo: keep every pin visible but center on and highlight this one.
      setCollectionId(null);
      setSelectedId(mapFocus.id);
      setTimeout(
        () => mapRef.current?.setCamera({ latitude: mapFocus.lat, longitude: mapFocus.lng, zoom: 16 }),
        120,
      );
    }
    clearMapFocus();
  }, [mapFocus, allItems, clearMapFocus]);

  const clearCollection = () => {
    setCollectionId(null);
  };

  // Selecting a category shows only that category's memos, plus Apple's nearby
  // places of that kind (e.g. 食事 → restaurants). "all" shows every memo, no POIs.
  // The pins on the map come from either the personal store or the active group.
  const groupMemos = useMemo(
    () => (activeGroup ? sharedMemos.map(sharedToMemo) : []),
    [activeGroup, sharedMemos],
  );
  const sourceMemos = activeGroup ? groupMemos : memos;

  const visibleMemos = useMemo(
    () => (filter === 'all' ? sourceMemos : sourceMemos.filter((m) => m.category === filter)),
    [sourceMemos, filter],
  );
  const memoLayer = useMemo(() => {
    const markerList: PinMarker[] = [];
    const clusterList: ClusterMarker[] = [];
    // Keep the selected memo out of clustering so it's never hidden inside a
    // bubble — we draw it separately, on top, with an accent highlight.
    const highlight = selectedId ? visibleMemos.find((m) => m.id === selectedId) ?? null : null;
    const forCluster = highlight ? visibleMemos.filter((m) => m.id !== highlight.id) : visibleMemos;
    for (const p of clusterMemos(forCluster, zoom)) {
      if (p.type === 'memo') {
        const c = getCategory(p.memo.category);
        markerList.push({
          id: p.memo.id,
          latitude: p.memo.lat,
          longitude: p.memo.lng,
          title: p.memo.title,
          // 行きたい (planned, not visited yet): keep the category color but use a
          // bookmark glyph so planned spots read differently from visited memos.
          tint: c.tint,
          symbol: p.memo.wantToGo ? 'bookmark.fill' : c.symbol,
        });
      } else {
        clusterList.push({
          id: p.id,
          latitude: p.latitude,
          longitude: p.longitude,
          count: p.count,
          tint: getCategory(p.category).tint,
          points: p.points,
        });
      }
    }
    if (highlight) {
      markerList.push({
        id: highlight.id,
        latitude: highlight.lat,
        longitude: highlight.lng,
        title: highlight.title,
        tint: colors.brand,
        symbol: 'mappin.circle.fill',
      });
    }
    return { markers: markerList, clusters: clusterList };
  }, [visibleMemos, zoom, selectedId]);

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
    () => (selectedId ? sourceMemos.find((m) => m.id === selectedId) ?? null : null),
    [sourceMemos, selectedId],
  );

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

  // Tapping a cluster zooms in to break it apart: frame its members, but always
  // jump in by at least a couple levels so a tight group still visibly separates.
  const expandCluster = (id: string) => {
    const c = clusters.find((x) => x.id === id);
    if (!c) return;
    const framed = cameraForPoints(c.points);
    const target = framed
      ? { latitude: framed.latitude, longitude: framed.longitude, zoom: framed.zoom }
      : { latitude: c.latitude, longitude: c.longitude, zoom: zoom + 2 };
    target.zoom = Math.min(18, Math.max(target.zoom, zoom + 2));
    mapRef.current?.setCamera(target);
  };

  // In "view" mode, tapping a pin surfaces its info card on the map (no page jump)
  // and zooms in to that spot, just like tapping a cluster does.
  // In collection mode, a visited pin opens its linked memo.
  const onMarkerPress = (id: string) => {
    if (activeCollection) {
      const item = collectionItems.find((i) => i.id === id);
      if (item?.memoId) router.push({ pathname: '/memo/[id]', params: { id: item.memoId } });
      return;
    }
    if (mode === 'view') {
      setSelectedId(id);
      const m = sourceMemos.find((x) => x.id === id);
      if (m) {
        mapRef.current?.setCamera({
          latitude: m.lat,
          longitude: m.lng,
          zoom: Math.max(zoom, 16),
        });
      }
    }
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
      params: {
        lat: String(c.latitude),
        lng: String(c.longitude),
        // When a group map is active, the new memo is saved to that group.
        ...(activeGroupId ? { groupId: activeGroupId } : {}),
      },
    });
  };

  const distanceOf = (m: { lat: number; lng: number }): string | null =>
    coords ? formatDistance(haversine(coords, { latitude: m.lat, longitude: m.lng })) : null;

  const bottomBase = insets.bottom + 8;

  // Display for the persistent group indicator. Driven by the stable activeGroupId
  // (not the derived object) with fallbacks, so it never blinks out mid-refresh.
  const inGroup = activeGroupId !== null && !activeCollection;
  const groupName = activeGroup?.name ?? '共有マップ';
  const groupIcon = activeGroup?.icon ?? '👥';
  const groupColor = activeGroup?.color ?? colors.brand;

  return (
    <View style={styles.container}>
      <PinoteMap
        ref={mapRef}
        markers={markers}
        clusters={clusters}
        route={activeCollection ? collectionRoute : undefined}
        routeColor={activeCollection?.color}
        poiCategories={poiCategories}
        initialCamera={coords ? { ...coords, zoom: 15 } : DEFAULT_CAMERA}
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

      {/* Brief "you're now on this group's map" hint. Shows ~3s on switch then
          fades, so it doesn't block the category filter underneath. The right-side
          map-switch button stays available to change maps anytime. */}
      {inGroup && bannerVisible && (
        <Animated.View
          entering={FadeInDown.duration(320)}
          exiting={FadeOut.duration(400)}
          style={[styles.banner, styles.bannerOver, { top: insets.top + 8 }]}>
          <Pressable style={styles.bannerTap} onPress={() => router.push('/groups')}>
            <View style={[styles.bannerBadge, { backgroundColor: groupColor + '22' }]}>
              <Text style={styles.bannerBadgeEmoji}>{groupIcon}</Text>
            </View>
            <View style={styles.bannerBody}>
              <Text style={styles.bannerName} numberOfLines={1}>
                {groupName}
              </Text>
              <Text style={[styles.bannerCount, { color: groupColor }]}>共有マップ・タップで切替</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => void setActiveGroup(null)}
            hitSlop={8}
            style={styles.bannerClose}>
            <Ionicons name="close" size={18} color={colors.subInk} />
          </Pressable>
        </Animated.View>
      )}

      {/* One consolidated "tools" button (top-right) that pops open its actions,
          iOS-folder style. */}
      <ToolsMenu
        open={menuOpen}
        onToggle={() => setMenuOpen((v) => !v)}
        insetTop={insets.top}
        itemBaseTop={220}
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
            key: 'settings',
            icon: 'settings-outline',
            color: colors.ink,
            onPress: () => {
              setMenuOpen(false);
              router.push('/settings');
            },
          },
        ]}
      />

      {/* Standalone "recenter" button — kept outside the tools folder, directly
          under it, so it's always one tap away. */}
      <Pressable
        onPress={recenter}
        style={({ pressed }) => [
          styles.recenterBtn,
          { top: insets.top + 116, right: 16 },
          pressed && styles.pressed,
        ]}>
        <Ionicons name="locate" size={20} color={colors.brand} />
      </Pressable>

      {/* Standalone map-switch button (always present). Opens the switcher to
          change between the personal map and any group; in a group it shows that
          group's emoji + color so it doubles as the persistent indicator. */}
      <Pressable
        onPress={() => router.push('/groups')}
        style={({ pressed }) => [
          styles.recenterBtn,
          { top: insets.top + 168, right: 16 },
          inGroup && { backgroundColor: groupColor + '22', borderWidth: 2, borderColor: groupColor },
          pressed && styles.pressed,
        ]}>
        {inGroup ? (
          <Text style={styles.mapSwitchEmoji}>{groupIcon}</Text>
        ) : (
          <Ionicons name="people-outline" size={20} color={colors.brand} />
        )}
      </Pressable>

      {/* Info card (view mode) sits just above the mode switch. */}
      {mode === 'view' && !activeCollection && selectedMemo && (
        <View style={[styles.cardWrap, { bottom: bottomBase + 56 }]} pointerEvents="box-none">
          <MemoCard
            memo={selectedMemo}
            distance={distanceOf(selectedMemo)}
            onClose={() => setSelectedId(null)}
            onOpenDetail={() =>
              router.push(
                activeGroup
                  ? { pathname: '/shared/[id]', params: { id: selectedMemo.id } }
                  : { pathname: '/memo/[id]', params: { id: selectedMemo.id } },
              )
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
          onApply={(m) => setThemeMode(m)}
          onConfirm={() => {
            // Cross-fade the sign-in prompt in as the theme screen fades out
            // (guests included, to nudge a real account; real users skip straight in).
            if (!authUser || authUser.is_anonymous) setShowSignIn(true);
          }}
          onDone={() => setShowThemePick(false)}
        />
      )}

      {showSignIn && <SignInIntro onDone={() => setShowSignIn(false)} />}

      {/* Launch flourish: bridges the native splash into the map on every open. */}
      {showLaunch && <LaunchAnimation onDone={() => setShowLaunch(false)} />}
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
  bannerTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerEmoji: {
    fontSize: 24,
  },
  bannerOver: {
    zIndex: 20,
  },
  bannerBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBadgeEmoji: {
    fontSize: 18,
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
  recenterBtn: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  mapSwitchEmoji: {
    fontSize: 20,
  },
  pressed: {
    opacity: 0.85,
  },
});
