from __future__ import annotations

import logging

import httpx

from .jobs import DraftEventSuggestion, SuspiciousActivityFlag

logger = logging.getLogger(__name__)


class ApiClient:
    def __init__(self, base_url: str, actor_id: str, timeout_seconds: float = 5.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.actor_id = actor_id
        self.timeout_seconds = timeout_seconds

    def push_event_draft(self, draft: DraftEventSuggestion) -> None:
        payload = {
            "id": str(draft.id),
            "title": draft.title,
            "kind": draft.kind,
            "description": f"Worker-sourced draft from {draft.source_name}",
            "location": draft.location,
            "starts_at": draft.starts_at.isoformat(),
            "source_url": draft.source_url,
            "source_name": draft.source_name,
            "source_confidence": draft.confidence,
        }
        self._post("/admin/event-drafts", payload)

    def push_flag(self, flag: SuspiciousActivityFlag) -> None:
        payload = {
            "id": str(flag.id),
            "subject_type": flag.subject_type,
            "subject_id": str(flag.subject_id),
            "severity": flag.severity,
            "reason": flag.reason,
            "created_at": flag.created_at.isoformat(),
        }
        self._post("/admin/flags", payload)

    def list_resource_submissions(self) -> list[dict[str, object]]:
        page = 1
        page_size = 100
        items: list[dict[str, object]] = []
        while True:
            payload = self._get_json(
                "/admin/resources/submissions",
                params={"page": page, "page_size": page_size},
            )
            if payload is None:
                return []
            page_items = payload.get("items", [])
            if not isinstance(page_items, list):
                logger.warning("Worker API returned invalid submissions payload on page %s", page)
                return items
            items.extend(item for item in page_items if isinstance(item, dict))

            total = payload.get("total")
            if not isinstance(total, int):
                break
            if page * page_size >= total:
                break
            page += 1
        return items

    def _post(self, path: str, payload: dict[str, object]) -> None:
        try:
            response = httpx.post(
                f"{self.base_url}{path}",
                headers={"X-Actor-Id": self.actor_id},
                json=payload,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("Worker API push failed for %s: %s", path, exc)

    def _get_json(self, path: str, params: dict[str, int]) -> dict[str, object] | None:
        try:
            response = httpx.get(
                f"{self.base_url}{path}",
                headers={"X-Actor-Id": self.actor_id},
                params=params,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, dict):
                return payload
            logger.warning("Worker API returned non-object JSON for %s", path)
            return None
        except (ValueError, httpx.HTTPError) as exc:
            logger.warning("Worker API read failed for %s: %s", path, exc)
            return None
