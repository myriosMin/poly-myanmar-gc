from __future__ import annotations

from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, status

from .models import ApprovalState, ProfileRecord, Role
from .settings import get_settings
from .store_protocol import StoreProtocol


def get_store(request: Request) -> StoreProtocol:
    store = getattr(request.app.state, "store", None)
    if store is None:
        raise RuntimeError("API store is not configured")
    return store


def get_actor(
    x_actor_id: UUID | None = Header(default=None, alias="X-Actor-Id"),
    store: StoreProtocol = Depends(get_store),
) -> ProfileRecord:
    settings = get_settings()
    actor_id = x_actor_id or UUID(settings.default_actor_id)
    actor = store.get_actor(actor_id)
    if actor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown actor")
    return actor


def require_approved_member(actor: ProfileRecord = Depends(get_actor)) -> ProfileRecord:
    if actor.approval_status != ApprovalState.approved:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Approved members only")
    return actor


def require_reviewer(actor: ProfileRecord = Depends(get_actor)) -> ProfileRecord:
    if actor.role not in {Role.reviewer, Role.superadmin} or actor.approval_status != ApprovalState.approved:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reviewer access required")
    return actor


def require_superadmin(actor: ProfileRecord = Depends(get_actor)) -> ProfileRecord:
    if actor.role != Role.superadmin or actor.approval_status != ApprovalState.approved:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin access required")
    return actor
