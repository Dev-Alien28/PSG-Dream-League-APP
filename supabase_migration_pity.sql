-- ============================================================================
-- Migration : pity system (garantie Legend)
-- À exécuter une fois dans Supabase (Dashboard → SQL Editor → New query → Run)
-- ============================================================================

alter table public.profiles
  add column if not exists pity_legend integer not null default 0;
