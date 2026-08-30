-- ============================================================================
-- Migration : colonnes Boutique (boosts + couleurs d'équipe)
-- À exécuter une fois dans Supabase (Dashboard → SQL Editor → New query → Run)
-- ============================================================================

alter table public.profiles
  add column if not exists boost_expires_at timestamptz,
  add column if not exists unlocked_colors jsonb not null default '["rouge","bleu"]'::jsonb,
  add column if not exists selected_color text not null default 'rouge';
