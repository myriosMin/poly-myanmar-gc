# admin-approval-notifier

Supabase Edge Function for onboarding moderation notifications and one-click review links.

## What it does

- Receives onboarding notification events from the API (`POST /functions/v1/admin-approval-notifier`).
- Sends user details and approve/reject links to Telegram and/or email.
- Handles one-click approval links (`GET /functions/v1/admin-approval-notifier/action?token=...`).
- Updates `approval_requests.status` and `profiles.approval_status` accordingly.

## Required environment variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APPROVAL_ACTION_SECRET` (long random secret used for signing action tokens)

## Optional environment variables

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_REVIEW_CHAT_ID`
- `RESEND_API_KEY`
- `APPROVAL_EMAIL_TO`
- `APPROVAL_EMAIL_FROM`
- `APPROVAL_ACTION_BASE_URL` (override action link base)
- `APPROVAL_BOT_ACTOR_ID` (profile UUID for audit rows in `admin_actions`)

## Deploy example

Deploy with JWT verification disabled because approval links are clicked from external mail/telegram clients:

```bash
supabase functions deploy admin-approval-notifier --no-verify-jwt
```

If using MCP, deploy with `verify_jwt: false` for this function.

## Security notes

- Action links are signed and expire after 24 hours.
- Rotate `APPROVAL_ACTION_SECRET` if links are suspected compromised.
- Limit distribution of notification messages and private data.
