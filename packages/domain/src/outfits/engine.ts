import { hexToLab, labChroma, labHueDeg } from '../color/cielab.js';
import { evaluateGarmentColorHarmony } from '../color/harmony.js';
import type { ColorSeasonId } from '../color/types.js';
import { evaluateGarmentFit } from '../fit/engine.js';
import type { FitState } from '../fit/types.js';
import {
  OCCASION_RULES,
  classifyTemperatureBand,
  getGarmentSlot,
  type ColorHarmonyMode,
  type OutfitGarmentInput,
  type OutfitGenerationContext,
  type OutfitProposal,
  type OutfitScoreBreakdown,
  type TemperatureBand,
} from './types.js';

/** Pesos sección 10.4 (antes de M10 Gusto): Color 0.30, Estilo 0.20, Calce 0.25, Ocasión 0.15, Variedad 0.10 */
export const OUTFIT_SCORE_WEIGHTS = {
  color: 0.3,
  style: 0.2,
  fit: 0.25,
  occasion: 0.15,
  variety: 0.1,
} as const;

const DEFAULT_TOP_K = 15;
const DEFAULT_PROPOSAL_COUNT = 3;
const MS_PER_DAY = 86_400_000;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function isGarmentAllowedForTemperature(
  garment: OutfitGarmentInput,
  band: TemperatureBand,
): boolean {
  if (band === 'cold' && garment.category === 'shorts') {
    return false;
  }
  if (band === 'warm' && garment.category === 'jacket') {
    return false;
  }
  return true;
}

function temperatureFitScore(garment: OutfitGarmentInput, band: TemperatureBand): number {
  const seasons = garment.seasons ?? [];
  if (band === 'cold') {
    if (garment.category === 'jacket' || garment.category === 'long_sleeve' || garment.category === 'pants') {
      return 1;
    }
    if (seasons.includes('winter') || seasons.includes('autumn')) return 0.9;
    return 0.55;
  }
  if (band === 'cool') {
    if (garment.category === 'shorts') return 0.45;
    if (seasons.includes('spring') || seasons.includes('autumn')) return 1;
    return 0.85;
  }
  if (band === 'mild') {
    if (garment.category === 'jacket') return 0.72;
    return 0.95;
  }
  // warm (> 24°C)
  if (garment.category === 'tshirt' || garment.category === 'shorts' || garment.category === 'skirt' || garment.category === 'dress') {
    return 1;
  }
  if (seasons.includes('summer')) return 0.92;
  return 0.65;
}

function scoreIndividualGarment(
  garment: OutfitGarmentInput,
  context: OutfitGenerationContext,
  band: TemperatureBand,
): number {
  const rule = OCCASION_RULES[context.occasion];
  const formalityMid = (rule.minFormality + rule.maxFormality) / 2;
  const formalityDist = Math.abs(garment.formality - formalityMid);
  const formalityScore = clamp01(1 - formalityDist * 0.25);

  const tempScore = temperatureFitScore(garment, band);

  let colorScore = 0.75;
  if (context.seasonId && garment.dominantColorHex) {
    try {
      colorScore = evaluateGarmentColorHarmony(garment.dominantColorHex, context.seasonId).harmonyScore;
    } catch {
      colorScore = 0.7;
    }
  }

  return 0.4 * formalityScore + 0.35 * tempScore + 0.25 * colorScore;
}

