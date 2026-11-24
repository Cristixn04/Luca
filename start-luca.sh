#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Luca — Arranque unificado del stack completo:
#   1. PostgreSQL + pgvector (Docker, puerto 5436)
#   2. Spring Boot RAG & Reordenamiento Híbrido (Docker, puerto 8080)
#   3. FastAPI de Visión IA (services/api, puerto 8001)
#   4. Frontend Web Vite (apps/web, puerto 5174)
#
# Uso:
#   ./start-luca.sh            -> Levanta todos los servicios y verifica salud
#   ./start-luca.sh --status   -> Muestra el estado actual de los servicios
#   ./start-luca.sh --stop     -> Detiene los servicios iniciados por este script
#   ./start-luca.sh --rebuild  -> Reconstruye la imagen Docker de Spring Boot
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="${ROOT_DIR}/.luca-runtime"

RAG_PORT="${LUCA_RAG_PORT:-8080}"
FASTAPI_PORT="${LUCA_FASTAPI_PORT:-8001}"
WEB_PORT="${LUCA_WEB_PORT:-5174}"

RAG_HEALTH_URL="http://127.0.0.1:${RAG_PORT}/api/rag/v1/health"
FASTAPI_HEALTH_URL="http://127.0.0.1:${FASTAPI_PORT}/health"
WEB_URL="http://localhost:${WEB_PORT}"

MODE="start"
FORCE_REBUILD="false"

for arg in "$@"; do
  case "$arg" in
    --status) MODE="status" ;;
    --stop) MODE="stop" ;;
    --rebuild) FORCE_REBUILD="true" ;;
    -h|--help)
      sed -n '4,15p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "[Luca] Opción desconocida: $arg (usa --help)" >&2
      exit 1
      ;;
  esac
done

http_ok() {
  curl -fsS --max-time 2 "$1" >/dev/null 2>&1
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local max_attempts="${3:-45}"
  local i=1
  while [ "$i" -le "$max_attempts" ]; do
    if http_ok "$url"; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "[Luca] ERROR: ${name} no respondió en ${url} tras ${max_attempts}s." >&2
  return 1
}

print_status() {
  echo "=== Estado de Luca ==="
  if http_ok "$RAG_HEALTH_URL"; then
    local rag_json
    rag_json="$(curl -fsS --max-time 2 "$RAG_HEALTH_URL")"
    echo "  [OK] Spring Boot + pgvector : http://127.0.0.1:${RAG_PORT} -> ${rag_json}"
  else
    echo "  [OFF] Spring Boot + pgvector : http://127.0.0.1:${RAG_PORT}"
  fi

  if http_ok "$FASTAPI_HEALTH_URL"; then
    echo "  [OK] FastAPI Visión IA      : http://127.0.0.1:${FASTAPI_PORT}"
  else
    echo "  [OFF] FastAPI Visión IA      : http://127.0.0.1:${FASTAPI_PORT}"
  fi

  if http_ok "$WEB_URL"; then
    echo "  [OK] Frontend Web (Vite)    : ${WEB_URL}"
  else
    echo "  [OFF] Frontend Web (Vite)    : ${WEB_URL}"
  fi
}

stop_pid_file() {
  local name="$1"
  local pid_file="$2"
  if [ -f "$pid_file" ]; then
    local pid
    pid="$(cat "$pid_file")"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo "[Luca] Deteniendo ${name} (PID ${pid})..."
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
}

if [ "$MODE" = "status" ]; then
  print_status
  exit 0
fi

if [ "$MODE" = "stop" ]; then
  stop_pid_file "Frontend Vite" "${RUNTIME_DIR}/web.pid"
  stop_pid_file "FastAPI Visión IA" "${RUNTIME_DIR}/fastapi.pid"
  echo "[Luca] Deteniendo contenedores Docker (postgres + rag-api)..."
  (cd "$ROOT_DIR" && docker compose stop postgres rag-api)
  echo "[Luca] Servicios detenidos."
  exit 0
fi

mkdir -p "$RUNTIME_DIR"

