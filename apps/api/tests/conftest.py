from __future__ import annotations

import os
from pathlib import Path

import pytest
from dotenv import load_dotenv
from uuid import UUID

# Load .env BEFORE any api imports — api/__init__.py triggers app creation
# which reads settings and may attempt a Supabase connection.
load_dotenv(Path(__file__).resolve().parents[3] / ".env", override=True)

from api.store import InMemoryStore, create_store  # noqa: E402
from api.store_protocol import StoreProtocol  # noqa: E402
from api.models import ProfileRecord  # noqa: E402

# Well-known seeded UUIDs (from InMemoryStore._seed)
APPROVED_MEMBER_ID = UUID("11111111-1111-1111-1111-111111111111")
PENDING_MEMBER_ID = UUID("22222222-2222-2222-2222-222222222222")
REVIEWER_ID = UUID("33333333-3333-3333-3333-333333333333")
SUPERADMIN_ID = UUID("44444444-4444-4444-4444-444444444444")
APPROVAL_REQUEST_ID = UUID("55555555-5555-5555-5555-555555555555")
RESOURCE_SUBMISSION_ID = UUID("66666666-6666-6666-6666-666666666666")
RESOURCE_ID_1 = UUID("77777777-7777-7777-7777-777777777777")
RESOURCE_ID_2 = UUID("88888888-8888-8888-8888-888888888888")
EVENT_ID = UUID("99999999-9999-9999-9999-999999999999")
DRAFT_EVENT_ID = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
COLLAB_ID = UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
FLAG_ID = UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
TELEGRAM_TOKEN_ID = UUID("dddddddd-dddd-dddd-dddd-dddddddddddd")
NONEXISTENT_ID = UUID("00000000-0000-0000-0000-000000000000")


def _can_use_supabase() -> bool:
    return (
        os.getenv("STORE_BACKEND") == "supabase"
        and bool(os.getenv("SUPABASE_URL"))
        and bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    )


@pytest.fixture(params=["memory", "supabase"])
def store(request: pytest.FixtureRequest) -> StoreProtocol:
    backend = request.param
    if backend == "supabase":
        if not _can_use_supabase():
            pytest.skip("SupabaseStore requires STORE_BACKEND=supabase and connection env vars")
        return create_store("supabase")
    return InMemoryStore()


@pytest.fixture
def memory_store() -> InMemoryStore:
    """Dedicated InMemoryStore fixture for tests that only need the memory backend."""
    return InMemoryStore()


@pytest.fixture
def approved_actor(store: StoreProtocol) -> ProfileRecord:
    actor = store.get_actor(APPROVED_MEMBER_ID)
    assert actor is not None
    return actor


@pytest.fixture
def reviewer_actor(store: StoreProtocol) -> ProfileRecord:
    actor = store.get_actor(REVIEWER_ID)
    assert actor is not None
    return actor


@pytest.fixture
def superadmin_actor(store: StoreProtocol) -> ProfileRecord:
    actor = store.get_actor(SUPERADMIN_ID)
    assert actor is not None
    return actor
