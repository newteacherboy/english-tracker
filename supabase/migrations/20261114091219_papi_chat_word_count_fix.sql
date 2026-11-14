-- Normalization collapses whitespace to single spaces. Count those words directly.
do $migration$
declare definition text; old_line text;
begin
 select pg_get_functiondef('public.dm_papi_dialogue(uuid,text,jsonb)'::regprocedure) into definition;
 old_line:=split_part(split_part(definition,'words:=',2),chr(10),1);
 if strpos(old_line,'regexp_split_to_array(normalized,')=0 then
  raise exception 'Unexpected Papi word-count definition';
 end if;
 definition:=replace(definition,'words:='||old_line,$new$words:=case when normalized='' then 0 else cardinality(string_to_array(normalized,' ')) end;$new$);
 execute definition;
end $migration$;
