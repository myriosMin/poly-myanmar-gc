from __future__ import annotations

from typing import Any
from uuid import UUID

from postgrest import APIResponse, CountMethod
from supabase import Client

from ..models import (
    ApprovalState,
    OnboardingSubmitRequest,
    Page,
    ProfileRecord,
    ProfileUpdateRequest,
    ReviewObjectType,
    Role,
)
from ..supabase_client import get_supabase_client


def _resolve_client(client: Client | None) -> Client:
    return client or get_supabase_client()


def _hydrate_profile(row: dict[str, Any]) -> ProfileRecord:
    return ProfileRecord(**row)


def _hydrate_profiles_page(response: APIResponse, *, page: int, page_size: int) -> Page[ProfileRecord]:
    rows = response.data or []
    return Page[ProfileRecord](
        items=[_hydrate_profile(row) for row in rows],
        page=page,
        page_size=page_size,
        total=response.count or 0,
    )


def _profile_by_id(client: Client, user_id: UUID) -> ProfileRecord | None:
    response = client.table("profiles").select("*").eq("id", str(user_id)).maybe_single().execute()
    if response is None or response.data is None:
        return None
    return _hydrate_profile(response.data)


def _determine_approval_status(payload: OnboardingSubmitRequest) -> ApprovalState:
    if payload.manual_proof_url or payload.manual_verification_notes:
        return ApprovalState.needs_manual_review
    return ApprovalState.pending


def _build_profile_upsert_row(
    payload: OnboardingSubmitRequest,
    existing_profile: ProfileRecord | None,
) -> dict[str, Any]:
    approval_status = _determine_approval_status(payload)
    if existing_profile is not None and existing_profile.role != Role.member:
        approval_status = existing_profile.approval_status

    return {
        "id": str(payload.user_id),
        "username": payload.username,
        "email": payload.email,
        "google_subject": payload.google_subject,
        "role": str(existing_profile.role if existing_profile is not None else Role.member),
        "approval_status": str(approval_status),
        "name": payload.name,
        "polytechnic": payload.polytechnic,
        "course": payload.course,
        "graduation_year": payload.graduation_year,
        "linkedin_url": str(payload.linkedin_url),
        "github_url": str(payload.github_url) if payload.github_url is not None else None,
        "portfolio_url": str(payload.portfolio_url) if payload.portfolio_url is not None else None,
        "skills": list(payload.skills or []),
        "hobbies": list(payload.hobbies or []),
        "status_badges": list(existing_profile.status_badges or []) if existing_profile is not None else [],
        "open_to_collab": payload.open_to_collab,
        "job_seeking": payload.job_seeking,
        "manual_verification_notes": payload.manual_verification_notes,
        "manual_proof_url": str(payload.manual_proof_url) if payload.manual_proof_url is not None else None,
    }


def get_actor(user_id: UUID, *, client: Client | None = None) -> ProfileRecord | None:
    resolved_client = _resolve_client(client)
    return _profile_by_id(resolved_client, user_id)


def get_profile(user_id: UUID, *, client: Client | None = None) -> ProfileRecord | None:
    resolved_client = _resolve_client(client)
    return _profile_by_id(resolved_client, user_id)


def upsert_onboarding(payload: OnboardingSubmitRequest, *, client: Client | None = None) -> ProfileRecord:
    resolved_client = _resolve_client(client)
    existing_profile = _profile_by_id(resolved_client, payload.user_id)
    upsert_response = (
        resolved_client.table("profiles")
        .upsert(_build_profile_upsert_row(payload, existing_profile), on_conflict="id")
        .execute()
    )
    profile = _hydrate_profile(upsert_response.data[0])

    (
        resolved_client.table("approval_requests")
        .insert(
            {
                "user_id": str(profile.id),
                "review_object_type": str(ReviewObjectType.user_application),
                "status": str(profile.approval_status),
                "submitted_payload": payload.model_dump(mode="json"),
                "proof_url": str(payload.manual_proof_url) if payload.manual_proof_url is not None else None,
            }
        )
        .execute()
    )

    return profile


def update_profile(
    actor: ProfileRecord,
    payload: ProfileUpdateRequest,
    *,
    client: Client | None = None,
) -> ProfileRecord:
    resolved_client = _resolve_client(client)
    profile = _profile_by_id(resolved_client, actor.id)
    if profile is None:
        raise KeyError(f"Unknown profile: {actor.id}")

    changes = payload.model_dump(mode="json", exclude_unset=True)
    if not changes:
        return profile

    response = resolved_client.table("profiles").update(changes).eq("id", str(actor.id)).execute()
    rows = response.data or []
    if rows:
        return _hydrate_profile(rows[0])

    refreshed_profile = _profile_by_id(resolved_client, actor.id)
    if refreshed_profile is None:
        raise KeyError(f"Unknown profile: {actor.id}")
    return refreshed_profile


def list_profiles(
    *,
    search: str | None = None,
    polytechnic: str | None = None,
    course: str | None = None,
    graduation_year: int | None = None,
    skills: list[str] | None = None,
    status_badges: list[str] | None = None,
    open_to_collab: bool | None = None,
    job_seeking: bool | None = None,
    page: int = 1,
    page_size: int = 20,
    include_pending: bool = False,
    client: Client | None = None,
) -> Page[ProfileRecord]:
    resolved_client = _resolve_client(client)
    offset = (page - 1) * page_size
    query = resolved_client.table("profiles").select("*", count=CountMethod.exact)

    if not include_pending:
        query = query.eq("approval_status", str(ApprovalState.approved))
    if search:
        query = query.or_(f"name.ilike.%{search}%,polytechnic.ilike.%{search}%,skills.cs.{{{search}}}")
    if polytechnic:
        query = query.eq("polytechnic", polytechnic)
    if course:
        query = query.ilike("course", f"%{course}%")
    if graduation_year is not None:
        query = query.eq("graduation_year", graduation_year)
    if skills:
        query = query.overlaps("skills", skills)
    if status_badges:
        query = query.overlaps("status_badges", status_badges)
    if open_to_collab is not None:
        query = query.eq("open_to_collab", open_to_collab)
    if job_seeking is not None:
        query = query.eq("job_seeking", job_seeking)

    response = query.order("polytechnic").order("name").range(offset, offset + page_size - 1).execute()
    return _hydrate_profiles_page(response, page=page, page_size=page_size)
