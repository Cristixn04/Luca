import { generateAllOutfitCandidates } from './engine.js';
import type {
  GarmentUsageMetrics,
  OutfitGarmentInput,
  OutfitGenerationContext,
  WishlistUnlockResult,
} from './types.js';

export const VERSATILITY_SCORE_THRESHOLD = 60;
export const DEFAULT_EXPECTED_WEARS = 30;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Costo por uso real (sección 10.5): CPW = precio / max(usos, 1).
 */
export function computeCpw(price: number | undefined, wearCount: number): number | null {
  if (price === undefined || !Number.isFinite(price) || price < 0) return null;
  return round2(price / Math.max(1, Math.floor(wearCount)));
}

/**
 * Costo por uso proyectado (sección 10.5): CPW_proyectado = precio / usos_esperados.
 */
export function computeProjectedCpw(
  price: number | undefined,
  expectedWears = DEFAULT_EXPECTED_WEARS,
): number | null {
  if (price === undefined || !Number.isFinite(price) || price < 0) return null;
  return round2(price / Math.max(1, Math.floor(expectedWears)));
}

/**
 * Calcula usos, CPW real, CPW proyectado, versatilidad (nº outfits con score >= 60)
 * y marca de prenda huérfana (versatilidad == 0) para cada prenda propia (T9.7, T9.8).
 */
export function analyzeClosetUsage(
  garments: readonly OutfitGarmentInput[],
  context: OutfitGenerationContext,
  options: { expectedWears?: number; scoreThreshold?: number } = {},
): Record<string, GarmentUsageMetrics> {
  const expectedWears = options.expectedWears ?? DEFAULT_EXPECTED_WEARS;
  const threshold = options.scoreThreshold ?? VERSATILITY_SCORE_THRESHOLD;

  const candidates = generateAllOutfitCandidates(garments, {
    ...context,
    topKPerSlot: context.topKPerSlot ?? 25,
  });

  const validOutfits = candidates.filter((outfit) => outfit.score.total >= threshold);
  const versatilityCount = new Map<string, number>();

  for (const outfit of validOutfits) {
    for (const item of outfit.items) {
      versatilityCount.set(item.id, (versatilityCount.get(item.id) ?? 0) + 1);
    }
  }

  const metrics: Record<string, GarmentUsageMetrics> = {};
  for (const garment of garments) {
    const wearCount = Math.max(0, Math.floor(garment.wearCount ?? 0));
    const versatility = garment.status === 'owned' ? (versatilityCount.get(garment.id) ?? 0) : 0;
    metrics[garment.id] = {
      garmentId: garment.id,
      wearCount,
      cpw: computeCpw(garment.price, wearCount),
      projectedCpw: computeProjectedCpw(garment.price, expectedWears),
      versatility,
      isOrphan: garment.status === 'owned' && versatility === 0,
    };
  }

  return metrics;
}

/**
 * Simula añadir una prenda de la lista de deseos al clóset propio y devuelve
 * cuántos outfits nuevos (score >= 60) desbloquea (T9.8 · sección 10.5).
 */
export function simulateWishlistUnlock(
  wishlistGarment: OutfitGarmentInput,
  ownedGarments: readonly OutfitGarmentInput[],
  context: OutfitGenerationContext,
  scoreThreshold = VERSATILITY_SCORE_THRESHOLD,
): WishlistUnlockResult {
  const simulatedOwned: OutfitGarmentInput = {
    ...wishlistGarment,
    status: 'owned',
  };

  const candidates = generateAllOutfitCandidates(
    [...ownedGarments.filter((g) => g.status === 'owned' && g.id !== wishlistGarment.id), simulatedOwned],
    {
      ...context,
      topKPerSlot: context.topKPerSlot ?? 25,
    },
  );

  const unlocked = candidates.filter(
    (outfit) =>
      outfit.score.total >= scoreThreshold &&
      outfit.items.some((item) => item.id === wishlistGarment.id),
  );

  return {
    garmentId: wishlistGarment.id,
    unlocksOutfitsCount: unlocked.length,
    bestNewScore: unlocked[0]?.score.total ?? 0,
  };
}
