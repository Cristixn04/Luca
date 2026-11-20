import json
from types import SimpleNamespace
from typing import Any

from fastapi.testclient import TestClient

from app.adapters.tagging.gemini_tagger import (
    DEFAULT_GEMINI_MODEL,
    DisabledTagger,
    GeminiVisionTagger,
    MockDeterministicTagger,
    build_tagger,
)
from app.adapters.vision.rembg_remover import SimpleBorderBackgroundRemover
from app.main import create_app
from app.security.controls import DailyBudgetGuard, InMemoryRateLimiter
from tests.test_vision import VALID_TOKEN, make_garment_photo


def test_gemini_vision_tagger_calls_interactions_with_store_false_and_two_views() -> None:
    captured_kwargs: dict[str, Any] = {}

    class FakeInteractions:
        def create(self, **kwargs: Any) -> SimpleNamespace:
            captured_kwargs.update(kwargs)
            return SimpleNamespace(
                output_text=json.dumps(
                    {
                        "category": "tshirt",
                        "category_confidence": 0.94,
                        "pattern": "graphic",
                        "pattern_confidence": 0.89,
                        "style": "casual",
                        "style_confidence": 0.91,
                        "formality": 2,
                        "formality_confidence": 0.88,
                        "seasons": ["spring", "summer"],
                        "seasons_confidence": 0.86,
                        "suggested_tags": ["algodón", "estampado trasero", "cuello redondo"],
                        "overall_confidence": 0.9,
                    }
                )
            )

    fake_client = SimpleNamespace(interactions=FakeInteractions())
    tagger = GeminiVisionTagger(api_key="test-key", client=fake_client)

    front = make_garment_photo((40, 120, 140), fmt="PNG")
    back = make_garment_photo((40, 120, 140), fmt="PNG")
    result = tagger.tag_garment(front, back)

    # Verifica privacidad (store=False), modelo actual y envío multimodal de frente + espalda
    assert captured_kwargs["model"] == DEFAULT_GEMINI_MODEL
    assert captured_kwargs["store"] is False
    assert len(captured_kwargs["input"]) == 3  # prompt + front + back
    assert captured_kwargs["response_format"]["mime_type"] == "application/json"

    assert result.category == "tshirt"
    assert result.pattern == "graphic"
    assert "estampado trasero" in result.suggested_tags
    assert result.provider == f"gemini:{DEFAULT_GEMINI_MODEL}"


def test_vision_analyze_endpoint_with_optional_back_photo_and_mock_tagger() -> None:
    app = create_app(
        remover=SimpleBorderBackgroundRemover(),
        tagger=MockDeterministicTagger(),
        rate_limiter=InMemoryRateLimiter(limit=50, window_seconds=60.0),
        budget_guard=DailyBudgetGuard(daily_budget_usd=5.0),
    )
    client = TestClient(app)

    front = make_garment_photo((31, 95, 107), size=(120, 140), fmt="PNG")
    back = make_garment_photo((31, 95, 107), size=(120, 140), fmt="PNG")

    res = client.post(
        "/v1/vision/analyze",
        headers={"X-Luca-Install-Token": VALID_TOKEN},
        files=[
            ("file", ("front.png", front, "image/png")),
            ("back_file", ("back.png", back, "image/png")),
        ],
        data={"include_tags": "true"},
    )

    assert res.status_code == 200
    body = res.json()
    assert body["cutout_png_base64"]
    assert body["back_cutout_png_base64"]
    assert body["tagging"] is not None
    assert body["tagging"]["provider"] == "mock-deterministic"
    assert "vista trasera" in body["tagging"]["suggested_tags"]


def test_disabled_tagger_degrades_gracefully() -> None:
    assert isinstance(build_tagger("none"), DisabledTagger)
    assert DisabledTagger().tag_garment(b"any") is None


def test_vision_analyze_succeeds_even_if_ai_tagger_fails() -> None:
    class FailingTagger:
        @property
        def provider_name(self) -> str:
            return "gemini:failing-test"

        def tag_garment(
            self,
            front_image_bytes: bytes,
            back_image_bytes: bytes | None = None,
        ) -> Any:
            del front_image_bytes, back_image_bytes
            raise RuntimeError("503 UNAVAILABLE")

    app = create_app(
        remover=SimpleBorderBackgroundRemover(),
        tagger=FailingTagger(),
        rate_limiter=InMemoryRateLimiter(limit=50, window_seconds=60.0),
        budget_guard=DailyBudgetGuard(daily_budget_usd=5.0),
    )
    client = TestClient(app)
    front = make_garment_photo((42, 157, 143), size=(120, 120), fmt="PNG")

    res = client.post(
        "/v1/vision/analyze",
        headers={"X-Luca-Install-Token": VALID_TOKEN},
        files={"file": ("front.png", front, "image/png")},
        data={"include_tags": "true"},
    )

    assert res.status_code == 200
    body = res.json()
    assert body["cutout_png_base64"]
    assert body["dominant_color_hex"].startswith("#")
    assert body["tagging"] is None
    assert body["tagging_warning"] is not None
