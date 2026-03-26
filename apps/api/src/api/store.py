from __future__ import annotations

from datetime import UTC, datetime, timedelta
from threading import RLock
from typing import Any
from urllib.parse import urlparse
from uuid import UUID

from .models import (
    AdminActionRecord,
    ApprovalRequestRecord,
    ApprovalState,
    CollabCreateRequest,
    CollabMembershipRecord,
    CollabProjectRecord,
    CollabStatus,
    CollabType,
    EventDraftRecord,
    EventOrigin,
    EventRecord,
    EventVisibility,
    FlagRecord,
    FlagStatus,
    HealthResponse,
    ModerationAction,
    OnboardingSubmitRequest,
    Page,
    ProfileRecord,
    ProfileUpdateRequest,
    ResourceRecord,
    ResourceSubmissionRecord,
    ResourceSubmissionRequest,
    Role,
    RsvpRecord,
    RsvpStatus,
    ReviewObjectType,
    TelegramActionTokenRecord,
    TelegramWebhookRequest,
    TelegramWebhookResponse,
    QueueCounts,
)


def _now() -> datetime:
    return datetime.now(UTC)


def _paginate(items: list[Any], page: int, page_size: int) -> tuple[list[Any], int]:
    start = (page - 1) * page_size
    end = start + page_size
    return items[start:end], len(items)


