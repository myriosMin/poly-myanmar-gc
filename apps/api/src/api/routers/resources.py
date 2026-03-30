from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from ..deps import get_store, require_approved_member
from ..models import ApprovalState, Page, ProfileRecord, ResourceRecord, ResourceSubmissionRecord, ResourceSubmissionRequest
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


@router.get("/submissions", response_model=Page[ResourceSubmissionRecord])
def list_my_submissions(
    actor: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: ApprovalState | None = Query(default=None),
) -> Page[ResourceSubmissionRecord]:
    return store.list_resource_submissions(
        page=page,
        page_size=page_size,
        status=status,
        submitted_by=None if actor.is_admin else actor.id,
    )


@router.delete("/{resource_id}")
def delete_resource(
    resource_id: UUID,
    actor: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
) -> dict[str, str]:
    store.delete_resource(actor, resource_id)
    return {"status": "deleted", "resource_id": str(resource_id)}


@router.delete("/submissions/{submission_id}")
def delete_submission(
    submission_id: UUID,
    actor: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
) -> dict[str, str]:
    store.delete_resource_submission(actor, submission_id)
    return {"status": "deleted", "submission_id": str(submission_id)}

