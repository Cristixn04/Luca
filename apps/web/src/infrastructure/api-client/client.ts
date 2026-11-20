import type {
  HealthResponse,
  OutfitRenderResponse,
  VisionAnalyzeResponse,
  WeatherSummary,
} from './generated.types';

const INSTALL_TOKEN_KEY = 'luca-install-token';
const API_CONSENT_KEY = 'luca-api-consent';
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const DEFAULT_RENDER_TIMEOUT_MS = 50_000;

let fallbackSessionToken: string | null = null;
let fallbackConsent = false;

export class ApiConsentRequiredError extends Error {
  constructor() {
    super('Se requiere tu consentimiento explícito antes de enviar fotos a la API.');
    this.name = 'ApiConsentRequiredError';
  }
}

export class ApiClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

function generateAnonymousInstallToken(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `luca_${hex}`;
}

export function getOrCreateInstallToken(): string {
  try {
    const existing = window.localStorage.getItem(INSTALL_TOKEN_KEY);
    if (existing && /^[A-Za-z0-9_-]{16,128}$/.test(existing)) {
      return existing;
    }
    const created = generateAnonymousInstallToken();
    window.localStorage.setItem(INSTALL_TOKEN_KEY, created);
    return created;
  } catch {
    if (!fallbackSessionToken) {
      fallbackSessionToken = generateAnonymousInstallToken();
    }
    return fallbackSessionToken;
  }
}

export function getApiConsent(): boolean {
  try {
    return window.localStorage.getItem(API_CONSENT_KEY) === 'granted';
  } catch {
    return fallbackConsent;
  }
}

export function setApiConsent(granted: boolean): void {
  fallbackConsent = granted;
  try {
    if (granted) {
      window.localStorage.setItem(API_CONSENT_KEY, 'granted');
    } else {
      window.localStorage.removeItem(API_CONSENT_KEY);
    }
  } catch {
    // Mantiene la preferencia en sesión si el almacenamiento está restringido.
  }
}

export function resolveApiBaseUrl(override?: string): string {
  if (override !== undefined) {
    return override.replace(/\/+$/, '');
  }
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  return (envUrl ?? '').replace(/\/+$/, '');
}

export async function fetchApiHealth(options?: {
  baseUrl?: string;
  signal?: AbortSignal;
}): Promise<HealthResponse> {
  const baseUrl = resolveApiBaseUrl(options?.baseUrl);
  const res = await fetch(`${baseUrl}/v1/health`, {
    method: 'GET',
    signal: options?.signal,
  });
  if (!res.ok) {
    throw new ApiClientError('La API no respondió correctamente.', res.status);
  }
  return (await res.json()) as HealthResponse;
}

export async function fetchWeatherByCoordinates(
  lat: number,
  lon: number,
  options?: { baseUrl?: string; signal?: AbortSignal },
): Promise<WeatherSummary> {
  const baseUrl = resolveApiBaseUrl(options?.baseUrl);
  // Redondeo previo en cliente (~10 km) por privacidad por diseño (sección 4.2)
  const roundedLat = Math.round(lat * 10) / 10;
  const roundedLon = Math.round(lon * 10) / 10;
  const res = await fetch(
    `${baseUrl}/v1/weather?lat=${encodeURIComponent(String(roundedLat))}&lon=${encodeURIComponent(String(roundedLon))}`,
    {
      method: 'GET',
      signal: options?.signal,
    },
  );
  if (!res.ok) {
    throw new ApiClientError('No se pudo obtener el clima.', res.status);
  }
  return (await res.json()) as WeatherSummary;
}

export async function analyzeGarmentPhoto(
  sanitizedBlob: Blob,
  options?: {
    backBlob?: Blob;
    includeTags?: boolean;
    baseUrl?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
  },
): Promise<VisionAnalyzeResponse> {
  if (!getApiConsent()) {
    throw new ApiConsentRequiredError();
  }

  const baseUrl = resolveApiBaseUrl(options?.baseUrl);
  const token = getOrCreateInstallToken();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  options?.signal?.addEventListener('abort', onExternalAbort, { once: true });

  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const form = new FormData();
    form.append('file', sanitizedBlob, 'garment.png');
    if (options?.backBlob) {
      form.append('back_file', options.backBlob, 'garment-back.png');
    }
    if (options?.includeTags) {
      form.append('include_tags', 'true');
    }

    const res = await fetch(`${baseUrl}/v1/vision/analyze`, {
      method: 'POST',
      headers: {
        'X-Luca-Install-Token': token,
      },
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = 'No se pudo analizar la foto en la API.';
      try {
        const body = (await res.json()) as { detail?: string };
        if (body.detail) detail = body.detail;
      } catch {
        // Ignora cuerpos no JSON
      }
      throw new ApiClientError(detail, res.status);
    }

    return (await res.json()) as VisionAnalyzeResponse;
  } finally {
    window.clearTimeout(timeoutId);
    options?.signal?.removeEventListener('abort', onExternalAbort);
  }
}

export interface OutfitRenderGarmentPayload {
  readonly name: string;
  readonly category: string;
  readonly color_hex?: string;
  readonly fit_summary?: string;
  readonly visual_spec_summary?: string;
  readonly imageBlob?: Blob;
}

export async function renderOutfitOnMannequin(
  input: {
    silhouette: 'female' | 'male';
    garments: readonly OutfitRenderGarmentPayload[];
    mannequinBlob?: Blob | null;
  },
  options?: {
    baseUrl?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
  },
): Promise<OutfitRenderResponse> {
  if (!getApiConsent()) {
    throw new ApiConsentRequiredError();
  }

  const baseUrl = resolveApiBaseUrl(options?.baseUrl);
  const token = getOrCreateInstallToken();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_RENDER_TIMEOUT_MS;

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  options?.signal?.addEventListener('abort', onExternalAbort, { once: true });

  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const limited = input.garments.slice(0, 4);
    const metaPayload = limited.map((g) => ({
      name: g.name,
      category: g.category,
      ...(g.color_hex ? { color_hex: g.color_hex } : {}),
      ...(g.fit_summary ? { fit_summary: g.fit_summary } : {}),
      ...(g.visual_spec_summary ? { visual_spec_summary: g.visual_spec_summary } : {}),
      has_image: Boolean(g.imageBlob),
    }));

    const form = new FormData();
    form.append('silhouette', input.silhouette);
    form.append('outfit_description', JSON.stringify(metaPayload));
    if (input.mannequinBlob) {
      form.append('mannequin_file', input.mannequinBlob, 'mannequin.png');
    }
    limited.forEach((g, idx) => {
      if (g.imageBlob) {
        form.append('garment_files', g.imageBlob, `garment-${idx + 1}.png`);
      }
    });

    const res = await fetch(`${baseUrl}/v1/vision/render-outfit`, {
      method: 'POST',
      headers: {
        'X-Luca-Install-Token': token,
      },
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = 'No se pudo generar el render realista IA.';
      try {
        const body = (await res.json()) as { detail?: string };
        if (body.detail) detail = body.detail;
      } catch {
        // Ignora cuerpos no JSON
      }
      throw new ApiClientError(detail, res.status);
    }

    return (await res.json()) as OutfitRenderResponse;
  } finally {
    window.clearTimeout(timeoutId);
    options?.signal?.removeEventListener('abort', onExternalAbort);
  }
}
