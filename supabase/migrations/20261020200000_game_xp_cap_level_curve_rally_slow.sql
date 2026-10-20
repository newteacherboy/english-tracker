-- 20 Oct 2026 balance update (additive; earned XP, gold and receipts are never changed).
-- 1) A game run can never earn more than the best parkur stop minus 20 XP.
--    Parkur stop maximum: 192 XP  ->  game run maximum: 172 XP (after daily bonus and boosts).
--    Game base cap 96 -> 80 so the daily x2 bonus (160) stays below the cap; a purchased
--    XP boost can lift a run to the 172 ceiling but never past it.
-- 2) After level 30 every level needs clearly more XP: +2400, +2800 ... +6000 (level 40 = 68 950 XP).
-- 3) Kelime Rallisi: answers given while the learner slowed the road down pay less
--    (every slowed question removes 3 % of the run reward, at most 45 %).
-- 4) Demo account dijimedu_demo: new password and a valid starting-test record so no
--    level-test requirement can ever block it.
begin;

create or replace function public.dm_student_level(x numeric) returns integer
language sql immutable set search_path='' as $$
select count(*)::int from unnest(array[0,40,100,180,300,480,720,1040,1450,1950,2550,3250,4050,4950,5950,7000,8100,9250,10450,11700,13000,14350,15750,17200,18700,20250,21850,23500,25200,26950,29350,32150,35350,38950,42950,47350,52150,57350,62950,68950]) t where t<=greatest(0,coalesce(x,0));$$;

create or replace function public.dm_game_xp_cap() returns integer
language sql immutable set search_path='' as $$ select 172 $$; -- parkur max (192) - 20

