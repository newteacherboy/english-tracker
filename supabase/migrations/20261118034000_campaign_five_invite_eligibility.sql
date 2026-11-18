-- Individual prize ranking requires five verified referrals; teacher score and raw learner XP remain unchanged.
create or replace function dm_private.campaign_student_rows(p_key text) returns table(student_id uuid, name text, xp integer, rank bigint, teacher_id uuid)
language sql stable set search_path='' as $$
 select s.id,s.username,x.xp,row_number() over(order by x.xp desc,s.created_at,s.id),s.teacher_id
 from public.dm_campaign_scores x join public.students s on s.id=x.student_id
 where x.campaign=p_key and x.xp>0 and dm_private.campaign_student_ok(s)
  and (select count(*) from public.dm_campaign_invites i where i.campaign=p_key and i.inviter_id=s.id and i.verified_at is not null)>=5
  and not exists(select 1 from public.dm_campaign_exclusions e where e.campaign=p_key and e.account_id=s.id and e.account_role='student')
$$;

create or replace function public.dm_campaign_status(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ses jsonb; c public.dm_campaigns; sid uuid; tid uuid; me record; prize int; total int; code text; res jsonb; uname text; visible boolean; actual_xp int; verified_invites int; top5 int;
begin
 ses:=dm_private.campaign_session(p_token);
 if ses is null then return jsonb_build_object('ok',false,'visible',false); end if;
 select * into c from public.dm_campaigns where key='ogretmenimle-zirveye-2026';
 if not found then return jsonb_build_object('ok',false,'visible',false); end if;
 uname:=ses->>'username';
 visible:=c.public or (ses->>'admin')::boolean or (uname is not null and uname=any(c.preview_usernames));
 if not visible then return jsonb_build_object('ok',true,'visible',false); end if;
 res:=jsonb_build_object('ok',true,'visible',true,'preview',not c.public,'admin',(ses->>'admin')::boolean,'role',ses->>'kind',
  'campaign',jsonb_build_object('key',c.key,'title',c.title,'startsOn',c.starts_on,'endsOn',c.ends_on,'resultsOn',c.results_on,
    'phase',dm_private.campaign_phase(c),'refreshedAt',c.refreshed_at,
    'daysLeft',greatest(0,c.ends_on-(now() at time zone 'Europe/Istanbul')::date+1),
    'daysToStart',greatest(0,c.starts_on-(now() at time zone 'Europe/Istanbul')::date)),
  'cap',3500);
 if ses->>'kind'='teacher' then
  tid:=(ses->>'teacher_id')::uuid;
  return res||jsonb_build_object('teacher',dm_private.campaign_teacher_stats(c.key,tid));
 end if;
 sid:=(ses->>'student_id')::uuid;
 if coalesce((ses->>'guest')::boolean,false) then
  return res||jsonb_build_object('guest',true,'me',jsonb_build_object('xp',0,'rank',null,'today',0,'toPrize',0));
 end if;
 select * into me from dm_private.campaign_student_rows(c.key) x where x.student_id=sid;
 select coalesce((select x.xp from public.dm_campaign_scores x where x.campaign=c.key and x.student_id=sid),0) into actual_xp;
 select count(*)::int into verified_invites from public.dm_campaign_invites i where i.campaign=c.key and i.inviter_id=sid and i.verified_at is not null;
 select count(*)::int,coalesce(max(xp) filter(where rank=20),0) into total,prize from dm_private.campaign_student_rows(c.key);
 select coalesce(max(xp) filter(where rank=5),0) into top5 from dm_private.campaign_student_rows(c.key);
 select x.code into code from public.dm_campaign_invite_codes x where x.student_id=sid;
 select s.teacher_id into tid from public.students s where s.id=sid;
 return res||jsonb_build_object(
  'me',jsonb_build_object('xp',actual_xp,'rank',me.rank,'toTop5',case when me.rank is not null and me.rank<=5 then 0 else greatest(1,top5-actual_xp+1) end,'eligible',verified_invites>=5,'inviteGoal',5,'participants',total,'today',dm_private.campaign_today_xp(c,sid),
    'toPrize',case when me.rank is not null and me.rank<=20 then 0 when total<20 then case when actual_xp>0 then 0 else 1 end else greatest(1,prize-actual_xp+1) end),
  'invite',jsonb_build_object('code',code,'goal',5,'rankGoal',5,
    'verified',verified_invites,
    'pending',(select count(*) from public.dm_campaign_invites i where i.campaign=c.key and i.inviter_id=sid and i.verified_at is null),
    'rewarded',exists(select 1 from public.dm_campaign_rewards w where w.campaign=c.key and w.account_id=sid and w.kind='invite10'),
    'invitedBy',(select s.username from public.dm_campaign_invites i join public.students s on s.id=i.inviter_id where i.campaign=c.key and i.invitee_id=sid)),
  'hasTeacher',tid is not null);
end $$;

create or replace function dm_private.campaign_refresh(p_key text default 'ogretmenimle-zirveye-2026', p_force boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.dm_campaigns; a timestamptz; b timestamptz; n_scores int; n_verified int:=0; n_rewards int:=0; rr record;
begin
 select * into c from public.dm_campaigns where key=p_key for update;
 if not found then return jsonb_build_object('ok',false,'reason','no_campaign'); end if;
 if c.finalized_at is not null then return jsonb_build_object('ok',true,'skipped','finalized'); end if;
 select x.a,x.b into a,b from dm_private.campaign_bounds(c) x;
 if not p_force and (now()<a or now()>b+interval '2 hours') then return jsonb_build_object('ok',true,'skipped','outside'); end if;

 with st as (select s.id from public.students s where dm_private.campaign_student_ok(s)),
 ev as (
  select r.student_id sid,(r.created_at at time zone 'Europe/Istanbul')::date d,r.xp p
   from public.dm_game_reward_runs r join st on st.id=r.student_id where r.xp>0 and r.created_at>=a and r.created_at<b
  union all
  select x.sid,(x.f at time zone 'Europe/Istanbul')::date,80
   from (select l.student_id sid,min(l.completed_at) f from public.lesson_progress l join st on st.id=l.student_id where l.test_success group by l.student_id,l.level,l.category,l.topic_name) x
   where x.f>=a and x.f<b
 ),
 daily as (select sid,d,least(3500,sum(p)) v from ev group by sid,d),
 tot as (select sid,sum(v)::int xp from daily group by sid)
 insert into public.dm_campaign_scores(campaign,student_id,xp,updated_at)
 select p_key,sid,xp,now() from tot
 on conflict(campaign,student_id) do update set xp=excluded.xp,updated_at=now() where public.dm_campaign_scores.xp is distinct from excluded.xp;
 get diagnostics n_scores=row_count;
 delete from public.dm_campaign_scores x where x.campaign=p_key
  and not exists(select 1 from public.students s where s.id=x.student_id and dm_private.campaign_student_ok(s));

 -- Davet doğrulama
 update public.dm_campaign_invites i set verified_at=now()
 from public.students s
 where i.campaign=p_key and i.verified_at is null and s.id=i.invitee_id and i.created_at<b
  and dm_private.campaign_student_ok(s) and s.email_verified_at is not null
  and (select count(*) from public.level_completions l where l.student_id=s.id and l.mode='buyu')>=3
  and exists(select 1 from (
    select (g.created_at at time zone 'Europe/Istanbul')::date d,sum(g.xp) v from public.dm_game_reward_runs g
    where g.student_id=s.id and g.xp>0 and g.created_at>=(((i.created_at at time zone 'Europe/Istanbul')::date)::timestamp at time zone 'Europe/Istanbul') and g.created_at<b
    group by 1) q where q.v>=300);
 get diagnostics n_verified=row_count;

 -- No automatic reward for ten invites; five verified invites unlock individual ranking.


 update public.dm_campaigns set refreshed_at=now() where key=p_key;
 return jsonb_build_object('ok',true,'scores',n_scores,'verified',n_verified,'inviteRewards',n_rewards);
end $$;
