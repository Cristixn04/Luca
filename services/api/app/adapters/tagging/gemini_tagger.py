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

# Modelos verificados en cuota estándar/gratuita con baja latencia (~1-2s) y visión multimodal completa
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"
FALLBACK_VISION_MODELS: tuple[str, ...] = (
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
)

CATEGORY_DESCRIPTIONS_ES: dict[GarmentCategoryLiteral, str] = {
    "tshirt": "Camiseta de manga corta o sin mangas (parte superior ligera)",
    "long_sleeve": "Camisa de manga larga, buzo, suéter o sudadera (parte superior manga larga)",
    "jacket": "Chaqueta, blazer, abrigo, cárdigan o sobrecamisa (capa exterior)",
    "pants": "Pantalón largo, jean o chino (prenda inferior larga)",
    "shorts": "Short o bermuda (prenda inferior corta)",
    "skirt": "Falda corta, midi o larga (prenda inferior tipo falda)",
    "dress": "Vestido de una sola pieza (cubre torso y piernas)",
}


class _GeminiTagPayload(BaseModel):
    """Esquema JSON estricto solicitado al agente de gemelo digital en Gemini."""

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
    suggested_name: str | None = Field(default=None, max_length=120)
    estimated_elasticity: float | None = Field(default=None, ge=0.0, le=0.25)
    design_supported: bool = True
    rejection_reason: str | None = None
    visual_spec: GarmentVisualSpec | None = None


SURGICAL_SYSTEM_INSTRUCTION = (
    "Eres el Patronista Digital Jefe y Agente de Visión de Luca. Tu misión es analizar "
    "quirúrgicamente una fotografía de referencia y sintetizar el plano exacto (`visual_spec`) "
    "para reconstruir una versión digital IDÉNTICA de la prenda sobre un avatar humano 2D.\n\n"
    "REGLAS CRÍTICAS E INQUEBRANTABLES:\n"
    "1. AISLAMIENTO ESTRICTO POR CATEGORÍA OBJETIVO: Si el usuario indica una categoría objetivo "
    "(ej. 'jacket', 'tshirt', 'pants', 'skirt', 'dress', 'shorts', 'long_sleeve') y en la foto "
    "aparecen varias prendas (por ejemplo, una persona vestida con camisa y pantalón), IGNORA POR "
    "COMPLETO las demás prendas y el fondo. Extrae el color, patronaje y detalles EXCLUSIVAMENTE de "
    "la prenda que corresponde a la categoría objetivo y devuelve `category` igual a esa categoría.\n"
    "2. FILTRO ESTRICTO DE DISEÑOS SENCILLOS (ADMISIÓN):\n"
    "   - ADMITIDOS (`design_supported=true`): colores sólidos/lisos, bloques de color simples "
    "(mangas raglán, división superior/inferior, franja en pecho, paneles laterales), rayas "
    "horizontales o verticales, cuadros/vichy/tartán sencillos, lunares simples, y texturas "
    "limpias (algodón, denim, lino, punto, canalé/ribbed, cuero, pana, felpa/hoodie).\n"
    "   - RECHAZADOS (`design_supported=false`, `design_complexity='complex_rejected'`): estampados "
    "fotográficos, ilustraciones complejas o personajes, flores/botánica densa, animal print "
    "complejo, camuflaje, tie-dye, psicodélicos o gráficos elaborados que cubren la prenda y no "
    "pueden replicarse con fidelidad en diseño digital limpio. En ese caso, redacta un "
    "`rejection_reason` claro y amable en español explicando qué patrón complejo detectaste y "
    "sugiriendo subir una prenda lisa o de estampado simple (rayas, cuadros, bloques o lunares).\n"
    "3. FIDELIDAD QUIRÚRGICA DE COLOR:\n"
    "   - Calcula `visual_spec.primary_color_hex` muestreando el color REAL iluminado de la tela de "
    "la prenda objetivo (ignora sombras extremas, piel, fondo y otras prendas). Formato `#RRGGBB`.\n"
    "   - Calcula `secondary_color_hex` si existen rayas, cuadros, bloques de color, mangas "
    "contrastantes o lunares; y `accent_color_hex` si el cuello, puños, botones, cierre o "
    "bolsillos tienen color contrastante.\n"
    "4. PATRONAJE EXACTO:\n"
    "   - Escote/cuello: crew, v_neck, scoop, turtleneck, polo, shirt_collar, hood, square, "
    "strapless, o none (en inferiores).\n"
    "   - Mangas: sleeveless, cap, short, three_quarter, long, o none (en inferiores).\n"
    "   - Largo real: crop, waist, hip, thigh, knee, midi, maxi, ankle.\n"
    "   - Corte y caída: skinny, fitted, regular, relaxed, oversized, wide_leg, flared, a_line, pleated.\n"
    "   - Cierre y botones: pullover, zipper, buttons, open_front, drawstring, belt + `button_count` (0..12).\n"
    "   - Bolsillos: none, side, chest, kangaroo, cargo, patch.\n"
    "   - Detalles: `has_hood`, `has_ribbed_trim`, `has_lapels`, `has_pleats`, `collar_contrast`, "
    "`cuff_contrast`, `waist_rise` (low, mid, high, none), `pattern_type` (solid, "
    "horizontal_stripes, vertical_stripes, plaid, dots, colorblock, ribbed), `colorblock_layout` "
    "(none, raglan_sleeves, top_bottom_split, chest_band, side_panels) y `stripe_density` (fine, medium, wide).\n"
    "5. METADATOS ÚTILES: Sugiere `suggested_name` corto y descriptivo en español (ej. 'Camiseta "
    "rayas azul marino', 'Chaqueta bomber verde oliva'), `estimated_elasticity` realista (0.00 a 0.20), "
    "`style` y `formality` (1 a 5).\n"
    "6. Responde ÚNICAMENTE con JSON válido acorde al esquema."
)


