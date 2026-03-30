from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..deps import get_actor, get_store, require_approved_member
from ..models import ApprovalState, Page, ProfileRecord, ProfileRecordLite, ProfileUpdateRequest
from ..store_protocol import StoreProtocol

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/directory", response_model=Page[ProfileRecordLite])
def get_directory(
    _: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
) -> Page[ProfileRecordLite]:
    """
    Fetch all approved members as lightweight cards for directory listing.
    No filtering applied - filtering happens client-side.
    Returns up to 5000 profiles for full-directory cache.
    """
    profiles = store.list_profiles(
        page=1,
        page_size=5000,
        search=None,
        polytechnic=None,
        course=None,
        graduation_year=None,
        skills=None,
        status_badges=None,
        open_to_collab=None,
        job_seeking=None,
    )
    
    # Convert to lite profiles (only card-needed fields)
    lite_profiles = [
        ProfileRecordLite(
            id=p.id,
            username=p.username,
            polytechnic=p.polytechnic,
            course=p.course,
            graduation_year=p.graduation_year,
            status_badges=p.status_badges,
            open_to_collab=p.open_to_collab,
            job_seeking=p.job_seeking,
            created_at=p.created_at,
            name=p.name,
        )
        for p in profiles.items
    ]
    
    return Page(
        items=lite_profiles,
        page=1,
        page_size=5000,
        total=len(lite_profiles),
    )


@router.get("", response_model=Page[ProfileRecord])
def list_profiles(
    _: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
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
    all: bool = Query(default=False),
) -> Page[ProfileRecord]:
    # If 'all' is True, fetch all profiles without filters
    if all:
        page = 1
        page_size = 5000
        search = None
        polytechnic = None
        course = None
        graduation_year = None
        skills = None
        status_badges = None
        open_to_collab = None
        job_seeking = None

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
    store: StoreProtocol = Depends(get_store),
) -> ProfileRecord:
    profile = store.get_profile(profile_id)
    if profile is None or profile.approval_status != ApprovalState.approved:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


@router.patch("/me", response_model=ProfileRecord)
def update_me(
    payload: ProfileUpdateRequest,
    actor: ProfileRecord = Depends(require_approved_member),
    store: StoreProtocol = Depends(get_store),
) -> ProfileRecord:
    return store.update_profile(actor, payload)
