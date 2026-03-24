# Poly Myanmar GC

Private networking platform for Myanmar polytechnic students, recent graduates, alumni, and mentors in Singapore.

This repo is currently in a scaffolded MVP state. The product shape exists across the web app, API, worker, and database schema, but several parts are still mocked and need real integration work.

## What the platform does

- Private approved-member directory
- Events and RSVP tracking
- Resource submission and moderation
- Collaboration board for projects and hackathons
- Admin review flows with Telegram as the intended moderation channel

## Workspace layout

- `apps/web`: Vite + React + TypeScript frontend
- `apps/api`: FastAPI API
- `apps/worker`: background jobs for event sourcing and suspicious-activity checks
- `packages/contracts`: shared frontend contract constants
- `supabase/migrations`: SQL schema and RLS policy definitions
- `docs`: legal pages and shared contract notes

## Current status

### Done

- Private member app shell and routed pages
- Mocked auth/onboarding flow in the frontend
- Profiles, events, resources, collab, admin, settings, and legal pages
- FastAPI route coverage for the main product domains
- Worker skeleton for weekly event sourcing and alert-style jobs
- Initial Supabase schema, enums, indexes, and RLS model
- Root `Makefile` for local setup and smoke tests

### Still mocked

- Frontend data layer in `apps/web/src/lib/mock-api.ts`
- Frontend queries in `apps/web/src/lib/query.tsx`
- Backend persistence in `apps/api/src/api/store.py`
- Backend actor/auth flow via seeded actors and `X-Actor-Id`
- Telegram webhook actions are local/store-backed, not connected to a real bot
- Worker event sourcing uses deterministic sample logic, not live external sources

### Not production-ready yet

- Real Supabase reads/writes from the API
- Real Google OAuth and session validation
- Frontend calling the API instead of the mock adapter
- Real Telegram bot delivery and callback verification
- Real event sourcing from Singapore career fair and hackathon sources
- Deployment configuration and environment hardening

## Local development

### Prerequisites

- Node.js
- npm
- Python 3.11+
- `uv`

### Environment

Copy `.env.example` and fill in values as needed:

```bash
cp .env.example .env
```

### Setup

```bash
make install
```

### Run locally

```bash
make dev-web
make dev-api
make dev-worker
```

### Smoke tests

```bash
make test
```

Useful individual targets:

- `make build-web`
- `make lint-web`
- `make test-api`
- `make test-worker`

## Contribution workflow

1. Create a feature branch from `codex/bootstrap-poly-myanmar-gc`.
2. Pick a single checklist item or one small related set of items.
3. Keep changes scoped to one workstream when possible.
4. Run the relevant local checks before opening a PR.
5. In your PR description, say whether your change touched real integration code or only mock/demo code.

Recommended workstream ownership:

- Frontend contributors: `apps/web`
- Backend contributors: `apps/api`
- Worker/automation contributors: `apps/worker`
- Database contributors: `supabase/migrations`
- Docs/legal contributors: `docs`

## Current implementation checklist

### Highest priority

- [ ] Replace the frontend mock adapter with a typed API client
- [ ] Wire FastAPI to real Supabase persistence instead of `InMemoryStore`
- [ ] Implement real Google OAuth session handling
- [ ] Connect approval and admin flows to real Supabase-backed data
- [ ] Connect Telegram review actions to a real bot token and chat workflow

### Frontend

- [ ] Replace `apps/web/src/lib/mock-api.ts` usage with real API calls
- [ ] Add loading, error, and empty states for all network-backed pages
- [ ] Hook onboarding and settings forms to real backend mutations
- [ ] Hook event RSVP actions to real backend mutations
- [ ] Hook resource submission form to real backend mutations
- [ ] Hook collab create/join/leave flows to real backend mutations
- [ ] Add auth/session bootstrapping from real login state

### API

- [ ] Replace seeded in-memory data in `apps/api/src/api/store.py`
- [ ] Add Supabase client integration and repository layer
- [ ] Validate JWT/session state against Supabase auth
- [ ] Persist approval, moderation, RSVP, resource, and collab writes to Postgres
- [ ] Add proper error handling and validation around external integrations
- [ ] Add test coverage beyond the current smoke checks

### Worker and Telegram

- [ ] Replace sample event sourcing with real source fetchers
- [ ] Add deduplication against real draft event records
- [ ] Send real Telegram messages for approvals, resource reviews, draft events, and flags
- [ ] Verify Telegram callbacks securely and idempotently
- [ ] Persist worker outputs instead of printing local reports only

### Database and auth

- [ ] Apply and validate the migration in a real Supabase project
- [ ] Confirm RLS policies against actual frontend and API access patterns
- [ ] Add follow-up migrations for any schema gaps found during integration
- [ ] Define how manual verification proof metadata will be stored in production

### Product polish

- [ ] Tighten copy and UX for onboarding, pending approval, and admin review states
- [ ] Add real legal page links into live app flows where needed
- [ ] Add deployment docs for Vercel, Railway, and Supabase
- [ ] Add a small seed/demo script for local development if we keep mock/demo mode

## Shared contracts

The frozen shared contracts are documented in:

- `docs/contracts.md`
- `packages/contracts/src/index.ts`

Current contract values:

- Roles: `member`, `reviewer`, `superadmin`
- Approval states: `pending`, `needs_manual_review`, `approved`, `rejected`, `banned`
- Review objects: `user_application`, `resource_submission`, `draft_event`, `collab_flag`
- Moderation actions: `approve`, `reject`, `ban`, `remove`, `dismiss_flag`
- RSVP statuses: `going`, `interested`, `not_going`

## Related docs

- `docs/terms.md`
- `docs/privacy.md`
- `docs/guidelines.md`
- `docs/deletion.md`
