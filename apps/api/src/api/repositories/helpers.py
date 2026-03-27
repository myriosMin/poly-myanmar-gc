from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Callable, TypeVar
from uuid import UUID

from postgrest import APIResponse, CountMethod
from supabase import Client

from ..models import AdminActionRecord, ModerationAction, Page, ReviewObjectType
from ..supabase_client import get_supabase_client

T = TypeVar("T")


def _now() -> datetime:
    return datetime.now(UTC)


def _resolve_client(client: Client | None) -> Client:
    return client or get_supabase_client()


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
    return AdminActionRecord(**response.data[0])


def _count_rows(
    table_name: str,
    *,
    client: Client | None = None,
    apply_filters: Callable[[Any], Any] | None = None,
) -> int:
    resolved_client = _resolve_client(client)
    query = resolved_client.table(table_name).select("*", count=CountMethod.exact, head=True)
    if apply_filters is not None:
        query = apply_filters(query)
    response = query.execute()
    return response.count or 0
