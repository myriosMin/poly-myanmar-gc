from __future__ import annotations

import json
import time

from .api_client import ApiClient
from .jobs import WorkerEngine
from .settings import load_settings


def main() -> None:
    settings = load_settings()
    api_client = ApiClient(
        settings.api_base_url,
        settings.actor_id,
        retry_attempts=settings.request_retry_attempts,
        retry_backoff_seconds=settings.request_retry_backoff_seconds,
    )
    engine = WorkerEngine(settings, api_client=api_client)

    def run_cycle() -> None:
        report = engine.run_once()
        print(
            json.dumps(
                {
                    "started_at": report.started_at.isoformat(),
                    "finished_at": report.finished_at.isoformat() if report.finished_at else None,
                    "generated_drafts": len(report.generated_drafts),
                    "suspicious_flags": len(report.suspicious_flags),
                    "queued_review_messages": len(report.queued_review_messages),
                    "callback_actions_applied": report.callback_actions_applied,
                    "callback_actions_failed": report.callback_actions_failed,
                    "swept_consumed_tokens": report.swept_consumed_tokens,
                    "swept_expired_tokens": report.swept_expired_tokens,
                    "expired_tokens_cleared": report.expired_tokens_cleared,
                    "notifications_sent": report.notifications_sent,
                },
                indent=2,
            )
        )

    if settings.mode == "loop":
        while True:
            run_cycle()
            time.sleep(settings.interval_seconds)
    else:
        run_cycle()


if __name__ == "__main__":
    main()
