-- Add per-user public profile visibility preferences.
-- Stores field keys used by frontend visibility controls.

alter table if exists public.profiles
  add column if not exists public_preferences text[] not null default array[
    'polytechnic',
    'course',
    'statusBadge',
    'linkedinUrl',
    'jobSeeking',
    'email',
    'skills',
    'hobbies'
  ]::text[];

-- Ensure values are limited to known keys and always include baseline public fields.
alter table if exists public.profiles
  drop constraint if exists profiles_public_preferences_allowed_check;

alter table if exists public.profiles
  add constraint profiles_public_preferences_allowed_check
  check (
    public_preferences <@ array[
      'polytechnic',
      'course',
      'statusBadge',
      'linkedinUrl',
      'jobSeeking',
      'email',
      'skills',
      'hobbies',
      'githubUrl',
      'portfolioUrl'
    ]::text[]
    and public_preferences @> array[
      'polytechnic',
      'course',
      'statusBadge',
      'linkedinUrl'
    ]::text[]
  );
