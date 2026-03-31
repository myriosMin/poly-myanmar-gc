from __future__ import annotations

from dataclasses import dataclass, field
from os import getenv


@dataclass(slots=True)
class WorkerSettings:
    interval_seconds: int = 3600
    timezone: str = "Asia/Singapore"
    mode: str = "once"
    api_base_url: str = "http://localhost:8000"
    actor_id: str = "44444444-4444-4444-4444-444444444444"
    telegram_enabled: bool = False
    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None
    review_page_size: int = 20
    max_notifications_per_cycle: int = 20
    token_ttl_seconds: int = 7200
    request_retry_attempts: int = 3
    request_retry_backoff_seconds: float = 0.4
    state_path: str = ".worker-state.json"
    source_feeds: list[str] = field(
        default_factory=lambda: [
            "https://www.imda.gov.sg/events",
            "https://www.singaporetech.edu.sg/events",
            "https://www.eventbrite.com/d/singapore/hackathon/",
        ]
    )


def load_settings() -> WorkerSettings:
    telegram_enabled = getenv("WORKER_TELEGRAM_ENABLED", "false").lower() in {"1", "true", "yes", "on"}
    return WorkerSettings(
        interval_seconds=int(getenv("WORKER_INTERVAL_SECONDS", "3600")),
        timezone=getenv("EVENT_SOURCE_TIMEZONE", "Asia/Singapore"),
        mode=getenv("WORKER_MODE", "once"),
        api_base_url=getenv("WORKER_API_BASE_URL", getenv("API_BASE_URL", "http://localhost:8000")),
        actor_id=getenv(
            "WORKER_ACTOR_ID",
            getenv("DEFAULT_ACTOR_ID", "44444444-4444-4444-4444-444444444444"),
        ),
        telegram_enabled=telegram_enabled,
        telegram_bot_token=getenv("WORKER_TELEGRAM_BOT_TOKEN", getenv("TELEGRAM_BOT_TOKEN")),
        telegram_chat_id=getenv("TELEGRAM_REVIEW_CHAT_ID"),
        review_page_size=int(getenv("WORKER_REVIEW_PAGE_SIZE", "20")),
        max_notifications_per_cycle=int(getenv("WORKER_MAX_NOTIFICATIONS_PER_CYCLE", "20")),
        token_ttl_seconds=int(getenv("WORKER_TOKEN_TTL_SECONDS", "7200")),
        request_retry_attempts=max(1, int(getenv("WORKER_REQUEST_RETRY_ATTEMPTS", "3"))),
        request_retry_backoff_seconds=max(0.0, float(getenv("WORKER_REQUEST_RETRY_BACKOFF_SECONDS", "0.4"))),
        state_path=getenv("WORKER_STATE_PATH", ".worker-state.json"),
    )
