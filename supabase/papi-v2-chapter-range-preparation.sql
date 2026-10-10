-- DijiMedu Papi V2 PREPARATION ONLY. DO NOT APPLY TO PRODUCTION ALONE.
-- Inspected actual schema October 2026: constraint papi_story_progress_chapter_check is a 0..39 check.
-- This file is NOT a deployment migration; server/API also checks chapter 0..39.
-- Before deployment: verified backup, staging verification, reviewed RPC, track-aware unlock order.
BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint
   WHERE conrelid='public.papi_story_progress'::regclass
     AND conname='papi_story_progress_chapter_check'
     AND pg_get_constraintdef(oid) LIKE '%chapter >= 0%'
     AND pg_get_constraintdef(oid) LIKE '%chapter <= 39%'
 ) THEN
   RAISE EXCEPTION 'Expected current chapter constraint not found; migration cancelled';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.papi_story_progress WHERE chapter > 39 OR chapter < 0
 ) THEN
   RAISE EXCEPTION 'Unexpected existing chapter rows; migration cancelled';
 END IF;
END $$;
ALTER TABLE public.papi_story_progress DROP CONSTRAINT papi_story_progress_chapter_check;
ALTER TABLE public.papi_story_progress ADD CONSTRAINT papi_story_progress_chapter_check
 CHECK (chapter BETWEEN 0 AND 79);
COMMIT;
-- Verification, read only:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid='public.papi_story_progress'::regclass AND conname='papi_story_progress_chapter_check';
-- Rollback only after checking no chapter >=40 rows exist:
-- BEGIN; ALTER TABLE public.papi_story_progress DROP CONSTRAINT papi_story_progress_chapter_check;
-- ALTER TABLE public.papi_story_progress ADD CONSTRAINT papi_story_progress_chapter_check CHECK(chapter BETWEEN 0 AND 39); COMMIT;
