import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const API_PROXY_TARGET = process.env.LUCA_API_PROXY_TARGET || 'http://127.0.0.1:8001';
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;
const weatherDevCache = new Map<string, { expiresAt: number; payload: string }>();

function describeWmoCode(code: number): string {
  if (code === 0) return 'Despejado';
  if (code === 1 || code === 2 || code === 3) return 'Parcialmente nublado';
  if (code === 45 || code === 48) return 'Niebla';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'Lluvia';
  if ([71, 73, 75, 85, 86].includes(code)) return 'Nieve';
  if ([95, 96, 99].includes(code)) return 'Tormenta';
  return 'Variable';
}

async function handleWeatherDevFallback(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname !== '/v1/weather' || req.method !== 'GET') {
    return false;
  }

  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    res.statusCode = 422;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ detail: 'Coordenadas inválidas.' }));
    return true;
  }

  const roundedLat = Math.round(lat * 10) / 10;
  const roundedLon = Math.round(lon * 10) / 10;

  // 1. Intenta primero la API FastAPI local si está levantada
  try {
    const upstream = await fetch(
      `${API_PROXY_TARGET}/v1/weather?lat=${encodeURIComponent(String(roundedLat))}&lon=${encodeURIComponent(String(roundedLon))}`,
      { signal: AbortSignal.timeout(2500) },
    );
    if (upstream.ok) {
      const body = await upstream.text();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(body);
      return true;
    }
  } catch {
    // FastAPI no está ejecutándose localmente: continuar con respaldo server-side a Open-Meteo
  }

  // 2. Caché en memoria por celda redondeada (~10 km, 30 min)
  const cellKey = `${roundedLat.toFixed(1)},${roundedLon.toFixed(1)}`;
  const now = Date.now();
  const cached = weatherDevCache.get(cellKey);
  if (cached && now < cached.expiresAt) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(cached.payload);
    return true;
  }

  // 3. Consulta directa server-side a Open-Meteo (el navegador solo habla con 'self')
  try {
    const omUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLon}` +
      '&current=temperature_2m,apparent_temperature,weather_code,precipitation' +
      '&hourly=precipitation_probability&forecast_days=1';
    const omResp = await fetch(omUrl, { signal: AbortSignal.timeout(10_000) });
    if (!omResp.ok) {
      throw new Error(`Open-Meteo HTTP ${omResp.status}`);
    }
    const data = (await omResp.json()) as {
      current?: { temperature_2m?: number; apparent_temperature?: number; weather_code?: number };
      hourly?: { precipitation_probability?: Array<number | null> };
    };
    const temp = Number(data.current?.temperature_2m ?? 20);
    const apparent = Number(data.current?.apparent_temperature ?? temp);
    const wmo = Number(data.current?.weather_code ?? 1);
    const precip = Math.max(0, Math.min(100, Math.round(Number(data.hourly?.precipitation_probability?.[0] ?? 0))));

    const summary = {
      temperature_c: Math.round(temp * 10) / 10,
      apparent_temperature_c: Math.round(apparent * 10) / 10,
      precipitation_probability: precip,
      condition: describeWmoCode(wmo),
      rounded_lat: roundedLat,
      rounded_lon: roundedLon,
      cached: false,
      provider: 'open-meteo',
    };
    const body = JSON.stringify(summary);
    weatherDevCache.set(cellKey, {
      expiresAt: now + WEATHER_CACHE_TTL_MS,
      payload: JSON.stringify({ ...summary, cached: true }),
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
    return true;
  } catch {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        detail: 'No se pudo consultar el clima en este momento. Ajusta la temperatura manualmente.',
      }),
    );
    return true;
  }
}

function weatherDevFallbackPlugin(): Plugin {
  const middleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void,
  ) => {
    if (!req.url?.startsWith('/v1/weather')) {
      next();
      return;
    }
    void handleWeatherDevFallback(req, res).then((handled) => {
      if (!handled) next();
    });
  };

  return {
    name: 'luca-weather-dev-fallback',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [
    weatherDevFallbackPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'theme-init.js'],
      manifest: {
        name: 'Luca — Clóset inteligente y probador de calce',
        short_name: 'Luca',
        description:
          'Probador de calce paramétrico, clóset local y asesor de color con privacidad por diseño.',
        lang: 'es',
        theme_color: '#1F5F6B',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallbackDenylist: [/^\/v1\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'storage-vendor': ['dexie', 'minisearch', 'zustand'],
          'icons-vendor': ['lucide-react'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/v1': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/v1': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
});
