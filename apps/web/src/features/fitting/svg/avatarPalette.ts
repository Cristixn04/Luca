import type { CSSProperties } from 'react';
import { DEFAULT_COLOR_SWATCHES, useColorStore } from '@/features/color/colorStore';

export interface AvatarColorSwatches {
  readonly skinHex: string;
  readonly hairHex: string;
  readonly eyeHex: string;
}

export interface ResolvedAvatarPalette {
  readonly skinHighlight: string;
  readonly skinMid: string;
  readonly skinShadow: string;
  readonly skinRim: string;
  readonly skinStroke: string;
  readonly skinDetail: string;
  readonly skinShadeDeep: string;
  readonly muscleShadeTop: string;
  readonly muscleShadeBottom: string;
  readonly coreShadeTop: string;
  readonly coreShadeMid: string;
  readonly coreShadeBottom: string;
  readonly aoCenter: string;
  readonly aoMid: string;
  readonly aoEdge: string;
  readonly neckShadowTop: string;
  readonly neckShadowMid: string;
  readonly neckShadowBottom: string;
  readonly skinSheenCenter: string;
  readonly skinSheenMid: string;
  readonly skinSheenEdge: string;
  readonly cheekBlush: string;
  readonly cheekBlushEdge: string;
  readonly lipUpper: string;
  readonly lipLower: string;
  readonly hairDark: string;
  readonly hairMid: string;
  readonly hairHighlight: string;
  readonly browColor: string;
  readonly irisBase: string;
  readonly irisRim: string;
  readonly irisGlow: string;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string, fallback: string): Rgb {
  const safe = HEX_RE.test(hex) ? hex : fallback;
  return {
    r: Number.parseInt(safe.slice(1, 3), 16),
    g: Number.parseInt(safe.slice(3, 5), 16),
    b: Number.parseInt(safe.slice(5, 7), 16),
  };
}

