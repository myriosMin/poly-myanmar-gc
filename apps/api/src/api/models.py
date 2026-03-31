from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Generic, TypeVar
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, HttpUrl


class StrEnum(str, Enum):
    def __str__(self) -> str:
        return self.value


class Role(StrEnum):
    member = "member"
    reviewer = "reviewer"
    superadmin = "superadmin"


class ApprovalState(StrEnum):
    pending = "pending"
    needs_manual_review = "needs_manual_review"
    approved = "approved"
    rejected = "rejected"
    banned = "banned"


class ReviewObjectType(StrEnum):
    user_application = "user_application"
    resource_submission = "resource_submission"
    draft_event = "draft_event"
    collab_flag = "collab_flag"


class ModerationAction(StrEnum):
    approve = "approve"
    reject = "reject"
    ban = "ban"
    remove = "remove"
    dismiss_flag = "dismiss_flag"


class RsvpStatus(StrEnum):
    going = "going"
    interested = "interested"
    not_going = "not_going"


class EventOrigin(StrEnum):
    admin = "admin"
    worker = "worker"


class EventVisibility(StrEnum):
    approved_members = "approved_members"


class CollabType(StrEnum):
    hackathon = "hackathon"
    project = "project"
    open_source = "open_source"
    startup_idea = "startup_idea"


class CollabStatus(StrEnum):
    active = "active"
    archived = "archived"
    removed = "removed"


class FlagStatus(StrEnum):
    open = "open"
    resolved = "resolved"


