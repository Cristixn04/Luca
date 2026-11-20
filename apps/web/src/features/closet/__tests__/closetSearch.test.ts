import { describe, expect, it } from 'vitest';
import {
  createClosetSearchIndex,
  findSimilarGarments,
  normalizeText,
  searchClosetItems,
} from '../closetSearch';
import { classifyColorFamilyHex, suggestManualTags } from '../manualTagger';
import type { GarmentWithSizes } from '../types';

function makeItem(overrides: Partial<GarmentWithSizes['garment']>): GarmentWithSizes {
  const id = overrides.id ?? `g-${Math.random().toString(16).slice(2, 8)}`;
  const now = '2026-11-20T10:00:00.000Z';
  return {
    garment: {
      id,
      category: 'tshirt',
      name: 'Prenda base',
      brand: 'Taller',
      status: 'owned',
      elasticity: 0.05,
      formality: 2,
      tags: [],
      createdAt: now,
      updatedAt: now,
      ...overrides,
    },
    sizes: [
      {
        id: `${id}-m`,
        garmentId: id,
        label: 'M',
        flatMeasuresCm: { chestFlat: 50, shoulders: 45 },
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

describe('Búsqueda local MiniSearch, prendas similares y etiquetado manual (M7)', () => {
  it('encuentra "camisa de lino para verano" ignorando tildes, stop-words y errores leves (T7.3)', () => {
    const items: GarmentWithSizes[] = [
      makeItem({
        id: 'g-1',
        category: 'long_sleeve',
        name: 'Camisa de lino orgánica',
        brand: 'Taller Norte',
        style: 'minimalist',
        pattern: 'solid',
        seasons: ['spring', 'summer'],
        tags: ['lino', 'fresca', 'playa'],
        dominantColorHex: '#E5DCC5',
      }),
      makeItem({
        id: 'g-2',
        category: 'jacket',
        name: 'Chaqueta de lana pesada',
        brand: 'Invierno Sur',
        style: 'classic',
        pattern: 'plaid',
        seasons: ['autumn', 'winter'],
        tags: ['abrigo', 'lana'],
        dominantColorHex: '#2C3E50',
      }),
      makeItem({
        id: 'g-3',
        category: 'pants',
        name: 'Pantalón chino algodón',
        brand: 'Estudio Sur',
        style: 'classic',
        pattern: 'solid',
        seasons: ['spring', 'autumn'],
        tags: ['oficina', 'recto'],
        dominantColorHex: '#1F5F6B',
      }),
    ];

    expect(normalizeText('Camisa de Lino — Veráno!')).toBe('camisa de lino verano');

    const res = searchClosetItems(items, 'camisa de lino para verano');
    expect(res.length).toBeGreaterThanOrEqual(1);
    expect(res[0]?.garment.id).toBe('g-1');

    // Tolerancia a tildes y errata leve
    const fuzzyRes = searchClosetItems(items, 'pantalon algdon');
    expect(fuzzyRes[0]?.garment.id).toBe('g-3');
  });

  it('cumple RNF-01: búsqueda local sobre 1.000 prendas con latencia p95 <= 100 ms (T7.3 / T7.5)', () => {
    const categories = ['tshirt', 'long_sleeve', 'jacket', 'pants', 'shorts', 'skirt', 'dress'] as const;
    const styles = ['casual', 'minimalist', 'sporty', 'formal', 'streetwear', 'classic', 'bohemian'] as const;
    const patterns = ['solid', 'striped', 'plaid', 'floral', 'graphic', 'textured'] as const;
    const fabrics = ['lino', 'algodón', 'lana', 'denim', 'seda', 'poliéster'] as const;
    const colors = ['#1F5F6B', '#2A9D8F', '#8C5A3C', '#222222', '#C2410C', '#6D4C93'] as const;

    const synthetic: GarmentWithSizes[] = Array.from({ length: 1000 }, (_, i) =>
      makeItem({
        id: `bench-${i}`,
        category: categories[i % categories.length]!,
        name: `${i % 5 === 0 ? 'Camisa' : 'Prenda'} ${fabrics[i % fabrics.length]!} modelo ${i}`,
        brand: `Marca ${i % 25}`,
        style: styles[i % styles.length]!,
        pattern: patterns[i % patterns.length]!,
        seasons: i % 2 === 0 ? ['spring', 'summer'] : ['autumn', 'winter'],
        tags: [fabrics[i % fabrics.length]!, i % 3 === 0 ? 'oficina' : 'diario', `lote-${i % 10}`],
        dominantColorHex: colors[i % colors.length]!,
      }),
    );

    const index = createClosetSearchIndex(synthetic);
    const queries = [
      'camisa de lino para verano',
      'chaqueta lana invierno',
      'pantalon oficina denim',
      'minimalista neutro',
      'marca 12 algodon',
    ];

    const durationsMs: number[] = [];
    for (let run = 0; run < 20; run += 1) {
      const q = queries[run % queries.length]!;
      const start = performance.now();
      const hits = index.search(q);
      const elapsed = performance.now() - start;
      durationsMs.push(elapsed);
      expect(hits.length).toBeGreaterThan(0);
    }

    durationsMs.sort((a, b) => a - b);
    const p95Index = Math.min(durationsMs.length - 1, Math.ceil(durationsMs.length * 0.95) - 1);
    const p95Ms = durationsMs[p95Index]!;
    expect(p95Ms).toBeLessThanOrEqual(100);
  });

  it('ordena prendas similares por categoría, estilo, patrón, temporada y etiquetas (T7.4)', () => {
    const target = makeItem({
      id: 'target',
      category: 'tshirt',
      name: 'Camiseta lino verde',
      style: 'minimalist',
      pattern: 'solid',
      formality: 2,
      seasons: ['spring', 'summer'],
      tags: ['lino', 'verano', 'básico'],
      dominantColorHex: '#2A9D8F',
    });

    const verySimilar = makeItem({
      id: 'sim-high',
      category: 'tshirt',
      name: 'Camiseta algodón salvia',
      style: 'minimalist',
      pattern: 'solid',
      formality: 2,
      seasons: ['spring', 'summer'],
      tags: ['verano', 'básico'],
      dominantColorHex: '#3B9E85',
    });

    const mediumSimilar = makeItem({
      id: 'sim-mid',
      category: 'long_sleeve',
      name: 'Camisa lino blanca',
      style: 'minimalist',
      pattern: 'solid',
      formality: 3,
      seasons: ['summer'],
      tags: ['lino'],
      dominantColorHex: '#F3F2EE',
    });

    const unrelated = makeItem({
      id: 'sim-none',
      category: 'jacket',
      name: 'Abrigo formal invierno',
      style: 'formal',
      pattern: 'plaid',
      formality: 5,
      seasons: ['winter'],
      tags: ['etiqueta'],
      dominantColorHex: '#111111',
    });

    const matches = findSimilarGarments(target, [target, unrelated, mediumSimilar, verySimilar]);
    expect(matches.map((m) => m.item.garment.id)).toEqual(['sim-high', 'sim-mid']);
    expect(matches[0]!.scorePercent).toBeGreaterThan(matches[1]!.scorePercent);
    expect(matches[0]!.reasons.length).toBeGreaterThan(0);
  });

  it('ofrece sugerencias deterministas offline con ManualTagger y clasifica colores (T7.2)', () => {
    expect(classifyColorFamilyHex('#2A9D8F')).toBe('verde');
    expect(classifyColorFamilyHex('#1F5F6B')).toBe('azul');
    expect(classifyColorFamilyHex('#1C1D21')).toBe('neutro');
    expect(classifyColorFamilyHex('#8C5A3C')).toBe('tierra');

    const withoutBack = suggestManualTags({
      category: 'tshirt',
      dominantColorHex: '#2A9D8F',
      formality: 2,
      elasticity: 0.05,
      hasBackPhoto: false,
    });
    const withBack = suggestManualTags({
      category: 'tshirt',
      dominantColorHex: '#2A9D8F',
      formality: 2,
      elasticity: 0.05,
      hasBackPhoto: true,
    });

    expect(withoutBack.provider).toBe('manual-local');
    expect(withoutBack.seasons).toContain('summer');
    expect(withBack.overall_confidence).toBeGreaterThan(withoutBack.overall_confidence);
    expect(withBack.suggested_tags).toContain('vista completa');
  });
});
