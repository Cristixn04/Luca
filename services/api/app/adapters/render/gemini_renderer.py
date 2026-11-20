import base64
import io
import os
from collections import deque
from typing import Any

from PIL import Image, ImageDraw

from app.ports.render import (
    MannequinSilhouetteLiteral,
    OutfitRenderer,
    OutfitRenderGarmentInput,
    OutfitRenderResult,
)

DEFAULT_IMAGE_MODEL = "gemini-nano-banana-2.1"
MAX_RENDER_DIMENSION = 1024

RENDER_SYSTEM_INSTRUCTION = (
    "Eres el director de fotografía y patronista digital de un atelier de moda de lujo. "
    "Tu tarea es vestir un único maniquí de taller sin rostro en tono marfil-piedra mate "
    "(estatura completa de cabeza a pies, postura frontal simétrica neutra con brazos ligeramente "
    "separados del torso y pies planos) con las prendas exactas indicadas en las fotografías y "
    "especificaciones técnicas adjuntas.\n"
    "Reglas obligatorias:\n"
    "1. Respeta la silueta solicitada (femenina o masculina) y conserva la pose neutra frontal del "
    "maniquí de referencia si se proporciona.\n"
    "2. Reproduce con fidelidad quirúrgica cada prenda real: color, textura de tela, escote/cuello, "
    "largo de mangas, largo del bajo, caída, pliegues, cierres, botones, bolsillos, capucha y "
    "estampados exactos de las fotos de referencia.\n"
    "3. Ajusta las prendas de forma natural y anatómica sobre el maniquí sin cortar extremidades, "
    "sin duplicar prendas y sin superposiciones incoherentes.\n"
    "4. El fondo DEBE ser blanco puro uniforme (#FFFFFF) sin muebles, sin sombras duras de fondo, "
    "sin texto, sin marcas de agua y con margen limpio arriba y abajo para recorte transparente.\n"
    "5. Iluminación suave de estudio editorial con volumen realista de tela y costuras limpias."
)


