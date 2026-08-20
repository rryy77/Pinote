import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { CategoryId } from '@/types/memo';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type Category = {
  id: CategoryId;
  /** Short label shown in the UI. */
  label: string;
  /** Ionicons glyph used across the UI (lists, chips, badges). */
  icon: IoniconName;
  /** Pin tint color on the map. */
  tint: string;
  /** SF Symbol name used for the Apple Maps marker glyph. */
  symbol: string;
  /**
   * Apple Maps points-of-interest categories to surface when this filter is
   * active, so selecting e.g. 食事 highlights nearby restaurants on the map.
   */
  poi: string[];
};

/** All selectable memo categories, in display order. */
export const CATEGORIES: Category[] = [
  {
    id: 'food',
    label: '食事',
    icon: 'restaurant',
    tint: '#EF4444',
    symbol: 'fork.knife',
    poi: ['RESTAURANT', 'BAKERY', 'FOOD_MARKET'],
  },
  { id: 'cafe', label: 'カフェ', icon: 'cafe', tint: '#B45309', symbol: 'cup.and.saucer.fill', poi: ['CAFE'] },
  { id: 'shop', label: 'お店', icon: 'storefront', tint: '#8B5CF6', symbol: 'bag.fill', poi: ['STORE'] },
  { id: 'hotel', label: 'ホテル', icon: 'bed', tint: '#0D9488', symbol: 'bed.double.fill', poi: ['HOTEL'] },
  { id: 'parking', label: '駐車場', icon: 'car', tint: '#2563EB', symbol: 'parkingsign', poi: ['PARKING'] },
  {
    id: 'spot',
    label: 'スポット',
    icon: 'star',
    tint: '#F59E0B',
    symbol: 'star.fill',
    poi: ['LANDMARK', 'MUSEUM', 'PARK'],
  },
  { id: 'other', label: 'その他', icon: 'bookmark', tint: '#6B7280', symbol: 'mappin', poi: [] },
];

export const DEFAULT_CATEGORY: CategoryId = 'food';

const CATEGORY_MAP: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<CategoryId, Category>,
);

/** Resolve a category by id, falling back to "other" for unknown values. */
export function getCategory(id: string): Category {
  return CATEGORY_MAP[id as CategoryId] ?? CATEGORY_MAP.other;
}
