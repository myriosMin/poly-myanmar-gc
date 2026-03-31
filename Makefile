SHELL := /bin/zsh

.PHONY: help install install-web install-api install-worker dev-web dev-api dev-worker build-web lint-web test-api pytest-api test-worker test smoke smoke-supabase clean

help:
	@printf "Targets:\n"
	@printf "  make install        Install web, api, and worker dependencies\n"
	@printf "  make dev-web        Start the Vite frontend\n"
	@printf "  make dev-api        Start the FastAPI app with reload\n"
	@printf "  make dev-worker     Start the worker loop once\n"
	@printf "  make build-web      Build the frontend\n"
	@printf "  make lint-web       Lint the frontend\n"
	@printf "  make test-api       Run API smoke tests\n"
	@printf "  make test-worker    Run worker smoke test\n"
	@printf "  make test           Run all smoke tests\n"
	@printf "  make clean          Remove generated build artifacts\n"

install: install-web install-api install-worker

install-web:
	npm install

install-api:
	uv sync --directory apps/api

install-worker:
	uv sync --directory apps/worker

dev-web:
	npm run dev:web

dev-api:
	npm run dev:api

dev-worker:
	npm run dev:worker

build-web:
	npm run build:web

lint-web:
	npm run lint:web

ADMIN_ACTOR_ID ?= 33333333-3333-3333-3333-333333333333

test-api:
	PYTHONPATH=apps/api/src uv run --directory apps/api python -c "from fastapi.testclient import TestClient; from api.main import app; client = TestClient(app); paths = ['/healthz', '/me', '/profiles', '/events', '/resources', '/collab']; [print(path, client.get(path).status_code) for path in paths]; response = client.get('/admin/queue', headers={'X-Actor-Id': '$(ADMIN_ACTOR_ID)'}); print('/admin/queue', response.status_code)"

pytest-api:
	uv run --directory apps/api --extra dev pytest -v

test-worker:
	PYTHONPATH=apps/worker/src uv run --directory apps/worker python -c "from worker.jobs import WorkerEngine; from worker.settings import load_settings; engine = WorkerEngine(load_settings()); report = engine.run_once(); print('drafts', len(report.generated_drafts)); print('flags', len(report.suspicious_flags)); print('notifications', report.notifications_sent)"
	PYTHONPATH=apps/worker/src uv run --directory apps/worker python -m unittest discover -s tests -p "test_*.py"

test: lint-web build-web test-api pytest-api test-worker

smoke: test

smoke-supabase:
	STORE_BACKEND=supabase $(MAKE) test-api

clean:
	rm -rf apps/web/dist
