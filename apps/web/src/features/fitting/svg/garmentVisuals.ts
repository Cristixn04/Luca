import type { GarmentCategory } from '@luca/domain';
import type { GarmentPattern, GarmentStyle, GarmentVisualSpec } from '@/features/closet/types';
import type {
  ApiClosure,
  ApiColorblockLayout,
  ApiFabricTexture,
  ApiFitCut,
  ApiGarmentLength,
  ApiNeckline,
  ApiPocketStyle,
  ApiSimplePatternType,
  ApiSleeveLength,
  ApiStripeDensity,
  ApiWaistRise,
} from '@/infrastructure/api-client/generated.types';

export interface GarmentVisualMeta {
  readonly name?: string;
  readonly pattern?: GarmentPattern;
  readonly style?: GarmentStyle;
  readonly tags?: readonly string[];
  readonly visualSpec?: GarmentVisualSpec;
  readonly imageUrl?: string;
  readonly backImageUrl?: string;
}

export type UpperVisualSubtype =
  | 'tshirt'
  | 'polo'
  | 'tank'
  | 'shirt'
  | 'hoodie'
  | 'sweater'
  | 'jacket_tailored'
  | 'jacket_casual'
  | 'dress_mini'
  | 'dress_midi'
  | 'dress_maxi';

export type LowerVisualSubtype =
  | 'jeans'
  | 'trousers'
  | 'shorts'
  | 'skirt_mini'
  | 'skirt_midi'
  | 'skirt_maxi';

export interface ResolvedUpperBlueprint {
  readonly subtype: UpperVisualSubtype;
  readonly neckline: Exclude<ApiNeckline, 'none'>;
  readonly sleeveLength: Exclude<ApiSleeveLength, 'none'>;
  readonly garmentLength: Exclude<ApiGarmentLength, 'ankle'>;
  readonly fitCut: ApiFitCut;
  readonly fitBoostPx: number;
  readonly closure: ApiClosure;
  readonly pockets: ApiPocketStyle;
  readonly hasHood: boolean;
  readonly hasRibbedTrim: boolean;
  readonly hasLapels: boolean;
  readonly hasPleats: boolean;
  readonly primaryColorHex?: string;
  readonly secondaryColorHex?: string;
  readonly accentColorHex?: string;
  readonly patternType: ApiSimplePatternType;
  readonly colorblockLayout: ApiColorblockLayout;
  readonly stripeDensity: ApiStripeDensity;
  readonly collarContrast: boolean;
  readonly cuffContrast: boolean;
  readonly buttonCount: number;
  readonly fabricTexture: ApiFabricTexture;
}

export interface ResolvedLowerBlueprint {
  readonly subtype: LowerVisualSubtype;
  readonly garmentLength: 'thigh' | 'knee' | 'midi' | 'maxi' | 'ankle';
  readonly fitCut: ApiFitCut;
  readonly legWidthBoostPx: number;
  readonly closure: ApiClosure;
  readonly pockets: ApiPocketStyle;
  readonly hasPleats: boolean;
  readonly primaryColorHex?: string;
  readonly secondaryColorHex?: string;
  readonly accentColorHex?: string;
  readonly patternType: ApiSimplePatternType;
  readonly stripeDensity: ApiStripeDensity;
  readonly waistRise: ApiWaistRise;
  readonly fabricTexture: ApiFabricTexture;
}

function collectText(meta?: GarmentVisualMeta): string {
  if (!meta) return '';
  return [meta.name ?? '', ...(meta.tags ?? [])].join(' ').toLowerCase();
}

export function isSafeDataImageUrl(url: string | undefined): url is string {
  return typeof url === 'string' && url.startsWith('data:image/');
}

function isValidHex(hex: string | null | undefined): hex is string {
  return typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex);
}

export function resolveUpperSubtype(
  variant: 'tshirt' | 'long_sleeve' | 'jacket' | 'dress',
  meta?: GarmentVisualMeta,
): UpperVisualSubtype {
  const text = collectText(meta);
  const spec = meta?.visualSpec;

  if (variant === 'dress') {
    if (spec?.garment_length === 'thigh' || spec?.garment_length === 'crop') return 'dress_mini';
    if (spec?.garment_length === 'maxi' || spec?.garment_length === 'ankle') return 'dress_maxi';
    if (/\b(mini|corto|short)\b/.test(text)) return 'dress_mini';
    if (/\b(largo|maxi|noche|gala)\b/.test(text)) return 'dress_maxi';
    return 'dress_midi';
  }

  if (variant === 'jacket') {
    if (
      spec?.has_lapels ||
      meta?.style === 'formal' ||
      meta?.style === 'classic' ||
      /\b(blazer|saco|americana|abrigo|gabardina|trench)\b/.test(text)
    ) {
      return 'jacket_tailored';
    }
    return 'jacket_casual';
  }

  if (variant === 'long_sleeve') {
    if (spec?.has_hood || spec?.neckline === 'hood' || /\b(hoodie|capucha|sudadera|buzo)\b/.test(text)) {
      return 'hoodie';
    }
    if (
      spec?.fabric_texture === 'knit' ||
      spec?.fabric_texture === 'ribbed' ||
      spec?.fabric_texture === 'fleece' ||
      /\b(sueter|suéter|sweater|jersey|tejido|punto|knit|pullover|cardigan|cárdigan)\b/.test(text)
    ) {
      return 'sweater';
    }
    return 'shirt';
  }

  if (spec?.neckline === 'polo' || /\b(polo)\b/.test(text)) return 'polo';
  if (
    spec?.sleeve_length === 'sleeveless' ||
    spec?.neckline === 'strapless' ||
    /\b(sin mangas|tirantes|tank|musculosa|esqueleto)\b/.test(text)
  ) {
    return 'tank';
  }
  return 'tshirt';
}

