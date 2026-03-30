"""Contract tests verifying both InMemoryStore and SupabaseStore conform to StoreProtocol."""

from __future__ import annotations

from uuid import uuid4

import pytest

from api.models import (
    ApprovalRequestRecord,
    ApprovalState,
    CollabCreateRequest,
    CollabMembershipRecord,
    CollabProjectRecord,
    CollabType,
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
)
from api.store_protocol import StoreProtocol

from .conftest import (
    APPROVED_MEMBER_ID,
    APPROVAL_REQUEST_ID,
    COLLAB_ID,
    DRAFT_EVENT_ID,
    EVENT_ID,
    FLAG_ID,
    NONEXISTENT_ID,
    PENDING_MEMBER_ID,
    RESOURCE_SUBMISSION_ID,
)


# ---------------------------------------------------------------------------
# Health / system
# ---------------------------------------------------------------------------


class TestHealth:
    def test_health_returns_health_response(self, store: StoreProtocol) -> None:
        result = store.health()
        assert isinstance(result, HealthResponse)
        assert result.status == "ok"

    def test_queue_counts_returns_queue_counts(self, store: StoreProtocol) -> None:
        result = store.queue_counts()
        assert isinstance(result, QueueCounts)
        assert result.user_applications >= 0
        assert result.resource_submissions >= 0
        assert result.event_drafts >= 0
        assert result.flags >= 0


# ---------------------------------------------------------------------------
# Profiles
# ---------------------------------------------------------------------------


class TestProfiles:
    def test_get_actor_existing(self, store: StoreProtocol) -> None:
        result = store.get_actor(APPROVED_MEMBER_ID)
        assert isinstance(result, ProfileRecord)
        assert result.id == APPROVED_MEMBER_ID

    def test_get_actor_nonexistent_returns_none(self, store: StoreProtocol) -> None:
        assert store.get_actor(NONEXISTENT_ID) is None

    def test_get_profile_existing(self, store: StoreProtocol) -> None:
        result = store.get_profile(APPROVED_MEMBER_ID)
        assert isinstance(result, ProfileRecord)
        assert result.id == APPROVED_MEMBER_ID

    def test_get_profile_nonexistent_returns_none(self, store: StoreProtocol) -> None:
        assert store.get_profile(NONEXISTENT_ID) is None

    def test_list_profiles_returns_page(self, store: StoreProtocol) -> None:
        result = store.list_profiles()
        assert isinstance(result, Page)
        assert result.page == 1
        assert result.page_size == 20
        assert all(isinstance(p, ProfileRecord) for p in result.items)

    def test_list_profiles_excludes_pending_by_default(self, store: StoreProtocol) -> None:
        result = store.list_profiles()
        for p in result.items:
            assert p.approval_status == ApprovalState.approved

    def test_list_profiles_include_pending(self, store: StoreProtocol) -> None:
        result = store.list_profiles(include_pending=True)
        assert result.total >= len(result.items)

    def test_list_profiles_filter_polytechnic(self, store: StoreProtocol) -> None:
        result = store.list_profiles(polytechnic="SP")
        for p in result.items:
            assert p.polytechnic == "SP"

    def test_upsert_onboarding_creates_profile(self, store: StoreProtocol) -> None:
        payload = OnboardingSubmitRequest(
            user_id=uuid4(),
            username="new-user",
            email="new@example.com",
            google_subject="google-new",
            name="New User",
            polytechnic="NP",
            course="IT",
            graduation_year=2025,
            linkedin_url="https://www.linkedin.com/in/new-user",
        )
        result = store.upsert_onboarding(payload)
        assert isinstance(result, ProfileRecord)
        assert result.email == "new@example.com"

    def test_update_profile(
        self, store: StoreProtocol, approved_actor: ProfileRecord
    ) -> None:
        payload = ProfileUpdateRequest(name="Updated Name")
        result = store.update_profile(approved_actor, payload)
        assert isinstance(result, ProfileRecord)
        assert result.name == "Updated Name"


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------


