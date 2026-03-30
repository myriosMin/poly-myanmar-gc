from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, status

from .models import ApprovalState, ProfileRecord, Role
from .settings import get_settings
from .store_protocol import StoreProtocol
from .supabase_client import get_supabase_client


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    id: UUID
    email: str
    subject: str


def get_store(request: Request) -> StoreProtocol:
    store = getattr(request.app.state, "store", None)
    if store is None:
        raise RuntimeError("API store is not configured")
    return store


def _resolve_token_user(token: str) -> AuthenticatedUser:
    response = get_supabase_client().auth.get_user(token)
    user = response.user
    if user is None or user.email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth token")

    return AuthenticatedUser(
        id=UUID(user.id),
        email=user.email,
        subject=user.id,
    )


def get_authenticated_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_actor_id: UUID | None = Header(default=None, alias="X-Actor-Id"),
    store: StoreProtocol = Depends(get_store),
) -> AuthenticatedUser:
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")
        return _resolve_token_user(token)

    settings = get_settings()
    if not settings.allow_dev_actor_fallback:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    # Optional fallback for local/dev flows when bearer auth is unavailable.
    actor_id = x_actor_id or UUID(settings.default_actor_id)
    actor = store.get_actor(actor_id)
    if actor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown actor")

    return AuthenticatedUser(
        id=actor.id,
        email=actor.email,
        subject=actor.google_subject,
    )


def get_actor(
    auth_user: AuthenticatedUser = Depends(get_authenticated_user),
    store: StoreProtocol = Depends(get_store),
) -> ProfileRecord:
    actor = store.get_actor(auth_user.id)
    if actor is not None:
        return actor

    settings = get_settings()
    if settings.supabase_url and settings.supabase_service_role_key:
        result = (
            get_supabase_client()
            .table("profiles")
            .select("*")
            .eq("id", str(auth_user.id))
            .maybe_single()
            .execute()
        )
        if result is not None and result.data is not None:
            return ProfileRecord(**result.data)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown actor profile")


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
