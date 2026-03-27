# poly-network — Completion Plan

## What exists & what's broken

### ✅ Done (solid)
| Area | State |
|---|---|
| `packages/contracts` | Enums/types shared across apps |
| `apps/api` FastAPI routers | All 8 routers implemented (me, profiles, events, resources, collab, admin, telegram, health) |
| `apps/api` `InMemoryStore` | Full business logic: onboarding, RSVP, resources, collab, admin queue, flags, telegram tokens |
| `apps/api` models | Pydantic models aligned with domain |
| `apps/web` pages & UI | All 9 pages built, responsive, nicely styled |
| `apps/web` routing & auth guards | `RequireApproved`, `RequireReviewer` guards in `App.tsx` |

### ❌ Mocked / not wired
| Area | Problem |
|---|---|
| **All frontend API calls** | Every page calls `mockApi` (in-memory TS) — real API never touched |
| `GET /me` / session | `useSessionQuery` calls `mockApi.getSession()`, hardcoded fake session |
| `POST /me/onboarding` | Exists in `store.py` but **no router endpoint** exposes it |
| `PATCH /profiles/me` | Exists but `settings-page.tsx` calls `mockApi.updateSettings` |
| **Worker → API** | Worker runs in-process; doesn't POST drafts/flags to real API |
| **Google OAuth** | Auth is faked; `deps.py` uses `X-Actor-Id` header (dev fixture) |

### ⚠️ Model mismatches
| Frontend → Backend |
|---|
| `EventItem.attendees: string[]` → backend has `attendance_count: int` |
| `CollabProject.members: string[]` → backend has `member_count: int` |
| `ResourceItem.status` → `ResourceRecord` has no status (submissions have it) |
| `CollabType`: frontend `'open source'` (space) vs backend `'open_source'` (snake) |
| `EventKind`: frontend `'career fair'` vs backend `'career_fair'` |
| `Session` shape differs from `ProfileRecord` / `MeResponse` |

---

## Proposed changes

### Phase 1 — API exposure gap (backend, 1 file)

#### [MODIFY] [me.py](file:///Users/myrios/Downloads/poly-network/apps/api/src/api/routers/me.py)
Add `POST /me/onboarding` endpoint that calls `store.upsert_onboarding`.  
Also ensure `GET /me` always works (already done).

---

### Phase 2 — Real HTTP client (frontend)

#### [NEW] [api.ts](file:///Users/myrios/Downloads/poly-network/apps/web/src/lib/api.ts)
Create a real HTTP client with the same method signatures as `mockApi`:
- Base URL from `import.meta.env.VITE_API_BASE_URL`
- Send `X-Actor-Id` header derived from stored session id (temporary; swapped for JWT when OAuth added)
- Map snake_case API responses → camelCase frontend domain types
- Normalize enum values (`open_source` → `open source`, `career_fair` → `career fair`)

---

### Phase 3 — Wire pages to real API

#### [MODIFY] [query.tsx](file:///Users/myrios/Downloads/poly-network/apps/web/src/lib/query.tsx)
Replace `mockApi.getSession()` → `api.getSession()` (which calls `GET /me`).

#### [MODIFY] [auth-page.tsx](file:///Users/myrios/Downloads/poly-network/apps/web/src/pages/auth-page.tsx)
Replace `mockApi.submitOnboarding` → `api.submitOnboarding`.

