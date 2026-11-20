# Guía de Despliegue de Luca (v1.0)

## 1. Arquitectura de producción
Luca se despliega en dos componentes desacoplados sin base de datos de usuarios:

1. **Web estática (PWA):** `apps/web/dist` servida por Nginx, Cloudflare Pages, Vercel o Netlify con TLS y cabeceras estrictas (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`).
2. **API auxiliar sin estado:** contenedor `services/api/Dockerfile` (`uvicorn --no-access-log`, usuario no root, `HEALTHCHECK` sobre `/v1/health`).

## 2. Despliegue rápido con Docker Compose
```bash
# 1. Configura services/api/.env (opcional si solo usas recorte local/manual)
cp services/api/.env.example services/api/.env

# 2. Construye y levanta ambos servicios
docker compose up --build -d

# 3. Verifica salud
curl -fsS http://127.0.0.1:8080/v1/health
```

## 3. Variables de entorno recomendadas en producción
| Variable | Valor recomendado | Descripción |
| :--- | :--- | :--- |
| `LUCA_ALLOWED_ORIGINS` | `https://tu-dominio.com` | Origen HTTPS exacto de la PWA |
| `LUCA_VISION_PROVIDER` | `auto` (o `rembg` / `simple`) | Proveedor de recorte en memoria |
| `LUCA_TAGGER_PROVIDER` | `llm` (o `none`) | Activa Gemini Vision en memoria (`store=False`) |
| `LUCA_LLM_API_KEY` | *(secreto en vault/CI)* | Nunca exponer al cliente |
| `LUCA_DAILY_BUDGET` | `5.0` | Tope diario de gasto automático (`503` al superar) |
| `LUCA_RATE_LIMIT` | `30/minute` | Límite por token anónimo de instalación e IP |

## 4. TLS y monitoreo sin datos personales
- Terminar TLS 1.3 en proxy inverso (Caddy / Cloudflare / Nginx) con `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- Monitorear únicamente `GET /v1/health` (latencia y código HTTP) y contadores agregados de estado (`2xx`/`4xx`/`5xx`). Nunca activar logs de cuerpos HTTP ni almacenar cabeceras `X-Luca-Install-Token`.
