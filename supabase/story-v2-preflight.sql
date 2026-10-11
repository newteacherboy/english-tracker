-- Read-only migration preflight for Öğrenme Yolu.
-- Execute before any v2 deck activation. Never erase or reset current progress.
select count(*) as records,
       count(*) filter(where completed) as completed_records,
       count(*) filter(where not completed) as in_progress_records,
       count(*) filter(where cursor>0 and not completed) as nonzero_in_progress,
       min(cursor) as min_cursor,
       max(cursor) as max_cursor
from public.papi_story_progress;

-- A new exercise deck cannot replace legacy steps for any unfinished session.
-- Migration requirement: persist immutable deck_version per session and select
-- the corresponding version in both client and API.
-- Do not change chapter / cursor / version / reward_claimed during migration.

-- This query must return zero before a deployment which assumes an empty
-- unfinished-session population:
select count(*) as legacy_unfinished_sessions
from public.papi_story_progress
where not completed;
