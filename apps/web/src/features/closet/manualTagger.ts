import type { GarmentCategory } from '@luca/domain';
import type { GarmentTagSuggestion } from '@/infrastructure/api-client/generated.types';
import type { FormalityLevel, GarmentPattern, GarmentSeason, GarmentStyle } from './types';

export type ColorFamily = 'neutro' | 'tierra' | 'azul' | 'verde' | 'calido' | 'violeta';

export const COLOR_FAMILY_LABELS: Readonly<Record<ColorFamily, string>> = {
  neutro: 'neutro',
  tierra: 'tierra',
  azul: 'azul',
  verde: 'verde',
  calido: 'cálido',
  violeta: 'violeta',
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

/**
 * Clasifica un color hexadecimal (#RRGGBB) en una familia cromática en español
 * para búsqueda local y similitud entre prendas sin depender de red.
 */
export function classifyColorFamilyHex(hex: string | undefined): ColorFamily {
  if (!hex) return 'neutro';
  const rgb = hexToRgb(hex);
  if (!rgb) return 'neutro';

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  if (saturation < 0.14 || lightness < 0.12 || lightness > 0.92) {
    return 'neutro';
  }

  let hue = 0;
  if (delta !== 0) {
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
  }

  if (hue >= 18 && hue <= 52 && saturation < 0.65 && lightness < 0.62) {
    return 'tierra';
  }
  if (hue >= 75 && hue < 175) {
    return 'verde';
  }
  if (hue >= 175 && hue < 255) {
    return 'azul';
  }
  if (hue >= 255 && hue < 325) {
    return 'violeta';
  }
  return 'calido';
}

export interface ManualTaggerInput {
  readonly category: GarmentCategory;
  readonly dominantColorHex?: string;
  readonly formality: FormalityLevel;
  readonly elasticity: number;
  readonly hasBackPhoto?: boolean;
}

const DEFAULT_SEASONS_BY_CATEGORY: Readonly<Record<GarmentCategory, readonly GarmentSeason[]>> = {
  tshirt: ['spring', 'summer'],
  shorts: ['spring', 'summer'],
  skirt: ['spring', 'summer'],
  dress: ['spring', 'summer'],
  pants: ['spring', 'autumn', 'winter'],
  long_sleeve: ['spring', 'autumn', 'winter'],
  jacket: ['autumn', 'winter'],
};

const CATEGORY_HINT_TAG: Readonly<Record<GarmentCategory, string>> = {
  tshirt: 'básico',
  long_sleeve: 'manga larga',
  jacket: 'abrigo',
  pants: 'pantalón',
  shorts: 'fresco',
  skirt: 'falda',
  dress: 'una pieza',
};

/**
 * Etiquetador local determinista (ManualTagger · T7.2) que funciona 100 % sin API
 * ni conexión, devolviendo sugerencias editables con su nivel de confianza.
 */
export function suggestManualTags(input: ManualTaggerInput): GarmentTagSuggestion {
  const family = classifyColorFamilyHex(input.dominantColorHex);
  const seasons = DEFAULT_SEASONS_BY_CATEGORY[input.category];

  let style: GarmentStyle = 'casual';
  if (input.formality >= 4) {
    style = 'formal';
  } else if (input.formality === 1) {
    style = 'sporty';
  } else if (family === 'neutro' || family === 'tierra') {
    style = 'minimalist';
  } else if (input.formality === 3) {
    style = 'classic';
  }

  const pattern: GarmentPattern = 'solid';
  const tags = new Set<string>([
    CATEGORY_HINT_TAG[input.category],
    COLOR_FAMILY_LABELS[family],
    input.elasticity >= 0.12 ? 'elástico' : 'tejido firme',
    input.formality >= 4 ? 'oficina' : input.formality === 1 ? 'deportivo' : 'diario',
  ]);

  if (seasons.includes('summer') && !seasons.includes('winter')) {
    tags.add('verano');
  } else if (seasons.includes('winter') && !seasons.includes('summer')) {
    tags.add('invierno');
  }
  if (input.hasBackPhoto) {
    tags.add('vista completa');
  }

  const boost = input.hasBackPhoto ? 0.04 : 0;

  return {
    category: input.category,
    category_confidence: Number((0.78 + boost).toFixed(2)),
    pattern,
    pattern_confidence: Number((0.62 + boost).toFixed(2)),
    style,
    style_confidence: Number((0.68 + boost).toFixed(2)),
    formality: input.formality,
    formality_confidence: Number((0.74 + boost).toFixed(2)),
    seasons,
    seasons_confidence: Number((0.72 + boost).toFixed(2)),
    suggested_tags: Array.from(tags).slice(0, 6),
    overall_confidence: Number((0.71 + boost).toFixed(2)),
    provider: 'manual-local',
  };
}
