import base64
import io
import os
from typing import Any

from PIL import Image
from pydantic import BaseModel, Field

from app.ports.tagging import (
    GarmentCategoryLiteral,
    GarmentPatternLiteral,
    GarmentSeasonLiteral,
    GarmentStyleLiteral,
    GarmentTagSuggestion,
    GarmentVisualSpec,
    Tagger,
)

DEFAULT_GEMINI_MODEL = "gemini-4-hydrogen"


class _GeminiTagPayload(BaseModel):
    """Esquema JSON estricto solicitado a Gemini (sin el campo interno provider)."""

    category: GarmentCategoryLiteral
    category_confidence: float = Field(..., ge=0.0, le=1.0)
    pattern: GarmentPatternLiteral
    pattern_confidence: float = Field(..., ge=0.0, le=1.0)
    style: GarmentStyleLiteral
    style_confidence: float = Field(..., ge=0.0, le=1.0)
    formality: int = Field(..., ge=1, le=5)
    formality_confidence: float = Field(..., ge=0.0, le=1.0)
    seasons: list[GarmentSeasonLiteral] = Field(..., min_length=1, max_length=4)
    seasons_confidence: float = Field(..., ge=0.0, le=1.0)
    suggested_tags: list[str] = Field(default_factory=list, max_length=8)
    overall_confidence: float = Field(..., ge=0.0, le=1.0)
    visual_spec: GarmentVisualSpec | None = None


SURGICAL_SYSTEM_INSTRUCTION = (
    "Eres un patronista técnico y analista de visión de moda de alta precisión para el probador "
    "digital Luca. Tu trabajo es inspeccionar quirúrgicamente cada fotografía de prenda (frente y "
    "espalda opcional) y devolver una clasificación semántica exacta junto con un plano visual "
    "estructural (`visual_spec`) que permita reconstruir la prenda fielmente sobre un maniquí.\n"
    "Directrices técnicas obligatorias:\n"
    "1. Examina silueta, escote/cuello exacto (crew, v_neck, scoop, turtleneck, polo, shirt_collar, "
    "hood, square, strapless o none en prendas inferiores), longitud real de manga (sleeveless, cap, "
    "short, three_quarter, long o none en prendas inferiores) y largo de la prenda (crop, waist, hip, "
    "thigh, knee, midi, maxi, ankle).\n"
    "2. Identifica corte y caída (skinny, fitted, regular, relaxed, oversized, wide_leg, flared, "
    "a_line, pleated), cierre (pullover, zipper, buttons, open_front, drawstring, belt) y bolsillos "
    "visibles (none, side, chest, kangaroo, cargo, patch).\n"
    "3. Marca con precisión detalles constructivos: has_hood (capucha), has_ribbed_trim (puños o "
    "cintura en rib/canalé), has_lapels (solapas de blazer/chaqueta), has_pleats (tablas o pliegues).\n"
    "4. Detecta color secundario y color de acento en formato HEX (#RRGGBB) únicamente si existen "
    "contrastes reales (puños, cuello, estampado, cierres o paneles); en caso contrario devuelve null.\n"
    "5. Identifica textura de tejido (smooth, denim, knit, ribbed, fleece, linen, leather, satin, "
    "corduroy) y ubicación de gráfico/logo (none, chest_center, chest_left, all_over, back).\n"
    "6. Responde únicamente con JSON válido acorde al esquema."
)


TAGGING_PROMPT = (
    "Analiza quirúrgicamente la(s) foto(s) de esta prenda de vestir (primera imagen: frente; "
    "segunda imagen opcional: espalda) y devuelve el JSON estricto completo incluyendo `visual_spec`.\n"
    "Reglas:\n"
    "- Usa exclusivamente las categorías permitidas: tshirt, long_sleeve, jacket, pants, shorts, skirt, dress.\n"
    "- Estima patrón (solid, striped, plaid, floral, graphic, textured, other), estilo "
    "(casual, minimalist, sporty, formal, streetwear, classic, bohemian), formalidad (1 a 5) "
    "y temporadas (spring, summer, autumn, winter).\n"
    "- Rellena todos los campos de `visual_spec` con exactitud según la prenda visible.\n"
    "- En suggested_tags devuelve hasta 6 etiquetas cortas en español en minúsculas "
    "(tela aparente, corte, cuello, detalle trasero si aparece en la segunda foto).\n"
    "- Devuelve valores de confianza realistas entre 0.0 y 1.0."
)


class DisabledTagger:
    """Adaptador nulo cuando LUCA_TAGGER_PROVIDER=none o falta API key."""

    @property
    def provider_name(self) -> str:
        return "none"

    def tag_garment(
        self,
        front_image_bytes: bytes,
        back_image_bytes: bytes | None = None,
    ) -> GarmentTagSuggestion | None:
        del front_image_bytes, back_image_bytes
        return None


