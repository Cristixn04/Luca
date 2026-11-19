# Changelog

Todos los cambios relevantes de **Luca** se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

## [0.1.0] - 2026-11-19

### Added
- **M2 · Avatar de frente y probador con mapa de calor (`v0.1` — primer producto usable)**:
  - Formulario de medidas reactivo en memoria (Zustand) con validación en vivo, conversión `cm` ↔ `in`, opción de ocultar cifras y guía ilustrada de medición en `<dialog>` nativo (`MeasurementsPanel`, `MeasuringGuideDialog`).
  - Avatar SVG paramétrico de frente desde `BodyModel` con arquitectura de anclajes (`anchors.ts`) y plantillas paramétricas de camiseta (`TshirtTemplate`) y pantalón (`PantsTemplate`).
  - Panel de prenda temporal en plano con presets de elasticidad, preferencia de calce (`Ajustado`, `Regular`, `Holgado`), desglose numérico neutro y estados vacíos/errores (`GarmentPanel`, `FittingRoom`).
  - Mapa de calor accesible para daltonismo con patrones SVG únicos por estado (rayado diagonal, puntos, liso, puntos finos, cuadrícula), etiquetas numéricas y leyenda.
  - PWA base con `vite-plugin-pwa` (Workbox, manifiesto instalable, caché offline e icono SVG).
  - Prueba e2e en Playwright (`apps/web/e2e/fitting.spec.ts`) para el flujo medidas → prenda → mapa de calor.

### Added
- **M1 · Dominio en TypeScript: cuerpo y calce (`@luca/domain` v0.1.0)**:
  - Modelos estrictos de medidas corporales (obligatorias/opcionales), prendas en plano, zonas, estados y vistas (`src/body/types.ts`, `src/fit/types.ts`).
  - Validación de rangos, advertencias relacionales neutras (sin juicios) y conversiones `cm` ↔ `in` (`src/body/validation.ts`, `src/units.ts`).
  - Motor de holgura, elasticidad y bandas semiabiertas desde `config/fit_bands.json` con soporte para ajustes por categoría (`jacket` +4 cm en pecho).
  - `BodyModel` independiente de la vista con elipses de Ramanujan (fórmula cerrada y bisección con fondo medido, error ≤ 0,5 %) y proyecciones coherentes en frente, perfil y espalda + wireframe SVG determinista (`docs/wireframe-debug.html`).
  - Recomendador de talla según preferencia de calce (`tight`, `regular`, `loose`) con penalización de zonas tensas.
  - 36 casos *golden* en `packages/domain/fixtures/fit_golden_cases.json` y pruebas de propiedades con `fast-check`.
  - Documentación `docs/fit-engine.md` y registros `docs/adr/ADR-001` a `ADR-005`.

## [0.0.0] - 2026-11-19

### Added
- **M0 · Fundaciones**:
  - Monorepo `pnpm` (`apps/web`, `packages/domain`, `services/api`), licencia MIT, convenciones (`.editorconfig`, `.prettierrc`, `CONTRIBUTING.md`) y plantillas de issues/PR.
  - Paquete `@luca/domain` en TypeScript estricto con Vitest y aislamiento garantizado (sin APIs de navegador, red ni frameworks).
  - Aplicación web `apps/web` con Vite, React 19, TypeScript estricto, Tailwind CSS v4, primitivas accesibles (Radix/shadcn), Lucide Icons y pruebas con Vitest + Testing Library.
  - Sistema de diseño con tokens semánticos verificados contra WCAG 2.2 AA (≥ 4.5:1), tema claro/oscuro sincronizado con `<meta name="color-scheme">`, paleta de mapa de calor accesible para daltonismo y layout base con navegación responsiva.
  - Pipeline de CI en GitHub Actions (lint, typecheck, pruebas y build) y configuración de Dependabot.
  - Esqueleto base de la API sin estado en FastAPI (`GET /v1/health`, `GET /health`), `Dockerfile` mínimo y pruebas con `pytest`.
  - Documentación del tablero de proyecto para las tareas de los hitos M1 a M3 (`docs/project-board-m1-m3.md`).
