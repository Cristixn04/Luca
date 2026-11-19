import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AVATAR_VIEWS,
  DEFAULT_FIT_BANDS_CONFIG,
  DOMAIN_VERSION,
  FIT_STATES,
  MEASUREMENT_UNITS,
  cmToInches,
  fromCm,
  inchesToCm,
  toCm,
  validateFitBandsConfig,
  type FitBandsConfig,
} from '../src/index.js';

function collectTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectTsFiles(fullPath));
    } else if (entry.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('@luca/domain · fundaciones y pureza arquitectónica', () => {
  it('expone metadatos y vocabularios base esperados', () => {
    expect(DOMAIN_VERSION).toBe('0.1.0');
    expect(FIT_STATES).toEqual(['tense', 'tight', 'regular', 'loose', 'oversize']);
    expect(AVATAR_VIEWS).toEqual(['front', 'side', 'back']);
    expect(MEASUREMENT_UNITS).toEqual(['cm', 'in']);
  });

  it('convierte centímetros y pulgadas de forma determinista', () => {
    expect(cmToInches(0)).toBe(0);
    expect(cmToInches(2.54)).toBe(1);
    expect(cmToInches(92)).toBe(36.22);

    expect(inchesToCm(0)).toBe(0);
    expect(inchesToCm(1)).toBe(2.54);
    expect(inchesToCm(36)).toBe(91.44);

    expect(toCm(92, 'cm')).toBe(92);
    expect(toCm(10, 'in')).toBe(25.4);
    expect(fromCm(92.126, 'cm')).toBe(92.13);
    expect(fromCm(25.4, 'in')).toBe(10);
  });

  it('rechaza medidas negativas o no finitas en las conversiones', () => {
    expect(() => cmToInches(-1)).toThrow(RangeError);
    expect(() => cmToInches(Number.NaN)).toThrow(RangeError);
    expect(() => cmToInches(Number.POSITIVE_INFINITY)).toThrow(RangeError);

    expect(() => inchesToCm(-0.5)).toThrow(RangeError);
    expect(() => inchesToCm(Number.NaN)).toThrow(RangeError);
    expect(() => inchesToCm(Number.NEGATIVE_INFINITY)).toThrow(RangeError);
  });

  it('mantiene DEFAULT_FIT_BANDS_CONFIG sincronizado con config/fit_bands.json y sin huecos', () => {
    const configPath = resolve(import.meta.dirname, '../../../config/fit_bands.json');
    const jsonConfig = JSON.parse(readFileSync(configPath, 'utf-8')) as FitBandsConfig;

    expect(jsonConfig).toEqual(DEFAULT_FIT_BANDS_CONFIG);
    expect(() => validateFitBandsConfig(jsonConfig)).not.toThrow();
  });

  it('garantiza aislamiento del dominio: tsconfig sin DOM ni tipos de runtime', () => {
    const tsconfigPath = resolve(import.meta.dirname, '../tsconfig.json');
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8')) as {
      compilerOptions: { lib?: string[]; types?: string[] };
    };

    const libs = (tsconfig.compilerOptions.lib ?? []).map((item) => item.toLowerCase());
    expect(libs).not.toContain('dom');
    expect(libs).not.toContain('dom.iterable');
    expect(tsconfig.compilerOptions.types).toEqual([]);
  });

  it('garantiza que src/ no importa APIs de navegador, red ni frameworks', () => {
    const srcDir = resolve(import.meta.dirname, '../src');
    const files = collectTsFiles(srcDir);
    expect(files.length).toBeGreaterThan(0);

    const forbiddenPatterns = [
      /\bfrom\s+['"](react|react-dom|dexie|axios|node:)/,
      /\b(window|document|navigator|localStorage|sessionStorage|indexedDB|fetch)\b/,
    ];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      for (const pattern of forbiddenPatterns) {
        expect(content, `Uso prohibido detectado en ${file}`).not.toMatch(pattern);
      }
    }
  });
});
