from __future__ import annotations

from typing import Any
from uuid import UUID

from postgrest import CountMethod
from supabase import Client

from ..models import (
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
from .helpers import _count_rows, _log_action, _now, _paginate, _resolve_client


def _hydrate_collab(row: dict[str, Any]) -> CollabProjectRecord:
    return CollabProjectRecord(**row)


def _hydrate_membership(row: dict[str, Any]) -> CollabMembershipRecord:
    return CollabMembershipRecord(**row)


def _collab_by_id(client: Client, collab_id: UUID) -> CollabProjectRecord | None:
    response = client.table("collab_projects").select("*").eq("id", str(collab_id)).maybe_single().execute()
    if response is None or response.data is None:
        return None
    return _hydrate_collab(response.data)


def _count_collab_members(client: Client, collab_id: UUID) -> int:
    return _count_rows(
        "collab_memberships",
        client=client,
        apply_filters=lambda query: query.eq("collab_id", str(collab_id)).not_.eq("state", "left"),
    )


def _recount_collab_members(client: Client, collab_id: UUID) -> CollabProjectRecord | None:
    member_count = _count_collab_members(client, collab_id)
    response = client.table("collab_projects").update({"member_count": member_count}).eq("id", str(collab_id)).execute()
    if not response.data:
        return None
    return _hydrate_collab(response.data[0])


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
    remove_collab(actor, collab_id, client=client)


def remove_collab(
    actor: ProfileRecord,
    collab_id: UUID,
    *,
    client: Client | None = None,
) -> None:
    resolved_client = _resolve_client(client)
    collab = _collab_by_id(resolved_client, collab_id)
    if collab is None:
        raise KeyError(f"Unknown collab: {collab_id}")

    if actor.id != collab.created_by and not actor.is_admin:
        raise PermissionError("Only collab owner or reviewer can remove collab")

    resolved_client.table("collab_projects").update({"status": str(CollabStatus.removed)}).eq("id", str(collab_id)).execute()
    _log_action(
        actor.id,
        ReviewObjectType.collab_flag,
        collab_id,
        ModerationAction.remove,
        reason="collab removed by admin",
        client=resolved_client,
    )
