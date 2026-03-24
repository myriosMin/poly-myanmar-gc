from __future__ import annotations

import json
import time

from .jobs import WorkerEngine
from .settings import load_settings


def main() -> None:
    settings = load_settings()
    engine = WorkerEngine(settings)

    def run_cycle() -> None:
        report = engine.run_once()
        print(
            json.dumps(
                {
                    "started_at": report.started_at.isoformat(),
                    "finished_at": report.finished_at.isoformat() if report.finished_at else None,
                    "generated_drafts": len(report.generated_drafts),
                    "suspicious_flags": len(report.suspicious_flags),
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
