-- [17 Kas 2026] dm_papi_feather senaryoları. Boş bir test veritabanında (öğrenci, extra_data, energy_transactions,
-- dm_game_reward_runs, papi_story_progress tabloları) migration'dan sonra psql -f ile çalıştırılır; çıktı satırları beklenen değerleri gösterir.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
insert into students values ('00000000-0000-0000-0000-000000000001','ada','approved','student',20,25,100,now(),now(),null);
insert into extra_data(student_id,key_name,value) values ('00000000-0000-0000-0000-000000000001','yo','{"altin":100,"dondurucu":2,"guncelleme":1}');
select '1 none: '||(dm_papi_feather('00000000-0000-0000-0000-000000000001')->>'feathers')||' done='||(dm_papi_feather('00000000-0000-0000-0000-000000000001')->>'todayDone');
insert into dm_game_reward_runs(student_id,run_id,game_key,xp,created_at) values ('00000000-0000-0000-0000-000000000001','r1','ba',100,now());
select '2 earn: '||(r->>'feathers')||' just='||(r->>'justEarned') from (select dm_papi_feather('00000000-0000-0000-0000-000000000001') r) x;
select '2b again: '||(r->>'feathers')||' just='||(r->>'justEarned') from (select dm_papi_feather('00000000-0000-0000-0000-000000000001') r) x;
-- wing: 6 feathers yesterday
update extra_data set value=jsonb_build_object('feathers',6,'level',1,'lastDay',((now() at time zone 'Europe/Istanbul')::date-1)::text,'days','[]'::jsonb) where key_name='papi_wing_v1';
select '3 wing: '||r::text from (select dm_papi_feather('00000000-0000-0000-0000-000000000001') r) x;
select '3 state: '||value::text from extra_data where key_name in ('papi_wing_v1','papi_energy_pending_v1') order by key_name;
update students set energy=10, energy_updated_at=now();
select '3b pending credit: '||(r->>'eklenen')||' energy='||(r->>'enerjiKalan')||' pend='||(r->>'bekleyenEnerji') from (select dm_papi_feather('00000000-0000-0000-0000-000000000001') r) x;
-- shield: missed 2 days, owns 2
update extra_data set value=jsonb_build_object('feathers',4,'level',2,'lastDay',((now() at time zone 'Europe/Istanbul')::date-3)::text) where key_name='papi_wing_v1';
select '4 shield: f='||(r->>'feathers')||' used='||(r->>'shieldUsed')||' lost='||(r->>'lost') from (select dm_papi_feather('00000000-0000-0000-0000-000000000001') r) x;
select '4 yo: '||(value->>'dondurucu') from extra_data where key_name='yo';
-- no shield left: missed 2
update extra_data set value=jsonb_build_object('feathers',4,'level',2,'lastDay',((now() at time zone 'Europe/Istanbul')::date-3)::text) where key_name='papi_wing_v1';
select '5 preview risk: f='||(r->>'feathers') from (select 1) y, lateral (select dm_papi_feather('00000000-0000-0000-0000-000000000001') r) x;
-- covered by streak_shield key for one of the days
update extra_data set value=jsonb_build_object('feathers',4,'level',2,'lastDay',((now() at time zone 'Europe/Istanbul')::date-3)::text) where key_name='papi_wing_v1';
insert into extra_data(student_id,key_name,value) values ('00000000-0000-0000-0000-000000000001','streak_shield:'||((now() at time zone 'Europe/Istanbul')::date-2)::text,'{}');
select '5b one covered: f='||(r->>'feathers')||' lost='||(r->>'lost') from (select dm_papi_feather('00000000-0000-0000-0000-000000000001') r) x;
-- reset after 4 missed
update extra_data set value=jsonb_build_object('feathers',5,'level',3,'lastDay',((now() at time zone 'Europe/Istanbul')::date-6)::text) where key_name='papi_wing_v1';
select '6 reset: f='||(r->>'feathers')||' lvl='||(r->>'level')||' lost='||(r->>'lost') from (select dm_papi_feather('00000000-0000-0000-0000-000000000001') r) x;
-- [24 Kas 2026] Sürpriz Yumurta (dm_papi_egg) kaldırıldı; yalnız kanat senaryoları kalır.
select '10 tx: '||string_agg(reason||':'||change_amount,',') from energy_transactions;
