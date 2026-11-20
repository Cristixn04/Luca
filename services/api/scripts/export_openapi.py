"""Exporta el contrato OpenAPI v1 de Luca API hacia apps/web/src/infrastructure/api-client/."""

import json
from pathlib import Path

from app.main import create_app


def main() -> None:
    root = Path(__file__).resolve().parents[3]
    out_dir = root / "apps" / "web" / "src" / "infrastructure" / "api-client"
    out_dir.mkdir(parents=True, exist_ok=True)

    app = create_app()
    schema = app.openapi()

    openapi_path = out_dir / "openapi.v1.json"
    openapi_path.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    ts_lines = [
        "// Archivo generado automáticamente desde services/api (/v1/openapi.json) vía `make api-client`.",
        "// No editar manualmente.",
        "",
        f"export const OPENAPI_CONTRACT_VERSION = '{schema['info']['version']}' as const;",
        "",
        "export interface HealthResponse {",
        "  readonly status: 'ok';",
        "  readonly service: 'luca-api';",
        "  readonly version: string;",
        "  readonly vision_provider: string;",
        "  readonly tagger_provider: string;",
        "}",
        "",
        "export interface LabColorSchema {",
        "  readonly l: number;",
        "  readonly a: number;",
        "  readonly b: number;",
        "}",
        "",
        "export type ApiGarmentCategory =",
        "  | 'tshirt'",
        "  | 'long_sleeve'",
        "  | 'jacket'",
        "  | 'pants'",
        "  | 'shorts'",
        "  | 'skirt'",
        "  | 'dress';",
        "",
        "export type ApiGarmentPattern =",
        "  | 'solid'",
        "  | 'striped'",
        "  | 'plaid'",
        "  | 'floral'",
        "  | 'graphic'",
        "  | 'textured'",
        "  | 'other';",
        "",
        "export type ApiGarmentStyle =",
        "  | 'casual'",
        "  | 'minimalist'",
        "  | 'sporty'",
        "  | 'formal'",
        "  | 'streetwear'",
        "  | 'classic'",
        "  | 'bohemian';",
        "",
        "export type ApiGarmentSeason = 'spring' | 'summer' | 'autumn' | 'winter';",
        "",
        "export interface GarmentTagSuggestion {",
        "  readonly category: ApiGarmentCategory;",
        "  readonly category_confidence: number;",
        "  readonly pattern: ApiGarmentPattern;",
        "  readonly pattern_confidence: number;",
        "  readonly style: ApiGarmentStyle;",
        "  readonly style_confidence: number;",
        "  readonly formality: 1 | 2 | 3 | 4 | 5;",
        "  readonly formality_confidence: number;",
        "  readonly seasons: readonly ApiGarmentSeason[];",
        "  readonly seasons_confidence: number;",
        "  readonly suggested_tags: readonly string[];",
        "  readonly overall_confidence: number;",
        "  readonly provider: string;",
        "}",
        "",
        "export interface VisionAnalyzeResponse {",
        "  readonly cutout_png_base64: string;",
        "  readonly back_cutout_png_base64: string | null;",
        "  readonly width: number;",
        "  readonly height: number;",
        "  readonly dominant_color_hex: string;",
        "  readonly dominant_color_lab: LabColorSchema;",
        "  readonly palette_hex: readonly string[];",
        "  readonly coverage: number;",
        "  readonly provider: string;",
        "  readonly processing_ms: number;",
        "  readonly tagging: GarmentTagSuggestion | null;",
        "}",
        "",
    ]

    types_path = out_dir / "generated.types.ts"
    types_path.write_text("\n".join(ts_lines), encoding="utf-8")
    print(f"Contrato OpenAPI v1 y tipos generados en {out_dir}")


if __name__ == "__main__":
    main()
