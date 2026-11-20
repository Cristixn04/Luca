import { describe, expect, it } from 'vitest';
import {
  OUTFIT_SCORE_WEIGHTS,
  analyzeClosetUsage,
  classifyTemperatureBand,
  computeCpw,
  computeProjectedCpw,
  createBodyModel,
  generateDiverseOutfits,
  getGarmentSlot,
  scoreOutfitCandidate,
  simulateWishlistUnlock,
  type OutfitGarmentInput,
} from '../src/index.js';

function buildThirtyGarmentCloset(): OutfitGarmentInput[] {
  const palette = ['#1F5F6B', '#F3E5C8', '#2A9D8F', '#4B3221', '#C45733', '#2B4263', '#627333', '#D0D5DD'];
  const items: OutfitGarmentInput[] = [];

  for (let i = 0; i < 10; i += 1) {
    items.push({
      id: `top-${i}`,
      name: `Camisa / camiseta ${i}`,
      category: i % 2 === 0 ? 'tshirt' : 'long_sleeve',
      status: 'owned',
      formality: ((i % 4) + 1) as 1 | 2 | 3 | 4,
      elasticity: 0.05,
      dominantColorHex: palette[i % palette.length]!,
      style: i % 3 === 0 ? 'minimalist' : i % 3 === 1 ? 'classic' : 'casual',
      seasons: i % 2 === 0 ? ['spring', 'summer'] : ['autumn', 'winter'],
      price: 35 + i * 5,
      flatMeasuresCm: { chestFlat: 50, shoulders: 45, backWidth: 42 },
      wearCount: i,
    });
  }

  for (let i = 0; i < 10; i += 1) {
    items.push({
      id: `bottom-${i}`,
      name: `Pantalón / short ${i}`,
      category: i < 7 ? 'pants' : i < 9 ? 'shorts' : 'skirt',
      status: 'owned',
      formality: ((i % 4) + 1) as 1 | 2 | 3 | 4,
      elasticity: 0.05,
      dominantColorHex: palette[(i + 3) % palette.length]!,
      style: i % 2 === 0 ? 'classic' : 'casual',
      seasons: i < 7 ? ['spring', 'autumn', 'winter'] : ['summer'],
      price: 60 + i * 4,
      flatMeasuresCm: { waistFlat: 41, hipFlat: 52, inseam: 79 },
      wearCount: i % 5,
    });
  }

  for (let i = 0; i < 6; i += 1) {
    items.push({
      id: `coat-${i}`,
      name: `Chaqueta ${i}`,
      category: 'jacket',
      status: 'owned',
      formality: ((i % 3) + 2) as 2 | 3 | 4,
      elasticity: 0.02,
      dominantColorHex: palette[(i + 5) % palette.length]!,
      style: 'classic',
      seasons: ['autumn', 'winter'],
      price: 120 + i * 10,
      flatMeasuresCm: { chestFlat: 54, shoulders: 46, backWidth: 43 },
      wearCount: 2,
    });
  }

  for (let i = 0; i < 4; i += 1) {
    items.push({
      id: `dress-${i}`,
      name: `Vestido ${i}`,
      category: 'dress',
      status: 'owned',
      formality: ((i % 3) + 2) as 2 | 3 | 4,
      elasticity: 0.05,
      dominantColorHex: palette[(i + 2) % palette.length]!,
      style: 'minimalist',
      seasons: ['spring', 'summer'],
      price: 90,
      flatMeasuresCm: { chestFlat: 49, waistFlat: 41, hipFlat: 52 },
      wearCount: 1,
    });
  }

  return items;
}

