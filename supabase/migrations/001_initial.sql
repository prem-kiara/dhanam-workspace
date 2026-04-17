-- ─────────────────────────────────────────────────────────────────────────────
-- Dhanam Workspace — Initial Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES (team members, linked to Supabase auth) ────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  email        text not null unique,
  phone        text,                        -- WhatsApp number e.g. +919840000001
  avatar_url   text,
  initials     text generated always as (
                 upper(substring(name from 1 for 1) ||
                 coalesce(substring(name from position(' ' in name) + 1 for 1), ''))
               ) stored,
  color        text default 'bg-violet-500',
  created_at   timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can read all profiles"  on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ─── DIARY ENTRIES ───────────────────────────────────────────────────────────
create table public.diary_entries (
  id         uuid primary key default uuid_generate_v4(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  tag        text not null default 'Personal',   -- Team Sync | Client Call | Strategy | Personal
  content    text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.diary_entries enable row level security;
create policy "Authors can manage own diary entries"
  on public.diary_entries for all using (auth.uid() = author_id);
create policy "Team can read diary entries"
  on public.diary_entries for select using (true);

create index diary_entries_author_idx on public.diary_entries(author_id);
create index diary_entries_created_idx on public.diary_entries(created_at desc);


-- ─── TASK CATEGORIES ─────────────────────────────────────────────────────────
create table public.task_categories (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.task_categories enable row level security;
create policy "All team can read categories"  on public.task_categories for select using (true);
create policy "All team can manage categories" on public.task_categories for all using (true);

-- ─── TASK SUBCATEGORIES ──────────────────────────────────────────────────────
create table public.task_subcategories (
  id          uuid primary key default uuid_generate_v4(),
  category_id uuid not null references public.task_categories(id) on delete cascade,
  name        text not null,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

alter table public.task_subcategories enable row level security;
create policy "All team can read subcategories"   on public.task_subcategories for select using (true);
create policy "All team can manage subcategories" on public.task_subcategories for all using (true);

-- ─── TASK SUB-SUBCATEGORIES ──────────────────────────────────────────────────
create table public.task_subsubcategories (
  id             uuid primary key default uuid_generate_v4(),
  subcategory_id uuid not null references public.task_subcategories(id) on delete cascade,
  name           text not null,
  sort_order     int default 0,
  created_at     timestamptz default now()
);

alter table public.task_subsubcategories enable row level security;
create policy "All team can read sub-subcategories"   on public.task_subsubcategories for select using (true);
create policy "All team can manage sub-subcategories" on public.task_subsubcategories for all using (true);

-- ─── TASKS ───────────────────────────────────────────────────────────────────
create type task_status   as enum ('To Do', 'In Progress', 'In Review', 'Done');
create type task_priority as enum ('Low', 'Medium', 'High');

create table public.tasks (
  id                  uuid primary key default uuid_generate_v4(),
  title               text not null,
  description         text,
  category_id         uuid references public.task_categories(id) on delete set null,
  subcategory_id      uuid references public.task_subcategories(id) on delete set null,
  subsubcategory_id   uuid references public.task_subsubcategories(id) on delete set null,
  assignee_id         uuid references public.profiles(id) on delete set null,
  created_by          uuid references public.profiles(id) on delete set null,
  status              task_status   default 'To Do',
  priority            task_priority default 'Medium',
  due_date            date,
  linked_diary_entry  uuid references public.diary_entries(id) on delete set null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.tasks enable row level security;
create policy "All team can read tasks"   on public.tasks for select using (true);
create policy "All team can manage tasks" on public.tasks for all using (true);

create index tasks_assignee_idx    on public.tasks(assignee_id);
create index tasks_category_idx    on public.tasks(category_id);
create index tasks_status_idx      on public.tasks(status);
create index tasks_created_at_idx  on public.tasks(created_at desc);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger tasks_updated_at before update on public.tasks
  for each row execute procedure public.set_updated_at();

create trigger diary_updated_at before update on public.diary_entries
  for each row execute procedure public.set_updated_at();


-- ─── TASK COMMENTS ───────────────────────────────────────────────────────────
create table public.task_comments (
  id         uuid primary key default uuid_generate_v4(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz default now()
);

alter table public.task_comments enable row level security;
create policy "All team can read comments"   on public.task_comments for select using (true);
create policy "Authors can manage comments"  on public.task_comments for all using (true);

create index task_comments_task_idx on public.task_comments(task_id);


-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
create type notif_type as enum ('assign', 'reassign', 'comment', 'status', 'email', 'whatsapp');

create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        notif_type not null,
  title       text not null,
  body        text,
  task_id     uuid references public.tasks(id) on delete cascade,
  read        boolean default false,
  created_at  timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "Users can read own notifications"   on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "Service role can insert notifications" on public.notifications for insert with check (true);

create index notifications_user_idx     on public.notifications(user_id, read);
create index notifications_created_idx  on public.notifications(created_at desc);


-- ─── SEED: Default categories ─────────────────────────────────────────────────
insert into public.task_categories (name, sort_order) values
  ('Credit & Underwriting', 1),
  ('Legal & Compliance', 2),
  ('Operations', 3);

-- Subcategories for Credit & Underwriting
with cat as (select id from public.task_categories where name = 'Credit & Underwriting')
insert into public.task_subcategories (category_id, name, sort_order)
  select cat.id, sub.name, sub.ord from cat,
  (values ('Document Review', 1), ('CRIF & Bureau', 2), ('Loan Appraisal', 3)) as sub(name, ord);

-- Subcategories for Legal & Compliance
with cat as (select id from public.task_categories where name = 'Legal & Compliance')
insert into public.task_subcategories (category_id, name, sort_order)
  select cat.id, sub.name, sub.ord from cat,
  (values ('Title Verification', 1), ('Compliance Checks', 2)) as sub(name, ord);

-- Subcategories for Operations
with cat as (select id from public.task_categories where name = 'Operations')
insert into public.task_subcategories (category_id, name, sort_order)
  select cat.id, sub.name, sub.ord from cat,
  (values ('Branch Setup', 1), ('Tech & Systems', 2), ('HR & Admin', 3)) as sub(name, ord);
