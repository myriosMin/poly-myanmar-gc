-- Restructure profiles table: username, full_name, email, linkedin_url required
-- All other fields except operational columns are optional

alter table public.profiles
  add column if not exists username text unique,
  alter column polytechnic drop not null,
  alter column course drop not null,
  alter column graduation_year drop not null,
  alter column skills set default '{}',
  alter column hobbies set default '{}',
  alter column status_badges set default '{}',
  alter column google_subject drop not null,
  alter column username set not null;

-- Create unique constraint on username
create unique index if not exists profiles_username_idx on public.profiles (username) where username is not null;
