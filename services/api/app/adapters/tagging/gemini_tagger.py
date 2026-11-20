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


TAGGING_PROMPT = (
    "Analiza la(s) foto(s) de esta prenda de vestir (primera imagen: frente; "
    "segunda imagen opcional: espalda) y clasifícala en JSON estricto.\n"
    "Reglas:\n"
    "- Usa exclusivamente las categorías permitidas: tshirt, long_sleeve, jacket, pants, shorts, skirt, dress.\n"
    "- Estima patrón (solid, striped, plaid, floral, graphic, textured, other), estilo "
    "(casual, minimalist, sporty, formal, streetwear, classic, bohemian), formalidad (1 a 5) "
    "y temporadas (spring, summer, autumn, winter).\n"
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
    ) -> None:
        if not api_key and client is None:
            raise ValueError("LUCA_LLM_API_KEY es obligatoria para usar GeminiVisionTagger.")
        self._model = model
        if client is not None:
            self._client = client
        else:
            from google import genai

            self._client = genai.Client(api_key=api_key)

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
            input=content_blocks,
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": _GeminiTagPayload.model_json_schema(),
            },
        )

        raw_text = interaction.output_text
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

    if chosen == "llm":
        api_key = os.getenv("LUCA_LLM_API_KEY", "").strip()
        model = os.getenv("LUCA_LLM_MODEL", DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL
        if not api_key:
            # Degradación elegante si LUCA_TAGGER_PROVIDER=llm pero aún no se configuró la clave.
            return DisabledTagger()
        return GeminiVisionTagger(api_key=api_key, model=model)

    return DisabledTagger()
