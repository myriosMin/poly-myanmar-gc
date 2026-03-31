from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import sys

import httpx

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from worker.api_client import ApiClient
from worker.jobs import ReviewQueueItem, WorkerEngine
from worker.settings import WorkerSettings


class FakeCallbackApiClient:
    def __init__(self) -> None:
        self.apply_calls: list[dict[str, object]] = []
        self.answer_calls: list[tuple[str, str, str]] = []

    def list_telegram_updates(self, bot_token: str, offset: int | None = None) -> list[dict[str, object]]:
        return [
            {
                "update_id": 1001,
                "callback_query": {
                    "id": "cb-1",
                    "data": "tk=token-1;t=ua;a=ap",
                    "from": {"id": 123456},
                },
            }
        ]

    def apply_telegram_webhook(
        self,
        *,
        action_token: str,
        review_object_type: str,
        review_object_id: str,
        action: str,
        telegram_user_id: int | None,
    ) -> tuple[bool, str]:
        self.apply_calls.append(
            {
                "action_token": action_token,
                "review_object_type": review_object_type,
                "review_object_id": review_object_id,
                "action": action,
                "telegram_user_id": telegram_user_id,
            }
        )
        return True, "Action applied"

    def answer_telegram_callback(self, bot_token: str, callback_query_id: str, text: str) -> None:
        self.answer_calls.append((bot_token, callback_query_id, text))


class WorkerPhaseFiveTests(unittest.TestCase):
    def _settings(self, state_path: str) -> WorkerSettings:
        return WorkerSettings(
            telegram_enabled=True,
            telegram_bot_token="token",
            telegram_chat_id="chat",
            state_path=state_path,
        )

    def test_deterministic_review_message_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            state_path = str(Path(temp_dir) / "state.json")
            engine = WorkerEngine(self._settings(state_path), api_client=None)
            item = ReviewQueueItem(
                review_object_type="resource_submission",
                object_id="11111111-1111-1111-1111-111111111111",
                created_at="2026-04-01T00:00:00+00:00",
                payload={
                    "title": "Backend Fundamentals Notes",
                    "url": "https://example.com/notes",
                },
            )

            first = engine._format_review_message(item)
            second = engine._format_review_message(item)

            expected = "\n".join(
                [
                    "[Poly Network Review Queue]",
                    "type=resource_submission",
                    "id=11111111-1111-1111-1111-111111111111",
                    "created_at=2026-04-01T00:00:00+00:00",
                    "headline=Backend Fundamentals Notes",
                    "details=https://example.com/notes",
                    "actions=approve | reject",
                ]
            )
            self.assertEqual(first, expected)
            self.assertEqual(second, expected)

    def test_callback_processing_dispatches_webhook_and_feedback(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            state_path = str(Path(temp_dir) / "state.json")
            api_client = FakeCallbackApiClient()
            engine = WorkerEngine(self._settings(state_path), api_client=api_client)
            engine._notification_state.token_bindings = {
                "token-1": {
                    "review_object_type": "user_application",
                    "review_object_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                    "action": "approve",
                }
            }

            applied, failed = engine._process_telegram_callbacks()

            self.assertEqual(applied, 1)
            self.assertEqual(failed, 0)
            self.assertEqual(engine._notification_state.last_update_id, 1001)
            self.assertNotIn("token-1", engine._notification_state.token_bindings)
            self.assertEqual(len(api_client.apply_calls), 1)
            self.assertEqual(
                api_client.apply_calls[0],
                {
                    "action_token": "token-1",
                    "review_object_type": "user_application",
                    "review_object_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                    "action": "approve",
                    "telegram_user_id": 123456,
                },
            )
            self.assertEqual(api_client.answer_calls[0][1], "cb-1")
            self.assertIn("Applied approve on user_application", api_client.answer_calls[0][2])


class ApiClientRetryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = ApiClient(
            base_url="http://localhost:8000",
            actor_id="44444444-4444-4444-4444-444444444444",
            retry_attempts=3,
            retry_backoff_seconds=0.01,
        )

    def test_request_retry_skips_retries_for_4xx(self) -> None:
        request = httpx.Request("GET", "https://example.com")
        response = httpx.Response(400, request=request)
        error = httpx.HTTPStatusError("bad request", request=request, response=response)

        with patch("worker.api_client.httpx.request", side_effect=error) as request_mock:
            with patch("worker.api_client.time.sleep") as sleep_mock:
                result = self.client._request_with_retry(
                    "get",
                    "https://example.com",
                    context="test",
                    timeout=1,
                )

        self.assertIsNone(result)
        self.assertEqual(request_mock.call_count, 1)
        sleep_mock.assert_not_called()

    def test_request_retry_retries_on_5xx_then_succeeds(self) -> None:
        request = httpx.Request("GET", "https://example.com")
        server_error_response = httpx.Response(503, request=request)
        server_error = httpx.HTTPStatusError("unavailable", request=request, response=server_error_response)
        ok_response = httpx.Response(200, request=request, json={"ok": True})

        with patch("worker.api_client.httpx.request", side_effect=[server_error, ok_response]) as request_mock:
            with patch("worker.api_client.time.sleep") as sleep_mock:
                result = self.client._request_with_retry(
                    "get",
                    "https://example.com",
                    context="test",
                    timeout=1,
                )

        self.assertIsNotNone(result)
        self.assertEqual(request_mock.call_count, 2)
        sleep_mock.assert_called_once()


if __name__ == "__main__":
    unittest.main()
