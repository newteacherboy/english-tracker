-- Server-authoritative 15-question Rally rewards: no changes to saved scores or existing runs.
CREATE OR REPLACE FUNCTION public.dm_rally_finish(actor uuid, run_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.dm_rally_runs;v jsonb;s jsonb;c int;w int;x int:=0;g int:=0;n int;speed int;daily numeric;secs numeric;ver bigint;result jsonb;st public.students;fair_percent int:=0;day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 select * into st from public.students where id=actor for update;
 select * into r from public.dm_rally_runs where id=run_key and student_id=actor for update;
 if not found then raise exception 'Yarış bulunamadı.';end if;
 if r.reward is not null then return public.dm_rally_view(r);end if;
 s:=r.state;c:=(s->>'correct')::int;w:=(s->>'wrong')::int;secs:=greatest(1,(s->>'elapsed')::numeric);
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Hesap bilgileri hazır değil.';end if;
 if c>0 then
  select count(*)+1 into n from public.dm_game_reward_runs where student_id=actor and game_key<>'ba' and xp>0 and created_at>=day::date::timestamp at time zone 'Europe/Istanbul';
  daily:=case when n<=3 then 2 when n>12 then .5 else 1 end;
  speed:=round(c*600/(1+secs/c));x:=round(least(96,greatest(0,c*6+floor(speed/100.0)-w*3))*daily);
  g:=case when x=0 then 0 else round((array[4,7,10])[case when c::numeric/(c+w)>=.8 then 3 when c::numeric/(c+w)>=.5 then 2 else 1 end]*daily) end;
 end if;
 -- Rally is server-graded with two hearts and fifteen questions. Early
 -- elimination receives a small participation award; only flawless races
 -- earn the full finish reward. No client score or bonus is trusted here.
 fair_percent:=case when c=0 then 0 when c=15 and w=0 then 100
   when c>=12 and w<=1 then 80 when c>=8 then 60 else 35 end;
 x:=floor(x*fair_percent/100.0)::int;
 g:=floor(g*fair_percent/100.0)::int;
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
 values(actor,st.username,'ralli',r.class_no,r.units[1],array_to_string(r.units,','),(s->>'score')::int,c,w,ceil(secs)::int,jsonb_build_object('v',3,'speed',coalesce(speed,0),'run_id',run_key,'reward_protocol',1));
 if actor<>'dcde2026-1015-4000-8000-000000000001'::uuid then
 insert into public.feed_events(student_id,event_type,payload) values(actor,'game_score',jsonb_build_object('game_name','Kelime Rallisi','game_key','ralli','score',(s->>'score')::int,'icon','🏎️'));
 end if;
 result:=jsonb_build_object('xp',x,'gold',g,'reason',case when c=0 then 'no_correct' else 'awarded' end,'yo',v,'fairPercent',fair_percent,'fairTier',case fair_percent when 100 then 'perfect' when 80 then 'high' when 60 then 'pass' when 35 then 'practice' else 'none' end);
 update public.dm_rally_runs set status='finished',reward=result,finished_at=now() where id=run_key returning * into r;
 return public.dm_rally_view(r);
end $function$
;
