-- ============================================================================
-- Migration : système de grade / craft (améliorations par doublons)
-- À exécuter une fois dans Supabase (Dashboard → SQL Editor → New query → Run)
-- ============================================================================

alter table public.owned_cards
  add column if not exists base_card_id text,
  add column if not exists grade text,
  add column if not exists stat_bonus integer not null default 0;

-- Rétrocompatibilité : les cartes déjà en base avant cette migration n'ont pas
-- encore de base_card_id — on le fait pointer sur card_id (grade = classique).
update public.owned_cards
set base_card_id = card_id
where base_card_id is null;

-- ── Fonction de craft atomique ──────────────────────────────────────────────
-- Consomme `p_need_count` doublons identiques (même base_card_id + même grade
-- source) et les remplace par UNE carte au palier supérieur, avec +1 sur le
-- bonus de stats cumulé. Tout se passe dans une seule transaction : soit les
-- doublons sont consommés ET la carte améliorée est créée, soit rien ne
-- change (contrairement à deux appels séparés depuis le client, qui
-- risqueraient de perdre les cartes si le deuxième appel échoue).
create or replace function public.craft_card_upgrade(
  p_user_id uuid,
  p_base_card_id text,
  p_source_grade text,
  p_next_grade text,
  p_need_count int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_card_id text;
  v_pack_source text;
  v_stat_bonus int;
begin
  -- ⚠️ security definer bypasse la RLS : on vérifie donc nous-mêmes que
  -- l'appelant ne peut agir que sur SA PROPRE collection.
  if p_user_id is distinct from auth.uid() then
    return jsonb_build_object('success', false, 'error', 'unauthorized');
  end if;

  select array_agg(owned_id), min(card_id), min(pack_source), min(stat_bonus)
  into v_ids, v_card_id, v_pack_source, v_stat_bonus
  from (
    select owned_id, card_id, pack_source, stat_bonus
    from public.owned_cards
    where user_id = p_user_id
      and base_card_id = p_base_card_id
      and ((p_source_grade is null and grade is null) or grade = p_source_grade)
    limit p_need_count
  ) sub;

  if v_ids is null or array_length(v_ids, 1) < p_need_count then
    return jsonb_build_object('success', false, 'error', 'not_enough_duplicates');
  end if;

  delete from public.owned_cards where owned_id = any(v_ids);

  insert into public.owned_cards (user_id, card_id, base_card_id, grade, stat_bonus, pack_source, obtained_at)
  values (p_user_id, v_card_id, p_base_card_id, p_next_grade, coalesce(v_stat_bonus, 0) + 1, v_pack_source, now());

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.craft_card_upgrade(uuid, text, text, text, int) to authenticated;
