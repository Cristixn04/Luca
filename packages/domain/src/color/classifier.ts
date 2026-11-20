import { hexToLab, labChroma } from './cielab.js';
import { SEASON_PALETTES } from './palettes.js';
import {
  COLOR_SEASONS,
  type ChromaLevel,
  type ColorProfileDimensions,
  type ColorProfileResult,
  type ColorSeasonId,
  type ColorSwatchesInput,
  type SeasonCandidate,
  type Undertone,
  type ValueLevel,
} from './types.js';

interface SeasonPrototype {
  readonly undertoneTarget: number; // -1 frío .. +1 cálido
  readonly valueTargetL: number; // 0..100
  readonly chromaTargetC: number; // 0..45
  readonly contrastTarget: number; // |L_skin - L_hair|
  readonly wUndertone: number;
  readonly wValue: number;
  readonly wChroma: number;
  readonly wContrast: number;
  readonly traitSummary: string;
}

/**
 * Prototipos calibrados para el árbol de decisión de las 12 estaciones (T8.4 / T8.5).
 * Cada estación prioriza su dimensión dominante (cálido/frío, claro/profundo, suave/brillante).
 */
const SEASON_PROTOTYPES: Readonly<Record<ColorSeasonId, SeasonPrototype>> = {
  bright_spring: {
    undertoneTarget: 0.45,
    valueTargetL: 58,
    chromaTargetC: 28,
    contrastTarget: 42,
    wUndertone: 0.25,
    wValue: 0.15,
    wChroma: 0.35,
    wContrast: 0.25,
    traitSummary: 'croma brillante y subtono cálido-neutro con alto contraste',
  },
  warm_spring: {
    undertoneTarget: 0.85,
    valueTargetL: 67,
    chromaTargetC: 26,
    contrastTarget: 22,
    wUndertone: 0.42,
    wValue: 0.23,
    wChroma: 0.25,
    wContrast: 0.1,
    traitSummary: 'subtono marcadamente cálido con luminosidad clara y frescura',
  },
  light_spring: {
    undertoneTarget: 0.4,
    valueTargetL: 78,
    chromaTargetC: 20,
    contrastTarget: 14,
    wUndertone: 0.25,
    wValue: 0.45,
    wChroma: 0.18,
    wContrast: 0.12,
    traitSummary: 'valor muy claro, contraste suave y matiz cálido',
  },
  light_summer: {
    undertoneTarget: -0.45,
    valueTargetL: 77,
    chromaTargetC: 14,
    contrastTarget: 14,
    wUndertone: 0.28,
    wValue: 0.44,
    wChroma: 0.18,
    wContrast: 0.1,
    traitSummary: 'valor muy claro y delicado con base fría',
  },
  cool_summer: {
    undertoneTarget: -0.82,
    valueTargetL: 58,
    chromaTargetC: 15,
    contrastTarget: 28,
    wUndertone: 0.44,
    wValue: 0.2,
    wChroma: 0.24,
    wContrast: 0.12,
    traitSummary: 'subtono claramente frío con contraste medio y suavidad elegante',
  },
  soft_summer: {
    undertoneTarget: -0.35,
    valueTargetL: 56,
    chromaTargetC: 10,
    contrastTarget: 16,
    wUndertone: 0.24,
    wValue: 0.18,
    wChroma: 0.42,
    wContrast: 0.16,
    traitSummary: 'croma muy suave y ahumado con subtono neutro-frío',
  },
  soft_autumn: {
    undertoneTarget: 0.35,
    valueTargetL: 56,
    chromaTargetC: 13,
    contrastTarget: 18,
    wUndertone: 0.25,
    wValue: 0.18,
    wChroma: 0.42,
    wContrast: 0.15,
    traitSummary: 'croma suave y aterciopelado con subtono neutro-cálido',
  },
  warm_autumn: {
    undertoneTarget: 0.88,
    valueTargetL: 52,
    chromaTargetC: 24,
    contrastTarget: 26,
    wUndertone: 0.45,
    wValue: 0.2,
    wChroma: 0.23,
    wContrast: 0.12,
    traitSummary: 'máxima calidez dorada con profundidad media y riqueza natural',
  },
  deep_autumn: {
    undertoneTarget: 0.45,
    valueTargetL: 28,
    chromaTargetC: 15,
    contrastTarget: 20,
    wUndertone: 0.28,
    wValue: 0.48,
    wChroma: 0.14,
    wContrast: 0.1,
    traitSummary: 'valor profundo y riqueza terrosa con subtono cálido-neutro',
  },
  deep_winter: {
    undertoneTarget: -0.45,
    valueTargetL: 27,
    chromaTargetC: 12,
    contrastTarget: 22,
    wUndertone: 0.28,
    wValue: 0.48,
    wChroma: 0.14,
    wContrast: 0.1,
    traitSummary: 'valor profundo y nitidez con base fría-neutra',
  },
  cool_winter: {
    undertoneTarget: -0.88,
    valueTargetL: 45,
    chromaTargetC: 20,
    contrastTarget: 46,
    wUndertone: 0.44,
    wValue: 0.18,
    wChroma: 0.18,
    wContrast: 0.2,
    traitSummary: 'subtono puramente frío con nitidez y alto contraste',
  },
  bright_winter: {
    undertoneTarget: -0.45,
    valueTargetL: 52,
    chromaTargetC: 26,
    contrastTarget: 58,
    wUndertone: 0.24,
    wValue: 0.12,
    wChroma: 0.3,
    wContrast: 0.34,
    traitSummary: 'contraste alto y croma brillante sobre base fría-neutra',
  },
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Extrae las 3 dimensiones de colorimetría (subtono, valor, croma) y contraste personal
 * desde las muestras de piel, cabello y ojos en espacio CIELAB (D65) (T8.4).
 */
export function analyzeColorDimensions(input: ColorSwatchesInput): ColorProfileDimensions {
  const skinLab = hexToLab(input.skinHex);
  const hairLab = hexToLab(input.hairHex);
  const eyeLab = hexToLab(input.eyeHex);

  // 1. Subtono [-1 frío .. +1 cálido]:
  // En piel humana, b* > a* indica presencia dorada/amarilla (cálido); a* alta relativa a b* indica rosado/frío.
  const skinWarmIndex = (skinLab.b - 1.35 * skinLab.a) / 14;
  const hairWarmIndex = (hairLab.b - 1.15 * hairLab.a) / 22;
  const eyeWarmIndex = (eyeLab.b - 0.8 * eyeLab.a) / 28;
  const undertoneScore = clamp(
    0.6 * skinWarmIndex + 0.25 * hairWarmIndex + 0.15 * eyeWarmIndex,
    -1,
    1,
  );

  let undertone: Undertone = 'neutral';
  if (undertoneScore >= 0.16) {
    undertone = 'warm';
  } else if (undertoneScore <= -0.16) {
    undertone = 'cool';
  }

  // 2. Valor (luminosidad L* ponderada) y contraste personal |L*_piel - L*_cabello|
  const valueScoreL = clamp(0.45 * skinLab.l + 0.4 * hairLab.l + 0.15 * eyeLab.l, 0, 100);
  const contrastDeltaL = Math.abs(skinLab.l - hairLab.l);

  let value: ValueLevel = 'medium';
  if (valueScoreL >= 66) {
    value = 'light';
  } else if (valueScoreL <= 43) {
    value = 'deep';
  }

  // 3. Croma efectivo (saturación C* de piel, cabello y ojos + aporte de claridad por contraste alto)
  const cSkin = labChroma(skinLab);
  const cHair = labChroma(hairLab);
  const cEye = labChroma(eyeLab);
  const contrastClarityBoost = Math.max(0, contrastDeltaL - 38) * 0.42;
  const chromaScoreC = 0.35 * cSkin + 0.35 * cHair + 0.3 * cEye + contrastClarityBoost;

  let chroma: ChromaLevel = 'medium';
  if (chromaScoreC >= 22 || contrastDeltaL >= 52) {
    chroma = 'bright';
  } else if (chromaScoreC <= 14.5 && contrastDeltaL < 34) {
    chroma = 'soft';
  }

  return {
    undertone,
    undertoneScore: round2(undertoneScore),
    value,
    valueScoreL: round2(valueScoreL),
    chroma,
    chromaScoreC: round2(chromaScoreC),
    contrastDeltaL: round2(contrastDeltaL),
    skinLab,
    hairLab,
    eyeLab,
  };
}

const UNDERTONE_ES: Readonly<Record<Undertone, string>> = {
  warm: 'cálido',
  neutral: 'neutro',
  cool: 'frío',
};

const VALUE_ES: Readonly<Record<ValueLevel, string>> = {
  light: 'claro',
  medium: 'medio',
  deep: 'profundo',
};

const CHROMA_ES: Readonly<Record<ChromaLevel, string>> = {
  soft: 'suave',
  medium: 'equilibrado',
  bright: 'brillante',
};

/**
 * Clasifica el perfil de color en las 12 estaciones, devolviendo el Top 2,
 * nivel de confianza según el margen entre ambas y explicación legible (T8.4 / T8.5).
 */
export function classifyColorProfile(input: ColorSwatchesInput): ColorProfileResult {
  const dimensions = analyzeColorDimensions(input);

  const ranked: SeasonCandidate[] = COLOR_SEASONS.map((seasonId) => {
    const proto = SEASON_PROTOTYPES[seasonId];
    const palette = SEASON_PALETTES[seasonId];

    const dUndertone = Math.abs(dimensions.undertoneScore - proto.undertoneTarget) / 1.1;
    const dValue = Math.abs(dimensions.valueScoreL - proto.valueTargetL) / 36;
    const dChroma = Math.abs(dimensions.chromaScoreC - proto.chromaTargetC) / 22;
    const dContrast = Math.abs(dimensions.contrastDeltaL - proto.contrastTarget) / 38;

    const weightedDist =
      proto.wUndertone * dUndertone +
      proto.wValue * dValue +
      proto.wChroma * dChroma +
      proto.wContrast * dContrast;

    // Penaliza incoherencias fuertes de temperatura o valor extremo (árbol de decisión 12 estaciones).
    let branchPenalty = 0;
    if (dimensions.undertone === 'warm' && palette.undertone === 'cool') {
      branchPenalty += 0.25 * Math.abs(dimensions.undertoneScore);
    } else if (dimensions.undertone === 'cool' && palette.undertone === 'warm') {
      branchPenalty += 0.25 * Math.abs(dimensions.undertoneScore);
    }
    if (dimensions.value === 'deep' && palette.value !== 'deep') {
      branchPenalty += palette.value === 'light' ? 0.55 : 0.28;
    } else if (dimensions.value === 'light' && palette.value === 'deep') {
      branchPenalty += 0.55;
    }

    const score = Math.exp(-(weightedDist + branchPenalty) * 1.45);
    return {
      seasonId,
      label: palette.label,
      score: round2(score),
      reason: `Encaja por ${proto.traitSummary}.`,
    };
  }).sort((a, b) => b.score - a.score);

  const primary = ranked[0]!;
  const secondary = ranked[1]!;

  // Margen relativo entre #1 y #2 -> confianza realista en [0.42..0.95]
  const margin = Math.max(0, primary.score - secondary.score);
  const confidence = round2(clamp(0.45 + margin * 2.4 + (primary.score - 0.5) * 0.25, 0.42, 0.95));

  const explanation =
    `Subtono ${UNDERTONE_ES[dimensions.undertone]} (${dimensions.undertoneScore >= 0 ? '+' : ''}${dimensions.undertoneScore.toFixed(2)}), ` +
    `valor ${VALUE_ES[dimensions.value]} (L* ${dimensions.valueScoreL.toFixed(0)}), ` +
    `croma ${CHROMA_ES[dimensions.chroma]} (C* ${dimensions.chromaScoreC.toFixed(1)}) ` +
    `y contraste personal de ${dimensions.contrastDeltaL.toFixed(0)} puntos L*.`;

  return {
    primary,
    secondary,
    confidence,
    dimensions,
    ranked,
    explanation,
  };
}
