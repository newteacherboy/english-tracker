-- 20 Oct 2026 (approved 17:18 TRT): learners with a class 1-8 and no starting test completed
-- after 2026-10-20 15:37 TRT lose their learning-route progress; earned XP and gold stay.
-- Rows are reset, not deleted: reward_claimed=true and replay=true keep a chapter from paying
-- its first-clear reward twice. Inherited old-route chapters get the same placeholder rows.
-- Everything touched is copied to dm_private.learning_reset_20261020_* first. Run once.
begin;
do $$ begin
  if to_regclass('dm_private.learning_reset_20261020_progress') is not null then
    raise exception 'learning route reset already ran';
  end if;
end $$;

create temporary table reset_students on commit drop as
select s.id, 's:'||s.id actor_key
from public.students s
where s.role='student' and s.class_no between 1 and 8
  and not exists (
    select 1 from public.extra_data e
    where e.student_id=s.id and e.key_name='placement_start_v1'
      and e.value->>'version'='starting-point-20261018-v1'
      and coalesce(e.value->>'completedAt','') ~ '^\d{4}-\d{2}-\d{2}T'
      and (e.value->>'completedAt')::timestamptz >= timestamptz '2026-10-20 12:37:00+00');

create table dm_private.learning_reset_20261020_progress as
  select p.* from public.papi_story_progress p join reset_students r on r.actor_key=p.actor_key where p.chapter>=1000;
create table dm_private.learning_reset_20261020_enrollment as
  select e.* from public.dm_thematic_enrollment e join reset_students r on r.actor_key=e.actor_key;
create table dm_private.learning_reset_20261020_recovery as
  select x.* from public.dm_thematic_recovery x join reset_students r on r.actor_key=x.actor_key;

update public.papi_story_progress p set
  cursor=0, completed=false, replay=true, reward_claimed=true, mistakes=0, questions_seen=0,
  charged_cursor=-1, attempt_cursor=-1, attempt_count=0, last_reward='{}'::jsonb, route_combo=0,
  review_cards='[]'::jsonb, version=p.version+1, updated_at=now()
from reset_students r where r.actor_key=p.actor_key and p.chapter>=1000;

insert into public.papi_story_progress(actor_key,student_id,chapter,cursor,completed,replay,reward_claimed,version)
select r.actor_key, r.id, 1000+g, 0, false, true, true, 0
from public.dm_thematic_enrollment e join reset_students r on r.actor_key=e.actor_key
cross join lateral generate_series(0, greatest(e.inherited_count,0)-1) g
on conflict do nothing;

update public.dm_thematic_enrollment e set inherited_count=0
from reset_students r where r.actor_key=e.actor_key and e.inherited_count>0;

delete from public.dm_thematic_recovery x using reset_students r where r.actor_key=x.actor_key;

select (select count(*) from reset_students) students,
       (select count(distinct actor_key) from dm_private.learning_reset_20261020_progress) students_with_progress,
       (select count(*) from dm_private.learning_reset_20261020_progress) progress_rows,
       (select count(*) from dm_private.learning_reset_20261020_progress where completed) completed_rows,
       (select coalesce(sum(inherited_count),0) from dm_private.learning_reset_20261020_enrollment) inherited_chapters;
commit;
