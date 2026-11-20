import { hexToLab, labChroma, labHueDeg } from '../color/cielab.js';
import type { OutfitGarmentInput } from '../outfits/types.js';
import {
  TASTE_COLD_START_THRESHOLD,
  TASTE_EVENT_VALUES,
  TASTE_HALF_LIFE_DAYS,
  serializeTasteKey,
  type TasteExplicitOverrides,
  type TasteFeatureAffinity,
  type TasteFeatureCategory,
  type TasteFeatureKey,
  type TasteInteractionSignal,
  type TasteProfile,
  type TasteSnapshotAggregate,
} from './types.js';

const MS_PER_DAY = 86_400_000;

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Clasifica un color hex en familia cromática estable para rasgos de gusto.
 */
export function classifyTasteColorFamily(hex: string | undefined): string {
  if (!hex) return 'neutro';
  try {
    const lab = hexToLab(hex);
    const chroma = labChroma(lab);
    if (chroma < 12 || lab.l < 14 || lab.l > 92) return 'neutro';
    const hue = labHueDeg(lab);
    if (hue >= 35 && hue <= 85 && lab.l < 65 && chroma < 42) return 'tierra';
    if (hue >= 95 && hue < 195) return 'verde';
    if (hue >= 195 && hue < 285) return 'azul';
    if (hue >= 285 && hue < 335) return 'violeta';
    return 'calido';
  } catch {
    return 'neutro';
  }
}

/**
 * Decaimiento exponencial con vida media de 90 días (sección 10.6):
 * peso(evento) = 0.5 ^ (edad_en_días / 90)
 */
export function computeTasteEventDecay(
  eventAtIso: string,
  referenceAtIso: string,
  halfLifeDays = TASTE_HALF_LIFE_DAYS,
): number {
  const eventMs = Date.parse(eventAtIso);
  const refMs = Date.parse(referenceAtIso);
  if (!Number.isFinite(eventMs) || !Number.isFinite(refMs)) {
    return 1;
  }
  const ageDays = Math.max(0, (refMs - eventMs) / MS_PER_DAY);
  return 0.5 ** (ageDays / Math.max(1, halfLifeDays));
}

/**
 * Suavizado de Laplace (sección 10.6): afinidad = (pos + 1) / (pos + neg + 2)
 */
export function computeLaplaceAffinity(positiveWeight: number, negativeWeight: number): number {
  const pos = Math.max(0, positiveWeight);
  const neg = Math.max(0, negativeWeight);
  return (pos + 1) / (pos + neg + 2);
}

/**
 * Extrae los rasgos evaluables de una prenda para puntuación y registro de feedback.
 */
export function extractGarmentTasteFeatures(
  garment: Pick<OutfitGarmentInput, 'category' | 'formality' | 'pattern' | 'dominantColorHex'>,
  fitBand?: string,
): TasteFeatureKey[] {
  const features: TasteFeatureKey[] = [
    { category: 'color_family', value: classifyTasteColorFamily(garment.dominantColorHex) },
    { category: 'category', value: garment.category },
    { category: 'formality', value: String(garment.formality) },
  ];

  if (garment.pattern) {
    features.push({ category: 'pattern', value: garment.pattern });
  }
  if (fitBand) {
    features.push({ category: 'fit_band', value: fitBand });
  }
  return features;
}

/**
 * Calcula el perfil de gustos explicable combinando eventos recientes (con decaimiento
 * de 90 días), agregados compactados y reglas explícitas (fijar/vetar) (T10.3).
 */
