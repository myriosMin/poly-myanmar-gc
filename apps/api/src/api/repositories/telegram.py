from __future__ import annotations

from datetime import timedelta
from typing import Any
from uuid import UUID

from postgrest import CountMethod
from supabase import Client

from ..models import (
    ModerationAction,
    ProfileRecord,
    ReviewObjectType,
    TelegramActionTokenRecord,
    TelegramTokenSweepResponse,
    TelegramWebhookRequest,
    TelegramWebhookResponse,
)
from .admin import resolve_flag, review_user_application
from .events import publish_event_draft
from .helpers import _now, _resolve_client
from .resources import publish_resource


def _hydrate_token(row: dict[str, Any]) -> TelegramActionTokenRecord:
    return TelegramActionTokenRecord(**row)


def _token_by_id(client: Client, token_id: UUID) -> TelegramActionTokenRecord | None:
    response = client.table("telegram_action_tokens").select("*").eq("id", str(token_id)).maybe_single().execute()
    if response is None or response.data is None:
        return None
    return _hydrate_token(response.data)


def _dispatch_webhook(actor: ProfileRecord, payload: TelegramWebhookRequest, *, client: Client) -> None:
    if payload.review_object_type == ReviewObjectType.user_application:
        review_user_application(
            actor,
            payload.review_object_id,
            action=payload.action,
            reason=payload.reason,
            client=client,
        )
        return

    if payload.review_object_type == ReviewObjectType.resource_submission:
        if payload.action not in {ModerationAction.approve, ModerationAction.reject}:
            raise ValueError("Unsupported resource submission action")
        publish_resource(
            actor,
            payload.review_object_id,
            approved=payload.action == ModerationAction.approve,
            reason=payload.reason,
            client=client,
        )
        return

    if payload.review_object_type == ReviewObjectType.draft_event:
        if payload.action not in {ModerationAction.approve, ModerationAction.reject}:
            raise ValueError("Unsupported draft event action")
        publish_event_draft(
            actor,
            payload.review_object_id,
            approved=payload.action == ModerationAction.approve,
            reason=payload.reason,
            client=client,
        )
        return

    if payload.review_object_type == ReviewObjectType.collab_flag:
        resolve_flag(
            actor,
            payload.review_object_id,
            action=payload.action,
            reason=payload.reason,
            client=client,
        )
        return

    raise ValueError("Unsupported webhook object type")


def create_telegram_token(
    review_object_type: ReviewObjectType,
    review_object_id: UUID,
    action: ModerationAction,
    *,
    actor_telegram_id: int | None = None,
    payload: dict[str, Any] | None = None,
    ttl: timedelta = timedelta(hours=2),
    client: Client | None = None,
) -> TelegramActionTokenRecord:
    resolved_client = _resolve_client(client)
    response = (
        resolved_client.table("telegram_action_tokens")
        .insert(
            {
                "review_object_type": str(review_object_type),
                "review_object_id": str(review_object_id),
                "action": str(action),
                "actor_telegram_id": actor_telegram_id,
                "payload": payload or {},
                "expires_at": (_now() + ttl).isoformat(),
            }
        )
        .execute()
    )
    return _hydrate_token(response.data[0])


def apply_telegram_webhook(
    actor: ProfileRecord,
    payload: TelegramWebhookRequest,
    *,
    client: Client | None = None,
) -> TelegramWebhookResponse:
    resolved_client = _resolve_client(client)
    token = _token_by_id(resolved_client, payload.action_token)
    if token is None:
        raise KeyError(f"Unknown token: {payload.action_token}")
    if token.consumed_at is not None:
        raise ValueError("Token already consumed")
    if token.expires_at < _now():
        raise ValueError("Token expired")
    if token.review_object_type != payload.review_object_type or token.review_object_id != payload.review_object_id:
        raise ValueError("Token does not match payload")
    if token.action != payload.action:
        raise ValueError("Token action mismatch")
    if token.actor_telegram_id is not None and payload.telegram_user_id != token.actor_telegram_id:
        raise ValueError("Telegram user mismatch")

    _dispatch_webhook(actor, payload, client=resolved_client)

    resolved_client.table("telegram_action_tokens").update({"consumed_at": _now().isoformat()}).eq(
        "id",
        str(token.id),
    ).execute()

    return TelegramWebhookResponse(
        ok=True,
        message="Action applied",
        action=payload.action,
        review_object_type=payload.review_object_type,
        review_object_id=payload.review_object_id,
    )


def sweep_expired_tokens(*, client: Client | None = None) -> int:
    details = sweep_expired_tokens_detailed(client=client)
    return details.total_removed


def sweep_expired_tokens_detailed(*, client: Client | None = None) -> TelegramTokenSweepResponse:
    resolved_client = _resolve_client(client)
    consumed_response = (
        resolved_client.table("telegram_action_tokens")
        .delete(count=CountMethod.exact)
        .not_.is_("consumed_at", None)
        .execute()
    )
    expired_response = (
        resolved_client.table("telegram_action_tokens")
        .delete(count=CountMethod.exact)
        .lt("expires_at", _now().isoformat())
        .execute()
    )
    consumed_removed = consumed_response.count or 0
    expired_removed = expired_response.count or 0
    return TelegramTokenSweepResponse(
        consumed_removed=consumed_removed,
        expired_removed=expired_removed,
        total_removed=consumed_removed + expired_removed,
    )