export function resolveLowerSubtype(
  variant: 'pants' | 'shorts' | 'skirt',
  meta?: GarmentVisualMeta,
): LowerVisualSubtype {
  const text = collectText(meta);
  const spec = meta?.visualSpec;

  if (variant === 'shorts') return 'shorts';

  if (variant === 'skirt') {
    if (spec?.garment_length === 'thigh' || /\b(mini|corta|short)\b/.test(text)) {
      return 'skirt_mini';
    }
    if (
      spec?.garment_length === 'maxi' ||
      spec?.garment_length === 'ankle' ||
      /\b(larga|maxi)\b/.test(text)
    ) {
      return 'skirt_maxi';
    }
    return 'skirt_midi';
  }

  if (spec?.fabric_texture === 'denim' || /\b(jean|jeans|denim|vaquero|mezclilla)\b/.test(text)) {
    return 'jeans';
  }
  return 'trousers';
}

export function resolveUpperBlueprint(
  variant: 'tshirt' | 'long_sleeve' | 'jacket' | 'dress',
  meta?: GarmentVisualMeta,
): ResolvedUpperBlueprint {
  const subtype = resolveUpperSubtype(variant, meta);
  const spec = meta?.visualSpec;

  const defaultNeckline: Exclude<ApiNeckline, 'none'> =
    subtype === 'hoodie'
      ? 'hood'
      : subtype === 'polo'
        ? 'polo'
        : subtype === 'shirt'
          ? 'shirt_collar'
          : variant === 'dress'
            ? 'scoop'
            : 'crew';

  const neckline: Exclude<ApiNeckline, 'none'> =
    spec && spec.neckline !== 'none' ? spec.neckline : defaultNeckline;

  const defaultSleeve: Exclude<ApiSleeveLength, 'none'> =
    subtype === 'tank'
      ? 'sleeveless'
      : variant === 'dress'
        ? 'cap'
        : variant === 'long_sleeve' || variant === 'jacket'
          ? 'long'
          : 'short';

  const sleeveLength: Exclude<ApiSleeveLength, 'none'> =
    neckline === 'strapless'
      ? 'sleeveless'
      : spec && spec.sleeve_length !== 'none'
        ? spec.sleeve_length
        : defaultSleeve;

  const defaultLength: Exclude<ApiGarmentLength, 'ankle'> =
    variant === 'dress'
      ? subtype === 'dress_mini'
        ? 'thigh'
        : subtype === 'dress_maxi'
          ? 'maxi'
          : 'midi'
      : 'hip';

  const garmentLength: Exclude<ApiGarmentLength, 'ankle'> =
    spec
      ? spec.garment_length === 'ankle'
        ? 'maxi'
        : spec.garment_length
      : defaultLength;

  const fitCut: ApiFitCut = spec?.fit_cut ?? 'regular';
  const fitCutDelta =
    fitCut === 'skinny' || fitCut === 'fitted'
      ? -0.7
      : fitCut === 'relaxed'
        ? 1.3
        : fitCut === 'oversized'
          ? 2.8
          : 0;

  const baseBulk =
    variant === 'jacket'
      ? 2.6
      : subtype === 'hoodie' || subtype === 'sweater'
        ? 1.8
        : 0;

  const defaultClosure: ApiClosure =
    subtype === 'shirt' || subtype === 'polo'
      ? 'buttons'
      : variant === 'jacket'
        ? subtype === 'jacket_tailored'
          ? 'open_front'
          : 'zipper'
        : 'pullover';

  const defaultPockets: ApiPocketStyle =
    subtype === 'hoodie' ? 'kangaroo' : variant === 'jacket' ? 'side' : 'none';

  const inferredPatternType: ApiSimplePatternType =
    spec?.pattern_type ??
    (meta?.pattern === 'striped'
      ? 'horizontal_stripes'
      : meta?.pattern === 'plaid'
        ? 'plaid'
        : spec?.fabric_texture === 'ribbed'
          ? 'ribbed'
          : 'solid');

  return {
    subtype,
    neckline,
    sleeveLength,
    garmentLength,
    fitCut,
    fitBoostPx: Math.max(-0.8, baseBulk + fitCutDelta),
    closure: spec?.closure ?? defaultClosure,
    pockets: spec?.pockets ?? defaultPockets,
    hasHood: spec ? spec.has_hood || spec.neckline === 'hood' : subtype === 'hoodie',
    hasRibbedTrim: spec ? spec.has_ribbed_trim : subtype === 'hoodie' || subtype === 'sweater',
    hasLapels: spec ? spec.has_lapels : variant === 'jacket',
    hasPleats: spec ? spec.has_pleats : variant === 'dress',
    primaryColorHex: isValidHex(spec?.primary_color_hex) ? spec.primary_color_hex : undefined,
    secondaryColorHex: isValidHex(spec?.secondary_color_hex) ? spec.secondary_color_hex : undefined,
    accentColorHex: isValidHex(spec?.accent_color_hex) ? spec.accent_color_hex : undefined,
    patternType: inferredPatternType,
    colorblockLayout: spec?.colorblock_layout ?? 'none',
    stripeDensity: spec?.stripe_density ?? 'medium',
    collarContrast: Boolean(spec?.collar_contrast),
    cuffContrast: Boolean(spec?.cuff_contrast),
    buttonCount: spec?.button_count ?? (defaultClosure === 'buttons' ? 5 : 0),
    fabricTexture: spec?.fabric_texture ?? 'smooth',
  };
}

