from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Callable, TypeVar
from uuid import UUID

from postgrest import APIResponse, CountMethod
from supabase import Client

from ..models import (
    AdminActionRecord,
    ApprovalState,
    CollabCreateRequest,
    CollabMembershipRecord,
    CollabProjectRecord,
    CollabStatus,
    ModerationAction,
    Page,
    ProfileRecord,
    ReviewObjectType,
)
from ..supabase_client import get_supabase_client

T = TypeVar("T")


def _now() -> datetime:
    return datetime.now(UTC)


def _resolve_client(client: Client | None) -> Client:
    return client or get_supabase_client()


def _hydrate_collab(row: dict[str, Any]) -> CollabProjectRecord:
    return CollabProjectRecord(**row)


def _hydrate_membership(row: dict[str, Any]) -> CollabMembershipRecord:
    return CollabMembershipRecord(**row)


def _hydrate_admin_action(row: dict[str, Any]) -> AdminActionRecord:
    return AdminActionRecord(**row)


def _paginate(
    response: APIResponse,
    *,
    page: int,
    page_size: int,
    hydrate: Callable[[dict[str, Any]], T],
) -> Page[T]:
    return Page[T](
        items=[hydrate(row) for row in response.data],
        page=page,
        page_size=page_size,
        total=response.count or 0,
    )


def _collab_by_id(client: Client, collab_id: UUID) -> CollabProjectRecord | None:
    response = client.table("collab_projects").select("*").eq("id", str(collab_id)).maybe_single().execute()
    if response is None:
        return None
    return _hydrate_collab(response.data)


def _count_collab_members(client: Client, collab_id: UUID) -> int:
    response = (
        client.table("collab_memberships")
        .select("collab_id", count=CountMethod.exact)
        .eq("collab_id", str(collab_id))
        .not_.eq("state", "left")
        .execute()
    )
    return response.count or 0


def _recount_collab_members(client: Client, collab_id: UUID) -> CollabProjectRecord | None:
    member_count = _count_collab_members(client, collab_id)
    response = client.table("collab_projects").update({"member_count": member_count}).eq("id", str(collab_id)).execute()
    if not response.data:
        return None
    return _hydrate_collab(response.data[0])


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


def list_collabs(
    *,
    page: int = 1,
    page_size: int = 20,
    client: Client | None = None,
) -> Page[CollabProjectRecord]:
    resolved_client = _resolve_client(client)
    offset = (page - 1) * page_size
    response = (
        resolved_client.table("collab_projects")
        .select("*", count=CountMethod.exact)
        .eq("status", str(CollabStatus.active))
        .order("deadline")
        .order("title")
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return _paginate(response, page=page, page_size=page_size, hydrate=_hydrate_collab)


def create_collab(
    actor: ProfileRecord,
    payload: CollabCreateRequest,
    *,
    client: Client | None = None,
) -> CollabProjectRecord:
    if actor.approval_status != ApprovalState.approved:
        raise PermissionError("Approved members only")

    resolved_client = _resolve_client(client)
    collab_response = (
        resolved_client.table("collab_projects")
        .insert(
            {
                "title": payload.title,
                "type": str(payload.type),
                "description": payload.description,
                "needed_roles": list(payload.needed_roles),
                "needed_skills": list(payload.needed_skills),
                "deadline": payload.deadline.isoformat() if payload.deadline is not None else None,
                "team_size": payload.team_size,
                "contact_link": str(payload.contact_link),
                "created_by": str(actor.id),
            }
        )
        .execute()
    )
    collab = _hydrate_collab(collab_response.data[0])

    resolved_client.table("collab_memberships").insert(
        {
            "collab_id": str(collab.id),
            "user_id": str(actor.id),
            "state": "member",
            "updated_at": _now().isoformat(),
        }
    ).execute()

    recounted = _recount_collab_members(resolved_client, collab.id)
    return recounted or collab


def join_collab(
    actor: ProfileRecord,
    collab_id: UUID,
    *,
    client: Client | None = None,
) -> CollabMembershipRecord:
    if actor.approval_status != ApprovalState.approved:
        raise PermissionError("Approved members only")

    resolved_client = _resolve_client(client)
    collab = _collab_by_id(resolved_client, collab_id)
    if collab is None:
        raise KeyError(f"Unknown collab: {collab_id}")

    membership_response = (
        resolved_client.table("collab_memberships")
        .upsert(
            {
                "collab_id": str(collab_id),
                "user_id": str(actor.id),
                "state": "member",
                "updated_at": _now().isoformat(),
            },
            on_conflict="collab_id,user_id",
        )
        .execute()
    )
    _recount_collab_members(resolved_client, collab_id)
    return _hydrate_membership(membership_response.data[0])


def leave_collab(
    actor: ProfileRecord,
    collab_id: UUID,
    *,
    client: Client | None = None,
) -> None:
    resolved_client = _resolve_client(client)
    resolved_client.table("collab_memberships").delete().eq("collab_id", str(collab_id)).eq("user_id", str(actor.id)).execute()
    _recount_collab_members(resolved_client, collab_id)


def delete_collab(
    actor: ProfileRecord,
    collab_id: UUID,
    *,
    client: Client | None = None,
) -> None:
    resolved_client = _resolve_client(client)
    collab = _collab_by_id(resolved_client, collab_id)
    if collab is None:
        raise KeyError(f"Unknown collab: {collab_id}")

    resolved_client.table("collab_projects").update({"status": str(CollabStatus.removed)}).eq("id", str(collab_id)).execute()
    _log_action(
        actor.id,
        ReviewObjectType.collab_flag,
        collab_id,
        ModerationAction.remove,
        reason="collab removed by admin",
        client=resolved_client,
    )
