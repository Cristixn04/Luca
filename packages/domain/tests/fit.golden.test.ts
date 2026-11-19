import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FIT_BANDS_CONFIG,
  evaluateGarmentFit,
  evaluateZoneFit,
  recommendSize,
  validateFitBandsConfig,
  type BodyMeasurements,
  type FitBandsConfig,
  type FitState,
  type FitZone,
  type GarmentCategory,
  type GarmentSizeInput,
} from '../src/index.js';

interface GoldenFitCase {
  id: string;
  category: GarmentCategory;
  zone: FitZone;
  bodyMeasureCm: number;
  garmentMeasureCm: number;
  elasticity: number;
  expectedEaseCm: number;
  expectedState: FitState;
  expectedElasticCompensated: boolean;
}

const fixturesPath = resolve(import.meta.dirname, '../fixtures/fit_golden_cases.json');
const GOLDEN_CASES = JSON.parse(readFileSync(fixturesPath, 'utf-8')) as GoldenFitCase[];

const BASE_BODY: BodyMeasurements = {
  required: {
    height: 175,
    shoulders: 44,
    chest: 92,
    waist: 78,
    hip: 98,
    inseam: 80,
  },
};

describe('Motor de calce · 30+ casos golden (T1.3 y T1.7)', () => {
  it('carga al menos 30 casos golden verificados', () => {
    expect(GOLDEN_CASES.length).toBeGreaterThanOrEqual(30);
  });

  it.each(GOLDEN_CASES)('$id', (testCase) => {
    const result = evaluateZoneFit({
      category: testCase.category,
      zone: testCase.zone,
      bodyMeasureCm: testCase.bodyMeasureCm,
      garmentMeasureCm: testCase.garmentMeasureCm,
      elasticity: testCase.elasticity,
    });

    expect(result.easeCm).toBeCloseTo(testCase.expectedEaseCm, 2);
    expect(result.state).toBe(testCase.expectedState);
    expect(result.elasticCompensated).toBe(testCase.expectedElasticCompensated);
  });

  it('evalúa una prenda completa e informa zonas evaluadas y faltantes', () => {
    const report = evaluateGarmentFit(BASE_BODY, {
      category: 'tshirt',
      sizeLabel: 'M',
      elasticity: 0.05,
      flatMeasuresCm: {
        chestFlat: 50, // 100 - 92 = +8 -> regular
        shoulders: 45.5, // +1.5 -> regular
      },
    });

    expect(report.evaluatedZones).toHaveLength(2);
    expect(report.missingZones).toEqual(['back']);
    expect(report.overallState).toBe('regular');
    expect(report.hasTenseZone).toBe(false);
  });
});

describe('Recomendador de talla (T1.6)', () => {
  const TSHIRT_SIZES: readonly GarmentSizeInput[] = [
    {
      category: 'tshirt',
      sizeLabel: 'XS',
      elasticity: 0,
      flatMeasuresCm: { chestFlat: 44, shoulders: 41, backWidth: 37 }, // tenso
    },
    {
      category: 'tshirt',
      sizeLabel: 'S',
      elasticity: 0,
      flatMeasuresCm: { chestFlat: 47, shoulders: 44, backWidth: 40.5 }, // tight (+2, 0, +0.9)
    },
    {
      category: 'tshirt',
      sizeLabel: 'M',
      elasticity: 0,
      flatMeasuresCm: { chestFlat: 50, shoulders: 46, backWidth: 42.5 }, // regular (+8, +2, +2.9)
    },
    {
      category: 'tshirt',
      sizeLabel: 'L',
      elasticity: 0,
      flatMeasuresCm: { chestFlat: 54, shoulders: 48, backWidth: 46 }, // loose (+16, +4, +6.4)
    },
  ];

  it('recomienda la talla acorde a la preferencia (ajustado, regular u holgado)', () => {
    expect(recommendSize(BASE_BODY, TSHIRT_SIZES, 'tight').recommendedSize).toBe('S');
    expect(recommendSize(BASE_BODY, TSHIRT_SIZES, 'regular').recommendedSize).toBe('M');
    expect(recommendSize(BASE_BODY, TSHIRT_SIZES, 'loose').recommendedSize).toBe('L');
  });

  it('penaliza fuertemente cualquier talla con zona tensa', () => {
    const rec = recommendSize(BASE_BODY, TSHIRT_SIZES, 'tight');
    const xs = rec.ranked.find((item) => item.sizeLabel === 'XS');
    expect(xs?.report.hasTenseZone).toBe(true);
    expect(rec.ranked[rec.ranked.length - 1]?.sizeLabel).toBe('XS');
  });

  it('lanza RangeError si no se proveen tallas', () => {
    expect(() => recommendSize(BASE_BODY, [], 'regular')).toThrow(RangeError);
  });

  it('valida bordes de evaluateZoneFit, prendas sin medidas y configuración de bandas', () => {
    expect(() =>
      evaluateZoneFit({
        category: 'tshirt',
        zone: 'chest',
        bodyMeasureCm: 0,
        garmentMeasureCm: 100,
        elasticity: 0,
      }),
    ).toThrow(RangeError);

    expect(() =>
      evaluateZoneFit({
        category: 'tshirt',
        zone: 'chest',
        bodyMeasureCm: 92,
        garmentMeasureCm: -5,
        elasticity: 0,
      }),
    ).toThrow(RangeError);

    expect(() =>
      evaluateZoneFit({
        category: 'tshirt',
        zone: 'chest',
        bodyMeasureCm: 92,
        garmentMeasureCm: 100,
        elasticity: 0.8,
      }),
    ).toThrow(RangeError);

    const emptyReport = evaluateGarmentFit(BASE_BODY, {
      category: 'pants',
      sizeLabel: 'M',
      elasticity: 0,
      flatMeasuresCm: {},
    });
    expect(emptyReport.evaluatedZones).toHaveLength(0);
    expect(emptyReport.missingZones).toEqual(['waist', 'hip']);
    expect(emptyReport.overallState).toBe('regular');

    // Recomendación con elasticidad compensando preferencia tight y desempate alfabético
    const elasticSizes: GarmentSizeInput[] = [
      {
        category: 'pants',
        sizeLabel: 'B',
        elasticity: 0.08,
        flatMeasuresCm: { waistFlat: 38, hipFlat: 49 },
      },
      {
        category: 'pants',
        sizeLabel: 'A',
        elasticity: 0.08,
        flatMeasuresCm: { waistFlat: 38, hipFlat: 49 },
      },
    ];
    const elasticRec = recommendSize(BASE_BODY, elasticSizes, 'tight');
    expect(elasticRec.recommendedSize).toBe('A');
    expect(elasticRec.best.targetDistanceCm).toBe(0);

    // Validación de bandas con huecos o intervalos invertidos
    const badGap: FitBandsConfig = {
      ...DEFAULT_FIT_BANDS_CONFIG,
      defaultBands: {
        ...DEFAULT_FIT_BANDS_CONFIG.defaultBands,
        chest: { tight: [0, 3], regular: [4, 12], loose: [12, 20], oversizeMin: 20 },
      },
    };
    expect(() => validateFitBandsConfig(badGap)).toThrow(RangeError);

    const badInverted: FitBandsConfig = {
      ...DEFAULT_FIT_BANDS_CONFIG,
      defaultBands: {
        ...DEFAULT_FIT_BANDS_CONFIG.defaultBands,
        chest: { tight: [4, 4], regular: [4, 12], loose: [12, 20], oversizeMin: 20 },
      },
    };
    expect(() => validateFitBandsConfig(badInverted)).toThrow(RangeError);
  });
});
