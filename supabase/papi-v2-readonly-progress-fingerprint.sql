-- DijiMedu Papi V2: read-only pre/post migration fingerprint.
-- Store the output securely outside the database before any production migration.
-- This is NOT a restorable backup. It contains aggregates only, no student identifiers.
select
  clock_timestamp() as checked_at,
  count(*) as progress_rows,
  count(distinct actor_key) as actors,
  count(*) filter (where completed) as completed_rows,
  coalesce(sum(cursor),0) as sum_cursor,
  coalesce(sum(version),0) as sum_version,
  coalesce(sum(mistakes),0) as sum_mistakes,
  coalesce(sum(questions_seen),0) as sum_questions_seen,
  coalesce(sum((reward_claimed)::int),0) as total_reward_claimed,
  coalesce(sum((replay)::int),0) as replay_rows,
  coalesce(max(chapter),-1) as max_chapter
from public.papi_story_progress;
-- Invariant: zero rows outside original range before enabling V2.
select count(*) as out_of_range_before_migration
from public.papi_story_progress where chapter not between 0 and 39;
-- RLS and database-owned function privileges should be reviewed before release.
select c.relrowsecurity as rls_enabled,
  has_table_privilege('anon','public.papi_story_progress','SELECT') as anon_can_select,
  has_table_privilege('authenticated','public.papi_story_progress','SELECT') as authenticated_can_select
from pg_class c where c.oid='public.papi_story_progress'::regclass;
