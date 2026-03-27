from __future__ import annotations

from datetime import timedelta
from typing import Any
from uuid import UUID

from supabase import Client

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
    TelegramWebhookRequest,
    TelegramWebhookResponse,
)
from .repositories import admin, collab, events, health, profiles, resources, telegram


class SupabaseStore:
    """Facade satisfying StoreProtocol by delegating to repository functions."""

    def __init__(self, client: Client) -> None:
        self._client = client

    # -- profiles --

    def get_actor(self, user_id: UUID) -> ProfileRecord | None:
        return profiles.get_actor(user_id, client=self._client)

    def get_profile(self, user_id: UUID) -> ProfileRecord | None:
        return profiles.get_profile(user_id, client=self._client)

    def upsert_onboarding(self, payload: OnboardingSubmitRequest) -> ProfileRecord:
        return profiles.upsert_onboarding(payload, client=self._client)

    def update_profile(self, actor: ProfileRecord, payload: ProfileUpdateRequest) -> ProfileRecord:
        return profiles.update_profile(actor, payload, client=self._client)

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
        return profiles.list_profiles(
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
            include_pending=include_pending,
            client=self._client,
        )

    # -- events --

    def list_events(self, *, page: int = 1, page_size: int = 20) -> Page[EventRecord]:
        return events.list_events(page=page, page_size=page_size, client=self._client)

    def list_event_drafts_pending(self, *, page: int = 1, page_size: int = 20) -> Page[EventDraftRecord]:
        return events.list_event_drafts_pending(page=page, page_size=page_size, client=self._client)

    def rsvp_event(self, actor: ProfileRecord, event_id: UUID, status: RsvpStatus) -> RsvpRecord:
        return events.rsvp_event(actor, event_id, status, client=self._client)

    def publish_event_draft(
        self,
        actor: ProfileRecord,
        draft_id: UUID,
        *,
        approved: bool,
        reason: str | None = None,
    ) -> EventDraftRecord:
        return events.publish_event_draft(actor, draft_id, approved=approved, reason=reason, client=self._client)

    # -- resources --

    def list_resources(self, *, page: int = 1, page_size: int = 20) -> Page[ResourceRecord]:
        return resources.list_resources(page=page, page_size=page_size, client=self._client)

    def list_resource_submissions(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        status: ApprovalState | None = None,
    ) -> Page[ResourceSubmissionRecord]:
        return resources.list_resource_submissions(page=page, page_size=page_size, status=status, client=self._client)

    def submit_resource(self, actor: ProfileRecord, payload: ResourceSubmissionRequest) -> ResourceSubmissionRecord:
        return resources.submit_resource(actor, payload, client=self._client)

    def publish_resource(
        self,
        actor: ProfileRecord,
        submission_id: UUID,
        *,
        approved: bool,
        reason: str | None = None,
    ) -> ResourceSubmissionRecord:
        return resources.publish_resource(actor, submission_id, approved=approved, reason=reason, client=self._client)

    # -- collab --

    def list_collabs(self, *, page: int = 1, page_size: int = 20) -> Page[CollabProjectRecord]:
        return collab.list_collabs(page=page, page_size=page_size, client=self._client)

    def create_collab(self, actor: ProfileRecord, payload: CollabCreateRequest) -> CollabProjectRecord:
        return collab.create_collab(actor, payload, client=self._client)

    def join_collab(self, actor: ProfileRecord, collab_id: UUID) -> CollabMembershipRecord:
        return collab.join_collab(actor, collab_id, client=self._client)

    def leave_collab(self, actor: ProfileRecord, collab_id: UUID) -> None:
        collab.leave_collab(actor, collab_id, client=self._client)

    def delete_collab(self, actor: ProfileRecord, collab_id: UUID) -> None:
        collab.delete_collab(actor, collab_id, client=self._client)

    # -- admin --

    def list_approval_requests(self, *, page: int = 1, page_size: int = 20) -> Page[ApprovalRequestRecord]:
        return admin.list_approval_requests(page=page, page_size=page_size, client=self._client)

    def list_pending_approval_requests(self, *, page: int = 1, page_size: int = 20) -> Page[ApprovalRequestRecord]:
        return admin.list_pending_approval_requests(page=page, page_size=page_size, client=self._client)

    def review_user_application(
        self,
        actor: ProfileRecord,
        request_id: UUID,
        *,
        action: ModerationAction,
        reason: str | None = None,
    ) -> ApprovalRequestRecord:
        return admin.review_user_application(actor, request_id, action=action, reason=reason, client=self._client)

    def list_flags(self, *, page: int = 1, page_size: int = 20, status: FlagStatus | None = None) -> Page[FlagRecord]:
        return admin.list_flags(page=page, page_size=page_size, status=status, client=self._client)

    def resolve_flag(
        self,
        actor: ProfileRecord,
        flag_id: UUID,
        *,
        action: ModerationAction,
        reason: str | None = None,
    ) -> FlagRecord:
        return admin.resolve_flag(actor, flag_id, action=action, reason=reason, client=self._client)

    def ban_user(self, actor: ProfileRecord, user_id: UUID, *, reason: str | None = None) -> ProfileRecord:
        return admin.ban_user(actor, user_id, reason=reason, client=self._client)

    def unban_user(self, actor: ProfileRecord, user_id: UUID) -> ProfileRecord:
        return admin.unban_user(actor, user_id, client=self._client)

    # -- telegram --

    def create_telegram_token(
        self,
        review_object_type: ReviewObjectType,
        review_object_id: UUID,
        action: ModerationAction,
        *,
        actor_telegram_id: int | None = None,
        payload: dict[str, Any] | None = None,
        ttl: timedelta = timedelta(hours=2),
    ) -> TelegramActionTokenRecord:
        return telegram.create_telegram_token(
            review_object_type,
            review_object_id,
            action,
            actor_telegram_id=actor_telegram_id,
            payload=payload,
            ttl=ttl,
            client=self._client,
        )

    def apply_telegram_webhook(self, actor: ProfileRecord, payload: TelegramWebhookRequest) -> TelegramWebhookResponse:
        return telegram.apply_telegram_webhook(actor, payload, client=self._client)

    def sweep_expired_tokens(self) -> int:
        return telegram.sweep_expired_tokens(client=self._client)

    # -- system --

    def detect_suspicious_activity(self) -> list[FlagRecord]:
        return admin.detect_suspicious_activity(client=self._client)

    def queue_counts(self) -> QueueCounts:
        return health.queue_counts(client=self._client)

    def health(self) -> HealthResponse:
        return health.health(client=self._client)
