CREATE OR REPLACE FUNCTION public.dm_progress_league(week date DEFAULT (date_trunc('week'::text, (now() AT TIME ZONE 'Europe/Istanbul'::text)))::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with base as (select s.id,s.username,s.class_no,public.dm_student_level(coalesce((e.value->>'totalXp')::numeric,0)) level,public.dm_competitive_xp(s.id,week) xp from public.students s left join public.extra_data e on e.student_id=s.id and e.key_name='yo' where s.status='approved' and s.role='student' and s.id<>'dcde2026-1015-4000-8000-000000000001'::uuid), tier as (select *,case when level>=15 and xp>=1800 then 'sampiyon' when level>=10 and xp>=750 then 'super' else 'yerel' end league from base where level>=5), ranks as (select *,row_number() over(partition by league order by xp desc,username,id) rank from tier)
select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',username,'class',class_no,'level',level,'xp',xp,'league',league,'rank',rank) order by xp desc,username,id),'[]') from ranks;
$function$

