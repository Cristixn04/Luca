# ADR-001: Aplicación web instalable (PWA)

- **Estado:** Aceptada
- **Fecha:** 2026-11-18

## Contexto

Luca necesita funcionar en escritorio y móvil, operar sin conexión para toda la lógica local y ser mantenida por una sola persona.

## Decisión

Construir Luca como una **Progressive Web App (PWA)** con React, TypeScript y Vite (`vite-plugin-pwa` / Workbox).

## Alternativas descartadas

- App nativa en tiendas (iOS/Android): duplica esfuerzo y añade fricción de revisión y publicación.
- App de escritorio (Electron/Tauri): limita el uso móvil con cámara para fotografiar prendas.

## Consecuencias

- Un solo código base, actualizaciones inmediatas y capacidad offline.
- En Safari iOS se debe recordar al usuario instalar la PWA y habilitar almacenamiento persistente para mitigar purgas del navegador.