export function buildTasteProfile(
  signals: readonly TasteInteractionSignal[],
  options: {
    referenceDateIso?: string;
    snapshots?: readonly TasteSnapshotAggregate[];
    overrides?: TasteExplicitOverrides;
    coldStartThreshold?: number;
  } = {},
): TasteProfile {
  const refIso = options.referenceDateIso ?? new Date().toISOString();
  const coldStartThreshold = options.coldStartThreshold ?? TASTE_COLD_START_THRESHOLD;
  const rules = options.overrides?.rules ?? {};

  const buckets = new Map<
    string,
    { category: TasteFeatureCategory; value: string; pos: number; neg: number; count: number }
  >();

  let totalScoringEvents = 0;

  // 1. Incorporar snapshots históricos compactados (T10.6)
  for (const snap of options.snapshots ?? []) {
    totalScoringEvents += snap.eventCount;
    const snapDateIso = `${snap.month}-15T12:00:00.000Z`;
    const decay = computeTasteEventDecay(snapDateIso, refIso);

    for (const [key, acc] of Object.entries(snap.featurePosNeg)) {
      const [rawCat, ...rest] = key.split(':');
      const value = rest.join(':');
      if (!rawCat || !value) continue;
      const category = rawCat as TasteFeatureCategory;
      const bucket = buckets.get(key) ?? { category, value, pos: 0, neg: 0, count: 0 };
      bucket.pos += acc.pos * decay;
      bucket.neg += acc.neg * decay;
      bucket.count += acc.count;
      buckets.set(key, bucket);
    }
  }

  // 2. Incorporar eventos crudos recientes con decaimiento temporal
  for (const signal of signals) {
    const rawValue = TASTE_EVENT_VALUES[signal.type];
    if (rawValue === undefined) continue;

    totalScoringEvents += 1;
    const decay = computeTasteEventDecay(signal.at, refIso);
    const weighted = Math.abs(rawValue) * decay;

    const deduped = new Set<string>();
    for (const feat of signal.features) {
      const key = serializeTasteKey(feat.category, feat.value);
      if (deduped.has(key)) continue;
      deduped.add(key);

      const bucket = buckets.get(key) ?? {
        category: feat.category,
        value: feat.value.trim().toLowerCase(),
        pos: 0,
        neg: 0,
        count: 0,
      };
      if (rawValue >= 0) {
        bucket.pos += weighted;
      } else {
        bucket.neg += weighted;
      }
      bucket.count += 1;
      buckets.set(key, bucket);
    }
  }

  // 3. Garantizar que los rasgos fijados o vetados aparezcan aunque aún no tengan eventos
  for (const [key, rule] of Object.entries(rules)) {
    if (!buckets.has(key)) {
      const [rawCat, ...rest] = key.split(':');
      const value = rest.join(':');
      if (rawCat && value) {
        buckets.set(key, {
          category: rawCat as TasteFeatureCategory,
          value,
          pos: 0,
          neg: 0,
          count: 0,
        });
      }
    }
    void rule;
  }

  const affinitiesByKey: Record<string, TasteFeatureAffinity> = {};
  const list: TasteFeatureAffinity[] = [];

  for (const [key, bucket] of buckets.entries()) {
    const explicitRule = rules[key];
    const affinity =
      explicitRule === 'pinned'
        ? 1
        : explicitRule === 'vetoed'
          ? 0
          : computeLaplaceAffinity(bucket.pos, bucket.neg);

    const entry: TasteFeatureAffinity = {
      key,
      category: bucket.category,
      value: bucket.value,
      affinity: round3(affinity),
      positiveWeight: round3(bucket.pos),
      negativeWeight: round3(bucket.neg),
      supportingEvents: bucket.count,
      ...(explicitRule ? { explicitRule } : {}),
    };
    affinitiesByKey[key] = entry;
    list.push(entry);
  }

  list.sort((a, b) => Math.abs(b.affinity - 0.5) - Math.abs(a.affinity - 0.5));

  const isColdStart = totalScoringEvents < coldStartThreshold;
  const hasExplicitRules = Object.keys(rules).length > 0;

  return {
    totalScoringEvents,
    coldStartThreshold,
    isColdStart,
    hasExplicitRules,
    activeInScoring: !isColdStart || hasExplicitRules,
    affinitiesByKey,
    rankedAffinities: list,
  };
}

/**
 * Puntúa un conjunto de prendas contra el perfil de gustos en [0, 1] (sección 10.6):
 * gusto(outfit) = promedio de afinidades de los rasgos de sus prendas (0.5 = neutro).
 */
export function evaluateOutfitTasteScore(
  items: readonly OutfitGarmentInput[],
  profile: TasteProfile | null | undefined,
  fitStatesByGarmentId?: Readonly<Record<string, string>>,
): { score: number; matchedHighlights: readonly string[] } {
  if (!profile || !profile.activeInScoring || items.length === 0) {
    return { score: 0.5, matchedHighlights: [] };
  }

  let sum = 0;
  let count = 0;
  const highlights: string[] = [];

  for (const item of items) {
    const features = extractGarmentTasteFeatures(item, fitStatesByGarmentId?.[item.id]);
    for (const feat of features) {
      const key = serializeTasteKey(feat.category, feat.value);
      const entry = profile.affinitiesByKey[key];
      if (!entry) {
        sum += 0.5;
        count += 1;
        continue;
      }

      // En arranque en frío solo aplican reglas explícitas (fijado/vetado).
      if (profile.isColdStart && !entry.explicitRule) {
        sum += 0.5;
        count += 1;
        continue;
      }

      sum += entry.affinity;
      count += 1;

      if (entry.explicitRule === 'pinned' || entry.affinity >= 0.65) {
        highlights.push(`+${feat.value}`);
      } else if (entry.explicitRule === 'vetoed' || entry.affinity <= 0.35) {
        highlights.push(`-${feat.value}`);
      }
    }
  }

  return {
    score: count > 0 ? round3(sum / count) : 0.5,
    matchedHighlights: Array.from(new Set(highlights)).slice(0, 4),
  };
}
