create table if not exists public.dm_goal3d_progress(
 student_id uuid primary key references public.students(id) on delete cascade,
 reward_day date not null default ((now() at time zone 'Europe/Istanbul')::date),
 used integer not null default 0 check(used>=0),
 total_goals integer not null default 0 check(total_goals>=0),
 best integer not null default 0 check(best>=0),
 goals integer not null default 0 check(goals>=0),
 run_id uuid, question jsonb, seen text[] not null default '{}',
 last_question uuid,last_reply jsonb,updated_at timestamptz not null default now()
);
alter table public.dm_goal3d_progress enable row level security;
revoke all on public.dm_goal3d_progress from public,anon,authenticated;
grant select,insert,update,delete on public.dm_goal3d_progress to service_role;
create or replace function public.dm_goal3d_access(actor uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare p text:=public.dm_plan(actor,'student'); d date:=(now() at time zone 'Europe/Istanbul')::date;
 used int; old_used int; bonus int;
begin
 select coalesce((select x.used from public.dm_goal3d_progress x where x.student_id=actor and x.reward_day=d),0) into used;
 select count(*) into old_used from public.dm_goal_runs where student_id=actor and started_at>=d::timestamp at time zone 'Europe/Istanbul';
 select count(*) into bonus from dm_ad_rewards.premium_offers where student_id=actor and game='word-goal' and reward_day=d and redeemed_at is not null;
 return jsonb_build_object('ok',true,'plan',p,'premium',p='premium_pro','limit',case when p='premium_pro' then 999 else 2+bonus end,'remaining',case when p='premium_pro' then 999 else greatest(0,2+bonus-used-old_used) end,'period','day');
end $$;
create or replace function public.dm_goal3d_question(p_goals integer,p_seen text[]) returns jsonb
language plpgsql volatile set search_path='' as $$
declare grade int:=least(8,1+p_goals/15); unit_limit int:=1+((p_goals%15)/5)*2; en text; tr text; wrong text; opts text[]; correct int;
begin
 select trim(w.english),trim(w.turkish) into en,tr from public.word_bank w
 where w.active and w.class_no=grade and length(trim(w.english)) between 1 and 60 and length(trim(w.turkish)) between 1 and 28
 order by (lower(trim(w.english))=any(p_seen)),(w.unit_no>unit_limit),random() limit 1;
 if en is null then raise exception 'Kelime havuzu hazır değil.'; end if;
 select trim(w.turkish) into wrong from public.word_bank w where w.active and w.class_no=grade and lower(trim(w.turkish))<>lower(tr) and lower(trim(w.english))<>lower(en) and length(trim(w.turkish)) between 1 and 28 order by random() limit 1;
 if wrong is null then raise exception 'Kelime havuzu hazır değil.'; end if;
 if random()<.5 then opts:=array[tr,wrong];correct:=0;else opts:=array[wrong,tr];correct:=1;end if;
 return jsonb_build_object('id',gen_random_uuid(),'en',en,'tr',tr,'options',opts,'correct',correct,'grade',grade);
end $$;
create or replace function public.dm_goal3d_play(p_actor uuid,p_op text,p_question uuid default null,p_pick integer default null)
returns jsonb language plpgsql set search_path='' as $$
declare st public.students; s public.dm_goal3d_progress; d date:=(now() at time zone 'Europe/Istanbul')::date; access jsonb; outcome jsonb:='{}'; good boolean; q jsonb;
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
   s.used:=s.used+1;s.run_id:=gen_random_uuid();s.goals:=0;s.question:=public.dm_goal3d_question(s.total_goals,s.seen);s.seen:=array_append(s.seen,lower(s.question->>'en'));s.last_question:=null;s.last_reply:=null;
  end if;
 elsif p_op='answer' then
  if p_question is not null and p_question=s.last_question then return s.last_reply;end if;
  if s.run_id is null or p_question is null or p_pick is null or p_pick not in (0,1) or p_question::text<>s.question->>'id' then return access||jsonb_build_object('ok',false,'message','Tur güncellendi. Tekrar aç.');end if;
  q:=s.question; good:=p_pick=(q->>'correct')::integer;
  outcome:=jsonb_build_object('correct',good,'answer',q->>'tr','word',q->>'en');
  s.last_question:=p_question;
  if good then s.goals:=s.goals+1;s.total_goals:=s.total_goals+1;s.best:=greatest(s.best,s.goals);
    s.question:=public.dm_goal3d_question(s.total_goals,s.seen);s.seen:=array_append(s.seen,lower(s.question->>'en'));
  else s.run_id:=null;s.question:=null;end if;
 elsif p_op<>'status' then raise exception 'Geçersiz işlem.';end if;
 if cardinality(s.seen)>120 then s.seen:=s.seen[(cardinality(s.seen)-119):cardinality(s.seen)];end if;
 update public.dm_goal3d_progress set reward_day=s.reward_day,used=s.used,total_goals=s.total_goals,best=s.best,goals=s.goals,run_id=s.run_id,question=s.question,seen=s.seen,last_question=s.last_question,last_reply=s.last_reply,updated_at=now() where student_id=p_actor;
 outcome:=public.dm_goal3d_access(p_actor)||outcome||jsonb_build_object('runId',s.run_id,'question',s.question-'tr'-'correct','goals',s.goals,'totalGoals',s.total_goals,'best',s.best);
 if p_op='answer' then update public.dm_goal3d_progress set last_reply=outcome where student_id=p_actor;end if;
 return outcome;
end $$;
revoke all on function public.dm_goal3d_access(uuid),public.dm_goal3d_question(integer,text[]),public.dm_goal3d_play(uuid,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.dm_goal3d_access(uuid),public.dm_goal3d_question(integer,text[]),public.dm_goal3d_play(uuid,text,uuid,integer) to service_role;

CREATE OR REPLACE FUNCTION public.dm_game_access(actor uuid, game_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare p text; joined date; today date:=(now() at time zone 'Europe/Istanbul')::date;
 beginning timestamptz:=date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
 n int; lim int; expires date;
begin
 if game_key='word-goal' and not exists(select 1 from public.teacher_portal_guests g where g.student_id=actor) then return public.dm_goal3d_access(actor); end if;
 p:=public.dm_plan(actor,'student');
 select (coalesce(t.created_at,s.created_at) at time zone 'Europe/Istanbul')::date into joined
 from public.students s left join public.teacher_portal_guests g on g.student_id=s.id
 left join public.teacher_portal_access a on a.id=g.access_id
 left join public.teachers t on t.id=a.teacher_id where s.id=actor;
 if joined is null then raise exception 'Öğrenci oturumu gerekli.'; end if;
 expires:=greatest(joined,date '2026-11-14')+3;
 lim:=case when p='premium_pro' then 999 when p='pro' then 5 when public.dm_game_trial_active(joined,today) then 1 else 0 end;
 -- premium-ad-plays-v1
 if p<>'premium_pro' then
  lim:=lim+(select count(*)::int from dm_ad_rewards.premium_offers where student_id=actor and game=game_key and reward_day=today and redeemed_at is not null);
 end if;
 case game_key
 when 'word-match' then select count(*) into n from public.dm_premium_match_runs where student_id=actor and started_at>=beginning;
 when 'cloud-flight' then select count(*) into n from public.dm_cloud_runs where student_id=actor and started_at>=beginning;
 when 'word-blocks' then select count(*) into n from public.dm_blocks_runs where student_id=actor and started_at>=beginning;
 when 'papizzle' then select count(*) into n from public.dm_papizzle_runs where student_id=actor and started_at>=beginning;
 when 'rally' then select count(*) into n from public.dm_rally_runs where student_id=actor and created_at>=beginning;
 when 'tower' then select count(*) into n from public.dm_tower_runs where student_id=actor and started_at>=beginning;
 when 'word-goal' then select count(*) into n from public.dm_goal_runs where student_id=actor and started_at>=beginning;
 else raise exception 'Geçersiz oyun.';
 end case;
 return jsonb_build_object('plan',p,'premium',p='premium_pro','limit',lim,'period','day',
 'trialEnds',expires,'remaining',case when p='premium_pro' then 999 else greatest(0,lim-n) end);
end $function$
;
