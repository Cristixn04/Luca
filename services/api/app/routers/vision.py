import asyncio
import base64
import io
import os
import time
from typing import Annotated

from fastapi import (
    APIRouter,
    File,
    Form,
    Header,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

from app.adapters.vision.dominant_color import extract_dominant_color
from app.ports.tagging import GarmentTagSuggestion, Tagger
from app.ports.vision import BackgroundRemover
from app.security.controls import DailyBudgetGuard, InMemoryRateLimiter, validate_install_token

ALLOWED_IMAGE_FORMATS = frozenset({"JPEG", "PNG", "WEBP"})
DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MiB
DEFAULT_VISION_TIMEOUT_SECONDS = 15.0
DEFAULT_TAGGING_TIMEOUT_SECONDS = 12.0
VISION_CALL_COST_USD = 0.002
TAGGING_CALL_COST_USD = 0.008

# Protección contra decompression bombs (Pillow)
Image.MAX_IMAGE_PIXELS = 25_000_000


class LabColorSchema(BaseModel):
    l: float = Field(..., description="Luminosidad CIELAB L* (0..100)")
    a: float = Field(..., description="Eje verde-rojo CIELAB a*")
    b: float = Field(..., description="Eje azul-amarillo CIELAB b*")


class VisionAnalyzeResponse(BaseModel):
    cutout_png_base64: str = Field(..., description="Imagen PNG RGBA frontal recortada en Base64")
    back_cutout_png_base64: str | None = Field(
        default=None,
        description="Imagen PNG RGBA trasera recortada en Base64 (si se envió foto de espalda)",
    )
    width: int = Field(..., ge=1)
    height: int = Field(..., ge=1)
    dominant_color_hex: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")
    dominant_color_lab: LabColorSchema
    palette_hex: list[str]
    coverage: float = Field(..., ge=0.0, le=1.0)
    provider: str
    processing_ms: int = Field(..., ge=0)
    tagging: GarmentTagSuggestion | None = Field(
        default=None,
        description="Etiquetas sugeridas con confianza por el puerto Tagger (si include_tags=true)",
    )
    tagging_warning: str | None = Field(
        default=None,
        description="Aviso no bloqueante si el proveedor de etiquetado IA no respondió a tiempo",
    )


def _validate_and_read_image(raw_bytes: bytes, max_bytes: int) -> tuple[int, int]:
    if len(raw_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo de imagen está vacío.",
        )

    if len(raw_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"La imagen supera el límite máximo permitido ({max_bytes // (1024 * 1024)} MB).",
        )

    try:
        with Image.open(io.BytesIO(raw_bytes)) as probe:
            img_format = (probe.format or "").upper()
            width, height = probe.size
            probe.verify()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="El archivo no es una imagen válida o supera el límite de píxeles.",
        ) from exc

    if img_format not in ALLOWED_IMAGE_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Formato no permitido ({img_format or 'desconocido'}). Usa JPEG, PNG o WEBP.",
        )

    return width, height


