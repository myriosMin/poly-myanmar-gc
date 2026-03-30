from __future__ import annotations

from datetime import timedelta
from typing import Any
from uuid import UUID

from postgrest import CountMethod
from supabase import Client

from ..models import (
    ApprovalState,
    EventDraftRecord,
    EventOrigin,
    EventRecord,
    EventVisibility,
    ModerationAction,
    Page,
    ProfileRecord,
    ReviewObjectType,
    RsvpRecord,
    RsvpStatus,
)
from .helpers import _count_rows, _log_action, _now, _paginate, _resolve_client


def _hydrate_event(row: dict[str, Any]) -> EventRecord:
    return EventRecord(**row)


def _hydrate_event_draft(row: dict[str, Any]) -> EventDraftRecord:
    return EventDraftRecord(**row)


def _hydrate_rsvp(row: dict[str, Any]) -> RsvpRecord:
    return RsvpRecord(**row)

def _event_by_id(client: Client, event_id: UUID) -> EventRecord | None:
    response = client.table("events").select("*").eq("id", str(event_id)).maybe_single().execute()
    if response is None or response.data is None:
        return None
    return _hydrate_event(response.data)


def _draft_by_id(client: Client, draft_id: UUID) -> EventDraftRecord | None:
    response = client.table("event_drafts").select("*").eq("id", str(draft_id)).maybe_single().execute()
    if response is None or response.data is None:
        return None
    return _hydrate_event_draft(response.data)


def _count_going_rsvps(client: Client, event_id: UUID) -> int:
    return _count_rows(
        "event_rsvps",
        client=client,
        apply_filters=lambda query: query.eq("event_id", str(event_id)).eq("status", str(RsvpStatus.going)),
    )


def list_events(
    *,
    page: int = 1,
    page_size: int = 20,
    days_back: int | None = None,
    client: Client | None = None,
) -> Page[EventRecord]:
    resolved_client = _resolve_client(client)
    offset = (page - 1) * page_size
    query = resolved_client.table("events").select("*", count=CountMethod.exact)
    if days_back is not None:
        threshold = _now() - timedelta(days=days_back)
        query = query.gte("starts_at", threshold.isoformat())
    response = query.order("starts_at").range(offset, offset + page_size - 1).execute()
    return _paginate(response, page=page, page_size=page_size, hydrate=_hydrate_event)


def list_event_drafts_pending(
    *,
    page: int = 1,
    page_size: int = 20,
    client: Client | None = None,
) -> Page[EventDraftRecord]:
    resolved_client = _resolve_client(client)
    offset = (page - 1) * page_size
    response = (
        resolved_client.table("event_drafts")
        .select("*", count=CountMethod.exact)
        .in_("status", [str(ApprovalState.pending), str(ApprovalState.needs_manual_review)])
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return _paginate(response, page=page, page_size=page_size, hydrate=_hydrate_event_draft)


def rsvp_event(
    actor: ProfileRecord,
    event_id: UUID,
    status: RsvpStatus,
    *,
    client: Client | None = None,
) -> RsvpRecord:
    if actor.approval_status != ApprovalState.approved:
        raise PermissionError("Approved members only")

    resolved_client = _resolve_client(client)
    event = _event_by_id(resolved_client, event_id)
    if event is None:
        raise KeyError(f"Unknown event: {event_id}")

    rsvp_response = (
        resolved_client.table("event_rsvps")
        .upsert(
            {
                "event_id": str(event_id),
                "user_id": str(actor.id),
                "status": str(status),
                "updated_at": _now().isoformat(),
            },
            on_conflict="event_id,user_id",
        )
        .execute()
    )

    attendance_count = _count_going_rsvps(resolved_client, event_id)
    resolved_client.table("events").update({"attendance_count": attendance_count}).eq("id", str(event.id)).execute()

    return _hydrate_rsvp(rsvp_response.data[0])


def publish_event_draft(
    actor: ProfileRecord,
    draft_id: UUID,
    *,
    approved: bool,
    reason: str | None = None,
    client: Client | None = None,
) -> EventDraftRecord:
    resolved_client = _resolve_client(client)
    draft = _draft_by_id(resolved_client, draft_id)
    if draft is None:
        raise KeyError(f"Unknown event draft: {draft_id}")

    action = ModerationAction.approve if approved else ModerationAction.reject
    draft_status = ApprovalState.approved if approved else ApprovalState.rejected
    updated_draft_response = (
        resolved_client.table("event_drafts")
        .update(
            {
                "status": str(draft_status),
                "reviewer_notes": reason,
                "reviewed_by": str(actor.id),
                "reviewed_at": _now().isoformat(),
            }
        )
        .eq("id", str(draft_id))
        .execute()
    )
    updated_draft = _hydrate_event_draft(updated_draft_response.data[0])

    payload: dict[str, Any] | None = None
    if approved:
        # Reuse the draft UUID as the published event UUID so repeated approvals stay idempotent.
        published_event = _event_by_id(resolved_client, draft_id)
        if published_event is None:
            insert_response = (
                resolved_client.table("events")
                .insert(
                    {
                        "id": str(updated_draft.id),
                        "title": updated_draft.title,
                        "kind": updated_draft.kind,
                        "description": updated_draft.description,
                        "location": updated_draft.location,
                        "starts_at": updated_draft.starts_at.isoformat(),
                        "ends_at": updated_draft.ends_at.isoformat() if updated_draft.ends_at is not None else None,
                        "source_url": str(updated_draft.source_url) if updated_draft.source_url is not None else None,
                        "created_by": str(actor.id),
                        "visibility": str(EventVisibility.approved_members),
                        "origin": str(EventOrigin.worker),
                        "attendees_visible": True,
                        "attendance_count": 0,
                    }
                )
                .execute()
            )
            published_event = _hydrate_event(insert_response.data[0])
        payload = {"event_id": str(published_event.id)}

    _log_action(
        actor.id,
        ReviewObjectType.draft_event,
        draft_id,
        action,
        reason=reason,
        payload=payload,
        client=resolved_client,
    )

    return updated_draft


def delete_event(
    actor: ProfileRecord,
    event_id: UUID,
    *,
    client: Client | None = None,
) -> None:
    resolved_client = _resolve_client(client)
    event = _event_by_id(resolved_client, event_id)
    if event is None:
        raise KeyError(f"Unknown event: {event_id}")

    if actor.id != event.created_by and not actor.is_admin:
        raise PermissionError("Only event owner or reviewer can delete event")

    resolved_client.table("events").delete().eq("id", str(event_id)).execute()
