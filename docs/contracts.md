# Shared Contracts

This document freezes the shared product constants before parallel implementation starts.

## Roles

- `member`
- `reviewer`
- `superadmin`

## Approval States

- `pending`
- `needs_manual_review`
- `approved`
- `rejected`
- `banned`

## Review Object Types

- `user_application`
- `resource_submission`
- `draft_event`
- `collab_flag`

## Moderation Actions

- `approve`
- `reject`
- `ban`
- `remove`
- `dismiss_flag`

## RSVP Statuses

- `going`
- `interested`
- `not_going`

## Core Member Routes

- `/auth`
- `/pending-approval`
- `/profiles`
- `/events`
- `/resources`
- `/collab`
- `/admin`
- `/settings`
- `/legal/privacy`
- `/legal/terms`
- `/legal/guidelines`

## Product Rules

- Only approved members can access private member data.
- Resources stay hidden until approved.
- Worker-sourced events are created as drafts and never auto-published.
- Telegram review actions and web admin actions must use the same backend decision logic.
- The platform has no social feed, post comments, or in-app messaging.