describe('Motor de outfits, clima, diversidad y CPW (M9 · T9.1–T9.8)', () => {
  const body = createBodyModel({
    required: { height: 175, shoulders: 44, chest: 92, waist: 78, hip: 98, inseam: 80 },
  });

  it('clasifica bandas de temperatura, ranuras y suma pesos exactamente a 1.0', () => {
    expect(classifyTemperatureBand(8)).toBe('cold');
    expect(classifyTemperatureBand(15)).toBe('cool');
    expect(classifyTemperatureBand(21)).toBe('mild');
    expect(classifyTemperatureBand(29)).toBe('warm');

    expect(getGarmentSlot('tshirt')).toBe('top');
    expect(getGarmentSlot('pants')).toBe('bottom');
    expect(getGarmentSlot('dress')).toBe('one_piece');
    expect(getGarmentSlot('jacket')).toBe('outerwear');

    const weightSum =
      OUTFIT_SCORE_WEIGHTS.color +
      OUTFIT_SCORE_WEIGHTS.style +
      OUTFIT_SCORE_WEIGHTS.fit +
      OUTFIT_SCORE_WEIGHTS.occasion +
      OUTFIT_SCORE_WEIGHTS.variety;
    expect(weightSum).toBeCloseTo(1, 5);
  });

  it('genera 3 outfits diversos (>= 2 prendas distintas) en un clóset de 30 prendas con desglose completo', () => {
    const closet30 = buildThirtyGarmentCloset();
    expect(closet30).toHaveLength(30);

    const proposals = generateDiverseOutfits(closet30, {
      occasion: 'office',
      temperatureC: 15,
      bodyModel: body,
      fitPreference: 'regular',
      seasonId: 'warm_autumn',
      referenceDateIso: '2026-11-20T12:00:00.000Z',
      count: 3,
    });

    expect(proposals).toHaveLength(3);

    for (const proposal of proposals) {
      expect(proposal.score.total).toBeGreaterThanOrEqual(50);
      expect(proposal.score.total).toBeLessThanOrEqual(100);
      expect(proposal.score.color).toBeGreaterThanOrEqual(0);
      expect(proposal.score.style).toBeGreaterThanOrEqual(0);
      expect(proposal.score.fit).toBeGreaterThanOrEqual(0);
      expect(proposal.score.occasion).toBeGreaterThanOrEqual(0);
      expect(proposal.score.variety).toBeGreaterThanOrEqual(0);
    }

    // Verifica diversidad real: cada par difiere en al menos 2 prendas
    for (let i = 0; i < proposals.length; i += 1) {
      for (let j = i + 1; j < proposals.length; j += 1) {
        const setA = new Set(proposals[i]!.items.map((x) => x.id));
        const setB = new Set(proposals[j]!.items.map((x) => x.id));
        const onlyA = [...setA].filter((id) => !setB.has(id)).length;
        const onlyB = [...setB].filter((id) => !setA.has(id)).length;
        expect(Math.max(onlyA, onlyB)).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('penaliza variedad cuando una prenda se usó ayer y filtra abrigos en clima cálido', () => {
    const freshTop: OutfitGarmentInput = {
      id: 't1',
      name: 'Camiseta fresca',
      category: 'tshirt',
      status: 'owned',
      formality: 2,
      elasticity: 0.05,
      dominantColorHex: '#2A9D8F',
      lastWornAt: '2026-10-01',
    };
    const wornYesterdayTop: OutfitGarmentInput = {
      ...freshTop,
      id: 't2',
      lastWornAt: '2026-11-19',
    };
    const pants: OutfitGarmentInput = {
      id: 'p1',
      name: 'Pantalón',
      category: 'pants',
      status: 'owned',
      formality: 2,
      elasticity: 0.05,
      dominantColorHex: '#1F5F6B',
    };

    const sFresh = scoreOutfitCandidate([freshTop, pants], {
      occasion: 'casual',
      temperatureC: 22,
      referenceDateIso: '2026-11-20T12:00:00.000Z',
    });
    const sRecent = scoreOutfitCandidate([wornYesterdayTop, pants], {
      occasion: 'casual',
      temperatureC: 22,
      referenceDateIso: '2026-11-20T12:00:00.000Z',
    });

    expect(sFresh.score.variety).toBeGreaterThan(sRecent.score.variety);

    // En clima cálido (29 °C) no incluye chaquetas
    const withJacket = generateDiverseOutfits(
      [
        freshTop,
        pants,
        {
          id: 'j1',
          name: 'Abrigo grueso',
          category: 'jacket',
          status: 'owned',
          formality: 2,
          elasticity: 0,
        },
      ],
      { occasion: 'casual', temperatureC: 29 },
    );
    expect(withJacket.length).toBeGreaterThanOrEqual(1);
    expect(withJacket[0]!.items.some((i) => i.category === 'jacket')).toBe(false);
  });

  it('calcula CPW real/proyectado, identifica huérfanas y simula "desbloquea N outfits" en wishlist (T9.7, T9.8)', () => {
    expect(computeCpw(100, 0)).toBe(100);
    expect(computeCpw(100, 4)).toBe(25);
    expect(computeCpw(undefined, 3)).toBeNull();
    expect(computeProjectedCpw(90, 30)).toBe(3);

    const ownedOnlyTops: OutfitGarmentInput[] = [
      {
        id: 'top-only',
        name: 'Camisa sola',
        category: 'tshirt',
        status: 'owned',
        formality: 2,
        elasticity: 0.05,
        dominantColorHex: '#F3E5C8',
        price: 40,
        wearCount: 2,
      },
      {
        id: 'top-only-2',
        name: 'Camisa azul',
        category: 'long_sleeve',
        status: 'owned',
        formality: 3,
        elasticity: 0.05,
        dominantColorHex: '#1F5F6B',
        price: 60,
        wearCount: 0,
      },
    ];

    // Sin parte inferior, ambas prendas propias son huérfanas (0 outfits)
    const usage = analyzeClosetUsage(ownedOnlyTops, { occasion: 'casual', temperatureC: 21 });
    expect(usage['top-only']!.cpw).toBe(20);
    expect(usage['top-only']!.isOrphan).toBe(true);
    expect(usage['top-only']!.versatility).toBe(0);

    // Añadir un pantalón de la lista de deseos desbloquea 2 outfits nuevos
    const wishlistPants: OutfitGarmentInput = {
      id: 'wish-pants',
      name: 'Pantalón chino',
      category: 'pants',
      status: 'wishlist',
      formality: 3,
      elasticity: 0.05,
      dominantColorHex: '#2B4263',
      price: 75,
    };

    const unlock = simulateWishlistUnlock(wishlistPants, ownedOnlyTops, {
      occasion: 'casual',
      temperatureC: 21,
    });
    expect(unlock.unlocksOutfitsCount).toBe(2);
    expect(unlock.bestNewScore).toBeGreaterThanOrEqual(60);
  });
});
