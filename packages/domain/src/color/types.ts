export const COLOR_SEASONS = [
  'bright_spring',
  'warm_spring',
  'light_spring',
  'light_summer',
  'cool_summer',
  'soft_summer',
  'soft_autumn',
  'warm_autumn',
  'deep_autumn',
  'deep_winter',
  'cool_winter',
  'bright_winter',
] as const;

export type ColorSeasonId = (typeof COLOR_SEASONS)[number];

export type SeasonFamily = 'spring' | 'summer' | 'autumn' | 'winter';
export type Undertone = 'warm' | 'neutral' | 'cool';
export type ValueLevel = 'light' | 'medium' | 'deep';
export type ChromaLevel = 'soft' | 'medium' | 'bright';
export type HarmonyBand = 'excellent' | 'good' | 'neutral' | 'clashing';
export type PaletteColorRole = 'neutral' | 'core' | 'accent';

export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface LabColor {
  /** Luminosidad L* [0..100] */
  readonly l: number;
  /** Eje verde (-) a rojo (+) */
  readonly a: number;
  /** Eje azul (-) a amarillo (+) */
  readonly b: number;
}

export interface PaletteColor {
  readonly name: string;
  readonly hex: string;
  readonly role: PaletteColorRole;
}

export interface SeasonPalette {
  readonly id: ColorSeasonId;
  readonly family: SeasonFamily;
  readonly label: string;
  readonly undertone: Undertone;
  readonly value: ValueLevel;
  readonly chroma: ChromaLevel;
  readonly summary: string;
  readonly bestMetals: readonly string[];
  readonly colors: readonly PaletteColor[];
}

export interface GuidedSwatchOption {
  readonly id: string;
  readonly label: string;
  readonly hex: string;
  readonly hint: string;
}

export interface ColorSwatchesInput {
  readonly skinHex: string;
  readonly hairHex: string;
  readonly eyeHex: string;
}

export interface ColorProfileDimensions {
  readonly undertone: Undertone;
  /** Puntuación continua [-1 frío .. +1 cálido] */
  readonly undertoneScore: number;
  readonly value: ValueLevel;
  /** Luminosidad ponderada L* [0..100] */
  readonly valueScoreL: number;
  readonly chroma: ChromaLevel;
  /** Croma efectivo C* combinado */
  readonly chromaScoreC: number;
  /** Contraste personal |L*_piel - L*_cabello| */
  readonly contrastDeltaL: number;
  readonly skinLab: LabColor;
  readonly hairLab: LabColor;
  readonly eyeLab: LabColor;
}

export interface SeasonCandidate {
  readonly seasonId: ColorSeasonId;
  readonly label: string;
  /** Puntuación de afinidad interna [0..1] */
  readonly score: number;
  readonly reason: string;
}

export interface ColorProfileResult {
  readonly primary: SeasonCandidate;
  readonly secondary: SeasonCandidate;
  /** Nivel de confianza [0.35..0.98] derivado del margen entre #1 y #2 */
  readonly confidence: number;
  readonly dimensions: ColorProfileDimensions;
  readonly ranked: readonly SeasonCandidate[];
  readonly explanation: string;
}

export interface GarmentColorHarmony {
  readonly seasonId: ColorSeasonId;
  readonly seasonLabel: string;
  readonly garmentHex: string;
  readonly garmentLab: LabColor;
  /** Fórmula sección 10.3: A = exp(-minDeltaE00 / 15) */
  readonly harmonyScore: number;
  readonly scorePercent: number;
  readonly minDeltaE00: number;
  readonly closestColor: PaletteColor;
  readonly band: HarmonyBand;
  readonly breakdown: {
    readonly deltaL: number;
    readonly deltaC: number;
    readonly closestName: string;
    readonly closestHex: string;
  };
  readonly reason: string;
}
