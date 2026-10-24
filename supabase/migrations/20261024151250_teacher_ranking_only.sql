begin;

alter table public.dm_verified_runs add column ranking_only boolean not null default false;

alter table public.dm_break_runs add column ranking_only boolean not null default false;

alter table public.dm_topic_game_runs add column ranking_only boolean not null default false;

alter table public.dm_rally_runs add column ranking_only boolean not null default false;

alter table public.dm_matches add column ranking_only boolean not null default false;

CREATE OR REPLACE FUNCTION public.dm_break_status(actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students;d text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');games jsonb;available int;
begin
 select * into st from public.students where id=actor and status='approved' and role='student';
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 available:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int) end;
 select jsonb_object_agg(g,jsonb_build_object('unlocked',coalesce((select p.unlocked_chapter from public.dm_break_progress p where p.student_id=actor and p.game=g),1),'currentChapter',coalesce((select p.unlocked_chapter from public.dm_break_progress p where p.student_id=actor and p.game=g),1),'completedAll',coalesce((select p.completed_all from public.dm_break_progress p where p.student_id=actor and p.game=g),false),'chapters',(select jsonb_agg(jsonb_build_object('chapter',c.chapter,'title',c.title,'goal',c.goal,'theme',c.theme) order by c.chapter) from public.dm_break_chapters c where c.game=g),'remaining',greatest(0,2-(select count(*) from public.dm_break_runs r where r.student_id=actor and r.day=d and r.game=g and not r.ranking_only)))) into games from unnest(array['kosu','zipla','patlat']) g;
 return jsonb_build_object('ok',true,'day',d,'games',games,'energy',available,'energyMax',st.energy_max);
end $function$
;

CREATE OR REPLACE FUNCTION public.dm_break_finish(actor uuid, run_key uuid, score integer, collected_gold integer, seconds integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students;r public.dm_break_runs;v jsonb;g int;ver bigint;best int;elapsed numeric;
begin
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_break_runs where id=run_key and student_id=actor for update;
 if not found then raise exception 'Oyun bulunamadı.';end if;
 if r.ranking_only then return public.dm_teacher_break_finish(actor,run_key,score,collected_gold,seconds);end if;

 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Hesap bilgileri hazır değil.';end if;
 select coalesce(max(b.score),0) into best from public.dm_break_runs b where b.student_id=actor and b.game=r.game and b.status='finished' and b.id<>run_key;
 if r.status='finished' then
  return public.dm_break_status(actor)||jsonb_build_object('runId',r.id,'finished',true,'score',r.score,'gold',r.gold,'record',r.score>best,'yo',v)||public.dm_break_run_view(r);
 end if;
 elapsed:=extract(epoch from clock_timestamp()-r.created_at);
 if seconds is null or seconds>elapsed+1 or elapsed>7200 then raise exception 'Oyun süresi doğrulanamadı.';end if;
 if score<r.checkpoint_score or seconds<r.checkpoint_seconds then raise exception 'Oyun sonucu kayıtlı ilerlemenin gerisinde.';end if;
 g:=public.dm_break_reward(r.game,score,collected_gold,seconds);
 if not r.completed_all and score-r.chapter_start_score>=(select c.goal from public.dm_break_chapters c where c.game=r.game and c.chapter=r.chapter) then
 perform public.dm_break_checkpoint(actor,run_key,r.chapter,score,seconds);select * into r from public.dm_break_runs where id=run_key;end if;
 ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
 v:=v||jsonb_build_object('altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
 update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
 update public.students set gold=(v->>'altin')::numeric where id=actor;
 select value into v from public.extra_data where student_id=actor and key_name='yo';
 update public.dm_break_runs set score=dm_break_finish.score,gold=g,status='finished',finished_at=now() where id=run_key returning * into r;
 return public.dm_break_status(actor)||jsonb_build_object('runId',r.id,'finished',true,'score',r.score,'gold',g,'record',r.score>best,'yo',v)||public.dm_break_run_view(r);
end $function$
;

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
end $function$
;

CREATE OR REPLACE FUNCTION public.dm_topic_game_finish(actor uuid, run_key uuid, picks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.dm_topic_game_runs; v jsonb; i int; c int:=0; n int; x int:=0; used int; ver bigint;
 day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');reason text:='accuracy'; prior_scope text;
begin
 -- Serialize both wallet writes and daily quota checks across simultaneous runs.
 perform 1 from public.students where id=actor for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_topic_game_runs where run_id=run_key and student_id=actor for update;
 if not found then return jsonb_build_object('ok',false,'sebep','missing','mesaj','Oyun oturumu bulunamadı veya tamamlandı.');end if;

 if r.ranking_only then return public.dm_teacher_topic_game_finish(actor,run_key,picks);end if;
 if r.expires_at<=clock_timestamp() then
  delete from public.dm_topic_game_runs where run_id=run_key;
  return jsonb_build_object('ok',false,'sebep','expired','mesaj','Oyun oturumunun süresi doldu.');
 end if;
 if jsonb_typeof(picks) is distinct from 'array' or jsonb_array_length(picks)<>r.question_count then raise exception 'Geçersiz cevaplar.';end if;
 n:=r.question_count;
 for i in 0..n-1 loop
  if jsonb_typeof(picks->i) is distinct from 'string' or not (r.answer_key->i->'allowed' @> jsonb_build_array(picks->i)) then raise exception 'Geçersiz cevaplar.';end if;
  if picks->>i=r.answer_key->i->>'correct' then c:=c+1;end if;
 end loop;
 select count(*) into used from public.dm_game_reward_runs where student_id=actor and topic_key=r.topic_key
 and game_key='konu:'||r.game and xp>0
 and created_at>=day::date::timestamp at time zone 'Europe/Istanbul'
 and created_at<(day::date+1)::timestamp at time zone 'Europe/Istanbul';
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Hesap bilgileri hazır değil.';end if;
 if used>=3 then reason:='daily_limit';
 elsif extract(epoch from clock_timestamp()-r.started_at)<n*1.5 then reason:='too_fast';
 elsif c*100>=n*80 then x:=least(70,public.dm_game_xp_cap());reason:='awarded';end if;
 if x>0 then
  insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold,topic_key)
  values(actor,run_key::text,'konu:'||r.game,0,array[0],x,0,r.topic_key);
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
  v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
  v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
  v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));
  v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
  prior_scope:=coalesce(current_setting('diji.topic_game',true),'');
  perform set_config('diji.topic_game','1',true);
  update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
  perform set_config('diji.topic_game',prior_scope,true);
  select value into v from public.extra_data where student_id=actor and key_name='yo';
 end if;
 delete from public.dm_topic_game_runs where run_id=run_key;
 delete from public.dm_topic_game_runs where expires_at<=now();
 return jsonb_build_object('ok',true,'dogru',c,'toplam',n,'yuzde',round(c*100.0/n),'xp',x,'xpHakkiKaldi',greatest(0,3-used-case when x>0 then 1 else 0 end),'sebep',reason,'yo',v);
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
 if exists(select 1 from public.dm_verified_runs where student_id=actor and run_id=run_key and ranking_only) then select value into v from public.extra_data where student_id=actor and key_name='yo';return jsonb_build_object('ok',true,'xp',0,'gold',0,'reason','ranking_only','yo',v);end if;
 percentage:=public.dm_solo_fair_percent(game_code,right_count,wrong_count);
 raw:=public.dm_game_reward_claim(actor,run_key,game_code,class_id,unit_ids,
    right_count,wrong_count,duration_seconds,false,1,
    case when boost_factor in (2,3,4) then boost_factor else 1 end);
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

