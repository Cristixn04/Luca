import base64
import io
import json
import os
from collections import deque
from typing import Any

import httpx
from PIL import Image, ImageDraw, ImageFilter

from app.ports.render import (
    MannequinSilhouetteLiteral,
    OutfitRenderer,
    OutfitRenderGarmentInput,
    OutfitRenderResult,
)

DEFAULT_IMAGE_MODEL = "gemini-nano-banana-2.1"
FALLBACK_IMAGE_MODELS: tuple[str, ...] = (
    "gemini-nano-banana-2.1",
    "gemini-3.1-flash-lite-image",
)
STUDIO_DIRECTOR_MODEL = "gemini-3.5-flash-lite"
MAX_RENDER_DIMENSION = 1024

RENDER_SYSTEM_INSTRUCTION = (
    "Eres el director de fotografía y patronista digital de un atelier de moda de lujo. "
    "Tu tarea es vestir un único avatar humano realista 2D/editorial de cuerpo completo "
    "(estatura completa de cabeza a pies, postura frontal simétrica neutra con brazos ligeramente "
    "separados del torso y pies planos) con las prendas exactas indicadas en las fotografías y "
    "especificaciones técnicas adjuntas.\n"
    "Reglas obligatorias:\n"
    "1. Respeta la silueta solicitada (femenina o masculina) y conserva postura frontal natural.\n"
    "2. Reproduce con fidelidad quirúrgica cada prenda real: color, textura de tela, escote/cuello, "
    "largo de mangas, largo del bajo, caída, pliegues, cierres, botones, bolsillos, capucha y "
    "estampados simples exactos de las fotos de referencia.\n"
    "3. Ajusta las prendas de forma natural y anatómica sobre la persona sin cortar extremidades, "
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


def _hex_to_rgb(color_hex: str | None, fallback: tuple[int, int, int]) -> tuple[int, int, int]:
    if not color_hex:
        return fallback
    raw = color_hex.strip().lstrip("#")
    if len(raw) != 6:
        return fallback
    try:
        return (int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16))
    except ValueError:
        return fallback


def _shade(rgb: tuple[int, int, int], factor: float) -> tuple[int, int, int, int]:
    return (
        max(0, min(255, int(rgb[0] * factor))),
        max(0, min(255, int(rgb[1] * factor))),
        max(0, min(255, int(rgb[2] * factor))),
        255,
    )


def _tint(rgb: tuple[int, int, int], amount: float) -> tuple[int, int, int, int]:
    return (
        max(0, min(255, int(rgb[0] + (255 - rgb[0]) * amount))),
        max(0, min(255, int(rgb[1] + (255 - rgb[1]) * amount))),
        max(0, min(255, int(rgb[2] + (255 - rgb[2]) * amount))),
        255,
    )


