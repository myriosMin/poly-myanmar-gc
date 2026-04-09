from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING
from urllib.parse import urlparse
from uuid import UUID, uuid4

from .settings import WorkerSettings

if TYPE_CHECKING:
    from .api_client import ApiClient


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
    queued_review_messages: list[str] = field(default_factory=list)
    callback_actions_applied: int = 0
    callback_actions_failed: int = 0
    swept_consumed_tokens: int = 0
    swept_expired_tokens: int = 0
    expired_tokens_cleared: int = 0
    notifications_sent: int = 0


@dataclass(slots=True)
class ReviewQueueItem:
    review_object_type: str
    object_id: str
    created_at: str
    payload: dict[str, object]


@dataclass(slots=True)
class NotificationState:
    notified_keys: set[str] = field(default_factory=set)
    token_bindings: dict[str, dict[str, str]] = field(default_factory=dict)
    last_update_id: int | None = None

    @classmethod
    def load(cls, file_path: str) -> NotificationState:
        path = Path(file_path)
        if not path.exists():
            return cls()
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
            values = raw.get("notified_keys", [])
            token_bindings_raw = raw.get("token_bindings", {})
            last_update_id_raw = raw.get("last_update_id")

            token_bindings: dict[str, dict[str, str]] = {}
            if isinstance(token_bindings_raw, dict):
                for token_id, value in token_bindings_raw.items():
                    if not isinstance(token_id, str) or not isinstance(value, dict):
                        continue
                    review_object_type = value.get("review_object_type")
                    review_object_id = value.get("review_object_id")
                    action = value.get("action")
                    if (
                        isinstance(review_object_type, str)
                        and isinstance(review_object_id, str)
                        and isinstance(action, str)
                    ):
                        token_bindings[token_id] = {
                            "review_object_type": review_object_type,
                            "review_object_id": review_object_id,
                            "action": action,
                        }

            last_update_id = last_update_id_raw if isinstance(last_update_id_raw, int) else None

            if isinstance(values, list):
                return cls(
                    notified_keys={str(value) for value in values},
                    token_bindings=token_bindings,
                    last_update_id=last_update_id,
                )
        except (OSError, ValueError, TypeError):
            return cls()
        return cls()

    def save(self, file_path: str) -> None:
        path = Path(file_path)
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            payload = {
                "notified_keys": sorted(self.notified_keys),
                "token_bindings": self.token_bindings,
                "last_update_id": self.last_update_id,
            }
            path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        except OSError:
            return