def _detect_mime_type(raw_bytes: bytes) -> str:
    if raw_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if raw_bytes.startswith(b"RIFF") and raw_bytes[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _build_tagging_prompt(target_category: GarmentCategoryLiteral | None) -> str:
    if target_category is not None:
        cat_desc = CATEGORY_DESCRIPTIONS_ES[target_category]
        target_clause = (
            f"CATEGORÍA OBJETIVO SELECCIONADA POR EL USUARIO: `{target_category}` ({cat_desc}).\n"
            f"Analiza EXCLUSIVAMENTE la prenda de categoría `{target_category}` visible en la foto "
            "e ignora cualquier otra prenda secundaria o persona que aparezca en la imagen. "
            f"El campo `category` en tu respuesta DEBE ser `{target_category}`.\n"
        )
    else:
        target_clause = (
            "Identifica la prenda principal de la fotografía entre las categorías permitidas: "
            "tshirt, long_sleeve, jacket, pants, shorts, skirt, dress.\n"
        )

    return (
        f"{target_clause}"
        "Evalúa primero si el diseño de la prenda objetivo es sencillo (color sólido, bloques de "
        "color, rayas, cuadros simples, lunares simples o textura limpia). Si tiene un estampado "
        "complejo (ilustración, foto impresa, floral denso, camuflaje, gráfico intrincado), marca "
        "`design_supported=false` tanto en la raíz como en `visual_spec` y explica por qué en "
        "`rejection_reason`.\n"
        "Rellena TODOS los campos de `visual_spec` con máxima precisión cromática y estructural "
        "(especialmente `primary_color_hex`, `secondary_color_hex`, `pattern_type`, "
        "`colorblock_layout`, `neckline`, `sleeve_length`, `garment_length`, `fit_cut`, "
        "`closure`, `button_count`, `pockets`, `has_hood`, `has_ribbed_trim`, `has_lapels`, "
        "`has_pleats`, `collar_contrast`, `cuff_contrast`, `waist_rise` y `fabric_texture`)."
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
        target_category: GarmentCategoryLiteral | None = None,
    ) -> GarmentTagSuggestion | None:
        del front_image_bytes, back_image_bytes, target_category
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
        target_category: GarmentCategoryLiteral | None = None,
    ) -> GarmentTagSuggestion:
        with Image.open(io.BytesIO(front_image_bytes)) as img:
            width, height = img.size

        aspect = height / max(1, width)
        category: GarmentCategoryLiteral = (
            target_category if target_category is not None else ("pants" if aspect >= 1.35 else "tshirt")
        )
        tags = ["algodón", "básico"]
        if back_image_bytes is not None:
            tags.append("vista trasera")

        is_lower = category in {"pants", "shorts", "skirt"}
        visual_spec = (
            GarmentVisualSpec(
                design_supported=True,
                design_complexity="solid",
                pattern_type="solid",
                neckline="none",
                sleeve_length="none",
                garment_length="ankle" if category == "pants" else "knee",
                fit_cut="regular",
                closure="buttons",
                pockets="side",
                waist_rise="mid",
                fabric_texture="smooth",
            )
            if is_lower
            else GarmentVisualSpec(
                design_supported=True,
                design_complexity="solid",
                pattern_type="solid",
                neckline="crew",
                sleeve_length="long" if category in {"long_sleeve", "jacket"} else "short",
                garment_length="midi" if category == "dress" else "hip",
                fit_cut="regular",
                closure="zipper" if category == "jacket" else "pullover",
                pockets="side" if category == "jacket" else "none",
                has_lapels=category == "jacket",
                fabric_texture="smooth",
            )
        )

        return GarmentTagSuggestion(
            category=category,
            category_confidence=0.92,
            pattern="solid",
            pattern_confidence=0.91,
            style="casual",
            style_confidence=0.86,
            formality=2,
            formality_confidence=0.84,
            seasons=["spring", "summer"],
            seasons_confidence=0.82,
            suggested_tags=tags,
            overall_confidence=0.88,
            suggested_name="Prenda básica digital",
            estimated_elasticity=0.05,
            design_supported=True,
            visual_spec=visual_spec,
            provider=self.provider_name,
        )


