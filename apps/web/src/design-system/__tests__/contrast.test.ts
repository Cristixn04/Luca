import { FIT_STATES } from '@luca/domain';
import { describe, expect, it } from 'vitest';
import { COLOR_TOKENS, HEATMAP_TOKENS } from '../tokens';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = Number.parseInt(clean.slice(0, 2), 16) / 255;
  const g = Number.parseInt(clean.slice(2, 4), 16) / 255;
  const b = Number.parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function linearize(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Design System · Contraste WCAG 2.2 AA (T0.4)', () => {
  const WCAG_AA_TEXT = 4.5;

  for (const mode of ['light', 'dark'] as const) {
    describe(`tema ${mode}`, () => {
      const palette = COLOR_TOKENS[mode];

      it('cumple ≥ 4.5:1 para --ink sobre --bg y --surface', () => {
        expect(contrastRatio(palette.ink, palette.bg)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
        expect(contrastRatio(palette.ink, palette.surface)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
      });

      it('cumple ≥ 4.5:1 para --muted sobre --bg y --surface', () => {
        expect(contrastRatio(palette.muted, palette.bg)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
        expect(contrastRatio(palette.muted, palette.surface)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
      });

      it('cumple ≥ 4.5:1 para --accent sobre --bg y --surface', () => {
        expect(contrastRatio(palette.accent, palette.bg)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
        expect(contrastRatio(palette.accent, palette.surface)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
      });

      it('cumple ≥ 4.5:1 para --accent-ink sobre --accent', () => {
        expect(contrastRatio(palette.accentInk, palette.accent)).toBeGreaterThanOrEqual(
          WCAG_AA_TEXT,
        );
      });
    });
  }

  it('cubre todos los estados de calce con colores hex válidos y patrones únicos', () => {
    expect(HEATMAP_TOKENS.map((item) => item.state)).toEqual([...FIT_STATES]);

    const patterns = new Set(HEATMAP_TOKENS.map((item) => item.pattern));
    expect(patterns.size).toBe(FIT_STATES.length);

    for (const token of HEATMAP_TOKENS) {
      expect(token.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
