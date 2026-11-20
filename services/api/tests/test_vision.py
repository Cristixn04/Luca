import base64
import io
import time

from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.adapters.vision.dominant_color import extract_dominant_color, lab_to_hex
from app.adapters.vision.rembg_remover import RembgBackgroundRemover, SimpleBorderBackgroundRemover
from app.main import create_app
from app.security.controls import DailyBudgetGuard, InMemoryRateLimiter

VALID_TOKEN = "luca_test_install_token_123456"


def make_garment_photo(
    garment_rgb: tuple[int, int, int],
    bg_rgb: tuple[int, int, int] = (245, 245, 245),
    size: tuple[int, int] = (160, 160),
    fmt: str = "JPEG",
) -> bytes:
    img = Image.new("RGB", size, color=bg_rgb)
    draw = ImageDraw.Draw(img)
    w, h = size
    draw.rectangle([w // 4, h // 5, (3 * w) // 4, (4 * h) // 5], fill=garment_rgb)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


def test_analyze_garment_photo_removes_background_and_extracts_lab_color() -> None:
    app = create_app(
        remover=SimpleBorderBackgroundRemover(),
        rate_limiter=InMemoryRateLimiter(limit=100, window_seconds=60.0),
        budget_guard=DailyBudgetGuard(daily_budget_usd=5.0),
    )
    client = TestClient(app)

    # Prenda turquesa (#2A9D8F = 42, 157, 143) sobre fondo claro
    photo = make_garment_photo((42, 157, 143))
    response = client.post(
        "/v1/vision/analyze",
        headers={"X-Luca-Install-Token": VALID_TOKEN},
        files={"file": ("camiseta.jpg", photo, "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.headers.get("cache-control") == "no-store"

    body = response.json()
    assert body["width"] == 160
    assert body["height"] == 160
    assert body["dominant_color_hex"].startswith("#")
    assert body["provider"] == "simple-border"
    assert body["coverage"] > 0.5

    # Verifica que el color CIELAB se aproxima al turquesa esperado (a* negativo, L* ~ 55-65)
    assert body["dominant_color_lab"]["a"] < -15
    assert 45 <= body["dominant_color_lab"]["l"] <= 70

    # Verifica que el PNG recortado tiene canal alfa y bordes transparentes
    cutout_bytes = base64.b64decode(body["cutout_png_base64"])
    with Image.open(io.BytesIO(cutout_bytes)) as cutout:
        assert cutout.mode == "RGBA"
        rgba_pixel = cutout.getpixel((0, 0))
        assert isinstance(rgba_pixel, tuple)
        assert rgba_pixel[3] == 0


def test_rembg_adapter_delegates_in_memory() -> None:
    called = False

    def fake_rembg(data: bytes) -> bytes:
        nonlocal called
        called = True
        return SimpleBorderBackgroundRemover().remove_background(data)

    adapter = RembgBackgroundRemover(remove_fn=fake_rembg)
    assert adapter.provider_name == "rembg"
    out = adapter.remove_background(make_garment_photo((180, 40, 40)))
    assert called is True
    color = extract_dominant_color(out)
    assert color.lab.a > 30
    assert lab_to_hex((color.lab.l, color.lab.a, color.lab.b)) == color.hex


def test_analyze_rejects_missing_token_fake_file_oversize_rate_limit_budget_and_timeout() -> None:
    # 1. Token faltante -> 401
    app = create_app(
        remover=SimpleBorderBackgroundRemover(),
        rate_limiter=InMemoryRateLimiter(limit=2, window_seconds=60.0),
        budget_guard=DailyBudgetGuard(daily_budget_usd=1.0),
        max_upload_bytes=1024,
    )
    client = TestClient(app)

    photo = make_garment_photo((30, 80, 140), size=(40, 40), fmt="PNG")
    res_no_token = client.post(
        "/v1/vision/analyze",
        files={"file": ("shirt.png", photo, "image/png")},
    )
    assert res_no_token.status_code == 401

    # 2. Archivo disfrazado (HTML/SVG haciéndose pasar por image/jpeg) -> 415
    fake_script = b"<svg onload=alert(1)></svg>"
    res_fake = client.post(
        "/v1/vision/analyze",
        headers={"X-Luca-Install-Token": VALID_TOKEN},
        files={"file": ("evil.jpg", fake_script, "image/jpeg")},
    )
    assert res_fake.status_code == 415

    # 3. Exceso de tamaño -> 413
    oversized = b"\x00" * 2048
    res_big = client.post(
        "/v1/vision/analyze",
        headers={"X-Luca-Install-Token": VALID_TOKEN},
        files={"file": ("big.jpg", oversized, "image/jpeg")},
    )
    assert res_big.status_code == 413

    # 4. Rate limit excedido -> 429 (tercera petición con límite 2)
    res_limited = client.post(
        "/v1/vision/analyze",
        headers={"X-Luca-Install-Token": VALID_TOKEN},
        files={"file": ("shirt.png", photo, "image/png")},
    )
    assert res_limited.status_code == 429
    assert res_limited.headers.get("retry-after") is not None

    # 5. Tope de gasto diario -> 503
    budget_app = create_app(
        remover=SimpleBorderBackgroundRemover(),
        rate_limiter=InMemoryRateLimiter(limit=100, window_seconds=60.0),
        budget_guard=DailyBudgetGuard(daily_budget_usd=0.001),
    )
    res_budget = TestClient(budget_app).post(
        "/v1/vision/analyze",
        headers={"X-Luca-Install-Token": VALID_TOKEN},
        files={"file": ("shirt.png", photo, "image/png")},
    )
    assert res_budget.status_code == 503

    # 6. Timeout del adaptador -> 504
    class SlowRemover:
        @property
        def provider_name(self) -> str:
            return "slow-fake"

        def remove_background(self, image_bytes: bytes) -> bytes:
            time.sleep(0.25)
            return image_bytes

    slow_app = create_app(
        remover=SlowRemover(),
        rate_limiter=InMemoryRateLimiter(limit=100, window_seconds=60.0),
        budget_guard=DailyBudgetGuard(daily_budget_usd=5.0),
        timeout_seconds=0.05,
    )
    res_timeout = TestClient(slow_app).post(
        "/v1/vision/analyze",
        headers={"X-Luca-Install-Token": VALID_TOKEN},
        files={"file": ("shirt.png", photo, "image/png")},
    )
    assert res_timeout.status_code == 504


def test_benchmark_30_garment_photos_rnf02() -> None:
    """Evaluación con 30 fotos variadas (T6.9) comprobando p95 <= 10 s (RNF-02)."""
    app = create_app(
        remover=SimpleBorderBackgroundRemover(),
        rate_limiter=InMemoryRateLimiter(limit=100, window_seconds=60.0),
        budget_guard=DailyBudgetGuard(daily_budget_usd=10.0),
    )
    client = TestClient(app)

    colors: list[tuple[int, int, int]] = [
        ((30 + (i * 23) % 200), (40 + (i * 41) % 190), (50 + (i * 67) % 180)) for i in range(30)
    ]

    latencies_ms: list[float] = []
    for idx, rgb in enumerate(colors):
        fmt = "PNG" if idx % 3 == 0 else ("WEBP" if idx % 3 == 1 else "JPEG")
        photo = make_garment_photo(rgb, size=(240, 300), fmt=fmt)
        t0 = time.perf_counter()
        res = client.post(
            "/v1/vision/analyze",
            headers={"X-Luca-Install-Token": VALID_TOKEN},
            files={"file": (f"garment_{idx}.{fmt.lower()}", photo, f"image/{fmt.lower()}")},
        )
        latencies_ms.append((time.perf_counter() - t0) * 1000)
        assert res.status_code == 200
        assert res.json()["dominant_color_hex"].startswith("#")

    latencies_ms.sort()
    p95_ms = latencies_ms[int(len(latencies_ms) * 0.95) - 1]
    assert p95_ms <= 10_000.0
