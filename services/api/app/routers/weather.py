import asyncio
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from app.ports.weather import WeatherProvider, WeatherSummary
from app.security.controls import InMemoryRateLimiter


def create_weather_router(
    weather_provider: WeatherProvider,
    rate_limiter: InMemoryRateLimiter,
) -> APIRouter:
    router = APIRouter(prefix="/v1/weather", tags=["weather"])

    @router.get(
        "",
        response_model=WeatherSummary,
        summary="Consulta el clima actual usando coordenadas redondeadas (~10 km)",
    )
    async def get_current_weather(
        request: Request,
        response: Response,
        lat: Annotated[float, Query(ge=-90.0, le=90.0, description="Latitud aproximada")],
        lon: Annotated[float, Query(ge=-180.0, le=180.0, description="Longitud aproximada")],
    ) -> WeatherSummary:
        response.headers["Cache-Control"] = "no-store"
        client_ip = request.client.host if request.client else "unknown"
        rate_limiter.check(f"weather:{client_ip}")

        try:
            return await asyncio.wait_for(
                asyncio.to_thread(weather_provider.get_weather, lat, lon),
                timeout=12.0,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="No se pudo consultar el clima en este momento. Puedes ingresar la temperatura manualmente.",
            ) from exc

    return router