class TestEvents:
    def test_list_events_returns_page(self, store: StoreProtocol) -> None:
        result = store.list_events()
        assert isinstance(result, Page)
        assert all(isinstance(e, EventRecord) for e in result.items)

    def test_list_event_drafts_pending(self, store: StoreProtocol) -> None:
        result = store.list_event_drafts_pending()
        assert isinstance(result, Page)
        assert all(isinstance(d, EventDraftRecord) for d in result.items)

    def test_rsvp_event(
        self, store: StoreProtocol, approved_actor: ProfileRecord
    ) -> None:
        result = store.rsvp_event(approved_actor, EVENT_ID, RsvpStatus.going)
        assert isinstance(result, RsvpRecord)
        assert result.event_id == EVENT_ID
        assert result.status == RsvpStatus.going

    def test_rsvp_event_unknown_raises_key_error(
        self, store: StoreProtocol, approved_actor: ProfileRecord
    ) -> None:
        with pytest.raises(KeyError):
            store.rsvp_event(approved_actor, NONEXISTENT_ID, RsvpStatus.going)

    def test_rsvp_event_unapproved_raises_permission_error(
        self, store: StoreProtocol
    ) -> None:
        pending = store.get_actor(PENDING_MEMBER_ID)
        assert pending is not None
        with pytest.raises(PermissionError):
            store.rsvp_event(pending, EVENT_ID, RsvpStatus.going)

    def test_publish_event_draft_approve(
        self, store: StoreProtocol, reviewer_actor: ProfileRecord
    ) -> None:
        result = store.publish_event_draft(
            reviewer_actor, DRAFT_EVENT_ID, approved=True
        )
        assert isinstance(result, EventDraftRecord)
        assert result.status == ApprovalState.approved

    def test_publish_event_draft_reject(
        self, store: StoreProtocol, reviewer_actor: ProfileRecord
    ) -> None:
        result = store.publish_event_draft(
            reviewer_actor, DRAFT_EVENT_ID, approved=False, reason="Not relevant"
        )
        assert isinstance(result, EventDraftRecord)
        assert result.status == ApprovalState.rejected

    def test_publish_event_draft_unknown_raises_key_error(
        self, store: StoreProtocol, reviewer_actor: ProfileRecord
    ) -> None:
        with pytest.raises(KeyError):
            store.publish_event_draft(reviewer_actor, NONEXISTENT_ID, approved=True)


# ---------------------------------------------------------------------------
# Resources
# ---------------------------------------------------------------------------


class TestResources:
    def test_list_resources_returns_page(self, store: StoreProtocol) -> None:
        result = store.list_resources()
        assert isinstance(result, Page)
        assert all(isinstance(r, ResourceRecord) for r in result.items)

    def test_list_resource_submissions(self, store: StoreProtocol) -> None:
        result = store.list_resource_submissions()
        assert isinstance(result, Page)
        assert all(isinstance(r, ResourceSubmissionRecord) for r in result.items)

    def test_submit_resource(
        self, store: StoreProtocol, approved_actor: ProfileRecord
    ) -> None:
        payload = ResourceSubmissionRequest(
            title="Test Resource",
            url="https://example.com/test",
            description="A test resource.",
            categories=["test"],
        )
        result = store.submit_resource(approved_actor, payload)
        assert isinstance(result, ResourceSubmissionRecord)
        assert result.title == "Test Resource"
        assert result.submitted_by == approved_actor.id

    def test_submit_resource_unapproved_raises_permission_error(
        self, store: StoreProtocol
    ) -> None:
        pending = store.get_actor(PENDING_MEMBER_ID)
        assert pending is not None
        payload = ResourceSubmissionRequest(
            title="X",
            url="https://example.com/x",
            categories=[],
        )
        with pytest.raises(PermissionError):
            store.submit_resource(pending, payload)

    def test_publish_resource_approve(
        self, store: StoreProtocol, reviewer_actor: ProfileRecord
    ) -> None:
        result = store.publish_resource(
            reviewer_actor, RESOURCE_SUBMISSION_ID, approved=True
        )
        assert isinstance(result, ResourceSubmissionRecord)
        assert result.status == ApprovalState.approved

    def test_publish_resource_reject(
        self, store: StoreProtocol, reviewer_actor: ProfileRecord
    ) -> None:
        result = store.publish_resource(
            reviewer_actor, RESOURCE_SUBMISSION_ID, approved=False, reason="Bad link"
        )
        assert isinstance(result, ResourceSubmissionRecord)
        assert result.status == ApprovalState.rejected

    def test_publish_resource_unknown_raises_key_error(
        self, store: StoreProtocol, reviewer_actor: ProfileRecord
    ) -> None:
        with pytest.raises(KeyError):
            store.publish_resource(reviewer_actor, NONEXISTENT_ID, approved=True)


# ---------------------------------------------------------------------------
# Collabs
# ---------------------------------------------------------------------------


class TestCollabs:
    def test_list_collabs_returns_page(self, store: StoreProtocol) -> None:
        result = store.list_collabs()
        assert isinstance(result, Page)
        assert all(isinstance(c, CollabProjectRecord) for c in result.items)

    def test_create_join_leave_delete_lifecycle(
        self,
        store: StoreProtocol,
        approved_actor: ProfileRecord,
        reviewer_actor: ProfileRecord,
    ) -> None:
        payload = CollabCreateRequest(
            title="Test Collab",
            type=CollabType.project,
            description="A test collab.",
            needed_roles=["dev"],
            needed_skills=["python"],
            team_size=3,
            contact_link="https://t.me/test",
        )
        collab = store.create_collab(approved_actor, payload)
        assert isinstance(collab, CollabProjectRecord)
        assert collab.title == "Test Collab"
        assert collab.created_by == approved_actor.id

        membership = store.join_collab(reviewer_actor, collab.id)
        assert isinstance(membership, CollabMembershipRecord)
        assert membership.collab_id == collab.id

        store.leave_collab(reviewer_actor, collab.id)

        store.delete_collab(approved_actor, collab.id)

    def test_join_collab_unknown_raises_key_error(
        self, store: StoreProtocol, approved_actor: ProfileRecord
    ) -> None:
        with pytest.raises(KeyError):
            store.join_collab(approved_actor, NONEXISTENT_ID)

    def test_create_collab_unapproved_raises_permission_error(
        self, store: StoreProtocol
    ) -> None:
        pending = store.get_actor(PENDING_MEMBER_ID)
        assert pending is not None
        payload = CollabCreateRequest(
            title="X",
            type=CollabType.project,
            description="X",
            team_size=1,
            contact_link="https://t.me/x",
        )
        with pytest.raises(PermissionError):
            store.create_collab(pending, payload)

    def test_delete_collab_unknown_raises_key_error(
        self, store: StoreProtocol, reviewer_actor: ProfileRecord
    ) -> None:
        with pytest.raises(KeyError):
            store.delete_collab(reviewer_actor, NONEXISTENT_ID)


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------


