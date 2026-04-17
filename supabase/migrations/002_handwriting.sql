-- ─────────────────────────────────────────────────────────────────────────────
-- Dhanam Workspace — Migration 002: Handwriting support for diary entries
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Add handwriting_url column to diary_entries
-- Stores a base64 PNG data URL of the handwritten drawing (nullable)
alter table public.diary_entries
  add column if not exists handwriting_url text;

-- Add entry_type to distinguish text vs drawing entries
alter table public.diary_entries
  add column if not exists entry_type text not null default 'text'
  check (entry_type in ('text', 'drawing', 'mixed'));
