import os
from typing import Literal

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

API_VERSION = "0.0.0"


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: Literal["luca-api"]
    version: str


def _parse_allowed_origins() -> list[str]:
    raw = os.getenv("LUCA_ALLOWED_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def create_app() -> FastAPI:
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

    @application.get("/health", response_model=HealthResponse, tags=["health"])
    @application.get("/v1/health", response_model=HealthResponse, tags=["health"])
    def health(response: Response) -> HealthResponse:
        response.headers["Cache-Control"] = "no-store"
        return HealthResponse(status="ok", service="luca-api", version=API_VERSION)

    return application


app = create_app()