#### [MODIFY] [profiles-page.tsx](file:///Users/myrios/Downloads/poly-network/apps/web/src/pages/profiles-page.tsx)
Replace `mockApi.getProfiles`, `getProfileById` → `api.*`.  
**Simplify** event/collab history on profile detail overlay (remove since API doesn't return it, or omit section).

#### [MODIFY] [events-page.tsx](file:///Users/myrios/Downloads/poly-network/apps/web/src/pages/events-page.tsx)
Replace `mockApi.getEvents`, `setRsvp` → `api.*`.  
Adapt attendees display: show `attendance_count` instead of list of names.

#### [MODIFY] [resources-page.tsx](file:///Users/myrios/Downloads/poly-network/apps/web/src/pages/resources-page.tsx)
Replace `mockApi.getResources`, `submitResource` → `api.*`.  
Status field: approved resources come from `GET /resources` directly (no `status` needed); submissions visible only in admin.

#### [MODIFY] [collab-page.tsx](file:///Users/myrios/Downloads/poly-network/apps/web/src/pages/collab-page.tsx)
Replace `mockApi.getCollabProjects`, `createCollabProject`, `joinCollab`, `leaveCollab` → `api.*`.  
Show `member_count` instead of `members[]`.

#### [MODIFY] [admin-page.tsx](file:///Users/myrios/Downloads/poly-network/apps/web/src/pages/admin-page.tsx)
Replace `mockApi.getAdminQueue`, `reviewQueueItem` → `api.*`.  
Admin queue is now 4 separate API surfaces: `/admin/approvals`, `/admin/resources/submissions`, `/admin/event-drafts`, `/admin/flags`.

#### [MODIFY] [settings-page.tsx](file:///Users/myrios/Downloads/poly-network/apps/web/src/pages/settings-page.tsx)
Replace `mockApi.getSettings`, `updateSettings` → `api.*` (`PATCH /profiles/me`).

---

### Phase 4 — Worker → API integration

#### [MODIFY] [settings.py (worker)](file:///Users/myrios/Downloads/poly-network/apps/worker/src/worker/settings.py)
Add `api_base_url: str` field loaded from `API_BASE_URL` env var.

#### [NEW] [api_client.py](file:///Users/myrios/Downloads/poly-network/apps/worker/src/worker/api_client.py)
Simple `httpx`-based client with:
- `push_event_draft(draft: DraftEventSuggestion) → None`
- `push_flag(flag: SuspiciousActivityFlag) → None`
- Auth via `X-Actor-Id` header (worker uses superadmin UUID)

#### [MODIFY] [jobs.py](file:///Users/myrios/Downloads/poly-network/apps/worker/src/worker/jobs.py)
After generating drafts & flags, call `api_client.push_*`.  
Remove hardcoded sample tuples from `detect_suspicious_activity` (replace with real domain-linked checks).

---

### Phase 5 — .env consistency

#### [MODIFY] [.env.example](file:///Users/myrios/Downloads/poly-network/.env.example)
Add:
```
VITE_API_BASE_URL=http://localhost:8000
WORKER_API_BASE_URL=http://localhost:8000
WORKER_ACTOR_ID=44444444-4444-4444-4444-444444444444
```

---

### Phase 6 — Dev UX polish

#### [MODIFY] [pending-approval-page.tsx](file:///Users/myrios/Downloads/poly-network/apps/web/src/pages/pending-approval-page.tsx)
Gate "Simulate approval" button behind `import.meta.env.DEV`.

---

## Verification Plan

### API smoke tests (manual)
```bash
cd apps/api && uv run uvicorn api.main:app --reload
# In another terminal:
curl http://localhost:8000/health
curl -H "X-Actor-Id: 11111111-1111-1111-1111-111111111111" http://localhost:8000/me
curl -H "X-Actor-Id: 11111111-1111-1111-1111-111111111111" http://localhost:8000/profiles
```

### Frontend integration (manual, browser)
```bash
cd apps/web && npm run dev
# Visit http://localhost:5173
```
1. Fill onboarding form → submit → should reach `/pending-approval`
2. As reviewer (`X-Actor-Id: 33333333-…`): open `/admin`, approve the application
3. Visit `/profiles`, `/events`, `/resources`, `/collab` — data loads from API (not mock)
4. RSVP to an event → count increments
5. Submit a resource → appears in admin queue
6. Create a collab project → shows in `/collab`

### Worker smoke test (manual)
```bash
cd apps/worker && API_BASE_URL=http://localhost:8000 WORKER_ACTOR_ID=44444444-4444-4444-4444-444444444444 uv run python -m worker.main
# Confirm event drafts appear in GET /admin/event-drafts
```
