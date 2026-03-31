from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends

from ..deps import get_store, require_reviewer, require_superadmin
from ..models import (
    ProfileRecord,
    TelegramActionTokenRecord,
    TelegramTokenCreateRequest,
    TelegramTokenSweepResponse,
    TelegramWebhookRequest,
    TelegramWebhookResponse,
)
from ..store_protocol import StoreProtocol

router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/tokens", response_model=TelegramActionTokenRecord)
def create_telegram_action_token(
    payload: TelegramTokenCreateRequest,
    _: ProfileRecord = Depends(require_superadmin),
    store: StoreProtocol = Depends(get_store),
) -> TelegramActionTokenRecord:
    ttl = timedelta(seconds=payload.ttl_seconds) if payload.ttl_seconds is not None else timedelta(hours=2)
    return store.create_telegram_token(
        review_object_type=payload.review_object_type,
        review_object_id=payload.review_object_id,
        action=payload.action,
        actor_telegram_id=payload.actor_telegram_id,
        payload=payload.payload,
        ttl=ttl,
    )


@router.post("/tokens/sweep", response_model=TelegramTokenSweepResponse)
def sweep_telegram_action_tokens(
    _: ProfileRecord = Depends(require_superadmin),
    store: StoreProtocol = Depends(get_store),
) -> TelegramTokenSweepResponse:
    return store.sweep_expired_tokens_detailed()


@router.post("/webhook", response_model=TelegramWebhookResponse)
def telegram_webhook(
    payload: TelegramWebhookRequest,
    actor: ProfileRecord = Depends(require_reviewer),
    store: StoreProtocol = Depends(get_store),
) -> TelegramWebhookResponse:
    return store.apply_telegram_webhook(actor, payload)