class Pagination(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total: int

    @property
    def has_next(self) -> bool:
        return self.page * self.page_size < self.total


class ProfileRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    username: str
    email: str
    google_subject: str | None = None
    role: Role = Role.member
    approval_status: ApprovalState = ApprovalState.pending
    name: str | None = None
    polytechnic: str | None = None
    course: str | None = None
    graduation_year: int | None = None
    linkedin_url: HttpUrl
    github_url: HttpUrl | None = None
    portfolio_url: HttpUrl | None = None
    skills: list[str] | None = None
    hobbies: list[str] | None = None
    status_badges: list[str] | None = None
    open_to_collab: bool | None = None
    job_seeking: bool | None = None
    manual_verification_notes: str | None = None
    manual_proof_url: HttpUrl | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def can_access_private_app(self) -> bool:
        return self.approval_status == ApprovalState.approved

    @property
    def is_admin(self) -> bool:
        return self.role in {Role.reviewer, Role.superadmin}

    @property
    def is_superadmin(self) -> bool:
        return self.role == Role.superadmin


class ProfileRecordLite(BaseModel):
    """Lightweight profile for directory listing - card fields only"""
    id: UUID
    username: str
    polytechnic: str | None = None
    course: str | None = None
    graduation_year: int | None = None
    status_badges: list[str] | None = None
    open_to_collab: bool | None = None
    job_seeking: bool | None = None
    created_at: datetime
    name: str | None = None  # Fallback for display


class OnboardingSubmitRequest(BaseModel):
    user_id: UUID
    username: str
    email: str
    google_subject: str | None = None
    name: str | None = None
    polytechnic: str | None = None
    course: str | None = None
    graduation_year: int | None = None
    linkedin_url: HttpUrl
    github_url: HttpUrl | None = None
    portfolio_url: HttpUrl | None = None
    skills: list[str] | None = None
    hobbies: list[str] | None = None
    open_to_collab: bool | None = None
    job_seeking: bool | None = None
    manual_verification_notes: str | None = None
    manual_proof_url: HttpUrl | None = None


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    polytechnic: str | None = None
    course: str | None = None
    graduation_year: int | None = None
    linkedin_url: HttpUrl | None = None
    github_url: HttpUrl | None = None
    portfolio_url: HttpUrl | None = None
    skills: list[str] | None = None
    hobbies: list[str] | None = None
    status_badges: list[str] | None = None
    open_to_collab: bool | None = None
    job_seeking: bool | None = None
    manual_verification_notes: str | None = None
    manual_proof_url: HttpUrl | None = None


class MeResponse(BaseModel):
    profile: ProfileRecord
    can_access_private_app: bool
    pending_review_count: int
    queue_access: bool


class DeletionRequestSubmitRequest(BaseModel):
    request_details: str | None = None


class DeletionRequestSubmitResponse(BaseModel):
    request_id: UUID
    status: FlagStatus
    already_exists: bool
    message: str


class ApprovalRequestRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    review_object_type: ReviewObjectType = ReviewObjectType.user_application
    status: ApprovalState = ApprovalState.pending
    submitted_payload: dict[str, Any]
    proof_url: HttpUrl | None = None
    reviewer_notes: str | None = None
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class EventRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    title: str
    kind: str
    description: str
    location: str
    starts_at: datetime
    ends_at: datetime | None = None
    source_url: HttpUrl | None = None
    created_by: UUID
    visibility: EventVisibility = EventVisibility.approved_members
    origin: EventOrigin = EventOrigin.admin
    published_at: datetime = Field(default_factory=datetime.utcnow)
    attendees_visible: bool = True
    attendance_count: int = 0
    capacity: int | None = None


class EventDraftRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    title: str
    kind: str
    description: str
    location: str
    starts_at: datetime
    ends_at: datetime | None = None
    source_url: HttpUrl | None = None
    source_name: str
    source_confidence: int = Field(default=50, ge=0, le=100)
    status: ApprovalState = ApprovalState.pending
    reviewer_notes: str | None = None
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    capacity: int | None = None


class RsvpRequest(BaseModel):
    status: RsvpStatus


class RsvpRecord(BaseModel):
    event_id: UUID
    user_id: UUID
    status: RsvpStatus
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ResourceSubmissionRequest(BaseModel):
    title: str
    url: HttpUrl
    description: str | None = None
    categories: list[str] = Field(default_factory=list)
    extra_categories: list[str] = Field(default_factory=list)


class ResourceSubmissionRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    title: str
    url: HttpUrl
    description: str | None = None
    categories: list[str] = Field(default_factory=list)
    extra_categories: list[str] = Field(default_factory=list)
    submitted_by: UUID
    status: ApprovalState = ApprovalState.pending
    reviewer_notes: str | None = None
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ResourceRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    title: str
    url: HttpUrl
    description: str | None = None
    categories: list[str] = Field(default_factory=list)
    submitted_by: UUID
    approved_by: UUID | None = None
    published_at: datetime = Field(default_factory=datetime.utcnow)


class CollabCreateRequest(BaseModel):
    title: str
    type: CollabType
    description: str
    needed_roles: list[str] = Field(default_factory=list)
    needed_skills: list[str] = Field(default_factory=list)
    deadline: datetime | None = None
    team_size: int = Field(default=1, ge=1)
    contact_link: HttpUrl


class CollabProjectRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    title: str
    type: CollabType
    description: str
    needed_roles: list[str] = Field(default_factory=list)
    needed_skills: list[str] = Field(default_factory=list)
    deadline: datetime | None = None
    team_size: int = Field(default=1, ge=1)
    contact_link: HttpUrl
    created_by: UUID
    status: CollabStatus = CollabStatus.active
    member_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CollabMembershipRecord(BaseModel):
    collab_id: UUID
    user_id: UUID
    state: str = "member"
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AdminActionRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    actor_id: UUID
    target_type: ReviewObjectType | str
    target_id: UUID
    action: ModerationAction
    reason: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FlagRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    subject_type: ReviewObjectType | str
    subject_id: UUID
    severity: str = "medium"
    reason: str
    status: FlagStatus = FlagStatus.open
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: datetime | None = None
    resolved_by: UUID | None = None


class TelegramActionTokenRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    review_object_type: ReviewObjectType
    review_object_id: UUID
    action: ModerationAction
    actor_telegram_id: int | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    expires_at: datetime = Field(default_factory=datetime.utcnow)
    consumed_at: datetime | None = None


class TelegramWebhookRequest(BaseModel):
    action_token: UUID
    review_object_type: ReviewObjectType
    review_object_id: UUID
    action: ModerationAction
    telegram_user_id: int | None = None
    reason: str | None = None


class TelegramWebhookResponse(BaseModel):
    ok: bool
    message: str
    action: ModerationAction
    review_object_type: ReviewObjectType
    review_object_id: UUID


class QueueCounts(BaseModel):
    user_applications: int
    resource_submissions: int
    event_drafts: int
    flags: int


class HealthResponse(BaseModel):
    status: str = "ok"
    approved_members: int
    pending_reviews: int
    published_events: int
    published_resources: int
    active_collabs: int

