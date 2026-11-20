// Archivo generado automáticamente desde services/api (/v1/openapi.json) vía `make api-client`.
// No editar manualmente.

export const OPENAPI_CONTRACT_VERSION = '0.5.0' as const;

export interface HealthResponse {
  readonly status: 'ok';
  readonly service: 'luca-api';
  readonly version: string;
  readonly vision_provider: string;
}

export interface LabColorSchema {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

export interface VisionAnalyzeResponse {
  readonly cutout_png_base64: string;
  readonly width: number;
  readonly height: number;
  readonly dominant_color_hex: string;
  readonly dominant_color_lab: LabColorSchema;
  readonly palette_hex: readonly string[];
  readonly coverage: number;
  readonly provider: string;
  readonly processing_ms: number;
}
