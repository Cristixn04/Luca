import io
import os
from collections.abc import Callable

import numpy as np
from PIL import Image

from app.ports.vision import BackgroundRemover


class SimpleBorderBackgroundRemover:
    """
    Adaptador determinista en memoria (Pillow + NumPy) que remueve fondos uniformes
    estimando el color del borde de la imagen. Útil en CI, pruebas y entornos sin pesos ONNX.
    """

    def __init__(self, threshold: float = 34.0) -> None:
        self._threshold = threshold

    @property
    def provider_name(self) -> str:
        return "simple-border"

    def remove_background(self, image_bytes: bytes) -> bytes:
        with Image.open(io.BytesIO(image_bytes)) as img:
            rgba = img.convert("RGBA")
            arr = np.asarray(rgba, dtype=np.float32).copy()

        rgb = arr[:, :, :3]
        # Muestrea los 4 bordes para estimar el color de fondo predominante.
        top = rgb[0, :, :]
        bottom = rgb[-1, :, :]
        left = rgb[:, 0, :]
        right = rgb[:, -1, :]
        border_pixels = np.concatenate([top, bottom, left, right], axis=0)
        bg_color = np.median(border_pixels, axis=0)

        dist = np.linalg.norm(rgb - bg_color, axis=2)
        bg_mask = dist < self._threshold

        # Evita borrar toda la prenda si la foto ya es de un color uniforme:
        # solo aplica la máscara si conserva al menos 5 % de píxeles en primer plano.
        foreground_ratio = float(np.mean(~bg_mask))
        if foreground_ratio >= 0.05:
            arr[bg_mask, 3] = 0.0

        out_img = Image.fromarray(arr.astype(np.uint8), mode="RGBA")
        out_buf = io.BytesIO()
        out_img.save(out_buf, format="PNG", optimize=True)
        return out_buf.getvalue()


class RembgBackgroundRemover:
    """Adaptador real sobre `rembg` (ONNX Runtime), operando estrictamente en memoria."""

    def __init__(self, remove_fn: Callable[[bytes], bytes] | None = None) -> None:
        if remove_fn is not None:
            self._remove_fn = remove_fn
        else:
            from rembg import remove

            self._remove_fn = remove

    @property
    def provider_name(self) -> str:
        return "rembg"

    def remove_background(self, image_bytes: bytes) -> bytes:
        result = self._remove_fn(image_bytes)
        if not isinstance(result, bytes):
            raise TypeError("El adaptador rembg devolvió un formato inesperado.")
        return result


def build_background_remover(provider: str | None = None) -> BackgroundRemover:
    raw = provider if provider is not None else os.getenv("LUCA_VISION_PROVIDER", "auto")
    chosen = raw.strip().lower()
    if chosen == "simple":
        return SimpleBorderBackgroundRemover()
    if chosen == "rembg":
        return RembgBackgroundRemover()

    # Modo "auto": intenta rembg si está instalado; si no, usa el adaptador en memoria simple.
    try:
        return RembgBackgroundRemover()
    except ImportError:
        return SimpleBorderBackgroundRemover()
