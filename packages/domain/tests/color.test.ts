import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COLOR_SEASONS,
  EYE_SWATCHES,
  HAIR_SWATCHES,
  SEASON_PALETTES,
  SKIN_SWATCHES,
  analyzeColorDimensions,
  ciede2000,
  classifyColorProfile,
  evaluateGarmentColorHarmony,
  getSeasonPalette,
  hexToLab,
  hexToRgb,
  labChroma,
  labHueDeg,
  labToHex,
  labToSrgb,
  normalizeHex,
  rgbToHex,
  srgbToLab,
  type ColorSeasonId,
  type LabColor,
} from '../src/index.js';

describe('Colorimetría: sRGB <-> CIELAB y CIEDE2000 (T8.1)', () => {
  it('convierte hex/sRGB a CIELAB (D65) y de vuelta sin deriva perceptible', () => {
    const samples = ['#FFFFFF', '#000000', '#1F5F6B', '#C45733', '#2A9D8F', '#E6A4B4', '#1D4ED8'];
    for (const hex of samples) {
      const rgb = hexToRgb(hex);
      const lab = srgbToLab(rgb);
      const roundTrip = labToSrgb(lab);
      expect(Math.abs(roundTrip.r - rgb.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(roundTrip.g - rgb.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(roundTrip.b - rgb.b)).toBeLessThanOrEqual(1);
      expect(labToHex(lab)).toMatch(/^#[0-9A-F]{6}$/);
    }

    // Referencia blanca D65: #FFFFFF -> L* = 100, a* ≈ 0, b* ≈ 0
    const white = hexToLab('#ffffff');
    expect(white.l).toBeCloseTo(100, 2);
    expect(Math.abs(white.a)).toBeLessThan(0.05);
    expect(Math.abs(white.b)).toBeLessThan(0.05);

    const black = hexToLab('#000000');
    expect(black.l).toBeCloseTo(0, 2);
    expect(labHueDeg(black)).toBe(0);
    expect(labChroma(black)).toBe(0);

    expect(normalizeHex('1f5f6b')).toBe('#1F5F6B');
    expect(rgbToHex({ r: 300, g: -5, b: 128 })).toBe('#FF0080');
    expect(() => normalizeHex('invalid')).toThrow(RangeError);
  });

  it('reproduce pares oficiales de Sharma, Wu y Dalal (2005) para CIEDE2000 con error < 0.0005', () => {
    // Tabla 1 de Sharma et al. (2005), Color Research & Application 30(1):21-30
    const sharmaPairs: Array<{ lab1: LabColor; lab2: LabColor; expected: number }> = [
      { lab1: { l: 50.0, a: 2.6772, b: -79.7751 }, lab2: { l: 50.0, a: 0.0, b: -82.7485 }, expected: 2.0425 },
      { lab1: { l: 50.0, a: 3.1571, b: -77.2803 }, lab2: { l: 50.0, a: 0.0, b: -82.7485 }, expected: 2.8615 },
      { lab1: { l: 50.0, a: 2.8361, b: -74.0200 }, lab2: { l: 50.0, a: 0.0, b: -82.7485 }, expected: 3.4412 },
      { lab1: { l: 50.0, a: -1.3802, b: -84.2814 }, lab2: { l: 50.0, a: 0.0, b: -82.7485 }, expected: 1.0 },
      { lab1: { l: 50.0, a: -1.1848, b: -84.8006 }, lab2: { l: 50.0, a: 0.0, b: -82.7485 }, expected: 1.0 },
      { lab1: { l: 50.0, a: -0.9009, b: -85.5211 }, lab2: { l: 50.0, a: 0.0, b: -82.7485 }, expected: 1.0 },
      { lab1: { l: 50.0, a: 0.0, b: 0.0 }, lab2: { l: 50.0, a: -1.0, b: 2.0 }, expected: 2.3669 },
      { lab1: { l: 50.0, a: 2.5, b: 0.0 }, lab2: { l: 73.0, a: 25.0, b: -18.0 }, expected: 27.1492 },
      { lab1: { l: 50.0, a: 2.5, b: 0.0 }, lab2: { l: 61.0, a: -5.0, b: 29.0 }, expected: 22.8977 },
      { lab1: { l: 50.0, a: 2.5, b: 0.0 }, lab2: { l: 56.0, a: -27.0, b: -3.0 }, expected: 31.903 },
    ];

    for (const pair of sharmaPairs) {
      const actual = ciede2000(pair.lab1, pair.lab2);
      expect(Math.abs(actual - pair.expected)).toBeLessThan(0.0005);
    }

    // Identidad y simetría
    const a = hexToLab('#2A9D8F');
    const b = hexToLab('#C45733');
    expect(ciede2000(a, a)).toBe(0);
    expect(ciede2000(a, b)).toBeCloseTo(ciede2000(b, a), 10);
    // Rama hue wrap (> 180° y < 360°)
    const redWarm = { l: 55, a: 40, b: 20 };
    const purpleCool = { l: 55, a: 30, b: -35 };
    expect(ciede2000(redWarm, purpleCool)).toBeGreaterThan(15);
    expect(ciede2000(purpleCool, redWarm)).toBeCloseTo(ciede2000(redWarm, purpleCool), 8);
  });
});

describe('Paletas de 12 estaciones y consistencia con config/color_palettes.json (T8.3)', () => {
  it('incluye las 12 estaciones con 12 a 16 colores válidos sincronizados con el JSON', () => {
    expect(COLOR_SEASONS).toHaveLength(12);
    expect(SKIN_SWATCHES.length).toBeGreaterThanOrEqual(8);
    expect(HAIR_SWATCHES.length).toBeGreaterThanOrEqual(8);
    expect(EYE_SWATCHES.length).toBeGreaterThanOrEqual(8);

    const jsonPath = resolve(import.meta.dirname, '../../../config/color_palettes.json');
    const parsed = JSON.parse(readFileSync(jsonPath, 'utf-8')) as {
      sources: string[];
      seasons: Record<ColorSeasonId, { colors: Array<{ name: string; hex: string }> }>;
    };

    expect(parsed.sources.length).toBeGreaterThanOrEqual(2);

    for (const seasonId of COLOR_SEASONS) {
      const palette = getSeasonPalette(seasonId);
      expect(palette.colors.length).toBeGreaterThanOrEqual(12);
      expect(palette.colors.length).toBeLessThanOrEqual(16);
      expect(parsed.seasons[seasonId].colors).toHaveLength(palette.colors.length);
      for (const color of palette.colors) {
        expect(color.hex).toMatch(/^#[0-9A-F]{6}$/);
        expect(color.name.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Árbol de decisión de 12 estaciones y validación con 10 perfiles (T8.4, T8.5, T8.8)', () => {
  it('clasifica 10 perfiles representativos con Top 2 coherente y nivel de confianza válido', () => {
    const validationCases: Array<{
      label: string;
      skinHex: string;
      hairHex: string;
      eyeHex: string;
      expectedFamily: ReadonlyArray<'spring' | 'summer' | 'autumn' | 'winter'>;
    }> = [
      {
        label: 'P1 · Claro dorado (Primavera Clara / Cálida)',
        skinHex: '#F0D5BA',
        hairHex: '#CFA668',
        eyeHex: '#8A733E',
        expectedFamily: ['spring'],
      },
      {
        label: 'P2 · Cobrizo cálido (Primavera / Otoño Cálido)',
        skinHex: '#E8C39E',
        hairHex: '#9E4B27',
        eyeHex: '#A66E2E',
        expectedFamily: ['spring', 'autumn'],
      },
      {
        label: 'P3 · Porcelana rosada y rubio platino (Verano Claro)',
        skinHex: '#F2D6CE',
        hairHex: '#CFC9BF',
        eyeHex: '#6D9DC5',
        expectedFamily: ['summer'],
      },
      {
        label: 'P4 · Medio rosado y castaño ceniza (Verano Frío / Suave)',
        skinHex: '#CFA08E',
        hairHex: '#7D7168',
        eyeHex: '#748594',
        expectedFamily: ['summer'],
      },
      {
        label: 'P5 · Claro oliva suave y castaño miel (Otoño Suave / Cálido)',
        skinHex: '#D7BA98',
        hairHex: '#8C5B35',
        eyeHex: '#8A733E',
        expectedFamily: ['autumn', 'spring'],
      },
      {
        label: 'P6 · Profunda ámbar y castaño oscuro cálido (Otoño Profundo)',
        skinHex: '#885636',
        hairHex: '#3B281E',
        eyeHex: '#3D291E',
        expectedFamily: ['autumn'],
      },
      {
        label: 'P7 · Porcelana fría y negro azabache (Invierno Brillante / Frío)',
        skinHex: '#F2D6CE',
        hairHex: '#1B1C20',
        eyeHex: '#6D9DC5',
        expectedFamily: ['winter'],
      },
      {
        label: 'P8 · Profunda cacao fría y negro azabache (Invierno Profundo)',
        skinHex: '#6D4539',
        hairHex: '#1B1C20',
        eyeHex: '#231D1D',
        expectedFamily: ['winter'],
      },
      {
        label: 'P9 · Media rosada y cabello plata (Verano Frío / Invierno Frío)',
        skinHex: '#CFA08E',
        hairHex: '#A9B0B8',
        eyeHex: '#6D9DC5',
        expectedFamily: ['summer', 'winter'],
      },
      {
        label: 'P10 · Ébano neutra y cabello negro (Invierno Profundo / Otoño Profundo)',
        skinHex: '#4B3129',
        hairHex: '#1B1C20',
        eyeHex: '#231D1D',
        expectedFamily: ['winter', 'autumn'],
      },
    ];

    for (const testCase of validationCases) {
      const dims = analyzeColorDimensions(testCase);
      const result = classifyColorProfile(testCase);

      expect(result.ranked).toHaveLength(12);
      expect(result.primary.seasonId).not.toBe(result.secondary.seasonId);
      expect(result.primary.score).toBeGreaterThanOrEqual(result.secondary.score);
      expect(result.confidence).toBeGreaterThanOrEqual(0.42);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
      expect(result.explanation).toContain('L*');
      expect(dims.contrastDeltaL).toBeGreaterThanOrEqual(0);

      const primaryFamily = SEASON_PALETTES[result.primary.seasonId].family;
      expect(
        testCase.expectedFamily,
        `${testCase.label} -> obtuvo ${result.primary.label} (${primaryFamily})`,
      ).toContain(primaryFamily);
    }
  });
});

describe('Puntaje de armonía de prenda contra paleta (T8.6)', () => {
  it('calcula A = exp(-ΔE₀₀_mín / 15) con desglose y bandas coherentes', () => {
    // Color exacto presente en Otoño Cálido (#1F5F6B Teal petróleo)
    const exact = evaluateGarmentColorHarmony('#1F5F6B', 'warm_autumn');
    expect(exact.minDeltaE00).toBe(0);
    expect(exact.harmonyScore).toBe(1);
    expect(exact.scorePercent).toBe(100);
    expect(exact.band).toBe('excellent');
    expect(exact.closestColor.hex).toBe('#1F5F6B');

    // Color cercano al verde salvia cálido en Otoño Suave
    const near = evaluateGarmentColorHarmony('#7E916F', 'soft_autumn');
    expect(near.minDeltaE00).toBeLessThan(8);
    expect(near.harmonyScore).toBeGreaterThan(0.6);
    expect(['excellent', 'good']).toContain(near.band);

    // Color neón muy alejado de Verano Suave
    const far = evaluateGarmentColorHarmony('#FF3300', 'soft_summer');
    expect(far.minDeltaE00).toBeGreaterThan(15);
    expect(far.harmonyScore).toBeLessThan(0.45);
    expect(['neutral', 'clashing']).toContain(far.band);
    expect(far.reason).toContain('ΔE₀₀');
  });
});
