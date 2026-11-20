# Changelog

Todos los cambios relevantes de **Luca** se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

## [1.0.0] - 2026-11-20

### Added
- **M11 · Pulido, accesibilidad y lanzamiento (`v1.0.0`)**:
  - **7 plantillas SVG paramétricas en 3 vistas** (`Frente`, `Perfil`, `Espalda`): camiseta, manga larga, chaqueta (con solapas y línea frontal), pantalón, short, falda y vestido (con zonas de pecho, cintura y cadera), integradas en Probador, Clóset y Outfits en capas.
  - **Onboarding guiado** (`OnboardingDialog`): asistente de 3 pasos (medidas → colorimetría → primera prenda o ejemplos) accesible sin bloquear a usuarios avanzados.
  - **i18n Español / Inglés (`ES` / `EN`)** en `i18nStore.ts` con sincronización de `<html lang>` y selector rápido de unidades (`cm` / `in`) en el encabezado.
  - **Pantalla "Cómo se protegen tus datos"** (`PrivacyView`) y política de privacidad en `docs/privacy-policy.md`.
  - **Optimización de rendimiento y accesibilidad**: *code-splitting* (`manualChunks` en `vite.config.ts`), suite de auditoría WCAG (`accessibility.test.tsx`) y flujo E2E de lanzamiento (`e2e/m11-release.spec.ts`).
  - **Despliegue listo para producción**: `apps/web/Dockerfile`, `apps/web/nginx.conf` (CSP y cabeceras endurecidas + proxy `/v1`), `docker-compose.yml` y guía `docs/deployment.md`.

## [0.9.0] - 2026-11-20

### Added
- **M10 · Memoria y gustos (`v0.9`)**:
  - Motor de gustos explicable en `@luca/domain` (`packages/domain/src/taste/`): suavizado de Laplace `(pos + 1)/(pos + neg + 2)`, decaimiento exponencial con vida media de 90 días, arranque en frío (`< 10` interacciones), anulación explícita (fijar/vetar) y soporte de snapshots compactados.
  - Componente **Gusto** integrado en el motor de outfits con recalibración automática de pesos (`0.25 Color · 0.15 Estilo · 0.20 Calce · 0.15 Ocasión · 0.10 Variedad · 0.15 Gusto`).
  - Captura de feedback en `OutfitsView` (*Me gusta*, *No me gusta*, *Descartar*, *Guardar/Favorito*, *Usar*) y barra **Gusto** visible cuando el perfil está activo.
  - Sección **Tus gustos aprendidos** (`TasteMemorySection`) en el panel Memoria: ver afinidades e interacciones que las respaldan, fijar o vetar rasgos/colores, pausar o reanudar el aprendizaje, olvidar por categoría o por completo y aplicar política de retención (`6 / 12 / 24` meses) con compactación ponderada en `TASTE_SNAPSHOT`.
  - Selector desplegable de prendas guardadas del clóset (`Mi clóset`) separado de `Prenda rápida` en `GarmentPanel`.
  - Pruebas unitarias del motor de gustos (`taste.test.ts`), integración (`TasteMemory.test.tsx`) y prueba E2E de privacidad de red (`e2e/taste-memory.spec.ts` con cero peticiones externas).

## [0.8.0] - 2026-11-20

### Added
- **M9 · Outfits, clima, uso y costo por uso (`v0.8`)**:
  - Motor de outfits en `@luca/domain` (`packages/domain/src/outfits/`): ocasiones, bandas térmicas, generador por ranuras top-K (`K = 15`), puntaje explicable de 5 componentes (Color 30 %, Calce 25 %, Estilo 20 %, Ocasión/clima 15 %, Variedad 10 %) y selección de 3 propuestas diversas (≥ 2 prendas distintas), verificado con clóset de prueba de 30 prendas.
  - Puerto `WeatherProvider` en `services/api`, adaptador `OpenMeteoWeatherProvider` con redondeo a ~10 km y caché TTL 30 min, `MockWeatherProvider` para CI, endpoint `GET /v1/weather` y contrato OpenAPI v0.8.0.
  - Pantalla `OutfitsView` (`features/outfits/`) con selector de ocasión, temperatura manual / ciudades / ubicación aproximada opcional, avatar en capas en 3 vistas (`outfitLayers`), tarjetas con fotos, guardado, favoritos y registro de uso en un clic (`wear_log`, `outfit` cifrados en bóveda).
  - Métricas de uso, CPW real y proyectado (30 usos), detección de prendas huérfanas y simulación **"Desbloquea N outfits nuevos"** para lista de deseos integradas en `ClosetView` y `GarmentDetailView`, más flujo E2E `e2e/outfits.spec.ts`.

### Changed
- Limpieza editorial de la interfaz: eliminados subtítulos irrelevantes, fórmulas internas y badges de versión de desarrollo en `AppShell`, `FittingRoom`, `ClosetView`, `GarmentDetailView`, `ColorView` y `MemoryVaultPanel`.

## [0.7.0] - 2026-11-20

