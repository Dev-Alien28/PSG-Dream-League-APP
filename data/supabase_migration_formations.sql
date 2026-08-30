-- ============================================================================
-- Migration : compositions tactiques premium
-- À exécuter une fois dans Supabase (Dashboard → SQL Editor → New query → Run)
-- ============================================================================

alter table public.profiles
  add column if not exists unlocked_formations jsonb not null
    default '["4-3-3","4-4-2","4-2-3-1","3-5-2","5-3-2"]'::jsonb;
