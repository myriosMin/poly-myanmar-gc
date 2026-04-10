# API (FastAPI)

This service is deployable on Vercel as a Python function.

## Local development

From the repository root:

```bash
npm run dev:api
```

## Vercel deployment

Create a Vercel project with its Root Directory set to `apps/api`.

The app uses:

- `vercel_app.py` as the Vercel function entrypoint.
- `vercel.json` for runtime and route mapping.
- `requirements.txt` for Python dependency installation.

### Required environment variables

Set these in the Vercel project settings:

- `ENVIRONMENT=production`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_REVIEW_CHAT_ID`
- `SUPABASE_APPROVAL_FUNCTION_NAME` (default: `admin-approval-notifier`)
- `CORS_ORIGINS` (comma-separated; include your web app URL)

### Health check

After deployment, confirm:

- `GET /healthz` returns a successful response.
