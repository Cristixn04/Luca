import asyncio
import base64
import io
import os
import time
from typing import Annotated

from fastapi import APIRouter, File, Header, HTTPException, Request, Response, UploadFile, status
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

from app.adapters.vision.dominant_color import extract_dominant_color
from app.ports.vision import BackgroundRemover
from app.security.controls import DailyBudgetGuard, InMemoryRateLimiter, validate_install_token

ALLOWED_IMAGE_FORMATS = frozenset({"JPEG", "PNG", "WEBP"})
DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MiB
DEFAULT_VISION_TIMEOUT_SECONDS = 15.0
VISION_CALL_COST_USD = 0.002

# Protección contra decompression bombs (Pillow)
Image.MAX_IMAGE_PIXELS = 25_000_000


class LabColorSchema(BaseModel):
    l: float = Field(..., description="Luminosidad CIELAB L* (0..100)")
    a: float = Field(..., description="Eje verde-rojo CIELAB a*")
    b: float = Field(..., description="Eje azul-amarillo CIELAB b*")


class VisionAnalyzeResponse(BaseModel):
    cutout_png_base64: str = Field(..., description="Imagen PNG RGBA recortada codificada en Base64")
    width: int = Field(..., ge=1)
    height: int = Field(..., ge=1)
    dominant_color_hex: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")
    dominant_color_lab: LabColorSchema
    palette_hex: list[str]
    coverage: float = Field(..., ge=0.0, le=1.0)
    provider: str
    processing_ms: int = Field(..., ge=0)


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
        summary="Recorta el fondo y calcula el color dominante en CIELAB",
    )
    async def analyze_garment_photo(
        request: Request,
        response: Response,
        file: Annotated[UploadFile, File(description="Foto reducida de la prenda sin EXIF")],
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
        budget_guard.consume(VISION_CALL_COST_USD)

        # Lectura acotada en memoria (lee 1 byte adicional para detectar exceso de tamaño sin agotar RAM)
        raw_bytes = await file.read(effective_max_bytes + 1)
        await file.close()

        _validate_and_read_image(raw_bytes, effective_max_bytes)

        started = time.perf_counter()

        def _process_in_memory() -> tuple[bytes, int, int, str, tuple[float, float, float], list[str], float]:
            cutout_bytes = remover.remove_background(raw_bytes)
            with Image.open(io.BytesIO(cutout_bytes)) as cut_img:
                width, height = cut_img.size
            color = extract_dominant_color(cutout_bytes)
            return (
                cutout_bytes,
                width,
                height,
                color.hex,
                (color.lab.l, color.lab.a, color.lab.b),
                color.palette_hex,
                color.coverage,
            )

        try:
            (
                cutout_bytes,
                width,
                height,
                dominant_hex,
                lab_tuple,
                palette_hex,
                coverage,
            ) = await asyncio.wait_for(
                asyncio.to_thread(_process_in_memory),
                timeout=effective_timeout,
            )
        except TimeoutError as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="El análisis de la foto superó el tiempo máximo permitido.",
            ) from exc

        elapsed_ms = int((time.perf_counter() - started) * 1000)

        return VisionAnalyzeResponse(
            cutout_png_base64=base64.b64encode(cutout_bytes).decode("ascii"),
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
        )

    return router
