-- Deployed to Supabase project nxfqlutulxqzqgwewssd on 2026-11-21.
-- Public, aggregated duel rankings only: no player IDs, tokens or raw answers.
create or replace function public.dm_duel_champions_v1(p_limit integer default 10)
returns table(player_name text, wins bigint, losses bigint, duel_xp bigint)
language sql stable security definer set search_path = ''
as $$
with sides as (
 select host_id as player_id, nullif(trim(host_name),'') as player_name,
 (outcome='host')::int as win,(outcome='guest')::int as loss,
 case when (host_reward->>'xp') ~ '^[0-9]+$' then least((host_reward->>'xp')::bigint,10000) else 0 end as earned
 from public.dm_live_duels where status='finished' and host_id is not null and outcome in ('host','guest','draw')
 union all
 select guest_id,nullif(trim(guest_name),''),
 (outcome='guest')::int,(outcome='host')::int,
 case when (guest_reward->>'xp') ~ '^[0-9]+$' then least((guest_reward->>'xp')::bigint,10000) else 0 end
 from public.dm_live_duels where status='finished' and guest_id is not null and outcome in ('host','guest','draw')
)
select coalesce(max(player_name),'Oyuncu'),sum(win)::bigint,sum(loss)::bigint,sum(earned)::bigint
from sides where player_name is not null group by player_id
order by sum(earned) desc,sum(win) desc,sum(loss) asc
limit least(greatest(coalesce(p_limit,10),1),50)
$$;
revoke all on function public.dm_duel_champions_v1(integer) from public;
grant execute on function public.dm_duel_champions_v1(integer) to anon,authenticated,service_role;
