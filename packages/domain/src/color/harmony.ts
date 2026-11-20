import { ciede2000, hexToLab, labChroma, normalizeHex } from './cielab.js';
import { getSeasonPalette } from './palettes.js';
import type { ColorSeasonId, GarmentColorHarmony, HarmonyBand } from './types.js';

const HARMONY_DECAY_DELTA_E = 15;

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function classifyHarmonyBand(score: number): HarmonyBand {
  if (score >= 0.72) return 'excellent';
  if (score >= 0.52) return 'good';
  if (score >= 0.34) return 'neutral';
  return 'clashing';
}

const BAND_DESCRIPTION: Readonly<Record<HarmonyBand, string>> = {
  excellent: 'Armonía muy alta con tu paleta',
  good: 'Buena afinidad con tu estación',
  neutral: 'Afinidad neutra (útil como apoyo o lejos del rostro)',
  clashing: 'Contrasta con tu paleta estacional',
};

/**
 * Evalúa la afinidad de una prenda (#RRGGBB) contra la paleta de una estación usando
 * CIEDE2000 y la fórmula documentada en la sección 10.3: A = exp(-ΔE₀₀_mín / 15) (T8.6).
 */
export function evaluateGarmentColorHarmony(
  garmentHex: string,
  seasonId: ColorSeasonId,
): GarmentColorHarmony {
  const normalized = normalizeHex(garmentHex);
  const garmentLab = hexToLab(normalized);
  const palette = getSeasonPalette(seasonId);

  let bestColor = palette.colors[0]!;
  let bestLab = hexToLab(bestColor.hex);
  let minDeltaE = Number.POSITIVE_INFINITY;

  for (const swatch of palette.colors) {
    const swatchLab = hexToLab(swatch.hex);
    const dE = ciede2000(garmentLab, swatchLab);
    if (dE < minDeltaE) {
      minDeltaE = dE;
      bestColor = swatch;
      bestLab = swatchLab;
    }
  }

  const harmonyScore = Math.exp(-minDeltaE / HARMONY_DECAY_DELTA_E);
  const scorePercent = Math.round(harmonyScore * 100);
  const band = classifyHarmonyBand(harmonyScore);
  const deltaL = round2(garmentLab.l - bestLab.l);
  const deltaC = round2(labChroma(garmentLab) - labChroma(bestLab));

  const reason = `${BAND_DESCRIPTION[band]}: el tono más cercano es ${bestColor.name} (ΔE₀₀ = ${minDeltaE.toFixed(1)}).`;

  return {
    seasonId: palette.id,
    seasonLabel: palette.label,
    garmentHex: normalized,
    garmentLab,
    harmonyScore: round2(harmonyScore),
    scorePercent,
    minDeltaE00: round2(minDeltaE),
    closestColor: bestColor,
    band,
    breakdown: {
      deltaL,
      deltaC,
      closestName: bestColor.name,
      closestHex: bestColor.hex,
    },
    reason,
  };
}
