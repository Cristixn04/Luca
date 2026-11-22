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

DesignComplexityLiteral = Literal[
    "solid",
    "simple_pattern",
    "complex_rejected",
]

SimplePatternTypeLiteral = Literal[
    "solid",
    "horizontal_stripes",
    "vertical_stripes",
    "plaid",
    "dots",
    "colorblock",
    "ribbed",
]

ColorblockLayoutLiteral = Literal[
    "none",
    "raglan_sleeves",
    "top_bottom_split",
    "chest_band",
    "side_panels",
]

StripeDensityLiteral = Literal["fine", "medium", "wide"]

WaistRiseLiteral = Literal["low", "mid", "high", "none"]


class GarmentVisualSpec(BaseModel):
    """Ficha estructural quirúrgica del gemelo digital para reconstrucción fiel sobre el avatar."""

    design_supported: bool = True
    design_complexity: DesignComplexityLiteral = "solid"
    rejection_reason: str | None = None
    primary_color_hex: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    pattern_type: SimplePatternTypeLiteral = "solid"
    colorblock_layout: ColorblockLayoutLiteral = "none"
    stripe_density: StripeDensityLiteral = "medium"
    waist_rise: WaistRiseLiteral = "mid"
    button_count: int = Field(default=0, ge=0, le=12)
    collar_contrast: bool = False
    cuff_contrast: bool = False
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
    """Salida JSON estructurada del agente de gemelo digital (RF-11 / T7.1 + Blueprint v2)."""

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
    suggested_name: str | None = Field(
        default=None,
        max_length=120,
        description="Nombre sugerido en español para la prenda detectada",
    )
    estimated_elasticity: float | None = Field(
        default=None,
        ge=0.0,
        le=0.25,
        description="Elasticidad estimada del tejido (0.0 plana a 0.25 elastano)",
    )
    design_supported: bool = True
    rejection_reason: str | None = None
    visual_spec: GarmentVisualSpec | None = Field(
        default=None,
        description="Especificación visual quirúrgica de patronaje para modelado sobre avatar 2D",
    )
    provider: str = "unknown"


class Tagger(Protocol):
    """Puerto hexagonal para análisis quirúrgico y generación del gemelo digital desde 1 o 2 fotos."""

    @property
    def provider_name(self) -> str: ...

    def tag_garment(
        self,
        front_image_bytes: bytes,
        back_image_bytes: bytes | None = None,
        target_category: GarmentCategoryLiteral | None = None,
    ) -> GarmentTagSuggestion | None: ...