function evaluatePairwiseColorHarmony(
  items: readonly OutfitGarmentInput[],
  seasonId: ColorSeasonId | null | undefined,
): { score: number; mode: ColorHarmonyMode } {
  const labs = items
    .map((item) => {
      if (!item.dominantColorHex) return null;
      try {
        return hexToLab(item.dominantColorHex);
      } catch {
        return null;
      }
    })
    .filter((lab): lab is NonNullable<typeof lab> => lab !== null);

  // 1. Afinidad con paleta personal (si existe)
  let paletteAvg = 0.78;
  if (seasonId && labs.length > 0) {
    const scores = items
      .filter((item) => Boolean(item.dominantColorHex))
      .map((item) => {
        try {
          return evaluateGarmentColorHarmony(item.dominantColorHex!, seasonId).harmonyScore;
        } catch {
          return 0.7;
        }
      });
    if (scores.length > 0) {
      paletteAvg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    }
  }

  if (labs.length < 2) {
    return { score: clamp01(paletteAvg), mode: 'neutral' };
  }

  // 2. Relación cromática entre prendas (neutro, monocromático, análogo, complementario, triádico)
  const chromatic = labs.filter((lab) => labChroma(lab) >= 12);
  let relationScore = 0.85;
  let mode: ColorHarmonyMode = 'neutral';

  if (chromatic.length === 0) {
    mode = 'neutral';
    relationScore = 0.9;
  } else if (chromatic.length === 1) {
    mode = 'neutral';
    relationScore = 0.94;
  } else {
    const hues = chromatic.map((lab) => labHueDeg(lab));
    let pairSum = 0;
    let pairCount = 0;
    const modes: ColorHarmonyMode[] = [];

    for (let i = 0; i < hues.length; i += 1) {
      for (let j = i + 1; j < hues.length; j += 1) {
        const rawDiff = Math.abs(hues[i]! - hues[j]!);
        const hueDiff = Math.min(rawDiff, 360 - rawDiff);
        pairCount += 1;

        if (hueDiff <= 15) {
          pairSum += 0.92;
          modes.push('monochromatic');
        } else if (hueDiff <= 45) {
          pairSum += 0.9;
          modes.push('analogous');
        } else if (Math.abs(hueDiff - 180) <= 25) {
          pairSum += 0.88;
          modes.push('complementary');
        } else if (Math.abs(hueDiff - 120) <= 20) {
          pairSum += 0.82;
          modes.push('triadic');
        } else {
          pairSum += 0.58;
          modes.push('mixed');
        }
      }
    }
    relationScore = pairCount > 0 ? pairSum / pairCount : 0.8;
    mode = modes[0] ?? 'mixed';
  }

  // 3. Contraste de valor (ΔL*): evita conjuntos planos sin contraste ni extremos estridentes
  let maxDeltaL = 0;
  for (let i = 0; i < labs.length; i += 1) {
    for (let j = i + 1; j < labs.length; j += 1) {
      maxDeltaL = Math.max(maxDeltaL, Math.abs(labs[i]!.l - labs[j]!.l));
    }
  }
  const valueContrastScore = maxDeltaL >= 12 && maxDeltaL <= 68 ? 1 : maxDeltaL < 12 ? 0.72 : 0.85;

  const combined = seasonId
    ? 0.45 * paletteAvg + 0.35 * relationScore + 0.2 * valueContrastScore
    : 0.65 * relationScore + 0.35 * valueContrastScore;

  return { score: clamp01(combined), mode };
}

function evaluateStyleCoherence(
  items: readonly OutfitGarmentInput[],
  context: OutfitGenerationContext,
): number {
  const rule = OCCASION_RULES[context.occasion];
  const formalities = items.map((i) => i.formality);
  const spread = Math.max(...formalities) - Math.min(...formalities);
  const formalityCoherence = clamp01(1 - Math.max(0, spread - 1) * 0.28);

  const styledItems = items.filter((i) => Boolean(i.style));
  let styleMatch = 0.78;
  if (styledItems.length > 0) {
    const preferredMatches = styledItems.filter((i) => rule.preferredStyles.includes(i.style!)).length;
    const uniqueStyles = new Set(styledItems.map((i) => i.style)).size;
    const consistency = uniqueStyles === 1 ? 1 : uniqueStyles === 2 ? 0.85 : 0.65;
    styleMatch = 0.55 * (preferredMatches / styledItems.length) + 0.45 * consistency;
  }

  return clamp01(0.55 * formalityCoherence + 0.45 * styleMatch);
}

function evaluateOutfitFitScore(
  items: readonly OutfitGarmentInput[],
  context: OutfitGenerationContext,
): { score: number; states: Record<string, FitState> } {
  const states: Record<string, FitState> = {};
  if (!context.bodyModel) {
    return { score: 0.78, states };
  }

  const targetBand = context.fitPreference ?? 'regular';
  let totalZones = 0;
  let matchingZones = 0;
  let tightPenalty = 0;

  for (const item of items) {
    if (!item.flatMeasuresCm || Object.keys(item.flatMeasuresCm).length === 0) {
      continue;
    }
    const report = evaluateGarmentFit(context.bodyModel, {
      category: item.category,
      sizeLabel: 'M',
      elasticity: item.elasticity,
      flatMeasuresCm: item.flatMeasuresCm,
    });
    states[item.id] = report.overallState;

    for (const zone of report.evaluatedZones) {
      totalZones += 1;
      if (zone.state === targetBand) {
        matchingZones += 1;
      } else if (
        (targetBand === 'regular' && (zone.state === 'tight' || zone.state === 'loose')) ||
        (targetBand === 'tight' && zone.state === 'regular') ||
        (targetBand === 'loose' && (zone.state === 'regular' || zone.state === 'oversize'))
      ) {
        matchingZones += 0.65;
      } else if (zone.state === 'tense') {
        tightPenalty += 0.35;
      } else {
        matchingZones += 0.35;
      }
    }
  }

  if (totalZones === 0) {
    return { score: 0.78, states };
  }

  return {
    score: clamp01(matchingZones / totalZones - tightPenalty / totalZones),
    states,
  };
}

