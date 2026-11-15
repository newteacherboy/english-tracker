-- Lesson payout alignment: retain server-verified lesson_progress and best-tier
-- idempotency; reduce max award to 180 XP / 60 gold.
-- This is not sufficient for release until a server-owned question receipt
-- proves the first-attempt accuracy behind requested_tier.
begin;
do $patch$
declare body text; old_text text; new_text text;
begin
 body:=pg_get_functiondef('public.dm_lesson_fair_award(uuid,text,text,text,integer,boolean)'::regprocedure);
 old_text:='gain_xp:=round(300.0*new_tier/100)-round(300.0*old_tier/100);';
 new_text:='gain_xp:=round(180.0*new_tier/100)-round(180.0*old_tier/100);';
 if (length(body)-length(replace(body,old_text,'')))/length(old_text)<>1 then
   raise exception 'Lesson XP function changed; review required';
 end if;
 body:=replace(body,old_text,new_text);
 old_text:='gain_gold:=round(80.0*new_tier/100)-round(80.0*old_tier/100);';
 new_text:='gain_gold:=round(60.0*new_tier/100)-round(60.0*old_tier/100);';
 if (length(body)-length(replace(body,old_text,'')))/length(old_text)<>1 then
   raise exception 'Lesson gold function changed; review required';
 end if;
 execute replace(body,old_text,new_text);
end $patch$;
commit;
