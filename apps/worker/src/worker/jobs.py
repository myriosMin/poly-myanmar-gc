from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from urllib.parse import urlparse
from uuid import UUID, uuid4

from .settings import WorkerSettings


@dataclass(slots=True)
class DraftEventSuggestion:
    id: UUID = field(default_factory=uuid4)
    title: str = ""
    kind: str = ""
    location: str = ""
    source_url: str = ""
    starts_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    confidence: int = 50
    source_name: str = "worker"


@dataclass(slots=True)
class SuspiciousActivityFlag:
    id: UUID = field(default_factory=uuid4)
    subject_type: str = "resource_submission"
    subject_id: UUID = field(default_factory=uuid4)
    severity: str = "medium"
    reason: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass(slots=True)
class WorkerReport:
    started_at: datetime
    finished_at: datetime | None = None
    generated_drafts: list[DraftEventSuggestion] = field(default_factory=list)
    suspicious_flags: list[SuspiciousActivityFlag] = field(default_factory=list)
    expired_tokens_cleared: int = 0
    notifications_sent: int = 0


class WorkerEngine:
    def __init__(self, settings: WorkerSettings) -> None:
        self.settings = settings
        self._tokens = [
            {"id": uuid4(), "expires_at": datetime.now(UTC) - timedelta(minutes=5)},
            {"id": uuid4(), "expires_at": datetime.now(UTC) + timedelta(minutes=30)},
        ]

    def source_weekly_events(self) -> list[DraftEventSuggestion]:
        suggestions: list[DraftEventSuggestion] = []
        for index, source_url in enumerate(self.settings.source_feeds, start=1):
            parsed = urlparse(source_url)
            title = f"Singapore Career and Hackathon Radar {index}"
            suggestions.append(
                DraftEventSuggestion(
                    title=title,
                    kind="career_fair" if "events" in parsed.path else "hackathon",
                    location="Singapore",
                    source_url=source_url,
                    starts_at=datetime.now(UTC) + timedelta(days=7 * index),
                    confidence=80 if "event" in source_url else 65,
                    source_name=parsed.netloc or "worker",
                )
            )
        return suggestions

    def detect_suspicious_activity(self) -> list[SuspiciousActivityFlag]:
        suspicious_domains = {"bit.ly", "tinyurl.com", "goo.gl"}
        samples = [
            ("resource_submission", uuid4(), "medium", "Repeated rejected submissions from the same member"),
            ("collab_flag", uuid4(), "high", "Burst of removals tied to one listing"),
        ]
        flags = [SuspiciousActivityFlag(subject_type=s_type, subject_id=s_id, severity=severity, reason=reason) for s_type, s_id, severity, reason in samples]
        for feed in self.settings.source_feeds:
            hostname = urlparse(feed).hostname or ""
            if hostname in suspicious_domains:
                flags.append(
                    SuspiciousActivityFlag(
                        subject_type="resource_submission",
                        severity="high",
                        reason=f"Suspicious event source: {hostname}",
                    )
                )
        return flags

    def sweep_expired_tokens(self) -> int:
        before = len(self._tokens)
        now = datetime.now(UTC)
        self._tokens = [token for token in self._tokens if token["expires_at"] > now]
        return before - len(self._tokens)

    def run_once(self) -> WorkerReport:
        report = WorkerReport(started_at=datetime.now(UTC))
        report.generated_drafts = self.source_weekly_events()
        report.suspicious_flags = self.detect_suspicious_activity()
        report.expired_tokens_cleared = self.sweep_expired_tokens()
        report.notifications_sent = len(report.generated_drafts) + len(report.suspicious_flags)
        report.finished_at = datetime.now(UTC)
        return report
