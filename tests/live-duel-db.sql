-- Yerel PostgreSQL ile: createdb t; psql -d t -f tests/live-duel-db-stub.sql -f supabase/migrations/20261117200000_live_duel.sql -f tests/live-duel-db.sql
insert into public.students(id,username,class_no) values ('00000000-0000-0000-0000-00000000000a','ali',5),('00000000-0000-0000-0000-00000000000b','ayse',5),('00000000-0000-0000-0000-00000000000c','can',1),('00000000-0000-0000-0000-00000000000d','deniz',5);
insert into public.extra_data select id,'yo','{"totalXp":1500,"altin":100}'::jsonb,now() from public.students;
\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set C '''00000000-0000-0000-0000-00000000000c'''
\set D '''00000000-0000-0000-0000-00000000000d'''
\pset format unaligned
\echo == question shapes
select g, jsonb_array_length(q), (select string_agg(x->>'t'||':'||coalesce(x->>'a','?')||':'||jsonb_array_length(x->'o'),' ') from jsonb_array_elements(q) x) from (select g, dm_private.duel_questions(g) q from generate_series(1,8) g) z;
\echo == A searches, C accepts (class 1)
create temp table v(k text, j jsonb);
insert into v select 'a', public.dm_duel_live_search(:A);
select j->>'status', j->>'broadcast' from v where k='a';
insert into v select 'c', public.dm_duel_live_accept(:C,(select (j->>'id')::uuid from v where k='a'));
select j->>'ok', j->>'side', j->>'opponent', jsonb_array_length(j->'questions') from v where k='c';
\echo == D tries to accept same (should be taken)
select public.dm_duel_live_accept(:D,(select (j->>'id')::uuid from v where k='a'))->>'message';
\echo == A polls -> matched with can
select j->>'status', j->>'opponent', jsonb_array_length(j->'questions') from (select public.dm_duel_live_poll(:A,(select (j->>'id')::uuid from v where k='a')) j) x;
\echo == A finishes all correct fast; then wait
insert into v select 'qs', (select questions from public.dm_live_duels limit 1);
select public.dm_duel_finish(:A,(select (j->>'id')::uuid from v where k='a'),(select jsonb_agg(jsonb_build_object('c',(x->>'a')::int,'ms',1500)) from jsonb_array_elements((select j from v where k='qs')) x)) ->> 'status';
\echo == C finishes half
select x->>'outcome', x->'me', x->'them' from (select public.dm_duel_finish(:C,(select (j->>'id')::uuid from v where k='a'),(select jsonb_agg(jsonb_build_object('c',case when o%2=0 then (x->>'a')::int else -1 end,'ms',5000)) from jsonb_array_elements((select j from v where k='qs')) with ordinality t(x,o))) x) y;
\echo == A result view
select x->>'outcome', x->'me'->>'xp', x->'me'->>'hp', x->'yo'->>'totalXp', x->'yo'->>'altin' from (select public.dm_duel_result(:A,(select (j->>'id')::uuid from v where k='a')) x) y;
select run_id, xp, gold from public.dm_game_reward_runs order by run_id;
\echo == double finish idempotent
select public.dm_duel_finish(:A,(select (j->>'id')::uuid from v where k='a'),(select jsonb_agg(jsonb_build_object('c',0,'ms',100)) from generate_series(1,6)))->>'outcome';
select count(*) from public.dm_game_reward_runs;
\echo == rights now
select public.dm_duel_status(:A)->'live', public.dm_duel_status(:C)->'live';
\echo == A searches again -> paywall
select public.dm_duel_live_search(:A)->>'paywall';
\echo == B search, fallback after 15s
insert into v select 'b', public.dm_duel_live_search(:B);
update public.dm_live_duels set created_at=now()-interval '16 seconds' where id=(select (j->>'id')::uuid from v where k='b');
select j->>'status', j->>'vsPapi', j->>'opponent', jsonb_array_length(j->'papi') from (select public.dm_duel_live_poll(:B,(select (j->>'id')::uuid from v where k='b')) j) x;
select x->>'outcome', x->'me'->>'xp', x->'them'->>'hp' from (select public.dm_duel_finish(:B,(select (j->>'id')::uuid from v where k='b'),(select jsonb_agg(jsonb_build_object('c',-1,'ms',10000)) from generate_series(1,6))) x) y;
\echo == D search then cancel -> refund
insert into v select 'd', public.dm_duel_live_search(:D);
select public.dm_duel_live_cancel(:D,(select (j->>'id')::uuid from v where k='d'))->>'cancelled', public.dm_duel_status(:D)->'live'->>'remaining';
\echo == papi starts for D x3
select public.dm_duel_papi_start(:D)->>'status';
select public.dm_duel_papi_start(:D)->>'status';
select public.dm_duel_papi_start(:D)->>'paywall';
\echo == ad offer D papi
insert into v select 'off', public.dm_duel_ad(:D,'papi','prepare',null);
select j from v where k='off';
select public.dm_duel_ad(:D,'papi','redeem',(select (j->>'offerId')::uuid from v where k='off'))->>'claimed';
insert into dm_ad_rewards.intents(student_id,kind,claimed_at,transaction_id) values (:D,'energy',now(),'abc123abc');
select x->>'claimed', x->'papi' from (select public.dm_duel_ad(:D,'papi','redeem',(select (j->>'offerId')::uuid from v where k='off')) x) y;
select public.dm_duel_papi_start(:D)->>'status';
\echo == invalid answers
select public.dm_duel_finish(:D,(select id from public.dm_live_duels where host_id=:D and kind='papi' and status='matched' limit 1),'[1,2]')->>'message';
\echo == premium B unlimited; D out of live (used search+cancel refunded -> still 1)
update public.students set profile='{"plan":"premium_pro"}' where id=:B;
insert into v select 'b2', public.dm_duel_live_search(:B);
insert into v select 'd2', public.dm_duel_live_accept(:D,(select (j->>'id')::uuid from v where k='b2'));
select j->>'ok', j->>'opponent' from v where k='d2';
\echo == timeout: only B finishes, matched 151s ago
update public.dm_live_duels set matched_at=now()-interval '151 seconds' where id=(select (j->>'id')::uuid from v where k='b2');
select public.dm_duel_finish(:B,(select (j->>'id')::uuid from v where k='b2'),(select jsonb_agg(jsonb_build_object('c',0,'ms',3000)) from generate_series(1,6)))->>'status';
select x->>'outcome', x->'me'->>'xp', x->'them'->>'xp' from (select public.dm_duel_result(:B,(select (j->>'id')::uuid from v where k='b2')) x) y;
\echo == blocked pair cannot accept
insert into public.student_blocks values (:A,:C);
update public.students set profile='{"plan":"premium_pro"}' where id in (:A,:C);
insert into v select 'a3', public.dm_duel_live_search(:A);
select public.dm_duel_live_accept(:C,(select (j->>'id')::uuid from v where k='a3'))->>'message';
\echo == grants
select has_function_privilege('anon','public.dm_duel_status(text)','execute'), has_function_privilege('anon','dm_private.duel_rights(uuid)','execute');