CREATE OR REPLACE FUNCTION public.dm_teacher_break_start(actor uuid, run_key uuid, game_code text, chapter_no integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students;r public.dm_break_runs;available int;ticks int;chosen int;unlocked int;d text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 if run_key is null or game_code is null or game_code not in ('kosu','zipla','patlat') then raise exception 'Geçersiz oyun.';end if;
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_break_runs where id=run_key;
 if found then
  if not r.ranking_only or r.student_id<>actor or r.game<>game_code then raise exception 'Oyun bulunamadı.';end if;
  return public.dm_break_status(actor)||public.dm_break_run_view(r);
 end if;
 unlocked:=10;
 chosen:=coalesce(chapter_no,1);
 if chosen<1 or chosen>unlocked or chosen>10 then raise exception 'Bu bölüm henüz açılmadı.';end if;
 insert into public.dm_break_runs(id,student_id,game,day,start_chapter,chapter,highest_chapter,ranking_only) values(run_key,actor,game_code,d,chosen,chosen,chosen,true) returning * into r;
 return public.dm_break_status(actor)||public.dm_break_run_view(r);
end $function$
;

revoke all on function public.dm_teacher_break_start(actor uuid, run_key uuid, game_code text, chapter_no integer) from public,anon,authenticated;grant execute on function public.dm_teacher_break_start(actor uuid, run_key uuid, game_code text, chapter_no integer) to service_role;

CREATE OR REPLACE FUNCTION public.dm_teacher_break_checkpoint(actor uuid, run_key uuid, chapter_no integer, score integer, seconds integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.dm_break_runs;goal int;elapsed numeric;unlocked int;
begin
 perform 1 from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_break_runs where id=run_key and student_id=actor for update;
 if not found then raise exception 'Oyun bulunamadı.';end if;
 if exists(select 1 from public.dm_break_checkpoints c where c.run_id=run_key and c.chapter=chapter_no) then return public.dm_break_status(actor)||public.dm_break_run_view(r)||jsonb_build_object('duplicate',true);end if;
 if r.status<>'playing' or r.completed_all or chapter_no is null or chapter_no<>r.chapter then raise exception 'Geçersiz bölüm sırası.';end if;
 elapsed:=extract(epoch from clock_timestamp()-r.created_at);
 if seconds is null or seconds>elapsed+1 or elapsed>7200 or seconds<r.checkpoint_seconds or score<r.checkpoint_score then raise exception 'Oyun süresi doğrulanamadı.';end if;
 perform public.dm_break_reward(r.game,score,0,seconds);
 select c.goal into goal from public.dm_break_chapters c where c.game=r.game and c.chapter=r.chapter;
 if score-r.chapter_start_score<goal then raise exception 'Bölüm eşiği henüz tamamlanmadı.';end if;
 insert into public.dm_break_checkpoints(run_id,chapter,score,seconds) values(run_key,r.chapter,score,seconds);
 unlocked:=least(10,r.chapter+1);
 update public.dm_break_runs set chapter=unlocked,highest_chapter=greatest(highest_chapter,unlocked),chapter_start_score=dm_teacher_break_checkpoint.score,checkpoint_score=dm_teacher_break_checkpoint.score,checkpoint_seconds=dm_teacher_break_checkpoint.seconds,score=dm_teacher_break_checkpoint.score,completed_all=(r.chapter=10) where id=run_key returning * into r;
 return public.dm_break_status(actor)||public.dm_break_run_view(r)||jsonb_build_object('completedChapter',chapter_no,'duplicate',false);
end $function$
;

revoke all on function public.dm_teacher_break_checkpoint(actor uuid, run_key uuid, chapter_no integer, score integer, seconds integer) from public,anon,authenticated;grant execute on function public.dm_teacher_break_checkpoint(actor uuid, run_key uuid, chapter_no integer, score integer, seconds integer) to service_role;

CREATE OR REPLACE FUNCTION public.dm_teacher_break_finish(actor uuid, run_key uuid, score integer, collected_gold integer, seconds integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students;r public.dm_break_runs;v jsonb;g int;ver bigint;best int;elapsed numeric;
begin
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_break_runs where id=run_key and student_id=actor for update;
 if not found then raise exception 'Oyun bulunamadı.';end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Hesap bilgileri hazır değil.';end if;
 select coalesce(max(b.score),0) into best from public.dm_break_runs b where b.student_id=actor and b.game=r.game and b.status='finished' and b.id<>run_key;
 if r.status='finished' then
  return public.dm_break_status(actor)||jsonb_build_object('runId',r.id,'finished',true,'score',r.score,'gold',r.gold,'record',r.score>best,'yo',v)||public.dm_break_run_view(r);
 end if;
 elapsed:=extract(epoch from clock_timestamp()-r.created_at);
 if seconds is null or seconds>elapsed+1 or elapsed>7200 then raise exception 'Oyun süresi doğrulanamadı.';end if;
 if score<r.checkpoint_score or seconds<r.checkpoint_seconds then raise exception 'Oyun sonucu kayıtlı ilerlemenin gerisinde.';end if;
 perform public.dm_break_reward(r.game,score,collected_gold,seconds);g:=0;
 if not r.completed_all and score-r.chapter_start_score>=(select c.goal from public.dm_break_chapters c where c.game=r.game and c.chapter=r.chapter) then
 perform public.dm_teacher_break_checkpoint(actor,run_key,r.chapter,score,seconds);select * into r from public.dm_break_runs where id=run_key;end if;
 update public.dm_break_runs set score=dm_teacher_break_finish.score,gold=g,status='finished',finished_at=now() where id=run_key returning * into r;
 return public.dm_break_status(actor)||jsonb_build_object('runId',r.id,'finished',true,'score',r.score,'gold',g,'record',r.score>best,'yo',v)||public.dm_break_run_view(r);
end $function$
;

revoke all on function public.dm_teacher_break_finish(actor uuid, run_key uuid, score integer, collected_gold integer, seconds integer) from public,anon,authenticated;grant execute on function public.dm_teacher_break_finish(actor uuid, run_key uuid, score integer, collected_gold integer, seconds integer) to service_role;

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
 fair_percent:=case when c=0 then 0 when c=15 and w=0 then 100
   when c>=12 and w<=1 then 80 when c>=8 then 60 else 35 end;
 x:=floor(x*fair_percent/100.0*(100-slow_percent)/100.0)::int;
 g:=floor(g*fair_percent/100.0*(100-slow_percent)/100.0)::int;
 x:=0;g:=0;
 insert into public.game_scores(student_id,student_name,game_key,class_no,unit_no,unit_name,score,correct_count,wrong_count,duration_seconds,extra)
 values(actor,st.username,'ralli',r.class_no,r.units[1],array_to_string(r.units,','),(s->>'score')::int,c,w,ceil(secs)::int,jsonb_build_object('v',3,'speed',coalesce(speed,0),'run_id',run_key,'reward_protocol',1,'slowed',slow_count));
 result:=jsonb_build_object('xp',x,'gold',g,'reason',case when c=0 then 'no_correct' when x=0 and g=0 then 'no_correct' else 'ranking_only' end,'yo',v,'fairPercent',fair_percent,'slowCount',slow_count,'slowPercent',slow_percent,'fairTier',case fair_percent when 100 then 'perfect' when 80 then 'high' when 60 then 'pass' when 35 then 'practice' else 'none' end);
 update public.dm_rally_runs set status='finished',reward=result,finished_at=now() where id=run_key returning * into r;
 return public.dm_rally_view(r);
end $function$
;

revoke all on function public.dm_teacher_rally_finish(actor uuid, run_key uuid) from public,anon,authenticated;grant execute on function public.dm_teacher_rally_finish(actor uuid, run_key uuid) to service_role;

CREATE OR REPLACE FUNCTION public.dm_teacher_topic_game_finish(actor uuid, run_key uuid, picks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare r public.dm_topic_game_runs; v jsonb; i int; c int:=0; n int; x int:=0; used int; ver bigint;
 day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');reason text:='accuracy'; prior_scope text;
begin
 -- Serialize both wallet writes and daily quota checks across simultaneous runs.
 perform 1 from public.students where id=actor for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_topic_game_runs where run_id=run_key and student_id=actor for update;
 if not found then return jsonb_build_object('ok',false,'sebep','missing','mesaj','Oyun oturumu bulunamadı veya tamamlandı.');end if;
 if r.expires_at<=clock_timestamp() then
  delete from public.dm_topic_game_runs where run_id=run_key;
  return jsonb_build_object('ok',false,'sebep','expired','mesaj','Oyun oturumunun süresi doldu.');
 end if;
 if jsonb_typeof(picks) is distinct from 'array' or jsonb_array_length(picks)<>r.question_count then raise exception 'Geçersiz cevaplar.';end if;
 n:=r.question_count;
 for i in 0..n-1 loop
  if jsonb_typeof(picks->i) is distinct from 'string' or not (r.answer_key->i->'allowed' @> jsonb_build_array(picks->i)) then raise exception 'Geçersiz cevaplar.';end if;
  if picks->>i=r.answer_key->i->>'correct' then c:=c+1;end if;
 end loop;
 select count(*) into used from public.dm_game_reward_runs where student_id=actor and topic_key=r.topic_key
 and game_key='konu:'||r.game and xp>0
 and created_at>=day::date::timestamp at time zone 'Europe/Istanbul'
 and created_at<(day::date+1)::timestamp at time zone 'Europe/Istanbul';
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Hesap bilgileri hazır değil.';end if;
 x:=0;reason:='ranking_only';
 insert into public.game_scores(student_id,student_name,game_key,score,correct_count,wrong_count,duration_seconds,extra) select actor,username,'konu:'||r.game,round(c*100.0/n),c,n-c,greatest(1,extract(epoch from clock_timestamp()-r.started_at))::int,jsonb_build_object('ranking_only',true,'run_id',run_key,'topic',r.topic_key) from public.students where id=actor;
 delete from public.dm_topic_game_runs where run_id=run_key;
 delete from public.dm_topic_game_runs where expires_at<=now();
 return jsonb_build_object('ok',true,'dogru',c,'toplam',n,'yuzde',round(c*100.0/n),'xp',x,'xpHakkiKaldi',greatest(0,3-used-case when x>0 then 1 else 0 end),'sebep',reason,'yo',v);
end $function$
;

revoke all on function public.dm_teacher_topic_game_finish(actor uuid, run_key uuid, picks jsonb) from public,anon,authenticated;grant execute on function public.dm_teacher_topic_game_finish(actor uuid, run_key uuid, picks jsonb) to service_role;

CREATE OR REPLACE FUNCTION public.dm_teacher_match_action(actor uuid, match_id uuid, action text, arg jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare m public.dm_matches;me public.students;them public.students; qs jsonb; pool jsonb;start_at timestamptz;ans jsonb;q jsonb;idx integer;sel integer;elapsed numeric;ra jsonb;rb jsonb;result jsonb;v jsonb;day text;n integer;mul numeric;gold integer;xp integer;
begin
 if action='create' then
  select * into me from public.students where id=actor and status='approved';select * into them from public.students where id=(arg->>'target')::uuid and status='approved';
  if me.id is null or them.id is null or me.id=them.id then raise exception 'Geçersiz rakip.';end if;
  perform pg_advisory_xact_lock(hashtextextended(least(me.id::text,them.id::text)||greatest(me.id::text,them.id::text),0));
  if public.dm_blocked(me.id,them.id) then raise exception 'Bu kişiyle iletişim kapalı.';end if;
  select count(*) into n from public.dm_matches where player_a=actor and created_at>now()-interval '24 hours';if n>=10 then raise exception 'Bugünkü 10 karşılaşma hakkını kullandın.';end if;
  if arg->>'game'='rota' then
   select jsonb_agg(jsonb_build_object('word',english,'answer',turkish)) into pool from (select distinct english,turkish from public.word_bank where active and class_no=least(me.class_no,them.class_no) and position(' ' in trim(english))>0 and length(turkish)<140 order by english limit 400) s;
  else
   select jsonb_agg(jsonb_build_object('word',english,'answer',turkish)) into pool from (select distinct english,turkish from public.word_bank where active and class_no=least(me.class_no,them.class_no) order by english limit 500) s;
  end if;
  if coalesce(jsonb_array_length(pool),0)<12 then raise exception 'Bu sınıfta 12 soruluk yeterli havuz yok.';end if;
  select jsonb_agg(p) into qs from (select p from (select distinct on (x->>'word') x p from jsonb_array_elements(pool) x order by x->>'word') u order by random() limit 12) picked;
  if jsonb_array_length(qs)<>12 then raise exception '12 farklı soru gerekiyor.';end if;
  select jsonb_agg(jsonb_set(x,'{choices}',(select jsonb_agg(txt order by random()) from (select x->>'answer' txt union all select txt from (select txt from (select distinct y->>'answer' txt from jsonb_array_elements(pool) y where y->>'answer'<>x->>'answer') d order by random() limit 5) wrong) opts))) into qs from jsonb_array_elements(qs) x;
  select jsonb_agg(x||jsonb_build_object('puanSurum',3)) into qs from jsonb_array_elements(qs) x;
  insert into public.dm_matches(player_a,player_b,game,mode,class_no,questions,ranking_only) values(actor,them.id,arg->>'game',arg->>'mode',least(me.class_no,them.class_no),qs,true) returning * into m;
  insert into public.notifications(recipient_student_id,sender_student_id,type,message,payload) values(them.id,actor,'oyunDavet',case when m.mode='live' then 'Aynı anda oynayalım: ' else '24 saatlik karşılaşma: ' end||case when m.game='ucus' then 'Kelime Uçuşu 🪽' else 'Cümle Rotası 🧩' end,jsonb_build_object('matchId',m.id));
 else
  select * into m from public.dm_matches where id=match_id and actor in(player_a,player_b) for update;
  if m.id is null then raise exception 'Karşılaşma bulunamadı.';end if;
 end if;
 if m.status in ('cancelled','expired') then return jsonb_build_object('ok',true,'id',m.id,'status',m.status);end if;
 if public.dm_blocked(m.player_a,m.player_b) then update public.dm_matches set status='cancelled' where id=m.id;return jsonb_build_object('ok',true,'id',m.id,'status','cancelled');end if;
 if m.expires_at<now() and m.status<>'finished' then update public.dm_matches set status='expired' where id=m.id;return jsonb_build_object('ok',true,'id',m.id,'status','expired');end if;
 if action='ready' and m.status<>'finished' then
  if actor=m.player_a then m.ready_a:=true;else m.ready_b:=true;end if;
  if m.mode='live' and m.ready_a and m.ready_b and m.start_a is null then
   perform 1 from public.students where id in(m.player_a,m.player_b) order by id for update;
   perform 1;perform 1;
   m.start_a:=now()+interval '5 seconds';m.start_b:=m.start_a;m.status:='playing';
  elsif m.mode='async' then
   if actor=m.player_a and m.start_a is null then perform 1;m.start_a:=now()+interval '3 seconds';elsif actor=m.player_b and m.start_b is null then perform 1;m.start_b:=now()+interval '3 seconds';end if;m.status:='playing';
  end if;
 end if;
 start_at:=case when actor=m.player_a then m.start_a else m.start_b end;
 ans:=case when actor=m.player_a then m.answers_a else m.answers_b end;
 elapsed:=case when start_at is null then -999 else extract(epoch from now()-start_at) end;idx:=floor(elapsed/12);
 if action='answer' then
  if idx<0 or idx>=jsonb_array_length(m.questions) or (arg->>'index')::integer<>idx or ans ? idx::text then raise exception 'Bu sorunun süresi doldu veya cevaplandı.';end if;
  q:=m.questions->idx;sel:=(arg->>'choice')::integer;
  if sel<0 or sel>=jsonb_array_length(q->'choices') then raise exception 'Geçersiz cevap.';end if;
  ans:=jsonb_set(ans,array[idx::text],jsonb_build_object('answer',q->'choices'->>sel,'ms',floor((elapsed-idx*12)*1000)));
  if actor=m.player_a then m.answers_a:=ans;else m.answers_b:=ans;end if;
 end if;
 if m.start_a is not null and now()>=m.start_a+make_interval(secs=>12*jsonb_array_length(m.questions)) and m.result_a is null then m.result_a:=public.dm_round_score(m.answers_a,m.questions);end if;
 if m.start_b is not null and now()>=m.start_b+make_interval(secs=>12*jsonb_array_length(m.questions)) and m.result_b is null then m.result_b:=public.dm_round_score(m.answers_b,m.questions);end if;
 -- Persist each player's ordinary game reward once; replay and polling cannot award twice.
 for n in 0..1 loop
  result:=case when n=0 then m.result_a else m.result_b end;
  if result is not null and not (result ? 'reward') then
   gold:=0;xp:=0;
   insert into public.game_scores(game_key,student_id,student_name,class_no,score,correct_count,wrong_count,duration_seconds,played_on,extra) select m.game,id,username,m.class_no,(result->>'puan')::numeric,(result->>'dogru')::integer,(result->>'yanlis')::integer,ceil((result->>'sure')::numeric),current_date,jsonb_build_object('v',coalesce((result->>'puanSurum')::integer,2),'matchId',m.id) from public.students where id=case when n=0 then m.player_a else m.player_b end;
   result:=result||jsonb_build_object('reward',jsonb_build_object('gold',gold,'xp',xp));if n=0 then m.result_a:=result;else m.result_b:=result;end if;
  end if;
 end loop;
 if m.result_a is not null and m.result_b is not null then m.status:='finished';end if;
 update public.dm_matches set ready_a=m.ready_a,ready_b=m.ready_b,start_a=m.start_a,start_b=m.start_b,status=m.status,answers_a=m.answers_a,answers_b=m.answers_b,result_a=m.result_a,result_b=m.result_b where id=m.id;
 idx:=floor(elapsed/12);q:=case when idx between 0 and jsonb_array_length(m.questions)-1 then m.questions->idx else null end;
 ra:=case when actor=m.player_a then m.result_a else m.result_b end;rb:=case when actor=m.player_a then m.result_b else m.result_a end;
 return jsonb_build_object('ok',true,'id',m.id,'game',m.game,'mode',m.mode,'status',m.status,'serverNow',now(),'start',start_at,'ready',case when actor=m.player_a then m.ready_a else m.ready_b end,'opponentReady',case when actor=m.player_a then m.ready_b else m.ready_a end,'index',idx,'total',jsonb_array_length(m.questions),'seconds',greatest(0,ceil(12-mod(greatest(elapsed,0),12))),'question',case when q is null then null else q-'answer' end,'answered',ans ? idx::text,'feedback',case when ans ? idx::text then q->>'answer' else null end,'myScore',(case when m.questions->0->>'puanSurum'='3' then public.dm_round_score_v3(ans,m.questions,false) else public.dm_round_score(ans,m.questions) end)->'puan','myResult',ra,'opponentResult',rb,'opponent',(select username from public.students where id=case when actor=m.player_a then m.player_b else m.player_a end));
end $function$
;

revoke all on function public.dm_teacher_match_action(actor uuid, match_id uuid, action text, arg jsonb) from public,anon,authenticated;grant execute on function public.dm_teacher_match_action(actor uuid, match_id uuid, action text, arg jsonb) to service_role;

CREATE OR REPLACE FUNCTION public.dm_match_action(actor uuid, match_id uuid, action text, arg jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare m public.dm_matches;me public.students;them public.students; qs jsonb; pool jsonb;start_at timestamptz;ans jsonb;q jsonb;idx integer;sel integer;elapsed numeric;ra jsonb;rb jsonb;result jsonb;v jsonb;day text;n integer;mul numeric;gold integer;xp integer;
begin
 if action='create' then
  select * into me from public.students where id=actor and status='approved';select * into them from public.students where id=(arg->>'target')::uuid and status='approved';
  if me.id is null or them.id is null or me.id=them.id then raise exception 'Geçersiz rakip.';end if;
  perform pg_advisory_xact_lock(hashtextextended(least(me.id::text,them.id::text)||greatest(me.id::text,them.id::text),0));
  if public.dm_blocked(me.id,them.id) then raise exception 'Bu kişiyle iletişim kapalı.';end if;
  select count(*) into n from public.dm_matches where player_a=actor and created_at>now()-interval '24 hours';if n>=10 then raise exception 'Bugünkü 10 karşılaşma hakkını kullandın.';end if;
  if arg->>'game'='rota' then
   select jsonb_agg(jsonb_build_object('word',english,'answer',turkish)) into pool from (select distinct english,turkish from public.word_bank where active and class_no=least(me.class_no,them.class_no) and position(' ' in trim(english))>0 and length(turkish)<140 order by english limit 400) s;
  else
   select jsonb_agg(jsonb_build_object('word',english,'answer',turkish)) into pool from (select distinct english,turkish from public.word_bank where active and class_no=least(me.class_no,them.class_no) order by english limit 500) s;
  end if;
  if coalesce(jsonb_array_length(pool),0)<12 then raise exception 'Bu sınıfta 12 soruluk yeterli havuz yok.';end if;
  select jsonb_agg(p) into qs from (select p from (select distinct on (x->>'word') x p from jsonb_array_elements(pool) x order by x->>'word') u order by random() limit 12) picked;
  if jsonb_array_length(qs)<>12 then raise exception '12 farklı soru gerekiyor.';end if;
  select jsonb_agg(jsonb_set(x,'{choices}',(select jsonb_agg(txt order by random()) from (select x->>'answer' txt union all select txt from (select txt from (select distinct y->>'answer' txt from jsonb_array_elements(pool) y where y->>'answer'<>x->>'answer') d order by random() limit 5) wrong) opts))) into qs from jsonb_array_elements(qs) x;
  select jsonb_agg(x||jsonb_build_object('puanSurum',3)) into qs from jsonb_array_elements(qs) x;
  insert into public.dm_matches(player_a,player_b,game,mode,class_no,questions) values(actor,them.id,arg->>'game',arg->>'mode',least(me.class_no,them.class_no),qs) returning * into m;
  insert into public.notifications(recipient_student_id,sender_student_id,type,message,payload) values(them.id,actor,'oyunDavet',case when m.mode='live' then 'Aynı anda oynayalım: ' else '24 saatlik karşılaşma: ' end||case when m.game='ucus' then 'Kelime Uçuşu 🪽' else 'Cümle Rotası 🧩' end,jsonb_build_object('matchId',m.id));
 else
  select * into m from public.dm_matches where id=match_id and actor in(player_a,player_b) for update;
  if m.id is null then raise exception 'Karşılaşma bulunamadı.';end if;
 end if;
 if m.ranking_only then return public.dm_teacher_match_action(actor,m.id,action,arg);end if;
 if m.status in ('cancelled','expired') then return jsonb_build_object('ok',true,'id',m.id,'status',m.status);end if;
 if public.dm_blocked(m.player_a,m.player_b) then update public.dm_matches set status='cancelled' where id=m.id;return jsonb_build_object('ok',true,'id',m.id,'status','cancelled');end if;
 if m.expires_at<now() and m.status<>'finished' then update public.dm_matches set status='expired' where id=m.id;return jsonb_build_object('ok',true,'id',m.id,'status','expired');end if;
 if action='ready' and m.status<>'finished' then
  if actor=m.player_a then m.ready_a:=true;else m.ready_b:=true;end if;
  if m.mode='live' and m.ready_a and m.ready_b and m.start_a is null then
   perform 1 from public.students where id in(m.player_a,m.player_b) order by id for update;
   perform public.dm_match_energy(m.player_a);perform public.dm_match_energy(m.player_b);
   m.start_a:=now()+interval '5 seconds';m.start_b:=m.start_a;m.status:='playing';
  elsif m.mode='async' then
   if actor=m.player_a and m.start_a is null then perform public.dm_match_energy(actor);m.start_a:=now()+interval '3 seconds';elsif actor=m.player_b and m.start_b is null then perform public.dm_match_energy(actor);m.start_b:=now()+interval '3 seconds';end if;m.status:='playing';
  end if;
 end if;
 start_at:=case when actor=m.player_a then m.start_a else m.start_b end;
 ans:=case when actor=m.player_a then m.answers_a else m.answers_b end;
 elapsed:=case when start_at is null then -999 else extract(epoch from now()-start_at) end;idx:=floor(elapsed/12);
 if action='answer' then
  if idx<0 or idx>=jsonb_array_length(m.questions) or (arg->>'index')::integer<>idx or ans ? idx::text then raise exception 'Bu sorunun süresi doldu veya cevaplandı.';end if;
  q:=m.questions->idx;sel:=(arg->>'choice')::integer;
  if sel<0 or sel>=jsonb_array_length(q->'choices') then raise exception 'Geçersiz cevap.';end if;
  ans:=jsonb_set(ans,array[idx::text],jsonb_build_object('answer',q->'choices'->>sel,'ms',floor((elapsed-idx*12)*1000)));
  if actor=m.player_a then m.answers_a:=ans;else m.answers_b:=ans;end if;
 end if;
 if m.start_a is not null and now()>=m.start_a+make_interval(secs=>12*jsonb_array_length(m.questions)) and m.result_a is null then m.result_a:=public.dm_round_score(m.answers_a,m.questions);end if;
 if m.start_b is not null and now()>=m.start_b+make_interval(secs=>12*jsonb_array_length(m.questions)) and m.result_b is null then m.result_b:=public.dm_round_score(m.answers_b,m.questions);end if;
 -- Persist each player's ordinary game reward once; replay and polling cannot award twice.
 for n in 0..1 loop
  result:=case when n=0 then m.result_a else m.result_b end;
  if result is not null and not (result ? 'reward') then
   insert into public.extra_data(student_id,key_name,value) values(case when n=0 then m.player_a else m.player_b end,'yo','{}') on conflict(student_id,key_name) do nothing;
   select value into v from public.extra_data where student_id=case when n=0 then m.player_a else m.player_b end and key_name='yo' for update;
   if jsonb_typeof(v)='string' then v:=(v#>>'{}')::jsonb;end if;
   day:=(now() at time zone 'Europe/Istanbul')::date::text;
   idx:=case when v#>>'{oyunGun,t}'=day then coalesce((v#>>'{oyunGun,n}')::integer,0)+1 else 1 end;mul:=case when idx<=3 then 2 when idx>12 then .5 else 1 end;
   gold:=round((case (result->>'yildiz')::integer when 3 then 10 when 2 then 7 else 4 end)*mul);xp:=round((case when result->>'puanSurum'='3' then (result->>'xp')::numeric else case (result->>'yildiz')::integer when 3 then 50 when 2 then 35 else 20 end end)*mul);
   v:=jsonb_set(v,'{altin}',to_jsonb(coalesce((v->>'altin')::numeric,0)+gold));v:=jsonb_set(v,'{xp}',to_jsonb(coalesce((v->>'xp')::numeric,0)+xp));
   v:=jsonb_set(v,'{xpGun}',jsonb_build_object('tarih',day,'xp',case when v#>>'{xpGun,tarih}'=day then coalesce((v#>>'{xpGun,xp}')::numeric,0)+xp else xp end));
   v:=jsonb_set(v,'{log}',jsonb_set(coalesce(v->'log','{}'),array[day],to_jsonb(coalesce((v->'log'->>day)::numeric,0)+xp)));
   v:=jsonb_set(v,'{oyunGun}',jsonb_build_object('t',day,'n',idx));v:=jsonb_set(v,'{guncelleme}',to_jsonb(floor(extract(epoch from clock_timestamp())*1000)));
   if v ? 'lig' then v:=jsonb_set(v,'{lig,xp}',to_jsonb(coalesce((v#>>'{lig,xp}')::numeric,0)+xp));end if;
   update public.extra_data set value=v,updated_at=now() where student_id=case when n=0 then m.player_a else m.player_b end and key_name='yo';
   insert into public.game_scores(game_key,student_id,student_name,class_no,score,correct_count,wrong_count,duration_seconds,played_on,extra) select m.game,id,username,m.class_no,(result->>'puan')::numeric,(result->>'dogru')::integer,(result->>'yanlis')::integer,ceil((result->>'sure')::numeric),current_date,jsonb_build_object('v',coalesce((result->>'puanSurum')::integer,2),'matchId',m.id) from public.students where id=case when n=0 then m.player_a else m.player_b end;
   result:=result||jsonb_build_object('reward',jsonb_build_object('gold',gold,'xp',xp));if n=0 then m.result_a:=result;else m.result_b:=result;end if;
  end if;
 end loop;
 if m.result_a is not null and m.result_b is not null then m.status:='finished';end if;
 update public.dm_matches set ready_a=m.ready_a,ready_b=m.ready_b,start_a=m.start_a,start_b=m.start_b,status=m.status,answers_a=m.answers_a,answers_b=m.answers_b,result_a=m.result_a,result_b=m.result_b where id=m.id;
 idx:=floor(elapsed/12);q:=case when idx between 0 and jsonb_array_length(m.questions)-1 then m.questions->idx else null end;
 ra:=case when actor=m.player_a then m.result_a else m.result_b end;rb:=case when actor=m.player_a then m.result_b else m.result_a end;
 return jsonb_build_object('ok',true,'id',m.id,'game',m.game,'mode',m.mode,'status',m.status,'serverNow',now(),'start',start_at,'ready',case when actor=m.player_a then m.ready_a else m.ready_b end,'opponentReady',case when actor=m.player_a then m.ready_b else m.ready_a end,'index',idx,'total',jsonb_array_length(m.questions),'seconds',greatest(0,ceil(12-mod(greatest(elapsed,0),12))),'question',case when q is null then null else q-'answer' end,'answered',ans ? idx::text,'feedback',case when ans ? idx::text then q->>'answer' else null end,'myScore',(case when m.questions->0->>'puanSurum'='3' then public.dm_round_score_v3(ans,m.questions,false) else public.dm_round_score(ans,m.questions) end)->'puan','myResult',ra,'opponentResult',rb,'opponent',(select username from public.students where id=case when actor=m.player_a then m.player_b else m.player_a end));
end $function$
;

create or replace function public.dm_teacher_rally_start(grant_id uuid,actor uuid,run_key uuid,class_id int,unit_ids int[],question_deck jsonb,pace text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare st public.students;r public.dm_rally_runs;available int;ticks int;v jsonb;
begin
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci hesabı gerekli.';end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo';
 perform 1 from public.teacher_portal_access a join public.teachers t on t.id=a.teacher_id where a.id=grant_id and a.state='approved' and t.active and t.frozen_at is null and st.teacher_id=a.teacher_id;
 if not found then raise exception 'Öğretmen erişimi gerekli.';end if;
 select * into r from public.dm_rally_runs where id=run_key;
 if found then if r.student_id<>actor then raise exception 'Yarış bulunamadı.';end if;return public.dm_rally_view(r);end if;
 if class_id is null or class_id not between 1 and 8 or cardinality(unit_ids) not between 1 and 10 or exists(select 1 from unnest(unit_ids) u where u is null or u not between 1 and 100) or pace not in ('easy','normal','hard') or jsonb_typeof(question_deck) is distinct from 'array' or jsonb_array_length(question_deck)<>15 then raise exception 'Geçerli sınıf, ünite ve 15 kelime gerekli.';end if;
 if exists(select 1 from jsonb_array_elements(question_deck) q where jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options')<>3 or (q->>'answer')::int not between 0 and 2 or nullif(q->>'word','') is null) then raise exception 'Geçersiz yarış kelimeleri.';end if;
 if (select count(*) from public.dm_rally_runs where student_id=actor and created_at>now()-interval '1 minute')>=5 then raise exception 'Yeni yarış için kısa bir süre bekle.';end if;
 insert into public.dm_rally_runs(id,student_id,class_no,units,difficulty,deck,ranking_only) values(run_key,actor,class_id,unit_ids,pace,question_deck,true) returning * into r;
 return public.dm_rally_view(r)||jsonb_build_object('energy',st.energy,'energyMax',st.energy_max);
end $$;

create function public.dm_teacher_verified_start(actor uuid,run_key text,game_code text,cls int,unit_ids int[],stop_id int,tasks jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if game_code='ba' or stop_id<>0 then raise exception 'Öğretmen oyununda parkur yok';end if;
 if exists(select 1 from public.dm_verified_runs where student_id=actor and run_id=run_key and not ranking_only) then raise exception 'Kişisel oyun oturumu kullanılamaz';end if;
 result:=public.dm_verified_start(actor,run_key,game_code,cls,unit_ids,stop_id,tasks);
 update public.dm_verified_runs set ranking_only=true where student_id=actor and run_id=run_key;
 return result||jsonb_build_object('rankingOnly',true);
end $$;
revoke all on function public.dm_teacher_verified_start(uuid,text,text,int,int[],int,jsonb) from public,anon,authenticated;
grant execute on function public.dm_teacher_verified_start(uuid,text,text,int,int[],int,jsonb) to service_role;


CREATE OR REPLACE FUNCTION public.dm_break_start(actor uuid, run_key uuid, game_code text, chapter_no integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students;r public.dm_break_runs;available int;ticks int;chosen int;unlocked int;d text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 if run_key is null or game_code is null or game_code not in ('kosu','zipla','patlat') then raise exception 'Geçersiz oyun.';end if;
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_break_runs where id=run_key;
 if found then
  if r.student_id<>actor or r.game<>game_code then raise exception 'Oyun bulunamadı.';end if;
  return public.dm_break_status(actor)||public.dm_break_run_view(r);
 end if;
 select coalesce((select p.unlocked_chapter from public.dm_break_progress p where p.student_id=actor and p.game=game_code),1) into unlocked;
 chosen:=coalesce(chapter_no,unlocked);
 if chosen<1 or chosen>unlocked or chosen>10 then raise exception 'Bu bölüm henüz açılmadı.';end if;
 if (select count(*) from public.dm_break_runs where student_id=actor and day=d and game=game_code and not ranking_only)>=2 then raise exception 'Bugünkü 2 hakkın bitti, yarın yine gel';end if;
 ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900));
 available:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+ticks) end;
 if available<5 then raise exception 'Oyuna başlamak için 5 enerji gerekli.';end if;
 insert into public.dm_break_runs(id,student_id,game,day,start_chapter,chapter,highest_chapter) values(run_key,actor,game_code,d,chosen,chosen,chosen) returning * into r;
 update public.students set energy=available-5,energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
 insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-5,available-5,'mola:'||run_key);
 return public.dm_break_status(actor)||public.dm_break_run_view(r);
end $function$
;

CREATE OR REPLACE FUNCTION public.dm_break_checkpoint(actor uuid, run_key uuid, chapter_no integer, score integer, seconds integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.dm_break_runs;goal int;elapsed numeric;unlocked int;
begin
 perform 1 from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_break_runs where id=run_key and student_id=actor for update;
 if not found then raise exception 'Oyun bulunamadı.';end if;
 if r.ranking_only then return public.dm_teacher_break_checkpoint(actor,run_key,chapter_no,score,seconds);end if;
 if exists(select 1 from public.dm_break_checkpoints c where c.run_id=run_key and c.chapter=chapter_no) then return public.dm_break_status(actor)||public.dm_break_run_view(r)||jsonb_build_object('duplicate',true);end if;
 if r.status<>'playing' or r.completed_all or chapter_no is null or chapter_no<>r.chapter then raise exception 'Geçersiz bölüm sırası.';end if;
 elapsed:=extract(epoch from clock_timestamp()-r.created_at);
 if seconds is null or seconds>elapsed+1 or elapsed>7200 or seconds<r.checkpoint_seconds or score<r.checkpoint_score then raise exception 'Oyun süresi doğrulanamadı.';end if;
 perform public.dm_break_reward(r.game,score,0,seconds);
 select c.goal into goal from public.dm_break_chapters c where c.game=r.game and c.chapter=r.chapter;
 if score-r.chapter_start_score<goal then raise exception 'Bölüm eşiği henüz tamamlanmadı.';end if;
 insert into public.dm_break_checkpoints(run_id,chapter,score,seconds) values(run_key,r.chapter,score,seconds);
 unlocked:=least(10,r.chapter+1);
 insert into public.dm_break_progress(student_id,game,unlocked_chapter,completed_all) values(actor,r.game,unlocked,r.chapter=10)
 on conflict(student_id,game) do update set unlocked_chapter=greatest(public.dm_break_progress.unlocked_chapter,excluded.unlocked_chapter),completed_all=public.dm_break_progress.completed_all or excluded.completed_all,updated_at=now();
 update public.dm_break_runs set chapter=unlocked,highest_chapter=greatest(highest_chapter,unlocked),chapter_start_score=dm_break_checkpoint.score,checkpoint_score=dm_break_checkpoint.score,checkpoint_seconds=dm_break_checkpoint.seconds,score=dm_break_checkpoint.score,completed_all=(r.chapter=10) where id=run_key returning * into r;
 return public.dm_break_status(actor)||public.dm_break_run_view(r)||jsonb_build_object('completedChapter',chapter_no,'duplicate',false);
end $function$
;
commit;