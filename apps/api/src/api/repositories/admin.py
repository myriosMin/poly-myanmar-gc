from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
from typing import Any, Callable, TypeVar
from urllib.parse import urlparse
from uuid import UUID

from postgrest import APIResponse, CountMethod
from supabase import Client

from ..models import (
    AdminActionRecord,
    ApprovalRequestRecord,
    ApprovalState,
    FlagRecord,
    FlagStatus,
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


def _hydrate_approval_request(row: dict[str, Any]) -> ApprovalRequestRecord:
    return ApprovalRequestRecord(**row)


def _hydrate_profile(row: dict[str, Any]) -> ProfileRecord:
    return ProfileRecord(**row)


def _hydrate_flag(row: dict[str, Any]) -> FlagRecord:
    return FlagRecord(**row)


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


def _request_by_id(client: Client, request_id: UUID) -> ApprovalRequestRecord | None:
    response = client.table("approval_requests").select("*").eq("id", str(request_id)).maybe_single().execute()
    if response is None:
        return None
    return _hydrate_approval_request(response.data)


def _profile_by_id(client: Client, user_id: UUID) -> ProfileRecord | None:
    response = client.table("profiles").select("*").eq("id", str(user_id)).maybe_single().execute()
    if response is None:
        return None
    return _hydrate_profile(response.data)


def _flag_by_id(client: Client, flag_id: UUID) -> FlagRecord | None:
    response = client.table("flags").select("*").eq("id", str(flag_id)).maybe_single().execute()
    if response is None:
        return None
    return _hydrate_flag(response.data)


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


def _insert_ban(
    actor: ProfileRecord,
    user_id: UUID,
    *,
    reason: str | None = None,
    client: Client,
) -> None:
    client.table("bans").insert(
        {
            "user_id": str(user_id),
            "reason": reason,
            "created_by": str(actor.id),
        }
    ).execute()


def _apply_profile_status(
    user_id: UUID,
    status: ApprovalState,
    *,
    client: Client,
) -> ProfileRecord:
    response = client.table("profiles").update({"approval_status": str(status)}).eq("id", str(user_id)).execute()
    if not response.data:
        raise KeyError(f"Unknown profile: {user_id}")
    return _hydrate_profile(response.data[0])


def list_approval_requests(
    *,
    page: int = 1,
    page_size: int = 20,
    client: Client | None = None,
) -> Page[ApprovalRequestRecord]:
    resolved_client = _resolve_client(client)
    offset = (page - 1) * page_size
    response = (
        resolved_client.table("approval_requests")
        .select("*", count=CountMethod.exact)
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return _paginate(response, page=page, page_size=page_size, hydrate=_hydrate_approval_request)


def list_pending_approval_requests(
    *,
    page: int = 1,
    page_size: int = 20,
    client: Client | None = None,
) -> Page[ApprovalRequestRecord]:
    resolved_client = _resolve_client(client)
    offset = (page - 1) * page_size
    response = (
        resolved_client.table("approval_requests")
        .select("*", count=CountMethod.exact)
        .in_("status", [str(ApprovalState.pending), str(ApprovalState.needs_manual_review)])
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return _paginate(response, page=page, page_size=page_size, hydrate=_hydrate_approval_request)


def review_user_application(
    actor: ProfileRecord,
    request_id: UUID,
    *,
    action: ModerationAction,
    reason: str | None = None,
    client: Client | None = None,
) -> ApprovalRequestRecord:
    resolved_client = _resolve_client(client)
    request = _request_by_id(resolved_client, request_id)
    if request is None:
        raise KeyError(f"Unknown approval request: {request_id}")

    profile = _profile_by_id(resolved_client, request.user_id)
    if profile is None:
        raise KeyError(f"Unknown profile for request: {request.user_id}")

    if action == ModerationAction.approve:
        next_status = ApprovalState.approved
    elif action == ModerationAction.reject:
        next_status = ApprovalState.rejected
    elif action == ModerationAction.ban:
        next_status = ApprovalState.banned
        _insert_ban(actor, request.user_id, reason=reason, client=resolved_client)
    else:
        raise ValueError("Unsupported user application action")

    updated_request_response = (
        resolved_client.table("approval_requests")
        .update(
            {
                "status": str(next_status),
                "reviewer_notes": reason,
                "reviewed_by": str(actor.id),
                "reviewed_at": _now().isoformat(),
            }
        )
        .eq("id", str(request_id))
        .execute()
    )
    _apply_profile_status(request.user_id, next_status, client=resolved_client)

    updated_request = _hydrate_approval_request(updated_request_response.data[0])
    _log_action(
        actor.id,
        ReviewObjectType.user_application,
        request_id,
        action,
        reason=reason,
        payload={"profile_id": str(request.user_id)},
        client=resolved_client,
    )
    return updated_request


def ban_user(
    actor: ProfileRecord,
    user_id: UUID,
    *,
    reason: str | None = None,
    client: Client | None = None,
) -> ProfileRecord:
    resolved_client = _resolve_client(client)
    profile = _apply_profile_status(user_id, ApprovalState.banned, client=resolved_client)
    _insert_ban(actor, user_id, reason=reason, client=resolved_client)
    _log_action(
        actor.id,
        ReviewObjectType.user_application,
        user_id,
        ModerationAction.ban,
        reason=reason,
        client=resolved_client,
    )
    return profile


def unban_user(
    actor: ProfileRecord,
    user_id: UUID,
    *,
    client: Client | None = None,
) -> ProfileRecord:
    resolved_client = _resolve_client(client)
    profile = _apply_profile_status(user_id, ApprovalState.approved, client=resolved_client)
    resolved_client.table("bans").update(
        {
            "revoked_at": _now().isoformat(),
            "revoked_by": str(actor.id),
        }
    ).eq("user_id", str(user_id)).is_("revoked_at", None).execute()
    _log_action(
        actor.id,
        ReviewObjectType.user_application,
        user_id,
        ModerationAction.dismiss_flag,
        reason="user unbanned",
        client=resolved_client,
    )
    return profile


def list_flags(
    *,
    page: int = 1,
    page_size: int = 20,
    status: FlagStatus | None = None,
    client: Client | None = None,
) -> Page[FlagRecord]:
    resolved_client = _resolve_client(client)
    offset = (page - 1) * page_size
    query = resolved_client.table("flags").select("*", count=CountMethod.exact).order("created_at", desc=True)
    if status is not None:
        query = query.eq("status", str(status))
    response = query.range(offset, offset + page_size - 1).execute()
    return _paginate(response, page=page, page_size=page_size, hydrate=_hydrate_flag)


def resolve_flag(
    actor: ProfileRecord,
    flag_id: UUID,
    *,
    action: ModerationAction,
    reason: str | None = None,
    client: Client | None = None,
) -> FlagRecord:
    resolved_client = _resolve_client(client)
    flag = _flag_by_id(resolved_client, flag_id)
    if flag is None:
        raise KeyError(f"Unknown flag: {flag_id}")

    if action == ModerationAction.dismiss_flag:
        next_status = FlagStatus.resolved
    elif action == ModerationAction.ban:
        next_status = FlagStatus.resolved
        if flag.subject_type == ReviewObjectType.user_application:
            ban_user(actor, flag.subject_id, reason=reason, client=resolved_client)
    else:
        raise ValueError("Unsupported flag action")

    response = (
        resolved_client.table("flags")
        .update(
            {
                "status": str(next_status),
                "resolved_at": _now().isoformat(),
                "resolved_by": str(actor.id),
            }
        )
        .eq("id", str(flag_id))
        .execute()
    )
    updated_flag = _hydrate_flag(response.data[0])
    _log_action(
        actor.id,
        flag.subject_type,
        flag.subject_id,
        action,
        reason=reason,
        payload={"flag_id": str(flag.id)},
        client=resolved_client,
    )
    return updated_flag


def detect_suspicious_activity(*, client: Client | None = None) -> list[FlagRecord]:
    resolved_client = _resolve_client(client)
    generated: list[FlagRecord] = []
    blocked_domains = {"bit.ly", "tinyurl.com", "goo.gl", "malware.example"}

    submissions_response = resolved_client.table("resource_submissions").select("*").execute()
    for row in submissions_response.data:
        hostname = urlparse(str(row["url"])).hostname or ""
        if hostname in blocked_domains:
            response = (
                resolved_client.table("flags")
                .insert(
                    {
                        "subject_type": str(ReviewObjectType.resource_submission),
                        "subject_id": str(row["id"]),
                        "severity": "high",
                        "reason": f"Suspicious domain: {hostname}",
                    }
                )
                .execute()
            )
            generated.append(_hydrate_flag(response.data[0]))

    requests_response = (
        resolved_client.table("approval_requests")
        .select("user_id")
        .eq("status", str(ApprovalState.rejected))
        .execute()
    )
    rejected_by_user = Counter(UUID(row["user_id"]) for row in requests_response.data)
    for user_id, count in rejected_by_user.items():
        if count >= 2:
            response = (
                resolved_client.table("flags")
                .insert(
                    {
                        "subject_type": str(ReviewObjectType.user_application),
                        "subject_id": str(user_id),
                        "severity": "medium",
                        "reason": "Repeated rejected signup attempts",
                    }
                )
                .execute()
            )
            generated.append(_hydrate_flag(response.data[0]))

    return generated