def _strip_studio_white_background(raw_bytes: bytes, tolerance: int = 24) -> tuple[bytes, int, int]:
    """
    Convierte el fondo blanco puro (#FFFFFF) conectado a los bordes del estudio en canal alfa
    transparente, preservando la piel y las prendas con bordes suaves anti-aliased.
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
        "persona femenina realista en ilustración 2D editorial (hombros gráciles, cintura definida, caderas naturales)"
        if silhouette == "female"
        else "persona masculina realista en ilustración 2D editorial (hombros rectos estructurados, torso atlético)"
    )
    lines = [
        (
            f"Genera una ilustración editorial realista frontal de cuerpo completo de una {body_label}, "
            "sobre fondo blanco puro #FFFFFF."
        ),
    ]
    if has_mannequin_ref:
        lines.append(
            "La primera imagen adjunta es la silueta y pose exacta base a conservar."
        )
    lines.append("Viste a la persona exactamente con el siguiente conjunto:")
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


def _render_realistic_2d_studio_png(
    *,
    silhouette: MannequinSilhouetteLiteral,
    garments: list[OutfitRenderGarmentInput],
    refined_colors: dict[int, tuple[str | None, str | None, str | None]] | None = None,
) -> tuple[bytes, int, int]:
    """
    Motor de renderizado editorial 2D realista con supersampling 2× (1040×1560 → 520×780 RGBA).
    Dibuja un avatar humano realista (piel con volumen, rasgos faciales, cabello estilizado)
    vestido con las prendas exactas del outfit y caída anatómica limpia sobre fondo transparente.
    """
    scale = 2
    out_w, out_h = 520, 780
    w, h = out_w * scale, out_h * scale
    cx = w // 2
    is_female = silhouette == "female"

    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas, "RGBA")

    # Paleta natural de piel humana y cabello de estudio
    skin_base = (232, 198, 174)
    skin_mid = (224, 188, 162, 255)
    skin_hi = _tint(skin_base, 0.24)
    skin_shadow = _shade(skin_base, 0.84)
    skin_outline = (138, 102, 82, 210)
    hair_dark = (54, 38, 30, 255) if is_female else (44, 36, 32, 255)
    hair_mid = (82, 58, 44, 255) if is_female else (66, 54, 48, 255)
    hair_hi = (118, 88, 68, 220)

    # Medidas proporcionales de la figura humana (en espacio 1040×1560)
    sh_half = 122 if is_female else 148
    chest_half = 104 if is_female else 128
    waist_half = 82 if is_female else 108
    hip_half = 124 if is_female else 118
    thigh_half = 55 if is_female else 56

    head_y = 148
    head_rx = 52 if is_female else 55
    head_ry = 66 if is_female else 68
    neck_top = 204
    sh_y = 266
    chest_y = 392
    waist_y = 532
    hip_y = 668
    crotch_y = 746
    knee_y = 1070
    ankle_y = 1388
    foot_y = 1456

    # 0. Sombra suave bajo los pies
    shadow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_layer, "RGBA")
    sdraw.ellipse((cx - 175, foot_y - 16, cx + 175, foot_y + 34), fill=(20, 18, 16, 62))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=16))
    canvas.alpha_composite(shadow_layer)

    # 1. Cabello trasero (solo femenino: caída media sobre hombros)
    if is_female:
        draw.polygon(
            [
                (cx - head_rx - 22, head_y - 10),
                (cx - head_rx - 36, head_y + 168),
                (cx - head_rx + 18, head_y + 206),
                (cx + head_rx - 18, head_y + 206),
                (cx + head_rx + 36, head_y + 168),
                (cx + head_rx + 22, head_y - 10),
            ],
            fill=hair_dark,
        )

    # 2. Brazos anatómicos con manos
    for side in (-1, 1):
        ax0 = cx + side * (sh_half - 10)
        ax1 = cx + side * (sh_half + 44)
        elbow_x = cx + side * (sh_half + 58)
        wrist_x = cx + side * (sh_half + 74)
        arm_w = 24 if is_female else 30
        draw.polygon(
            [
                (ax0, sh_y + 6),
                (ax1, sh_y + 34),
                (elbow_x + side * arm_w, 520),
                (wrist_x + side * (arm_w - 6), 748),
                (wrist_x - side * (arm_w - 8), 754),
                (elbow_x - side * (arm_w - 4), 526),
                (ax0 - side * 8, sh_y + 110),
            ],
            fill=skin_mid,
            outline=skin_outline,
            width=2,
        )
        # Mano estilizada
        draw.ellipse(
            (wrist_x - 20, 742, wrist_x + 20, 826),
            fill=skin_mid,
            outline=skin_outline,
            width=2,
        )

    # 3. Piernas y pies anatómicos
    for side in (-1, 1):
        leg_cx = cx + side * (hip_half * 0.48)
        draw.polygon(
            [
                (cx + side * 6, crotch_y),
                (cx + side * hip_half, hip_y),
                (leg_cx + side * (thigh_half - 10), knee_y),
                (leg_cx + side * 26, ankle_y),
                (leg_cx + side * 34, foot_y),
                (leg_cx - side * 24, foot_y),
                (leg_cx - side * 22, ankle_y),
                (leg_cx - side * (thigh_half - 18), knee_y),
            ],
            fill=skin_mid,
            outline=skin_outline,
            width=2,
        )
        # Sombra suave de rodilla y volumen interior
        draw.ellipse(
            (leg_cx - 18, knee_y - 16, leg_cx + 18, knee_y + 14),
            fill=skin_shadow,
        )

    # 4. Torso y pelvis anatómicos
    draw.polygon(
        [
            (cx - 28, neck_top),
            (cx + 28, neck_top),
            (cx + 36, sh_y - 12),
            (cx + sh_half, sh_y + 8),
            (cx + chest_half, chest_y),
            (cx + waist_half, waist_y),
            (cx + hip_half, hip_y),
            (cx + 10, crotch_y + 6),
            (cx - 10, crotch_y + 6),
            (cx - hip_half, hip_y),
            (cx - waist_half, waist_y),
            (cx - chest_half, chest_y),
            (cx - sh_half, sh_y + 8),
            (cx - 36, sh_y - 12),
        ],
        fill=skin_mid,
        outline=skin_outline,
        width=2,
    )
    # Brillo sutil central del pecho y clavículas
    draw.ellipse((cx - 54, sh_y + 24, cx + 54, chest_y + 10), fill=skin_hi)
    draw.arc((cx - 80, sh_y + 12, cx - 10, sh_y + 44), 10, 165, fill=skin_shadow, width=3)
    draw.arc((cx + 10, sh_y + 12, cx + 80, sh_y + 44), 15, 170, fill=skin_shadow, width=3)

    # 5. Cabeza y rostro humano realista 2D
    # Orejas
    draw.ellipse((cx - head_rx - 10, head_y - 6, cx - head_rx + 12, head_y + 28), fill=skin_shadow, outline=skin_outline, width=2)
    draw.ellipse((cx + head_rx - 12, head_y - 6, cx + head_rx + 10, head_y + 28), fill=skin_shadow, outline=skin_outline, width=2)
    # Cuello con sombra bajo barbilla
    draw.rectangle((cx - 26, neck_top - 12, cx + 26, sh_y), fill=skin_mid)
    draw.ellipse((cx - 28, neck_top - 6, cx + 28, neck_top + 26), fill=skin_shadow)
    # Rostro
    draw.ellipse(
        (cx - head_rx, head_y - head_ry, cx + head_rx, head_y + head_ry),
        fill=skin_mid,
        outline=skin_outline,
        width=2,
    )
    draw.ellipse((cx - head_rx + 14, head_y - head_ry + 18, cx + head_rx - 14, head_y + head_ry - 24), fill=skin_hi)

    # Rasgos faciales expresivos
    eye_y = head_y - 4
    for side in (-1, 1):
        ex = cx + side * 21
        # Ceja
        draw.arc(
            (ex - 16, eye_y - 20, ex + 16, eye_y - 4),
            195,
            345,
            fill=hair_dark,
            width=4 if not is_female else 3,
        )
        # Esclerótica + iris + brillo
        draw.ellipse((ex - 11, eye_y - 6, ex + 11, eye_y + 6), fill=(250, 249, 247, 255), outline=(92, 68, 56, 220), width=2)
        draw.ellipse((ex - 5, eye_y - 5, ex + 5, eye_y + 5), fill=(62, 46, 36, 255))
        draw.ellipse((ex - 2, eye_y - 3, ex + 1, eye_y), fill=(255, 255, 255, 240))
    # Nariz sutil
    draw.line([(cx, eye_y + 4), (cx - 2, head_y + 22), (cx + 4, head_y + 24)], fill=skin_shadow, width=3)
    # Labios naturales
    lip_color = (188, 122, 114, 235) if is_female else (172, 122, 110, 220)
    draw.chord((cx - 16, head_y + 30, cx + 16, head_y + 46), 0, 180, fill=lip_color)
    draw.line([(cx - 15, head_y + 37), (cx + 15, head_y + 37)], fill=(134, 82, 74, 200), width=2)

    # Cabello frontal
    if is_female:
        draw.chord((cx - head_rx - 14, head_y - head_ry - 16, cx + head_rx + 14, head_y + 10), 185, 355, fill=hair_mid)
        draw.arc((cx - head_rx - 6, head_y - head_ry - 10, cx + head_rx + 6, head_y - 4), 205, 335, fill=hair_hi, width=6)
    else:
        draw.chord((cx - head_rx - 6, head_y - head_ry - 16, cx + head_rx + 6, head_y - 12), 185, 355, fill=hair_dark)
        draw.chord((cx - head_rx + 4, head_y - head_ry - 12, cx + head_rx - 4, head_y - 16), 200, 340, fill=hair_mid)

    # 6. Prendas del outfit (ordenadas por capas: base inferior -> vestido/top -> chaqueta)
    lower_cats = {"pants", "shorts", "skirt"}
    top_cats = {"tshirt", "long_sleeve", "dress"}
    outer_cats = {"jacket"}

    def _garment_colors(idx: int, g: OutfitRenderGarmentInput) -> tuple[tuple[int, int, int], tuple[int, int, int] | None, str]:
        p_hex = g.color_hex
        s_hex: str | None = None
        pat = "solid"
        if refined_colors and idx in refined_colors:
            rp, rs, rpat = refined_colors[idx]
            p_hex = rp or p_hex
            s_hex = rs
            pat = rpat or pat
        base = _hex_to_rgb(p_hex, (42, 95, 107))
        sec = _hex_to_rgb(s_hex, _tint(base, 0.45)[:3]) if s_hex else None
        return base, sec, pat

    def _draw_pattern_overlay(mask_poly: list[tuple[int, int]], pat: str, sec_rgb: tuple[int, int, int] | None) -> None:
        if pat == "solid" or sec_rgb is None:
            return
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ldraw = ImageDraw.Draw(layer, "RGBA")
        xs = [p[0] for p in mask_poly]
        ys = [p[1] for p in mask_poly]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        col = (sec_rgb[0], sec_rgb[1], sec_rgb[2], 170)
        if "horizontal" in pat or pat == "striped":
            for y in range(min_y, max_y, 26):
                ldraw.rectangle((min_x, y, max_x, y + 8), fill=col)
        elif "vertical" in pat:
            for x in range(min_x, max_x, 24):
                ldraw.rectangle((x, min_y, x + 7, max_y), fill=col)
        elif pat == "plaid":
            for y in range(min_y, max_y, 38):
                ldraw.rectangle((min_x, y, max_x, y + 7), fill=col)
            for x in range(min_x, max_x, 38):
                ldraw.rectangle((x, min_y, x + 7, max_y), fill=col)
        elif pat == "dots":
            for y in range(min_y + 12, max_y, 34):
                for x in range(min_x + 12, max_x, 34):
                    ldraw.ellipse((x - 5, y - 5, x + 5, y + 5), fill=col)

        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).polygon(mask_poly, fill=255)
        canvas.paste(layer, (0, 0), mask)

    # Capa 1: Prendas inferiores
    for idx, g in enumerate(garments):
        if g.category not in lower_cats:
            continue
        base, sec, pat = _garment_colors(idx, g)
        fill = (*base, 255)
        stroke = _shade(base, 0.58)
        fold = _shade(base, 0.78)
        spec_text = (g.visual_spec_summary or "").lower()

        if g.category == "skirt":
            hem_y = 920 if "short" in spec_text or "mini" in spec_text else 1120 if "midi" in spec_text else 1010
            flare = 46 if "a_line" in spec_text or "flared" in spec_text else 22
            poly = [
                (cx - waist_half - 6, waist_y),
                (cx + waist_half + 6, waist_y),
                (cx + hip_half + flare, hem_y),
                (cx - hip_half - flare, hem_y),
            ]
            draw.polygon(poly, fill=fill, outline=stroke, width=3)
            _draw_pattern_overlay(poly, pat, sec)
            draw.line([(cx - waist_half, waist_y + 14), (cx + waist_half, waist_y + 14)], fill=stroke, width=3)
            draw.line([(cx - 32, waist_y + 24), (cx - 48, hem_y - 12)], fill=fold, width=3)
            draw.line([(cx + 32, waist_y + 24), (cx + 48, hem_y - 12)], fill=fold, width=3)
        else:
            hem_y = 930 if g.category == "shorts" else ankle_y - 10
            leg_w = 54 if "wide" in spec_text else 42
            left_cx = int(cx - hip_half * 0.48)
            right_cx = int(cx + hip_half * 0.48)
            poly = [
                (cx - waist_half - 6, waist_y),
                (cx + waist_half + 6, waist_y),
                (cx + hip_half + 10, hip_y),
                (right_cx + leg_w, hem_y),
                (right_cx - leg_w + 6, hem_y),
                (cx + 8, crotch_y + 12),
                (cx - 8, crotch_y + 12),
                (left_cx + leg_w - 6, hem_y),
                (left_cx - leg_w, hem_y),
                (cx - hip_half - 10, hip_y),
            ]
            draw.polygon(poly, fill=fill, outline=stroke, width=3)
            _draw_pattern_overlay(poly, pat, sec)
            draw.line([(cx - waist_half - 4, waist_y + 18), (cx + waist_half + 4, waist_y + 18)], fill=stroke, width=3)
            draw.line([(cx, waist_y + 18), (cx, crotch_y - 10)], fill=stroke, width=3)
            draw.line([(left_cx, hip_y + 20), (left_cx, hem_y - 24)], fill=fold, width=2)
            draw.line([(right_cx, hip_y + 20), (right_cx, hem_y - 24)], fill=fold, width=2)

    # Capa 2: Prendas superiores y vestidos
    for idx, g in enumerate(garments):
        if g.category not in top_cats:
            continue
        base, sec, pat = _garment_colors(idx, g)
        fill = (*base, 255)
        stroke = _shade(base, 0.56)
        hi = _tint(base, 0.14)
        spec_text = (g.visual_spec_summary or "").lower()
        is_long = g.category == "long_sleeve" or "long" in spec_text
        is_dress = g.category == "dress"
        hem_y = 1100 if is_dress else (waist_y + 92 if "crop" not in spec_text else waist_y + 8)
        sleeve_end_y = 742 if is_long else 448
        sleeve_x_out = sh_half + (98 if is_long else 64)
        sleeve_x_in = sh_half + (38 if is_long else 16)

        poly = [
            (cx - 44, sh_y - 2),
            (cx - sh_half - 12, sh_y + 12),
            (cx - sleeve_x_out, sleeve_end_y),
            (cx - sleeve_x_in, sleeve_end_y + 14),
            (cx - chest_half - 10, chest_y + 16),
            (cx - (hip_half + 44 if is_dress else hip_half - 4), hem_y),
            (cx + (hip_half + 44 if is_dress else hip_half - 4), hem_y),
            (cx + chest_half + 10, chest_y + 16),
            (cx + sleeve_x_in, sleeve_end_y + 14),
            (cx + sleeve_x_out, sleeve_end_y),
            (cx + sh_half + 12, sh_y + 12),
            (cx + 44, sh_y - 2),
            (cx, sh_y + (54 if "v_neck" in spec_text else 34)),
        ]
        draw.polygon(poly, fill=fill, outline=stroke, width=3)
        _draw_pattern_overlay(poly, pat, sec)
        # Pliegues sutiles de estudio sin perforar el canal alfa
        draw.line([(cx - 46, sh_y + 84), (cx - 54, hem_y - 24)], fill=_shade(base, 0.9), width=3)
        draw.line([(cx + 46, sh_y + 84), (cx + 54, hem_y - 24)], fill=_shade(base, 0.9), width=3)
        if "hood" in spec_text or "capucha" in g.name.lower() or "buzo" in g.name.lower():
            draw.arc((cx - 64, sh_y - 42, cx + 64, sh_y + 42), 180, 360, fill=stroke, width=10)
            draw.line([(cx - 16, sh_y + 32), (cx - 16, sh_y + 112)], fill=_tint(base, 0.65), width=4)
            draw.line([(cx + 16, sh_y + 32), (cx + 16, sh_y + 112)], fill=_tint(base, 0.65), width=4)

    # Capa 3: Chaquetas / sobrecamisas
    for idx, g in enumerate(garments):
        if g.category not in outer_cats:
            continue
        base, sec, pat = _garment_colors(idx, g)
        fill = (*base, 255)
        stroke = _shade(base, 0.52)
        hem_y = hip_y + 46
        for side in (-1, 1):
            panel = [
                (cx + side * 38, sh_y - 8),
                (cx + side * (sh_half + 18), sh_y + 10),
                (cx + side * (sh_half + 106), 748),
                (cx + side * (sh_half + 42), 760),
                (cx + side * (chest_half + 16), chest_y + 18),
                (cx + side * (hip_half + 14), hem_y),
                (cx + side * 16, hem_y),
                (cx + side * 22, sh_y + 92),
            ]
            draw.polygon(panel, fill=fill, outline=stroke, width=3)
            _draw_pattern_overlay(panel, pat, sec)
            # Solapa estructurada
            draw.polygon(
                [
                    (cx + side * 38, sh_y - 6),
                    (cx + side * 78, sh_y + 64),
                    (cx + side * 22, sh_y + 116),
                ],
                fill=_shade(base, 0.88),
                outline=stroke,
                width=2,
            )

    # Downsample 2× con LANCZOS para antialiasing editorial nítido
    final_img = canvas.resize((out_w, out_h), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    final_img.save(buf, format="PNG", optimize=True)
    return buf.getvalue(), out_w, out_h


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
        png_bytes, _, _ = _render_realistic_2d_studio_png(
            silhouette=silhouette,
            garments=garments,
        )
        with Image.open(io.BytesIO(png_bytes)) as img:
            resized = img.resize((240, 360), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            resized.save(buf, format="PNG")
        return OutfitRenderResult(
            image_png_bytes=buf.getvalue(),
            width=240,
            height=360,
            provider=self.provider_name,
        )


class GeminiMannequinRenderer:
    """
    Adaptador híbrido de renderizado IA:
    1. Si el cliente personalizado o la cuota de imagen Gemini (`gemini-nano-banana-2.1`) está
       disponible, genera el render fotorrealista directamente con Nano Banana 2.1.
    2. Si el plan gratuito devuelve `429` (`limit: 0`) en modelos de imagen, degrada en ~1s a
       `gemini-3.5-flash-lite` como director de estilo + nuestro motor 2D realista de estudio
       (520×780 RGBA transparente) para que nunca falle ni cuelgue el navegador.
    """

    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_IMAGE_MODEL,
        client: Any | None = None,
        timeout_seconds: float = 28.0,
    ) -> None:
        if not api_key and client is None:
            raise ValueError("LUCA_LLM_API_KEY es obligatoria para GeminiMannequinRenderer.")
        self._api_key = api_key
        self._model = model
        self._timeout_seconds = max(5.0, timeout_seconds)
        self._custom_client = client

    @property
    def provider_name(self) -> str:
        return f"gemini:{self._model}"

    def _call_custom_client(
        self,
        *,
        prompt: str,
        content_blocks: list[dict[str, str]],
    ) -> OutfitRenderResult:
        del prompt
        interaction = self._custom_client.interactions.create(
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

    def _refine_outfit_with_vision_director(
        self,
        garments: list[OutfitRenderGarmentInput],
    ) -> dict[int, tuple[str | None, str | None, str | None]]:
        """Usa gemini-3.5-flash-lite (200 OK en Free Tier) para precisar tonos y patrones del outfit."""
        summary_lines = [
            f"{idx}: {g.name} ({g.category}, color={g.color_hex or 'auto'}, spec={g.visual_spec_summary or 'n/a'})"
            for idx, g in enumerate(garments)
        ]
        blocks: list[dict[str, str]] = [
            {
                "type": "text",
                "text": (
                    "Devuelve un JSON compacto {\"items\": [{\"index\": 0, \"primary_hex\": \"#RRGGBB\", "
                    "\"secondary_hex\": \"#RRGGBB\" o null, \"pattern\": \"solid|horizontal_stripes|vertical_stripes|plaid|dots\"}]} "
                    "para cada prenda del conjunto:\n" + "\n".join(summary_lines)
                ),
            }
        ]
        for g in garments[:4]:
            if g.image_bytes:
                blocks.append(
                    {
                        "type": "image",
                        "data": base64.b64encode(g.image_bytes).decode("ascii"),
                        "mime_type": _detect_mime_type(g.image_bytes),
                    }
                )
        try:
            resp = httpx.post(
                "https://generativelanguage.googleapis.com/v1beta/interactions",
                headers={
                    "x-goog-api-key": self._api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "model": STUDIO_DIRECTOR_MODEL,
                    "store": False,
                    "input": blocks,
                    "response_format": {"type": "text", "mime_type": "application/json"},
                },
                timeout=8.0,
            )
            if resp.status_code != 200:
                return {}
            data = resp.json()
            text_out = data.get("output_text")
            if not text_out:
                for out in data.get("outputs", []):
                    if isinstance(out, dict) and isinstance(out.get("text"), str):
                        text_out = out["text"]
                        break
            if not text_out:
                return {}
            parsed = json.loads(text_out)
            refined: dict[int, tuple[str | None, str | None, str | None]] = {}
            for entry in parsed.get("items", []):
                if isinstance(entry, dict) and isinstance(entry.get("index"), int):
                    refined[entry["index"]] = (
                        entry.get("primary_hex"),
                        entry.get("secondary_hex"),
                        entry.get("pattern"),
                    )
            return refined
        except Exception:  # noqa: BLE001
            return {}

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

        # En pruebas unitarias con cliente mock inyectado, usar la ruta SDK directa
        if self._custom_client is not None:
            return self._call_custom_client(prompt=prompt, content_blocks=content_blocks)

        # Ruta HTTP directa sin reintentos infinitos en 429 (fallo rápido en <1s en Free Tier)
        candidate_models = [self._model] + [m for m in FALLBACK_IMAGE_MODELS if m != self._model]
        for model_name in candidate_models:
            try:
                resp = httpx.post(
                    "https://generativelanguage.googleapis.com/v1beta/interactions",
                    headers={
                        "x-goog-api-key": self._api_key,
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model_name,
                        "store": False,
                        "system_instruction": RENDER_SYSTEM_INSTRUCTION,
                        "input": content_blocks,
                        "response_format": {
                            "type": "image",
                            "aspect_ratio": "2:3",
                            "image_size": "1K",
                            "mime_type": "image/jpeg",
                        },
                    },
                    timeout=min(self._timeout_seconds, 22.0),
                )
                if resp.status_code == 200:
                    payload = resp.json()
                    image_b64: str | None = None
                    out_img = payload.get("output_image")
                    if isinstance(out_img, dict) and isinstance(out_img.get("data"), str):
                        image_b64 = out_img["data"]
                    if not image_b64:
                        for block in payload.get("outputs", []):
                            if (
                                isinstance(block, dict)
                                and block.get("type") == "image"
                                and isinstance(block.get("data"), str)
                            ):
                                image_b64 = block["data"]
                                break
                    if image_b64:
                        raw_generated = base64.b64decode(image_b64)
                        transparent_png, width, height = _strip_studio_white_background(raw_generated)
                        return OutfitRenderResult(
                            image_png_bytes=transparent_png,
                            width=width,
                            height=height,
                            provider=f"gemini:{model_name}",
                        )
            except Exception:  # noqa: BLE001
                continue

        # Respaldo inteligente cuando Free Tier bloquea modelos de imagen (429 limit: 0):
        # Usa gemini-3.5-flash-lite + motor editorial 2D realista con supersampling 2×
        refined = self._refine_outfit_with_vision_director(garments)
        png_bytes, width, height = _render_realistic_2d_studio_png(
            silhouette=silhouette,
            garments=garments,
            refined_colors=refined,
        )
        return OutfitRenderResult(
            image_png_bytes=png_bytes,
            width=width,
            height=height,
            provider=f"gemini-studio-2d:{STUDIO_DIRECTOR_MODEL}",
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
        timeout_raw = os.getenv("LUCA_RENDER_TIMEOUT_SECONDS", "28.0").strip()
        try:
            timeout_seconds = float(timeout_raw)
        except ValueError:
            timeout_seconds = 28.0
        return GeminiMannequinRenderer(
            api_key=api_key,
            model=model,
            timeout_seconds=timeout_seconds,
        )

    return DisabledOutfitRenderer()
