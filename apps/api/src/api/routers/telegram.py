from __future__ import annotations

from fastapi import APIRouter, Depends

from ..deps import get_actor, get_store, require_reviewer
from ..models import ProfileRecord, TelegramWebhookRequest, TelegramWebhookResponse
from ..store import InMemoryStore

router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/webhook", response_model=TelegramWebhookResponse)
def telegram_webhook(
    payload: TelegramWebhookRequest,
    actor: ProfileRecord = Depends(require_reviewer),
    store: InMemoryStore = Depends(get_store),
) -> TelegramWebhookResponse:
    return store.apply_telegram_webhook(actor, payload)