### Added
- **M8 · Colorimetría estacional (`v0.7`)**:
  - Transformación sRGB ↔ CIELAB (D65) y distancia perceptual **CIEDE2000 ($\Delta E_{00}$)** en `packages/domain/src/color/cielab.ts`, verificada contra 10 pares oficiales de Sharma, Wu y Dalal (2005) (`< 0.0005`).
  - Paletas curadas de 14 colores × 12 estaciones en `config/color_palettes.json` y `packages/domain/src/color/palettes.ts` con fuentes documentadas (Sci\ART 12-Tone / Munsell) y escalas guiadas para piel, cabello y ojos.
  - Árbol de decisión de subtono, valor, croma y contraste (`classifier.ts`) con Top 2 de estaciones, nivel de confianza y explicación calibrada sobre 10 perfiles representativos (`docs/colorimetry.md`).
  - Motor de afinidad cromática `evaluateGarmentColorHarmony` (`A = exp(-ΔE₀₀_mín / 15)`) con desglose ($\Delta L^*$, $\Delta C^*$, tono más cercano de paleta).
  - Pantalla `ColorView` (`features/color/`) con consejos de luz natural, muestras guiadas, selección manual de estación, opción de **Ignorar colorimetría**, persistencia cifrada en `color_profile` y limpieza en memoria al bloquear la bóveda.
  - Integración de afinidad de paleta en tarjetas de `ClosetView`, desglose detallado en `GarmentDetailView` y pruebas unitarias + E2E (`e2e/colorimetry.spec.ts`).

### Fixed
- Desacoplado el recorte de fondo (`POST /v1/vision/analyze`) de los timeouts o saturación (`503 UNAVAILABLE`) del proveedor de etiquetado IA, añadiendo `tagging_warning`, respaldo automático con `ManualTagger`, flood-fill desde los 4 bordes en `SimpleBorderBackgroundRemover` y proxy `/v1` en `vite preview`.

## [0.6.0] - 2026-11-20

### Added
- **M7 · Etiquetado y búsqueda (`v0.6`)**:
  - Puerto hexagonal `Tagger` (`services/api/app/ports/tagging.py`) y adaptadores `GeminiVisionTagger` (`google-genai >= 3.2.0`, modelo `gemini-4-hydrogen`, `store=False`, salida JSON estructurada `GarmentTagSuggestion`), `MockDeterministicTagger` para CI sin coste de cuota y `DisabledTagger` sin credenciales (`services/api/.env` + `.env.example`).
  - Extensión de `POST /v1/vision/analyze` y contrato OpenAPI v0.6.0 con soporte opcional de foto trasera (`back_file` → `back_cutout_png_base64`) y etiquetado (`include_tags=true` → `tagging`).
  - Etiquetas editables con confianza (`pattern`, `style`, `seasons`, `tags`), `ManualTagger` local 100 % offline (`manualTagger.ts`), foto de espalda opcional cifrada en `garment_image` con toggle `[Frente | Espalda]` y color real (`dominantColorHex`) aplicado sobre las 3 vistas SVG del avatar.
  - Motor de búsqueda local en texto libre sobre `MiniSearch` (`closetSearch.ts`) con normalización sin tildes, *stop-words* en español, tolerancia *fuzzy* y benchmark RNF-01 verificado (`p95 <= 100 ms` con 1.000 prendas).
  - Tarjeta de **"Prendas similares"** (`findSimilarGarments`) en `GarmentDetailView`, evaluación en `docs/tagging-evaluation.md` y pruebas unitarias + E2E (`e2e/tagging-search.spec.ts`).

## [0.5.0] - 2026-11-20

### Added
- **M6 · API de servicios e ingesta de fotos (`v0.5`)**:
  - Configuración formal de `services/api` con CI (`ruff`, `mypy --strict`, `pytest`), `Dockerfile` de producción (`--no-access-log`, `HEALTHCHECK`, usuario no root), contrato OpenAPI v1 y generador `make api-client` (`docs/api.md`).
  - Puerto hexagonal `BackgroundRemover` con adaptadores en memoria (`RembgBackgroundRemover` y `SimpleBorderBackgroundRemover`) y extracción de color dominante en CIELAB (`k-means` sobre la máscara alfa).
  - Endpoint `POST /v1/vision/analyze` con límite de tamaño (`413`), verificación real de bytes mágicos JPEG/PNG/WEBP (`415`), protección contra bombas de descompresión, timeout (`504`), token anónimo de instalación (`401`), rate limiting por token/IP (`429`), tope de gasto diario (`503`) y `Cache-Control: no-store`.
  - Sanitizador de imágenes en cliente (`imageSanitizer.ts`) que reduce a ≤ 1024 px y elimina metadatos EXIF/GPS antes de guardar o enviar, cliente API tipado con `AbortController` y puerta de consentimiento explícito (`PhotoIngestSection`).
  - Persistencia cifrada de fotos en `garment_image`, alternativa 100 % manual (recorte rectangular local + selector de color editable) y evaluación con 30 fotos en `docs/vision-evaluation.md`.

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
