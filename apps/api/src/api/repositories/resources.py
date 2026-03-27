from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from postgrest import APIResponse, CountMethod
from supabase import Client

from ..models import (
    AdminActionRecord,
    ApprovalState,
    ModerationAction,
    Page,
    ProfileRecord,
    ResourceRecord,
    ResourceSubmissionRecord,
    ResourceSubmissionRequest,
    ReviewObjectType,
)
from ..supabase_client import get_supabase_client


def _now() -> datetime:
    return datetime.now(UTC)


def _resolve_client(client: Client | None) -> Client:
    return client or get_supabase_client()


def _hydrate_resource(row: dict[str, Any]) -> ResourceRecord:
    return ResourceRecord(**row)


def _hydrate_submission(row: dict[str, Any]) -> ResourceSubmissionRecord:
    return ResourceSubmissionRecord(**row)


def _hydrate_admin_action(row: dict[str, Any]) -> AdminActionRecord:
    return AdminActionRecord(**row)


def _paginate(
    response: APIResponse,
    *,
    page: int,
    page_size: int,
    hydrate: Any,
) -> Page[Any]:
    return Page(
        items=[hydrate(row) for row in response.data],
        page=page,
        page_size=page_size,
        total=response.count or 0,
    )


def _submission_by_id(client: Client, submission_id: UUID) -> ResourceSubmissionRecord | None:
    response = client.table("resource_submissions").select("*").eq("id", str(submission_id)).maybe_single().execute()
    if response is None:
        return None
    return _hydrate_submission(response.data)


def _resource_by_id(client: Client, resource_id: UUID) -> ResourceRecord | None:
    response = client.table("resources").select("*").eq("id", str(resource_id)).maybe_single().execute()
    if response is None:
        return None
    return _hydrate_resource(response.data)


def _log_action(
    actor_id: UUID,
    target_type: ReviewObjectType | str,
    target_id: UUID,
    action: ModerationAction,
    *,
    reason: str | None = None,
    payload: dict[str, Any] | None = None,
    client: Client | None = None,
) -> AdminActionRecord:
    resolved_client = _resolve_client(client)
    response = (
        resolved_client.table("admin_actions")
        .insert(
            {
                "actor_id": str(actor_id),
                "target_type": str(target_type),
                "target_id": str(target_id),
                "action": str(action),
                "reason": reason,
                "payload": payload or {},
            }
        )
        .execute()
    )
    return _hydrate_admin_action(response.data[0])


def list_resources(
    *,
    page: int = 1,
    page_size: int = 20,
    client: Client | None = None,
) -> Page[ResourceRecord]:
    resolved_client = _resolve_client(client)
    offset = (page - 1) * page_size
    response = (
        resolved_client.table("resources")
        .select("*", count=CountMethod.exact)
        .order("published_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return _paginate(response, page=page, page_size=page_size, hydrate=_hydrate_resource)


def list_resource_submissions(
    *,
    page: int = 1,
    page_size: int = 20,
    status: ApprovalState | None = None,
    client: Client | None = None,
) -> Page[ResourceSubmissionRecord]:
    resolved_client = _resolve_client(client)
    offset = (page - 1) * page_size
    query = (
        resolved_client.table("resource_submissions")
        .select("*", count=CountMethod.exact)
        .order("created_at", desc=True)
    )
    if status is not None:
        query = query.eq("status", str(status))
    response = query.range(offset, offset + page_size - 1).execute()
    return _paginate(response, page=page, page_size=page_size, hydrate=_hydrate_submission)


def submit_resource(
    actor: ProfileRecord,
    payload: ResourceSubmissionRequest,
    *,
    client: Client | None = None,
) -> ResourceSubmissionRecord:
    if actor.approval_status != ApprovalState.approved:
        raise PermissionError("Approved members only")

    resolved_client = _resolve_client(client)
    response = (
        resolved_client.table("resource_submissions")
        .insert(
            {
                "title": payload.title,
                "url": str(payload.url),
                "description": payload.description,
                "categories": list(payload.categories),
                "extra_categories": list(payload.extra_categories),
                "submitted_by": str(actor.id),
            }
        )
        .execute()
    )
    return _hydrate_submission(response.data[0])


def publish_resource(
    actor: ProfileRecord,
    submission_id: UUID,
    *,
    approved: bool,
    reason: str | None = None,
    client: Client | None = None,
) -> ResourceSubmissionRecord:
    resolved_client = _resolve_client(client)
    submission = _submission_by_id(resolved_client, submission_id)
    if submission is None:
        raise KeyError(f"Unknown resource submission: {submission_id}")

    action = ModerationAction.approve if approved else ModerationAction.reject
    submission_status = ApprovalState.approved if approved else ApprovalState.rejected
    updated_submission_response = (
        resolved_client.table("resource_submissions")
        .update(
            {
                "status": str(submission_status),
                "reviewer_notes": reason,
                "reviewed_by": str(actor.id),
                "reviewed_at": _now().isoformat(),
            }
        )
        .eq("id", str(submission_id))
        .execute()
    )
    updated_submission = _hydrate_submission(updated_submission_response.data[0])

    log_payload: dict[str, Any] | None = None
    if approved:
        # Reuse the submission UUID as the published resource UUID so retries stay idempotent.
        published_resource = _resource_by_id(resolved_client, submission_id)
        if published_resource is None:
            insert_response = (
                resolved_client.table("resources")
                .insert(
                    {
                        "id": str(updated_submission.id),
                        "title": updated_submission.title,
                        "url": str(updated_submission.url),
                        "description": updated_submission.description,
                        "categories": list(updated_submission.categories) + list(updated_submission.extra_categories),
                        "submitted_by": str(updated_submission.submitted_by),
                        "approved_by": str(actor.id),
                    }
                )
                .execute()
            )
            published_resource = _hydrate_resource(insert_response.data[0])
        log_payload = {"resource_id": str(published_resource.id)}

    _log_action(
        actor.id,
        ReviewObjectType.resource_submission,
        submission_id,
        action,
        reason=reason,
        payload=log_payload,
        client=resolved_client,
    )

    return updated_submission
