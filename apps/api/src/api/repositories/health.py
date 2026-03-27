from __future__ import annotations

from supabase import Client

from ..models import ApprovalState, CollabStatus, FlagStatus, HealthResponse, QueueCounts
from .helpers import _count_rows, _resolve_client


def queue_counts(*, client: Client | None = None) -> QueueCounts:
    resolved_client = _resolve_client(client)
    return QueueCounts(
        user_applications=_count_rows(
            "approval_requests",
            client=resolved_client,
            apply_filters=lambda query: query.in_(
                "status",
                [str(ApprovalState.pending), str(ApprovalState.needs_manual_review)],
            ),
        ),
        resource_submissions=_count_rows(
            "resource_submissions",
            client=resolved_client,
            apply_filters=lambda query: query.eq("status", str(ApprovalState.pending)),
        ),
        event_drafts=_count_rows(
            "event_drafts",
            client=resolved_client,
            apply_filters=lambda query: query.in_(
                "status",
                [str(ApprovalState.pending), str(ApprovalState.needs_manual_review)],
            ),
        ),
        flags=_count_rows(
            "flags",
            client=resolved_client,
            apply_filters=lambda query: query.eq("status", str(FlagStatus.open)),
        ),
    )


def health(*, client: Client | None = None) -> HealthResponse:
    resolved_client = _resolve_client(client)
    return HealthResponse(
        approved_members=_count_rows(
            "profiles",
            client=resolved_client,
            apply_filters=lambda query: query.eq("approval_status", str(ApprovalState.approved)),
        ),
        pending_reviews=_count_rows(
            "approval_requests",
            client=resolved_client,
            apply_filters=lambda query: query.in_(
                "status",
                [str(ApprovalState.pending), str(ApprovalState.needs_manual_review)],
            ),
        ),
        published_events=_count_rows("events", client=resolved_client),
        published_resources=_count_rows("resources", client=resolved_client),
        active_collabs=_count_rows(
            "collab_projects",
            client=resolved_client,
            apply_filters=lambda query: query.eq("status", str(CollabStatus.active)),
        ),
    )