class InMemoryStore:
    def __init__(self) -> None:
        self._lock = RLock()
        self.profiles: dict[UUID, ProfileRecord] = {}
        self.approval_requests: dict[UUID, ApprovalRequestRecord] = {}
        self.resources: dict[UUID, ResourceRecord] = {}
        self.resource_submissions: dict[UUID, ResourceSubmissionRecord] = {}
        self.events: dict[UUID, EventRecord] = {}
        self.event_drafts: dict[UUID, EventDraftRecord] = {}
        self.event_rsvps: dict[tuple[UUID, UUID], RsvpRecord] = {}
        self.collab_projects: dict[UUID, CollabProjectRecord] = {}
        self.collab_memberships: dict[tuple[UUID, UUID], CollabMembershipRecord] = {}
        self.admin_actions: list[AdminActionRecord] = []
        self.flags: dict[UUID, FlagRecord] = {}
        self.telegram_action_tokens: dict[UUID, TelegramActionTokenRecord] = {}
        self._seed()

    def _seed(self) -> None:
        approved_member = ProfileRecord(
            id=UUID("11111111-1111-1111-1111-111111111111"),
            email="lin.hay@example.com",
            google_subject="google-subject-member-001",
            role=Role.member,
            approval_status=ApprovalState.approved,
            name="Lin Hay",
            polytechnic="SP",
            course="Diploma in Information Technology",
            graduation_year=2025,
            linkedin_url="https://www.linkedin.com/in/lin-hay",
            github_url="https://github.com/linhay",
            portfolio_url="https://linhay.dev",
            skills=["python", "fastapi", "postgres"],
            hobbies=["hackathons", "campus events"],
            status_badges=["current student", "job seeking"],
            open_to_collab=True,
            job_seeking=True,
        )
        pending_member = ProfileRecord(
            id=UUID("22222222-2222-2222-2222-222222222222"),
            email="aung.ko@example.com",
            google_subject="google-subject-member-002",
            role=Role.member,
            approval_status=ApprovalState.pending,
            name="Aung Ko",
            polytechnic="NYP",
            course="Diploma in Business Information Systems",
            graduation_year=2024,
            linkedin_url="https://www.linkedin.com/in/aung-ko",
            skills=["product", "research"],
            hobbies=["volunteering"],
            status_badges=["graduate"],
            open_to_collab=True,
        )
        reviewer = ProfileRecord(
            id=UUID("33333333-3333-3333-3333-333333333333"),
            email="reviewer@example.com",
            google_subject="google-subject-reviewer",
            role=Role.reviewer,
            approval_status=ApprovalState.approved,
            name="Reviewer One",
            polytechnic="TP",
            course="Diploma in Cybersecurity",
            graduation_year=2023,
            linkedin_url="https://www.linkedin.com/in/reviewer-one",
            skills=["moderation", "cybersecurity"],
            status_badges=["reviewer"],
        )
        superadmin = ProfileRecord(
            id=UUID("44444444-4444-4444-4444-444444444444"),
            email="admin@example.com",
            google_subject="google-subject-superadmin",
            role=Role.superadmin,
            approval_status=ApprovalState.approved,
            name="Super Admin",
            polytechnic="RP",
            course="Diploma in Computer Engineering",
            graduation_year=2022,
            linkedin_url="https://www.linkedin.com/in/super-admin",
            skills=["operations", "governance"],
            status_badges=["superadmin"],
        )
        self.profiles = {
            approved_member.id: approved_member,
            pending_member.id: pending_member,
            reviewer.id: reviewer,
            superadmin.id: superadmin,
        }
        approval_request = ApprovalRequestRecord(
            id=UUID("55555555-5555-5555-5555-555555555555"),
            user_id=pending_member.id,
            review_object_type=ReviewObjectType.user_application,
            status=ApprovalState.pending,
            submitted_payload=pending_member.model_dump(mode="json"),
        )
        self.approval_requests[approval_request.id] = approval_request
        resource_submission = ResourceSubmissionRecord(
            id=UUID("66666666-6666-6666-6666-666666666666"),
            title="FastAPI Productivity Cheatsheet",
            url="https://example.com/fastapi-cheatsheet",
            description="Concise notes for the first backend sprint.",
            categories=["backend", "python"],
            extra_categories=["interview-prep"],
            submitted_by=approved_member.id,
            status=ApprovalState.pending,
        )
        self.resource_submissions[resource_submission.id] = resource_submission
        self.resources[UUID("77777777-7777-7777-7777-777777777777")] = ResourceRecord(
            id=UUID("77777777-7777-7777-7777-777777777777"),
            title="STEM Career Fair Tracker",
            url="https://example.com/career-fairs",
            description="Curated list of Singapore career fair links.",
            categories=["events", "jobs"],
            submitted_by=approved_member.id,
            approved_by=superadmin.id,
        )
        self.resources[UUID("88888888-8888-8888-8888-888888888888")] = ResourceRecord(
            id=UUID("88888888-8888-8888-8888-888888888888"),
            title="Interview Revision Pack",
            url="https://example.com/interview-pack",
            description="Resource pack for internships and graduate roles.",
            categories=["interview", "career"],
            submitted_by=reviewer.id,
            approved_by=superadmin.id,
        )
        published_event = EventRecord(
            id=UUID("99999999-9999-9999-9999-999999999999"),
            title="Singapore Polytechnic Career Fair",
            kind="career_fair",
            description="Meet employers together as a GC member cohort.",
            location="Singapore Expo",
            starts_at=datetime(2026, 4, 12, 10, 0, tzinfo=UTC),
            ends_at=datetime(2026, 4, 12, 16, 0, tzinfo=UTC),
            source_url="https://example.com/career-fair",
            created_by=superadmin.id,
            visibility=EventVisibility.approved_members,
            origin=EventOrigin.admin,
        )
        self.events[published_event.id] = published_event
        draft_event = EventDraftRecord(
            id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            title="Cloud Hackathon Singapore",
            kind="hackathon",
            description="Worker-sourced draft waiting on approval.",
            location="One-North",
            starts_at=datetime(2026, 4, 19, 9, 0, tzinfo=UTC),
            ends_at=datetime(2026, 4, 20, 18, 0, tzinfo=UTC),
            source_url="https://example.com/hackathon",
            source_name="worker",
            source_confidence=72,
        )
        self.event_drafts[draft_event.id] = draft_event
        self.event_rsvps[(published_event.id, approved_member.id)] = RsvpRecord(
            event_id=published_event.id,
            user_id=approved_member.id,
            status=RsvpStatus.going,
        )
        self._recount_event_rsvps(published_event.id)
        collab = CollabProjectRecord(
            id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            title="Open Source Cohort Website",
            type=CollabType.open_source,
            description="Build the first member portal together.",
            needed_roles=["frontend", "backend"],
            needed_skills=["react", "fastapi"],
            deadline=datetime(2026, 4, 30, 0, 0, tzinfo=UTC),
            team_size=5,
            contact_link="https://t.me/polygc",
            created_by=approved_member.id,
        )
        self.collab_projects[collab.id] = collab
        self.collab_memberships[(collab.id, approved_member.id)] = CollabMembershipRecord(
            collab_id=collab.id,
            user_id=approved_member.id,
        )
        self.collab_memberships[(collab.id, reviewer.id)] = CollabMembershipRecord(
            collab_id=collab.id,
            user_id=reviewer.id,
            state="interested",
        )
        self._recount_collab_members(collab.id)
        flag = FlagRecord(
            id=UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
            subject_type=ReviewObjectType.resource_submission,
            subject_id=resource_submission.id,
            severity="medium",
            reason="Contains an external domain that should be reviewed before publishing.",
        )
        self.flags[flag.id] = flag
        self.telegram_action_tokens[UUID("dddddddd-dddd-dddd-dddd-dddddddddddd")] = TelegramActionTokenRecord(
            id=UUID("dddddddd-dddd-dddd-dddd-dddddddddddd"),
            review_object_type=ReviewObjectType.resource_submission,
            review_object_id=resource_submission.id,
            action=ModerationAction.approve,
            actor_telegram_id=123456789,
            expires_at=_now() + timedelta(hours=2),
        )

    def _recount_event_rsvps(self, event_id: UUID) -> None:
        count = sum(
            1
            for (current_event_id, _), rsvp in self.event_rsvps.items()
            if current_event_id == event_id and rsvp.status == RsvpStatus.going
        )
        if event_id in self.events:
            self.events[event_id].attendance_count = count

    def _recount_collab_members(self, collab_id: UUID) -> None:
        count = sum(
            1
            for (current_collab_id, _), membership in self.collab_memberships.items()
            if current_collab_id == collab_id and membership.state != "left"
        )
        if collab_id in self.collab_projects:
            self.collab_projects[collab_id].member_count = count

    def _log_action(
        self,
        actor_id: UUID,
        target_type: ReviewObjectType | str,
        target_id: UUID,
        action: ModerationAction,
        reason: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> AdminActionRecord:
        record = AdminActionRecord(
            actor_id=actor_id,
            target_type=target_type,
            target_id=target_id,
            action=action,
            reason=reason,
            payload=payload or {},
        )
        self.admin_actions.append(record)
        return record

    def get_actor(self, user_id: UUID) -> ProfileRecord | None:
        return self.profiles.get(user_id)

    def get_profile(self, user_id: UUID) -> ProfileRecord | None:
        return self.profiles.get(user_id)

    def upsert_onboarding(self, payload: OnboardingSubmitRequest) -> ProfileRecord:
        with self._lock:
            approval_status = ApprovalState.needs_manual_review if payload.manual_proof_url or payload.manual_verification_notes else ApprovalState.pending
            profile = self.profiles.get(payload.user_id)
            if profile is None:
                profile = ProfileRecord(
                    id=payload.user_id,
                    email=payload.email,
                    google_subject=payload.google_subject,
                    role=Role.member,
                    approval_status=approval_status,
                    name=payload.name,
                    polytechnic=payload.polytechnic,
                    course=payload.course,
                    graduation_year=payload.graduation_year,
                    linkedin_url=payload.linkedin_url,
                    github_url=payload.github_url,
                    portfolio_url=payload.portfolio_url,
                    skills=list(payload.skills),
                    hobbies=list(payload.hobbies),
                    status_badges=[],
                    open_to_collab=payload.open_to_collab,
                    job_seeking=payload.job_seeking,
                    manual_verification_notes=payload.manual_verification_notes,
                    manual_proof_url=payload.manual_proof_url,
                )
            else:
                profile.email = payload.email
                profile.google_subject = payload.google_subject
                profile.name = payload.name
                profile.polytechnic = payload.polytechnic
                profile.course = payload.course
                profile.graduation_year = payload.graduation_year
                profile.linkedin_url = payload.linkedin_url
                profile.github_url = payload.github_url
                profile.portfolio_url = payload.portfolio_url
                profile.skills = list(payload.skills)
                profile.hobbies = list(payload.hobbies)
                profile.open_to_collab = payload.open_to_collab
                profile.job_seeking = payload.job_seeking
                profile.manual_verification_notes = payload.manual_verification_notes
                profile.manual_proof_url = payload.manual_proof_url
                if profile.role == Role.member:
                    profile.approval_status = approval_status
            profile.updated_at = _now()
            self.profiles[profile.id] = profile
            request = ApprovalRequestRecord(
                user_id=profile.id,
                review_object_type=ReviewObjectType.user_application,
                status=profile.approval_status,
                submitted_payload=payload.model_dump(mode="json"),
                proof_url=payload.manual_proof_url,
            )
            self.approval_requests[request.id] = request
            return profile

    def update_profile(self, actor: ProfileRecord, payload: ProfileUpdateRequest) -> ProfileRecord:
        with self._lock:
            profile = self.profiles.get(actor.id)
            if profile is None:
                raise KeyError(f"Unknown profile: {actor.id}")
            for field_name, value in payload.model_dump(exclude_unset=True).items():
                setattr(profile, field_name, value)
            profile.updated_at = _now()
            return profile

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
        profiles = sorted(self.profiles.values(), key=lambda profile: (profile.polytechnic, profile.name))
        if not include_pending:
            profiles = [profile for profile in profiles if profile.approval_status == ApprovalState.approved]
        if search:
            needle = search.lower()
            profiles = [
                profile
                for profile in profiles
                if needle in profile.name.lower()
                or needle in profile.polytechnic.lower()
                or any(needle in skill.lower() for skill in profile.skills)
            ]
        if polytechnic:
            profiles = [profile for profile in profiles if profile.polytechnic == polytechnic]
        if course:
            profiles = [profile for profile in profiles if course.lower() in profile.course.lower()]
        if graduation_year:
            profiles = [profile for profile in profiles if profile.graduation_year == graduation_year]
        if skills:
            wanted = {skill.lower() for skill in skills}
            profiles = [profile for profile in profiles if wanted.intersection({skill.lower() for skill in profile.skills})]
        if status_badges:
            wanted_badges = {badge.lower() for badge in status_badges}
            profiles = [profile for profile in profiles if wanted_badges.intersection({badge.lower() for badge in profile.status_badges})]
        if open_to_collab is not None:
            profiles = [profile for profile in profiles if profile.open_to_collab == open_to_collab]
        if job_seeking is not None:
            profiles = [profile for profile in profiles if profile.job_seeking == job_seeking]
        page_items, total = _paginate(profiles, page, page_size)
        return Page[ProfileRecord](items=page_items, page=page, page_size=page_size, total=total)

    def list_events(self, *, page: int = 1, page_size: int = 20) -> Page[EventRecord]:
        events = sorted(self.events.values(), key=lambda event: event.starts_at)
        page_items, total = _paginate(events, page, page_size)
        return Page[EventRecord](items=page_items, page=page, page_size=page_size, total=total)

    def list_event_drafts_pending(self, *, page: int = 1, page_size: int = 20) -> Page[EventDraftRecord]:
        drafts = [draft for draft in self.event_drafts.values() if draft.status in {ApprovalState.pending, ApprovalState.needs_manual_review}]
        drafts.sort(key=lambda draft: draft.created_at, reverse=True)
        page_items, total = _paginate(drafts, page, page_size)
        return Page[EventDraftRecord](items=page_items, page=page, page_size=page_size, total=total)

    def rsvp_event(self, actor: ProfileRecord, event_id: UUID, status: RsvpStatus) -> RsvpRecord:
        with self._lock:
            if actor.approval_status != ApprovalState.approved:
                raise PermissionError("Approved members only")
            if event_id not in self.events:
                raise KeyError(f"Unknown event: {event_id}")
            record = RsvpRecord(event_id=event_id, user_id=actor.id, status=status, updated_at=_now())
            self.event_rsvps[(event_id, actor.id)] = record
            self._recount_event_rsvps(event_id)
            return record

    def list_resources(self, *, page: int = 1, page_size: int = 20) -> Page[ResourceRecord]:
        resources = sorted(self.resources.values(), key=lambda resource: resource.published_at, reverse=True)
        page_items, total = _paginate(resources, page, page_size)
        return Page[ResourceRecord](items=page_items, page=page, page_size=page_size, total=total)

    def list_resource_submissions(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        status: ApprovalState | None = None,
    ) -> Page[ResourceSubmissionRecord]:
        submissions = sorted(self.resource_submissions.values(), key=lambda submission: submission.created_at, reverse=True)
        if status is not None:
            submissions = [submission for submission in submissions if submission.status == status]
        page_items, total = _paginate(submissions, page, page_size)
        return Page[ResourceSubmissionRecord](items=page_items, page=page, page_size=page_size, total=total)

    def submit_resource(self, actor: ProfileRecord, payload: ResourceSubmissionRequest) -> ResourceSubmissionRecord:
        with self._lock:
            if actor.approval_status != ApprovalState.approved:
                raise PermissionError("Approved members only")
            record = ResourceSubmissionRecord(
                title=payload.title,
                url=payload.url,
                description=payload.description,
                categories=list(payload.categories),
                extra_categories=list(payload.extra_categories),
                submitted_by=actor.id,
            )
            self.resource_submissions[record.id] = record
            return record

    def publish_resource(
        self,
        actor: ProfileRecord,
        submission_id: UUID,
        *,
        approved: bool,
        reason: str | None = None,
    ) -> ResourceSubmissionRecord:
        with self._lock:
            submission = self.resource_submissions.get(submission_id)
            if submission is None:
                raise KeyError(f"Unknown resource submission: {submission_id}")
            submission.status = ApprovalState.approved if approved else ApprovalState.rejected
            submission.reviewer_notes = reason
            submission.reviewed_by = actor.id
            submission.reviewed_at = _now()
            submission.updated_at = _now()
            if approved:
                resource = ResourceRecord(
                    title=submission.title,
                    url=submission.url,
                    description=submission.description,
                    categories=list(submission.categories) + list(submission.extra_categories),
                    submitted_by=submission.submitted_by,
                    approved_by=actor.id,
                )
                self.resources[resource.id] = resource
                self._log_action(
                    actor.id,
                    ReviewObjectType.resource_submission,
                    submission_id,
                    ModerationAction.approve,
                    reason=reason,
                    payload={"resource_id": str(resource.id)},
                )
            else:
                self._log_action(
                    actor.id,
                    ReviewObjectType.resource_submission,
                    submission_id,
                    ModerationAction.reject,
                    reason=reason,
                )
            return submission

    def list_collabs(self, *, page: int = 1, page_size: int = 20) -> Page[CollabProjectRecord]:
        collabs = [collab for collab in self.collab_projects.values() if collab.status == CollabStatus.active]
        collabs.sort(key=lambda collab: (collab.deadline or datetime.max.replace(tzinfo=UTC), collab.title))
        page_items, total = _paginate(collabs, page, page_size)
        return Page[CollabProjectRecord](items=page_items, page=page, page_size=page_size, total=total)

    def create_collab(self, actor: ProfileRecord, payload: CollabCreateRequest) -> CollabProjectRecord:
        with self._lock:
            if actor.approval_status != ApprovalState.approved:
                raise PermissionError("Approved members only")
            collab = CollabProjectRecord(
                title=payload.title,
                type=payload.type,
                description=payload.description,
                needed_roles=list(payload.needed_roles),
                needed_skills=list(payload.needed_skills),
                deadline=payload.deadline,
                team_size=payload.team_size,
                contact_link=payload.contact_link,
                created_by=actor.id,
            )
            self.collab_projects[collab.id] = collab
            self.collab_memberships[(collab.id, actor.id)] = CollabMembershipRecord(collab_id=collab.id, user_id=actor.id)
            self._recount_collab_members(collab.id)
            return collab

    def join_collab(self, actor: ProfileRecord, collab_id: UUID) -> CollabMembershipRecord:
        with self._lock:
            if actor.approval_status != ApprovalState.approved:
                raise PermissionError("Approved members only")
            if collab_id not in self.collab_projects:
                raise KeyError(f"Unknown collab: {collab_id}")
            membership = CollabMembershipRecord(collab_id=collab_id, user_id=actor.id, state="member")
            self.collab_memberships[(collab_id, actor.id)] = membership
            self._recount_collab_members(collab_id)
            return membership

    def leave_collab(self, actor: ProfileRecord, collab_id: UUID) -> None:
        with self._lock:
            self.collab_memberships.pop((collab_id, actor.id), None)
            self._recount_collab_members(collab_id)

    def list_approval_requests(self, *, page: int = 1, page_size: int = 20) -> Page[ApprovalRequestRecord]:
        requests = sorted(self.approval_requests.values(), key=lambda request: request.created_at, reverse=True)
        page_items, total = _paginate(requests, page, page_size)
        return Page[ApprovalRequestRecord](items=page_items, page=page, page_size=page_size, total=total)

    def list_pending_approval_requests(self, *, page: int = 1, page_size: int = 20) -> Page[ApprovalRequestRecord]:
        requests = [request for request in self.approval_requests.values() if request.status in {ApprovalState.pending, ApprovalState.needs_manual_review}]
        requests.sort(key=lambda request: request.created_at, reverse=True)
        page_items, total = _paginate(requests, page, page_size)
        return Page[ApprovalRequestRecord](items=page_items, page=page, page_size=page_size, total=total)

    def review_user_application(
        self,
        actor: ProfileRecord,
        request_id: UUID,
        *,
        action: ModerationAction,
        reason: str | None = None,
    ) -> ApprovalRequestRecord:
        with self._lock:
            request = self.approval_requests.get(request_id)
            if request is None:
                raise KeyError(f"Unknown approval request: {request_id}")
            profile = self.profiles.get(request.user_id)
            if profile is None:
                raise KeyError(f"Unknown profile for request: {request.user_id}")
            if action == ModerationAction.approve:
                request.status = ApprovalState.approved
                profile.approval_status = ApprovalState.approved
            elif action == ModerationAction.reject:
                request.status = ApprovalState.rejected
                profile.approval_status = ApprovalState.rejected
            elif action == ModerationAction.ban:
                request.status = ApprovalState.banned
                profile.approval_status = ApprovalState.banned
            else:
                raise ValueError("Unsupported user application action")
            request.reviewer_notes = reason
            request.reviewed_by = actor.id
            request.reviewed_at = _now()
            request.updated_at = _now()
            profile.updated_at = _now()
            self._log_action(
                actor.id,
                ReviewObjectType.user_application,
                request_id,
                action,
                reason=reason,
                payload={"profile_id": str(profile.id)},
            )
            return request

    def publish_event_draft(
        self,
        actor: ProfileRecord,
        draft_id: UUID,
        *,
        approved: bool,
        reason: str | None = None,
    ) -> EventDraftRecord:
        with self._lock:
            draft = self.event_drafts.get(draft_id)
            if draft is None:
                raise KeyError(f"Unknown event draft: {draft_id}")
            draft.status = ApprovalState.approved if approved else ApprovalState.rejected
            draft.reviewer_notes = reason
            draft.reviewed_by = actor.id
            draft.reviewed_at = _now()
            draft.updated_at = _now()
            if approved:
                event = EventRecord(
                    title=draft.title,
                    kind=draft.kind,
                    description=draft.description,
                    location=draft.location,
                    starts_at=draft.starts_at,
                    ends_at=draft.ends_at,
                    source_url=draft.source_url,
                    created_by=actor.id,
                    origin=EventOrigin.worker,
                )
                self.events[event.id] = event
                self._log_action(
                    actor.id,
                    ReviewObjectType.draft_event,
                    draft_id,
                    ModerationAction.approve,
                    reason=reason,
                    payload={"event_id": str(event.id)},
                )
            else:
                self._log_action(
                    actor.id,
                    ReviewObjectType.draft_event,
                    draft_id,
                    ModerationAction.reject,
                    reason=reason,
                )
            return draft

    def list_flags(self, *, page: int = 1, page_size: int = 20, status: FlagStatus | None = None) -> Page[FlagRecord]:
        flags = sorted(self.flags.values(), key=lambda flag: flag.created_at, reverse=True)
        if status is not None:
            flags = [flag for flag in flags if flag.status == status]
        page_items, total = _paginate(flags, page, page_size)
        return Page[FlagRecord](items=page_items, page=page, page_size=page_size, total=total)

    def resolve_flag(
        self,
        actor: ProfileRecord,
        flag_id: UUID,
        *,
        action: ModerationAction,
        reason: str | None = None,
    ) -> FlagRecord:
        with self._lock:
            flag = self.flags.get(flag_id)
            if flag is None:
                raise KeyError(f"Unknown flag: {flag_id}")
            if action == ModerationAction.dismiss_flag:
                flag.status = FlagStatus.resolved
            elif action == ModerationAction.ban:
                flag.status = FlagStatus.resolved
                if flag.subject_type == ReviewObjectType.user_application:
                    self.ban_user(actor, flag.subject_id, reason=reason)
            else:
                raise ValueError("Unsupported flag action")
            flag.resolved_at = _now()
            flag.resolved_by = actor.id
            self._log_action(
                actor.id,
                flag.subject_type,
                flag.subject_id,
                action,
                reason=reason,
                payload={"flag_id": str(flag.id)},
            )
            return flag

    def ban_user(self, actor: ProfileRecord, user_id: UUID, *, reason: str | None = None) -> ProfileRecord:
        with self._lock:
            profile = self.profiles.get(user_id)
            if profile is None:
                raise KeyError(f"Unknown profile: {user_id}")
            profile.approval_status = ApprovalState.banned
            profile.updated_at = _now()
            self._log_action(
                actor.id,
                ReviewObjectType.user_application,
                user_id,
                ModerationAction.ban,
                reason=reason,
            )
            return profile

    def unban_user(self, actor: ProfileRecord, user_id: UUID) -> ProfileRecord:
        with self._lock:
            profile = self.profiles.get(user_id)
            if profile is None:
                raise KeyError(f"Unknown profile: {user_id}")
            profile.approval_status = ApprovalState.approved
            profile.updated_at = _now()
            self._log_action(
                actor.id,
                ReviewObjectType.user_application,
                user_id,
                ModerationAction.dismiss_flag,
                reason="user unbanned",
            )
            return profile

    def delete_collab(self, actor: ProfileRecord, collab_id: UUID) -> None:
        with self._lock:
            collab = self.collab_projects.get(collab_id)
            if collab is None:
                raise KeyError(f"Unknown collab: {collab_id}")
            collab.status = CollabStatus.removed
            collab.updated_at = _now()
            self._log_action(
                actor.id,
                ReviewObjectType.collab_flag,
                collab_id,
                ModerationAction.remove,
                reason="collab removed by admin",
            )

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
        with self._lock:
            token = TelegramActionTokenRecord(
                review_object_type=review_object_type,
                review_object_id=review_object_id,
                action=action,
                actor_telegram_id=actor_telegram_id,
                payload=payload or {},
                expires_at=_now() + ttl,
            )
            self.telegram_action_tokens[token.id] = token
            return token

    def apply_telegram_webhook(self, actor: ProfileRecord, payload: TelegramWebhookRequest) -> TelegramWebhookResponse:
        with self._lock:
            token = self.telegram_action_tokens.get(payload.action_token)
            if token is None:
                raise KeyError(f"Unknown token: {payload.action_token}")
            if token.consumed_at is not None:
                raise ValueError("Token already consumed")
            if token.expires_at < _now():
                raise ValueError("Token expired")
            if token.review_object_type != payload.review_object_type or token.review_object_id != payload.review_object_id:
                raise ValueError("Token does not match payload")
            if token.action != payload.action:
                raise ValueError("Token action mismatch")
            if payload.review_object_type == ReviewObjectType.user_application:
                self.review_user_application(actor, payload.review_object_id, action=payload.action, reason=payload.reason)
            elif payload.review_object_type == ReviewObjectType.resource_submission:
                self.publish_resource(actor, payload.review_object_id, approved=payload.action == ModerationAction.approve, reason=payload.reason)
            elif payload.review_object_type == ReviewObjectType.draft_event:
                self.publish_event_draft(actor, payload.review_object_id, approved=payload.action == ModerationAction.approve, reason=payload.reason)
            elif payload.review_object_type == ReviewObjectType.collab_flag:
                self.resolve_flag(actor, payload.review_object_id, action=payload.action, reason=payload.reason)
            else:
                raise ValueError("Unsupported webhook object type")
            token.consumed_at = _now()
            return TelegramWebhookResponse(
                ok=True,
                message="Action applied",
                action=payload.action,
                review_object_type=payload.review_object_type,
                review_object_id=payload.review_object_id,
            )

    def sweep_expired_tokens(self) -> int:
        with self._lock:
            expired = [token_id for token_id, token in self.telegram_action_tokens.items() if token.expires_at < _now() or token.consumed_at is not None]
            for token_id in expired:
                del self.telegram_action_tokens[token_id]
            return len(expired)

    def detect_suspicious_activity(self) -> list[FlagRecord]:
        with self._lock:
            generated: list[FlagRecord] = []
            blocked_domains = {"bit.ly", "tinyurl.com", "goo.gl", "malware.example"}
            for submission in self.resource_submissions.values():
                hostname = urlparse(str(submission.url)).hostname or ""
                if hostname in blocked_domains:
                    flag = FlagRecord(
                        subject_type=ReviewObjectType.resource_submission,
                        subject_id=submission.id,
                        severity="high",
                        reason=f"Suspicious domain: {hostname}",
                    )
                    self.flags[flag.id] = flag
                    generated.append(flag)
            rejected_by_user: dict[UUID, int] = {}
            for request in self.approval_requests.values():
                if request.status == ApprovalState.rejected:
                    rejected_by_user[request.user_id] = rejected_by_user.get(request.user_id, 0) + 1
            for user_id, count in rejected_by_user.items():
                if count >= 2:
                    flag = FlagRecord(
                        subject_type=ReviewObjectType.user_application,
                        subject_id=user_id,
                        severity="medium",
                        reason="Repeated rejected signup attempts",
                    )
                    self.flags[flag.id] = flag
                    generated.append(flag)
            return generated

    def queue_counts(self) -> QueueCounts:
        return QueueCounts(
            user_applications=len(self.list_pending_approval_requests().items),
            resource_submissions=len(self.list_resource_submissions(status=ApprovalState.pending).items),
            event_drafts=len(self.list_event_drafts_pending().items),
            flags=len(self.list_flags(status=FlagStatus.open).items),
        )

    def health(self) -> HealthResponse:
        approved_members = len([profile for profile in self.profiles.values() if profile.approval_status == ApprovalState.approved])
        pending_reviews = len([request for request in self.approval_requests.values() if request.status in {ApprovalState.pending, ApprovalState.needs_manual_review}])
        published_events = len(self.events)
        published_resources = len(self.resources)
        active_collabs = len([collab for collab in self.collab_projects.values() if collab.status == CollabStatus.active])
        return HealthResponse(
            approved_members=approved_members,
            pending_reviews=pending_reviews,
            published_events=published_events,
            published_resources=published_resources,
            active_collabs=active_collabs,
        )


def create_store(backend: str = "memory") -> InMemoryStore:
    if backend == "memory":
        return InMemoryStore()
    raise ValueError(f"Unknown store backend: {backend}")
