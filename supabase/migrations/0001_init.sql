create extension if not exists pgcrypto;

create type app_role as enum ('member', 'reviewer', 'superadmin');
create type approval_state as enum ('pending', 'needs_manual_review', 'approved', 'rejected', 'banned');
create type review_object_type as enum ('user_application', 'resource_submission', 'draft_event', 'collab_flag');
create type moderation_action as enum ('approve', 'reject', 'ban', 'remove', 'dismiss_flag');
create type rsvp_status as enum ('going', 'interested', 'not_going');
create type event_origin as enum ('admin', 'worker');
create type event_visibility as enum ('approved_members');
create type collab_type as enum ('hackathon', 'project', 'open_source', 'startup_idea');
create type collab_status as enum ('active', 'archived', 'removed');
create type flag_status as enum ('open', 'resolved');

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  google_subject text not null unique,
  role app_role not null default 'member',
  approval_status approval_state not null default 'pending',
  name text not null,
  polytechnic text not null,
  course text not null,
  graduation_year integer not null,
  linkedin_url text not null,
  github_url text,
  portfolio_url text,
  skills text[] not null default '{}',
  hobbies text[] not null default '{}',
  status_badges text[] not null default '{}',
  open_to_collab boolean not null default false,
  job_seeking boolean not null default false,
  manual_verification_notes text,
  manual_proof_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_approved_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approval_status = 'approved'
  );
$$;

create or replace function public.is_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approval_status = 'approved'
      and p.role in ('reviewer', 'superadmin')
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approval_status = 'approved'
      and p.role = 'superadmin'
  );
$$;

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  review_object_type review_object_type not null default 'user_application',
  status approval_state not null default 'pending',
  submitted_payload jsonb not null default '{}'::jsonb,
  proof_url text,
  reviewer_notes text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  description text,
  categories text[] not null default '{}',
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  approved_by uuid references public.profiles (id),
  published_at timestamptz not null default now()
);

create table if not exists public.resource_submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  description text,
  categories text[] not null default '{}',
  extra_categories text[] not null default '{}',
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  status approval_state not null default 'pending',
  reviewer_notes text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null,
  description text not null,
  location text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  source_url text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  visibility event_visibility not null default 'approved_members',
  origin event_origin not null default 'admin',
  published_at timestamptz not null default now(),
  attendees_visible boolean not null default true,
  attendance_count integer not null default 0
);

create table if not exists public.event_drafts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null,
  description text not null,
  location text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  source_url text,
  source_name text not null,
  source_confidence integer not null default 50,
  status approval_state not null default 'pending',
  reviewer_notes text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status rsvp_status not null,
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.collab_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type collab_type not null,
  description text not null,
  needed_roles text[] not null default '{}',
  needed_skills text[] not null default '{}',
  deadline timestamptz,
  team_size integer not null default 1,
  contact_link text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  status collab_status not null default 'active',
  member_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collab_memberships (
  collab_id uuid not null references public.collab_projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  state text not null default 'member',
  updated_at timestamptz not null default now(),
  primary key (collab_id, user_id)
);

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  action moderation_action not null,
  reason text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.flags (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  severity text not null default 'medium',
  reason text not null,
  status flag_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id)
);

create table if not exists public.telegram_action_tokens (
  id uuid primary key default gen_random_uuid(),
  review_object_type review_object_type not null,
  review_object_id uuid not null,
  action moderation_action not null,
  actor_telegram_id bigint,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create table if not exists public.bans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id)
);

create index if not exists profiles_approval_status_idx on public.profiles (approval_status);
create index if not exists profiles_polytechnic_idx on public.profiles (polytechnic);
create index if not exists profiles_course_idx on public.profiles (course);
create index if not exists profiles_graduation_year_idx on public.profiles (graduation_year);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists approval_requests_status_idx on public.approval_requests (status);
create index if not exists resource_submissions_status_idx on public.resource_submissions (status);
create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists collab_projects_status_idx on public.collab_projects (status);
create index if not exists flags_status_idx on public.flags (status);

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger approval_requests_touch_updated_at
before update on public.approval_requests
for each row execute function public.touch_updated_at();

create trigger resource_submissions_touch_updated_at
before update on public.resource_submissions
for each row execute function public.touch_updated_at();

