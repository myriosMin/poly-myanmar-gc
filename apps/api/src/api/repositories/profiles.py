"""Supabase-backed implementations of the StoreProtocol profile methods.

These methods run on the API server using the service role key (bypassing RLS).
They are used when STORE_BACKEND=supabase is configured.
"""
from __future__ import annotations

from uuid import UUID

from supabase import Client

from ..models import (
    ApprovalRequestRecord,
    ApprovalState,
    HttpUrl,
    OnboardingSubmitRequest,
    Page,
    ProfileRecord,
    ProfileUpdateRequest,
    ReviewObjectType,
    Role,
)


def _row_to_profile(row: dict) -> ProfileRecord:
    """Hydrate a Supabase row dict into a ProfileRecord."""
    return ProfileRecord(**row)


class ProfilesRepository:
    """Supabase-backed repository for the profiles domain."""

    def __init__(self, client: Client) -> None:
        self._db = client

    # ------------------------------------------------------------------
    # get_actor / get_profile
    # ------------------------------------------------------------------

    def get_actor(self, user_id: UUID) -> ProfileRecord | None:
        """Fetch the actor profile by id. Returns None if not found (not an error)."""
        result = (
            self._db.table("profiles")
            .select("*")
            .eq("id", str(user_id))
            .maybe_single()
            .execute()
        )
        if result.data is None:
            return None
        return _row_to_profile(result.data)

    def get_profile(self, user_id: UUID) -> ProfileRecord | None:
        """Same as get_actor; kept separate to allow future divergence."""
        return self.get_actor(user_id)

    # ------------------------------------------------------------------
    # upsert_onboarding
    # ------------------------------------------------------------------

    def upsert_onboarding(self, payload: OnboardingSubmitRequest) -> ProfileRecord:
        """Upsert the member profile and insert an approval request row."""
        approval_status = (
            ApprovalState.needs_manual_review
            if payload.manual_proof_url or payload.manual_verification_notes
            else ApprovalState.pending
        )

        profile_data = {
            "id": str(payload.user_id),
            "email": payload.email,
            "google_subject": payload.google_subject,
            "role": Role.member.value,
            "approval_status": approval_status.value,
            "name": payload.name,
            "polytechnic": payload.polytechnic,
            "course": payload.course,
            "graduation_year": payload.graduation_year,
            "linkedin_url": str(payload.linkedin_url),
            "github_url": str(payload.github_url) if payload.github_url else None,
            "portfolio_url": str(payload.portfolio_url) if payload.portfolio_url else None,
            "skills": list(payload.skills),
            "hobbies": list(payload.hobbies),
            "status_badges": [],
            "open_to_collab": payload.open_to_collab,
            "job_seeking": payload.job_seeking,
            "manual_verification_notes": payload.manual_verification_notes,
            "manual_proof_url": str(payload.manual_proof_url) if payload.manual_proof_url else None,
        }

        result = (
            self._db.table("profiles")
            .upsert(profile_data, on_conflict="id")
            .execute()
        )
        profile = _row_to_profile(result.data[0])

        # Insert a new approval request row every time onboarding is submitted.
        approval_data = {
            "user_id": str(payload.user_id),
            "review_object_type": ReviewObjectType.user_application.value,
            "status": approval_status.value,
            "submitted_payload": payload.model_dump(mode="json"),
            "proof_url": str(payload.manual_proof_url) if payload.manual_proof_url else None,
        }
        self._db.table("approval_requests").insert(approval_data).execute()

        return profile

    # ------------------------------------------------------------------
    # update_profile
    # ------------------------------------------------------------------

    def update_profile(
        self, actor: ProfileRecord, payload: ProfileUpdateRequest
    ) -> ProfileRecord:
        """Partial update; only sends fields that are explicitly set."""
        fields = payload.model_dump(exclude_unset=True)
        if not fields:
            return actor

        # Normalise HttpUrl fields to strings for PostgREST.
        for url_field in ("linkedin_url", "github_url", "portfolio_url", "manual_proof_url"):
            if url_field in fields and fields[url_field] is not None:
                fields[url_field] = str(fields[url_field])

        result = (
            self._db.table("profiles")
            .update(fields)
            .eq("id", str(actor.id))
            .execute()
        )
        if not result.data:
            raise KeyError(f"Unknown profile: {actor.id}")
        return _row_to_profile(result.data[0])

    # ------------------------------------------------------------------
    # list_profiles
    # ------------------------------------------------------------------

    def list_profiles(
        self,
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
    ) -> Page[ProfileRecord]:
        """Translate all filter params into PostgREST query calls."""
        offset = (page - 1) * page_size

        query = (
            self._db.table("profiles")
            .select("*", count="exact")
            .order("polytechnic")
            .order("name")
            .range(offset, offset + page_size - 1)
        )

        if not include_pending:
            query = query.eq("approval_status", ApprovalState.approved.value)

        if search:
            v = search.replace("%", "").replace("'", "")
            query = query.or_(f"name.ilike.%{v}%,polytechnic.ilike.%{v}%")

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

        result = query.execute()
        items = [_row_to_profile(row) for row in (result.data or [])]
        total = result.count or 0

        return Page[ProfileRecord](
            items=items,
            page=page,
            page_size=page_size,
            total=total,
        )
