export const FIT_STATES = ['tense', 'tight', 'regular', 'loose', 'oversize'] as const;
export type FitState = (typeof FIT_STATES)[number];

export const FIT_PREFERENCES = ['tight', 'regular', 'loose'] as const;
export type FitPreference = (typeof FIT_PREFERENCES)[number];

export const FIT_ZONES = ['chest', 'waist', 'hip', 'shoulders', 'back'] as const;
export type FitZone = (typeof FIT_ZONES)[number];

export const GARMENT_CATEGORIES = [
  'tshirt',
  'long_sleeve',
  'jacket',
  'pants',
  'shorts',
  'skirt',
  'dress',
] as const;
export type GarmentCategory = (typeof GARMENT_CATEGORIES)[number];

export type SemiOpenBand = readonly [minInclusive: number, maxExclusive: number];

export interface ZoneBandThresholds {
  readonly tight: SemiOpenBand;
  readonly regular: SemiOpenBand;
  readonly loose: SemiOpenBand;
  readonly oversizeMin: number;
}

export interface FitBandsConfig {
  readonly version: string;
  readonly defaultBands: Readonly<Record<FitZone, ZoneBandThresholds>>;
  readonly categoryOffsets: Readonly<
    Partial<Record<GarmentCategory, Readonly<Partial<Record<FitZone, number>>>>>
  >;
  readonly relevantZones: Readonly<Record<GarmentCategory, readonly FitZone[]>>;
}

export interface GarmentFlatMeasurements {
  /** Ancho de axila a axila en plano (cm). Perímetro = chestFlat × 2 */
  readonly chestFlat?: number;
  /** Ancho de cintura en plano (cm). Perímetro = waistFlat × 2 */
  readonly waistFlat?: number;
  /** Ancho de cadera en plano (cm). Perímetro = hipFlat × 2 */
  readonly hipFlat?: number;
  /** Ancho de hombros lineal (cm) */
  readonly shoulders?: number;
  /** Ancho de espalda lineal (cm) */
  readonly backWidth?: number;
  /** Largo total de la prenda (cm) */
  readonly length?: number;
  /** Entrepierna de la prenda (cm) */
  readonly inseam?: number;
}

export interface GarmentSizeInput {
  readonly category: GarmentCategory;
  readonly sizeLabel: string;
  /** Elasticidad de la tela como fracción [0, 0.35] (ej. 0.05 = 5 %) */
  readonly elasticity: number;
  readonly flatMeasuresCm: GarmentFlatMeasurements;
}

export interface ZoneFitResult {
  readonly zone: FitZone;
  readonly mode: 'circumference' | 'linear';
  readonly bodyMeasureCm: number;
  readonly garmentMeasureCm: number;
  /** Holgura cruda en cm: garmentMeasureCm - bodyMeasureCm */
  readonly easeCm: number;
  /** Alivio elástico en cm: garmentMeasureCm × elasticity */
  readonly elasticReliefCm: number;
  /** Holgura efectiva incluyendo elasticidad */
  readonly effectiveEaseCm: number;
  readonly state: FitState;
  /** true cuando easeCm < límite inferior de tight pero la elasticidad compensa */
  readonly elasticCompensated: boolean;
  /** true cuando la medida corporal usada fue estimada (ej. backWidth) */
  readonly bodyMeasureEstimated: boolean;
  readonly thresholds: ZoneBandThresholds;
}

export interface FitReport {
  readonly category: GarmentCategory;
  readonly sizeLabel: string;
  readonly relevantZones: readonly FitZone[];
  readonly evaluatedZones: readonly ZoneFitResult[];
  readonly missingZones: readonly FitZone[];
  readonly overallState: FitState;
  readonly hasTenseZone: boolean;
}

export interface SizeEvaluation {
  readonly sizeLabel: string;
  readonly report: FitReport;
  readonly targetDistanceCm: number;
  readonly penaltyScore: number;
  readonly inTargetBandCount: number;
  readonly reason: string;
}

export interface SizeRecommendation {
  readonly preference: FitPreference;
  readonly recommendedSize: string;
  readonly best: SizeEvaluation;
  readonly ranked: readonly SizeEvaluation[];
}
