from __future__ import annotations

import logging
import time
from uuid import UUID

import httpx

from .jobs import DraftEventSuggestion, SuspiciousActivityFlag

logger = logging.getLogger(__name__)


class ApiClient:
    def __init__(
        self,
        base_url: str,
        actor_id: str,
        timeout_seconds: float = 5.0,
        retry_attempts: int = 3,
        retry_backoff_seconds: float = 0.4,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.actor_id = actor_id
        self.timeout_seconds = timeout_seconds
        self.retry_attempts = max(1, retry_attempts)
        self.retry_backoff_seconds = max(0.0, retry_backoff_seconds)

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
        return self._list_paginated("/admin/resources/submissions", page_size=100)

    def list_pending_approval_requests(self, page_size: int = 20) -> list[dict[str, object]]:
        return self._list_paginated("/admin/approvals", page_size=page_size)

    def list_pending_resource_submissions(self, page_size: int = 20) -> list[dict[str, object]]:
        return self._list_paginated("/admin/resources/submissions", page_size=page_size)

    def list_pending_event_drafts(self, page_size: int = 20) -> list[dict[str, object]]:
        return self._list_paginated("/admin/event-drafts", page_size=page_size)

    def list_open_flags(self, page_size: int = 20) -> list[dict[str, object]]:
        return self._list_paginated("/admin/flags", page_size=page_size)

    def sweep_telegram_action_tokens(self) -> dict[str, int] | None:
        response = self._post_json("/telegram/tokens/sweep", {})
        if response is None:
            return None
        consumed_removed = response.get("consumed_removed")
        expired_removed = response.get("expired_removed")
        total_removed = response.get("total_removed")
        if not all(isinstance(value, int) for value in (consumed_removed, expired_removed, total_removed)):
            return None
        return {
            "consumed_removed": consumed_removed,
            "expired_removed": expired_removed,
            "total_removed": total_removed,
        }

    def create_telegram_action_token(
        self,
        review_object_type: str,
        review_object_id: str,
        action: str,
        *,
        ttl_seconds: int,
        actor_telegram_id: int | None = None,
        payload: dict[str, object] | None = None,
    ) -> str | None:
        request_payload: dict[str, object] = {
            "review_object_type": review_object_type,
            "review_object_id": review_object_id,
            "action": action,
            "ttl_seconds": ttl_seconds,
            "payload": payload or {},
        }
        if actor_telegram_id is not None:
            request_payload["actor_telegram_id"] = actor_telegram_id

        response = self._post_json("/telegram/tokens", request_payload)
        if response is None:
            return None
        token_id = response.get("id")
        if not isinstance(token_id, str):
            return None
        try:
            UUID(token_id)
        except ValueError:
            return None
        return token_id

    def send_telegram_message(
        self,
        bot_token: str,
        chat_id: str,
        text: str,
        *,
        reply_markup: dict[str, object] | None = None,
    ) -> bool:
        endpoint = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload: dict[str, object] = {
            "chat_id": chat_id,
            "text": text,
            "disable_web_page_preview": True,
        }
        if reply_markup is not None:
            payload["reply_markup"] = reply_markup
        response = self._request_with_retry(
            "post",
            endpoint,
            json=payload,
            timeout=self.timeout_seconds,
            context="Worker Telegram send failed",
        )
        return response is not None

    def list_telegram_updates(self, bot_token: str, offset: int | None = None) -> list[dict[str, object]]:
        endpoint = f"https://api.telegram.org/bot{bot_token}/getUpdates"
        payload: dict[str, object] = {"timeout": 0}
        if offset is not None:
            payload["offset"] = offset
        response = self._request_with_retry(
            "post",
            endpoint,
            json=payload,
            timeout=self.timeout_seconds,
            context="Worker Telegram getUpdates failed",
        )
        if response is None:
            return []
        try:
            body = response.json()
            if not isinstance(body, dict) or body.get("ok") is not True:
                return []
            result = body.get("result")
            if not isinstance(result, list):
                return []
            return [item for item in result if isinstance(item, dict)]
        except ValueError as exc:
            logger.warning("Worker Telegram getUpdates returned invalid JSON: %s", exc)
            return []

    def answer_telegram_callback(self, bot_token: str, callback_query_id: str, text: str) -> None:
        endpoint = f"https://api.telegram.org/bot{bot_token}/answerCallbackQuery"
        payload: dict[str, object] = {
            "callback_query_id": callback_query_id,
            "text": text,
            "show_alert": False,
        }
        self._request_with_retry(
            "post",
            endpoint,
            json=payload,
            timeout=self.timeout_seconds,
            context="Worker Telegram answerCallbackQuery failed",
        )

    def apply_telegram_webhook(
        self,
        *,
        action_token: str,
        review_object_type: str,
        review_object_id: str,
        action: str,
        telegram_user_id: int | None,
    ) -> tuple[bool, str]:
        payload: dict[str, object] = {
            "action_token": action_token,
            "review_object_type": review_object_type,
            "review_object_id": review_object_id,
            "action": action,
            "telegram_user_id": telegram_user_id,
        }
        last_error: str = "Request failed"
        for attempt in range(1, self.retry_attempts + 1):
            try:
                response = httpx.post(
                    f"{self.base_url}/telegram/webhook",
                    headers={"X-Actor-Id": self.actor_id},
                    json=payload,
                    timeout=self.timeout_seconds,
                )
                response.raise_for_status()
                data = response.json()
                if isinstance(data, dict):
                    message = data.get("message")
                    if isinstance(message, str) and message.strip():
                        return True, message
                return True, "Action applied"
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                detail = "Request failed"
                try:
                    data = exc.response.json()
                    if isinstance(data, dict):
                        raw_detail = data.get("detail")
                        if isinstance(raw_detail, str) and raw_detail.strip():
                            detail = raw_detail
                except ValueError:
                    detail = str(exc)

                if 500 <= status_code <= 599 and attempt < self.retry_attempts:
                    time.sleep(self.retry_backoff_seconds)
                    last_error = detail
                    continue
                return False, detail
            except (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout) as exc:
                last_error = str(exc)
                if attempt < self.retry_attempts:
                    time.sleep(self.retry_backoff_seconds)
                    continue
                return False, last_error
            except (ValueError, httpx.HTTPError) as exc:
                return False, str(exc)
        return False, last_error

    def _list_paginated(self, path: str, page_size: int) -> list[dict[str, object]]:
        page = 1
        items: list[dict[str, object]] = []
        while True:
            payload = self._get_json(
                path,
                params={"page": page, "page_size": page_size},
            )
            if payload is None:
                return []
            page_items = payload.get("items", [])
            if not isinstance(page_items, list):
                logger.warning("Worker API returned invalid payload for %s on page %s", path, page)
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
        self._post_json(path, payload)

    def _post_json(self, path: str, payload: dict[str, object]) -> dict[str, object] | None:
        response = self._request_with_retry(
            "post",
            f"{self.base_url}{path}",
            headers={"X-Actor-Id": self.actor_id},
            json=payload,
            timeout=self.timeout_seconds,
            context=f"Worker API push failed for {path}",
        )
        if response is None:
            return None
        try:
            data = response.json()
            if isinstance(data, dict):
                return data
            return {}
        except ValueError as exc:
            logger.warning("Worker API push returned non-JSON for %s: %s", path, exc)
            return None

    def _get_json(self, path: str, params: dict[str, int]) -> dict[str, object] | None:
        response = self._request_with_retry(
            "get",
            f"{self.base_url}{path}",
            headers={"X-Actor-Id": self.actor_id},
            params=params,
            timeout=self.timeout_seconds,
            context=f"Worker API read failed for {path}",
        )
        if response is None:
            return None
        try:
            payload = response.json()
            if isinstance(payload, dict):
                return payload
            logger.warning("Worker API returned non-object JSON for %s", path)
            return None
        except ValueError as exc:
            logger.warning("Worker API read returned invalid JSON for %s: %s", path, exc)
            return None

    def _request_with_retry(
        self,
        method: str,
        url: str,
        *,
        context: str,
        **kwargs: object,
    ) -> httpx.Response | None:
        last_exc: Exception | None = None
        for attempt in range(1, self.retry_attempts + 1):
            try:
                response = httpx.request(method=method.upper(), url=url, **kwargs)
                response.raise_for_status()
                return response
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                if 500 <= status_code <= 599 and attempt < self.retry_attempts:
                    time.sleep(self.retry_backoff_seconds)
                    continue
                logger.warning("%s: %s", context, exc)
                return None
            except (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout) as exc:
                last_exc = exc
                if attempt < self.retry_attempts:
                    time.sleep(self.retry_backoff_seconds)
                    continue
                break
            except httpx.HTTPError as exc:
                logger.warning("%s: %s", context, exc)
                return None
        if last_exc is not None:
            logger.warning("%s: %s", context, last_exc)
        return None
