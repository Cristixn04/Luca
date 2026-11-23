import { describe, expect, it, vi } from 'vitest';
import type { GarmentWithSizes } from '@/features/closet/types';
import { buildGarmentRagPayload, createRagClient } from '../ragClient';

const SAMPLE_ITEM: GarmentWithSizes = {
  garment: {
    id: 'g-rain-1',
    category: 'jacket',
    name: 'Chaqueta impermeable azul',
    brand: 'Atelier',
    status: 'owned',
    price: 250,
    elasticity: 0.02,
    formality: 3,
    pattern: 'solid',
    style: 'minimalist',
    seasons: ['autumn', 'winter'],
    tags: ['lluvia', 'oficina'],
    dominantColorHex: '#1F3A5F',
    notes: 'Ideal para días fríos',
    createdAt: '2026-11-23T00:00:00Z',
    updatedAt: '2026-11-23T00:00:00Z',
  },
  sizes: [{ id: 's1', garmentId: 'g-rain-1', label: 'M', flatMeasuresCm: { chestFlat: 54 }, createdAt: '2026-11-23T00:00:00Z', updatedAt: '2026-11-23T00:00:00Z' }],
  image: {
    id: 'img1',
    garmentId: 'g-rain-1',
    dataUrl: 'data:image/png;base64,SECRET_IMAGE_BYTES',
    width: 400,
    height: 400,
    source: 'manual',
    createdAt: '2026-11-23T00:00:00Z',
  },
};

describe('ragClient (integración silenciosa Spring Boot + pgvector)', () => {
  it('envía únicamente metadatos textuales y nunca filtra fotos, medidas ni precios', () => {
    const payload = buildGarmentRagPayload(SAMPLE_ITEM);
    const serialized = JSON.stringify(payload);

    expect(payload.externalId).toBe('g-rain-1');
    expect(payload.title).toBe('Chaqueta impermeable azul');
    expect(payload.content).toContain('Chaqueta');
    expect(payload.content).toContain('lluvia');
    expect(serialized).not.toContain('SECRET_IMAGE_BYTES');
    expect(serialized).not.toContain('chestFlat');
    expect(serialized).not.toContain('250');
  });

  it('autentica con JWT multi-tenant, indexa y reordena resultados híbridos', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/session')) {
        return new Response(
          JSON.stringify({
            token: 'jwt-test-token',
            tenantId: 'tnt_demo',
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.endsWith('/index/items')) {
        expect((init?.headers as Record<string, string>)?.Authorization).toBe('Bearer jwt-test-token');
        return new Response(JSON.stringify({ status: 'queued', acceptedCount: 1 }), { status: 202 });
      }
      if (url.endsWith('/search/rerank')) {
        return new Response(
          JSON.stringify({
            query: 'para lluvia',
            embeddingModel: 'local-deterministic-v1',
            results: [
              {
                externalId: 'g-rain-1',
                title: 'Chaqueta impermeable azul',
                score: 0.92,
                vectorScore: 0.85,
                textScore: 0.6,
                pageNumber: 1,
                section: 'closet',
                snippet: 'Chaqueta impermeable azul',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(null, { status: 404 });
    });

    const client = createRagClient({
      baseUrl: '/api/rag/v1',
      fetchImpl: fetchMock,
      enabled: true,
      tenantKey: 'tenant-test-key-123456',
    });

    const synced = await client.syncGarments([SAMPLE_ITEM]);
    expect(synced).toBe(true);

    const hits = await client.searchAndRerank('para lluvia', ['g-rain-1']);
    expect(hits).toHaveLength(1);
    expect(hits?.[0]?.externalId).toBe('g-rain-1');
  });

  it('degrada silenciosamente (circuit breaker) cuando Spring Boot no está disponible', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new Error('ECONNREFUSED');
    });

    const client = createRagClient({
      baseUrl: '/api/rag/v1',
      fetchImpl: fetchMock,
      enabled: true,
      tenantKey: 'tenant-offline-123456',
    });

    const first = await client.searchAndRerank('lluvia');
    const second = await client.searchAndRerank('oficina');

    expect(first).toBeNull();
    expect(second).toBeNull();
    // El circuit breaker evita reintentos repetidos mientras el servidor está caído
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
