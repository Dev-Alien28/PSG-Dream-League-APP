-- ============================================================================
-- Migration : jalons (récompense une carte Cadeau une seule fois par jalon)
-- À exécuter une fois dans Supabase (Dashboard → SQL Editor → New query → Run)
-- ============================================================================

alter table public.profiles
  add column if not exists claimed_milestones jsonb not null default '[]'::jsonb;

create or replace function public.claim_milestone(
  p_user_id uuid,
  p_milestone_key text,
  p_card_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed jsonb;
begin
  if p_user_id is distinct from auth.uid() then
    return jsonb_build_object('success', false, 'error', 'unauthorized');
  end if;

  select claimed_milestones into v_claimed from public.profiles where id = p_user_id;

  if v_claimed is not null and v_claimed @> to_jsonb(p_milestone_key) then
    return jsonb_build_object('success', false, 'error', 'already_claimed');
  end if;

  update public.profiles
  set claimed_milestones = coalesce(claimed_milestones, '[]'::jsonb) || to_jsonb(p_milestone_key)
  where id = p_user_id;

  insert into public.owned_cards (user_id, card_id, base_card_id, pack_source, obtained_at)
  values (p_user_id, p_card_id, p_card_id, 'milestone', now());

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.claim_milestone(uuid, text, text) to authenticated;
