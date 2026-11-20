import type { BodyModel, FitPreference, FitState, GarmentCategory, GarmentFlatMeasurements } from '../index.js';
import type { ColorSeasonId } from '../color/types.js';

export const OUTFIT_OCCASIONS = [
  'casual',
  'office',
  'formal',
  'sport',
  'date',
  'travel',
] as const;

export type OutfitOccasion = (typeof OUTFIT_OCCASIONS)[number];

export type TemperatureBand = 'cold' | 'cool' | 'mild' | 'warm';

export type OutfitSlot = 'top' | 'bottom' | 'one_piece' | 'outerwear';

export type ColorHarmonyMode =
  | 'neutral'
  | 'monochromatic'
  | 'analogous'
  | 'complementary'
  | 'triadic'
  | 'mixed';

export interface OccasionRule {
  readonly id: OutfitOccasion;
  readonly label: string;
  readonly minFormality: number;
  readonly maxFormality: number;
  readonly preferredStyles: readonly string[];
}

export const OCCASION_RULES: Readonly<Record<OutfitOccasion, OccasionRule>> = {
  casual: {
    id: 'casual',
    label: 'Casual',
    minFormality: 1,
    maxFormality: 3,
    preferredStyles: ['casual', 'minimalist', 'streetwear', 'bohemian'],
  },
  office: {
    id: 'office',
    label: 'Oficina',
    minFormality: 3,
    maxFormality: 4,
    preferredStyles: ['classic', 'minimalist', 'formal'],
  },
  formal: {
    id: 'formal',
    label: 'Formal',
    minFormality: 4,
    maxFormality: 5,
    preferredStyles: ['formal', 'classic', 'minimalist'],
  },
  sport: {
    id: 'sport',
    label: 'Deporte',
    minFormality: 1,
    maxFormality: 2,
    preferredStyles: ['sporty', 'casual'],
  },
  date: {
    id: 'date',
    label: 'Salida / cita',
    minFormality: 2,
    maxFormality: 4,
    preferredStyles: ['classic', 'minimalist', 'bohemian', 'casual'],
  },
  travel: {
    id: 'travel',
    label: 'Viaje',
    minFormality: 1,
    maxFormality: 3,
    preferredStyles: ['casual', 'minimalist', 'sporty'],
  },
};

export interface OutfitGarmentInput {
  readonly id: string;
  readonly name: string;
  readonly category: GarmentCategory;
  readonly status: 'owned' | 'wishlist';
  readonly formality: 1 | 2 | 3 | 4 | 5;
  readonly elasticity: number;
  readonly dominantColorHex?: string;
  readonly style?: string;
  readonly pattern?: string;
  readonly seasons?: readonly ('spring' | 'summer' | 'autumn' | 'winter')[];
  readonly tags?: readonly string[];
  readonly price?: number;
  readonly flatMeasuresCm?: GarmentFlatMeasurements;
  readonly lastWornAt?: string;
  readonly wearCount?: number;
}

export interface OutfitGenerationContext {
  readonly occasion: OutfitOccasion;
  readonly temperatureC: number;
  readonly bodyModel?: BodyModel | null;
  readonly fitPreference?: FitPreference;
  readonly seasonId?: ColorSeasonId | null;
  readonly referenceDateIso?: string;
  /** Máximo de candidatas por ranura (sección 10.4: K = 15) */
  readonly topKPerSlot?: number;
  /** Número de propuestas diversas a devolver (T9.5: 3 por defecto) */
  readonly count?: number;
}

export interface OutfitScoreBreakdown {
  readonly total: number;
  readonly color: number;
  readonly style: number;
  readonly fit: number;
  readonly occasion: number;
  readonly variety: number;
}

export interface OutfitProposal {
  readonly id: string;
  readonly items: readonly OutfitGarmentInput[];
  readonly score: OutfitScoreBreakdown;
  readonly colorHarmonyMode: ColorHarmonyMode;
  readonly fitStatesByGarmentId: Readonly<Record<string, FitState>>;
  readonly summary: string;
}

export interface GarmentUsageMetrics {
  readonly garmentId: string;
  readonly wearCount: number;
  readonly cpw: number | null;
  readonly projectedCpw: number | null;
  readonly versatility: number;
  readonly isOrphan: boolean;
}

export interface WishlistUnlockResult {
  readonly garmentId: string;
  readonly unlocksOutfitsCount: number;
  readonly bestNewScore: number;
}

export function classifyTemperatureBand(temperatureC: number): TemperatureBand {
  if (temperatureC < 12) return 'cold';
  if (temperatureC < 18) return 'cool';
  if (temperatureC <= 24) return 'mild';
  return 'warm';
}

export function getGarmentSlot(category: GarmentCategory): OutfitSlot {
  switch (category) {
    case 'tshirt':
    case 'long_sleeve':
      return 'top';
    case 'pants':
    case 'shorts':
    case 'skirt':
      return 'bottom';
    case 'dress':
      return 'one_piece';
    case 'jacket':
      return 'outerwear';
  }
}
