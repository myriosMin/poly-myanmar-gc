from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..deps import get_actor, get_store, require_approved_member
from ..models import ApprovalState, Page, ProfileRecord, ProfileUpdateRequest
from ..store import InMemoryStore

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("", response_model=Page[ProfileRecord])
def list_profiles(
    _: ProfileRecord = Depends(require_approved_member),
    store: InMemoryStore = Depends(get_store),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    polytechnic: str | None = Query(default=None),
    course: str | None = Query(default=None),
    graduation_year: int | None = Query(default=None, ge=2000, le=2100),
    skills: list[str] | None = Query(default=None),
    status_badges: list[str] | None = Query(default=None),
    open_to_collab: bool | None = Query(default=None),
    job_seeking: bool | None = Query(default=None),
) -> Page[ProfileRecord]:
    return store.list_profiles(
        search=search,
        polytechnic=polytechnic,
        course=course,
        graduation_year=graduation_year,
        skills=skills,
        status_badges=status_badges,
        open_to_collab=open_to_collab,
        job_seeking=job_seeking,
        page=page,
        page_size=page_size,
    )


@router.get("/{profile_id}", response_model=ProfileRecord)
def get_profile(
    profile_id: UUID,
    _: ProfileRecord = Depends(require_approved_member),
    store: InMemoryStore = Depends(get_store),
) -> ProfileRecord:
    profile = store.get_profile(profile_id)
    if profile is None or profile.approval_status != ApprovalState.approved:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


@router.patch("/me", response_model=ProfileRecord)
def update_me(
    payload: ProfileUpdateRequest,
    actor: ProfileRecord = Depends(require_approved_member),
    store: InMemoryStore = Depends(get_store),
) -> ProfileRecord:
    return store.update_profile(actor, payload)
