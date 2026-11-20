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

export type ApiNeckline =
  | 'crew'
  | 'v_neck'
  | 'scoop'
  | 'turtleneck'
  | 'polo'
  | 'shirt_collar'
  | 'hood'
  | 'square'
  | 'strapless'
  | 'none';

export type ApiSleeveLength = 'sleeveless' | 'cap' | 'short' | 'three_quarter' | 'long' | 'none';

export type ApiGarmentLength =
  | 'crop'
  | 'waist'
  | 'hip'
  | 'thigh'
  | 'knee'
  | 'midi'
  | 'maxi'
  | 'ankle';

export type ApiFitCut =
  | 'skinny'
  | 'fitted'
  | 'regular'
  | 'relaxed'
  | 'oversized'
  | 'wide_leg'
  | 'flared'
  | 'a_line'
  | 'pleated';

export type ApiClosure = 'pullover' | 'zipper' | 'buttons' | 'open_front' | 'drawstring' | 'belt';

export type ApiPocketStyle = 'none' | 'side' | 'chest' | 'kangaroo' | 'cargo' | 'patch';

export type ApiGraphicPosition = 'none' | 'chest_center' | 'chest_left' | 'all_over' | 'back';

export type ApiFabricTexture =
  | 'smooth'
  | 'denim'
  | 'knit'
  | 'ribbed'
  | 'fleece'
  | 'linen'
  | 'leather'
  | 'satin'
  | 'corduroy';

export interface GarmentVisualSpec {
  readonly neckline: ApiNeckline;
  readonly sleeve_length: ApiSleeveLength;
  readonly garment_length: ApiGarmentLength;
  readonly fit_cut: ApiFitCut;
  readonly closure: ApiClosure;
  readonly pockets: ApiPocketStyle;
  readonly has_hood: boolean;
  readonly has_ribbed_trim: boolean;
  readonly has_lapels: boolean;
  readonly has_pleats: boolean;
  readonly secondary_color_hex?: string | null;
  readonly accent_color_hex?: string | null;
  readonly graphic_position: ApiGraphicPosition;
  readonly fabric_texture: ApiFabricTexture;
}

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
  readonly visual_spec?: GarmentVisualSpec | null;
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

export interface OutfitRenderResponse {
  readonly render_png_base64: string;
  readonly width: number;
  readonly height: number;
  readonly provider: string;
  readonly processing_ms: number;
}
