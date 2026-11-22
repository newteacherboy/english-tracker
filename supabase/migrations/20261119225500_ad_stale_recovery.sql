do $patch$
declare s text; sig text; actor_expr text; marker text;
begin
foreach sig in array array['public.dm_ad_intent(uuid,text,text,uuid,uuid)','public.dm_duel_ad(text,text,text,uuid)','public.dm_premium_ad_offer(uuid,text,text,uuid)'] loop
s:=pg_get_functiondef(sig::regprocedure);
if position('ad-stale-recovery-v1' in s)>0 then continue; end if;
if sig like '%dm_ad_intent%' then actor_expr:='p_actor'; marker:=' select * into i from dm_ad_rewards.intents where student_id=p_actor and request_key=p_request;';
elsif sig like '%dm_duel_ad%' then actor_expr:='s.id'; marker:=' if p_op=''prepare'' then';
else actor_expr:='actor'; marker:=' if op=''prepare'' then'; end if;
if position(marker in s)=0 then raise exception 'Unexpected function %',sig; end if;
if sig like '%dm_ad_intent%' then
s:=replace(s,marker,' update dm_ad_rewards.intents set canceled_at=clock_timestamp() where student_id='||actor_expr||' and claimed_at is null and canceled_at is null and created_at<clock_timestamp()-interval ''4 minutes''; /* ad-stale-recovery-v1 */'||chr(10)||marker);
else
s:=replace(s,marker,marker||chr(10)||' update dm_ad_rewards.intents set canceled_at=clock_timestamp() where student_id='||actor_expr||' and claimed_at is null and canceled_at is null and created_at<clock_timestamp()-interval ''4 minutes''; /* ad-stale-recovery-v1 */');
end if;
execute s;
end loop;
end $patch$;