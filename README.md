# Poly Myanmar GC

Private networking platform for Myanmar polytechnic students, recent graduates, alumni, and mentors in Singapore.

## User Guide

### Who this is for

- Members: discover peers, RSVP to events, submit useful resources, and join collaboration boards.
- Reviewers: process approvals and moderation queue items.
- Superadmins: all reviewer actions plus worker-write and ban/unban capabilities.

### Typical member flow

1. Open the web app.
2. Submit onboarding details from the auth page.
3. Wait in pending approval state.
4. After approval, access private pages:
   - Profiles
   - Events and RSVP
   - Resources
   - Collaboration board

### Typical reviewer flow

1. Open the admin page.
2. Review queue categories:
   - User applications
   - Resource submissions
   - Event drafts
   - Flags
3. Approve or reject items as needed.

### Worker behavior

- Generates event drafts on a schedule.
- Detects suspicious domains from configured event sources.
- Pushes drafts and flags to admin endpoints using actor header auth.

## Current Progress

As of 2026-03-27, the repository is in integrated MVP state.

### Completed

- Frontend pages are wired to real API calls through a typed client in apps/web/src/lib/api.ts.
- Session query is API-backed.
- Onboarding submit calls backend endpoint and persists actor id for request headers.
- Settings, profiles, events, resources, collab, and admin pages are API-backed.
- Pending approval simulation action is gated to development mode.
- API route for POST /me/onboarding is implemented with actor ownership validation.
- Worker can push event drafts and flags to API admin endpoints.
- Worker settings support API base URL and actor id env configuration.
- Root smoke tests are passing:
  - make test-api
  - make test-worker

### Still in-progress / not production-ready

- API persistence still defaults to in-memory store in normal local flow.
- Full Supabase-backed store integration across all domains is not complete.
- Authentication is still dev-style actor header based; no Google OAuth/JWT session flow yet.
- Telegram integration is not connected to a live bot workflow.
- Worker sourcing is deterministic and does not yet fetch from real external data feeds.
- Deployment and secret hardening still need production pass.

## Local Development Setup

### Prerequisites

- Node.js 20+
- npm
- Python 3.11+
- uv

### 1) Install dependencies

```bash
make install
```

### 2) Configure environment

```bash
cp .env.example .env
```

The default local values in .env.example include:

- API_BASE_URL
- VITE_API_BASE_URL
- WORKER_API_BASE_URL
- WORKER_ACTOR_ID
- DEFAULT_ACTOR_ID

### 3) Run services

In separate terminals:

```bash
make dev-api
make dev-web
make dev-worker
```

### 4) Run checks

```bash
make test-api
make test-worker
cd apps/web && npx tsc --noEmit
```

### 5) Useful commands

```bash
make build-web
make lint-web
make test
```

## Vercel Deployment

Deploy as two separate Vercel projects from this monorepo:

1. Web project
   - Root Directory: `apps/web`
   - Framework preset: Vite
   - Required env: `VITE_API_BASE_URL`

2. API project
   - Root Directory: `apps/api`
   - Runtime: Python (configured via `apps/api/vercel.json`)
   - Entry file: `apps/api/vercel_app.py`
   - Dependencies: `apps/api/requirements.txt`
   - Required env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_REVIEW_CHAT_ID`, `CORS_ORIGINS`

After both deployments are live, set:

- Web `VITE_API_BASE_URL` to your deployed API URL.
- API `CORS_ORIGINS` to include your deployed web URL.

## Workspace Layout

- apps/web: Vite + React + TypeScript frontend
- apps/api: FastAPI API
- apps/worker: background jobs
- packages/contracts: shared role/status/action enums
- supabase/migrations: SQL schema and policy changes
- docs: legal and product docs

## Shared Contracts

Source of truth:

- docs/contracts.md
- packages/contracts/src/index.ts

Current values:

- Roles: member, reviewer, superadmin
- Approval states: pending, needs_manual_review, approved, rejected, banned
- Review objects: user_application, resource_submission, draft_event, collab_flag
- Moderation actions: approve, reject, ban, remove, dismiss_flag
- RSVP statuses: going, interested, not_going

## Related Docs

- docs/terms.md
- docs/privacy.md
- docs/guidelines.md
- docs/deletion.md
