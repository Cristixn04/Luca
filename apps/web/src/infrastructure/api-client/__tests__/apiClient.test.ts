import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiClientError,
  ApiConsentRequiredError,
  analyzeGarmentPhoto,
  getApiConsent,
  getOrCreateInstallToken,
  renderOutfitOnMannequin,
  setApiConsent,
} from '../client';
import { OPENAPI_CONTRACT_VERSION } from '../generated.types';
import { computeScaledDimensions, stripJpegExifSegments } from '../imageSanitizer';

describe('Cliente API OpenAPI v1 y sanitizador de imágenes (T6.1, T6.5, T6.6)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setApiConsent(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('expone la versión del contrato OpenAPI generado y genera un token anónimo estable', () => {
    expect(OPENAPI_CONTRACT_VERSION).toBe('0.8.0');

    const token1 = getOrCreateInstallToken();
    const token2 = getOrCreateInstallToken();
    expect(token1).toMatch(/^luca_[0-9a-f]{32}$/);
    expect(token2).toBe(token1);
  });

  it('bloquea cualquier envío a la API si el usuario no otorgó consentimiento explícito (RF-34)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(getApiConsent()).toBe(false);

    await expect(
      analyzeGarmentPhoto(new Blob(['img'], { type: 'image/png' })),
    ).rejects.toThrow(ApiConsentRequiredError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('envía la foto frontal, foto trasera opcional y bandera include_tags con X-Luca-Install-Token', async () => {
    setApiConsent(true);
    const mockResponse = {
      cutout_png_base64: 'iVBORw0KGgo=',
      back_cutout_png_base64: 'iVBORw0KGgo=',
      width: 256,
      height: 256,
      dominant_color_hex: '#2A9D8F',
      dominant_color_lab: { l: 59.1, a: -32.4, b: 1.2 },
      palette_hex: ['#2A9D8F'],
      coverage: 0.92,
      provider: 'simple-border',
      processing_ms: 14,
      tagging: {
        category: 'tshirt',
        category_confidence: 0.91,
        pattern: 'solid',
        pattern_confidence: 0.88,
        style: 'minimalist',
        style_confidence: 0.86,
        formality: 2,
        formality_confidence: 0.84,
        seasons: ['spring', 'summer'],
        seasons_confidence: 0.85,
        suggested_tags: ['lino', 'verano'],
        overall_confidence: 0.87,
        provider: 'mock-deterministic',
      },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await analyzeGarmentPhoto(new Blob(['png'], { type: 'image/png' }), {
      backBlob: new Blob(['back'], { type: 'image/png' }),
      includeTags: true,
      baseUrl: '',
    });

    expect(result.dominant_color_hex).toBe('#2A9D8F');
    expect(result.back_cutout_png_base64).toBe('iVBORw0KGgo=');
    expect(result.tagging?.provider).toBe('mock-deterministic');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0]!;
    const headers = init?.headers as Record<string, string>;
    expect(headers['X-Luca-Install-Token']).toMatch(/^luca_[0-9a-f]{32}$/);
    const sentForm = init?.body as FormData;
    expect(sentForm.get('file')).toBeTruthy();
    expect(sentForm.get('back_file')).toBeTruthy();
    expect(sentForm.get('include_tags')).toBe('true');

    // Error HTTP 429
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Límite de peticiones alcanzado.' }), { status: 429 }),
    );
    await expect(
      analyzeGarmentPhoto(new Blob(['png'], { type: 'image/png' }), { baseUrl: '' }),
    ).rejects.toThrow(ApiClientError);
  });

  it('escala dimensiones proporcionalmente a <= 1024 px y elimina segmentos EXIF APP1 de JPEG', () => {
    expect(computeScaledDimensions(4000, 2000, 1024)).toEqual({ width: 1024, height: 512 });
    expect(computeScaledDimensions(800, 600, 1024)).toEqual({ width: 800, height: 600 });
    expect(() => computeScaledDimensions(0, 100)).toThrow(RangeError);

    // JPEG sintético: SOI (FF D8) + APP1 EXIF (FF E1 00 08 "Exif\0\0") + SOS (FF DA 01 02) + EOI (FF D9)
    const jpegWithExif = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
      0xff, 0xda, 0x01, 0x02,
      0xff, 0xd9,
    ]);

    const stripped = stripJpegExifSegments(jpegWithExif);
    // Debe conservar SOI + SOS + EOI (8 bytes) y eliminar por completo APP1 ("Exif")
    expect(Array.from(stripped)).toEqual([0xff, 0xd8, 0xff, 0xda, 0x01, 0x02, 0xff, 0xd9]);
  });

  it('exige consentimiento para renderOutfitOnMannequin y envía silueta, metadatos y fotos con token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(
      renderOutfitOnMannequin({
        silhouette: 'female',
        garments: [{ name: 'Camiseta', category: 'tshirt', color_hex: '#2A9D8F' }],
      }),
    ).rejects.toThrow(ApiConsentRequiredError);
    expect(fetchSpy).not.toHaveBeenCalled();

    setApiConsent(true);
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          render_png_base64: 'iVBORw0KGgo=',
          width: 240,
          height: 360,
          provider: 'gemini:gemini-nano-banana-2.1',
          processing_ms: 420,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await renderOutfitOnMannequin(
      {
        silhouette: 'male',
        garments: [
          {
            name: 'Chaqueta oliva',
            category: 'jacket',
            color_hex: '#4B5724',
            visual_spec_summary: 'Solapas · Cremallera',
            imageBlob: new Blob(['png'], { type: 'image/png' }),
          },
        ],
      },
      { baseUrl: '' },
    );

    expect(res.provider).toBe('gemini:gemini-nano-banana-2.1');
    expect(res.render_png_base64).toBe('iVBORw0KGgo=');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/v1/vision/render-outfit');
    const sentForm = init?.body as FormData;
    expect(sentForm.get('silhouette')).toBe('male');
    expect(String(sentForm.get('outfit_description'))).toContain('Chaqueta oliva');
    expect(sentForm.getAll('garment_files')).toHaveLength(1);
  });
});
