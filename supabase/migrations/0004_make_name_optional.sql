-- Make name (full_name) optional
-- Extract from LinkedIn URL later

alter table public.profiles
  alter column name drop not null;
