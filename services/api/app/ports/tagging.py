from typing import Literal, Protocol

from pydantic import BaseModel, Field

GarmentCategoryLiteral = Literal[
    "tshirt",
    "long_sleeve",
    "jacket",
    "pants",
    "shorts",
    "skirt",
    "dress",
]

GarmentPatternLiteral = Literal[
    "solid",
    "striped",
    "plaid",
    "floral",
    "graphic",
    "textured",
    "other",
]

GarmentStyleLiteral = Literal[
    "casual",
    "minimalist",
    "sporty",
    "formal",
    "streetwear",
    "classic",
    "bohemian",
]

GarmentSeasonLiteral = Literal["spring", "summer", "autumn", "winter"]


class GarmentTagSuggestion(BaseModel):
    """Salida JSON estructurada del puerto Tagger (RF-11 / T7.1)."""

    category: GarmentCategoryLiteral
    category_confidence: float = Field(..., ge=0.0, le=1.0)
    pattern: GarmentPatternLiteral
    pattern_confidence: float = Field(..., ge=0.0, le=1.0)
    style: GarmentStyleLiteral
    style_confidence: float = Field(..., ge=0.0, le=1.0)
    formality: int = Field(..., ge=1, le=5)
    formality_confidence: float = Field(..., ge=0.0, le=1.0)
    seasons: list[GarmentSeasonLiteral] = Field(..., min_length=1, max_length=4)
    seasons_confidence: float = Field(..., ge=0.0, le=1.0)
    suggested_tags: list[str] = Field(default_factory=list, max_length=10)
    overall_confidence: float = Field(..., ge=0.0, le=1.0)
    provider: str = "unknown"


class Tagger(Protocol):
    """Puerto hexagonal para etiquetado asistido de prendas desde 1 o 2 fotos (frente y espalda opcional)."""

    @property
    def provider_name(self) -> str: ...

    def tag_garment(
        self,
        front_image_bytes: bytes,
        back_image_bytes: bytes | None = None,
    ) -> GarmentTagSuggestion | None: ...
