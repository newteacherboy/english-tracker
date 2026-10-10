-- READ ONLY. Run in Supabase SQL Editor to inspect Papi learning rollout readiness.
select 'progress_summary' as check_name,
 jsonb_build_object('rows',count(*),'actors',count(distinct actor_key),
 'completed',count(*) filter(where completed),'max_chapter',max(chapter)) as result
from public.papi_story_progress
union all
select 'chapter_constraint',jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid))
from pg_constraint where conrelid='public.papi_story_progress'::regclass and conname='papi_story_progress_chapter_check'
union all
select 'cursor_constraint',jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid))
from pg_constraint where conrelid='public.papi_story_progress'::regclass and conname='papi_story_progress_cursor_check'
union all
select 'rpc_checks',jsonb_build_object('range_0_39',position('chapter_no not between 0 and 39' in pg_get_functiondef(oid))>0,
'question_limit_8',position('question_count not between 1 and 8' in pg_get_functiondef(oid))>0)
from pg_proc where proname='dm_story_apply' and pronamespace='public'::regnamespace;
