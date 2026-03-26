from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import (
    admin_router,
    collab_router,
    events_router,
    health_router,
    me_router,
    profiles_router,
    resources_router,
    telegram_router,
)
from .settings import get_settings
from .store import create_store


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version=settings.app_version)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.store = create_store(settings.store_backend)
    app.include_router(health_router)
    app.include_router(me_router)
    app.include_router(profiles_router)
    app.include_router(events_router)
    app.include_router(resources_router)
    app.include_router(collab_router)
    app.include_router(admin_router)
    app.include_router(telegram_router)
    return app


app = create_app()


def main() -> None:
    import uvicorn

    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=False)

