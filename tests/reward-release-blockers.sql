-- Release-blocking audit: this query must return zero rows before deployment.
-- Read-only; checks known server payout paths that have not been migrated.
with definitions as (
 select p.proname,pg_get_functiondef(p.oid) body
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in
 ('dm_lesson_fair_award','dm_match_action','dm_topic_game_finish','dm_parkur_fair_claim')
)
select proname,issue from (
 select 'dm_lesson_fair_award' proname,'Lesson rewards still accept client-supplied tier / 300 XP 80 gold' issue
 where exists(select 1 from definitions where proname='dm_lesson_fair_award'
   and body like '%300.0*new_tier%' and body like '%80.0*new_tier%')
 union all
 select 'dm_match_action','Duel currently awards each player independent of victory and 60% accuracy'
 where exists(select 1 from definitions where proname='dm_match_action'
   and body like '%dm_ranked_game_reward%' and body like '%for n in 0..1 loop%')
 union all
 select 'dm_topic_game_finish','Topic payout has no 25-gold ledger integration'
 where exists(select 1 from definitions where proname='dm_topic_game_finish'
   and body like '%dm_reward_limits(%' and body like '%gold%')
 union all
 select 'dm_parkur_fair_claim','Parkur recovery still bypasses first-attempt success'
 where exists(select 1 from definitions where proname='dm_parkur_fair_claim'
   and body like '%not rec.completed%')
) blockers order by proname;
