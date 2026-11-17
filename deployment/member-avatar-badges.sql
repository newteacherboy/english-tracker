-- Public badge tier only, restricted to the edge service role.
create or replace function public.dm_member_badge_plans(p_ids uuid[])
returns table(id uuid,tier text) language sql stable security invoker set search_path='' as $$
 select s.id,public.dm_plan(s.id,'student') from public.students s where s.id=any(p_ids) and s.role='student' and s.status='approved' and s.frozen_at is null
$$;
revoke all on function public.dm_member_badge_plans(uuid[]) from public,anon,authenticated;
grant execute on function public.dm_member_badge_plans(uuid[]) to service_role;
-- Preserve weekly league calculation, adding only a cosmetic field for visible members.
create or replace function public.dm_progress_league(week date DEFAULT (date_trunc('week'::text,(now() AT TIME ZONE 'Europe/Istanbul'::text)))::date)
returns jsonb language sql stable set search_path='' as $$
with base as (select s.id,s.username,s.class_no,public.dm_student_level(coalesce((e.value->>'totalXp')::numeric,0)) level,public.dm_competitive_xp(s.id,week) xp from public.students s left join public.extra_data e on e.student_id=s.id and e.key_name='yo' where s.status='approved' and s.role='student' and s.id<>'dcde2026-1015-4000-8000-000000000001'::uuid), tier as (select *,case when level>=15 and xp>=1800 then 'sampiyon' when level>=10 and xp>=750 then 'super' else 'yerel' end league from base where level>=5), ranks as (select *,row_number() over(partition by league order by xp desc,username,id) rank from tier)
select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',username,'class',class_no,'level',level,'xp',xp,'league',league,'rank',rank,'membership_tier',public.dm_plan(id,'student')) order by xp desc,username,id),'[]') from ranks;
$$;