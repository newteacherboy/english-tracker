-- Adaptive fair XP/gold across solo games. Does not touch previous awards.
-- Existing server claim runs inside this transaction and remains exactly-once.
begin;
create or replace function public.dm_solo_fair_percent(
 game_code text, right_count integer, wrong_count integer
) returns integer language plpgsql immutable set search_path='' as $policy$
declare effective_errors numeric; accuracy numeric;
begin
 if game_code not in ('ky','jp','bosluk','hafiza','yagmur','asmaca','kelimebul',
 'eslestirme','tren','dikte','cumle','harfbahcesi','kp')
 or right_count not between 0 and 12 or wrong_count not between 0 and 10000
 then raise exception 'Geçersiz tek kişilik oyun skoru';end if;
 if right_count=0 then return 0;end if;
 -- Trying many cards in memory is not the same as answering a question wrong.
 effective_errors:=case
  when game_code in ('hafiza','eslestirme') then wrong_count*.40
  when game_code in ('asmaca','harfbahcesi','kelimebul') then wrong_count*.60
  else wrong_count::numeric end;
 accuracy:=right_count/(right_count+effective_errors);
 -- Short or prematurely-ended games may still earn something, but cannot
 -- receive the same premium as an accurate and complete performance.
 if right_count>=6 and accuracy>=.97 then return 100;end if;
 if right_count>=5 and accuracy>=.80 then return 80;end if;
 if right_count>=3 and accuracy>=.60 then return 60;end if;
 return 35;
end $policy$;

create or replace function public.dm_solo_fair_claim(
 actor uuid, run_key text, game_code text, class_id integer, unit_ids integer[],
 right_count integer, wrong_count integer, duration_seconds numeric, boost_factor integer
) returns jsonb language plpgsql set search_path='' as $fair$
declare earlier public.dm_game_reward_runs; raw jsonb; v jsonb;
 percentage integer; base_x int; base_g int; reduced_x int; reduced_g int;
 ver bigint; day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 if actor is null or run_key is null or length(run_key) not between 8 and 100
 or game_code not in ('ky','jp','bosluk','hafiza','yagmur','asmaca','kelimebul','eslestirme',
  'tren','dikte','cumle','harfbahcesi','kp')
 or class_id not between 0 and 12 or cardinality(unit_ids) not between 1 and 20
 or exists(select 1 from unnest(unit_ids) x where x is null or x not between 0 and 100)
 or duration_seconds is null or duration_seconds<=0 or duration_seconds>86400
 or right_count not between 0 and 12 or wrong_count not between 0 and 10000
 then raise exception 'Geçersiz adil oyun sonucu';end if;
 perform 1 from public.students where id=actor for update;
 select * into earlier from public.dm_game_reward_runs
 where student_id=actor and run_id=run_key for update;
 if found then
  select value into v from public.extra_data where student_id=actor and key_name='yo';
  return jsonb_build_object('ok',true,'duplicate',true,'reason','duplicate',
   'xp',earlier.xp,'gold',earlier.gold,'yo',v);
 end if;
 percentage:=public.dm_solo_fair_percent(game_code,right_count,wrong_count);
 -- Preserve current daily cap, game difficulty, purchase bonuses, reward ledger.
 raw:=public.dm_game_reward_claim(actor,run_key,game_code,class_id,unit_ids,
    right_count,wrong_count,duration_seconds,false,1,
    case when boost_factor in (2,3,4) then boost_factor else 1 end);
 if not coalesce((raw->>'ok')::boolean,false) then raise exception 'Ödül doğrulanamadı';end if;
 if coalesce((raw->>'duplicate')::boolean,false) then return raw;end if;
 base_x:=coalesce((raw->>'xp')::int,0);base_g:=coalesce((raw->>'gold')::int,0);
 reduced_x:=base_x-floor(base_x*percentage/100.0)::int;
 reduced_g:=base_g-floor(base_g*percentage/100.0)::int;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Öğrenci cüzdanı bulunamadı';end if;
 if reduced_x>0 or reduced_g>0 then
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,
   coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',greatest(0,coalesce((v->>'totalXp')::numeric,0)-reduced_x),
   'altin',greatest(0,coalesce((v->>'altin')::numeric,0)-reduced_g),
   'guncelleme',ver,'dmRewardVersion',ver);
  if v#>>'{xpGun,tarih}'=day then
   v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(greatest(0,coalesce((v#>>'{xpGun,xp}')::numeric,0)-reduced_x)));
  end if;
  v:=jsonb_set(v,array['log',day],to_jsonb(greatest(0,
   coalesce((v#>>array['log',day])::numeric,0)-reduced_x)),true);
  update public.extra_data set value=v,updated_at=now()
   where student_id=actor and key_name='yo';
  update public.students set gold=(v->>'altin')::numeric where id=actor;
  update public.dm_game_reward_runs set xp=base_x-reduced_x,gold=base_g-reduced_g
   where student_id=actor and run_id=run_key;
 end if;
 return raw||jsonb_build_object('xp',base_x-reduced_x,'gold',base_g-reduced_g,
  'yo',v,'fairPercent',percentage,'fairTier',case percentage
     when 100 then 'perfect' when 80 then 'high' when 60 then 'pass'
     when 35 then 'practice' else 'none' end);
end $fair$;
revoke all on function public.dm_solo_fair_percent(text,integer,integer) from public,anon,authenticated;
revoke all on function public.dm_solo_fair_claim(uuid,text,text,integer,integer[],integer,integer,numeric,integer) from public,anon,authenticated;
grant execute on function public.dm_solo_fair_percent(text,integer,integer) to service_role;
grant execute on function public.dm_solo_fair_claim(uuid,text,text,integer,integer[],integer,integer,numeric,integer) to service_role;
commit;
