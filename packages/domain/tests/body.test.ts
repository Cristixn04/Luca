import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  convertBodyMeasurements,
  createBodyModel,
  evaluateGarmentFit,
  projectAllViews,
  ramanujanPerimeter,
  renderThreeViewWireframeSvg,
  solveEllipseSection,
  solveGarmentSection,
  validateBodyMeasurements,
  type BodyMeasurements,
} from '../src/index.js';

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

describe('Validación de medidas y conversión cm/in (T1.2)', () => {
  it('acepta medidas válidas sin errores ni advertencias', () => {
    const result = validateBodyMeasurements(BASE_BODY);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('reporta errores claros ante valores fuera de rango o no finitos', () => {
    const result = validateBodyMeasurements({
      required: {
        ...BASE_BODY.required,
        height: 90,
        chest: Number.NaN,
      },
      optional: {
        torsoLength: 10,
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['required.height', 'required.chest', 'optional.torsoLength']),
    );
  });

  it('emite advertencias neutras (sin juicios) para relaciones atípicas', () => {
    const result = validateBodyMeasurements({
      required: {
        height: 160,
        shoulders: 62,
        chest: 80,
        waist: 115,
        hip: 100,
        inseam: 100,
      },
      optional: {
        torsoLength: 55,
      },
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining([
        'INSEAM_HEIGHT_RATIO',
        'SHOULDERS_CHEST_RATIO',
        'WAIST_CHEST_RATIO',
        'TORSO_INSEAM_SUM',
      ]),
    );
  });

  it('rechaza fondos medidos geométricamente imposibles (fondo × 2 >= perímetro)', () => {
    const result = validateBodyMeasurements({
      required: BASE_BODY.required,
      optional: {
        chestDepth: 46,
        waistDepth: 40,
        hipDepth: 50,
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.filter((e) => e.code === 'DEPTH_EXCEEDS_PERIMETER')).toHaveLength(3);
  });

  it('convierte conjuntos completos de medidas entre cm y pulgadas', () => {
    const withOptional: BodyMeasurements = {
      ...BASE_BODY,
      optional: {
        torsoLength: 50.8,
        chestDepth: 22.86,
        backWidth: 40.64,
      },
    };

    const inInches = convertBodyMeasurements(withOptional, 'cm', 'in');
    expect(inInches.optional?.torsoLength).toBe(20);
    expect(inInches.optional?.chestDepth).toBe(9);
    expect(inInches.optional?.backWidth).toBe(16);

    const same = convertBodyMeasurements(withOptional, 'cm', 'cm');
    expect(same).toBe(withOptional);
  });
});

describe('Elipses Ramanujan y BodyModel (T1.4)', () => {
  it('resuelve elipses sin fondo medido con error relativo <= 0.5 % (RNF-05)', () => {
    const section = solveEllipseSection('chest', 92);
    expect(section.depthEstimated).toBe(true);
    expect(section.relativeError).toBeLessThanOrEqual(0.005);
    expect(section.depthRatio).toBeCloseTo(0.65, 5);
    expect(ramanujanPerimeter(section.semiWidthA, section.semiDepthB)).toBeCloseTo(92, 4);
  });

  it('resuelve elipses con fondo medido por bisección con error relativo <= 0.5 %', () => {
    const section = solveEllipseSection('chest', 92, 24);
    expect(section.depthEstimated).toBe(false);
    expect(section.depthCm).toBe(24);
    expect(section.relativeError).toBeLessThanOrEqual(0.005);
    expect(ramanujanPerimeter(section.semiWidthA, section.semiDepthB)).toBeCloseTo(92, 4);
  });

  it('calcula sección transversal de prenda conservando la relación fondo/ancho', () => {
    const garment = solveGarmentSection(52, 0.65);
    expect(garment.frontWidthCm).toBe(52);
    expect(garment.circumferenceCm).toBe(104);
    expect(garment.sideDepthCm).toBeGreaterThan(0);
  });

  it('marca campos estimados cuando faltan opcionales y los limpia al medirlos', () => {
    const estimatedModel = createBodyModel(BASE_BODY);
    expect(estimatedModel.estimatedFields).toEqual(
      expect.arrayContaining(['chestDepth', 'waistDepth', 'hipDepth', 'torsoLength', 'backWidth']),
    );

    const measuredModel = createBodyModel({
      required: BASE_BODY.required,
      optional: {
        torsoLength: 50,
        chestDepth: 23,
        waistDepth: 21,
        hipDepth: 26,
        backWidth: 40,
        backLength: 48,
      },
    });
    expect(measuredModel.estimatedFields).toHaveLength(0);
    expect(measuredModel.backWidthCm).toBe(40);
  });

  it('rechaza entradas geométricas inválidas en elipses y BodyModel', () => {
    expect(() => ramanujanPerimeter(-1, 10)).toThrow(RangeError);
    expect(() => solveEllipseSection('chest', 0)).toThrow(RangeError);
    expect(() => solveEllipseSection('chest', 92, 0)).toThrow(RangeError);
    expect(() => solveEllipseSection('chest', 92, 50)).toThrow(RangeError);
    expect(() => solveGarmentSection(0, 0.65)).toThrow(RangeError);
    expect(() => solveGarmentSection(50, 0)).toThrow(RangeError);
    expect(() =>
      createBodyModel({
        required: { ...BASE_BODY.required, height: 50 },
      }),
    ).toThrow(RangeError);
  });
});

describe('Proyecciones 3 vistas y wireframe SVG determinista (T1.5)', () => {
  it('mantiene coherencia de estado por zona entre frente, perfil y espalda', () => {
    const model = createBodyModel(BASE_BODY);
    const fitReport = evaluateGarmentFit(model, {
      category: 'dress',
      sizeLabel: 'M',
      elasticity: 0,
      flatMeasuresCm: {
        chestFlat: 52, // +12 cm -> loose
        waistFlat: 41, // +4 cm -> regular
        hipFlat: 48, // -2 cm -> tense
      },
    });

    const views = projectAllViews(model, fitReport);
    const frontWaist = views.front.zones.find((z) => z.zone === 'waist');
    const sideWaist = views.side.zones.find((z) => z.zone === 'waist');
    const backWaist = views.back.zones.find((z) => z.zone === 'waist');

    expect(frontWaist?.fitState).toBe('regular');
    expect(sideWaist?.fitState).toBe('regular');
    expect(backWaist?.fitState).toBe('regular');

    const frontHip = views.front.zones.find((z) => z.zone === 'hip');
    const sideHip = views.side.zones.find((z) => z.zone === 'hip');
    const backHip = views.back.zones.find((z) => z.zone === 'hip');

    expect(frontHip?.fitState).toBe('tense');
    expect(sideHip?.fitState).toBe('tense');
    expect(backHip?.fitState).toBe('tense');
  });

  it('genera un wireframe SVG determinista (mismo hash ante la misma entrada, RNF-04)', () => {
    const model = createBodyModel(BASE_BODY);
    const svg1 = renderThreeViewWireframeSvg(model);
    const svg2 = renderThreeViewWireframeSvg(model);

    const hash1 = createHash('sha256').update(svg1).digest('hex');
    const hash2 = createHash('sha256').update(svg2).digest('hex');

    expect(hash1).toBe(hash2);
    expect(svg1).toContain('data-view="front"');
    expect(svg1).toContain('data-view="side"');
    expect(svg1).toContain('data-view="back"');
  });
});
