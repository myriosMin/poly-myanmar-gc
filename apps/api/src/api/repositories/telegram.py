from __future__ import annotations

from datetime import timedelta
from importlib import import_module
from inspect import signature
from typing import Any, Callable
from uuid import UUID

from postgrest import CountMethod
from supabase import Client

from ..models import (
    ModerationAction,
    ProfileRecord,
    ReviewObjectType,
    TelegramActionTokenRecord,
    TelegramWebhookRequest,
    TelegramWebhookResponse,
)
from .helpers import _now, _resolve_client


def _hydrate_token(row: dict[str, Any]) -> TelegramActionTokenRecord:
    return TelegramActionTokenRecord(**row)


def _token_by_id(client: Client, token_id: UUID) -> TelegramActionTokenRecord | None:
    response = client.table("telegram_action_tokens").select("*").eq("id", str(token_id)).maybe_single().execute()
    if response is None:
        return None
    return _hydrate_token(response.data)


def _load_dispatcher(review_object_type: ReviewObjectType, module_name: str, function_name: str) -> Callable[..., Any]:
    # Telegram can land before every domain repository exists, so make that dependency explicit.
    try:
        module = import_module(module_name)
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            f"Telegram webhook dispatch for {review_object_type.value} requires {module_name}, "
            "which is not available in this branch yet"
        ) from exc

    dispatcher = getattr(module, function_name, None)
    if dispatcher is None:
        raise RuntimeError(
            f"Telegram webhook dispatch for {review_object_type.value} requires "
            f"{module_name}.{function_name}()"
        )
    return dispatcher


def _call_dispatcher(dispatcher: Callable[..., Any], *args: Any, client: Client, **kwargs: Any) -> Any:
    if "client" in signature(dispatcher).parameters:
        kwargs["client"] = client
    return dispatcher(*args, **kwargs)


def _dispatch_webhook(actor: ProfileRecord, payload: TelegramWebhookRequest, *, client: Client) -> None:
    if payload.review_object_type == ReviewObjectType.user_application:
        dispatcher = _load_dispatcher(
            payload.review_object_type,
            "api.repositories.admin",
            "review_user_application",
        )
        _call_dispatcher(
            dispatcher,
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
        dispatcher = _load_dispatcher(
            payload.review_object_type,
            "api.repositories.resources",
            "publish_resource",
        )
        _call_dispatcher(
            dispatcher,
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
        dispatcher = _load_dispatcher(
            payload.review_object_type,
            "api.repositories.events",
            "publish_event_draft",
        )
        _call_dispatcher(
            dispatcher,
            actor,
            payload.review_object_id,
            approved=payload.action == ModerationAction.approve,
            reason=payload.reason,
            client=client,
        )
        return

    if payload.review_object_type == ReviewObjectType.collab_flag:
        dispatcher = _load_dispatcher(
            payload.review_object_type,
            "api.repositories.admin",
            "resolve_flag",
        )
        _call_dispatcher(
            dispatcher,
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
    return (consumed_response.count or 0) + (expired_response.count or 0)
