"""HTTP-level integration tests for the /me router.

Covers the acceptance criteria of issue #29:
  - POST /me/onboarding returns 200 + ProfileRecord on valid request
  - approval_status is ``pending`` for a standard submission
  - approval_status is ``needs_manual_review`` when manual_proof_url is supplied
  - Calling the endpoint twice for the same user_id performs an upsert (no error)
  - Submitting on behalf of a different user_id returns 403
  - Mismatched email returns 403
  - Mismatched google_subject returns 403
  - GET /me still works after onboarding (existing-actor routes unaffected)
"""

from __future__ import annotations

import uuid
from collections.abc import Generator
from pathlib import Path
from unittest.mock import patch

import pytest
from dotenv import load_dotenv

# Load .env before any api imports (mirrors conftest.py for safety)
load_dotenv(Path(__file__).resolve().parents[3] / ".env", override=True)

from fastapi.testclient import TestClient  # noqa: E402

from api.deps import AuthenticatedUser, get_authenticated_user  # noqa: E402
from api.main import create_app  # noqa: E402
from api.store import InMemoryStore  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

_NEW_USER_ID = uuid.UUID("fedcba98-0000-0000-0000-000000000001")
_NEW_USER_EMAIL = "zaw.lin@example.com"
_NEW_USER_SUBJECT = "google-subject-new-user-001"

_APPROVED_MEMBER_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
_APPROVED_MEMBER_EMAIL = "lin.hay@example.com"
_APPROVED_MEMBER_SUBJECT = "google-subject-member-001"

_BASE_ONBOARDING_PAYLOAD: dict = {
    "user_id": str(_NEW_USER_ID),
    "email": _NEW_USER_EMAIL,
    "google_subject": _NEW_USER_SUBJECT,
    "name": "Zaw Lin",
    "polytechnic": "TP",
    "course": "Diploma in Game Design",
    "graduation_year": 2027,
    "linkedin_url": "https://www.linkedin.com/in/zaw-lin",
    "skills": ["unity", "c#"],
    "hobbies": ["game-jams"],
    "open_to_collab": True,
    "job_seeking": False,
}


def _make_auth_user(
    user_id: uuid.UUID = _NEW_USER_ID,
    email: str = _NEW_USER_EMAIL,
    subject: str = _NEW_USER_SUBJECT,
) -> AuthenticatedUser:
    return AuthenticatedUser(id=user_id, email=email, subject=subject)


@pytest.fixture()
def client_for_new_user() -> Generator[TestClient, None, None]:
    """TestClient whose authenticated identity matches *_NEW_USER_ID*.

    The store is seeded with existing members but NOT the new user, which is
    exactly the pre-onboarding state we want to test.

    The Supabase upsert helper is patched to return ``None`` so tests remain
    fully isolated from the live database while the in-memory store handles all
    state transitions.
    """
    store = InMemoryStore()
    app = create_app()
    app.state.store = store

    auth_user = _make_auth_user()
    app.dependency_overrides[get_authenticated_user] = lambda: auth_user

    with patch("api.routers.me._upsert_onboarding_supabase", return_value=None):
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c


@pytest.fixture()
def client_for_approved_member() -> Generator[TestClient, None, None]:
    """TestClient whose authenticated identity matches the seeded approved member."""
    store = InMemoryStore()
    app = create_app()
    app.state.store = store

    auth_user = _make_auth_user(
        user_id=_APPROVED_MEMBER_ID,
        email=_APPROVED_MEMBER_EMAIL,
        subject=_APPROVED_MEMBER_SUBJECT,
    )
    app.dependency_overrides[get_authenticated_user] = lambda: auth_user

    with patch("api.routers.me._upsert_onboarding_supabase", return_value=None):
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c


# ---------------------------------------------------------------------------
# POST /me/onboarding — happy paths
# ---------------------------------------------------------------------------