function evaluateOccasionAndWeather(
  items: readonly OutfitGarmentInput[],
  context: OutfitGenerationContext,
  band: TemperatureBand,
): number {
  const rule = OCCASION_RULES[context.occasion];

  const formalityScores = items.map((item) => {
    if (item.formality >= rule.minFormality && item.formality <= rule.maxFormality) {
      return 1;
    }
    const delta =
      item.formality < rule.minFormality
        ? rule.minFormality - item.formality
        : item.formality - rule.maxFormality;
    return clamp01(1 - delta * 0.35);
  });
  const avgFormality = formalityScores.reduce((s, v) => s + v, 0) / formalityScores.length;

  const tempScores = items.map((item) => temperatureFitScore(item, band));
  const avgTemp = tempScores.reduce((s, v) => s + v, 0) / tempScores.length;

  const hasOuterwear = items.some((i) => getGarmentSlot(i.category) === 'outerwear');
  let layerBonus = 0;
  if (band === 'cold') {
    layerBonus = hasOuterwear ? 0.12 : -0.15;
  } else if (band === 'cool' && hasOuterwear) {
    layerBonus = 0.08;
  }

  return clamp01(0.55 * avgFormality + 0.45 * avgTemp + layerBonus);
}

function evaluateVarietyScore(
  items: readonly OutfitGarmentInput[],
  referenceTimeMs: number,
): number {
  const scores = items.map((item) => {
    if (!item.lastWornAt) return 1;
    const wornMs = Date.parse(item.lastWornAt);
    if (!Number.isFinite(wornMs)) return 0.9;
    const daysAgo = Math.max(0, (referenceTimeMs - wornMs) / MS_PER_DAY);
    if (daysAgo <= 1) return 0.2;
    if (daysAgo <= 3) return 0.45;
    if (daysAgo <= 7) return 0.72;
    if (daysAgo <= 14) return 0.88;
    return 1;
  });

  return clamp01(scores.reduce((s, v) => s + v, 0) / scores.length);
}

/**
 * Evalúa un conjunto específico con el puntaje de 5 componentes (T9.4).
 */
export function scoreOutfitCandidate(
  items: readonly OutfitGarmentInput[],
  context: OutfitGenerationContext,
): OutfitProposal {
  const band = classifyTemperatureBand(context.temperatureC);
  const referenceTimeMs = context.referenceDateIso
    ? Date.parse(context.referenceDateIso)
    : Date.now();

  const { score: color, mode: colorHarmonyMode } = evaluatePairwiseColorHarmony(
    items,
    context.seasonId,
  );
  const style = evaluateStyleCoherence(items, context);
  const { score: fit, states: fitStatesByGarmentId } = evaluateOutfitFitScore(items, context);
  const occasion = evaluateOccasionAndWeather(items, context, band);
  const variety = evaluateVarietyScore(items, referenceTimeMs);

  const weighted =
    OUTFIT_SCORE_WEIGHTS.color * color +
    OUTFIT_SCORE_WEIGHTS.style * style +
    OUTFIT_SCORE_WEIGHTS.fit * fit +
    OUTFIT_SCORE_WEIGHTS.occasion * occasion +
    OUTFIT_SCORE_WEIGHTS.variety * variety;

  const breakdown: OutfitScoreBreakdown = {
    total: round1(weighted * 100),
    color: Math.round(color * 100),
    style: Math.round(style * 100),
    fit: Math.round(fit * 100),
    occasion: Math.round(occasion * 100),
    variety: Math.round(variety * 100),
  };

  const sortedIds = items.map((i) => i.id).sort().join('+');
  const rule = OCCASION_RULES[context.occasion];
  const summary = `${rule.label} · ${Math.round(context.temperatureC)} °C`;

  return {
    id: `outfit:${sortedIds}`,
    items,
    score: breakdown,
    colorHarmonyMode,
    fitStatesByGarmentId,
    summary,
  };
}

/**
 * Genera todas las combinaciones válidas por ranuras (top-K por ranura) ordenadas por puntaje (T9.3).
 */