create trigger event_drafts_touch_updated_at
before update on public.event_drafts
for each row execute function public.touch_updated_at();

create trigger collab_projects_touch_updated_at
before update on public.collab_projects
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.approval_requests enable row level security;
alter table public.resources enable row level security;
alter table public.resource_submissions enable row level security;
alter table public.events enable row level security;
alter table public.event_drafts enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.collab_projects enable row level security;
alter table public.collab_memberships enable row level security;
alter table public.admin_actions enable row level security;
alter table public.flags enable row level security;
alter table public.telegram_action_tokens enable row level security;
alter table public.bans enable row level security;

create policy profiles_select_private on public.profiles
for select
using (auth.uid() = id or approval_status = 'approved' or public.is_reviewer());

create policy profiles_insert_own on public.profiles
for insert
with check (auth.uid() = id);

create policy profiles_update_own_or_admin on public.profiles
for update
using (auth.uid() = id or public.is_reviewer())
with check (auth.uid() = id or public.is_reviewer());

create policy approval_requests_select_own_or_admin on public.approval_requests
for select
using (auth.uid() = user_id or public.is_reviewer());

create policy approval_requests_insert_own on public.approval_requests
for insert
with check (auth.uid() = user_id);

create policy approval_requests_update_admin on public.approval_requests
for update
using (public.is_reviewer())
with check (public.is_reviewer());

create policy resources_select_private on public.resources
for select
using (public.is_approved_member());

create policy resources_write_admin on public.resources
for all
using (public.is_reviewer())
with check (public.is_reviewer());

create policy resource_submissions_select_own_or_admin on public.resource_submissions
for select
using (auth.uid() = submitted_by or public.is_reviewer());

create policy resource_submissions_insert_own on public.resource_submissions
for insert
with check (auth.uid() = submitted_by and public.is_approved_member());

create policy resource_submissions_update_admin on public.resource_submissions
for update
using (public.is_reviewer())
with check (public.is_reviewer());

create policy events_select_private on public.events
for select
using (public.is_approved_member());

create policy events_write_admin on public.events
for all
using (public.is_reviewer())
with check (public.is_reviewer());

create policy event_drafts_admin_only on public.event_drafts
for all
using (public.is_reviewer())
with check (public.is_reviewer());

create policy event_rsvps_select_private on public.event_rsvps
for select
using (public.is_approved_member() or auth.uid() = user_id);

create policy event_rsvps_insert_own on public.event_rsvps
for insert
with check (auth.uid() = user_id and public.is_approved_member());

create policy event_rsvps_update_own on public.event_rsvps
for update
using (auth.uid() = user_id and public.is_approved_member())
with check (auth.uid() = user_id and public.is_approved_member());

create policy collab_projects_select_private on public.collab_projects
for select
using (public.is_approved_member());

create policy collab_projects_insert_own on public.collab_projects
for insert
with check (auth.uid() = created_by and public.is_approved_member());

create policy collab_projects_update_creator_or_admin on public.collab_projects
for update
using (auth.uid() = created_by or public.is_reviewer())
with check (auth.uid() = created_by or public.is_reviewer());

create policy collab_projects_delete_admin on public.collab_projects
for delete
using (public.is_reviewer());

create policy collab_memberships_select_private on public.collab_memberships
for select
using (public.is_approved_member() or auth.uid() = user_id or public.is_reviewer());

create policy collab_memberships_insert_own on public.collab_memberships
for insert
with check (auth.uid() = user_id and public.is_approved_member());

create policy collab_memberships_update_own on public.collab_memberships
for update
using (auth.uid() = user_id and public.is_approved_member())
with check (auth.uid() = user_id and public.is_approved_member());

create policy collab_memberships_delete_own_or_admin on public.collab_memberships
for delete
using (auth.uid() = user_id or public.is_reviewer());

create policy admin_actions_admin_only on public.admin_actions
for select
using (public.is_reviewer());

create policy flags_admin_only on public.flags
for select
using (public.is_reviewer());

create policy telegram_action_tokens_admin_only on public.telegram_action_tokens
for all
using (public.is_reviewer())
with check (public.is_reviewer());

create policy bans_admin_only on public.bans
for all
using (public.is_superadmin())
with check (public.is_superadmin());
