-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 005: Personal workspace flag
-- ───────────────────────────────────────────────────────────────────────────
-- Adds `is_personal` boolean to the `workspaces` table so a user's auto-
-- provisioned "Personal" workspace can be locked down:
--   * cannot be deleted
--   * cannot add/remove members (always sole-admin = creator)
--   * rename is still allowed (per UX discussion 2026-04-17)
--
-- Backfill: existing rows stay `false`. New Personal workspaces inserted by
-- /api/workspace GET set it to `true` explicitly.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.workspaces
  add column if not exists is_personal boolean not null default false;

-- Partial unique index: at most one personal workspace per creator.
create unique index if not exists workspaces_one_personal_per_user
  on public.workspaces(created_by)
  where is_personal = true;
