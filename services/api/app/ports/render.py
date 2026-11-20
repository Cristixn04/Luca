from dataclasses import dataclass
from typing import Literal, Protocol

MannequinSilhouetteLiteral = Literal["female", "male"]


@dataclass(frozen=True)
class OutfitRenderGarmentInput:
    """Resumen estructural y foto opcional de cada prenda incluida en el outfit."""

    name: str
    category: str
    color_hex: str | None = None
    fit_summary: str | None = None
    visual_spec_summary: str | None = None
    image_bytes: bytes | None = None


@dataclass(frozen=True)
class OutfitRenderResult:
    """Resultado de renderizado fotorrealista sobre maniquí con fondo transparente (PNG RGBA)."""

    image_png_bytes: bytes
    width: int
    height: int
    provider: str


class OutfitRenderer(Protocol):
    """Puerto hexagonal para generar una vista fotorrealista del outfit sobre maniquí."""

    @property
    def provider_name(self) -> str: ...

    def render_outfit(
        self,
        *,
        silhouette: MannequinSilhouetteLiteral,
        garments: list[OutfitRenderGarmentInput],
        mannequin_reference_bytes: bytes | None = None,
    ) -> OutfitRenderResult | None: ...
