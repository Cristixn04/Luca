.PHONY: install dev test test-coverage e2e lint typecheck build format api-dev api-test api-lint api-client

install:
	pnpm install

dev:
	pnpm dev

test:
	pnpm test

test-coverage:
	pnpm test:coverage

e2e:
	pnpm e2e

lint:
	pnpm lint

typecheck:
	pnpm typecheck

build:
	pnpm build

format:
	pnpm format

api-dev:
	cd services/api && .venv/bin/uvicorn app.main:app --reload

api-test:
	cd services/api && .venv/bin/pytest

api-lint:
	cd services/api && .venv/bin/ruff check . && .venv/bin/mypy app tests

api-client:
	cd services/api && .venv/bin/python scripts/export_openapi.py
