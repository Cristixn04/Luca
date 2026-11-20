import type { GarmentCategory } from '@luca/domain';
import type { GarmentPattern, GarmentStyle } from '@/features/closet/types';

export interface GarmentVisualMeta {
  readonly name?: string;
  readonly pattern?: GarmentPattern;
  readonly style?: GarmentStyle;
  readonly tags?: readonly string[];
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

function collectText(meta?: GarmentVisualMeta): string {
  if (!meta) return '';
  return [meta.name ?? '', ...(meta.tags ?? [])].join(' ').toLowerCase();
}

export function isSafeDataImageUrl(url: string | undefined): url is string {
  return typeof url === 'string' && url.startsWith('data:image/');
}

export function resolveUpperSubtype(
  variant: 'tshirt' | 'long_sleeve' | 'jacket' | 'dress',
  meta?: GarmentVisualMeta,
): UpperVisualSubtype {
  const text = collectText(meta);

  if (variant === 'dress') {
    if (/\b(mini|corto|short)\b/.test(text)) return 'dress_mini';
    if (/\b(largo|maxi|noche|gala)\b/.test(text)) return 'dress_maxi';
    return 'dress_midi';
  }

  if (variant === 'jacket') {
    if (
      meta?.style === 'formal' ||
      meta?.style === 'classic' ||
      /\b(blazer|saco|americana|abrigo|gabardina|trench)\b/.test(text)
    ) {
      return 'jacket_tailored';
    }
    return 'jacket_casual';
  }

  if (variant === 'long_sleeve') {
    if (/\b(hoodie|capucha|sudadera|buzo)\b/.test(text)) {
      return 'hoodie';
    }
    if (/\b(sueter|suéter|sweater|jersey|tejido|punto|knit|pullover|cardigan|cárdigan)\b/.test(text)) {
      return 'sweater';
    }
    return 'shirt';
  }

  // tshirt
  if (/\b(polo)\b/.test(text)) return 'polo';
  if (/\b(sin mangas|tirantes|tank|musculosa|esqueleto)\b/.test(text)) return 'tank';
  return 'tshirt';
}

export function resolveLowerSubtype(
  variant: 'pants' | 'shorts' | 'skirt',
  meta?: GarmentVisualMeta,
): LowerVisualSubtype {
  const text = collectText(meta);

  if (variant === 'shorts') return 'shorts';

  if (variant === 'skirt') {
    if (/\b(mini|corta|short)\b/.test(text)) return 'skirt_mini';
    if (/\b(larga|maxi)\b/.test(text)) return 'skirt_maxi';
    return 'skirt_midi';
  }

  if (/\b(jean|jeans|denim|vaquero|mezclilla)\b/.test(text)) {
    return 'jeans';
  }
  return 'trousers';
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