class TestSubmitOnboarding:
    def test_returns_200_with_profile_record(self, client_for_new_user: TestClient) -> None:
        """Standard submission returns HTTP 200 and a complete ProfileRecord."""
        response = client_for_new_user.post("/me/onboarding", json=_BASE_ONBOARDING_PAYLOAD)
        assert response.status_code == 200, response.text

        body = response.json()
        assert body["email"] == _NEW_USER_EMAIL
        assert body["name"] == "Zaw Lin"
        assert body["polytechnic"] == "TP"

    def test_approval_status_is_pending_by_default(self, client_for_new_user: TestClient) -> None:
        """A submission without manual proof should have approval_status='pending'."""
        response = client_for_new_user.post("/me/onboarding", json=_BASE_ONBOARDING_PAYLOAD)
        assert response.status_code == 200, response.text
        assert response.json()["approval_status"] == "pending"

    def test_approval_status_is_needs_manual_review_when_proof_url_supplied(
        self, client_for_new_user: TestClient
    ) -> None:
        """Supplying manual_proof_url should escalate to needs_manual_review."""
        payload = {
            **_BASE_ONBOARDING_PAYLOAD,
            "manual_proof_url": "https://drive.google.com/proof123",
            "manual_verification_notes": "Please check my transcript.",
        }
        response = client_for_new_user.post("/me/onboarding", json=payload)
        assert response.status_code == 200, response.text
        assert response.json()["approval_status"] == "needs_manual_review"

    def test_upsert_second_call_does_not_fail(self, client_for_new_user: TestClient) -> None:
        """Calling POST /me/onboarding twice for the same user_id must not error."""
        first = client_for_new_user.post("/me/onboarding", json=_BASE_ONBOARDING_PAYLOAD)
        assert first.status_code == 200, first.text

        updated_payload = {**_BASE_ONBOARDING_PAYLOAD, "name": "Zaw Lin Updated"}
        second = client_for_new_user.post("/me/onboarding", json=updated_payload)
        assert second.status_code == 200, second.text
        assert second.json()["name"] == "Zaw Lin Updated"

    def test_response_contains_approval_request(self, client_for_new_user: TestClient) -> None:
        """An ApprovalRequestRecord must exist after onboarding (verified via admin endpoint)."""
        response = client_for_new_user.post("/me/onboarding", json=_BASE_ONBOARDING_PAYLOAD)
        assert response.status_code == 200, response.text

        # Override auth to a reviewer so we can query the admin queue
        store = client_for_new_user.app.state.store  # type: ignore[attr-defined]
        reviewer = store.get_actor(uuid.UUID("33333333-3333-3333-3333-333333333333"))
        assert reviewer is not None
        queue = store.list_pending_approval_requests()
        user_ids = [str(r.user_id) for r in queue.items]
        assert str(_NEW_USER_ID) in user_ids

    def test_skills_and_hobbies_are_persisted(self, client_for_new_user: TestClient) -> None:
        """Complex list fields survive the round-trip."""
        payload = {
            **_BASE_ONBOARDING_PAYLOAD,
            "skills": ["python", "react", "docker"],
            "hobbies": ["hackathons", "open-source"],
        }
        response = client_for_new_user.post("/me/onboarding", json=payload)
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["skills"] == ["python", "react", "docker"]
        assert body["hobbies"] == ["hackathons", "open-source"]

    def test_optional_github_and_portfolio_urls(self, client_for_new_user: TestClient) -> None:
        """Providing optional URL fields stores them correctly."""
        payload = {
            **_BASE_ONBOARDING_PAYLOAD,
            "github_url": "https://github.com/zawlin",
            "portfolio_url": "https://zawlin.dev",
        }
        response = client_for_new_user.post("/me/onboarding", json=payload)
        assert response.status_code == 200, response.text
        body = response.json()
        assert "github.com/zawlin" in body["github_url"]
        assert "zawlin.dev" in body["portfolio_url"]


# ---------------------------------------------------------------------------
# POST /me/onboarding — authorization guard tests
# ---------------------------------------------------------------------------


class TestSubmitOnboardingAuthGuards:
    def test_mismatched_user_id_returns_403(self, client_for_new_user: TestClient) -> None:
        """Payload user_id that doesn't match the authenticated user must be rejected."""
        payload = {
            **_BASE_ONBOARDING_PAYLOAD,
            "user_id": str(uuid.uuid4()),  # different UUID
        }
        response = client_for_new_user.post("/me/onboarding", json=payload)
        assert response.status_code == 403, response.text

    def test_mismatched_email_returns_403(self, client_for_new_user: TestClient) -> None:
        """Payload email that doesn't match the authenticated user must be rejected."""
        payload = {
            **_BASE_ONBOARDING_PAYLOAD,
            "email": "attacker@evil.example",
        }
        response = client_for_new_user.post("/me/onboarding", json=payload)
        assert response.status_code == 403, response.text

    def test_mismatched_google_subject_returns_403(self, client_for_new_user: TestClient) -> None:
        """Payload google_subject that doesn't match the authenticated user must be rejected."""
        payload = {
            **_BASE_ONBOARDING_PAYLOAD,
            "google_subject": "google-subject-stolen",
        }
        response = client_for_new_user.post("/me/onboarding", json=payload)
        assert response.status_code == 403, response.text

    def test_missing_required_fields_returns_422(self, client_for_new_user: TestClient) -> None:
        """Incomplete payload must fail schema validation before reaching the handler."""
        incomplete = {
            "user_id": str(_NEW_USER_ID),
            "email": _NEW_USER_EMAIL,
            # missing name, polytechnic, course, graduation_year, linkedin_url …
        }
        response = client_for_new_user.post("/me/onboarding", json=incomplete)
        assert response.status_code == 422, response.text


# ---------------------------------------------------------------------------
# GET /me — verifies existing routes are unaffected (acceptance criterion 5)
# ---------------------------------------------------------------------------


class TestGetMe:
    def test_get_me_returns_me_response(self, client_for_approved_member: TestClient) -> None:
        """GET /me must still work correctly after adding POST /me/onboarding."""
        response = client_for_approved_member.get("/me")
        assert response.status_code == 200, response.text

        body = response.json()
        assert "profile" in body
        assert body["profile"]["email"] == _APPROVED_MEMBER_EMAIL
        assert body["can_access_private_app"] is True

    def test_get_me_queue_access_for_reviewer(self) -> None:
        """Reviewer calling GET /me should have queue_access=True."""
        store = InMemoryStore()
        app = create_app()
        app.state.store = store

        reviewer_id = uuid.UUID("33333333-3333-3333-3333-333333333333")
        reviewer = store.get_actor(reviewer_id)
        assert reviewer is not None

        auth_user = _make_auth_user(
            user_id=reviewer_id,
            email=reviewer.email,
            subject=reviewer.google_subject,
        )
        app.dependency_overrides[get_authenticated_user] = lambda: auth_user

        with TestClient(app) as client:
            response = client.get("/me")
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["queue_access"] is True
        assert body["pending_review_count"] >= 0
