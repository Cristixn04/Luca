export const DOMAIN_VERSION = '0.1.0' as const;

export {
  CM_PER_INCH,
  MEASUREMENT_UNITS,
  cmToInches,
  fromCm,
  inchesToCm,
  toCm,
  type MeasurementUnit,
} from './units.js';

export {
  AVATAR_VIEWS,
  BODY_SECTIONS,
  type AllViewProjections,
  type AvatarView,
  type BodyMeasurements,
  type BodyModel,
  type BodySection,
  type EllipseSection,
  type OptionalBodyMeasurements,
  type ProjectedPoint,
  type ProjectedZoneBand,
  type RequiredBodyMeasurements,
  type ValidationIssue,
  type ValidationResult,
  type VerticalLandmarksCm,
  type ViewProjection,
} from './body/types.js';

export {
  OPTIONAL_RANGES_CM,
  REQUIRED_RANGES_CM,
  convertBodyMeasurements,
  validateBodyMeasurements,
  type MeasurementRangeCm,
} from './body/validation.js';

export {
  DEFAULT_DEPTH_RATIOS,
  ramanujanPerimeter,
  solveEllipseSection,
  solveGarmentSection,
} from './body/ellipse.js';

export { createBodyModel } from './body/model.js';

export {
  projectAllViews,
  projectBack,
  projectFront,
  projectSide,
} from './body/projections.js';

export { renderThreeViewWireframeSvg } from './body/wireframe.js';

export {
  FIT_PREFERENCES,
  FIT_STATES,
  FIT_ZONES,
  GARMENT_CATEGORIES,
  type FitBandsConfig,
  type FitPreference,
  type FitReport,
  type FitState,
  type FitZone,
  type GarmentCategory,
  type GarmentFlatMeasurements,
  type GarmentSizeInput,
  type SemiOpenBand,
  type SizeEvaluation,
  type SizeRecommendation,
  type ZoneBandThresholds,
  type ZoneFitResult,
} from './fit/types.js';

export {
  DEFAULT_FIT_BANDS_CONFIG,
  getRelevantZones,
  getZoneThresholds,
  validateFitBandsConfig,
} from './fit/bands.js';

export { evaluateGarmentFit, evaluateZoneFit, type EvaluateZoneInput } from './fit/engine.js';

export { recommendSize } from './fit/recommender.js';

export {
  COLOR_SEASONS,
  type ChromaLevel,
  type ColorProfileDimensions,
  type ColorProfileResult,
  type ColorSeasonId,
  type ColorSwatchesInput,
  type GarmentColorHarmony,
  type GuidedSwatchOption,
  type HarmonyBand,
  type LabColor,
  type PaletteColor,
  type PaletteColorRole,
  type RgbColor,
  type SeasonCandidate,
  type SeasonFamily,
  type SeasonPalette,
  type Undertone,
  type ValueLevel,
} from './color/types.js';

export {
  ciede2000,
  hexToLab,
  hexToRgb,
  labChroma,
  labHueDeg,
  labToHex,
  labToSrgb,
  normalizeHex,
  rgbToHex,
  srgbToLab,
} from './color/cielab.js';

export {
  EYE_SWATCHES,
  HAIR_SWATCHES,
  SEASON_PALETTES,
  SKIN_SWATCHES,
  getSeasonPalette,
} from './color/palettes.js';

export { analyzeColorDimensions, classifyColorProfile } from './color/classifier.js';

export { evaluateGarmentColorHarmony } from './color/harmony.js';

export {
  OCCASION_RULES,
  OUTFIT_OCCASIONS,
  classifyTemperatureBand,
  getGarmentSlot,
  type ColorHarmonyMode,
  type GarmentUsageMetrics,
  type OccasionRule,
  type OutfitGarmentInput,
  type OutfitGenerationContext,
  type OutfitOccasion,
  type OutfitProposal,
  type OutfitScoreBreakdown,
  type OutfitSlot,
  type TemperatureBand,
  type WishlistUnlockResult,
} from './outfits/types.js';

export {
  OUTFIT_SCORE_WEIGHTS,
  generateAllOutfitCandidates,
  generateDiverseOutfits,
  scoreOutfitCandidate,
} from './outfits/engine.js';

export {
  DEFAULT_EXPECTED_WEARS,
  VERSATILITY_SCORE_THRESHOLD,
  analyzeClosetUsage,
  computeCpw,
  computeProjectedCpw,
  simulateWishlistUnlock,
} from './outfits/metrics.js';
