# Web (Vite + React)

Frontend app for Poly Myanmar GC.

## Local development

From the repository root:

```bash
npm run dev:web
```

## Production build

```bash
npm run build:web
```

## Vercel deployment

Create a Vercel project with its Root Directory set to `apps/web`.

This app uses `vercel.json` with a SPA rewrite so direct links and refreshes work for client-side routes.

### Required environment variables

Set in Vercel project settings:

- `VITE_API_BASE_URL` (your deployed API URL)

### Notes

- Keep API CORS settings in sync with your deployed web domain.
