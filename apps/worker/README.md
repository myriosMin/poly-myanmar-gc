# Worker

Background worker for deterministic moderation workflows.

## What It Does

- Generates draft events and suspicious flags for admin queues.
- Sends deterministic Telegram review messages with inline action buttons.
- Processes Telegram callback actions and applies moderation via API webhook.
- Sweeps consumed and expired Telegram action tokens every cycle.

## Required Environment Variables

- `WORKER_API_BASE_URL`: Base URL of API service.
- `WORKER_ACTOR_ID`: Superadmin actor id used for worker-authenticated API calls.
- `WORKER_MODE`: `once` or `loop`.
- `WORKER_INTERVAL_SECONDS`: Delay between cycles when mode is `loop`.

## Telegram Variables

- `WORKER_TELEGRAM_ENABLED`: `true` to enable queue notifications and callback processing.
- `WORKER_TELEGRAM_BOT_TOKEN`: Telegram bot token used for sendMessage/getUpdates.
- `TELEGRAM_REVIEW_CHAT_ID`: Review chat/channel id where queue notifications are posted.
- `WORKER_TOKEN_TTL_SECONDS`: Action token expiry in seconds.

## Reliability Variables

- `WORKER_REQUEST_RETRY_ATTEMPTS`: Max retries for transient failures.
- `WORKER_REQUEST_RETRY_BACKOFF_SECONDS`: Fixed sleep between retries.
- `WORKER_STATE_PATH`: Local JSON state file path for notification and callback offsets.

## Local Startup

1. Install worker dependencies:

```bash
uv sync --directory apps/worker
```

2. Start worker once:

```bash
PYTHONPATH=apps/worker/src uv run --directory apps/worker python -m worker.main
```

3. Start worker loop mode:

```bash
WORKER_MODE=loop PYTHONPATH=apps/worker/src uv run --directory apps/worker python -m worker.main
```

## Test and Verification

Run worker smoke and deterministic/callback/retry tests:

```bash
make test-worker
```

## Failure Modes and Behavior

- API/Telegram `5xx` and transient network timeouts are retried with fixed backoff.
- API/Telegram `4xx` are treated as non-retryable and fail fast.
- Invalid callback payloads are acknowledged back to Telegram with explicit failure text.
- Unknown or expired action tokens are acknowledged without applying actions.
- Worker continues processing next items even when a single callback/action fails.

## Manual Replay and Recovery

- To replay old Telegram updates from scratch:
  - Stop worker.
  - Delete `WORKER_STATE_PATH` file.
  - Start worker again.
- To stop duplicate notification suppression for a specific object:
  - Edit `notified_keys` in `WORKER_STATE_PATH` and remove the corresponding key.
- To clear stale action-token bindings only:
  - Remove selected entries under `token_bindings` in `WORKER_STATE_PATH`.
- To force backend cleanup of consumed/expired action tokens:
  - Run one worker cycle with Telegram enabled; each cycle calls `/telegram/tokens/sweep`.