class MockDeterministicTagger:
    """
    Adaptador determinista simulado para CI y pruebas unitarias.
    Nunca realiza llamadas de red ni consume cuota de APIs externas.
    """

    @property
    def provider_name(self) -> str:
        return "mock-deterministic"

    def tag_garment(
        self,
        front_image_bytes: bytes,
        back_image_bytes: bytes | None = None,
    ) -> GarmentTagSuggestion:
        with Image.open(io.BytesIO(front_image_bytes)) as img:
            width, height = img.size

        aspect = height / max(1, width)
        category: GarmentCategoryLiteral = "pants" if aspect >= 1.35 else "tshirt"
        tags = ["algodón", "básico"]
        if back_image_bytes is not None:
            tags.append("vista trasera")

        visual_spec = (
            GarmentVisualSpec(
                neckline="none",
                sleeve_length="none",
                garment_length="ankle",
                fit_cut="regular",
                closure="buttons",
                pockets="side",
                fabric_texture="smooth",
            )
            if category == "pants"
            else GarmentVisualSpec(
                neckline="crew",
                sleeve_length="short",
                garment_length="hip",
                fit_cut="regular",
                closure="pullover",
                pockets="none",
                fabric_texture="smooth",
            )
        )

        return GarmentTagSuggestion(
            category=category,
            category_confidence=0.86,
            pattern="solid",
            pattern_confidence=0.91,
            style="casual",
            style_confidence=0.84,
            formality=2,
            formality_confidence=0.82,
            seasons=["spring", "summer"],
            seasons_confidence=0.8,
            suggested_tags=tags,
            overall_confidence=0.85,
            visual_spec=visual_spec,
            provider=self.provider_name,
        )


class GeminiVisionTagger:
    """
    Adaptador de etiquetado con visión usando el SDK oficial `google-genai` (>= 3.2.0)
    vía Interactions API con `store=False` (sin retención en servidor) y salida JSON estructurada.
    """

    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_GEMINI_MODEL,
        client: Any | None = None,
        timeout_seconds: float = 12.0,
    ) -> None:
        if not api_key and client is None:
            raise ValueError("LUCA_LLM_API_KEY es obligatoria para usar GeminiVisionTagger.")
        self._model = model
        self._timeout_seconds = max(2.0, timeout_seconds)
        if client is not None:
            self._client = client
        else:
            from google import genai
            from google.genai import types

            self._client = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(timeout=int(self._timeout_seconds * 1000)),
            )

    @property
    def provider_name(self) -> str:
        return f"gemini:{self._model}"

    def tag_garment(
        self,
        front_image_bytes: bytes,
        back_image_bytes: bytes | None = None,
    ) -> GarmentTagSuggestion:
        front_b64 = base64.b64encode(front_image_bytes).decode("ascii")
        content_blocks: list[dict[str, str]] = [
            {"type": "text", "text": TAGGING_PROMPT},
            {"type": "image", "data": front_b64, "mime_type": "image/png"},
        ]

        if back_image_bytes:
            back_b64 = base64.b64encode(back_image_bytes).decode("ascii")
            content_blocks.append({"type": "image", "data": back_b64, "mime_type": "image/png"})

        interaction = self._client.interactions.create(
            model=self._model,
            store=False,
            system_instruction=SURGICAL_SYSTEM_INSTRUCTION,
            input=content_blocks,
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": _GeminiTagPayload.model_json_schema(),
            },
        )

        raw_text = getattr(interaction, "output_text", None)
        if not raw_text:
            outputs = getattr(interaction, "outputs", None) or []
            for block in outputs:
                text = getattr(block, "text", None)
                if isinstance(text, str) and text.strip():
                    raw_text = text
                    break
        if not raw_text:
            raise RuntimeError("Gemini no devolvió salida estructurada para el etiquetado.")

        parsed = _GeminiTagPayload.model_validate_json(raw_text)
        return GarmentTagSuggestion(
            **parsed.model_dump(),
            provider=self.provider_name,
        )


def build_tagger(provider: str | None = None) -> Tagger:
    chosen = (
        provider if provider is not None else os.getenv("LUCA_TAGGER_PROVIDER", "none")
    ).strip().lower()

    if chosen == "mock":
        return MockDeterministicTagger()

    if chosen in {"llm", "gemini"}:
        api_key = os.getenv("LUCA_LLM_API_KEY", "").strip()
        model = (
            os.getenv("LUCA_LLM_MODEL", "").strip()
            or os.getenv("LUCA_GEMINI_MODEL", "").strip()
            or DEFAULT_GEMINI_MODEL
        )
        timeout_raw = os.getenv("LUCA_LLM_TIMEOUT_SECONDS", "12.0").strip()
        try:
            timeout_seconds = float(timeout_raw)
        except ValueError:
            timeout_seconds = 12.0
        if not api_key:
            # Degradación elegante si LUCA_TAGGER_PROVIDER=llm pero aún no se configuró la clave.
            return DisabledTagger()
        return GeminiVisionTagger(
            api_key=api_key,
            model=model,
            timeout_seconds=timeout_seconds,
        )

    return DisabledTagger()
