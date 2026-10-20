begin;
-- Additive ID range extension; existing progress, rewards and decks remain intact.
alter table public.papi_story_progress drop constraint papi_story_progress_chapter_check;
alter table public.papi_story_progress add constraint papi_story_progress_chapter_check check(chapter between 0 and 79 or chapter between 1000 and 1411);
alter table public.dm_thematic_first_answers drop constraint dm_thematic_first_answers_chapter_check;
alter table public.dm_thematic_first_answers add constraint dm_thematic_first_answers_chapter_check check(chapter between 1000 and 1411);
alter table public.dm_thematic_recovery drop constraint dm_thematic_recovery_chapter_check;
alter table public.dm_thematic_recovery add constraint dm_thematic_recovery_chapter_check check(chapter between 1000 and 1411);
do $patch$
declare f record;
begin
 for f in select pg_get_functiondef(oid) definition from pg_proc
 where pronamespace='public'::regnamespace
 and proname in ('dm_story_apply','dm_thematic_fair_step','dm_thematic_recovery_answer','dm_thematic_discount_final')
 and prosrc like '%1383%' loop
  execute replace(f.definition,'1383','1411');
 end loop;
end $patch$;
commit;
