# Evaluación de Etiquetado y Búsqueda Local (M7 · v0.6)

## 1. Arquitectura de etiquetado (puerto hexagonal `Tagger`)

El etiquetado de prendas se desacopla detrás del puerto `Tagger` en `services/api/app/ports/tagging.py` y su contraparte local en `apps/web/src/features/closet/manualTagger.ts`:

| Proveedor | Dónde corre | Uso | Red / Cuota |
| :--- | :--- | :--- | :--- |
| `GeminiVisionTagger` | `services/api` (`google-genai >= 3.2.0`) | Producción / local cuando `LUCA_LLM_API_KEY` está definida | Llama a `client.interactions.create(model="gemini-4-hydrogen", store=False)` con salida JSON estructurada |
| `MockDeterministicTagger` | `services/api` (`LUCA_TAGGER_PROVIDER=mock`) | Tests de integración y CI | Cero llamadas externas, determinista |
| `DisabledTagger` | `services/api` (por defecto sin clave) | Arranque seguro sin credenciales | Cero llamadas externas |
| `ManualTagger` (`suggestManualTags`) | `apps/web` (navegador) | Alternativa offline para cualquier usuario | 100 % local en dispositivo |

## 2. Privacidad y control del usuario

- **Sin almacenamiento en servidor**: `GeminiVisionTagger` invoca la API con `store=False`, envía imágenes ya reducidas a `<= 1024 px` y sin metadatos EXIF/GPS (limpiados en cliente antes de subir).
- **Soporte opcional de foto de espalda**: si el usuario adjunta la foto trasera (`back_file`), Gemini Vision recibe ambas vistas (frente + espalda) para inferir con mayor precisión estampados traseros, estilo y patrón.
- **Consentimiento explícito**: no se dispara ninguna petición a `/v1/vision/analyze` hasta que el usuario otorga permiso explícito en la interfaz (RF-34).
- **100 % editable**: toda sugerencia muestra su nivel de confianza (`0–100 %`) y el usuario decide si aplicarla y editar libremente categoría, patrón, estilo, formalidad, temporadas y etiquetas antes de guardar cifrado en su bóveda local.

## 3. Evaluación en CI sin coste de cuota (T7.5)

La suite automatizada verifica:

1. **Contrato de salida estructurada** (`services/api/tests/test_tagging.py`):
   - Validación de `GarmentTagSuggestion` (categoría, patrón, estilo, formalidad `1..5`, temporadas, etiquetas libres y confianzas `0..1`).
   - Comprobación de que `GeminiVisionTagger` invoca `interactions.create` con `store=False`, `response_format` JSON schema y pasa la foto trasera cuando está presente (usando cliente inyectado/mocked en tests, cero tráfico externo).
   - Verificación del endpoint `POST /v1/vision/analyze` con `include_tags=true` y `back_file`.
2. **Búsqueda local y rendimiento RNF-01** (`apps/web/src/features/closet/__tests__/closetSearch.test.ts`):
   - Índice `MiniSearch` local con normalización NFD (sin tildes), filtrado de *stop-words* en español (`de`, `para`, `con`, etc.), coincidencia por prefijo y tolerancia *fuzzy* (`0.2`).
   - Consulta de referencia: `"camisa de lino para verano"` encuentra la prenda esperada en primera posición.
   - **Benchmark RNF-01**: sobre un catálogo sintético de **1.000 prendas**, la latencia de búsqueda medida en 20 consultas cumple **`p95 <= 100 ms`** (típico `< 5 ms` en Node/navegador moderno).
3. **Prendas similares (`findSimilarGarments`)**:
   - Puntúa similitud combinando categoría (30 %), estilo (18 %), formalidad (12 %), temporadas compartidas (12 %), etiquetas compartidas (12 %), patrón (10 %) y familia cromática (6 %), explicando los motivos en la tarjeta de detalle.
4. **Flujo E2E real** (`apps/web/e2e/tagging-search.spec.ts`):
   - Etiquetado offline (`ManualTagger`), aplicación editable, búsqueda de texto libre y navegación por "Prendas similares" en Chromium.

## 4. Cómo activar Gemini Vision en desarrollo local

1. Abre `services/api/.env` (ignorado por Git).
2. Coloca tu clave de Google AI Studio en `LUCA_LLM_API_KEY=...` (opcionalmente ajusta `LUCA_TAGGER_PROVIDER=gemini` y `LUCA_GEMINI_MODEL=gemini-4-hydrogen`).
3. Arranca el backend con `make api-dev` y el frontend con `pnpm dev`.
4. Verifica en `GET /v1/health` que `tagger_provider` devuelve `"gemini-4-hydrogen"`.
