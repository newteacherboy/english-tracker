-- Retire game jokers, shop consumables and manual Candy boosters.
-- Preserve balances, energy, progression, shields and purchase history.

CREATE OR REPLACE FUNCTION public.dm_progress_purchase(actor uuid, item_key text, is_showcase boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare ctx jsonb; v jsonb; o public.dm_progress_items; f int; x jsonb; owns jsonb; first_purchase boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(actor::text,17));ctx:=public.dm_progress_context(actor);v:=ctx->'yo';
 select * into o from public.dm_progress_items where id=item_key;if not found then raise exception 'Ürün bulunamadı';end if;
 if (ctx->>'level')::int<o.minimum_level then raise exception 'Ürün % . seviyede açılır',o.minimum_level;end if;
 if o.owned_keys<@coalesce(v#>'{karakter,sahip}','[]') then raise exception 'Bu ürüne zaten sahipsin';end if;
 if nullif(v#>>'{karakter,cins}','') is null then raise exception 'Önce avatarını seç';end if;
 first_purchase:=not coalesce((v->>'dolapIlkIndirimKullanildi')::boolean,false) and coalesce(v->'dolapIlkAlim','{}')='{}'::jsonb;
 f:=case when first_purchase then floor(o.price*.75+.5)::int when is_showcase then floor(o.price*.7+.5)::int else o.price end;
 v:=public.dm_progress_credit(actor,-f);
  select jsonb_agg(distinct e) into owns from jsonb_array_elements(coalesce(v#>'{karakter,sahip}','[]')||o.owned_keys) e;
  v:=jsonb_set(v,'{karakter,sahip}',owns);v:=jsonb_set(v,'{karakter,s}',coalesce(v#>'{karakter,s}','{}')||o.style);v:=jsonb_set(v,'{dolapIlkIndirimKullanildi}','true');
 update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
 insert into public.dm_progress_rewards(student_id,kind,reward_key,gold) values(actor,'purchase',item_key||':'||gen_random_uuid()::text,-f);
 return jsonb_build_object('price',f,'yo',v);
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_pwm_status(actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare u public.dm_premium_match_usage; st public.students; prem boolean;
begin
  select * into st from public.students where id=actor and status='approved' and role='student';
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  insert into public.dm_premium_match_usage(student_id) values(actor) on conflict(student_id) do nothing;
  select * into u from public.dm_premium_match_usage where student_id=actor;
  prem:=public.dm_pwm_is_premium(actor);
  return jsonb_build_object('ok',true,'plan',public.dm_plan(actor,'student'),'premium',prem,'freeUsed',u.free_used,'remaining',case when prem then 999 when public.dm_plan(actor,'student')='pro' then greatest(0,5-public.dm_pwm_today_runs(actor)) else greatest(0,3-u.free_used) end,
    'level',u.level_no,'stars',u.stars,'energy',public.dm_pwm_energy(st),'energyMax',st.energy_max,'gold',st.gold);
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_ranked_game_reward(game_code text, base_x numeric, base_g numeric, daily numeric, xp_boost numeric DEFAULT 1, gold_boost numeric DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare limits jsonb; x int; g int;
begin
 limits:=public.dm_reward_limits(game_code);
 if limits is null then raise exception 'Unknown reward game: %',game_code;end if;
 if base_x is null or base_g is null or daily is null or xp_boost is null or gold_boost is null
 or base_x<0 or base_g<0 or daily not in (.5,1,2) or xp_boost not in (1,2) or gold_boost not in (1,2)
 then raise exception 'Invalid reward factors';end if;
 x:=least((limits->>'xp')::int,round(least(80,base_x)*daily*(limits->>'xp')::numeric/160))::int;
 g:=case when x=0 then 0 else least((limits->>'gold')::int,round(least(10,base_g)*daily*(limits->>'gold')::numeric/20))::int end;
 return jsonb_build_object('xp',x,'gold',g);
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_solo_fair_claim(actor uuid, run_key text, game_code text, class_id integer, unit_ids integer[], right_count integer, wrong_count integer, duration_seconds numeric, boost_factor integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare earlier public.dm_game_reward_runs; raw jsonb; v jsonb;
 percentage integer; base_x int; base_g int; reduced_x int; reduced_g int; earned_x int:=0;earned_g int:=0;
 ver bigint; day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 if actor is null or run_key is null or length(run_key) not between 8 and 100
 or game_code not in ('ky','jp','bosluk','hafiza','yagmur','asmaca','kelimebul','eslestirme',
  'tren','dikte','cumle','harfbahcesi','canavar','kule','fener','kp')
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
 if exists(select 1 from public.dm_verified_runs where student_id=actor and run_id=run_key and ranking_only) then select value into v from public.extra_data where student_id=actor and key_name='yo';return jsonb_build_object('ok',true,'xp',0,'gold',0,'reason','ranking_only','yo',v);end if;
 percentage:=public.dm_solo_fair_percent(game_code,right_count,wrong_count);
 raw:=public.dm_game_reward_claim(actor,run_key,game_code,class_id,unit_ids,
    right_count,wrong_count,duration_seconds,false,1,
    1);
 if not coalesce((raw->>'ok')::boolean,false) then raise exception 'Ödül doğrulanamadı';end if;
 if coalesce((raw->>'duplicate')::boolean,false) then return raw;end if;
 base_x:=coalesce((raw->>'xp')::int,0);base_g:=coalesce((raw->>'gold')::int,0);
 earned_x:=floor(base_x*percentage/100.0)::int;
 earned_g:=floor(base_g*percentage/100.0)::int;
 reduced_x:=base_x-earned_x;
 reduced_g:=base_g-earned_g;
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
 return raw||jsonb_build_object('xp',earned_x,'gold',earned_g,
  'yo',v,'reason',case when earned_x>0 or earned_g>0 then 'awarded' else 'no_correct' end,
  'fairPercent',percentage,'fairTier',case percentage
     when 100 then 'perfect' when 80 then 'high' when 60 then 'pass'
     when 35 then 'practice' else 'none' end);
end $function$
;
DELETE FROM public.dm_progress_items WHERE id='extra-joker';
DROP FUNCTION public.dm_pwm_booster(uuid,text,text,uuid);
ALTER TABLE public.dm_premium_match_usage DROP COLUMN boosters;
-- Strip retired inventory even when an old client sends a cached wallet.
CREATE OR REPLACE FUNCTION public.dm_strip_retired_game_inventory()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $function$
begin
 new.value := new.value - ARRAY['jokerEnv','jokerStok','dmExtraJoker'];
 return new;
end $function$;
REVOKE ALL ON FUNCTION public.dm_strip_retired_game_inventory() FROM PUBLIC;
CREATE TRIGGER zz_dm_strip_retired_game_inventory
BEFORE INSERT OR UPDATE OF value ON public.extra_data
FOR EACH ROW WHEN (new.key_name='yo' AND new.value ?| ARRAY['jokerEnv','jokerStok','dmExtraJoker'])
EXECUTE FUNCTION public.dm_strip_retired_game_inventory();
UPDATE public.extra_data SET value=value-ARRAY['jokerEnv','jokerStok','dmExtraJoker']
WHERE key_name='yo' AND jsonb_typeof(value)='object' AND value ?| ARRAY['jokerEnv','jokerStok','dmExtraJoker'];
