-- Keep a server timing floor while allowing the faster continuous checkpoints.
do $pace$
declare source text;
begin
 source:=pg_get_functiondef('public.dm_rally_answer(uuid,uuid,integer,integer,boolean)'::regprocedure);
 if position('if elapsed<2 then' in source)=0 then raise exception 'Unexpected rally timing guard; review before changing.'; end if;
 execute replace(source,'if elapsed<2 then','if elapsed<1.2 then');
end $pace$;