class WorkerEngine:
    def __init__(self, settings: WorkerSettings, api_client: ApiClient | None = None) -> None:
        self.settings = settings
        self.api_client = api_client
        self._tokens = [
            {"id": uuid4(), "expires_at": datetime.now(UTC) - timedelta(minutes=5)},
            {"id": uuid4(), "expires_at": datetime.now(UTC) + timedelta(minutes=30)},
        ]
        self._notification_state = NotificationState.load(self.settings.state_path)

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

    def _flags_from_urls(self, urls: list[tuple[str, UUID | None]]) -> list[SuspiciousActivityFlag]:
        suspicious_domains = {"bit.ly", "tinyurl.com", "goo.gl"}
        trusted_domains = {"www.imda.gov.sg", "www.singaporetech.edu.sg"}
        flags: list[SuspiciousActivityFlag] = []
        for url, submission_id in urls:
            hostname = urlparse(url).hostname or ""
            if hostname in suspicious_domains:
                flags.append(
                    SuspiciousActivityFlag(
                        subject_type="resource_submission",
                        subject_id=submission_id or uuid4(),
                        severity="high",
                        reason=f"Suspicious event source: {hostname}",
                    )
                )
            elif hostname and hostname not in trusted_domains:
                flags.append(
                    SuspiciousActivityFlag(
                        subject_type="resource_submission",
                        subject_id=submission_id or uuid4(),
                        severity="medium",
                        reason=f"Unverified event source domain: {hostname}",
                    )
                )
        return flags

    def detect_suspicious_activity(self) -> list[SuspiciousActivityFlag]:
        if self.api_client is not None:
            submissions = self.api_client.list_resource_submissions()
            submission_urls: list[tuple[str, UUID | None]] = []
            for submission in submissions:
                url_value = submission.get("url")
                if not isinstance(url_value, str):
                    continue
                submission_id: UUID | None = None
                raw_id = submission.get("id")
                if isinstance(raw_id, str):
                    try:
                        submission_id = UUID(raw_id)
                    except ValueError:
                        submission_id = None
                submission_urls.append((url_value, submission_id))
            if submission_urls:
                return self._flags_from_urls(submission_urls)

        # Fallback for local/offline mode where API submissions are unavailable.
        return self._flags_from_urls([(feed, None) for feed in self.settings.source_feeds])

    def sweep_expired_tokens(self) -> int:
        before = len(self._tokens)
        now = datetime.now(UTC)
        self._tokens = [token for token in self._tokens if token["expires_at"] > now]
        return before - len(self._tokens)

    @staticmethod
    def _truncate(value: str | None, max_length: int = 96) -> str:
        if value is None:
            return "-"
        normalized = " ".join(str(value).split())
        if len(normalized) <= max_length:
            return normalized
        return f"{normalized[: max_length - 3]}..."

    @staticmethod
    def _format_created_at(value: object) -> str:
        if isinstance(value, str) and value.strip():
            return value
        return "1970-01-01T00:00:00+00:00"

    @staticmethod
    def _to_str(value: object) -> str:
        if value is None:
            return ""
        return str(value)

    def _normalize_review_item(self, review_object_type: str, item: dict[str, object]) -> ReviewQueueItem | None:
        raw_id = item.get("id")
        if raw_id is None:
            return None
        object_id = self._to_str(raw_id)
        if not object_id:
            return None
        created_at = self._format_created_at(item.get("created_at"))
        return ReviewQueueItem(
            review_object_type=review_object_type,
            object_id=object_id,
            created_at=created_at,
            payload=item,
        )

    def _list_review_queue(self) -> list[ReviewQueueItem]:
        if self.api_client is None:
            return []

        queue: list[ReviewQueueItem] = []
        sources = [
            ("user_application", self.api_client.list_pending_approval_requests(self.settings.review_page_size)),
            ("resource_submission", self.api_client.list_pending_resource_submissions(self.settings.review_page_size)),
            ("draft_event", self.api_client.list_pending_event_drafts(self.settings.review_page_size)),
            ("collab_flag", self.api_client.list_open_flags(self.settings.review_page_size)),
        ]
        for review_object_type, rows in sources:
            for row in rows:
                normalized = self._normalize_review_item(review_object_type, row)
                if normalized is not None:
                    queue.append(normalized)
        queue.sort(key=lambda item: (item.created_at, item.review_object_type, item.object_id))
        return queue

    @staticmethod
    def _action_hint(review_object_type: str) -> str:
        return " | ".join(WorkerEngine._actions_for_type(review_object_type))

    @staticmethod
    def _actions_for_type(review_object_type: str) -> list[str]:
        mapping = {
            "user_application": ["approve", "reject", "ban"],
            "resource_submission": ["approve", "reject"],
            "draft_event": ["approve", "reject"],
            "collab_flag": ["dismiss_flag", "ban"],
        }
        return mapping.get(review_object_type, ["approve", "reject"])

    @staticmethod
    def _action_label(action: str) -> str:
        mapping = {
            "approve": "Approve",
            "reject": "Reject",
            "ban": "Ban",
            "dismiss_flag": "Dismiss",
        }
        return mapping.get(action, action.title())

    @staticmethod
    def _short_type_code(review_object_type: str) -> str:
        mapping = {
            "user_application": "ua",
            "resource_submission": "rs",
            "draft_event": "de",
            "collab_flag": "cf",
        }
        return mapping.get(review_object_type, "xx")

    @staticmethod
    def _short_action_code(action: str) -> str:
        mapping = {
            "approve": "ap",
            "reject": "rj",
            "ban": "bn",
            "dismiss_flag": "ds",
        }
        return mapping.get(action, "xx")

    def _build_callback_data(self, token_id: str, item: ReviewQueueItem, action: str) -> str:
        return f"tk={token_id};t={self._short_type_code(item.review_object_type)};a={self._short_action_code(action)}"

    def _build_action_keyboard(self, item: ReviewQueueItem) -> dict[str, object] | None:
        if self.api_client is None:
            return None

        buttons: list[list[dict[str, str]]] = []
        for action in self._actions_for_type(item.review_object_type):
            token_id = self.api_client.create_telegram_action_token(
                review_object_type=item.review_object_type,
                review_object_id=item.object_id,
                action=action,
                ttl_seconds=self.settings.token_ttl_seconds,
            )
            if token_id is None:
                continue
            self._notification_state.token_bindings[token_id] = {
                "review_object_type": item.review_object_type,
                "review_object_id": item.object_id,
                "action": action,
            }
            buttons.append(
                [
                    {
                        "text": self._action_label(action),
                        "callback_data": self._build_callback_data(token_id, item, action),
                    }
                ]
            )

        if not buttons:
            return None
        return {"inline_keyboard": buttons}

    def _format_review_message(self, queue_item: ReviewQueueItem) -> str:
        payload = queue_item.payload
        if queue_item.review_object_type == "user_application":
            submitted = payload.get("submitted_payload")
            submitted_payload = submitted if isinstance(submitted, dict) else {}
            headline = self._truncate(self._to_str(submitted_payload.get("name") or submitted_payload.get("username") or payload.get("user_id")))
            details = self._truncate(self._to_str(submitted_payload.get("email") or payload.get("user_id")))
        elif queue_item.review_object_type == "resource_submission":
            headline = self._truncate(self._to_str(payload.get("title")))
            details = self._truncate(self._to_str(payload.get("url")))
        elif queue_item.review_object_type == "draft_event":
            headline = self._truncate(self._to_str(payload.get("title")))
            details = self._truncate(self._to_str(payload.get("source_name") or payload.get("source_url")))
        else:
            headline = self._truncate(self._to_str(payload.get("reason")))
            details = self._truncate(self._to_str(payload.get("severity")))

        lines = [
            "[Poly Network Review Queue]",
            f"type={queue_item.review_object_type}",
            f"id={queue_item.object_id}",
            f"created_at={queue_item.created_at}",
            f"headline={headline}",
            f"details={details}",
            f"actions={self._action_hint(queue_item.review_object_type)}",
        ]
        return "\n".join(lines)

    def _send_review_notifications(self) -> list[str]:
        if (
            self.api_client is None
            or not self.settings.telegram_enabled
            or not self.settings.telegram_bot_token
            or not self.settings.telegram_chat_id
        ):
            return []

        queued_messages: list[str] = []
        sent = 0
        for item in self._list_review_queue():
            notify_key = f"{item.review_object_type}:{item.object_id}"
            if notify_key in self._notification_state.notified_keys:
                continue
            if sent >= self.settings.max_notifications_per_cycle:
                break

            message = self._format_review_message(item)
            reply_markup = self._build_action_keyboard(item)
            if reply_markup is None:
                continue
            if self.api_client.send_telegram_message(
                bot_token=self.settings.telegram_bot_token,
                chat_id=self.settings.telegram_chat_id,
                text=message,
                reply_markup=reply_markup,
            ):
                queued_messages.append(message)
                self._notification_state.notified_keys.add(notify_key)
                sent += 1

        self._notification_state.save(self.settings.state_path)
        return queued_messages

    @staticmethod
    def _parse_callback_data(value: str) -> dict[str, str]:
        parts = [part for part in value.split(";") if "=" in part]
        parsed: dict[str, str] = {}
        for part in parts:
            key, raw_value = part.split("=", 1)
            parsed[key.strip()] = raw_value.strip()
        return parsed

    def _process_telegram_callbacks(self) -> tuple[int, int]:
        if self.api_client is None or not self.settings.telegram_enabled or not self.settings.telegram_bot_token:
            return 0, 0

        next_offset = (
            self._notification_state.last_update_id + 1
            if self._notification_state.last_update_id is not None
            else None
        )
        updates = self.api_client.list_telegram_updates(self.settings.telegram_bot_token, offset=next_offset)
        if not updates:
            return 0, 0

        applied = 0
        failed = 0
        highest_update_id = self._notification_state.last_update_id

        for update in updates:
            update_id = update.get("update_id")
            if isinstance(update_id, int):
                highest_update_id = update_id if highest_update_id is None else max(highest_update_id, update_id)

            callback = update.get("callback_query")
            if not isinstance(callback, dict):
                continue

            callback_id = callback.get("id")
            callback_data = callback.get("data")
            from_payload = callback.get("from")
            telegram_user_id = from_payload.get("id") if isinstance(from_payload, dict) else None
            telegram_user_id_value = telegram_user_id if isinstance(telegram_user_id, int) else None

            if not isinstance(callback_id, str) or not isinstance(callback_data, str):
                failed += 1
                continue

            parsed = self._parse_callback_data(callback_data)
            token_id = parsed.get("tk")
            if token_id is None:
                self.api_client.answer_telegram_callback(
                    self.settings.telegram_bot_token,
                    callback_id,
                    "Invalid action payload",
                )
                failed += 1
                continue

            binding = self._notification_state.token_bindings.get(token_id)
            if binding is None:
                self.api_client.answer_telegram_callback(
                    self.settings.telegram_bot_token,
                    callback_id,
                    "Action token expired or unknown",
                )
                failed += 1
                continue

            success, message = self.api_client.apply_telegram_webhook(
                action_token=token_id,
                review_object_type=binding["review_object_type"],
                review_object_id=binding["review_object_id"],
                action=binding["action"],
                telegram_user_id=telegram_user_id_value,
            )
            if success:
                applied += 1
                self._notification_state.token_bindings.pop(token_id, None)
                callback_text = (
                    f"Applied {binding['action']} on {binding['review_object_type']}"
                )
            else:
                failed += 1
                callback_text = f"Failed: {self._truncate(message, max_length=64)}"

            self.api_client.answer_telegram_callback(
                self.settings.telegram_bot_token,
                callback_id,
                callback_text,
            )

        self._notification_state.last_update_id = highest_update_id
        self._notification_state.save(self.settings.state_path)
        return applied, failed

    def run_once(self) -> WorkerReport:
        report = WorkerReport(started_at=datetime.now(UTC))
        report.generated_drafts = self.source_weekly_events()
        report.suspicious_flags = self.detect_suspicious_activity()

        if self.api_client is not None:
            applied, failed = self._process_telegram_callbacks()
            report.callback_actions_applied = applied
            report.callback_actions_failed = failed
            for draft in report.generated_drafts:
                self.api_client.push_event_draft(draft)
            for flag in report.suspicious_flags:
                self.api_client.push_flag(flag)
            report.queued_review_messages = self._send_review_notifications()

            sweep = self.api_client.sweep_telegram_action_tokens()
            if sweep is not None:
                report.swept_consumed_tokens = sweep["consumed_removed"]
                report.swept_expired_tokens = sweep["expired_removed"]

        report.expired_tokens_cleared = self.sweep_expired_tokens()
        report.notifications_sent = (
            len(report.generated_drafts)
            + len(report.suspicious_flags)
            + len(report.queued_review_messages)
            + report.callback_actions_applied
        )
        report.finished_at = datetime.now(UTC)
        return report
