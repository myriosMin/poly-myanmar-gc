alter table public.events
  add column if not exists capacity integer;

alter table public.event_drafts
  add column if not exists capacity integer;
