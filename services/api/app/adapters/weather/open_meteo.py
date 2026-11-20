import os
import time
from typing import Any

import httpx

from app.ports.weather import WeatherProvider, WeatherSummary

DEFAULT_CACHE_TTL_SECONDS = 1800.0  # 30 minutos
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def round_coordinates(lat: float, lon: float) -> tuple[float, float]:
    """Redondea coordenadas a 1 decimal (~10 km) por privacidad (sección 4.2)."""
    return (round(lat, 1), round(lon, 1))


def _describe_wmo_code(code: int) -> str:
    if code == 0:
        return "Despejado"
    if code in {1, 2, 3}:
        return "Parcialmente nublado"
    if code in {45, 48}:
        return "Niebla"
    if code in {51, 53, 55, 61, 63, 65, 80, 81, 82}:
        return "Lluvia"
    if code in {71, 73, 75, 85, 86}:
        return "Nieve"
    if code in {95, 96, 99}:
        return "Tormenta"
    return "Variable"


class MockWeatherProvider:
    """Proveedor determinista de clima para CI y pruebas sin red externa."""

    @property
    def provider_name(self) -> str:
        return "mock-weather"

    def get_weather(self, lat: float, lon: float) -> WeatherSummary:
        r_lat, r_lon = round_coordinates(lat, lon)
        # Temperatura determinista aproximada según latitud para pruebas reproducibles
        temp = round(26.0 - min(22.0, abs(r_lat) * 0.35), 1)
        return WeatherSummary(
            temperature_c=temp,
            apparent_temperature_c=temp,
            precipitation_probability=15,
            condition="Parcialmente nublado",
            rounded_lat=r_lat,
            rounded_lon=r_lon,
            cached=False,
            provider=self.provider_name,
        )


class OpenMeteoWeatherProvider:
    """
    Adaptador sobre Open-Meteo (sin API key ni datos personales) con redondeo a ~10 km
    y caché en memoria por celda redondeada (T9.2).
    """

    def __init__(
        self,
        *,
        ttl_seconds: float = DEFAULT_CACHE_TTL_SECONDS,
        timeout_seconds: float = 10.0,
        http_client: Any | None = None,
    ) -> None:
        self._ttl_seconds = max(60.0, ttl_seconds)
        self._timeout_seconds = max(1.0, timeout_seconds)
        self._http_client = http_client
        self._cache: dict[tuple[float, float], tuple[float, WeatherSummary]] = {}

    @property
    def provider_name(self) -> str:
        return "open-meteo"

    def get_weather(self, lat: float, lon: float) -> WeatherSummary:
        cell = round_coordinates(lat, lon)
        now = time.monotonic()

        cached_entry = self._cache.get(cell)
        if cached_entry is not None:
            expires_at, summary = cached_entry
            if now < expires_at:
                return summary.model_copy(update={"cached": True})

        params: dict[str, str | int | float] = {
            "latitude": cell[0],
            "longitude": cell[1],
            "current": "temperature_2m,apparent_temperature,weather_code,precipitation",
            "hourly": "precipitation_probability",
            "forecast_days": 1,
        }

        if self._http_client is not None:
            resp = self._http_client.get(OPEN_METEO_URL, params=params, timeout=self._timeout_seconds)
        else:
            with httpx.Client(timeout=self._timeout_seconds) as client:
                resp = client.get(OPEN_METEO_URL, params=params)

        resp.raise_for_status()
        payload = resp.json()
        current = payload.get("current", {})
        hourly = payload.get("hourly", {})
        precip_list = hourly.get("precipitation_probability") or [0]

        temp_c = float(current.get("temperature_2m", 20.0))
        apparent_c = float(current.get("apparent_temperature", temp_c))
        wmo = int(current.get("weather_code", 1))
        precip_prob = max(0, min(100, int(precip_list[0] or 0)))

        summary = WeatherSummary(
            temperature_c=round(temp_c, 1),
            apparent_temperature_c=round(apparent_c, 1),
            precipitation_probability=precip_prob,
            condition=_describe_wmo_code(wmo),
            rounded_lat=cell[0],
            rounded_lon=cell[1],
            cached=False,
            provider=self.provider_name,
        )
        self._cache[cell] = (now + self._ttl_seconds, summary)
        return summary


def build_weather_provider(provider: str | None = None) -> WeatherProvider:
    chosen = (
        provider if provider is not None else os.getenv("LUCA_WEATHER_PROVIDER", "open-meteo")
    ).strip().lower()
    if chosen == "mock":
        return MockWeatherProvider()
    return OpenMeteoWeatherProvider()
