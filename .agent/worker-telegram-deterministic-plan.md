# Worker Telegram Deterministic Plan

## Goal
Shift the current worker roadmap to deterministic Telegram-driven moderation actions (approve/reject/ban/dismiss where applicable), and defer external event sourcing plus LLM/web search integration.

## Scope Decisions
- In scope:
  - Deterministic queue summaries and action prompts sent to Telegram.
  - Telegram inline button workflow that maps 1:1 to existing moderation actions.
  - Action execution through existing API token/webhook validation.
  - Idempotent and auditable processing behavior.
- Out of scope for now:
  - New external event source ingestion APIs.
  - LLM ranking, extraction, or web search.
  - Auto-publishing any moderation object.

## Current System Baseline
- Worker can already generate drafts/flags and push to API admin endpoints.
- API already has Telegram token + webhook action execution primitives.
- Webhook action dispatch already supports user applications, resource submissions, draft events, and collab flags.

## Target Behavior
1. Worker polls moderation queues on a fixed interval.
2. Worker emits deterministic Telegram review messages for pending items.
3. Each message includes explicit action buttons (Approve/Reject/etc.) with action token metadata.
4. Telegram callback triggers API webhook with the token + object/action payload.
5. API validates token (not expired, not consumed, matching object/action/user) and executes action.
6. Worker periodically sweeps consumed/expired tokens and posts concise run summary.

## Implementation Plan

### Phase 1: Queue Read + Message Emission (Deterministic)
- Add read methods in worker API client:
  - GET /admin/approvals
  - GET /admin/resources/submissions
  - GET /admin/event-drafts
  - GET /admin/flags
- Add a stable selection policy:
  - Sort by created_at ascending.
  - Process max N per cycle (configurable).
  - Skip objects already notified in previous cycles (persisted state).
- Add a message formatter with fixed templates:
  - One template per review object type.
  - Deterministic field order and truncation rules.

Acceptance criteria:
- Same queue snapshot always produces byte-identical message payloads.
- Worker emits no duplicate notifications for same object+action unless explicitly requeueing.

### Phase 2: Token Creation + Telegram Buttons
- Add API route for token creation if missing from router surface:
  - POST /telegram/tokens
  - Request: review_object_type, review_object_id, action, actor_telegram_id(optional), ttl(optional), payload(optional)
  - Response: TelegramActionTokenRecord
- In worker, generate per-button token before sending message.
- Build inline keyboard callback data with token + object/action identifiers.

Acceptance criteria:
- Every button has exactly one unconsumed token.
- Token TTL and actor binding are enforced when configured.

### Phase 3: Callback Execution Path
- Add/verify a Telegram bot handler service in worker:
  - Receives callback_query from Telegram updates.
  - Converts callback payload to TelegramWebhookRequest.
  - Calls POST /telegram/webhook.
- Add deterministic user feedback:
  - Success: show final action result and object id.
  - Failure: explicit reason (expired token, consumed token, mismatch, forbidden).

Acceptance criteria:
- Clicking a valid button applies exactly one moderation action.
- Re-clicking same button never applies action twice.

### Phase 4: State, Idempotency, and Recovery
- Persist worker notification state (lightweight file or table):
  - notified_at per object id + object type.
  - message_id/chat_id for edits if needed.
- Add retry policy for transient failures (network/5xx):
  - bounded retries with fixed backoff.
  - no retry for 4xx validation errors.
- Add sweep step each run:
  - invoke token cleanup.
  - log counts of consumed/expired tokens removed.

Acceptance criteria:
- Worker restart does not resend already-notified items.
- Transient API failures recover without duplicate side effects.

### Phase 5: Tests and Operational Safety
- Unit tests:
  - deterministic formatter snapshots.
  - callback parser and webhook payload construction.
  - retry classification logic.
- Integration tests:
  - token creation -> callback -> webhook apply -> token consumed.
  - duplicate callback rejection.
- Add runbook notes in apps/worker/README.md:
  - env vars, startup flow, failure modes, manual replay steps.

Acceptance criteria:
- make test-worker includes deterministic + callback flow checks.
- docs cover local setup and troubleshooting.

## Proposed Config Additions
- WORKER_TELEGRAM_ENABLED=true|false
- WORKER_TELEGRAM_BOT_TOKEN=
- WORKER_TELEGRAM_REVIEW_CHAT_ID=
- WORKER_REVIEW_PAGE_SIZE=20
- WORKER_MAX_NOTIFICATIONS_PER_CYCLE=20
- WORKER_TOKEN_TTL_SECONDS=7200
- WORKER_STATE_PATH=.worker-state.json

## Data Contract Notes
- Keep action mapping aligned with existing moderation enums:
  - user_application: approve, reject, ban
  - resource_submission: approve, reject
  - draft_event: approve, reject
  - collab_flag: dismiss_flag, ban
- Do not allow free-form action names in callback payload.

## Sequencing Recommendation
1. Phase 1 + Phase 2 first (queue read, tokenized buttons).
2. Phase 3 next (callback execution path).
3. Phase 4 for reliability and restart safety.
4. Phase 5 to lock quality and documentation.

## Deferred Backlog (Explicitly Later)
- LLM-assisted triage priority scoring.
- Web-search backed enrichment for event/source confidence.
- Automatic suggestion text generation from unstructured content.
