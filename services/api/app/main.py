import os
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.adapters.render.gemini_renderer import build_outfit_renderer
from app.adapters.tagging.gemini_tagger import build_tagger
from app.adapters.vision.rembg_remover import build_background_remover
from app.adapters.weather.open_meteo import build_weather_provider
from app.ports.render import OutfitRenderer
from app.ports.tagging import Tagger
from app.ports.vision import BackgroundRemover
from app.ports.weather import WeatherProvider
from app.routers.vision import create_vision_router
from app.routers.weather import create_weather_router
from app.security.controls import DailyBudgetGuard, InMemoryRateLimiter

# Carga variables locales desde services/api/.env sin sobreescribir variables del entorno real.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

API_VERSION = "0.8.0"


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: Literal["luca-api"]
    version: str
    vision_provider: str
    tagger_provider: str
    weather_provider: str


def _parse_allowed_origins() -> list[str]:
    raw = os.getenv("LUCA_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:4173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def create_app(
    *,
    remover: BackgroundRemover | None = None,
    tagger: Tagger | None = None,
    renderer: OutfitRenderer | None = None,
    weather_provider: WeatherProvider | None = None,
    rate_limiter: InMemoryRateLimiter | None = None,
    budget_guard: DailyBudgetGuard | None = None,
    max_upload_bytes: int | None = None,
    timeout_seconds: float | None = None,
) -> FastAPI:
    active_remover = remover or build_background_remover()
    active_tagger = tagger or build_tagger()
    active_renderer = renderer or build_outfit_renderer()
    active_weather = weather_provider or build_weather_provider()
    active_limiter = rate_limiter or InMemoryRateLimiter.from_env()
    active_budget = budget_guard or DailyBudgetGuard.from_env()

    application = FastAPI(
        title="Luca API",
        version=API_VERSION,
        description="API sin estado para servicios auxiliares de Luca (visión, etiquetado y clima).",
        openapi_url="/v1/openapi.json",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=_parse_allowed_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-Luca-Install-Token"],
    )

    @application.middleware("http")
    async def add_security_headers(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        # Cero registro de cuerpos de peticiones ni cabeceras identificadoras (Sección 15.3).
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=()",
        )
        return response

    @application.get("/health", response_model=HealthResponse, tags=["health"])
    @application.get("/v1/health", response_model=HealthResponse, tags=["health"])
    def health(response: Response) -> HealthResponse:
        response.headers["Cache-Control"] = "no-store"
        return HealthResponse(
            status="ok",
            service="luca-api",
            version=API_VERSION,
            vision_provider=active_remover.provider_name,
            tagger_provider=active_tagger.provider_name,
            weather_provider=active_weather.provider_name,
        )

    application.include_router(
        create_vision_router(
            remover=active_remover,
            tagger=active_tagger,
            renderer=active_renderer,
            rate_limiter=active_limiter,
            budget_guard=active_budget,
            max_upload_bytes=max_upload_bytes,
            timeout_seconds=timeout_seconds,
        )
    )
    application.include_router(
        create_weather_router(
            weather_provider=active_weather,
            rate_limiter=active_limiter,
        )
    )

    return application


app = create_app()
