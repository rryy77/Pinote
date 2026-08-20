import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';
import { useCollectionStore } from '@/store/useCollectionStore';

type PlaceResult = { latitude: number; longitude: number; label: string };

/**
 * Place search: geocode a shop / address / place name into real-world
 * locations, so the user can drop a memo pin on a spot they can't easily find
 * on the map. (Memo browsing lives on the separate ライブラリ screen.)
 *
 * With an `addTo=<collectionId>` param it instead adds the chosen place as a
 * candidate item to that collection.
 */
export default function SearchScreen() {
  const router = useRouter();
  const { addTo } = useLocalSearchParams<{ addTo?: string }>();
  const addItem = useCollectionStore((s) => s.addItem);
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const locs = await Location.geocodeAsync(q);
      const results = await Promise.all(
        locs.slice(0, 6).map(async (l) => {
          let label = q;
          try {
            const rev = await Location.reverseGeocodeAsync({
              latitude: l.latitude,
              longitude: l.longitude,
            });
            const a = rev[0];
            if (a) label = [a.name, a.city, a.region].filter(Boolean).join(' ') || q;
          } catch {
            // keep the typed query as the label
          }
          return { latitude: l.latitude, longitude: l.longitude, label };
        }),
      );
      setPlaces(results);
    } catch {
      setPlaces([]);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  };

  const pinPlace = async (p: PlaceResult) => {
    const title = query.trim() || p.label;
    if (addTo) {
      await addItem({ collectionId: addTo, title, lat: p.latitude, lng: p.longitude });
      router.back();
      return;
    }
    router.replace({
      pathname: '/memo/new',
      params: { lat: String(p.latitude), lng: String(p.longitude), title },
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: addTo ? '候補を追加' : '場所を探す',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.brand} />
            </Pressable>
          ),
          headerRight: addTo
            ? undefined
            : () => (
                <Pressable onPress={() => router.push('/backup')} hitSlop={10}>
                  <Ionicons name="cloud-upload-outline" size={22} color={colors.brand} />
                </Pressable>
              ),
        }}
      />

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#8A8F98" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="お店・住所・場所の名前"
          placeholderTextColor="#9AA0A6"
          style={styles.input}
          autoFocus
          clearButtonMode="while-editing"
          returnKeyType="search"
          onSubmitEditing={runSearch}
        />
        {searching && <ActivityIndicator size="small" color={colors.brand} />}
      </View>

      <FlatList
        data={places}
        keyExtractor={(p, i) => `${p.latitude},${p.longitude},${i}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={places.length === 0 ? styles.emptyWrap : undefined}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={40} color="#C4C7CC" />
            <Text style={styles.emptyText}>
              {searching
                ? '検索中…'
                : searched
                  ? '見つかりませんでした。\nお店の名前に地名を足すと見つかりやすいです。'
                  : 'お店や住所を入力して検索'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => pinPlace(item)}
            style={({ pressed }) => [styles.placeRow, pressed && styles.placePressed]}>
            <View style={styles.placeIcon}>
              <Ionicons name="location" size={20} color={colors.brand} />
            </View>
            <View style={styles.placeBody}>
              <Text style={styles.placeLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.placeAction}>{addTo ? '候補に追加' : 'ここにメモを残す'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C4C7CC" />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
  },
  emptyWrap: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#60646C',
    textAlign: 'center',
    lineHeight: 22,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  placePressed: {
    opacity: 0.6,
  },
  placeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
  },
  placeBody: {
    flex: 1,
    gap: 2,
  },
  placeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  placeAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand,
  },
});
