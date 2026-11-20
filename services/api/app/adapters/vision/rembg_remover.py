import io
import os
from collections import deque
from collections.abc import Callable

import numpy as np
from PIL import Image

from app.ports.vision import BackgroundRemover


class SimpleBorderBackgroundRemover:
    """
    Adaptador determinista en memoria (Pillow + NumPy) que remueve fondos uniformes
    conectados a los 4 bordes de la imagen (flood-fill). Nunca perfora zonas internas
    de la prenda del mismo color que el fondo.
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

        height, width = arr.shape[:2]
        rgb = arr[:, :, :3]
        # Muestrea los 4 bordes para estimar el color de fondo predominante.
        top = rgb[0, :, :]
        bottom = rgb[-1, :, :]
        left = rgb[:, 0, :]
        right = rgb[:, -1, :]
        border_pixels = np.concatenate([top, bottom, left, right], axis=0)
        bg_color = np.median(border_pixels, axis=0)

        dist = np.linalg.norm(rgb - bg_color, axis=2)
        candidate = dist < self._threshold

        # Flood-fill desde el perímetro exterior para remover solo fondo conectado a los bordes.
        bg_mask = np.zeros((height, width), dtype=bool)
        queue: deque[tuple[int, int]] = deque()

        for x in range(width):
            if candidate[0, x] and not bg_mask[0, x]:
                bg_mask[0, x] = True
                queue.append((0, x))
            if candidate[height - 1, x] and not bg_mask[height - 1, x]:
                bg_mask[height - 1, x] = True
                queue.append((height - 1, x))

        for y in range(height):
            if candidate[y, 0] and not bg_mask[y, 0]:
                bg_mask[y, 0] = True
                queue.append((y, 0))
            if candidate[y, width - 1] and not bg_mask[y, width - 1]:
                bg_mask[y, width - 1] = True
                queue.append((y, width - 1))

        while queue:
            cy, cx = queue.popleft()
            if cy > 0 and candidate[cy - 1, cx] and not bg_mask[cy - 1, cx]:
                bg_mask[cy - 1, cx] = True
                queue.append((cy - 1, cx))
            if cy + 1 < height and candidate[cy + 1, cx] and not bg_mask[cy + 1, cx]:
                bg_mask[cy + 1, cx] = True
                queue.append((cy + 1, cx))
            if cx > 0 and candidate[cy, cx - 1] and not bg_mask[cy, cx - 1]:
                bg_mask[cy, cx - 1] = True
                queue.append((cy, cx - 1))
            if cx + 1 < width and candidate[cy, cx + 1] and not bg_mask[cy, cx + 1]:
                bg_mask[cy, cx + 1] = True
                queue.append((cy, cx + 1))

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