class GeminiVisionTagger:
    """
    Agente de visión quirúrgica y gemelo digital usando el SDK oficial `google-genai` (>= 3.2.0)
    vía Interactions API con `store=False` y fallback automático entre modelos disponibles.
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
        self._timeout_seconds = max(3.0, timeout_seconds)
        self._custom_client = client is not None
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

    def _candidate_models(self) -> list[str]:
        if self._custom_client:
            return [self._model]
        ordered = [self._model, *FALLBACK_VISION_MODELS]
        deduped: list[str] = []
        for candidate in ordered:
            if candidate and candidate not in deduped:
                deduped.append(candidate)
        return deduped

    def tag_garment(
        self,
        front_image_bytes: bytes,
        back_image_bytes: bytes | None = None,
        target_category: GarmentCategoryLiteral | None = None,
    ) -> GarmentTagSuggestion:
        front_b64 = base64.b64encode(front_image_bytes).decode("ascii")
        content_blocks: list[dict[str, str]] = [
            {"type": "text", "text": _build_tagging_prompt(target_category)},
            {"type": "image", "data": front_b64, "mime_type": _detect_mime_type(front_image_bytes)},
        ]

        if back_image_bytes:
            back_b64 = base64.b64encode(back_image_bytes).decode("ascii")
            content_blocks.append(
                {"type": "image", "data": back_b64, "mime_type": _detect_mime_type(back_image_bytes)}
            )

        last_error: Exception | None = None
        for model_name in self._candidate_models():
            try:
                interaction = self._client.interactions.create(
                    model=model_name,
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
                payload_dict = parsed.model_dump()

                # Sincroniza category y design_supported entre raíz y visual_spec
                if target_category is not None:
                    payload_dict["category"] = target_category
                spec = payload_dict.get("visual_spec")
                if isinstance(spec, dict):
                    supported = bool(payload_dict.get("design_supported", True)) and bool(
                        spec.get("design_supported", True)
                    )
                    reason = payload_dict.get("rejection_reason") or spec.get("rejection_reason")
                    payload_dict["design_supported"] = supported
                    payload_dict["rejection_reason"] = reason
                    spec["design_supported"] = supported
                    spec["rejection_reason"] = reason

                return GarmentTagSuggestion(
                    **payload_dict,
                    provider=f"gemini:{model_name}",
                )
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                continue

        raise RuntimeError(f"Ningún modelo Gemini de visión respondió: {last_error}") from last_error


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
            return DisabledTagger()
        return GeminiVisionTagger(
            api_key=api_key,
            model=model,
            timeout_seconds=timeout_seconds,
        )

    return DisabledTagger()
