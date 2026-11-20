# Contrato de la API sin estado (`services/api` · v1)

La API de Luca es **sin estado y sin cuentas**: no tiene base de datos de usuarios, no persiste fotos en disco ni registra cuerpos de peticiones ni cabeceras identificadoras.

## Endpoints activos (`v0.5`)

| Método y ruta | Auth | Descripción |
| :-- | :-- | :-- |
| `GET /v1/health` | Pública | Estado del servicio, versión y proveedor de visión activo (`Cache-Control: no-store`) |
| `GET /v1/openapi.json` | Pública | Contrato OpenAPI 3.x desde el cual se genera el cliente TypeScript (`make api-client`) |
| `POST /v1/vision/analyze` | `X-Luca-Install-Token` | Recibe una foto de prenda reducida y sin EXIF (`multipart/form-data`), recorta el fondo en memoria y devuelve el PNG RGBA en Base64 junto al color dominante en CIELAB (`k-means`) |

## Controles de seguridad

- **Token anónimo de instalación (`X-Luca-Install-Token`):** identificador aleatorio generado localmente en el navegador (16–128 caracteres `[A-Za-z0-9_-]`), sin vínculo con la identidad del usuario.
- **Validación real de archivo:** límite duro de lectura en memoria (`LUCA_MAX_UPLOAD_BYTES`, por defecto 5 MB → `413`), verificación de bytes mágicos con Pillow `verify()` únicamente para `JPEG`, `PNG` y `WEBP` (`415`) y límite contra bombas de descompresión (`25 MP`).
- **Tiempo máximo:** `LUCA_VISION_TIMEOUT_SECONDS` (por defecto 15 s → `504`).
- **Límite de uso:** ventana deslizante en memoria por instalación y por IP (`LUCA_RATE_LIMIT`, por defecto `30/minute` → `429` con `Retry-After`).
- **Tope de gasto diario:** corte automático diario (`LUCA_DAILY_BUDGET` → `503`).
- **Cabeceras de endurecimiento:** `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- **Cero logs de contenido:** el servidor corre con `--no-access-log` en producción y jamás imprime bytes de imágenes ni tokens.

## Regenerar cliente TypeScript

```bash
make api-client
```

Genera `apps/web/src/infrastructure/api-client/openapi.v1.json` y `generated.types.ts`.
