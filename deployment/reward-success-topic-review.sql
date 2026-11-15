-- Staged topic-game reward integration, not yet applied to production.
-- Prerequisite: deployment/reward-success-policy-v2.sql
-- Keeps the existing 3 rewarded runs/day, verified answer deck, teacher mode,
-- anti-speed checks, and wallet write protocol.
begin;
do $patch$
declare definition text; old_text text; new_text text;
begin
  definition:=pg_get_functiondef('public.dm_topic_game_finish(uuid,uuid,jsonb)'::regprocedure);
  if strpos(definition,'reward-policy-v2-topic')>0 then return; end if;
  old_text:=$old$
 elsif c*100>=n*80 then x:=(public.dm_reward_limits('konu:'||r.game)->>'xp')::int;reason:='awarded';end if;
$old$;
  new_text:=$new$
 elsif c*100>=n*60 then
   -- reward-policy-v2-topic: answers are checked against the server's stored deck.
   -- Topic-game payout remains XP-only until wallet gold protocol is migrated.
   x:=(public.dm_success_reward_v2(c,n,false,null,90,25)->>'xp')::integer;
   reason:='awarded';
 end if;
$new$;
  if strpos(definition,old_text)=0 then raise exception 'Topic finish definition changed'; end if;
  execute replace(definition,old_text,new_text);
end $patch$;
commit;
