import type { HealthResponse, VisionAnalyzeResponse } from './generated.types';

const INSTALL_TOKEN_KEY = 'luca-install-token';
const API_CONSENT_KEY = 'luca-api-consent';
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;

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

export async function analyzeGarmentPhoto(
  sanitizedBlob: Blob,
  options?: {
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
