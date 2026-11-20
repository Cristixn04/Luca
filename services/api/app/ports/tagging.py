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

NecklineLiteral = Literal[
    "crew",
    "v_neck",
    "scoop",
    "turtleneck",
    "polo",
    "shirt_collar",
    "hood",
    "square",
    "strapless",
    "none",
]

SleeveLengthLiteral = Literal[
    "sleeveless",
    "cap",
    "short",
    "three_quarter",
    "long",
    "none",
]

GarmentLengthLiteral = Literal[
    "crop",
    "waist",
    "hip",
    "thigh",
    "knee",
    "midi",
    "maxi",
    "ankle",
]

FitCutLiteral = Literal[
    "skinny",
    "fitted",
    "regular",
    "relaxed",
    "oversized",
    "wide_leg",
    "flared",
    "a_line",
    "pleated",
]

ClosureLiteral = Literal[
    "pullover",
    "zipper",
    "buttons",
    "open_front",
    "drawstring",
    "belt",
]

PocketStyleLiteral = Literal[
    "none",
    "side",
    "chest",
    "kangaroo",
    "cargo",
    "patch",
]

GraphicPositionLiteral = Literal[
    "none",
    "chest_center",
    "chest_left",
    "all_over",
    "back",
]

FabricTextureLiteral = Literal[
    "smooth",
    "denim",
    "knit",
    "ribbed",
    "fleece",
    "linen",
    "leather",
    "satin",
    "corduroy",
]


class GarmentVisualSpec(BaseModel):
    """Ficha estructural quirúrgica de la prenda para reconstrucción fiel sobre el maniquí."""

    neckline: NecklineLiteral = "crew"
    sleeve_length: SleeveLengthLiteral = "short"
    garment_length: GarmentLengthLiteral = "hip"
    fit_cut: FitCutLiteral = "regular"
    closure: ClosureLiteral = "pullover"
    pockets: PocketStyleLiteral = "none"
    has_hood: bool = False
    has_ribbed_trim: bool = False
    has_lapels: bool = False
    has_pleats: bool = False
    secondary_color_hex: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    accent_color_hex: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    graphic_position: GraphicPositionLiteral = "none"
    fabric_texture: FabricTextureLiteral = "smooth"


class GarmentTagSuggestion(BaseModel):
    """Salida JSON estructurada del puerto Tagger (RF-11 / T7.1 + Blueprint visual híbrido)."""

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
    visual_spec: GarmentVisualSpec | None = Field(
        default=None,
        description="Especificación visual quirúrgica de patronaje para modelado sobre maniquí",
    )
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
