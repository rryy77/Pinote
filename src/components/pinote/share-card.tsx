import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Collection } from '@/types/collection';

type Props = {
  collection: Collection;
  done: number;
  total: number;
  /** Names of visited places to list (already visit-ordered). */
  visitedNames: string[];
};

/**
 * A fixed-size badge card designed to be rasterized with `captureRef` and
 * shared (制覇バッジ / travel-log summary). Rendered off-screen by the caller.
 */
export const ShareCard = forwardRef<View, Props>(function ShareCard(
  { collection, done, total, visitedNames },
  ref,
) {
  const complete = total > 0 && done === total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const preview = visitedNames.slice(0, 5);

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: collection.color }]}>
      <View style={styles.brandRow}>
        <Ionicons name="location" size={18} color="#FFFFFF" />
        <Text style={styles.brand}>Pinote</Text>
      </View>

      <Text style={styles.emoji}>{collection.icon}</Text>
      <Text style={styles.name} numberOfLines={2}>
        {collection.name}
      </Text>

      <View style={styles.scoreRow}>
        <Text style={styles.score}>{done}</Text>
        <Text style={styles.scoreSlash}> / {total}</Text>
        <Text style={styles.scoreLabel}>制覇</Text>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>

      {complete && (
        <View style={styles.trophy}>
          <Ionicons name="trophy" size={16} color={collection.color} />
          <Text style={[styles.trophyText, { color: collection.color }]}>コンプリート！</Text>
        </View>
      )}

      {preview.length > 0 && (
        <View style={styles.list}>
          {preview.map((n, i) => (
            <Text key={`${n}-${i}`} style={styles.listItem} numberOfLines={1}>
              ✓ {n}
            </Text>
          ))}
          {visitedNames.length > preview.length && (
            <Text style={styles.listMore}>ほか {visitedNames.length - preview.length} 件</Text>
          )}
        </View>
      )}

      <Text style={styles.footer}>Pinote で旅を記録</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 320,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 30,
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    opacity: 0.9,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emoji: { fontSize: 56, marginTop: 18 },
  name: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 16,
  },
  score: { color: '#FFFFFF', fontSize: 52, fontWeight: '900' },
  scoreSlash: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', opacity: 0.85 },
  scoreLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginLeft: 8 },
  barTrack: {
    alignSelf: 'stretch',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 18,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  trophy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  trophyText: { fontSize: 14, fontWeight: '900' },
  list: {
    alignSelf: 'stretch',
    marginTop: 18,
    gap: 5,
  },
  listItem: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.95,
  },
  listMore: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.8,
    marginTop: 2,
  },
  footer: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.8,
    marginTop: 22,
    letterSpacing: 0.5,
  },
});
