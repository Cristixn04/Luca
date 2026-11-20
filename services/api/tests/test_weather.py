from typing import Any

from fastapi.testclient import TestClient

from app.adapters.tagging.gemini_tagger import DisabledTagger
from app.adapters.vision.rembg_remover import SimpleBorderBackgroundRemover
from app.adapters.weather.open_meteo import (
    MockWeatherProvider,
    OpenMeteoWeatherProvider,
    round_coordinates,
)
from app.main import create_app


def test_round_coordinates_preserves_10km_privacy() -> None:
    assert round_coordinates(7.119349, -73.122742) == (7.1, -73.1)


def test_open_meteo_provider_caches_by_rounded_cell() -> None:
    calls = 0

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, Any]:
            return {
                "current": {
                    "temperature_2m": 24.4,
                    "apparent_temperature": 25.1,
                    "weather_code": 1,
                },
                "hourly": {"precipitation_probability": [20]},
            }

    class FakeClient:
        def get(self, url: str, *, params: dict[str, Any], timeout: float) -> FakeResponse:
            nonlocal calls
            del url, timeout
            calls += 1
            assert params["latitude"] == 7.1
            assert params["longitude"] == -73.1
            return FakeResponse()

    provider = OpenMeteoWeatherProvider(http_client=FakeClient())
    first = provider.get_weather(7.119, -73.122)
    second = provider.get_weather(7.141, -73.081)

    assert calls == 1
    assert first.cached is False
    assert second.cached is True
    assert second.temperature_c == 24.4
    assert second.condition == "Parcialmente nublado"


def test_weather_endpoint_returns_rounded_summary() -> None:
    app = create_app(
        remover=SimpleBorderBackgroundRemover(),
        tagger=DisabledTagger(),
        weather_provider=MockWeatherProvider(),
    )
    client = TestClient(app)

    res = client.get("/v1/weather", params={"lat": 7.1234, "lon": -73.1234})
    assert res.status_code == 200
    assert res.headers.get("cache-control") == "no-store"
    body = res.json()
    assert body["rounded_lat"] == 7.1
    assert body["rounded_lon"] == -73.1
    assert body["provider"] == "mock-weather"