function toHex(rgb: Rgb): string {
  const h = (v: number) => clampByte(v).toString(16).padStart(2, '0');
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`;
}

function toRgba(rgb: Rgb, alpha: number): string {
  return `rgba(${clampByte(rgb.r)}, ${clampByte(rgb.g)}, ${clampByte(rgb.b)}, ${alpha.toFixed(3)})`;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.max(0, Math.min(1, t));
  return {
    r: a.r + (b.r - a.r) * k,
    g: a.g + (b.g - a.g) * k,
    b: a.b + (b.b - a.b) * k,
  };
}

function luminance(rgb: Rgb): number {
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

const WARM_LIGHT: Rgb = { r: 255, g: 245, b: 235 };
const WARM_SHADOW_ANCHOR: Rgb = { r: 78, g: 38, b: 24 };
const DEEP_INK_ANCHOR: Rgb = { r: 26, g: 18, b: 14 };
const LIP_ROSE_ANCHOR: Rgb = { r: 176, g: 94, b: 86 };
const CHEEK_ANCHOR: Rgb = { r: 204, g: 102, b: 92 };
const BLACK: Rgb = { r: 16, g: 12, b: 10 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

/**
 * Deriva una paleta completa y armónica para piel, cabello y ojos a partir de los
 * valores del apartado Color (soportando desde pieles muy claras hasta muy oscuras,
 * cabello rubio/pelirrojo/castaño/negro/plata y cualquier color de iris).
 */
export function resolveAvatarPalette(swatches: AvatarColorSwatches): ResolvedAvatarPalette {
  const skin = parseHex(swatches.skinHex, DEFAULT_COLOR_SWATCHES.skinHex);
  const hair = parseHex(swatches.hairHex, DEFAULT_COLOR_SWATCHES.hairHex);
  const eye = parseHex(swatches.eyeHex, DEFAULT_COLOR_SWATCHES.eyeHex);

  const skinLum = luminance(skin);
  const hairLum = luminance(hair);

  // Piel: highlight cálido y sombra orgánica sin volverse gris
  const highlightMix = skinLum > 0.78 ? 0.28 : skinLum < 0.32 ? 0.24 : 0.34;
  const shadowMix = skinLum < 0.32 ? 0.42 : 0.32;
  const skinHighlightRgb = mix(skin, WARM_LIGHT, highlightMix);
  const skinShadowRgb = mix(skin, WARM_SHADOW_ANCHOR, shadowMix);
  const skinRimRgb = mix(skin, WARM_LIGHT, highlightMix * 0.55);
  const skinStrokeRgb = mix(skinShadowRgb, DEEP_INK_ANCHOR, 0.84);
  const skinDetailRgb = mix(skinShadowRgb, DEEP_INK_ANCHOR, 0.52);
  const skinDeepRgb = mix(skinShadowRgb, WARM_SHADOW_ANCHOR, 0.48);

  // Labios y rubor adaptados al tono de piel
  const lipBase = mix(skinShadowRgb, LIP_ROSE_ANCHOR, skinLum < 0.34 ? 0.36 : 0.54);
  const lipUpperRgb = mix(lipBase, DEEP_INK_ANCHOR, 0.16);
  const lipLowerRgb = mix(lipBase, WARM_LIGHT, 0.14);
  const cheekRgb = mix(skin, CHEEK_ANCHOR, 0.58);

  // Cabello en 3 tonos (raíz/sombra, medio, brillo) + cejas siempre legibles
  const hairDarkRgb = mix(hair, BLACK, hairLum > 0.65 ? 0.38 : 0.46);
  const hairHiRgb = mix(hair, WARM_LIGHT, hairLum < 0.18 ? 0.26 : hairLum > 0.72 ? 0.34 : 0.32);
  const browRgb = hairLum > 0.62 ? mix(hair, WARM_SHADOW_ANCHOR, 0.48) : hairDarkRgb;

  // Ojos: anillo limbal oscuro + iris elegido + media luna luminosa inferior
  const irisRimRgb = mix(eye, BLACK, 0.52);
  const irisGlowRgb = mix(eye, WHITE, 0.38);

  const shadeBoost = skinLum < 0.35 ? 1.15 : 1.0;
  // Brillo especular cálido adaptado al tono de piel (evita efecto tiza en pieles oscuras)
  const sheenRgb = mix(skin, WARM_LIGHT, skinLum < 0.45 ? 0.44 : 0.76);
  const sheenCenterAlpha = skinLum < 0.45 ? 0.24 : 0.44;
  const sheenMidAlpha = skinLum < 0.45 ? 0.09 : 0.16;

  return {
    skinHighlight: toHex(skinHighlightRgb),
    skinMid: toHex(skin),
    skinShadow: toHex(skinShadowRgb),
    skinRim: toHex(skinRimRgb),
    skinStroke: toHex(skinStrokeRgb),
    skinDetail: toRgba(skinDetailRgb, 0.62),
    skinShadeDeep: toRgba(skinDeepRgb, 0.38 * shadeBoost),
    muscleShadeTop: toRgba(skinDeepRgb, 0.42 * shadeBoost),
    muscleShadeBottom: toRgba(skinDeepRgb, 0.14 * shadeBoost),
    coreShadeTop: toRgba(skinDeepRgb, 0.54 * shadeBoost),
    coreShadeMid: toRgba(skinDeepRgb, 0.26 * shadeBoost),
    coreShadeBottom: toRgba(skinDeepRgb, 0.05),
    aoCenter: toRgba(skinDetailRgb, 0.46 * shadeBoost),
    aoMid: toRgba(skinDeepRgb, 0.2 * shadeBoost),
    aoEdge: toRgba(skinDeepRgb, 0),
    neckShadowTop: toRgba(skinDetailRgb, 0.54 * shadeBoost),
    neckShadowMid: toRgba(skinDeepRgb, 0.18 * shadeBoost),
    neckShadowBottom: toRgba(skinDeepRgb, 0),
    skinSheenCenter: toRgba(sheenRgb, sheenCenterAlpha),
    skinSheenMid: toRgba(sheenRgb, sheenMidAlpha),
    skinSheenEdge: toRgba(sheenRgb, 0),
    cheekBlush: toRgba(cheekRgb, skinLum < 0.35 ? 0.2 : 0.26),
    cheekBlushEdge: toRgba(cheekRgb, 0),
    lipUpper: toHex(lipUpperRgb),
    lipLower: toHex(lipLowerRgb),
    hairDark: toHex(hairDarkRgb),
    hairMid: toHex(hair),
    hairHighlight: toHex(hairHiRgb),
    browColor: toHex(browRgb),
    irisBase: toHex(eye),
    irisRim: toHex(irisRimRgb),
    irisGlow: toHex(irisGlowRgb),
  };
}

export function avatarPaletteToCssVars(palette: ResolvedAvatarPalette): CSSProperties {
  return {
    '--mannequin-highlight': palette.skinHighlight,
    '--mannequin-mid': palette.skinMid,
    '--mannequin-shadow': palette.skinShadow,
    '--mannequin-rim': palette.skinRim,
    '--mannequin-stroke': palette.skinStroke,
    '--mannequin-detail': palette.skinDetail,
    '--mannequin-shade-deep': palette.skinShadeDeep,
    '--avatar-muscle-top': palette.muscleShadeTop,
    '--avatar-muscle-bottom': palette.muscleShadeBottom,
    '--avatar-core-top': palette.coreShadeTop,
    '--avatar-core-mid': palette.coreShadeMid,
    '--avatar-core-bottom': palette.coreShadeBottom,
    '--avatar-ao-center': palette.aoCenter,
    '--avatar-ao-mid': palette.aoMid,
    '--avatar-ao-edge': palette.aoEdge,
    '--avatar-neck-top': palette.neckShadowTop,
    '--avatar-neck-mid': palette.neckShadowMid,
    '--avatar-neck-bottom': palette.neckShadowBottom,
    '--avatar-sheen-center': palette.skinSheenCenter,
    '--avatar-sheen-mid': palette.skinSheenMid,
    '--avatar-sheen-edge': palette.skinSheenEdge,
    '--avatar-cheek': palette.cheekBlush,
    '--avatar-cheek-edge': palette.cheekBlushEdge,
    '--avatar-lip': palette.lipLower,
    '--avatar-lip-upper': palette.lipUpper,
    '--avatar-hair-dark': palette.hairDark,
    '--avatar-hair-mid': palette.hairMid,
    '--avatar-hair-hi': palette.hairHighlight,
    '--avatar-brow': palette.browColor,
    '--avatar-iris': palette.irisBase,
    '--avatar-iris-rim': palette.irisRim,
    '--avatar-iris-glow': palette.irisGlow,
  } as CSSProperties;
}

/**
 * Hook reactivo conectado al apartado Color: devuelve la paleta y variables CSS
 * listas para aplicarse directamente al SVG del avatar (en Probador, Outfits y Clóset).
 */
export function useAvatarColorStyle(): {
  swatches: AvatarColorSwatches;
  palette: ResolvedAvatarPalette;
  cssVars: CSSProperties;
} {
  const draft = useColorStore((s) => s.draftSwatches);
  const profile = useColorStore((s) => s.profile);

  const swatches: AvatarColorSwatches = draft
    ? draft
    : profile
      ? { skinHex: profile.skinHex, hairHex: profile.hairHex, eyeHex: profile.eyeHex }
      : {
          skinHex: '#E6BA9C',
          hairHex: '#573A2A',
          eyeHex: '#5B3D28',
        };

  const palette = resolveAvatarPalette(swatches);
  return {
    swatches,
    palette,
    cssVars: avatarPaletteToCssVars(palette),
  };
}
