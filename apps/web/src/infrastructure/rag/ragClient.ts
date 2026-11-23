import { COLOR_FAMILY_LABELS, classifyColorFamilyHex } from '@/features/closet/manualTagger';
import {
  CATEGORY_LABELS,
  PATTERN_LABELS,
  SEASON_LABELS,
  STYLE_LABELS,
  formatVisualSpecSummary,
  type GarmentWithSizes,
} from '@/features/closet/types';

const TENANT_STORAGE_KEY = 'luca:rag-tenant-key';
const CIRCUIT_BREAKER_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 1_800;

export interface RagIndexItemPayload {
  readonly externalId: string;
  readonly sourceType: 'garment';
  readonly title: string;
  readonly content: string;
  readonly section: 'closet';
  readonly metadata: {
    readonly category: string;
    readonly formality: number;
    readonly style?: string;
  };
}

export interface RagRankedHit {
  readonly externalId: string;
  readonly title: string;
  readonly score: number;
  readonly vectorScore: number;
  readonly textScore: number;
  readonly pageNumber: number;
  readonly section: string;
  readonly snippet: string;
}

export interface RagClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly enabled?: boolean;
  readonly timeoutMs?: number;
  readonly tenantKey?: string;
}

/**
 * Construye el payload textual mínimo para indexación semántica en Spring Boot + pgvector.
 * Nunca incluye fotos, medidas corporales, precios ni secretos de la bóveda local.
 */
export function buildGarmentRagPayload(item: GarmentWithSizes): RagIndexItemPayload {
  const { garment } = item;
  const colorFamily = COLOR_FAMILY_LABELS[classifyColorFamilyHex(garment.dominantColorHex)];
  const seasons = (garment.seasons ?? []).map((s) => SEASON_LABELS[s]).join(' ');
  const styleLabel = garment.style ? STYLE_LABELS[garment.style] : '';
  const patternLabel = garment.pattern ? PATTERN_LABELS[garment.pattern] : '';
  const specSummary = formatVisualSpecSummary(garment.visualSpec);

  const parts = [
    garment.name,
    CATEGORY_LABELS[garment.category],
    garment.brand,
    styleLabel,
    patternLabel,
    seasons,
    colorFamily ? `color ${colorFamily}` : '',
    `formalidad ${garment.formality}`,
    garment.tags.join(' '),
    specSummary,
    garment.notes ?? '',
  ]
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return {
    externalId: garment.id,
    sourceType: 'garment',
    title: garment.name,
    content: parts.join(' · '),
    section: 'closet',
    metadata: {
      category: garment.category,
      formality: garment.formality,
      ...(garment.style ? { style: garment.style } : {}),
    },
  };
}

function getOrCreateAnonymousTenantKey(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = window.localStorage.getItem(TENANT_STORAGE_KEY);
      if (existing && existing.length >= 16) {
        return existing;
      }
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      const generated = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      window.localStorage.setItem(TENANT_STORAGE_KEY, generated);
      return generated;
    }
  } catch {
    // Entorno restringido sin localStorage: usar clave efímera en memoria
  }
  return `ephemeral-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

export interface RagClient {
  readonly syncGarments: (items: readonly GarmentWithSizes[]) => Promise<boolean>;
  readonly deleteGarment: (garmentId: string) => Promise<boolean>;
  readonly searchAndRerank: (
    query: string,
    candidateIds?: readonly string[],
    limit?: number,
  ) => Promise<RagRankedHit[] | null>;
  readonly resetSession: () => void;
}

export function createRagClient(options: RagClientOptions = {}): RagClient {
  const baseUrl = (options.baseUrl ?? '/api/rag/v1').replace(/\/+$/, '');
  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const isEnabled =
    options.enabled ??
    (typeof import.meta !== 'undefined' && import.meta.env?.MODE !== 'test');

  let cachedToken: string | null = null;
  let tokenExpiresAtMs = 0;
  let circuitOpenUntilMs = 0;
  let inFlightAuth: Promise<string | null> | null = null;
  let resolvedTenantKey = options.tenantKey ?? null;

  const isCircuitOpen = () => Date.now() < circuitOpenUntilMs;

  const tripCircuit = () => {
    circuitOpenUntilMs = Date.now() + CIRCUIT_BREAKER_MS;
    cachedToken = null;
    tokenExpiresAtMs = 0;
  };

  const fetchWithTimeout = async (url: string, init: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchFn(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const ensureToken = async (): Promise<string | null> => {
    if (!isEnabled || typeof fetchFn !== 'function' || isCircuitOpen()) {
      return null;
    }
    if (cachedToken && Date.now() < tokenExpiresAtMs - 60_000) {
      return cachedToken;
    }
    if (inFlightAuth) {
      return inFlightAuth;
    }

    inFlightAuth = (async () => {
      try {
        if (!resolvedTenantKey) {
          resolvedTenantKey = getOrCreateAnonymousTenantKey();
        }
        const res = await fetchWithTimeout(`${baseUrl}/auth/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantKey: resolvedTenantKey }),
        });
        if (!res.ok) {
          tripCircuit();
          return null;
        }
        const data = (await res.json()) as { token?: string; expiresAt?: string };
        if (!data.token) {
          tripCircuit();
          return null;
        }
        cachedToken = data.token;
        const parsedExp = data.expiresAt ? Date.parse(data.expiresAt) : NaN;
        tokenExpiresAtMs = Number.isFinite(parsedExp) ? parsedExp : Date.now() + 3_600_000;
        return cachedToken;
      } catch {
        tripCircuit();
        return null;
      } finally {
        inFlightAuth = null;
      }
    })();

    return inFlightAuth;
  };

  return {
    async syncGarments(items) {
      if (!isEnabled || items.length === 0) return false;
      const token = await ensureToken();
      if (!token) return false;

      try {
        const payloads = items.slice(0, 200).map(buildGarmentRagPayload);
        const res = await fetchWithTimeout(`${baseUrl}/index/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ items: payloads }),
        });
        if (!res.ok) {
          if (res.status >= 500 || res.status === 404) tripCircuit();
          return false;
        }
        return true;
      } catch {
        tripCircuit();
        return false;
      }
    },

    async deleteGarment(garmentId) {
      if (!isEnabled || !garmentId) return false;
      const token = await ensureToken();
      if (!token) return false;

      try {
        const res = await fetchWithTimeout(
          `${baseUrl}/index/items/${encodeURIComponent(garmentId)}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok && res.status !== 404) {
          if (res.status >= 500) tripCircuit();
          return false;
        }
        return true;
      } catch {
        tripCircuit();
        return false;
      }
    },

    async searchAndRerank(query, candidateIds, limit = 40) {
      const clean = query.trim();
      if (!isEnabled || clean.length < 2) return null;
      const token = await ensureToken();
      if (!token) return null;

      try {
        const res = await fetchWithTimeout(`${baseUrl}/search/rerank`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: clean,
            candidateIds: candidateIds && candidateIds.length > 0 ? candidateIds : undefined,
            limit,
          }),
        });
        if (!res.ok) {
          if (res.status >= 500 || res.status === 404) tripCircuit();
          return null;
        }
        const data = (await res.json()) as { results?: RagRankedHit[] };
        return Array.isArray(data.results) ? data.results : null;
      } catch {
        tripCircuit();
        return null;
      }
    },

    resetSession() {
      cachedToken = null;
      tokenExpiresAtMs = 0;
      circuitOpenUntilMs = 0;
    },
  };
}

export const defaultRagClient = createRagClient();
