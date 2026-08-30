-- ============================================================================
-- Migration : affiches d'équipe (fonds de la composition)
-- À exécuter une fois dans Supabase (Dashboard → SQL Editor → New query → Run)
-- ============================================================================

alter table public.profiles
  add column if not exists unlocked_affiches jsonb not null default '["defaut"]'::jsonb,
  add column if not exists selected_affiche text not null default 'defaut';
