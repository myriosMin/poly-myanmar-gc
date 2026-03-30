from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from ..deps import get_store, require_approved_member
from ..models import EventRecord, Page, ProfileRecord, RsvpRecord, RsvpRequest
from ..store_protocol import StoreProtocol

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=Page[EventRecord])
def list_events(
    _: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> Page[EventRecord]:
    return store.list_events(page=page, page_size=page_size, days_back=7)


@router.post("/{event_id}/rsvp", response_model=RsvpRecord)
def rsvp_event(
    event_id: UUID,
    payload: RsvpRequest,
    actor: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
) -> RsvpRecord:
    return store.rsvp_event(actor, event_id, payload.status)


@router.delete("/{event_id}")
def delete_event(
    event_id: UUID,
    actor: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
) -> dict[str, str]:
    store.delete_event(actor, event_id)
    return {"status": "deleted", "event_id": str(event_id)}
