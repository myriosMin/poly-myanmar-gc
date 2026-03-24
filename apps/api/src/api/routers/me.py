from __future__ import annotations

from fastapi import APIRouter, Depends

from ..deps import get_actor, get_store
from ..models import MeResponse, ProfileRecord
from ..store import InMemoryStore

router = APIRouter(tags=["me"])


@router.get("/me", response_model=MeResponse)
def read_me(
    actor: ProfileRecord = Depends(get_actor),
    store: InMemoryStore = Depends(get_store),
) -> MeResponse:
    pending_review_count = 0
    queue_access = actor.is_admin
    if queue_access:
        pending_review_count = store.queue_counts().user_applications
    return MeResponse(
        profile=actor,
        can_access_private_app=actor.can_access_private_app or actor.is_admin,
        pending_review_count=pending_review_count,
        queue_access=queue_access,
    )
