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
    telegram_chat_id: str | None = None
    source_feeds: list[str] = field(
        default_factory=lambda: [
            "https://www.imda.gov.sg/events",
            "https://www.singaporetech.edu.sg/events",
            "https://www.eventbrite.com/d/singapore/hackathon/",
        ]
    )


def load_settings() -> WorkerSettings:
    return WorkerSettings(
        interval_seconds=int(getenv("WORKER_INTERVAL_SECONDS", "3600")),
        timezone=getenv("EVENT_SOURCE_TIMEZONE", "Asia/Singapore"),
        mode=getenv("WORKER_MODE", "once"),
        api_base_url=getenv("WORKER_API_BASE_URL", getenv("API_BASE_URL", "http://localhost:8000")),
        actor_id=getenv(
            "WORKER_ACTOR_ID",
            getenv("DEFAULT_ACTOR_ID", "44444444-4444-4444-4444-444444444444"),
        ),
        telegram_chat_id=getenv("TELEGRAM_REVIEW_CHAT_ID"),
    )
