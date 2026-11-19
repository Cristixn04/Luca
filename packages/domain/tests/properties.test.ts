import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  FIT_STATES,
  FIT_ZONES,
  GARMENT_CATEGORIES,
  createBodyModel,
  evaluateGarmentFit,
  evaluateZoneFit,
  projectAllViews,
  renderThreeViewWireframeSvg,
  solveEllipseSection,
  type BodyMeasurements,
  type FitState,
} from '../src/index.js';

const STATE_ORDER: Readonly<Record<FitState, number>> = {
  tense: 0,
  tight: 1,
  regular: 2,
  loose: 3,
  oversize: 4,
};

describe('Pruebas de propiedades con fast-check (T1.7)', () => {
  it('más holgura nunca empeora el estado de calce (monotonía respecto al ancho de prenda)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...GARMENT_CATEGORIES),
        fc.constantFrom(...FIT_ZONES),
        fc.double({ min: 35, max: 140, noNaN: true }),
        fc.double({ min: 30, max: 150, noNaN: true }),
        fc.double({ min: 0.1, max: 30, noNaN: true }),
        fc.double({ min: 0, max: 0.25, noNaN: true }),
        (category, zone, bodyCm, garmentCm, extraCm, elasticity) => {
          const base = evaluateZoneFit({
            category,
            zone,
            bodyMeasureCm: bodyCm,
            garmentMeasureCm: garmentCm,
            elasticity,
          });
          const wider = evaluateZoneFit({
            category,
            zone,
            bodyMeasureCm: bodyCm,
            garmentMeasureCm: garmentCm + extraCm,
            elasticity,
          });

          expect(STATE_ORDER[wider.state]).toBeGreaterThanOrEqual(STATE_ORDER[base.state]);
          expect(FIT_STATES).toContain(base.state);
          expect(FIT_STATES).toContain(wider.state);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('mayor elasticidad nunca empeora un estado tenso', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...GARMENT_CATEGORIES),
        fc.constantFrom(...FIT_ZONES),
        fc.double({ min: 60, max: 130, noNaN: true }),
        fc.double({ min: 50, max: 130, noNaN: true }),
        fc.double({ min: 0, max: 0.2, noNaN: true }),
        fc.double({ min: 0, max: 0.15, noNaN: true }),
        (category, zone, bodyCm, garmentCm, e1, deltaE) => {
          const low = evaluateZoneFit({
            category,
            zone,
            bodyMeasureCm: bodyCm,
            garmentMeasureCm: garmentCm,
            elasticity: e1,
          });
          const high = evaluateZoneFit({
            category,
            zone,
            bodyMeasureCm: bodyCm,
            garmentMeasureCm: garmentCm,
            elasticity: e1 + deltaE,
          });

          expect(STATE_ORDER[high.state]).toBeGreaterThanOrEqual(STATE_ORDER[low.state]);
        },
      ),
      { numRuns: 150 },
    );
  });

  it('la elipse de BodyModel escala de forma monótona y mantiene error <= 0.5 % (RNF-05)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('chest' as const, 'waist' as const, 'hip' as const),
        fc.double({ min: 55, max: 160, noNaN: true }),
        fc.double({ min: 0.5, max: 25, noNaN: true }),
        (section, perimeter, delta) => {
          const small = solveEllipseSection(section, perimeter);
          const large = solveEllipseSection(section, perimeter + delta);

          expect(small.relativeError).toBeLessThanOrEqual(0.005);
          expect(large.relativeError).toBeLessThanOrEqual(0.005);
          expect(large.widthCm).toBeGreaterThan(small.widthCm);
          expect(large.depthCm).toBeGreaterThan(small.depthCm);

          // Con fondo medido geométricamente válido (entre 20 % y 42 % del perímetro)
          const measuredDepth = perimeter * 0.26;
          const withDepth = solveEllipseSection(section, perimeter, measuredDepth);
          expect(withDepth.relativeError).toBeLessThanOrEqual(0.005);
          expect(withDepth.depthCm).toBeCloseTo(measuredDepth, 5);
        },
      ),
      { numRuns: 150 },
    );
  });

  it('coherencia entre las tres vistas y determinismo de SVG (RNF-04)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 150, max: 200, noNaN: true }),
        fc.double({ min: 75, max: 130, noNaN: true }),
        fc.double({ min: 60, max: 115, noNaN: true }),
        fc.double({ min: 80, max: 135, noNaN: true }),
        fc.double({ min: 40, max: 70, noNaN: true }),
        fc.double({ min: 32, max: 60, noNaN: true }),
        fc.double({ min: 42, max: 72, noNaN: true }),
        (height, chest, waist, hip, chestFlat, waistFlat, hipFlat) => {
          const body: BodyMeasurements = {
            required: {
              height,
              shoulders: Math.min(60, Math.max(32, chest * 0.44)),
              chest,
              waist,
              hip,
              inseam: Math.min(100, Math.max(60, height * 0.45)),
            },
          };

          const model = createBodyModel(body);
          const report = evaluateGarmentFit(model, {
            category: 'dress',
            sizeLabel: 'M',
            elasticity: 0.05,
            flatMeasuresCm: { chestFlat, waistFlat, hipFlat },
          });

          const views = projectAllViews(model, report);
          for (const sharedZone of ['waist', 'hip'] as const) {
            const frontState = views.front.zones.find((z) => z.zone === sharedZone)?.fitState;
            const sideState = views.side.zones.find((z) => z.zone === sharedZone)?.fitState;
            const backState = views.back.zones.find((z) => z.zone === sharedZone)?.fitState;
            expect(frontState).toBe(sideState);
            expect(sideState).toBe(backState);
          }

          expect(renderThreeViewWireframeSvg(model, report)).toBe(
            renderThreeViewWireframeSvg(model, report),
          );
        },
      ),
      { numRuns: 50 },
    );
  });
});
