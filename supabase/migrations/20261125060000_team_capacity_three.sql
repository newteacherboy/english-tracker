do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.dm_team_manage(text,text,jsonb)'::regprocedure) into definition;
 if (length(definition)-length(replace(definition,')>=6','')))/4<>3 then
  raise exception 'Unexpected team capacity checks';
 end if;
 execute replace(definition,')>=6',')>=3');
end $migration$;
