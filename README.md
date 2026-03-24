# Poly Myanmar GC

Private networking platform for Myanmar polytechnic students, graduates, and mentors in Singapore.

## Workspace

- `apps/web`: Vite + React + TypeScript frontend
- `apps/api`: FastAPI API
- `apps/worker`: background jobs and Telegram/event automation
- `packages/contracts`: shared frontend contract constants

## Product Scope

- Private approved-member directory
- Events and RSVP tracking
- Resource submission and moderation
- Collaboration board
- Telegram-based admin review flows

## Initial Contracts

- Roles: `member`, `reviewer`, `superadmin`
- Approval states: `pending`, `needs_manual_review`, `approved`, `rejected`, `banned`
- Review objects: `user_application`, `resource_submission`, `draft_event`, `collab_flag`
- Moderation actions: `approve`, `reject`, `ban`, `remove`, `dismiss_flag`
- RSVP statuses: `going`, `interested`, `not_going`
