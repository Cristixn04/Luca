import type { LabColor, RgbColor } from './types.js';

const HEX_PATTERN = /^#?([0-9a-fA-F]{6})$/;
const D65_XN = 0.95047;
const D65_YN = 1.0;
const D65_ZN = 1.08883;
const LAB_EPSILON = 216 / 24389;
const LAB_KAPPA = 24389 / 27;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function normalizeHex(hex: string): string {
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match) {
    throw new RangeError(`Color hexadecimal inválido: "${hex}". Usa formato #RRGGBB.`);
  }
  return `#${match[1]!.toUpperCase()}`;
}

export function hexToRgb(hex: string): RgbColor {
  const clean = normalizeHex(hex).slice(1);
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

export function rgbToHex(rgb: RgbColor): string {
  const clamp = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${clamp(rgb.r)}${clamp(rgb.g)}${clamp(rgb.b)}`;
}

function srgbChannelToLinear(channel01: number): number {
  return channel01 <= 0.04045 ? channel01 / 12.92 : ((channel01 + 0.055) / 1.055) ** 2.4;
}

function linearChannelToSrgb(linear: number): number {
  const clamped = Math.max(0, Math.min(1, linear));
  return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

function labF(t: number): number {
  return t > LAB_EPSILON ? Math.cbrt(t) : (LAB_KAPPA * t + 16) / 116;
}

function labFInv(t: number): number {
  const t3 = t * t * t;
  return t3 > LAB_EPSILON ? t3 : (116 * t - 16) / LAB_KAPPA;
}

/**
 * Convierte sRGB [0..255] a CIELAB (iluminante estándar D65, observador 2°).
 */
export function srgbToLab(rgb: RgbColor): LabColor {
  const r = srgbChannelToLinear(Math.max(0, Math.min(255, rgb.r)) / 255);
  const g = srgbChannelToLinear(Math.max(0, Math.min(255, rgb.g)) / 255);
  const b = srgbChannelToLinear(Math.max(0, Math.min(255, rgb.b)) / 255);

  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

  const fx = labF(x / D65_XN);
  const fy = labF(y / D65_YN);
  const fz = labF(z / D65_ZN);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/**
 * Convierte CIELAB (D65) de vuelta a sRGB [0..255] acotado al gamut sRGB.
 */
export function labToSrgb(lab: LabColor): RgbColor {
  const fy = (lab.l + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;

  const x = labFInv(fx) * D65_XN;
  const y = labFInv(fy) * D65_YN;
  const z = labFInv(fz) * D65_ZN;

  const rLin = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  const gLin = x * -0.969266 + y * 1.8760108 + z * 0.041556;
  const bLin = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

  return {
    r: Math.round(linearChannelToSrgb(rLin) * 255),
    g: Math.round(linearChannelToSrgb(gLin) * 255),
    b: Math.round(linearChannelToSrgb(bLin) * 255),
  };
}

export function hexToLab(hex: string): LabColor {
  return srgbToLab(hexToRgb(hex));
}

export function labToHex(lab: LabColor): string {
  return rgbToHex(labToSrgb(lab));
}

export function labChroma(lab: LabColor): number {
  return Math.hypot(lab.a, lab.b);
}

export function labHueDeg(lab: LabColor): number {
  if (Math.abs(lab.a) < 1e-9 && Math.abs(lab.b) < 1e-9) {
    return 0;
  }
  const deg = Math.atan2(lab.b, lab.a) * RAD_TO_DEG;
  return deg >= 0 ? deg : deg + 360;
}

/**
 * Distancia perceptual CIEDE2000 (ΔE₀₀) según Sharma, Wu y Dalal (2005).
 * Pesos paramétricos kL = kC = kH = 1 por defecto.
 */
export function ciede2000(
  lab1: LabColor,
  lab2: LabColor,
  weights: { kL?: number; kC?: number; kH?: number } = {},
): number {
  const kL = weights.kL ?? 1;
  const kC = weights.kC ?? 1;
  const kH = weights.kH ?? 1;

  const c1 = Math.hypot(lab1.a, lab1.b);
  const c2 = Math.hypot(lab2.a, lab2.b);
  const cBar = (c1 + c2) / 2;
  const cBar7 = cBar ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + 25 ** 7)));

  const a1Prime = (1 + g) * lab1.a;
  const a2Prime = (1 + g) * lab2.a;
  const c1Prime = Math.hypot(a1Prime, lab1.b);
  const c2Prime = Math.hypot(a2Prime, lab2.b);

  const huePrime = (b: number, aPrime: number): number => {
    if (Math.abs(b) < 1e-12 && Math.abs(aPrime) < 1e-12) return 0;
    const deg = Math.atan2(b, aPrime) * RAD_TO_DEG;
    return deg >= 0 ? deg : deg + 360;
  };

  const h1Prime = huePrime(lab1.b, a1Prime);
  const h2Prime = huePrime(lab2.b, a2Prime);

  const deltaLPrime = lab2.l - lab1.l;
  const deltaCPrime = c2Prime - c1Prime;

  let deltaSmallHPrime = 0;
  const cProd = c1Prime * c2Prime;
  if (cProd !== 0) {
    const diff = h2Prime - h1Prime;
    if (Math.abs(diff) <= 180) {
      deltaSmallHPrime = diff;
    } else if (diff > 180) {
      deltaSmallHPrime = diff - 360;
    } else {
      deltaSmallHPrime = diff + 360;
    }
  }

  const deltaBigHPrime = 2 * Math.sqrt(cProd) * Math.sin((deltaSmallHPrime / 2) * DEG_TO_RAD);

  const lBarPrime = (lab1.l + lab2.l) / 2;
  const cBarPrime = (c1Prime + c2Prime) / 2;

  let hBarPrime = h1Prime + h2Prime;
  if (cProd !== 0) {
    if (Math.abs(h1Prime - h2Prime) <= 180) {
      hBarPrime = (h1Prime + h2Prime) / 2;
    } else if (h1Prime + h2Prime < 360) {
      hBarPrime = (h1Prime + h2Prime + 360) / 2;
    } else {
      hBarPrime = (h1Prime + h2Prime - 360) / 2;
    }
  }

  const t =
    1 -
    0.17 * Math.cos((hBarPrime - 30) * DEG_TO_RAD) +
    0.24 * Math.cos(2 * hBarPrime * DEG_TO_RAD) +
    0.32 * Math.cos((3 * hBarPrime + 6) * DEG_TO_RAD) -
    0.2 * Math.cos((4 * hBarPrime - 63) * DEG_TO_RAD);

  const deltaTheta = 30 * Math.exp(-(((hBarPrime - 275) / 25) ** 2));
  const cBarPrime7 = cBarPrime ** 7;
  const rC = 2 * Math.sqrt(cBarPrime7 / (cBarPrime7 + 25 ** 7));

  const lMinus50Sq = (lBarPrime - 50) ** 2;
  const sL = 1 + (0.015 * lMinus50Sq) / Math.sqrt(20 + lMinus50Sq);
  const sC = 1 + 0.045 * cBarPrime;
  const sH = 1 + 0.015 * cBarPrime * t;
  const rT = -Math.sin(2 * deltaTheta * DEG_TO_RAD) * rC;

  const termL = deltaLPrime / (kL * sL);
  const termC = deltaCPrime / (kC * sC);
  const termH = deltaBigHPrime / (kH * sH);

  return Math.sqrt(termL * termL + termC * termC + termH * termH + rT * termC * termH);
}