class TestAdmin:
    def test_list_approval_requests(self, store: StoreProtocol) -> None:
        result = store.list_approval_requests()
        assert isinstance(result, Page)
        assert all(isinstance(r, ApprovalRequestRecord) for r in result.items)

    def test_list_pending_approval_requests(self, store: StoreProtocol) -> None:
        result = store.list_pending_approval_requests()
        assert isinstance(result, Page)
        for r in result.items:
            assert r.status in {ApprovalState.pending, ApprovalState.needs_manual_review}

    def test_review_user_application_approve(
        self, store: StoreProtocol, reviewer_actor: ProfileRecord
    ) -> None:
        result = store.review_user_application(
            reviewer_actor, APPROVAL_REQUEST_ID, action=ModerationAction.approve
        )
        assert isinstance(result, ApprovalRequestRecord)
        assert result.status == ApprovalState.approved

    def test_review_user_application_unknown_raises_key_error(
        self, store: StoreProtocol, reviewer_actor: ProfileRecord
    ) -> None:
        with pytest.raises(KeyError):
            store.review_user_application(
                reviewer_actor, NONEXISTENT_ID, action=ModerationAction.approve
            )

    def test_list_flags(self, store: StoreProtocol) -> None:
        result = store.list_flags()
        assert isinstance(result, Page)
        assert all(isinstance(f, FlagRecord) for f in result.items)

    def test_resolve_flag_dismiss(
        self, store: StoreProtocol, reviewer_actor: ProfileRecord
    ) -> None:
        result = store.resolve_flag(
            reviewer_actor, FLAG_ID, action=ModerationAction.dismiss_flag
        )
        assert isinstance(result, FlagRecord)
        assert result.status == FlagStatus.resolved

    def test_resolve_flag_unknown_raises_key_error(
        self, store: StoreProtocol, reviewer_actor: ProfileRecord
    ) -> None:
        with pytest.raises(KeyError):
            store.resolve_flag(
                reviewer_actor, NONEXISTENT_ID, action=ModerationAction.dismiss_flag
            )

    def test_ban_and_unban_user(
        self, store: StoreProtocol, superadmin_actor: ProfileRecord
    ) -> None:
        result = store.ban_user(superadmin_actor, APPROVED_MEMBER_ID, reason="test")
        assert isinstance(result, ProfileRecord)
        assert result.approval_status == ApprovalState.banned

        result = store.unban_user(superadmin_actor, APPROVED_MEMBER_ID)
        assert isinstance(result, ProfileRecord)
        assert result.approval_status == ApprovalState.approved

    def test_ban_unknown_user_raises_key_error(
        self, store: StoreProtocol, superadmin_actor: ProfileRecord
    ) -> None:
        with pytest.raises(KeyError):
            store.ban_user(superadmin_actor, NONEXISTENT_ID)

    def test_unban_unknown_user_raises_key_error(
        self, store: StoreProtocol, superadmin_actor: ProfileRecord
    ) -> None:
        with pytest.raises(KeyError):
            store.unban_user(superadmin_actor, NONEXISTENT_ID)


# ---------------------------------------------------------------------------
# Telegram
# ---------------------------------------------------------------------------


class TestTelegram:
    def test_create_telegram_token(self, store: StoreProtocol) -> None:
        result = store.create_telegram_token(
            ReviewObjectType.user_application,
            APPROVAL_REQUEST_ID,
            ModerationAction.approve,
        )
        assert isinstance(result, TelegramActionTokenRecord)
        assert result.review_object_type == ReviewObjectType.user_application

    def test_sweep_expired_tokens(self, store: StoreProtocol) -> None:
        result = store.sweep_expired_tokens()
        assert isinstance(result, int)
        assert result >= 0


# ---------------------------------------------------------------------------
# Suspicious activity
# ---------------------------------------------------------------------------


class TestSuspiciousActivity:
    def test_detect_suspicious_activity(self, store: StoreProtocol) -> None:
        result = store.detect_suspicious_activity()
        assert isinstance(result, list)
        assert all(isinstance(f, FlagRecord) for f in result)
