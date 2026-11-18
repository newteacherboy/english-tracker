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
declare ses jsonb; c public.dm_campaigns; sid uuid; tid uuid; me record; prize int; total int; code text; res jsonb; uname text; visible boolean; actual_xp int; verified_invites int;
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
 select x.code into code from public.dm_campaign_invite_codes x where x.student_id=sid;
 select s.teacher_id into tid from public.students s where s.id=sid;
 return res||jsonb_build_object(
  'me',jsonb_build_object('xp',actual_xp,'rank',me.rank,'eligible',verified_invites>=5,'inviteGoal',5,'participants',total,'today',dm_private.campaign_today_xp(c,sid),
    'toPrize',case when me.rank is not null and me.rank<=20 then 0 when total<20 then case when actual_xp>0 then 0 else 1 end else greatest(1,prize-actual_xp+1) end),
  'invite',jsonb_build_object('code',code,'goal',10,'rankGoal',5,
    'verified',verified_invites,
    'pending',(select count(*) from public.dm_campaign_invites i where i.campaign=c.key and i.inviter_id=sid and i.verified_at is null),
    'rewarded',exists(select 1 from public.dm_campaign_rewards w where w.campaign=c.key and w.account_id=sid and w.kind='invite10'),
    'invitedBy',(select s.username from public.dm_campaign_invites i join public.students s on s.id=i.inviter_id where i.campaign=c.key and i.invitee_id=sid)),
  'hasTeacher',tid is not null);
end $$;
