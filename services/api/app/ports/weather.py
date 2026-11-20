from typing import Protocol

from pydantic import BaseModel, Field


class WeatherSummary(BaseModel):
    """Resumen climático mínimo sin almacenar ni registrar coordenadas exactas."""

    temperature_c: float = Field(..., description="Temperatura actual estimada en °C")
    apparent_temperature_c: float = Field(..., description="Sensación térmica estimada en °C")
    precipitation_probability: int = Field(..., ge=0, le=100)
    condition: str = Field(..., description="Descripción corta del estado del clima en español")
    rounded_lat: float = Field(..., ge=-90.0, le=90.0)
    rounded_lon: float = Field(..., ge=-180.0, le=180.0)
    cached: bool = False
    provider: str


class WeatherProvider(Protocol):
    @property
    def provider_name(self) -> str: ...

    def get_weather(self, lat: float, lon: float) -> WeatherSummary: ...
