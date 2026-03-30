-- Make optional profile columns truly nullable and remove implicit defaults
-- Required columns remain: username, email, linkedin_url

alter table public.profiles
  alter column skills drop not null,
  alter column hobbies drop not null,
  alter column status_badges drop not null,
  alter column open_to_collab drop not null,
  alter column job_seeking drop not null,
  alter column skills drop default,
  alter column hobbies drop default,
  alter column status_badges drop default,
  alter column open_to_collab drop default,
  alter column job_seeking drop default;
