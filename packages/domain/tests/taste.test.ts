import { describe, expect, it } from 'vitest';
import {
  OUTFIT_SCORE_WEIGHTS_WITH_TASTE,
  buildTasteProfile,
  classifyTasteColorFamily,
  computeLaplaceAffinity,
  computeTasteEventDecay,
  evaluateOutfitTasteScore,
  extractGarmentTasteFeatures,
  generateDiverseOutfits,
  scoreOutfitCandidate,
  serializeTasteKey,
  type OutfitGarmentInput,
  type TasteInteractionSignal,
} from '../src/index.js';

function makeSignal(
  id: string,
  type: TasteInteractionSignal['type'],
  at: string,
  colorFamily: string,
): TasteInteractionSignal {
  return {
    id,
    type,
    at,
    features: [
      { category: 'color_family', value: colorFamily },
      { category: 'category', value: 'tshirt' },
      { category: 'formality', value: '2' },
    ],
  };
}

describe('Motor de gustos explicable con Laplace y decaimiento (M10 · T10.3, T10.4, T10.7)', () => {
  it('verifica pesos recalibrados (= 1.0), vida media de 90 días y suavizado de Laplace', () => {
    const sum =
      OUTFIT_SCORE_WEIGHTS_WITH_TASTE.color +
      OUTFIT_SCORE_WEIGHTS_WITH_TASTE.style +
      OUTFIT_SCORE_WEIGHTS_WITH_TASTE.fit +
      OUTFIT_SCORE_WEIGHTS_WITH_TASTE.occasion +
      OUTFIT_SCORE_WEIGHTS_WITH_TASTE.variety +
      OUTFIT_SCORE_WEIGHTS_WITH_TASTE.taste;
    expect(sum).toBeCloseTo(1, 5);

    expect(computeTasteEventDecay('2026-11-20T00:00:00Z', '2026-11-20T00:00:00Z')).toBeCloseTo(1, 5);
    // Exactamente 90 días -> peso = 0.5
    expect(computeTasteEventDecay('2026-08-22T00:00:00Z', '2026-11-20T00:00:00Z')).toBeCloseTo(0.5, 4);
    // 180 días -> peso = 0.25
    expect(computeTasteEventDecay('2026-05-24T00:00:00Z', '2026-11-20T00:00:00Z')).toBeCloseTo(0.25, 4);

    // Laplace: (0+1)/(0+0+2) = 0.5 neutro
    expect(computeLaplaceAffinity(0, 0)).toBe(0.5);
    expect(computeLaplaceAffinity(4, 0)).toBeCloseTo(5 / 6, 4);
    expect(computeLaplaceAffinity(0, 4)).toBeCloseTo(1 / 6, 4);

    expect(classifyTasteColorFamily('#1F5F6B')).toBe('azul');
    expect(classifyTasteColorFamily('#2A9D8F')).toBe('verde');
    expect(classifyTasteColorFamily('#C45733')).toBe('calido');
    expect(classifyTasteColorFamily('#7A5638')).toBe('tierra');
    expect(classifyTasteColorFamily('#7A4296')).toBe('violeta');
    expect(classifyTasteColorFamily('#222222')).toBe('neutro');
    expect(classifyTasteColorFamily(undefined)).toBe('neutro');
    expect(classifyTasteColorFamily('invalido')).toBe('neutro');
    expect(computeTasteEventDecay('not-a-date', '2026-11-20T00:00:00Z')).toBe(1);
  });

  it('respeta arranque en frío (< 10 eventos) y activa Gusto al llegar a 10 eventos', () => {
    const refIso = '2026-11-20T12:00:00Z';
    const nineSignals = Array.from({ length: 9 }, (_, i) =>
      makeSignal(`s-${i}`, 'outfit_liked', refIso, 'verde'),
    );

    const coldProfile = buildTasteProfile(nineSignals, { referenceDateIso: refIso });
    expect(coldProfile.isColdStart).toBe(true);
    expect(coldProfile.activeInScoring).toBe(false);

    const tenSignals = [...nineSignals, makeSignal('s-9', 'wear_logged', refIso, 'verde')];
    const warmProfile = buildTasteProfile(tenSignals, { referenceDateIso: refIso });
    expect(warmProfile.isColdStart).toBe(false);
    expect(warmProfile.activeInScoring).toBe(true);

    const greenAff = warmProfile.affinitiesByKey[serializeTasteKey('color_family', 'verde')];
    expect(greenAff).toBeDefined();
    expect(greenAff!.affinity).toBeGreaterThan(0.85);
    expect(greenAff!.supportingEvents).toBe(10);
  });

  it('hace que fijar/vetar explícitamente anule lo aprendido y que olvidar elimine toda influencia', () => {
    const refIso = '2026-11-20T12:00:00Z';
    const likesGreen = Array.from({ length: 12 }, (_, i) =>
      makeSignal(`g-${i}`, 'outfit_liked', refIso, 'verde'),
    );

    // Vetamos verde explícitamente a pesar de 12 "me gusta", y fijamos cálido sin eventos previos
    const overridden = buildTasteProfile(likesGreen, {
      referenceDateIso: refIso,
      overrides: {
        rules: {
          [serializeTasteKey('color_family', 'verde')]: 'vetoed',
          [serializeTasteKey('color_family', 'calido')]: 'pinned',
        },
      },
    });

    expect(overridden.affinitiesByKey['color_family:verde']?.affinity).toBe(0);
    expect(overridden.affinitiesByKey['color_family:calido']?.affinity).toBe(1);

    // Olvido total -> perfil vacío sin influencia
    const forgotten = buildTasteProfile([], { referenceDateIso: refIso });
    expect(forgotten.activeInScoring).toBe(false);
    expect(forgotten.rankedAffinities).toHaveLength(0);
    expect(evaluateOutfitTasteScore([], forgotten).score).toBe(0.5);

    // Arranque en frío con regla explícita: solo aplica la regla explícita y el resto queda neutro
    const coldWithPin = buildTasteProfile([makeSignal('c1', 'outfit_liked', refIso, 'verde')], {
      referenceDateIso: refIso,
      overrides: { rules: { 'color_family:calido': 'pinned', 'color_family:azul': 'vetoed' } },
    });
    expect(coldWithPin.isColdStart).toBe(true);
    expect(coldWithPin.activeInScoring).toBe(true);
    const coldEval = evaluateOutfitTasteScore(
      [
        {
          id: 't-cal',
          name: 'Top cálido',
          category: 'tshirt',
          status: 'owned',
          formality: 2,
          elasticity: 0.05,
          dominantColorHex: '#C45733',
        },
        {
          id: 'p-azul',
          name: 'Pantalón azul',
          category: 'pants',
          status: 'owned',
          formality: 2,
          elasticity: 0.05,
          dominantColorHex: '#1F5F6B',
        },
      ],
      coldWithPin,
    );
    expect(coldEval.matchedHighlights).toContain('+calido');
    expect(coldEval.matchedHighlights).toContain('-azul');
  });

  it('cambia visiblemente el ranking de outfits según "me gusta" / "no me gusta" y soporta snapshots compactados', () => {
    const refIso = '2026-11-20T12:00:00Z';
    const topGreen: OutfitGarmentInput = {
      id: 'top-green',
      name: 'Camiseta verde',
      category: 'tshirt',
      status: 'owned',
      formality: 2,
      elasticity: 0.05,
      dominantColorHex: '#2A9D8F',
      pattern: 'solid',
    };
    const topWarm: OutfitGarmentInput = {
      id: 'top-warm',
      name: 'Camiseta terracota',
      category: 'tshirt',
      status: 'owned',
      formality: 2,
      elasticity: 0.05,
      dominantColorHex: '#C45733',
      pattern: 'solid',
    };
    const pants: OutfitGarmentInput = {
      id: 'pants-neutral',
      name: 'Pantalón arena',
      category: 'pants',
      status: 'owned',
      formality: 2,
      elasticity: 0.05,
      dominantColorHex: '#D8D2C8',
      pattern: 'solid',
    };

    const features = extractGarmentTasteFeatures(topWarm, 'regular');
    expect(features.some((f) => f.category === 'fit_band' && f.value === 'regular')).toBe(true);

    // Simulamos 10 señales positivas para terracota (cálido) y negativas para verde vía snapshots + señales
    const profile = buildTasteProfile(
      [
        makeSignal('l1', 'outfit_liked', refIso, 'calido'),
        makeSignal('l2', 'outfit_liked', refIso, 'calido'),
        makeSignal('d1', 'outfit_disliked', refIso, 'verde'),
        makeSignal('d2', 'outfit_disliked', refIso, 'verde'),
      ],
      {
        referenceDateIso: refIso,
        snapshots: [
          {
            month: '2026-10',
            eventCount: 8,
            featurePosNeg: {
              'color_family:calido': { pos: 6, neg: 0, count: 6 },
              'color_family:verde': { pos: 0, neg: 6, count: 6 },
            },
          },
        ],
      },
    );

    const tasteWarm = evaluateOutfitTasteScore([topWarm, pants], profile);
    const tasteGreen = evaluateOutfitTasteScore([topGreen, pants], profile);
    expect(tasteWarm.score).toBeGreaterThan(tasteGreen.score);

    const scoreWarm = scoreOutfitCandidate([topWarm, pants], {
      occasion: 'casual',
      temperatureC: 22,
      tasteProfile: profile,
      referenceDateIso: refIso,
    });
    const scoreGreen = scoreOutfitCandidate([topGreen, pants], {
      occasion: 'casual',
      temperatureC: 22,
      tasteProfile: profile,
      referenceDateIso: refIso,
    });

    expect(scoreWarm.score.tasteActive).toBe(true);
    expect(scoreWarm.score.taste).not.toBeNull();
    expect(scoreWarm.score.total).toBeGreaterThan(scoreGreen.score.total);

    const ranked = generateDiverseOutfits([topGreen, topWarm, pants], {
      occasion: 'casual',
      temperatureC: 22,
      tasteProfile: profile,
      referenceDateIso: refIso,
      count: 2,
    });
    expect(ranked[0]?.items.some((i) => i.id === 'top-warm')).toBe(true);
  });
});
