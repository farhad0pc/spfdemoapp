-- =============================================================================
-- Milestone v2.9.4: Corporate Users Profile Avatar Persistence
-- File: supabase/migrations/20261124_corporate_users_avatar.sql
-- =============================================================================

ALTER TABLE public.corporate_users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_storage_path TEXT;
