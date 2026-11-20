import io
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from PIL import Image
from sklearn.cluster import KMeans


@dataclass(frozen=True)
class LabColor:
    l: float
    a: float
    b: float


@dataclass(frozen=True)
class DominantColorResult:
    hex: str
    lab: LabColor
    palette_hex: list[str]
    coverage: float


def _srgb_to_linear(channel: NDArray[np.float64]) -> NDArray[np.float64]:
    return np.where(channel <= 0.04045, channel / 12.92, ((channel + 0.055) / 1.055) ** 2.4)


def _linear_to_srgb(channel: NDArray[np.float64]) -> NDArray[np.float64]:
    clipped = np.clip(channel, 0.0, 1.0)
    return np.where(clipped <= 0.0031308, clipped * 12.92, 1.055 * (clipped ** (1.0 / 2.4)) - 0.055)


def srgb_to_lab(rgb_uint8: NDArray[np.uint8]) -> NDArray[np.float64]:
    """Convierte arreglo (N, 3) sRGB [0..255] a CIELAB (iluminante D65)."""
    rgb = rgb_uint8.astype(np.float64) / 255.0
    lin = _srgb_to_linear(rgb)

    # Matriz sRGB -> XYZ (D65)
    x = lin[:, 0] * 0.4124564 + lin[:, 1] * 0.3575761 + lin[:, 2] * 0.1804375
    y = lin[:, 0] * 0.2126729 + lin[:, 1] * 0.7151522 + lin[:, 2] * 0.0721750
    z = lin[:, 0] * 0.0193339 + lin[:, 1] * 0.1191920 + lin[:, 2] * 0.9503041

    # Referencia blanca D65
    xn, yn, zn = 0.95047, 1.00000, 1.08883
    eps = 216.0 / 24389.0
    kappa = 24389.0 / 27.0

    def f(t: NDArray[np.float64]) -> NDArray[np.float64]:
        return np.where(t > eps, np.cbrt(t), (kappa * t + 16.0) / 116.0)

    fx = f(x / xn)
    fy = f(y / yn)
    fz = f(z / zn)

    l_val = 116.0 * fy - 16.0
    a_val = 500.0 * (fx - fy)
    b_val = 200.0 * (fy - fz)
    return np.stack([l_val, a_val, b_val], axis=1)


def lab_to_hex(lab: tuple[float, float, float]) -> str:
    """Convierte un color CIELAB (D65) individual a código hexadecimal #RRGGBB."""
    l_val, a_val, b_val = lab
    fy = (l_val + 16.0) / 116.0
    fx = a_val / 500.0 + fy
    fz = fy - b_val / 200.0

    eps = 216.0 / 24389.0
    kappa = 24389.0 / 27.0

    def finv(t: float) -> float:
        t3 = t**3
        return t3 if t3 > eps else (116.0 * t - 16.0) / kappa

    x = finv(fx) * 0.95047
    y = finv(fy) * 1.00000
    z = finv(fz) * 1.08883

    r_lin = x * 3.2404542 + y * -1.5371385 + z * -0.4985314
    g_lin = x * -0.9692660 + y * 1.8760108 + z * 0.0415560
    b_lin = x * 0.0556434 + y * -0.2040259 + z * 1.0572252

    rgb_srgb = _linear_to_srgb(np.array([r_lin, g_lin, b_lin], dtype=np.float64))
    r, g, b = (round(float(c) * 255) for c in rgb_srgb)
    return f"#{r:02X}{g:02X}{b:02X}"


def extract_dominant_color(
    rgba_png_bytes: bytes,
    max_clusters: int = 3,
    max_samples: int = 4_000,
) -> DominantColorResult:
    """
    Calcula el color dominante en espacio CIELAB aplicando k-means exclusivamente
    sobre los píxeles visibles de la máscara (alpha >= 128).
    """
    with Image.open(io.BytesIO(rgba_png_bytes)) as img:
        rgba = img.convert("RGBA")
        arr = np.asarray(rgba, dtype=np.uint8)

    mask = arr[:, :, 3] >= 128
    fg_pixels = arr[mask][:, :3]

    if fg_pixels.shape[0] == 0:
        fg_pixels = arr.reshape(-1, 4)[:, :3]

    # Submuestreo determinista para acotar latencia por debajo de 50 ms
    if fg_pixels.shape[0] > max_samples:
        step = max(1, fg_pixels.shape[0] // max_samples)
        fg_pixels = fg_pixels[::step][:max_samples]

    lab_pixels = srgb_to_lab(fg_pixels)
    unique_count = int(np.unique(fg_pixels, axis=0).shape[0])
    k = max(1, min(max_clusters, unique_count))

    if k == 1:
        center = lab_pixels.mean(axis=0)
        hex_color = lab_to_hex((float(center[0]), float(center[1]), float(center[2])))
        return DominantColorResult(
            hex=hex_color,
            lab=LabColor(
                l=round(float(center[0]), 2),
                a=round(float(center[1]), 2),
                b=round(float(center[2]), 2),
            ),
            palette_hex=[hex_color],
            coverage=1.0,
        )

    kmeans = KMeans(n_clusters=k, random_state=42, n_init=5)
    labels = kmeans.fit_predict(lab_pixels)
    counts = np.bincount(labels, minlength=k)
    order = np.argsort(counts)[::-1]

    centers = kmeans.cluster_centers_
    total = float(counts.sum())

    palette_hex = [
        lab_to_hex((float(centers[idx][0]), float(centers[idx][1]), float(centers[idx][2])))
        for idx in order
    ]
    top_idx = int(order[0])
    top_center = centers[top_idx]
    coverage = round(float(counts[top_idx]) / total, 4) if total > 0 else 1.0

    return DominantColorResult(
        hex=palette_hex[0],
        lab=LabColor(
            l=round(float(top_center[0]), 2),
            a=round(float(top_center[1]), 2),
            b=round(float(top_center[2]), 2),
        ),
        palette_hex=palette_hex,
        coverage=coverage,
    )
