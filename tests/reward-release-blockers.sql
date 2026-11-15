-- Read-only release audit. Zero rows is NECESSARY, never sufficient for release:
-- wallet-trigger, first-answer, concurrency and native-client integration tests
-- must also pass. Missing functions/helpers are failures (not silent passes).
-- This release's contract is a direct call to the v2 calculator in each payout
-- path. If intentionally replacing a path with a central dispatcher, update this
-- audit and add behavioral coverage for that dispatcher in the same change.
with expected(name,signature,pattern,issue) as (values
 ('dm_success_reward_v2','public.dm_success_reward_v2(integer,integer,boolean,numeric,integer,integer)',null::text,'Shared policy helper missing'),
 ('dm_lesson_fair_award','public.dm_lesson_fair_award(uuid,text,text,text,integer,boolean)','dm_success_reward_v2\([^;]*180\s*,\s*60\s*\)','Lesson lacks verified v2 180 XP / 60 gold payout'),
 ('dm_match_action','public.dm_match_action(uuid,uuid,text,jsonb)','dm_success_reward_v2\([^;]*250\s*,\s*85\s*\)','Duel winner-only verified v2 payout not integrated'),
 ('dm_virtual_duel_answer','public.dm_virtual_duel_answer(text,uuid,integer)','dm_success_reward_v2\([^;]*250\s*,\s*85\s*\)','Virtual question duel v2 payout not integrated'),
 ('dm_virtual_duel_native_complete','public.dm_virtual_duel_native_complete(text,uuid,text)','dm_success_reward_v2\([^;]*250\s*,\s*85\s*\)','Virtual native duel still needs first-answer evidence and v2 payout'),
 ('dm_parkur_fair_claim','public.dm_parkur_fair_claim(uuid,text,integer,integer,numeric)','dm_success_reward_v2\([^;]*200\s*,\s*70\s*\)','Parkur 200 XP / 70 gold and first-attempt gate not integrated'),
 ('dm_solo_fair_claim','public.dm_solo_fair_claim(uuid,text,text,integer,integer[],integer,integer,numeric,integer)','dm_success_reward_v2\([^;]*140\s*,\s*45\s*\)','Solo 140 XP / 45 gold verified payout not integrated'),
 ('dm_topic_game_finish','public.dm_topic_game_finish(uuid,uuid,jsonb)','dm_success_reward_v2\([^;]*90\s*,\s*25\s*\)','Topic 90 XP / 25 gold not integrated'),
 ('dm_tower_finish','public.dm_tower_finish(uuid,uuid,integer[])','dm_success_reward_v2\([^;]*300\s*,\s*100\s*\)','Tower premium v2 payout not integrated'),
 ('dm_goal_finish','public.dm_goal_finish(uuid,uuid,integer[])','dm_success_reward_v2\([^;]*300\s*,\s*100\s*\)','Goal premium v2 payout not integrated'),
 ('dm_cloud_finish','public.dm_cloud_finish(uuid,uuid,integer[])','dm_success_reward_v2\([^;]*300\s*,\s*100\s*\)','Cloud premium v2 payout not integrated'),
 ('dm_blocks_finish','public.dm_blocks_finish(uuid,uuid,integer[])','dm_success_reward_v2\([^;]*300\s*,\s*100\s*\)','Blocks premium v2 payout not integrated'),
 ('dm_papizzle_finish','public.dm_papizzle_finish(uuid,uuid,integer[])','dm_success_reward_v2\([^;]*300\s*,\s*100\s*\)','Papizzle premium v2 payout not integrated'),
 ('dm_bubble_finish','public.dm_bubble_finish(uuid,uuid,integer[])','dm_success_reward_v2\([^;]*300\s*,\s*100\s*\)','Bubble legacy premium payout not migrated or explicitly retired'),
 ('dm_reef_finish','public.dm_reef_finish(uuid,uuid,integer[])','dm_success_reward_v2\([^;]*300\s*,\s*100\s*\)','Reef legacy premium payout not migrated or explicitly retired'),
 ('dm_pwm_finish','public.dm_pwm_finish(uuid,uuid,integer,boolean,integer,integer)','dm_success_reward_v2\([^;]*300\s*,\s*100\s*\)','Candy/PWM trusts client score and pays consolation; verified gameplay needed'),
 ('dm_rally_finish','public.dm_rally_finish(uuid,uuid)','dm_success_reward_v2\([^;]*300\s*,\s*100\s*\)','Rally premium v2 payout not integrated'),
 ('dm_break_finish','public.dm_break_finish(uuid,uuid,integer,integer,integer)','dm_success_reward_v2\([^;]*60\s*,\s*20\s*\)','Break games need server-verified normalized score and 60 XP / 20 gold cap')
), definitions as (
 select e.*, p.oid, regexp_replace(p.prosrc,'/\*.*?\*/|--[^\n]*','','gs') body
 from expected e left join pg_proc p on p.oid=to_regprocedure(e.signature)
), blockers as (
 select name proname,case when oid is null then 'Missing required function: '||signature else issue end issue
 from definitions where oid is null or (pattern is not null and body !~ pattern)
 union all
 select 'dm_parkur_fair_claim','Recovery can still promote a failed first attempt'
 from definitions where name='dm_parkur_fair_claim' and body like '%correct_count<8 and not rec.completed%'
 union all
 select 'dm_topic_game_finish','Persistent first-result receipt table missing'
 where to_regclass('public.dm_topic_game_results_v2') is null
 union all
 select name,'Internal reward helper exposed to client roles'
 from definitions where name='dm_success_reward_v2' and oid is not null
   and (has_function_privilege('anon',oid,'EXECUTE') or has_function_privilege('authenticated',oid,'EXECUTE'))
)
select proname,issue from blockers order by proname,issue;
