-- ============================================================================
-- Migration : vente des doublons excédentaires (une fois l'Ω obtenue)
-- À exécuter une fois dans Supabase (Dashboard → SQL Editor → New query → Run)
-- ============================================================================

create or replace function public.sell_card_duplicates(
  p_user_id uuid,
  p_base_card_id text,
  p_rarity text,
  p_quantity int default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price int;
  v_has_omega boolean;
  v_sellable_ids uuid[];
  v_to_sell int;
  v_gain int;
begin
  if p_user_id is distinct from auth.uid() then
    return jsonb_build_object('success', false, 'error', 'unauthorized');
  end if;

  v_price := case p_rarity
    when 'Basic' then 50
    when 'Advanced' then 100
    when 'Elite' then 200
    else null
  end;
  if v_price is null then
    return jsonb_build_object('success', false, 'error', 'not_sellable');
  end if;

  -- On ne peut vendre les classiques d'une carte que si son Ω est déjà en poche.
  select exists(
    select 1 from public.owned_cards
    where user_id = p_user_id and base_card_id = p_base_card_id and grade = 'omega'
  ) into v_has_omega;

  if not v_has_omega then
    return jsonb_build_object('success', false, 'error', 'no_omega');
  end if;

  select array_agg(owned_id) into v_sellable_ids
  from public.owned_cards
  where user_id = p_user_id and base_card_id = p_base_card_id and grade is null;

  if v_sellable_ids is null or array_length(v_sellable_ids, 1) = 0 then
    return jsonb_build_object('success', false, 'error', 'none');
  end if;

  v_to_sell := array_length(v_sellable_ids, 1);
  if p_quantity is not null then
    v_to_sell := least(p_quantity, v_to_sell);
  end if;

  delete from public.owned_cards
  where owned_id = any(v_sellable_ids[1:v_to_sell]);

  v_gain := v_to_sell * v_price;

  update public.profiles set coins = coins + v_gain where id = p_user_id;

  return jsonb_build_object('success', true, 'sold', v_to_sell, 'gain', v_gain);
end;
$$;

grant execute on function public.sell_card_duplicates(uuid, text, text, int) to authenticated;
