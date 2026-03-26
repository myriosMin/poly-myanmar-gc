from __future__ import annotations

from fastapi import APIRouter, Depends

from ..models import HealthResponse
from ..store_protocol import StoreProtocol
from ..deps import get_store

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=HealthResponse)
def healthz(store: StoreProtocol = Depends(get_store)) -> HealthResponse:
    return store.health()
