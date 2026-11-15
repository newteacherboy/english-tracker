-- Staging only: Premium Cloud Flight and Block Papi verified completion policy.
-- Requires reward-success-policy-v2.sql. Never run without a staging replay test.
begin;
do $patch$
declare fn regprocedure; definition text; old_block text; new_block text; old_progress text;
begin
  foreach fn in array array[
    'public.dm_cloud_finish(uuid,uuid,integer[])'::regprocedure,
    'public.dm_blocks_finish(uuid,uuid,integer[])'::regprocedure
  ] loop
    definition:=pg_get_functiondef(fn);
    if strpos(definition,'reward-policy-v2-cloud-blocks')>0 then continue; end if;
    old_block:=$old$
  s:=case when crashed then 0 when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 when correct>0 then 1 else 0 end;
  if s=0 then
    x:=10; g:=2;
  else
$old$;
    new_block:=$new$
  -- reward-policy-v2-cloud-blocks: crashed rounds never unlock or pay.
  s:=case when crashed or correct*100<total*60 then 0
          when correct*100>=total*90 then 3
          when correct*100>=total*70 then 2 else 1 end;
  if s=0 then
    x:=0; g:=0;
  else
$new$;
    if strpos(definition,old_block)=0 then raise exception 'Unknown premium finish version: %',fn;end if;
    definition:=replace(definition,old_block,new_block);
    -- Old scale is replaced with a tier derived from server-verified answers.
    -- Existing replay logic must also be removed: first-clear only.
    if fn::text like '%dm_cloud_finish%' then
      old_progress:=$old$if not crashed then
    update public.dm_cloud_progress$old$;
    else
      old_progress:=$old$if not crashed then
    update public.dm_blocks_progress$old$;
    end if;
    if strpos(definition,old_progress)=0 then raise exception 'Progress gate changed: %',fn;end if;
    definition:=replace(definition,old_progress,
      replace(old_progress,'if not crashed then','if s>0 then'));
    execute definition;
  end loop;
end $patch$;
rollback; -- Deliberately review-only until replay reward logic is fully migrated.
