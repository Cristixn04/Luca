import MiniSearch from 'minisearch';
import { COLOR_FAMILY_LABELS, classifyColorFamilyHex } from './manualTagger';
import {
  CATEGORY_LABELS,
  PATTERN_LABELS,
  SEASON_LABELS,
  STYLE_LABELS,
  type GarmentWithSizes,
} from './types';

const SPANISH_STOP_WORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'para',
  'por',
  'con',
  'en',
  'y',
  'o',
  'al',
  'mi',
  'tu',
]);

interface IndexedClosetDoc {
  readonly id: string;
  readonly name: string;
  readonly brand: string;
  readonly categoryLabel: string;
  readonly tagsText: string;
  readonly styleLabel: string;
  readonly patternLabel: string;
  readonly seasonsLabel: string;
  readonly colorFamily: string;
  readonly notes: string;
}

/**
 * Normaliza texto en español: elimina tildes (NFD), convierte a minúsculas
 * y limpia puntuación para búsquedas rápidas tolerantes a errores.
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeSpanish(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const rawTokens = normalized.split(' ').filter((token) => token.length > 0);
  const filtered = rawTokens.filter((token) => !SPANISH_STOP_WORDS.has(token));
  return filtered.length > 0 ? filtered : rawTokens;
}

function toIndexedDoc(item: GarmentWithSizes): IndexedClosetDoc {
  const { garment } = item;
  const colorFamily = COLOR_FAMILY_LABELS[classifyColorFamilyHex(garment.dominantColorHex)];
  const seasonsLabel = (garment.seasons ?? []).map((s) => SEASON_LABELS[s]).join(' ');

  return {
    id: garment.id,
    name: garment.name,
    brand: garment.brand,
    categoryLabel: CATEGORY_LABELS[garment.category],
    tagsText: garment.tags.join(' '),
    styleLabel: garment.style ? STYLE_LABELS[garment.style] : '',
    patternLabel: garment.pattern ? PATTERN_LABELS[garment.pattern] : '',
    seasonsLabel,
    colorFamily,
    notes: garment.notes ?? '',
  };
}

export interface ClosetSearchIndex {
  readonly search: (query: string) => GarmentWithSizes[];
}

/**
 * Construye un índice de búsqueda local con MiniSearch (T7.3 · RNF-01 p95 <= 100 ms).
 */
export function createClosetSearchIndex(items: readonly GarmentWithSizes[]): ClosetSearchIndex {
  const byId = new Map<string, GarmentWithSizes>();
  const docs: IndexedClosetDoc[] = [];

  for (const item of items) {
    byId.set(item.garment.id, item);
    docs.push(toIndexedDoc(item));
  }

  const mini = new MiniSearch<IndexedClosetDoc>({
    fields: [
      'name',
      'tagsText',
      'categoryLabel',
      'brand',
      'styleLabel',
      'patternLabel',
      'seasonsLabel',
      'colorFamily',
      'notes',
    ],
    storeFields: ['id'],
    tokenize: tokenizeSpanish,
    processTerm: (term) => {
      const clean = normalizeText(term);
      if (!clean || SPANISH_STOP_WORDS.has(clean)) return null;
      return clean;
    },
    searchOptions: {
      boost: {
        name: 3,
        tagsText: 2.5,
        categoryLabel: 2,
        brand: 1.8,
        seasonsLabel: 1.6,
        styleLabel: 1.5,
        patternLabel: 1.3,
        colorFamily: 1.2,
      },
      prefix: true,
      fuzzy: 0.2,
    },
  });

  mini.addAll(docs);

  return {
    search(query: string): GarmentWithSizes[] {
      const tokens = tokenizeSpanish(query);
      if (tokens.length === 0) {
        return [...items];
      }

      const normalizedQuery = tokens.join(' ');
      let hits = mini.search(normalizedQuery, { combineWith: 'AND' });
      if (hits.length === 0 && tokens.length > 1) {
        hits = mini.search(normalizedQuery, { combineWith: 'OR' });
      }

      const out: GarmentWithSizes[] = [];
      for (const hit of hits) {
        const found = byId.get(String(hit.id));
        if (found) out.push(found);
      }
      return out;
    },
  };
}

export function searchClosetItems(
  items: readonly GarmentWithSizes[],
  query: string,
): GarmentWithSizes[] {
  if (query.trim().length === 0) {
    return [...items];
  }
  return createClosetSearchIndex(items).search(query);
}

export interface SimilarGarmentMatch {
  readonly item: GarmentWithSizes;
  readonly scorePercent: number;
  readonly reasons: readonly string[];
}

/**
 * Encuentra prendas similares del clóset local por categoría, estilo, patrón,
 * formalidad, temporada, etiquetas y familia cromática (T7.4).
 */
export function findSimilarGarments(
  target: GarmentWithSizes,
  allItems: readonly GarmentWithSizes[],
  limit = 4,
): SimilarGarmentMatch[] {
  const targetGarment = target.garment;
  const targetTags = new Set(targetGarment.tags.map((t) => normalizeText(t)).filter(Boolean));
  const targetSeasons = new Set(targetGarment.seasons ?? []);
  const targetColorFamily = classifyColorFamilyHex(targetGarment.dominantColorHex);

  const scored: SimilarGarmentMatch[] = [];

  for (const candidate of allItems) {
    if (candidate.garment.id === targetGarment.id) continue;

    const g = candidate.garment;
    let score = 0;
    const maxScore = 100;
    const reasons: string[] = [];

    if (g.category === targetGarment.category) {
      score += 30;
      reasons.push(`Misma categoría (${CATEGORY_LABELS[g.category]})`);
    }

    if (g.style && targetGarment.style && g.style === targetGarment.style) {
      score += 18;
      reasons.push(`Estilo ${STYLE_LABELS[g.style].toLowerCase()}`);
    }

    if (g.pattern && targetGarment.pattern && g.pattern === targetGarment.pattern) {
      score += 10;
      reasons.push(`Patrón ${PATTERN_LABELS[g.pattern].toLowerCase()}`);
    }

    const formalityDiff = Math.abs(g.formality - targetGarment.formality);
    if (formalityDiff === 0) {
      score += 12;
      reasons.push('Misma formalidad');
    } else if (formalityDiff === 1) {
      score += 6;
    }

    const candSeasons = g.seasons ?? [];
    const sharedSeasons = candSeasons.filter((s) => targetSeasons.has(s));
    if (sharedSeasons.length > 0 && targetSeasons.size > 0) {
      score += Math.min(12, sharedSeasons.length * 6);
      reasons.push(`Temporada: ${sharedSeasons.map((s) => SEASON_LABELS[s]).join(', ')}`);
    }

    const candTags = g.tags.map((t) => normalizeText(t)).filter(Boolean);
    const sharedTags = candTags.filter((t) => targetTags.has(t));
    if (sharedTags.length > 0) {
      score += Math.min(12, sharedTags.length * 6);
      reasons.push(`Etiquetas: ${sharedTags.slice(0, 2).join(', ')}`);
    }

    const candColorFamily = classifyColorFamilyHex(g.dominantColorHex);
    if (candColorFamily === targetColorFamily) {
      score += 6;
      reasons.push(`Gama ${COLOR_FAMILY_LABELS[candColorFamily]}`);
    }

    if (score >= 18) {
      scored.push({
        item: candidate,
        scorePercent: Math.min(100, Math.round((score / maxScore) * 100)),
        reasons: reasons.slice(0, 3),
      });
    }
  }

  return scored
    .sort((a, b) => b.scorePercent - a.scorePercent)
    .slice(0, Math.max(0, limit));
}
