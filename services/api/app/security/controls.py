import os
import re
import time
from collections import deque
from datetime import UTC, datetime

from fastapi import HTTPException, status

INSTALL_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{16,128}$")


def validate_install_token(token: str | None) -> str:
    """
    Valida el token anónimo de instalación generado aleatoriamente en el dispositivo.
    Nunca vincula con una persona ni se registra en logs.
    """
    if not token or not INSTALL_TOKEN_PATTERN.match(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cabecera X-Luca-Install-Token ausente o con formato inválido.",
        )
    return token


def parse_rate_limit(spec: str) -> tuple[int, float]:
    """Parsea formato '<limite>/<unidad>' (ej. '30/minute', '10/second')."""
    raw = spec.strip().lower()
    parts = raw.split("/")
    if len(parts) != 2:
        return (30, 60.0)
    try:
        limit = max(1, int(parts[0]))
    except ValueError:
        return (30, 60.0)

    unit = parts[1].strip()
    if unit in {"s", "sec", "second"}:
        return (limit, 1.0)
    if unit in {"h", "hour"}:
        return (limit, 3600.0)
    return (limit, 60.0)


class InMemoryRateLimiter:
    """
    Limitador de ventana deslizante en memoria por token anónimo de instalación y por IP.
    Límite conocido (Sección 15.3): válido para instancia única; escalado horizontal requiere Redis.
    """

    def __init__(self, limit: int = 30, window_seconds: float = 60.0) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = {}

    @classmethod
    def from_env(cls) -> "InMemoryRateLimiter":
        spec = os.getenv("LUCA_RATE_LIMIT", "30/minute")
        limit, window = parse_rate_limit(spec)
        return cls(limit=limit, window_seconds=window)

    def check(self, key: str, now: float | None = None) -> None:
        ts = now if now is not None else time.monotonic()
        cutoff = ts - self.window_seconds
        bucket = self._hits.setdefault(key, deque())

        while bucket and bucket[0] <= cutoff:
            bucket.popleft()

        if len(bucket) >= self.limit:
            retry_after = max(1, int(self.window_seconds - (ts - bucket[0])) + 1)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Límite de peticiones alcanzado. Intenta de nuevo en unos momentos.",
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(ts)


class DailyBudgetGuard:
    """Tope de gasto diario en memoria con corte automático (Sección 8 y 15.3)."""

    def __init__(self, daily_budget_usd: float = 5.0) -> None:
        self.daily_budget_usd = max(0.0, daily_budget_usd)
        self._day_key = self._current_day()
        self._spent_usd = 0.0

    @classmethod
    def from_env(cls) -> "DailyBudgetGuard":
        raw = os.getenv("LUCA_DAILY_BUDGET", "5.0")
        try:
            budget = float(raw)
        except ValueError:
            budget = 5.0
        return cls(daily_budget_usd=budget)

    @staticmethod
    def _current_day() -> str:
        return datetime.now(UTC).strftime("%Y-%m-%d")

    def consume(self, estimated_cost_usd: float) -> None:
        today = self._current_day()
        if today != self._day_key:
            self._day_key = today
            self._spent_usd = 0.0

        if self._spent_usd + estimated_cost_usd > self.daily_budget_usd:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Tope de gasto diario de la API alcanzado. Puedes continuar en modo manual.",
            )

        self._spent_usd += estimated_cost_usd
