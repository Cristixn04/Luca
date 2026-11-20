import base64
import io
import json
from types import SimpleNamespace
from typing import Any

from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.adapters.render.gemini_renderer import (
    DEFAULT_IMAGE_MODEL,
    DisabledOutfitRenderer,
    GeminiMannequinRenderer,
    MockOutfitRenderer,
    build_outfit_renderer,
)
from app.adapters.tagging.gemini_tagger import DisabledTagger
from app.adapters.vision.rembg_remover import SimpleBorderBackgroundRemover
from app.main import create_app
from app.ports.render import OutfitRenderGarmentInput
from app.security.controls import DailyBudgetGuard, InMemoryRateLimiter
from tests.test_vision import VALID_TOKEN, make_garment_photo


def _make_studio_white_mannequin_jpeg() -> bytes:
    """Genera una imagen JPEG con fondo blanco puro #FFFFFF y figura marfil #E2DDD2 al centro."""
    img = Image.new("RGB", (120, 180), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle((40, 30, 80, 150), fill=(226, 221, 210))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def test_gemini_mannequin_renderer_uses_nano_banana_store_false_and_strips_white_bg() -> None:
    captured_kwargs: dict[str, Any] = {}
    generated_jpeg_b64 = base64.b64encode(_make_studio_white_mannequin_jpeg()).decode("ascii")

    class FakeInteractions:
        def create(self, **kwargs: Any) -> SimpleNamespace:
            captured_kwargs.update(kwargs)
            return SimpleNamespace(
                output_image=SimpleNamespace(data=generated_jpeg_b64, mime_type="image/jpeg")
            )

    fake_client = SimpleNamespace(interactions=FakeInteractions())
    renderer = GeminiMannequinRenderer(api_key="test-key", client=fake_client)

    garment_photo = make_garment_photo((42, 157, 143), size=(80, 80), fmt="PNG")
    mannequin_ref = make_garment_photo((226, 221, 210), size=(80, 120), fmt="PNG")

    result = renderer.render_outfit(
        silhouette="female",
        garments=[
            OutfitRenderGarmentInput(
                name="Camiseta de lino",
                category="tshirt",
                color_hex="#2A9D8F",
                fit_summary="regular",
                visual_spec_summary="cuello crew, manga short, tela linen",
                image_bytes=garment_photo,
            )
        ],
        mannequin_reference_bytes=mannequin_ref,
    )

    assert captured_kwargs["model"] == DEFAULT_IMAGE_MODEL
    assert captured_kwargs["store"] is False
    assert captured_kwargs["response_format"]["type"] == "image"
    assert captured_kwargs["response_format"]["aspect_ratio"] == "2:3"
    assert "system_instruction" in captured_kwargs
    # prompt + mannequin reference + 1 garment image
    assert len(captured_kwargs["input"]) == 3
    assert result.provider == f"gemini:{DEFAULT_IMAGE_MODEL}"

    # Verifica que la esquina blanca pasó a transparente y el cuerpo marfil del maniquí quedó opaco
    with Image.open(io.BytesIO(result.image_png_bytes)) as out_img:
        assert out_img.mode == "RGBA"
        corner = out_img.getpixel((2, 2))
        center = out_img.getpixel((60, 90))
        assert isinstance(corner, tuple) and corner[3] == 0
        assert isinstance(center, tuple) and center[3] == 255


def test_render_outfit_endpoint_returns_rgba_png_with_mock_renderer() -> None:
    app = create_app(
        remover=SimpleBorderBackgroundRemover(),
        tagger=DisabledTagger(),
        renderer=MockOutfitRenderer(),
        rate_limiter=InMemoryRateLimiter(limit=50, window_seconds=60.0),
        budget_guard=DailyBudgetGuard(daily_budget_usd=5.0),
    )
    client = TestClient(app)

    garment_img = make_garment_photo((42, 157, 143), size=(100, 100), fmt="PNG")
    payload = [
        {
            "name": "Camiseta básica de lino",
            "category": "tshirt",
            "color_hex": "#2A9D8F",
            "fit_summary": "calce cómodo",
            "has_image": True,
        },
        {
            "name": "Pantalón chino recto",
            "category": "pants",
            "color_hex": "#1F5F6B",
            "has_image": False,
        },
    ]

    res = client.post(
        "/v1/vision/render-outfit",
        headers={"X-Luca-Install-Token": VALID_TOKEN},
        data={
            "silhouette": "male",
            "outfit_description": json.dumps(payload),
        },
        files=[("garment_files", ("shirt.png", garment_img, "image/png"))],
    )

    assert res.status_code == 200
    assert res.headers.get("cache-control") == "no-store"
    body = res.json()
    assert body["provider"] == "mock-outfit-renderer"
    assert body["width"] == 240
    assert body["height"] == 360

    decoded = base64.b64decode(body["render_png_base64"])
    with Image.open(io.BytesIO(decoded)) as out_img:
        assert out_img.mode == "RGBA"
        pixel = out_img.getpixel((0, 0))
        assert isinstance(pixel, tuple) and pixel[3] == 0


def test_render_outfit_returns_503_when_renderer_disabled() -> None:
    app = create_app(
        remover=SimpleBorderBackgroundRemover(),
        tagger=DisabledTagger(),
        renderer=DisabledOutfitRenderer(),
        rate_limiter=InMemoryRateLimiter(limit=50, window_seconds=60.0),
        budget_guard=DailyBudgetGuard(daily_budget_usd=5.0),
    )
    client = TestClient(app)

    res = client.post(
        "/v1/vision/render-outfit",
        headers={"X-Luca-Install-Token": VALID_TOKEN},
        data={
            "silhouette": "female",
            "outfit_description": json.dumps([{"name": "Vestido", "category": "dress"}]),
        },
    )

    assert res.status_code == 503
    assert isinstance(build_outfit_renderer("none"), DisabledOutfitRenderer)


def test_render_outfit_rejects_invalid_description_payload() -> None:
    app = create_app(
        remover=SimpleBorderBackgroundRemover(),
        tagger=DisabledTagger(),
        renderer=MockOutfitRenderer(),
        rate_limiter=InMemoryRateLimiter(limit=50, window_seconds=60.0),
        budget_guard=DailyBudgetGuard(daily_budget_usd=5.0),
    )
    client = TestClient(app)

    res = client.post(
        "/v1/vision/render-outfit",
        headers={"X-Luca-Install-Token": VALID_TOKEN},
        data={
            "silhouette": "female",
            "outfit_description": "not-json",
        },
    )

    assert res.status_code == 400
