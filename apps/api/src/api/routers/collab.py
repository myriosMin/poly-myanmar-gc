from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from ..deps import get_actor, get_store, require_approved_member
from ..models import CollabCreateRequest, CollabMembershipRecord, CollabProjectRecord, Page, ProfileRecord
from ..store_protocol import StoreProtocol

router = APIRouter(prefix="/collab", tags=["collab"])


@router.get("", response_model=Page[CollabProjectRecord])
def list_collabs(
    _: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> Page[CollabProjectRecord]:
    return store.list_collabs(page=page, page_size=page_size)


@router.post("", response_model=CollabProjectRecord)
def create_collab(
    payload: CollabCreateRequest,
    actor: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
) -> CollabProjectRecord:
    return store.create_collab(actor, payload)


@router.post("/{collab_id}/join", response_model=CollabMembershipRecord)
def join_collab(
    collab_id: UUID,
    actor: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
) -> CollabMembershipRecord:
    return store.join_collab(actor, collab_id)


@router.post("/{collab_id}/leave")
def leave_collab(
    collab_id: UUID,
    actor: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
) -> dict[str, str]:
    store.leave_collab(actor, collab_id)
    return {"status": "left", "collab_id": str(collab_id)}
