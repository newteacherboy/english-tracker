alter table public.dm_goal3d_progress add column if not exists run_xp integer not null default 0 check(run_xp>=0);
CREATE OR REPLACE FUNCTION public.dm_goal3d_play(p_actor uuid, p_op text, p_question uuid DEFAULT NULL::uuid, p_pick integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; s public.dm_goal3d_progress; d date:=(now() at time zone 'Europe/Istanbul')::date; access jsonb; outcome jsonb:='{}'; good boolean; q jsonb; v jsonb; ver bigint; credited integer; day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 select * into st from public.students where id=p_actor and status='approved' and role='student' and frozen_at is null for update;
 if not found or coalesce(st.profile->>'teacher_portal_guest','false')='true' then raise exception 'Öğrenci oturumu gerekli.'; end if;
 insert into public.dm_goal3d_progress(student_id) values(p_actor) on conflict do nothing;
 select * into s from public.dm_goal3d_progress where student_id=p_actor for update;
 if s.reward_day<>d then s.reward_day:=d;s.used:=0;end if;
 access:=public.dm_goal3d_access(p_actor);
 if p_op='start' then
  if s.run_id is null then
   if not (access->>'premium')::boolean and (access->>'remaining')::int<=0 then return access||jsonb_build_object('ok',false,'message','Bugünkü oyun hakkın doldu.');end if;
   s.used:=s.used+1;s.run_id:=gen_random_uuid();s.goals:=0;s.run_xp:=0;s.question:=public.dm_goal3d_question(s.total_goals,s.seen);s.seen:=array_append(s.seen,lower(s.question->>'en'));s.last_question:=null;s.last_reply:=null;
  end if;
 elsif p_op='answer' then
  if p_question is not null and p_question=s.last_question then return s.last_reply;end if;
  if s.run_id is null or p_question is null or p_pick is null or p_pick not in (0,1) or p_question::text<>s.question->>'id' then return access||jsonb_build_object('ok',false,'message','Tur güncellendi. Tekrar aç.');end if;
  q:=s.question; good:=p_pick=(q->>'correct')::integer;
  outcome:=jsonb_build_object('correct',good,'answer',q->>'tr','word',q->>'en');
  s.last_question:=p_question;
  if good then
    -- The locked run and question checks make each answer idempotent.
    -- One reward ledger entry per run/day avoids altering other games' daily run counts.
    insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold)
    values(p_actor,'goal3d:'||s.run_id::text||':'||day,'word-goal-3d',coalesce((q->>'grade')::int,0),'{}',5,0)
    on conflict(student_id,run_id) do update set xp=public.dm_game_reward_runs.xp+5;
    credited:=5;
    if credited=5 then
      insert into public.extra_data(student_id,key_name,value) values(p_actor,'yo',jsonb_build_object('totalXp',0,'altin',coalesce(st.gold,0))) on conflict(student_id,key_name) do nothing;
      select value into v from public.extra_data where student_id=p_actor and key_name='yo' for update;
      ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
      v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+5,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
      v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
      v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+5));
      v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));
      v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+5));
      update public.extra_data set value=v,updated_at=now() where student_id=p_actor and key_name='yo';
      s.run_xp:=s.run_xp+5;
    end if;
    s.goals:=s.goals+1;s.total_goals:=s.total_goals+1;s.best:=greatest(s.best,s.goals);
    s.question:=public.dm_goal3d_question(s.total_goals,s.seen);s.seen:=array_append(s.seen,lower(s.question->>'en'));
  else s.run_id:=null;s.question:=null;end if;
 elsif p_op<>'status' then raise exception 'Geçersiz işlem.';end if;
 if cardinality(s.seen)>120 then s.seen:=s.seen[(cardinality(s.seen)-119):cardinality(s.seen)];end if;
 update public.dm_goal3d_progress set reward_day=s.reward_day,used=s.used,total_goals=s.total_goals,best=s.best,goals=s.goals,run_xp=s.run_xp,run_id=s.run_id,question=s.question,seen=s.seen,last_question=s.last_question,last_reply=s.last_reply,updated_at=now() where student_id=p_actor;
 outcome:=public.dm_goal3d_access(p_actor)||outcome||jsonb_build_object('runId',s.run_id,'question',s.question-'tr'-'correct','goals',s.goals,'totalGoals',s.total_goals,'best',s.best,'runXp',s.run_xp);
 if p_op='answer' then
  select value into v from public.extra_data where student_id=p_actor and key_name='yo';
  outcome:=outcome||jsonb_build_object('yo',v);
  update public.dm_goal3d_progress set last_reply=outcome where student_id=p_actor;end if;
 return outcome;
end $function$;