CREATE OR REPLACE FUNCTION public.dm_game_reward_claim(actor uuid, run_key text, game text, class_id integer, unit_ids integer[], correct integer, wrong integer, seconds numeric, first_clear boolean DEFAULT false, stars integer DEFAULT 1, boost integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v jsonb; previous public.dm_game_reward_runs; t timestamptz; n int; x int:=0;g int:=0;speed int;daily numeric;fac int;ver bigint;day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');reason text:='awarded';deadline timestamptz;
begin
 if game is null or class_id is null or unit_ids is null or correct is null or wrong is null or seconds is null or run_key is null or length(run_key) not between 8 and 100 or game not in ('ky','jp','bosluk','hafiza','yagmur','asmaca','kelimebul','eslestirme','tren','dikte','cumle','harfbahcesi','kp','ba') or class_id not between 0 and 12 or cardinality(unit_ids) not between 1 and 20 or exists(select 1 from unnest(unit_ids) u where u is null or u not between 0 and (case when game='ba' then 300000 else 100 end)) or correct not between 0 and (case when game='ba' then 32 else 12 end) or wrong not between 0 and 10000 or seconds<=0 or seconds>86400 then raise exception 'Geçersiz oyun sonucu';end if;
 -- Convert cached unit-scoped parkur claims to the first section only.
 if game='ba' and unit_ids[1]<1000 then unit_ids:=array[200000+class_id*10000+unit_ids[1]*100+1];end if;
 perform 1 from public.students where id=actor for update;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;if v is null then raise exception 'Öğrenci verisi gerekli';end if;
 select * into previous from public.dm_game_reward_runs where student_id=actor and run_id=run_key;
 if found then return jsonb_build_object('ok',true,'duplicate',true,'xp',previous.xp,'gold',previous.gold,'reason','duplicate','yo',v);end if;
 -- Parkur (ba): her yeni durak bağımsızdır; günlük/24 saat sınırı uygulanmaz.
 -- Sadece ilk başarılı tamamlama ödüllüdür. Aynı durak bir daha XP/altın vermez.
 if game='ba' then
  if correct<7 then reason:='no_correct';
  elsif exists(
    select 1 from public.dm_game_reward_runs
    where student_id=actor and game_key='ba' and class_no=class_id
      and (units&&unit_ids or (unit_ids[1]%100 between 51 and 99 and units @> array[(unit_ids[1]/100)*100+(unit_ids[1]%100-51)/3+1])) and xp>0
  ) then reason:='already_completed';
  else
   -- Parkur stop maximum stays 192 XP / 40 gold.
   speed:=round(12000/(120+seconds));
   x:=least(192,round(192*least(1,correct::numeric/12)*(0.7+0.3*least(1,speed::numeric/100))));
   g:=case when x<=0 then 0 else least(40,round(40*least(1,correct::numeric/12)*(0.7+0.3*least(1,speed::numeric/100)))) end;
  end if;
 else
  -- Every completed solo run may earn rewards; duplicate run IDs remain idempotent.
  -- A game run is always worth less than a parkur stop: hard ceiling dm_game_xp_cap() (172).
  if correct=0 then reason:='no_correct';else
   select count(*)+1 into n from public.dm_game_reward_runs where student_id=actor and game_key<>'ba' and xp>0 and to_char(created_at at time zone 'Europe/Istanbul','YYYY-MM-DD')=day;
   daily:=case when n<=3 then 2 when n>12 then .5 else 1 end;
   fac:=case when public.dm_student_level(coalesce((v->>'totalXp')::numeric,0))>=15 and boost in (2,3) then 2 else 1 end;
   speed:=round(correct*600/(1+seconds/correct));
   x:=least(public.dm_game_xp_cap(),round(least(80,greatest(0,correct*6+floor(speed/100.0)-wrong*3))*daily*fac))::int;
   g:=case when x=0 then 0 else round((array[4,7,10])[case when correct::numeric/(correct+wrong)>=.8 then 3 when correct::numeric/(correct+wrong)>=.5 then 2 else 1 end]*daily*case when public.dm_student_level(coalesce((v->>'totalXp')::numeric,0))>=15 and boost in (2,4) then 2 else 1 end) end;
  end if;
 end if;
 if game='ba' and correct>=7 then
  insert into public.level_completions(student_id,mode,class_no,unit_no,level_no)
  values(actor,'buyu',0,0,unit_ids[1])
  on conflict(student_id,mode,class_no,unit_no,level_no) do nothing;
 end if;
 insert into public.dm_game_reward_runs values(actor,run_key,game,class_id,unit_ids,x,g,now());
 if x>0 or g>0 then
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
  v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
  v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
  update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';update public.students set gold=(v->>'altin')::numeric where id=actor;
  select value into v from public.extra_data where student_id=actor and key_name='yo';
 end if;
 return jsonb_build_object('ok',true,'xp',x,'gold',g,'reason',reason,'nextRewardAt',deadline,'yo',v);
end $function$;

-- Rally answer with the in-game slow-down flag. The old 4-argument form stays for
-- older clients/functions and counts as "not slowed".
CREATE OR REPLACE FUNCTION public.dm_rally_answer(actor uuid, run_key uuid, round_no integer, lane integer, slowed boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.dm_rally_runs;s jsonb;q jsonb;right_answer boolean;delta int;elapsed numeric;combo int;hearts int;last jsonb;
begin
 perform 1 from public.students where id=actor for update;
 select * into r from public.dm_rally_runs where id=run_key and student_id=actor for update;
 if not found then raise exception 'Yarış bulunamadı.';end if;
 if (r.state->>'hearts')::int<=0 and r.status='playing' then return public.dm_rally_finish(actor,run_key);end if;
 if r.status='finished' or round_no<(r.state->>'index')::int then return public.dm_rally_view(r);end if;
 if round_no is null or round_no<>(r.state->>'index')::int or lane is null or lane not between 0 and 2 then raise exception 'Geçerli kelime kapısını seç.';end if;
 elapsed:=extract(epoch from clock_timestamp()-r.round_at);
 if elapsed<2 then raise exception 'Kelime kapısına henüz ulaşmadın.';end if;
 if now()-r.created_at>interval '4 hours' then return public.dm_rally_finish(actor,run_key);end if;
 q:=r.deck->round_no;right_answer:=lane=(q->>'answer')::int;s:=r.state;
 delta:=case when right_answer then 100+greatest(0,least(40,round(50-least(60,elapsed)*3)::int)) else -40 end;
 -- A slowed question earns a smaller race score as well.
 if coalesce(slowed,false) and right_answer then delta:=round(delta*.7)::int;end if;
 combo:=case when right_answer then (s->>'combo')::int+1 else 0 end;hearts:=(s->>'hearts')::int-case when right_answer then 0 else 1 end;
 last:=jsonb_build_object('round',round_no,'correct',right_answer,'answer',q->'options'->(q->>'answer')::int,'word',q->'word','en',q->'en','tr',q->'tr','lane',lane,'correctLane',(q->>'answer')::int,'delta',delta,'slowed',coalesce(slowed,false));
 s:=s||jsonb_build_object('index',round_no+1,'correct',(s->>'correct')::int+case when right_answer then 1 else 0 end,'wrong',(s->>'wrong')::int+case when right_answer then 0 else 1 end,'hearts',hearts,'score',greatest(0,(s->>'score')::int+delta),'combo',combo,'bestCombo',greatest((s->>'bestCombo')::int,combo),'elapsed',(s->>'elapsed')::numeric+elapsed,'slowed',coalesce((s->>'slowed')::int,0)+case when coalesce(slowed,false) then 1 else 0 end,'last',last,'answers',(s->'answers')||jsonb_build_array(last));
 update public.dm_rally_runs set state=s,round_at=clock_timestamp() where id=run_key returning * into r;
 if round_no+1>=jsonb_array_length(r.deck) or hearts<=0 then return public.dm_rally_finish(actor,run_key);end if;
 return public.dm_rally_view(r);
end $function$;

CREATE OR REPLACE FUNCTION public.dm_rally_answer(actor uuid, run_key uuid, round_no integer, lane integer)
 RETURNS jsonb LANGUAGE sql SET search_path TO ''
AS $function$ select public.dm_rally_answer(actor,run_key,round_no,lane,false) $function$;

CREATE OR REPLACE FUNCTION public.dm_rally_finish(actor uuid, run_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.dm_rally_runs;v jsonb;s jsonb;c int;w int;x int:=0;g int:=0;n int;speed int;daily numeric;secs numeric;ver bigint;result jsonb;st public.students;fair_percent int:=0;prior_x int:=0;prior_g int:=0;slow_count int:=0;slow_percent int:=0;day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
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
 -- Rally is server-graded with two hearts and fifteen questions. Early
 -- elimination receives a small participation award; only flawless races
 -- earn the full finish reward. No client score or bonus is trusted here.
 fair_percent:=case when c=0 then 0 when c=15 and w=0 then 100
   when c>=12 and w<=1 then 80 when c>=8 then 60 else 35 end;
 x:=floor(x*fair_percent/100.0*(100-slow_percent)/100.0)::int;
 g:=floor(g*fair_percent/100.0*(100-slow_percent)/100.0)::int;
 -- Same Rally class/unit on the same Istanbul day: only pay a new personal best.
 select coalesce(sum(xp),0)::int,coalesce(sum(gold),0)::int into prior_x,prior_g
 from public.dm_game_reward_runs where student_id=actor and game_key='ralli'
 and class_no=r.class_no and units @> r.units and units <@ r.units
 and to_char(created_at at time zone 'Europe/Istanbul','YYYY-MM-DD')=day;
 x:=greatest(0,x-prior_x);g:=greatest(0,g-prior_g);
 -- One wallet credit and one competitive score per run, within the same transaction.
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
 result:=jsonb_build_object('xp',x,'gold',g,'reason',case when c=0 then 'no_correct' when x=0 and g=0 then 'already_practiced' else 'awarded' end,'yo',v,'fairPercent',fair_percent,'slowCount',slow_count,'slowPercent',slow_percent,'fairTier',case fair_percent when 100 then 'perfect' when 80 then 'high' when 60 then 'pass' when 35 then 'practice' else 'none' end);
 update public.dm_rally_runs set status='finished',reward=result,finished_at=now() where id=run_key returning * into r;
 return public.dm_rally_view(r);
end $function$;

revoke all on function public.dm_rally_answer(uuid,uuid,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.dm_rally_answer(uuid,uuid,integer,integer,boolean) to service_role;
revoke all on function public.dm_game_xp_cap() from public,anon,authenticated;
grant execute on function public.dm_game_xp_cap() to service_role;

-- Demo account: password 31526931 and a valid starting-test result (B2), so the
-- learning route and every level are open without asking for the level test.
update public.students set password_hash='pbkdf2$210000$kz3nVx+iiNnFVmYTawObdA==$xPIK3djL2coH56WC9L3fBYOgAFtk4xjzorVZVuzYZOk='
 where id='dcde2026-1015-4000-8000-000000000001' and username='dijimedu_demo';
delete from public.portal_sessions where student_id='dcde2026-1015-4000-8000-000000000001';
insert into public.extra_data(student_id,key_name,value,updated_at)
select id,'placement_start_v1',jsonb_build_object('version','starting-point-20261018-v1','total',24,'correct',24,'level','B2','studyUnlockedLevel','B2','completedAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'demo',true),now()
from public.students where id='dcde2026-1015-4000-8000-000000000001'
on conflict(student_id,key_name) do update set value=excluded.value,updated_at=now();

commit;
