-- 10 verified invites: one calendar month of Pro, not two days.
do $migration$
declare definition text; patched text;
begin
 select pg_get_functiondef('dm_private.campaign_refresh(text,boolean)'::regprocedure) into strict definition;
 if strpos(definition, $old$interval '1 month','zirve-davet'$old$)>0 and strpos(definition,$old$'invite10','diji_pro','1 ay'$old$)>0 then return; end if;
 if strpos(definition,$old$interval '2 days','zirve-davet'$old$)=0 or strpos(definition,$old$'invite10','diji_pro','2 gün'$old$)=0 then
  raise exception 'Unexpected campaign reward definition';
 end if;
 patched:=replace(replace(replace(definition,$old$interval '2 days','zirve-davet'$old$,$new$interval '1 month','zirve-davet'$new$),$old$'invite10','diji_pro','2 gün'$old$,$new$'invite10','diji_pro','1 ay'$new$),'10 davet = 2 gün Pro','10 davet = 1 ay Pro');
 execute patched;
end $migration$;
