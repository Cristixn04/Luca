// Archivo generado automáticamente desde services/api (/v1/openapi.json) vía `make api-client`.
// No editar manualmente.

export const OPENAPI_CONTRACT_VERSION = '0.8.0' as const;

export interface HealthResponse {
  readonly status: 'ok';
  readonly service: 'luca-api';
  readonly version: string;
  readonly vision_provider: string;
  readonly tagger_provider: string;
  readonly weather_provider: string;
}

export interface WeatherSummary {
  readonly temperature_c: number;
  readonly apparent_temperature_c: number;
  readonly precipitation_probability: number;
  readonly condition: string;
  readonly rounded_lat: number;
  readonly rounded_lon: number;
  readonly cached: boolean;
  readonly provider: string;
}

export interface LabColorSchema {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

export type ApiGarmentCategory =
  | 'tshirt'
  | 'long_sleeve'
  | 'jacket'
  | 'pants'
  | 'shorts'
  | 'skirt'
  | 'dress';

export type ApiGarmentPattern =
  | 'solid'
  | 'striped'
  | 'plaid'
  | 'floral'
  | 'graphic'
  | 'textured'
  | 'other';

export type ApiGarmentStyle =
  | 'casual'
  | 'minimalist'
  | 'sporty'
  | 'formal'
  | 'streetwear'
  | 'classic'
  | 'bohemian';

export type ApiGarmentSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface GarmentTagSuggestion {
  readonly category: ApiGarmentCategory;
  readonly category_confidence: number;
  readonly pattern: ApiGarmentPattern;
  readonly pattern_confidence: number;
  readonly style: ApiGarmentStyle;
  readonly style_confidence: number;
  readonly formality: 1 | 2 | 3 | 4 | 5;
  readonly formality_confidence: number;
  readonly seasons: readonly ApiGarmentSeason[];
  readonly seasons_confidence: number;
  readonly suggested_tags: readonly string[];
  readonly overall_confidence: number;
  readonly provider: string;
}

export interface VisionAnalyzeResponse {
  readonly cutout_png_base64: string;
  readonly back_cutout_png_base64: string | null;
  readonly width: number;
  readonly height: number;
  readonly dominant_color_hex: string;
  readonly dominant_color_lab: LabColorSchema;
  readonly palette_hex: readonly string[];
  readonly coverage: number;
  readonly provider: string;
  readonly processing_ms: number;
  readonly tagging: GarmentTagSuggestion | null;
  readonly tagging_warning: string | null;
}
