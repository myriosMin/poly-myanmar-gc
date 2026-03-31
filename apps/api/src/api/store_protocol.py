from __future__ import annotations

from datetime import timedelta
from typing import Any, Protocol
from uuid import UUID

from .models import (
    ApprovalRequestRecord,
    ApprovalState,
    CollabCreateRequest,
    CollabMembershipRecord,
    CollabProjectRecord,
    EventDraftRecord,
    EventRecord,
    FlagRecord,
    FlagStatus,
    HealthResponse,
    ModerationAction,
    OnboardingSubmitRequest,
    Page,
    ProfileRecord,
    ProfileUpdateRequest,
    QueueCounts,
    ResourceRecord,
    ResourceSubmissionRecord,
    ResourceSubmissionRequest,
    ReviewObjectType,
    RsvpRecord,
    RsvpStatus,
    TelegramActionTokenRecord,
    TelegramTokenSweepResponse,
    TelegramWebhookRequest,
    TelegramWebhookResponse,
)


class StoreProtocol(Protocol):
    def get_actor(self, user_id: UUID) -> ProfileRecord | None: ...

    def get_profile(self, user_id: UUID) -> ProfileRecord | None: ...

    def upsert_onboarding(self, payload: OnboardingSubmitRequest) -> ProfileRecord: ...

    def update_profile(self, actor: ProfileRecord, payload: ProfileUpdateRequest) -> ProfileRecord: ...

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
    ) -> Page[ProfileRecord]: ...

    def list_events(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        days_back: int | None = None,
    ) -> Page[EventRecord]: ...

    def list_event_drafts_pending(self, *, page: int = 1, page_size: int = 20) -> Page[EventDraftRecord]: ...

    def rsvp_event(self, actor: ProfileRecord, event_id: UUID, status: RsvpStatus) -> RsvpRecord: ...

    def list_resources(self, *, page: int = 1, page_size: int = 20) -> Page[ResourceRecord]: ...

    def list_resource_submissions(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        status: ApprovalState | None = None,
        submitted_by: UUID | None = None,
    ) -> Page[ResourceSubmissionRecord]: ...

    def submit_resource(self, actor: ProfileRecord, payload: ResourceSubmissionRequest) -> ResourceSubmissionRecord: ...

    def publish_resource(
        self,
        actor: ProfileRecord,
        submission_id: UUID,
        *,
        approved: bool,
        reason: str | None = None,
    ) -> ResourceSubmissionRecord: ...

    def delete_resource(self, actor: ProfileRecord, resource_id: UUID) -> None: ...

    def delete_resource_submission(self, actor: ProfileRecord, submission_id: UUID) -> None: ...

    def list_collabs(self, *, page: int = 1, page_size: int = 20) -> Page[CollabProjectRecord]: ...

    def create_collab(self, actor: ProfileRecord, payload: CollabCreateRequest) -> CollabProjectRecord: ...

    def join_collab(self, actor: ProfileRecord, collab_id: UUID) -> CollabMembershipRecord: ...

    def leave_collab(self, actor: ProfileRecord, collab_id: UUID) -> None: ...

    def remove_collab(self, actor: ProfileRecord, collab_id: UUID) -> None: ...

    def list_approval_requests(self, *, page: int = 1, page_size: int = 20) -> Page[ApprovalRequestRecord]: ...

    def list_pending_approval_requests(self, *, page: int = 1, page_size: int = 20) -> Page[ApprovalRequestRecord]: ...

    def review_user_application(
        self,
        actor: ProfileRecord,
        request_id: UUID,
        *,
        action: ModerationAction,
        reason: str | None = None,
    ) -> ApprovalRequestRecord: ...

    def publish_event_draft(
        self,
        actor: ProfileRecord,
        draft_id: UUID,
        *,
        approved: bool,
        reason: str | None = None,
    ) -> EventDraftRecord: ...

    def delete_event(self, actor: ProfileRecord, event_id: UUID) -> None: ...

    def list_flags(self, *, page: int = 1, page_size: int = 20, status: FlagStatus | None = None) -> Page[FlagRecord]: ...

    def resolve_flag(
        self,
        actor: ProfileRecord,
        flag_id: UUID,
        *,
        action: ModerationAction,
        reason: str | None = None,
    ) -> FlagRecord: ...

    def ban_user(self, actor: ProfileRecord, user_id: UUID, *, reason: str | None = None) -> ProfileRecord: ...

    def unban_user(self, actor: ProfileRecord, user_id: UUID) -> ProfileRecord: ...

    def delete_collab(self, actor: ProfileRecord, collab_id: UUID) -> None: ...

    def create_telegram_token(
        self,
        review_object_type: ReviewObjectType,
        review_object_id: UUID,
        action: ModerationAction,
        *,
        actor_telegram_id: int | None = None,
        payload: dict[str, Any] | None = None,
        ttl: timedelta = timedelta(hours=2),
    ) -> TelegramActionTokenRecord: ...

    def apply_telegram_webhook(self, actor: ProfileRecord, payload: TelegramWebhookRequest) -> TelegramWebhookResponse: ...

    def sweep_expired_tokens(self) -> int: ...

    def sweep_expired_tokens_detailed(self) -> TelegramTokenSweepResponse: ...

    def detect_suspicious_activity(self) -> list[FlagRecord]: ...

    def store_event_draft(self, draft: EventDraftRecord) -> EventDraftRecord: ...

    def store_flag(self, flag: FlagRecord) -> FlagRecord: ...

    def queue_counts(self) -> QueueCounts: ...

    def health(self) -> HealthResponse: ...