export function resolveLowerBlueprint(
  variant: 'pants' | 'shorts' | 'skirt',
  meta?: GarmentVisualMeta,
): ResolvedLowerBlueprint {
  const subtype = resolveLowerSubtype(variant, meta);
  const spec = meta?.visualSpec;

  const defaultLength: ResolvedLowerBlueprint['garmentLength'] =
    variant === 'shorts'
      ? 'thigh'
      : variant === 'skirt'
        ? subtype === 'skirt_mini'
          ? 'thigh'
          : subtype === 'skirt_maxi'
            ? 'maxi'
            : 'midi'
        : 'ankle';

  let garmentLength: ResolvedLowerBlueprint['garmentLength'] = defaultLength;
  if (spec) {
    if (
      spec.garment_length === 'thigh' ||
      spec.garment_length === 'knee' ||
      spec.garment_length === 'midi' ||
      spec.garment_length === 'maxi' ||
      spec.garment_length === 'ankle'
    ) {
      garmentLength = spec.garment_length;
    } else if (spec.garment_length === 'crop' && variant === 'pants') {
      garmentLength = 'midi';
    }
  }

  const fitCut: ApiFitCut = spec?.fit_cut ?? 'regular';
  const legWidthBoostPx =
    fitCut === 'skinny'
      ? -1.6
      : fitCut === 'fitted'
        ? -0.8
        : fitCut === 'relaxed'
          ? 2.2
          : fitCut === 'wide_leg' || fitCut === 'oversized'
            ? 5.0
            : fitCut === 'flared'
              ? 3.8
              : 0;

  const inferredLowerPattern: ApiSimplePatternType =
    spec?.pattern_type ??
    (meta?.pattern === 'striped'
      ? 'vertical_stripes'
      : meta?.pattern === 'plaid'
        ? 'plaid'
        : spec?.fabric_texture === 'ribbed'
          ? 'ribbed'
          : 'solid');

  return {
    subtype,
    garmentLength,
    fitCut,
    legWidthBoostPx,
    closure: spec?.closure ?? (variant === 'skirt' ? 'zipper' : 'buttons'),
    pockets: spec?.pockets ?? (variant === 'skirt' ? 'none' : 'side'),
    hasPleats: spec ? spec.has_pleats || spec.fit_cut === 'pleated' : variant === 'skirt',
    primaryColorHex: isValidHex(spec?.primary_color_hex) ? spec.primary_color_hex : undefined,
    secondaryColorHex: isValidHex(spec?.secondary_color_hex) ? spec.secondary_color_hex : undefined,
    accentColorHex: isValidHex(spec?.accent_color_hex) ? spec.accent_color_hex : undefined,
    patternType: inferredLowerPattern,
    stripeDensity: spec?.stripe_density ?? 'medium',
    waistRise: spec?.waist_rise ?? 'mid',
    fabricTexture: spec?.fabric_texture ?? (subtype === 'jeans' ? 'denim' : 'smooth'),
  };
}

export function resolveGarmentAccentStroke(hex: string | undefined): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return 'rgb(21 20 19 / 45%)';
  }
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.25 ? 'rgb(255 255 255 / 34%)' : 'rgb(21 20 19 / 42%)';
}

export function resolveGarmentSeamColor(hex: string | undefined): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return 'rgb(21 20 19 / 28%)';
  }
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.28 ? 'rgb(255 255 255 / 26%)' : 'rgb(21 20 19 / 26%)';
}

export function resolveGarmentButtonColor(hex: string | undefined): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return '#EAE6DE';
  }
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.35 ? '#E6E2DA' : '#3C3935';
}

export function inferCategoryFromCategory(category: GarmentCategory): 'upper' | 'lower' {
  return category === 'pants' || category === 'shorts' || category === 'skirt' ? 'lower' : 'upper';
}
