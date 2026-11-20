# Changelog

Todos los cambios relevantes de **Luca** se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

## [0.4.0] - 2026-11-20

### Added
- **M5 · Vistas de perfil y de espalda (`v0.4`)**:
  - Medidas opcionales (largo de torso, fondos de pecho/cintura/cadera, ancho y largo de espalda) en `MeasurementsPanel`, persistidas cifradas en la bóveda y documentadas en `MeasuringGuideDialog`.
  - Avatares paramétricos SVG de perfil (`SideAvatarSvg` + `sideAnchors.ts`) y de espalda (`BackAvatarSvg`) alineados verticalmente con la vista frontal desde un único `BodyModel`.
  - Plantillas paramétricas de camiseta y pantalón en perfil (`SideTshirtTemplate`, `SidePantsTemplate`, usando `solveGarmentSection`) y espalda (`BackTshirtTemplate`, `BackPantsTemplate`).
  - Selector unificado `AvatarViewer` con pestañas (`Frente`, `Perfil`, `Espalda`, `3 vistas`), deslizamiento táctil horizontal en móvil, marcas `"estimado"` dinámicas cuando faltan opcionales e IDs únicos por patrón SVG en cada vista.
  - Pruebas unitarias de coherencia entre vistas (`ThreeViewsCoherence.test.tsx`) y flujo e2e Playwright (`e2e/three-views.spec.ts`).

## [0.3.0] - 2026-11-20

### Added
- **M4 · Clóset local y tallas (`v0.3` — camino mínimo útil M0–M4 completo)**:
  - Esquema y casos de uso CRUD cifrados para prendas (`garment`) y tablas de tallas en plano (`size_option`) con estados `owned`/`wishlist` y borrado en cascada (`features/closet/types.ts`, `closetService.ts`, `closetStore.ts`).
  - Editor de tabla de tallas en plano (`SizeTableEditor`) con soporte `cm`/`in` y formulario modal nativo (`GarmentFormDialog`).
  - Vista Clóset (`ClosetView`) con grilla fluida, búsqueda, filtros (categoría, estado, formalidad), ordenamiento, estados vacíos y badge en vivo de talla sugerida.
  - Detalle de prenda (`GarmentDetailView`) con probador integrado, mapa de calor, comparativa ordenada de tallas (`recommendSize`) y acceso directo al Probador.
  - Registro automático de eventos `garment_added`, `garment_edited` y `garment_deleted` en `INTERACTION_EVENT`.
  - Endurecimiento de seguridad para producción: fuentes Inter/Manrope autoalojadas (`@fontsource`), CSP estricta en `index.html` sin scripts inline ni orígenes externos (`/theme-init.js`), limpieza de memoria del clóset al bloquear la bóveda, cabeceras de seguridad en FastAPI (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) y suite de auditoría de seguridad/privacidad unitaria y e2e (`security.test.tsx`, `e2e/security.spec.ts`, `e2e/closet.spec.ts`).

## [0.2.0] - 2026-11-20

### Added
- **M3 · Almacenamiento local seguro y bóveda cifrada (`v0.2`)**:
  - Puerto `LocalStore` y adaptador `DexieLocalStore` sobre IndexedDB con esquema versionado (`v1 → v2`) y respaldo previo automático de migraciones (`infrastructure/storage/`).
  - Capa criptográfica nativa sobre WebCrypto (`infrastructure/crypto/webcrypto.ts`): AES-256-GCM con nonce aleatorio de 96 bits por registro, AAD ligado a `store` e `id`, PBKDF2-HMAC-SHA256 con 600.000 iteraciones y clave de recuperación aleatoria de 256 bits.
  - `VaultService` (`infrastructure/vault/vaultService.ts`): creación de bóveda con DEK doblemente envuelta (contraseña y clave de recuperación), modo sin cifrado con advertencia explícita, desbloqueo, bloqueo automático por inactividad, cambio de contraseña sin recifrar registros (ADR-004), exportación/importación atómica de respaldos cifrados y borrado total.
  - Infraestructura de registro de eventos de solo añadir (`INTERACTION_EVENT`) con compactación mensual en `TASTE_SNAPSHOT` (`infrastructure/storage/eventLog.ts`).
  - Monitor de almacenamiento persistente (`navigator.storage.persist()`), estimación de cuota, aviso para Safari iOS sin instalar y recordatorio periódico de respaldo (`infrastructure/storage/persistence.ts`).
  - Pantallas `VaultGate` (creación, visualización única de clave de recuperación, desbloqueo y recuperación) y `MemoryVaultPanel` integradas con persistencia cifrada de medidas en `FittingRoom`.
  - Pruebas de vectores conocidos (NIST SP 800-38D AES-256-GCM y RFC 6070 PBKDF2-HMAC-SHA256), detección de manipulación de ciphertext/IV/AAD, migración Dexie `v1 → v2`, compactación, respaldo cifrado y flujo e2e Playwright (`apps/web/e2e/vault.spec.ts`).

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
