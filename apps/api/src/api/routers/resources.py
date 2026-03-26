from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..deps import get_actor, get_store, require_approved_member, require_reviewer
from ..models import Page, ProfileRecord, ResourceRecord, ResourceSubmissionRecord, ResourceSubmissionRequest
from ..store_protocol import StoreProtocol

router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("", response_model=Page[ResourceRecord])
def list_resources(
    _: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> Page[ResourceRecord]:
    return store.list_resources(page=page, page_size=page_size)


@router.post("/submissions", response_model=ResourceSubmissionRecord)
def submit_resource(
    payload: ResourceSubmissionRequest,
    actor: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
) -> ResourceSubmissionRecord:
    return store.submit_resource(actor, payload)

