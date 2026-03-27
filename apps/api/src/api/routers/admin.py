from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from ..deps import get_actor, get_store, require_reviewer, require_superadmin
from ..models import (
    ApprovalRequestRecord,
    ApprovalState,
    CollabProjectRecord,
    EventDraftRecord,
    FlagRecord,
    ModerationAction,
    Page,
    ProfileRecord,
    ResourceSubmissionRecord,
    QueueCounts,
)
from ..store_protocol import StoreProtocol

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/queue", response_model=QueueCounts)
def queue_counts(
    _: ProfileRecord = Depends(require_reviewer),
    store: StoreProtocol = Depends(get_store),
) -> QueueCounts:
    return store.queue_counts()


@router.get("/approvals", response_model=Page[ApprovalRequestRecord])
def list_approvals(
    _: ProfileRecord = Depends(require_reviewer),
    store: StoreProtocol = Depends(get_store),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> Page[ApprovalRequestRecord]:
    return store.list_pending_approval_requests(page=page, page_size=page_size)


@router.post("/approvals/{request_id}/approve", response_model=ApprovalRequestRecord)
def approve_approval(
    request_id: UUID,
    actor: ProfileRecord = Depends(require_reviewer),
    store: StoreProtocol = Depends(get_store),
) -> ApprovalRequestRecord:
    return store.review_user_application(actor, request_id, action=ModerationAction.approve)


@router.post("/approvals/{request_id}/reject", response_model=ApprovalRequestRecord)
def reject_approval(
    request_id: UUID,
    actor: ProfileRecord = Depends(require_reviewer),
    store: StoreProtocol = Depends(get_store),
) -> ApprovalRequestRecord:
    return store.review_user_application(actor, request_id, action=ModerationAction.reject)


@router.get("/resources/submissions", response_model=Page[ResourceSubmissionRecord])
def list_submissions(
    _: ProfileRecord = Depends(require_reviewer),
    store: StoreProtocol = Depends(get_store),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> Page[ResourceSubmissionRecord]:
    return store.list_resource_submissions(page=page, page_size=page_size, status=ApprovalState.pending)


@router.post("/resources/submissions/{submission_id}/approve", response_model=ResourceSubmissionRecord)
def approve_submission(
    submission_id: UUID,
    actor: ProfileRecord = Depends(require_reviewer),
    store: StoreProtocol = Depends(get_store),
) -> ResourceSubmissionRecord:
    return store.publish_resource(actor, submission_id, approved=True)


@router.post("/resources/submissions/{submission_id}/reject", response_model=ResourceSubmissionRecord)
def reject_submission(
    submission_id: UUID,
    actor: ProfileRecord = Depends(require_reviewer),
    store: StoreProtocol = Depends(get_store),
) -> ResourceSubmissionRecord:
    return store.publish_resource(actor, submission_id, approved=False)


@router.get("/event-drafts", response_model=Page[EventDraftRecord])
def list_event_drafts(
    _: ProfileRecord = Depends(require_reviewer),
    store: StoreProtocol = Depends(get_store),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> Page[EventDraftRecord]:
    return store.list_event_drafts_pending(page=page, page_size=page_size)


@router.post("/event-drafts/{draft_id}/publish", response_model=EventDraftRecord)
def publish_event_draft(
    draft_id: UUID,
    actor: ProfileRecord = Depends(require_reviewer),
    store: StoreProtocol = Depends(get_store),
) -> EventDraftRecord:
    return store.publish_event_draft(actor, draft_id, approved=True)


@router.post("/event-drafts/{draft_id}/reject", response_model=EventDraftRecord)
def reject_event_draft(
    draft_id: UUID,
    actor: ProfileRecord = Depends(require_reviewer),
    store: StoreProtocol = Depends(get_store),
) -> EventDraftRecord:
    return store.publish_event_draft(actor, draft_id, approved=False)


@router.post("/event-drafts", response_model=EventDraftRecord)
def create_event_draft(
    draft: EventDraftRecord,
    actor: ProfileRecord = Depends(require_superadmin),
    store: StoreProtocol = Depends(get_store),
) -> EventDraftRecord:
    """Worker-only: push a generated event draft for admin review."""
    return store.store_event_draft(draft)


@router.post("/flags", response_model=FlagRecord)
def create_flag(
    flag: FlagRecord,
    actor: ProfileRecord = Depends(require_superadmin),
    store: StoreProtocol = Depends(get_store),
) -> FlagRecord:
    """Worker-only: push a suspicious-activity flag for admin review."""
    return store.store_flag(flag)


@router.get("/flags", response_model=Page[FlagRecord])
def list_flags(
    _: ProfileRecord = Depends(require_reviewer),
    store: StoreProtocol = Depends(get_store),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> Page[FlagRecord]:
    return store.list_flags(page=page, page_size=page_size)


@router.post("/users/{user_id}/ban", response_model=dict[str, str])
def ban_user(
    user_id: UUID,
    actor: ProfileRecord = Depends(require_superadmin),
    store: StoreProtocol = Depends(get_store),
) -> dict[str, str]:
    profile = store.ban_user(actor, user_id)
    return {"status": profile.approval_status.value, "user_id": str(user_id)}


@router.post("/users/{user_id}/unban", response_model=dict[str, str])
def unban_user(
    user_id: UUID,
    actor: ProfileRecord = Depends(require_superadmin),
    store: StoreProtocol = Depends(get_store),
) -> dict[str, str]:
    profile = store.unban_user(actor, user_id)
    return {"status": profile.approval_status.value, "user_id": str(user_id)}


@router.delete("/collab/{collab_id}", response_model=dict[str, str])
def remove_collab(
    collab_id: UUID,
    actor: ProfileRecord = Depends(require_reviewer),
    store: StoreProtocol = Depends(get_store),
) -> dict[str, str]:
    store.delete_collab(actor, collab_id)
    return {"status": "removed", "collab_id": str(collab_id)}
