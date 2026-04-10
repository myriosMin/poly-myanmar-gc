from __future__ import annotations

import logging
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from postgrest.exceptions import APIError

from ..deps import AuthenticatedUser, get_actor, get_authenticated_user, get_store
from ..models import (
    ApprovalState,
    DeletionRequestSubmitRequest,
    DeletionRequestSubmitResponse,
    FlagRecord,
    FlagStatus,
    MeResponse,
    OnboardingSubmitRequest,
    ProfileRecord,
    ReviewObjectType,
)
from ..settings import get_settings
from ..store_protocol import StoreProtocol
from ..supabase_client import get_supabase_client

router = APIRouter(tags=["me"])
ACCOUNT_DELETION_SUBJECT_TYPE = "account_deletion_request"
logger = logging.getLogger(__name__)


def _notify_onboarding_submission(
    payload: OnboardingSubmitRequest,
    *,
    approval_request_id: str | None,
    approval_status: ApprovalState,
) -> None:
    settings = get_settings()
    if (
        not settings.supabase_url
        or not settings.supabase_service_role_key
        or not settings.supabase_approval_function_name
    ):
        return

    function_url = (
        f"{settings.supabase_url.rstrip('/')}/functions/v1/{settings.supabase_approval_function_name}"
    )
    body = {
        "event_type": "onboarding_submitted",
        "approval_request_id": approval_request_id,
        "approval_status": approval_status.value,
        "user": {
            "user_id": str(payload.user_id),
            "username": payload.username,
            "email": payload.email,
            "name": payload.name,
            "polytechnic": payload.polytechnic,
            "course": payload.course,
            "graduation_year": payload.graduation_year,
            "linkedin_url": str(payload.linkedin_url),
            "manual_proof_url": str(payload.manual_proof_url) if payload.manual_proof_url else None,
            "manual_verification_notes": payload.manual_verification_notes,
        },
    }

    try:
        with httpx.Client(timeout=4.0) as client:
            response = client.post(
                function_url,
                json=body,
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "Content-Type": "application/json",
                },
            )
        response.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        # Notifications are best-effort and should not block onboarding writes.
        logger.warning("approval notifier edge function call failed: %s", exc)


def _upsert_onboarding_supabase(payload: OnboardingSubmitRequest) -> ProfileRecord | None:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None

    approval_status = (
        ApprovalState.needs_manual_review
        if payload.manual_proof_url or payload.manual_verification_notes
        else ApprovalState.pending
    )

    profile_data = {
        "id": str(payload.user_id),
        "username": payload.username,
        "email": payload.email,
        "google_subject": payload.google_subject,
        "role": "member",
        "approval_status": approval_status.value,
        "name": payload.name,
        "polytechnic": payload.polytechnic,
        "course": payload.course,
        "graduation_year": payload.graduation_year,
        "linkedin_url": str(payload.linkedin_url),
        "github_url": str(payload.github_url) if payload.github_url else None,
        "portfolio_url": str(payload.portfolio_url) if payload.portfolio_url else None,
        "skills": payload.skills,
        "hobbies": payload.hobbies,
        "status_badges": [],
        "open_to_collab": payload.open_to_collab,
        "job_seeking": payload.job_seeking,
        "manual_verification_notes": payload.manual_verification_notes,
        "manual_proof_url": str(payload.manual_proof_url) if payload.manual_proof_url else None,
    }

    client = get_supabase_client()
    try:
        profile_result = (
            client.table("profiles")
            .upsert(profile_data, on_conflict="id")
            .execute()
        )
    except APIError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Supabase profile upsert failed: {exc.message}") from exc

    try:
        approval_response = client.table("approval_requests").insert(
            {
                "user_id": str(payload.user_id),
                "review_object_type": ReviewObjectType.user_application.value,
                "status": approval_status.value,
                "submitted_payload": payload.model_dump(mode="json"),
                "proof_url": str(payload.manual_proof_url) if payload.manual_proof_url else None,
            }
        ).execute()
    except APIError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Supabase approval request insert failed: {exc.message}") from exc

    approval_rows = approval_response.data or []
    approval_request_id = str(approval_rows[0].get("id")) if approval_rows else None
    _notify_onboarding_submission(
        payload,
        approval_request_id=approval_request_id,
        approval_status=approval_status,
    )

    rows = profile_result.data or []
    if not rows:
        return None
    return ProfileRecord(**rows[0])


@router.get("/me", response_model=MeResponse)
def read_me(
    actor: ProfileRecord = Depends(get_actor),
    store: StoreProtocol = Depends(get_store),
) -> MeResponse:
    pending_review_count = 0
    queue_access = actor.is_admin
    if queue_access:
        pending_review_count = store.queue_counts().user_applications
    return MeResponse(
        profile=actor,
        can_access_private_app=actor.can_access_private_app or actor.is_admin,
        pending_review_count=pending_review_count,
        queue_access=queue_access,
    )


@router.post("/me/onboarding", response_model=ProfileRecord)
def submit_onboarding(
    payload: OnboardingSubmitRequest,
    auth_user: AuthenticatedUser = Depends(get_authenticated_user),
    store: StoreProtocol = Depends(get_store),
) -> ProfileRecord:
    """Submit (or re-submit) a member onboarding application."""
    if payload.user_id != auth_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot submit onboarding for another user",
        )

    if payload.email.lower() != auth_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Onboarding email must match authenticated user",
        )

    if payload.google_subject != auth_user.subject:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Onboarding subject must match authenticated user",
        )

    persisted_profile = _upsert_onboarding_supabase(payload)
    in_memory_profile = store.upsert_onboarding(payload)
    return persisted_profile or in_memory_profile


@router.post("/me/deletion-request", response_model=DeletionRequestSubmitResponse)
def submit_deletion_request(
    payload: DeletionRequestSubmitRequest,
    actor: ProfileRecord = Depends(get_actor),
    store: StoreProtocol = Depends(get_store),
) -> DeletionRequestSubmitResponse:
    open_flags = store.list_flags(page=1, page_size=5000, status=FlagStatus.open)
    for flag in open_flags.items:
        if str(flag.subject_type) == ACCOUNT_DELETION_SUBJECT_TYPE and flag.subject_id == actor.id:
            return DeletionRequestSubmitResponse(
                request_id=flag.id,
                status=flag.status,
                already_exists=True,
                message="An open deletion request already exists and is awaiting admin review.",
            )

    details = (payload.request_details or "Please delete my account and associated profile data.").strip()
    reason = "\n".join(
        [
            "Account and data deletion request",
            f"Full name: {actor.name or '(missing in profile)'}",
            f"Google sign-in email: {actor.email}",
            f"LinkedIn URL: {actor.linkedin_url}",
            f"Request details: {details}",
        ]
    )

    request_flag = FlagRecord(
        id=uuid4(),
        subject_type=ACCOUNT_DELETION_SUBJECT_TYPE,
        subject_id=actor.id,
        severity="medium",
        reason=reason,
        status=FlagStatus.open,
    )
    stored_flag = store.store_flag(request_flag)
    return DeletionRequestSubmitResponse(
        request_id=stored_flag.id,
        status=stored_flag.status,
        already_exists=False,
        message="Deletion request submitted. Admins will review it according to the deletion policy.",
    )
