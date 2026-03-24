from __future__ import annotations

from fastapi import APIRouter, Depends

from ..models import HealthResponse
from ..store import InMemoryStore
from ..deps import get_store

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=HealthResponse)
def healthz(store: InMemoryStore = Depends(get_store)) -> HealthResponse:
    return store.health()
