CREATE OR REPLACE FUNCTION dm_private.team_snapshot(actor uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 with calendar as (select dm_private.team_today() as today),
 my_team as (select t.* from dm_private.team_members m join dm_private.teams t on t.id=m.team_id where m.student_id=actor and t.deleted_at is null),
 scores as (select s.* from dm_private.team_scores s join my_team t on t.id=s.team_id cross join calendar c where s.week=dm_private.team_week(c.today)),
 totals as (select student_id,sum(points) points from scores group by student_id)
 select jsonb_build_object(
 'ok',true,'me',actor,'team',(select jsonb_build_object('id',id,'name',name,'crest',crest,'captain',captain) from my_team),
 'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.student_id,'name',u.username,'points',coalesce(p.points,0)) order by m.joined_at)
 from dm_private.team_members m join my_team t on t.id=m.team_id join public.students u on u.id=m.student_id left join totals p on p.student_id=m.student_id),'[]'),
 'points',(select coalesce(sum(points),0) from scores),
 'latest',(select jsonb_build_object('name',u.username) from scores sc join public.students u on u.id=sc.student_id
  where not public.dm_blocked(actor,sc.student_id) order by sc.created_at desc limit 1),
 'tasks',(select jsonb_build_object('premium',count(*) filter(where kind='premium'),'duel',count(*) filter(where kind='duel'),'people',count(distinct student_id)) from scores,calendar where scores.day=calendar.today),
 'requests',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'kind',q.kind,'name',t.name,'crest',t.crest,'person',u.username,'incoming',q.student_id=actor,'expiresAt',case when q.kind in ('join','invite') then q.created_at+interval '24 hours' end) order by q.created_at desc)
 from dm_private.team_requests q join dm_private.teams t on t.id=q.team_id join public.students u on u.id=q.student_id where t.deleted_at is null
 and (q.kind='transfer' or q.created_at>now()-interval '24 hours')
 and ((q.student_id=actor and q.kind in ('invite','transfer')) or (t.captain=actor and q.kind='join'))),'[]'),
 'outgoing',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'kind',q.kind,'person',u.username))
 from dm_private.team_requests q join my_team t on t.id=q.team_id join public.students u on u.id=q.student_id
 where t.captain=actor and q.kind in ('invite','transfer') and (q.kind='transfer' or q.created_at>now()-interval '24 hours')),'[]'),
 'eligible',(select team_id=(select id from my_team) from dm_private.team_week_members where student_id=actor and week=dm_private.team_week(dm_private.team_today()))
 )
$function$;
