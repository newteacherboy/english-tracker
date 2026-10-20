-- 20 Oct 2026: every completed game run earns its reward again (approved rule:
-- "istediği kadar oyun oynasa da ödül verilir"). The best-of-day difference that paid
-- only an improvement for the same game/unit on the same day is removed from solo games
-- and Kelime Rallisi. Still in force: accuracy tiers, the daily multiplier
-- (x2 first 3 runs, x1 up to 12, x0.5 afterwards), the 172 XP game ceiling and
-- one reward per run ID. Existing receipts and balances are not changed.
begin;

CREATE OR REPLACE FUNCTION public.dm_solo_fair_claim(actor uuid, run_key text, game_code text, class_id integer, unit_ids integer[], right_count integer, wrong_count integer, duration_seconds numeric, boost_factor integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $fair$
declare earlier public.dm_game_reward_runs; raw jsonb; v jsonb;
 percentage integer; base_x int; base_g int; reduced_x int; reduced_g int; earned_x int:=0;earned_g int:=0;
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
 raw:=public.dm_game_reward_claim(actor,run_key,game_code,class_id,unit_ids,
    right_count,wrong_count,duration_seconds,false,1,
    case when boost_factor in (2,3,4) then boost_factor else 1 end);
 if not coalesce((raw->>'ok')::boolean,false) then raise exception 'Ödül doğrulanamadı';end if;
 if coalesce((raw->>'duplicate')::boolean,false) then return raw;end if;
 base_x:=coalesce((raw->>'xp')::int,0);base_g:=coalesce((raw->>'gold')::int,0);
 -- Every run pays its own accuracy-tier share; repeats are no longer reduced to the difference.
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
end $fair$;

CREATE OR REPLACE FUNCTION public.dm_rally_finish(actor uuid, run_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.dm_rally_runs;v jsonb;s jsonb;c int;w int;x int:=0;g int:=0;n int;speed int;daily numeric;secs numeric;ver bigint;result jsonb;st public.students;fair_percent int:=0;slow_count int:=0;slow_percent int:=0;day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 select * into st from public.students where id=actor for update;
 select * into r from public.dm_rally_runs where id=run_key and student_id=actor for update;
 if not found then raise exception 'Yarış bulunamadı.';end if;
 if r.reward is not null then return public.dm_rally_view(r);end if;
 s:=r.state;c:=(s->>'correct')::int;w:=(s->>'wrong')::int;secs:=greatest(1,(s->>'elapsed')::numeric);
 slow_count:=greatest(0,coalesce((s->>'slowed')::int,0));slow_percent:=least(45,slow_count*3);
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Hesap bilgileri hazır değil.';end if;
 if c>0 then
  select count(*)+1 into n from public.dm_game_reward_runs where student_id=actor and game_key<>'ba' and xp>0 and created_at>=day::date::timestamp at time zone 'Europe/Istanbul';
  daily:=case when n<=3 then 2 when n>12 then .5 else 1 end;
  speed:=round(c*600/(1+secs/c));x:=least(public.dm_game_xp_cap(),round(least(80,greatest(0,c*6+floor(speed/100.0)-w*3))*daily))::int;
  g:=case when x=0 then 0 else round((array[4,7,10])[case when c::numeric/(c+w)>=.8 then 3 when c::numeric/(c+w)>=.5 then 2 else 1 end]*daily) end;
 end if;
 fair_percent:=case when c=0 then 0 when c=15 and w=0 then 100
   when c>=12 and w<=1 then 80 when c>=8 then 60 else 35 end;
 x:=floor(x*fair_percent/100.0*(100-slow_percent)/100.0)::int;
 g:=floor(g*fair_percent/100.0*(100-slow_percent)/100.0)::int;
 insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values(actor,run_key::text,'ralli',r.class_no,r.units,x,g);
 if x>0 or g>0 then
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
  v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
  v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
  update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';update public.students set gold=(v->>'altin')::numeric where id=actor;
  select value into v from public.extra_data where student_id=actor and key_name='yo';
 end if;
 insert into public.game_scores(student_id,student_name,game_key,class_no,unit_no,unit_name,score,correct_count,wrong_count,duration_seconds,extra)
 values(actor,st.username,'ralli',r.class_no,r.units[1],array_to_string(r.units,','),(s->>'score')::int,c,w,ceil(secs)::int,jsonb_build_object('v',3,'speed',coalesce(speed,0),'run_id',run_key,'reward_protocol',1,'slowed',slow_count));
 if actor<>'dcde2026-1015-4000-8000-000000000001'::uuid then
 insert into public.feed_events(student_id,event_type,payload) values(actor,'game_score',jsonb_build_object('game_name','Kelime Rallisi','game_key','ralli','score',(s->>'score')::int,'icon','🏎️'));
 end if;
 result:=jsonb_build_object('xp',x,'gold',g,'reason',case when c=0 then 'no_correct' when x=0 and g=0 then 'no_correct' else 'awarded' end,'yo',v,'fairPercent',fair_percent,'slowCount',slow_count,'slowPercent',slow_percent,'fairTier',case fair_percent when 100 then 'perfect' when 80 then 'high' when 60 then 'pass' when 35 then 'practice' else 'none' end);
 update public.dm_rally_runs set status='finished',reward=result,finished_at=now() where id=run_key returning * into r;
 return public.dm_rally_view(r);
end $function$;

commit;
