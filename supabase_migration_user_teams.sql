-- ============================================================================
-- Migration : table user_teams
-- À exécuter une fois dans Supabase (Dashboard → SQL Editor → New query → Run)
--
-- Sert à sauvegarder l'équipe (formation + placement des cartes) construite
-- dans l'onglet Collection > Builder, pour qu'elle survive à un rafraîchissement
-- de page et soit réutilisée automatiquement pour les matchs.
-- ============================================================================

create table if not exists public.user_teams (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  formation  text not null default '4-3-3',
  slots      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_teams enable row level security;

-- Chaque utilisateur ne peut lire/écrire que sa propre équipe.
drop policy if exists "user_teams_select_own" on public.user_teams;
create policy "user_teams_select_own"
  on public.user_teams for select
  using (auth.uid() = user_id);

drop policy if exists "user_teams_insert_own" on public.user_teams;
create policy "user_teams_insert_own"
  on public.user_teams for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_teams_update_own" on public.user_teams;
create policy "user_teams_update_own"
  on public.user_teams for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
