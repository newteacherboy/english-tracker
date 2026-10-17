-- Preserve the shared transaction and legacy 0..79 economy; use one implementation.
begin;
do $patch$
declare source text;
begin
 if to_regprocedure('public.dm_story_apply(text,integer,integer,integer,boolean,boolean,integer,integer,boolean)') is not null then
  select pg_get_functiondef('public.dm_story_apply(text,integer,integer,integer,boolean,boolean,integer,integer,boolean)'::regprocedure) into source;
 else
  select pg_get_functiondef('public.dm_story_apply(text,integer,integer,integer,boolean,boolean,integer,integer)'::regprocedure) into source;
  source:=replace(source,'question_count integer)','question_count integer, combo_correct boolean)');
 end if;
 source:=replace(source,'if seen%2=0 then costs:=1;end if;','if chapter_no>=1000 or seen%2=0 then costs:=1;end if;');
 source:=replace(source,'combo%3=0','combo % (case when chapter_no>=1000 then 5 else 3 end)=0');
 source:=replace(source,'if not answer_correct then combo:=0;','if not combo_correct then combo:=0;');
 source:=replace(source,'if s.id is not null and answer_correct and is_question','if s.id is not null and combo_correct and is_question');
 source:=replace(source,'p.mistakes+case when answer_correct then 0 else 1 end','p.mistakes+case when combo_correct then 0 else 1 end');
 source:=replace(source,'is_question is null then raise exception','(is_question is null or combo_correct is null) then raise exception');
 if position('combo_correct boolean' in source)=0 or position('chapter_no>=1000 or seen%2=0' in source)=0 then raise exception 'Story economy patch did not match the live implementation';end if;
 execute source;
end $patch$;
-- Existing eight-argument callers retain their contract and use the same transaction.
create or replace function public.dm_story_apply(owner_key text,chapter_no integer,expected_cursor integer,expected_version integer,answer_correct boolean,is_question boolean,step_count integer,question_count integer)
returns jsonb language sql security invoker set search_path='' as $wrapper$
 select public.dm_story_apply(owner_key,chapter_no,expected_cursor,expected_version,answer_correct,is_question,step_count,question_count,answer_correct);
$wrapper$;
revoke all on function public.dm_story_apply(text,integer,integer,integer,boolean,boolean,integer,integer) from public,anon,authenticated;
revoke all on function public.dm_story_apply(text,integer,integer,integer,boolean,boolean,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.dm_story_apply(text,integer,integer,integer,boolean,boolean,integer,integer) to service_role;
grant execute on function public.dm_story_apply(text,integer,integer,integer,boolean,boolean,integer,integer,boolean) to service_role;
commit;
