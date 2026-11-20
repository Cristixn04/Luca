export const TASTE_FEATURE_CATEGORIES = [
  'color_family',
  'category',
  'formality',
  'pattern',
  'fit_band',
] as const;

export type TasteFeatureCategory = (typeof TASTE_FEATURE_CATEGORIES)[number];

export type TasteSignalType =
  | 'wear_logged'
  | 'outfit_liked'
  | 'outfit_saved'
  | 'outfit_dismissed'
  | 'outfit_disliked';

export type TasteExplicitRule = 'pinned' | 'vetoed';

export interface TasteFeatureKey {
  readonly category: TasteFeatureCategory;
  readonly value: string;
}

export interface TasteInteractionSignal {
  readonly id: string;
  readonly type: TasteSignalType;
  readonly at: string;
  readonly features: readonly TasteFeatureKey[];
}

export interface TasteSnapshotAggregate {
  readonly month: string;
  readonly eventCount: number;
  /** Clave serializada `${category}:${value}` -> acumulado positivo y negativo */
  readonly featurePosNeg: Readonly<Record<string, { readonly pos: number; readonly neg: number; readonly count: number }>>;
}

export interface TasteExplicitOverrides {
  /** Clave serializada `${category}:${value}` -> 'pinned' | 'vetoed' */
  readonly rules: Readonly<Record<string, TasteExplicitRule>>;
}

export interface TasteFeatureAffinity {
  readonly key: string;
  readonly category: TasteFeatureCategory;
  readonly value: string;
  /** Afinidad en [0, 1] (0.5 = neutro; 1.0 si pinned; 0.0 si vetoed) */
  readonly affinity: number;
  readonly positiveWeight: number;
  readonly negativeWeight: number;
  readonly supportingEvents: number;
  readonly explicitRule?: TasteExplicitRule;
}

export interface TasteProfile {
  readonly totalScoringEvents: number;
  readonly coldStartThreshold: number;
  readonly isColdStart: boolean;
  readonly hasExplicitRules: boolean;
  /** true cuando el componente Gusto debe influir en los outfits (>= 10 eventos o reglas explícitas) */
  readonly activeInScoring: boolean;
  readonly affinitiesByKey: Readonly<Record<string, TasteFeatureAffinity>>;
  readonly rankedAffinities: readonly TasteFeatureAffinity[];
}

export const TASTE_EVENT_VALUES: Readonly<Record<TasteSignalType, number>> = {
  wear_logged: 1.5,
  outfit_liked: 1,
  outfit_saved: 1,
  outfit_dismissed: -0.5,
  outfit_disliked: -1,
};

export const TASTE_COLD_START_THRESHOLD = 10;
export const TASTE_HALF_LIFE_DAYS = 90;

export function serializeTasteKey(category: TasteFeatureCategory, value: string): string {
  return `${category}:${value.trim().toLowerCase()}`;
}
