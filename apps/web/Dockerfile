# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder
WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/domain/package.json packages/domain/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

COPY packages/domain packages/domain
COPY apps/web apps/web

RUN pnpm --filter @luca/domain build && pnpm --filter web build

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
