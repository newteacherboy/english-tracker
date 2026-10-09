-- Papi V2 preparation ONLY. This migration is NOT executed in production.
-- Expands chapter identifier storage safely but DOES NOT enable new chapters in story-api.ts.
-- IMPORTANT: apply only after staging tests and an agreed deployment/rollback plan.
begin;
do $$
declare c record;
begin
 for c in select conname from pg_constraint
  where conrelid='public.papi_story_progress'::regclass and contype='c'
    and pg_get_constraintdef(oid) ~* 'chapter.*between.*0.*39'
 loop
  execute format('alter table public.papi_story_progress drop constraint %I', c.conname);
 end loop;
end $$;
alter table public.papi_story_progress
 add constraint papi_story_chapter_v2_range check (chapter between 0 and 79);
commit;
-- Rollback only if there are no saved chapter>=40 rows:
-- ALTER TABLE public.papi_story_progress DROP CONSTRAINT papi_story_chapter_v2_range;
-- ALTER TABLE public.papi_story_progress ADD CONSTRAINT papi_story_progress_chapter_check CHECK(chapter BETWEEN 0 AND 39);
-- Before rollout inspect dm_story_apply() and all related constraints, not just this table.
