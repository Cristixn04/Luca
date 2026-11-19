.PHONY: install dev test test-coverage lint typecheck build format api-dev api-test

install:
	pnpm install

dev:
	pnpm dev

test:
	pnpm test

test-coverage:
	pnpm test:coverage

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
