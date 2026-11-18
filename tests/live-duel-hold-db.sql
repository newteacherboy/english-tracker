-- [18 Kas 2026] Rakip reklam izlerken bekletme (dm_duel_live_hold).
-- Yerel PostgreSQL: psql -d t -f tests/live-duel-db-stub.sql -f supabase/migrations/20261117200000_live_duel.sql -f supabase/migrations/20261118030000_duel_ten_questions.sql -f supabase/migrations/20261118060000_duel_targeted_invite.sql -f supabase/migrations/20261118133000_duel_ad_hold.sql -f tests/live-duel-hold-db.sql
-- Beklenen çıktı satır sonlarında yorum olarak yazılı.
insert into public.students(id,username,class_no) values ('00000000-0000-0000-0000-00000000000a','ali',5),('00000000-0000-0000-0000-00000000000b','ayse',5),('00000000-0000-0000-0000-00000000000c','can',5);
insert into public.extra_data select id,'yo','{"totalXp":1500,"altin":100}'::jsonb,now() from public.students;
\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set C '''00000000-0000-0000-0000-00000000000c'''
\pset format unaligned
\pset tuples_only on
-- ayşe bugünkü canlı hakkını kullanmış
insert into public.dm_live_duels(kind,status,host_id,guest_id,grade,host_name,questions,matched_at) values('live','finished',:C,:B,5,'can','[]',now());
\echo == A) hedefli davet: hak yok -> ayır -> reklam -> başla
select public.dm_duel_live_invite(:A,'ayse')->>'status';                                   -- searching
select id as did from public.dm_live_duels where status='searching' \gset
select x->>'paywall', x->>'hold', x->>'holdLeftMs' from (select public.dm_duel_live_accept(:B,:'did') x) y;  -- true|true|20000
select public.dm_duel_live_poll(:A,:'did')->'hold'->>'ad';                                -- false
select public.dm_duel_live_hold(:B,:'did','watch')->>'holdLeftMs';                         -- 45000
select x->'hold'->>'ad', x->'hold'->>'name' from (select public.dm_duel_live_poll(:A,:'did') x) y;  -- true|ayse
select public.dm_duel_live_to_papi(:A,:'did')->>'message';                                 -- Rakibin reklam izliyor, biraz bekle.
insert into dm_ad_rewards.premium_offers(student_id,game,reward_day,redeemed_at) values(:B,'duel-live',(now() at time zone 'Europe/Istanbul')::date,now());
update public.dm_live_duels set created_at=now()-interval '40 seconds' where id=:'did';
select public.dm_duel_live_accept(:B,:'did')->>'status';                                   -- matched
select x->>'status', x->>'opponent' from (select public.dm_duel_live_poll(:A,:'did') x) y; -- matched|ayse
\echo == B) rastgele arama: ayrılan düelloyu başkası kapmaz, reklam yarıda kalınca Papi
delete from dm_ad_rewards.premium_offers;
delete from public.dm_live_duels where host_id=:A;
select public.dm_duel_live_search(:A)->>'status';                                          -- searching
select id as bid from public.dm_live_duels where status='searching' \gset
select public.dm_duel_live_accept(:B,:'bid')->>'hold';                                     -- true
select coalesce(public.dm_duel_live_search(:C)->>'joined','false');                        -- false
update public.dm_live_duels set status='cancelled' where host_id=:C and status='searching';
select public.dm_duel_live_hold(:B,:'bid','watch')->>'ok';                                 -- true
update public.dm_live_duels set created_at=now()-interval '30 seconds' where id=:'bid';
select public.dm_duel_live_poll(:A,:'bid')->>'status';                                     -- searching
select dm_private.duel_rights(:A)#>>'{live,remaining}';                                    -- 0
select public.dm_duel_live_hold(:B,:'bid','release')->>'released';                         -- true
select x->>'status', x->>'vsPapi' from (select public.dm_duel_live_poll(:A,:'bid') x) y;   -- matched|true
\echo == C) bekleme süresi dolar
delete from public.dm_live_duels where host_id=:A;
select public.dm_duel_live_invite(:A,'ayse')->>'status';                                   -- searching
select id as cid from public.dm_live_duels where status='searching' \gset
select public.dm_duel_live_accept(:B,:'cid')->>'hold';                                     -- true
update public.dm_live_duels set hold_until=now()-interval '1 second', created_at=now()-interval '70 seconds' where id=:'cid';
select public.dm_duel_live_poll(:A,:'cid')->>'expired';                                    -- true
select public.dm_duel_live_hold(:B,:'cid','watch')->>'ok';                                 -- false
select public.dm_duel_live_accept(:B,:'cid')->>'message';                                  -- Bekleme süresi doldu.
select public.dm_duel_live_to_papi(:A,:'cid')->>'status';                                  -- matched
