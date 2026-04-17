-- ─────────────────────────────────────────────────────────────────────────────
-- Dhanam Workspace — Migration 004: V2 Schema Additions
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Extend profiles ────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists role     text not null default 'member',
  add column if not exists settings jsonb not null default '{
    "reminderEmail": null,
    "reminderTime": "09:00",
    "timezone": "Asia/Kolkata",
    "emailRemindersEnabled": true
  }';

-- ── 2. Extend diary_entries ───────────────────────────────────────────────────
alter table public.diary_entries
  add column if not exists title    text,
  add column if not exists deleted  boolean not null default false,
  add column if not exists archived boolean not null default false;

create index if not exists diary_entries_user_active_idx
  on public.diary_entries(author_id, deleted, archived, created_at desc);

-- ── 3. Create workspaces table (no policy yet) ───────────────────────────────
create table if not exists public.workspaces (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now()
);

alter table public.workspaces enable row level security;

-- ── 4. Create workspace_members table (no policy yet) ────────────────────────
create table if not exists public.workspace_members (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      text not null,          -- real UUID or 'pending_{email}'
  email        text not null,
  display_name text,
  role         text not null default 'member',  -- admin | member
  pending      boolean not null default false,
  created_at   timestamptz default now(),
  unique(workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

create index if not exists workspace_members_workspace_idx on public.workspace_members(workspace_id);
create index if not exists workspace_members_user_idx on public.workspace_members(user_id);
create index if not exists workspace_members_email_idx on public.workspace_members(email);

-- ── 5. Create workspace_invites table ────────────────────────────────────────
create table if not exists public.workspace_invites (
  id             uuid primary key default uuid_generate_v4(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  workspace_name text not null,
  inviter_id     uuid not null references public.profiles(id),
  inviter_name   text not null,
  invitee_email  text not null,
  invitee_name   text,
  status         text not null default 'pending',  -- pending | accepted | rejected
  created_at     timestamptz default now(),
  unique(workspace_id, invitee_email)
);

alter table public.workspace_invites enable row level security;

create index if not exists workspace_invites_email_idx on public.workspace_invites(invitee_email, status);

-- ── 6. Extend tasks for unified personal + workspace ─────────────────────────
alter table public.tasks
  add column if not exists workspace_id     uuid references public.workspaces(id) on delete cascade,
  add column if not exists owner_id         uuid references public.profiles(id) on delete cascade,
  add column if not exists task_text        text,
  add column if not exists notes            text,
  add column if not exists category         text,
  add column if not exists sub              text,
  add column if not exists subsub           text,
  add column if not exists assignee_email   text,
  add column if not exists assignee_name    text,
  add column if not exists assignee_phone   text,
  add column if not exists completed        boolean not null default false,
  add column if not exists completed_at     timestamptz,
  add column if not exists created_by_name  text;

update public.tasks set owner_id = created_by where owner_id is null and workspace_id is null;

create index if not exists tasks_workspace_status_idx on public.tasks(workspace_id, status) where workspace_id is not null;
create index if not exists tasks_owner_personal_idx on public.tasks(owner_id) where workspace_id is null;
create index if not exists tasks_assignee_email_idx on public.tasks(assignee_email);

-- ── 7. Task activity log ──────────────────────────────────────────────────────
create table if not exists public.task_activity (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  actor_id    uuid references public.profiles(id),
  actor_name  text not null,
  action      text not null,
  detail      text,
  created_at  timestamptz default now()
);

alter table public.task_activity enable row level security;

create index if not exists task_activity_task_idx on public.task_activity(task_id, created_at asc);

-- ── 8. User phones ────────────────────────────────────────────────────────────
create table if not exists public.user_phones (
  email      text primary key,
  phone      text not null,
  updated_at timestamptz default now()
);

alter table public.user_phones enable row level security;

-- ── 9. Extend notifications ───────────────────────────────────────────────────
alter table public.notifications
  add column if not exists recipient_email text,
  add column if not exists sender_email    text,
  add column if not exists sender_name     text,
  add column if not exists workspace_id    uuid references public.workspaces(id) on delete set null;

create index if not exists notifications_email_idx
  on public.notifications(recipient_email, read, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- ALL POLICIES — defined after all tables exist to avoid forward-reference errors
-- ─────────────────────────────────────────────────────────────────────────────

-- workspaces policy (references workspace_members, so must come after that table)
drop policy if exists "workspace access" on public.workspaces;
create policy "workspace access"
  on public.workspaces for all
  using (
    created_by = auth.uid()
    or id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()::text
    )
  );

-- workspace_members policy
drop policy if exists "see workspace members" on public.workspace_members;
create policy "see workspace members"
  on public.workspace_members for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members wm2
      where wm2.user_id = auth.uid()::text
    )
    or workspace_id in (
      select id from public.workspaces where created_by = auth.uid()
    )
  );

-- workspace_invites policy
drop policy if exists "invite access" on public.workspace_invites;
create policy "invite access"
  on public.workspace_invites for all
  using (
    invitee_email = auth.jwt() ->> 'email'
    or inviter_id = auth.uid()
    or workspace_id in (
      select id from public.workspaces where created_by = auth.uid()
    )
  );

-- task_activity policies
drop policy if exists "activity read" on public.task_activity;
drop policy if exists "activity insert" on public.task_activity;
create policy "activity read" on public.task_activity for select
  using (true);
create policy "activity insert" on public.task_activity for insert
  with check (true);

-- user_phones policies
drop policy if exists "org phones read" on public.user_phones;
drop policy if exists "own phone write" on public.user_phones;
create policy "org phones read"
  on public.user_phones for select using (true);
create policy "own phone write"
  on public.user_phones for all using (true);

-- notifications policy (updated to also match by email)
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select
  using (
    user_id = auth.uid()
    or recipient_email = auth.jwt() ->> 'email'
  );

-- ── 10. Notify enum values ────────────────────────────────────────────────────
do $$
begin
  begin
    alter type notif_type add value if not exists 'task_assigned';
    alter type notif_type add value if not exists 'status_changed';
    alter type notif_type add value if not exists 'task_completed';
    alter type notif_type add value if not exists 'workspace_invite';
    alter type notif_type add value if not exists 'comment';
  exception when others then
    null;
  end;
end;
$$;
