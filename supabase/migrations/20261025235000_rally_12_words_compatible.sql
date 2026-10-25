-- Preserve 15-question in-progress races while allowing new 12-word race decks.
-- Keep teacher races ranking-only and learner rewards server-owned.

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
 if r.ranking_only then return public.dm_teacher_rally_finish(actor,run_key);end if;

 if r.reward is not null then return public.dm_rally_view(r);end if;
 s:=r.state;c:=(s->>'correct')::int;w:=(s->>'wrong')::int;secs:=greatest(1,(s->>'elapsed')::numeric);
 slow_count:=greatest(0,coalesce((s->>'slowed')::int,0));slow_percent:=least(45,slow_count*3);
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Hesap bilgileri hazır değil.';end if;
 if c>0 then
  select count(*)+1 into n from public.dm_game_reward_runs where student_id=actor and game_key<>'ba' and game_key not like 'konu:%' and xp>0 and created_at>=day::date::timestamp at time zone 'Europe/Istanbul';
  daily:=case when n<=3 then 2 when n>12 then .5 else 1 end;
  speed:=round(c*600/(1+secs/c));x:=least(public.dm_game_xp_cap(),round(least(80,greatest(0,c*6+floor(speed/100.0)-w*3))*daily))::int;
  g:=case when x=0 then 0 else round((array[4,7,10])[case when c::numeric/(c+w)>=.8 then 3 when c::numeric/(c+w)>=.5 then 2 else 1 end]*daily) end;
 end if;
 fair_percent:=case when c=0 then 0 when c=jsonb_array_length(r.deck) and w=0 then 100
   when c>=ceil(jsonb_array_length(r.deck)*0.8)::int and w<=1 then 80 when c>=ceil(jsonb_array_length(r.deck)*8.0/15)::int then 60 else 35 end;
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

CREATE OR REPLACE FUNCTION public.dm_rally_start(actor uuid, run_key uuid, class_id integer, unit_ids integer[], question_deck jsonb, pace text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students;r public.dm_rally_runs;available int;ticks int;v jsonb;
begin
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci hesabı gerekli.';end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo';
 if public.dm_student_level(coalesce((v->>'totalXp')::numeric,0))<15 then raise exception 'Kelime Rallisi 15. seviyede açılır.';end if;
 select * into r from public.dm_rally_runs where id=run_key;
 if found then if r.student_id<>actor then raise exception 'Yarış bulunamadı.';end if;return public.dm_rally_view(r);end if;
 if class_id is null or class_id not between 1 and 8 or cardinality(unit_ids) not between 1 and 10 or exists(select 1 from unnest(unit_ids) u where u is null or u not between 1 and 100) or pace not in ('easy','normal','hard') or jsonb_typeof(question_deck) is distinct from 'array' or jsonb_array_length(question_deck) not in (12,15) then raise exception 'Geçerli sınıf, ünite ve 12 veya 15 kelime gerekli.';end if;
 if exists(select 1 from jsonb_array_elements(question_deck) q where jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options')<>3 or (q->>'answer')::int not between 0 and 2 or nullif(q->>'word','') is null) then raise exception 'Geçersiz yarış kelimeleri.';end if;
 if (select count(*) from public.dm_rally_runs where student_id=actor and created_at>now()-interval '1 minute')>=5 then raise exception 'Yeni yarış için kısa bir süre bekle.';end if;
 ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900));
 available:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+ticks) end;
 if available<3 then raise exception 'Yarışa başlamak için 3 enerji gerekli.';end if;
 insert into public.dm_rally_runs(id,student_id,class_no,units,difficulty,deck) values(run_key,actor,class_id,unit_ids,pace,question_deck) returning * into r;
 update public.students set energy=available-3,energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
 insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-3,available-3,'ralli:'||run_key);
 return public.dm_rally_view(r)||jsonb_build_object('energy',available-3,'energyMax',st.energy_max);
end $function$;

CREATE OR REPLACE FUNCTION public.dm_teacher_rally_finish(actor uuid, run_key uuid)
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
 fair_percent:=case when c=0 then 0 when c=jsonb_array_length(r.deck) and w=0 then 100
   when c>=ceil(jsonb_array_length(r.deck)*0.8)::int and w<=1 then 80 when c>=ceil(jsonb_array_length(r.deck)*8.0/15)::int then 60 else 35 end;
 x:=floor(x*fair_percent/100.0*(100-slow_percent)/100.0)::int;
 g:=floor(g*fair_percent/100.0*(100-slow_percent)/100.0)::int;
 x:=0;g:=0;
 insert into public.game_scores(student_id,student_name,game_key,class_no,unit_no,unit_name,score,correct_count,wrong_count,duration_seconds,extra)
 values(actor,st.username,'ralli',r.class_no,r.units[1],array_to_string(r.units,','),(s->>'score')::int,c,w,ceil(secs)::int,jsonb_build_object('v',3,'speed',coalesce(speed,0),'run_id',run_key,'reward_protocol',1,'slowed',slow_count));
 result:=jsonb_build_object('xp',x,'gold',g,'reason',case when c=0 then 'no_correct' when x=0 and g=0 then 'no_correct' else 'ranking_only' end,'yo',v,'fairPercent',fair_percent,'slowCount',slow_count,'slowPercent',slow_percent,'fairTier',case fair_percent when 100 then 'perfect' when 80 then 'high' when 60 then 'pass' when 35 then 'practice' else 'none' end);
 update public.dm_rally_runs set status='finished',reward=result,finished_at=now() where id=run_key returning * into r;
 return public.dm_rally_view(r);
end $function$;

CREATE OR REPLACE FUNCTION public.dm_teacher_rally_start(grant_id uuid, actor uuid, run_key uuid, class_id integer, unit_ids integer[], question_deck jsonb, pace text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students;r public.dm_rally_runs;available int;ticks int;v jsonb;
begin
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci hesabı gerekli.';end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo';
 perform 1 from public.teacher_portal_access a join public.teachers t on t.id=a.teacher_id where a.id=grant_id and a.state='approved' and t.active and t.frozen_at is null and st.teacher_id=a.teacher_id;
 if not found then raise exception 'Öğretmen erişimi gerekli.';end if;
 select * into r from public.dm_rally_runs where id=run_key;
 if found then if r.student_id<>actor then raise exception 'Yarış bulunamadı.';end if;return public.dm_rally_view(r);end if;
 if class_id is null or class_id not between 1 and 8 or cardinality(unit_ids) not between 1 and 10 or exists(select 1 from unnest(unit_ids) u where u is null or u not between 1 and 100) or pace not in ('easy','normal','hard') or jsonb_typeof(question_deck) is distinct from 'array' or jsonb_array_length(question_deck) not in (12,15) then raise exception 'Geçerli sınıf, ünite ve 12 veya 15 kelime gerekli.';end if;
 if exists(select 1 from jsonb_array_elements(question_deck) q where jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options')<>3 or (q->>'answer')::int not between 0 and 2 or nullif(q->>'word','') is null) then raise exception 'Geçersiz yarış kelimeleri.';end if;
 if (select count(*) from public.dm_rally_runs where student_id=actor and created_at>now()-interval '1 minute')>=5 then raise exception 'Yeni yarış için kısa bir süre bekle.';end if;
 insert into public.dm_rally_runs(id,student_id,class_no,units,difficulty,deck,ranking_only) values(run_key,actor,class_id,unit_ids,pace,question_deck,true) returning * into r;
 return public.dm_rally_view(r)||jsonb_build_object('energy',st.energy,'energyMax',st.energy_max);
end $function$;

