-- Retire collection-only feed processing without replacing other live feed logic.
do $retire_collection$
declare
 definition text;
 first_pos integer;
 next_pos integer;
begin
 select pg_get_functiondef('public.dm_feed_achievement()'::regprocedure) into definition;
 first_pos:=strpos(definition,$marker$  for item in select jsonb_array_elements_text(coalesce(current_value->'krkSatin'$marker$);
 if first_pos>0 then
  next_pos:=strpos(definition,$marker$  for item in select jsonb_array_elements_text(coalesce(current_value#>'{karakter,sahip}'$marker$);
  if next_pos<=first_pos then raise exception 'Unexpected character feed block; refusing to change other achievements';end if;
  definition:=substr(definition,1,first_pos-1)||substr(definition,next_pos);
 end if;
 definition:=regexp_replace(definition,'"koleksiyoncu"\s*:\s*"Koleksiyoncu"\s*,\s*','','g');
 execute definition;
end $retire_collection$;

-- Remove obsolete collection announcements, retaining every other feed category.
delete from public.feed_events
where event_type='character_earned'
   or payload ? 'character_name'
   or (event_type='badge_earned' and payload->>'badge_id'='koleksiyoncu');
delete from public.dm_feed_awards
where event_key like 'character:%' or event_key='badge:koleksiyoncu';
