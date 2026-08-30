-- ============================================================================
-- Migration : anti-spam serveur pour les récompenses du chat
-- À exécuter une fois dans Supabase (Dashboard → SQL Editor → New query → Run)
--
-- Avant cette migration, le délai de 10s entre deux gains de coins par
-- message de chat n'était vérifié que côté client (dans le composant React).
-- N'importe qui pouvait appeler la même requête directement (ex: console du
-- navigateur) pour contourner ce délai et farmer des coins à l'infini.
-- Cette fonction vérifie le délai côté serveur, ce qui rend ça impossible.
-- ============================================================================

alter table public.profiles
  add column if not exists last_chat_reward_at timestamptz;

create or replace function public.reward_chat_message(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
  v_boost_expires timestamptz;
  v_base_amount int := 5; -- doit correspondre à COIN_REWARDS.CHAT_MESSAGE côté client
  v_amount int;
begin
  if p_user_id is distinct from auth.uid() then
    return jsonb_build_object('success', false, 'error', 'unauthorized');
  end if;

  select last_chat_reward_at, boost_expires_at
  into v_last, v_boost_expires
  from public.profiles
  where id = p_user_id;

  if v_last is not null and now() - v_last < interval '10 seconds' then
    return jsonb_build_object('success', false, 'error', 'rate_limited');
  end if;

  v_amount := v_base_amount;
  if v_boost_expires is not null and v_boost_expires > now() then
    v_amount := v_amount * 2;
  end if;

  update public.profiles
  set coins = coins + v_amount,
      last_chat_reward_at = now()
  where id = p_user_id;

  return jsonb_build_object('success', true, 'amount', v_amount);
end;
$$;

grant execute on function public.reward_chat_message(uuid) to authenticated;