export function generateAllOutfitCandidates(
  garments: readonly OutfitGarmentInput[],
  context: OutfitGenerationContext,
): OutfitProposal[] {
  const band = classifyTemperatureBand(context.temperatureC);
  const topK = Math.max(1, context.topKPerSlot ?? DEFAULT_TOP_K);
  const rule = OCCASION_RULES[context.occasion];

  const owned = garments.filter((g) => g.status === 'owned');
  if (owned.length === 0) return [];

  // Filtro duro por temperatura y formalidad (con fallback relajado si el clóset es pequeño)
  const filterSlot = (slotItems: OutfitGarmentInput[]): OutfitGarmentInput[] => {
    const strict = slotItems.filter(
      (g) =>
        isGarmentAllowedForTemperature(g, band) &&
        g.formality >= rule.minFormality - 1 &&
        g.formality <= rule.maxFormality + 1,
    );
    const pool = strict.length > 0 ? strict : slotItems.filter((g) => isGarmentAllowedForTemperature(g, band));
    const effective = pool.length > 0 ? pool : slotItems;
    return effective
      .sort((a, b) => scoreIndividualGarment(b, context, band) - scoreIndividualGarment(a, context, band))
      .slice(0, topK);
  };

  const tops = filterSlot(owned.filter((g) => getGarmentSlot(g.category) === 'top'));
  const bottoms = filterSlot(owned.filter((g) => getGarmentSlot(g.category) === 'bottom'));
  const onePieces = filterSlot(owned.filter((g) => getGarmentSlot(g.category) === 'one_piece'));
  const outerwear =
    band === 'warm'
      ? []
      : filterSlot(owned.filter((g) => getGarmentSlot(g.category) === 'outerwear'));

  const combos: OutfitGarmentInput[][] = [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      if (band !== 'cold' || outerwear.length === 0) {
        combos.push([top, bottom]);
      }
      if (band === 'cold' || band === 'cool') {
        for (const coat of outerwear.slice(0, 6)) {
          combos.push([top, bottom, coat]);
        }
      }
    }
  }

  for (const dress of onePieces) {
    if (band !== 'cold' || outerwear.length === 0) {
      combos.push([dress]);
    }
    if (band === 'cold' || band === 'cool') {
      for (const coat of outerwear.slice(0, 6)) {
        combos.push([dress, coat]);
      }
    }
  }

  return combos
    .map((combo) => scoreOutfitCandidate(combo, context))
    .sort((a, b) => b.score.total - a.score.total);
}

function countDifferentGarments(a: OutfitProposal, b: OutfitProposal): number {
  const setA = new Set(a.items.map((i) => i.id));
  const setB = new Set(b.items.map((i) => i.id));
  let diff = 0;
  for (const id of setA) {
    if (!setB.has(id)) diff += 1;
  }
  for (const id of setB) {
    if (!setA.has(id)) diff += 1;
  }
  return Math.ceil(diff / 2);
}

/**
 * Selecciona hasta N propuestas diversas (por defecto 3) que difieran en al menos 2 prendas (T9.5).
 * Si el clóset no alcanza suficientes combinaciones con 2 prendas distintas, completa con >= 1 distinta.
 */
export function generateDiverseOutfits(
  garments: readonly OutfitGarmentInput[],
  context: OutfitGenerationContext,
): OutfitProposal[] {
  const targetCount = Math.max(1, context.count ?? DEFAULT_PROPOSAL_COUNT);
  const candidates = generateAllOutfitCandidates(garments, context);
  if (candidates.length === 0) return [];

  const selected: OutfitProposal[] = [candidates[0]!];

  // Pasada estricta: diferencia de al menos 2 prendas respecto a cada seleccionada (sección 10.4)
  for (const candidate of candidates.slice(1)) {
    if (selected.length >= targetCount) break;
    const isDiverse = selected.every((picked) => countDifferentGarments(picked, candidate) >= 2);
    if (isDiverse) {
      selected.push(candidate);
    }
  }

  // Fallback para clósets pequeños: diferencia de al menos 1 prenda
  if (selected.length < targetCount) {
    for (const candidate of candidates.slice(1)) {
      if (selected.length >= targetCount) break;
      if (selected.some((p) => p.id === candidate.id)) continue;
      const differsByOne = selected.every((picked) => countDifferentGarments(picked, candidate) >= 1);
      if (differsByOne) {
        selected.push(candidate);
      }
    }
  }

  return selected;
}
