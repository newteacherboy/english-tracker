-- Papi Hazine Avı (Papi Treasure Hunt) — 6-Island 100-Level Progress & Anti-Farm Reward Schema
-- Launch: 2026-12-10 19:00+03:00 (Islands 1–3 Free, Islands 4–6 Premium Pro).

create table if not exists public.papi_treasure_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  explorer_xp integer not null default 0 check (explorer_xp >= 0),
  total_stars integer not null default 0 check (total_stars >= 0),
  completed_levels jsonb not null default '{}'::jsonb,
  collectibles text[] not null default '{}'::text[],
  badges text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

alter table public.papi_treasure_progress enable row level security;

drop policy if exists "papi_treasure_select_own" on public.papi_treasure_progress;
create policy "papi_treasure_select_own"
  on public.papi_treasure_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.claim_papi_treasure_level(
  p_level_id text,
  p_stars integer,
  p_is_perfect boolean,
  p_collectible_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.papi_treasure_progress;
  v_prev jsonb;
  v_island_no integer;
  v_level_no integer;
  v_max_levels integer;
  v_first_claimed boolean := false;
  v_perfect_claimed boolean := false;
  v_prev_stars integer := 0;
  v_xp_add integer := 0;
  v_star_delta integer := 0;
  v_new_levels jsonb;
  v_new_collectibles text[];
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_level_id !~ '^island[1-6]_level[0-9]{1,2}$' then
    raise exception 'Invalid level id format: %', p_level_id;
  end if;

  v_island_no := substring(p_level_id from 'island([1-6])_')::integer;
  v_level_no  := substring(p_level_id from '_level([0-9]{1,2})$')::integer;
  v_max_levels := case v_island_no
    when 1 then 10
    when 2 then 15
    when 3 then 15
    else 20
  end;

  if v_level_no < 1 or v_level_no > v_max_levels then
    raise exception 'Out of range level number for island %: %', v_island_no, v_level_no;
  end if;

  p_stars := greatest(0, least(p_stars, 8));

  insert into public.papi_treasure_progress (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select * into v_row
  from public.papi_treasure_progress
  where user_id = v_uid
  for update;

  v_prev := coalesce(v_row.completed_levels -> p_level_id, '{}'::jsonb);
  v_first_claimed := coalesce((v_prev ->> 'firstClearXpClaimed')::boolean, false);
  v_perfect_claimed := coalesce((v_prev ->> 'perfectXpClaimed')::boolean, false);
  v_prev_stars := coalesce((v_prev ->> 'bestStars')::integer, 0);

  if not v_first_claimed then
    v_xp_add := v_xp_add + 10;
  end if;
  if p_is_perfect and not v_perfect_claimed then
    v_xp_add := v_xp_add + 5;
  end if;

  v_star_delta := greatest(0, p_stars - v_prev_stars);

  v_new_levels := jsonb_set(
    v_row.completed_levels,
    array[p_level_id],
    jsonb_build_object(
      'firstClearXpClaimed', true,
      'perfectXpClaimed', (v_perfect_claimed or p_is_perfect),
      'bestStars', greatest(v_prev_stars, p_stars),
      'attempts', coalesce((v_prev ->> 'attempts')::integer, 0) + 1
    ),
    true
  );

  v_new_collectibles := v_row.collectibles;
  if p_collectible_id is not null and length(p_collectible_id) <= 48 and not (p_collectible_id = any(v_new_collectibles)) then
    v_new_collectibles := array_append(v_new_collectibles, p_collectible_id);
  end if;

  update public.papi_treasure_progress
  set
    explorer_xp = explorer_xp + v_xp_add,
    total_stars = total_stars + v_star_delta,
    completed_levels = v_new_levels,
    collectibles = v_new_collectibles,
    updated_at = now()
  where user_id = v_uid;

  return jsonb_build_object(
    'xpAwarded', v_xp_add,
    'starDelta', v_star_delta,
    'levelId', p_level_id
  );
end;
$$;

revoke all on function public.claim_papi_treasure_level(text, integer, boolean, text) from public;
grant execute on function public.claim_papi_treasure_level(text, integer, boolean, text) to authenticated;
