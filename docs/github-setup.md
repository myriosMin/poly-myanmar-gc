# GitHub Repository Setup

This repo now contains file-based GitHub automation:

- CI workflow
- Dependency review workflow
- Dependabot configuration
- `CODEOWNERS`
- issue forms
- pull request template

The remaining GitHub configuration must be enabled in repository settings by an admin.

## Recommended ruleset for `main`

Create a branch ruleset for `main` with:

- Require a pull request before merging
- Require approvals
- Require review from code owners
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Block force pushes
- Block deletions
- Require linear history

## Required status checks

Mark these workflows as required after they run once:

- `Web`
- `API and Worker`
- `Dependency review`

## Suggested repository settings

- Enable auto-delete for head branches after merge
- Enable squash merge
- Disable merge commits if you want a cleaner history
- Keep issues and projects enabled
- Restrict direct pushes to `main`

## Suggested labels

Create labels such as:

- `bug`
- `enhancement`
- `dependencies`
- `web`
- `api`
- `worker`
- `supabase`
- `github`
- `infrastructure`

## Suggested secrets

When real integrations are added later, configure:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_REVIEW_CHAT_ID`
- `VERCEL_TOKEN`
- `RAILWAY_TOKEN`