def create_vision_router(
    remover: BackgroundRemover,
    tagger: Tagger,
    rate_limiter: InMemoryRateLimiter,
    budget_guard: DailyBudgetGuard,
    max_upload_bytes: int | None = None,
    timeout_seconds: float | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/v1/vision", tags=["vision"])

    effective_max_bytes = (
        max_upload_bytes
        if max_upload_bytes is not None
        else int(os.getenv("LUCA_MAX_UPLOAD_BYTES", str(DEFAULT_MAX_UPLOAD_BYTES)))
    )
    effective_timeout = (
        timeout_seconds
        if timeout_seconds is not None
        else float(os.getenv("LUCA_VISION_TIMEOUT_SECONDS", str(DEFAULT_VISION_TIMEOUT_SECONDS)))
    )

    @router.post(
        "/analyze",
        response_model=VisionAnalyzeResponse,
        summary="Recorta fondo, extrae color dominante CIELAB y opcionalmente etiqueta la prenda",
    )
    async def analyze_garment_photo(
        request: Request,
        response: Response,
        file: Annotated[UploadFile, File(description="Foto frontal reducida de la prenda sin EXIF")],
        back_file: Annotated[
            UploadFile | None,
            File(description="Foto trasera opcional de la prenda sin EXIF"),
        ] = None,
        include_tags: Annotated[
            bool,
            Form(description="Si es true, sugiere etiquetas estructuradas vía puerto Tagger"),
        ] = False,
        x_luca_install_token: Annotated[
            str | None,
            Header(alias="X-Luca-Install-Token"),
        ] = None,
    ) -> VisionAnalyzeResponse:
        response.headers["Cache-Control"] = "no-store"

        token = validate_install_token(x_luca_install_token)
        client_ip = request.client.host if request.client else "unknown"
        rate_limiter.check(f"token:{token}")
        rate_limiter.check(f"ip:{client_ip}")

        call_cost = VISION_CALL_COST_USD + (
            TAGGING_CALL_COST_USD if include_tags and tagger.provider_name != "none" else 0.0
        )
        budget_guard.consume(call_cost)

        raw_front = await file.read(effective_max_bytes + 1)
        await file.close()
        _validate_and_read_image(raw_front, effective_max_bytes)

        raw_back: bytes | None = None
        if back_file is not None:
            raw_back = await back_file.read(effective_max_bytes + 1)
            await back_file.close()
            _validate_and_read_image(raw_back, effective_max_bytes)

        started = time.perf_counter()

        def _process_vision_in_memory() -> tuple[
            bytes,
            bytes | None,
            int,
            int,
            str,
            tuple[float, float, float],
            list[str],
            float,
        ]:
            cutout_front = remover.remove_background(raw_front)
            cutout_back = remover.remove_background(raw_back) if raw_back is not None else None

            with Image.open(io.BytesIO(cutout_front)) as cut_img:
                width, height = cut_img.size

            color = extract_dominant_color(cutout_front)

            return (
                cutout_front,
                cutout_back,
                width,
                height,
                color.hex,
                (color.lab.l, color.lab.a, color.lab.b),
                color.palette_hex,
                color.coverage,
            )

        try:
            (
                cutout_front,
                cutout_back,
                width,
                height,
                dominant_hex,
                lab_tuple,
                palette_hex,
                coverage,
            ) = await asyncio.wait_for(
                asyncio.to_thread(_process_vision_in_memory),
                timeout=effective_timeout,
            )
        except TimeoutError as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="El análisis de la foto superó el tiempo máximo permitido.",
            ) from exc

        # El etiquetado IA se ejecuta de forma desacoplada: si el LLM está saturado o tarda,
        # el recorte de fondo y el color dominante CIELAB se devuelven igualmente (degradación elegante).
        tagging_result: GarmentTagSuggestion | None = None
        tagging_warning: str | None = None
        if include_tags and tagger.provider_name != "none":
            tagging_timeout = float(
                os.getenv("LUCA_LLM_TIMEOUT_SECONDS", str(DEFAULT_TAGGING_TIMEOUT_SECONDS))
            )
            try:
                tagging_result = await asyncio.wait_for(
                    asyncio.to_thread(tagger.tag_garment, cutout_front, cutout_back),
                    timeout=min(effective_timeout, tagging_timeout),
                )
            except TimeoutError:
                tagging_warning = (
                    "El etiquetado con IA superó el tiempo de espera; "
                    "el recorte y el color dominante se completaron correctamente."
                )
            except Exception:  # noqa: BLE001 - degradación elegante ante cualquier fallo del LLM externo
                tagging_warning = (
                    "El servicio de IA no está disponible temporalmente; "
                    "el recorte y el color dominante se completaron correctamente."
                )

        elapsed_ms = int((time.perf_counter() - started) * 1000)

        return VisionAnalyzeResponse(
            cutout_png_base64=base64.b64encode(cutout_front).decode("ascii"),
            back_cutout_png_base64=(
                base64.b64encode(cutout_back).decode("ascii") if cutout_back is not None else None
            ),
            width=width,
            height=height,
            dominant_color_hex=dominant_hex,
            dominant_color_lab=LabColorSchema(
                l=lab_tuple[0],
                a=lab_tuple[1],
                b=lab_tuple[2],
            ),
            palette_hex=palette_hex,
            coverage=coverage,
            provider=remover.provider_name,
            processing_ms=elapsed_ms,
            tagging=tagging_result,
            tagging_warning=tagging_warning,
        )

    return router
