SHELL := /bin/zsh

.PHONY: help install install-web install-api dev-web dev-api build-web lint-web test-api pytest-api test smoke smoke-supabase clean

help:
	@printf "Targets:\n"
	@printf "  make install        Install web and api dependencies\n"
	@printf "  make dev-web        Start the Vite frontend\n"
	@printf "  make dev-api        Start the FastAPI app with reload\n"
	@printf "  make build-web      Build the frontend\n"
	@printf "  make lint-web       Lint the frontend\n"
	@printf "  make test-api       Run API smoke tests\n"
	@printf "  make test           Run all smoke tests\n"
	@printf "  make clean          Remove generated build artifacts\n"

install: install-web install-api

install-web:
	npm install

install-api:
	uv sync --directory apps/api

dev-web:
	npm run dev:web

dev-api:
	npm run dev:api

build-web:
	npm run build:web

lint-web:
	npm run lint:web

test-api:
	PYTHONPATH=apps/api/src uv run --directory apps/api python -c "\
from fastapi.testclient import TestClient; \
from api.main import app; \
client = TestClient(app); \
checks = [('/healthz', 200)]; \
auth_paths = ['/me', '/profiles', '/events', '/resources', '/collab', '/admin/queue']; \
[checks.append((p, 401)) for p in auth_paths]; \
failures = []; \
[failures.append(f'{path}: expected {exp}, got {client.get(path).status_code}') for path, exp in checks if client.get(path).status_code != exp]; \
print('All checks passed.') if not failures else [print(f'FAIL: {f}') for f in failures] or exit(1)"

pytest-api:
	uv run --directory apps/api --extra dev pytest -v

test: lint-web build-web test-api pytest-api

smoke: test

smoke-supabase:
	STORE_BACKEND=supabase $(MAKE) test-api

clean:
	rm -rf apps/web/dist