def _detect_mime_type(raw_bytes: bytes) -> str:
    if raw_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if raw_bytes.startswith(b"RIFF") and raw_bytes[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _strip_studio_white_background(raw_bytes: bytes, tolerance: int = 24) -> tuple[bytes, int, int]:
    """
    Convierte el fondo blanco puro (#FFFFFF) conectado a los bordes del estudio en canal alfa
    transparente, preservando el cuerpo marfil cálido del maniquí (#E2DDD2) y los bordes suaves.
    """
    with Image.open(io.BytesIO(raw_bytes)) as img:
        rgba = img.convert("RGBA")
        if max(rgba.size) > MAX_RENDER_DIMENSION:
            rgba.thumbnail((MAX_RENDER_DIMENSION, MAX_RENDER_DIMENSION), Image.Resampling.LANCZOS)

        width, height = rgba.size
        pixels = bytearray(rgba.tobytes())

    total = width * height
    visited = bytearray(total)
    is_bg = bytearray(total)
    queue: deque[int] = deque()

    def _is_near_white(idx: int) -> bool:
        off = idx * 4
        r = pixels[off]
        g = pixels[off + 1]
        b = pixels[off + 2]
        a = pixels[off + 3]
        if a < 10:
            return True
        # Distancia máxima respecto a blanco puro (255,255,255) y baja saturación
        max_diff = max(255 - r, 255 - g, 255 - b)
        chroma = max(r, g, b) - min(r, g, b)
        return max_diff <= tolerance and chroma <= 18

    def _enqueue_if_white(x: int, y: int) -> None:
        idx = y * width + x
        if not visited[idx] and _is_near_white(idx):
            visited[idx] = 1
            is_bg[idx] = 1
            queue.append(idx)

    for x in range(width):
        _enqueue_if_white(x, 0)
        _enqueue_if_white(x, height - 1)
    for y in range(1, height - 1):
        _enqueue_if_white(0, y)
        _enqueue_if_white(width - 1, y)

    while queue:
        idx = queue.popleft()
        x = idx % width
        y = idx // width

        if x > 0:
            ni = idx - 1
            if not visited[ni] and _is_near_white(ni):
                visited[ni] = 1
                is_bg[ni] = 1
                queue.append(ni)
        if x + 1 < width:
            ni = idx + 1
            if not visited[ni] and _is_near_white(ni):
                visited[ni] = 1
                is_bg[ni] = 1
                queue.append(ni)
        if y > 0:
            ni = idx - width
            if not visited[ni] and _is_near_white(ni):
                visited[ni] = 1
                is_bg[ni] = 1
                queue.append(ni)
        if y + 1 < height:
            ni = idx + width
            if not visited[ni] and _is_near_white(ni):
                visited[ni] = 1
                is_bg[ni] = 1
                queue.append(ni)

    # Limpia píxeles de fondo y suaviza 1px de borde anti-aliased cercano al blanco
    for idx in range(total):
        off = idx * 4
        if is_bg[idx]:
            pixels[off + 3] = 0
            continue
        x = idx % width
        y = idx // width
        touches_bg = (
            (x > 0 and is_bg[idx - 1])
            or (x + 1 < width and is_bg[idx + 1])
            or (y > 0 and is_bg[idx - width])
            or (y + 1 < height and is_bg[idx + width])
        )
        if touches_bg:
            r = pixels[off]
            g = pixels[off + 1]
            b = pixels[off + 2]
            luma = (r + g + b) / 3.0
            if luma > 235:
                pixels[off + 3] = int(pixels[off + 3] * 0.35)
            elif luma > 218:
                pixels[off + 3] = int(pixels[off + 3] * 0.72)

    out_img = Image.frombytes("RGBA", (width, height), bytes(pixels))
    buf = io.BytesIO()
    out_img.save(buf, format="PNG", optimize=True)
    return buf.getvalue(), width, height


def _build_render_prompt(
    silhouette: MannequinSilhouetteLiteral,
    garments: list[OutfitRenderGarmentInput],
    has_mannequin_ref: bool,
) -> str:
    body_label = (
        "maniquí femenino de atelier (hombros gráciles, cintura definida, caderas naturales)"
        if silhouette == "female"
        else "maniquí masculino de atelier (hombros rectos estructurados, torso atlético)"
    )
    lines = [
        (
            f"Genera una fotografía editorial frontal de cuerpo completo de un {body_label}, "
            "sin rostro, en tono marfil-piedra mate, sobre fondo blanco puro #FFFFFF."
        ),
    ]
    if has_mannequin_ref:
        lines.append(
            "La primera imagen adjunta es la silueta y pose exacta del maniquí base a conservar."
        )
    lines.append("Viste el maniquí exactamente con el siguiente conjunto:")
    for idx, g in enumerate(garments, start=1):
        parts = [f"{idx}. {g.name} (categoría: {g.category})"]
        if g.color_hex:
            parts.append(f"color principal {g.color_hex}")
        if g.fit_summary:
            parts.append(f"calce: {g.fit_summary}")
        if g.visual_spec_summary:
            parts.append(f"patronaje: {g.visual_spec_summary}")
        if g.image_bytes is not None:
            parts.append("usar la foto de referencia adjunta con fidelidad exacta")
        lines.append(" - " + "; ".join(parts) + ".")
    lines.append(
        "Asegura cuerpo completo de cabeza a pies sin recortes, fondo #FFFFFF limpio y sin texto."
    )
    return "\n".join(lines)


class DisabledOutfitRenderer:
    """Adaptador nulo cuando el renderizado IA está desactivado o falta API key."""

    @property
    def provider_name(self) -> str:
        return "none"

    def render_outfit(
        self,
        *,
        silhouette: MannequinSilhouetteLiteral,
        garments: list[OutfitRenderGarmentInput],
        mannequin_reference_bytes: bytes | None = None,
    ) -> OutfitRenderResult | None:
        del silhouette, garments, mannequin_reference_bytes
        return None


class MockOutfitRenderer:
    """Adaptador determinista local para pruebas y CI sin llamadas de red."""

    @property
    def provider_name(self) -> str:
        return "mock-outfit-renderer"

    def render_outfit(
        self,
        *,
        silhouette: MannequinSilhouetteLiteral,
        garments: list[OutfitRenderGarmentInput],
        mannequin_reference_bytes: bytes | None = None,
    ) -> OutfitRenderResult:
        del mannequin_reference_bytes
        width, height = 240, 360
        img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Silueta estilizada simple de atelier para verificar flujo RGBA transparente en pruebas
        skin = (224, 219, 209, 255)
        draw.ellipse((96, 18, 144, 68), fill=skin, outline=(120, 114, 105, 255), width=2)
        torso_half = 34 if silhouette == "female" else 42
        top_color = (42, 157, 143, 255)
        bottom_color = (38, 70, 83, 255)
        if garments:
            first_hex = garments[0].color_hex or ""
            if len(first_hex) == 7 and first_hex.startswith("#"):
                top_color = (
                    int(first_hex[1:3], 16),
                    int(first_hex[3:5], 16),
                    int(first_hex[5:7], 16),
                    255,
                )

        draw.rounded_rectangle(
            (120 - torso_half, 78, 120 + torso_half, 188),
            radius=12,
            fill=top_color,
        )
        draw.rounded_rectangle((84, 186, 116, 336), radius=10, fill=bottom_color)
        draw.rounded_rectangle((124, 186, 156, 336), radius=10, fill=bottom_color)

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return OutfitRenderResult(
            image_png_bytes=buf.getvalue(),
            width=width,
            height=height,
            provider=self.provider_name,
        )


class GeminiMannequinRenderer:
    """
    Adaptador de renderizado fotorrealista sobre maniquí con `gemini-nano-banana-2.1`
    vía SDK oficial `google-genai` Interactions API (`store=False`).
    """

    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_IMAGE_MODEL,
        client: Any | None = None,
        timeout_seconds: float = 42.0,
    ) -> None:
        if not api_key and client is None:
            raise ValueError("LUCA_LLM_API_KEY es obligatoria para GeminiMannequinRenderer.")
        self._model = model
        self._timeout_seconds = max(5.0, timeout_seconds)
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

    def render_outfit(
        self,
        *,
        silhouette: MannequinSilhouetteLiteral,
        garments: list[OutfitRenderGarmentInput],
        mannequin_reference_bytes: bytes | None = None,
    ) -> OutfitRenderResult:
        prompt = _build_render_prompt(
            silhouette=silhouette,
            garments=garments,
            has_mannequin_ref=mannequin_reference_bytes is not None,
        )
        content_blocks: list[dict[str, str]] = [{"type": "text", "text": prompt}]

        if mannequin_reference_bytes:
            content_blocks.append(
                {
                    "type": "image",
                    "data": base64.b64encode(mannequin_reference_bytes).decode("ascii"),
                    "mime_type": _detect_mime_type(mannequin_reference_bytes),
                }
            )

        for garment in garments[:4]:
            if garment.image_bytes:
                content_blocks.append(
                    {
                        "type": "image",
                        "data": base64.b64encode(garment.image_bytes).decode("ascii"),
                        "mime_type": _detect_mime_type(garment.image_bytes),
                    }
                )

        interaction = self._client.interactions.create(
            model=self._model,
            store=False,
            system_instruction=RENDER_SYSTEM_INSTRUCTION,
            input=content_blocks,
            response_format={
                "type": "image",
                "aspect_ratio": "2:3",
                "image_size": "1K",
                "mime_type": "image/jpeg",
            },
        )

        image_b64: str | None = None
        output_image = getattr(interaction, "output_image", None)
        if output_image is not None:
            candidate = getattr(output_image, "data", None)
            if isinstance(candidate, str) and candidate.strip():
                image_b64 = candidate

        if not image_b64:
            outputs = getattr(interaction, "outputs", None) or []
            for block in outputs:
                block_type = getattr(block, "type", None)
                candidate = getattr(block, "data", None)
                if block_type == "image" and isinstance(candidate, str) and candidate.strip():
                    image_b64 = candidate
                    break

        if not image_b64:
            raise RuntimeError("Gemini no devolvió ninguna imagen para el render del outfit.")

        raw_generated = base64.b64decode(image_b64)
        transparent_png, width, height = _strip_studio_white_background(raw_generated)

        return OutfitRenderResult(
            image_png_bytes=transparent_png,
            width=width,
            height=height,
            provider=self.provider_name,
        )


def build_outfit_renderer(provider: str | None = None) -> OutfitRenderer:
    raw_provider = (
        provider if provider is not None else os.getenv("LUCA_RENDER_PROVIDER", "")
    ).strip().lower()

    if raw_provider == "mock":
        return MockOutfitRenderer()
    if raw_provider == "none":
        return DisabledOutfitRenderer()

    api_key = os.getenv("LUCA_LLM_API_KEY", "").strip()
    if raw_provider in {"gemini", "llm", ""}:
        if not api_key:
            return DisabledOutfitRenderer()
        model = os.getenv("LUCA_IMAGE_MODEL", "").strip() or DEFAULT_IMAGE_MODEL
        timeout_raw = os.getenv("LUCA_RENDER_TIMEOUT_SECONDS", "42.0").strip()
        try:
            timeout_seconds = float(timeout_raw)
        except ValueError:
            timeout_seconds = 42.0
        return GeminiMannequinRenderer(
            api_key=api_key,
            model=model,
            timeout_seconds=timeout_seconds,
        )

    return DisabledOutfitRenderer()