# 1. PostgreSQL (pgvector) + Spring Boot (rag-api) en Docker
echo "[Luca] 1/3 · Levantando PostgreSQL (pgvector) y Spring Boot (rag-api) en :${RAG_PORT}..."
if [ "$FORCE_REBUILD" = "true" ] || ! docker image inspect proyecto_clothebot-rag-api >/dev/null 2>&1; then
  (cd "$ROOT_DIR" && docker compose up -d --build postgres rag-api)
else
  (cd "$ROOT_DIR" && docker compose up -d postgres rag-api)
fi

if ! wait_for_http "Spring Boot (rag-api)" "$RAG_HEALTH_URL" 60; then
  echo "[Luca] Últimos logs de rag-api:" >&2
  (cd "$ROOT_DIR" && docker compose logs --tail 40 rag-api) >&2
  exit 1
fi
echo "[Luca]     Spring Boot + pgvector activos en http://127.0.0.1:${RAG_PORT}"

# 2. FastAPI de Visión IA (services/api) en :8001
echo "[Luca] 2/3 · Verificando FastAPI de Visión IA en :${FASTAPI_PORT}..."
if http_ok "$FASTAPI_HEALTH_URL"; then
  echo "[Luca]     FastAPI ya estaba activo en http://127.0.0.1:${FASTAPI_PORT}"
else
  UVICORN_BIN="${ROOT_DIR}/services/api/.venv/bin/uvicorn"
  if [ ! -x "$UVICORN_BIN" ]; then
    UVICORN_BIN="$(command -v uvicorn || true)"
  fi
  if [ -z "$UVICORN_BIN" ]; then
    echo "[Luca] ERROR: No se encontró uvicorn en services/api/.venv/bin/uvicorn ni en PATH." >&2
    exit 1
  fi
  (
    cd "${ROOT_DIR}/services/api"
    nohup "$UVICORN_BIN" app.main:app --host 127.0.0.1 --port "$FASTAPI_PORT" \
      >"${RUNTIME_DIR}/fastapi.log" 2>&1 &
    echo $! >"${RUNTIME_DIR}/fastapi.pid"
  )
  if ! wait_for_http "FastAPI Visión IA" "$FASTAPI_HEALTH_URL" 30; then
    echo "[Luca] Últimos logs de FastAPI:" >&2
    tail -n 30 "${RUNTIME_DIR}/fastapi.log" >&2 || true
    exit 1
  fi
  echo "[Luca]     FastAPI iniciado en http://127.0.0.1:${FASTAPI_PORT} (log: .luca-runtime/fastapi.log)"
fi

# 3. Frontend Web (Vite) en :5174
echo "[Luca] 3/3 · Verificando Frontend Web (Vite) en :${WEB_PORT}..."
if http_ok "$WEB_URL"; then
  echo "[Luca]     Frontend Web ya estaba activo en ${WEB_URL}"
else
  (
    cd "$ROOT_DIR"
    nohup env \
      LUCA_API_PROXY_TARGET="http://127.0.0.1:${FASTAPI_PORT}" \
      LUCA_RAG_PROXY_TARGET="http://127.0.0.1:${RAG_PORT}" \
      pnpm --filter web exec vite --port "$WEB_PORT" --strictPort \
      >"${RUNTIME_DIR}/web.log" 2>&1 &
    echo $! >"${RUNTIME_DIR}/web.pid"
  )
  if ! wait_for_http "Frontend Web (Vite)" "$WEB_URL" 30; then
    echo "[Luca] Últimos logs de Vite:" >&2
    tail -n 30 "${RUNTIME_DIR}/web.log" >&2 || true
    exit 1
  fi
  echo "[Luca]     Frontend Web iniciado en ${WEB_URL} (log: .luca-runtime/web.log)"
fi

echo ""
print_status
echo ""
echo "Comandos útiles:"
echo "  Ver estado : ./start-luca.sh --status"
echo "  Detener    : ./start-luca.sh --stop"
echo "  Reconstruir: ./start-luca.sh --rebuild"
