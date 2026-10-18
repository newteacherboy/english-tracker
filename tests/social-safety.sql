begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); admin uuid:=gen_random_uuid(); teacher uuid:=gen_random_uuid(); event_id uuid:=gen_random_uuid(); message_id uuid:=gen_random_uuid(); rid uuid; again uuid; req uuid:=gen_random_uuid(); ch text:=repeat('a',64); session_key text:=repeat('b',64); before_count integer;
begin
 insert into public.students(id,username,password_hash,status,role,email) values(a,'safety_fixture_a_'||left(a::text,6),'fixture','approved','student','guardian@example.invalid'),(b,'safety_fixture_b_'||left(b::text,6),'fixture','approved','student','guardian_b@example.invalid');
 insert into public.teachers(id,username,password_hash,active,is_admin) values(admin,'safety_admin_'||left(admin::text,6),'fixture',true,true),(teacher,'safety_teacher_'||left(teacher::text,6),'fixture',true,false);
 if not public.dm_social_allowed(a,'social') or not public.dm_social_allowed(a,'messages') then raise exception 'Default participation was changed';end if;
 insert into public.feed_events(id,student_id,event_type,payload) values(event_id,b,'game_score','{"message":"server-owned snapshot"}');
 insert into public.notifications(id,recipient_student_id,sender_student_id,type,message) values(message_id,b,a,'mesaj','preset');
 begin perform public.dm_safety_report_create(a,'','message',message_id,'spam','',gen_random_uuid());raise exception 'Expected unauthorized message rejection';exception when others then if sqlerrm='Expected unauthorized message rejection' then raise;end if;end;
 rid:=public.dm_safety_report_create(a,'forged-name','feed',event_id,'inappropriate','Please review',req);
 if (select target_id from public.dm_safety_reports where id=rid)<>b then raise exception 'Client selected report target';end if;
 again:=public.dm_safety_report_create(a,'other-name','feed',event_id,'spam','duplicate',req);
 if rid<>again or (select count(*) from public.dm_safety_reports where reporter_id=a)<>1 then raise exception 'Report dedupe failed';end if;
 begin perform public.dm_safety_review(teacher,rid,'hide');raise exception 'Expected non-admin rejection';exception when others then if sqlerrm='Expected non-admin rejection' then raise;end if;end;
 perform public.dm_safety_review(admin,rid,'hide','Verified inappropriate content');
 if not (select safety_hidden from public.feed_events where id=event_id) or exists(select 1 from public.dm_safe_feed_events where id=event_id) then raise exception 'Removed content remains public';end if;
 if (select count(*) from public.dm_safety_review_log where report_id=rid)<>1 then raise exception 'Missing review audit';end if;
 insert into public.dm_guardian_challenges(student_id,token_hash,email) values(a,ch,'guardian@example.invalid');
 perform public.dm_guardian_claim(ch,'pbkdf2$fixture',session_key);
 if not public.dm_social_allowed(a) then raise exception 'Guardian setup must not disable social defaults';end if;
 begin perform public.dm_guardian_claim(ch,'pbkdf2$replay',repeat('c',64));raise exception 'Expected consumed link rejection';exception when others then if sqlerrm='Expected consumed link rejection' then raise;end if;end;
 begin perform public.dm_guardian_save(repeat('d',64),'{"social_enabled":false}');raise exception 'Expected forged session rejection';exception when others then if sqlerrm='Expected forged session rejection' then raise;end if;end;
 perform public.dm_guardian_save(session_key,'{"social_enabled":false,"profile_visible":true,"messages_enabled":true,"duels_enabled":true,"gifts_enabled":true}');
 if public.dm_social_allowed(a,'social') then raise exception 'Guardian social off did not apply';end if;
 select count(*) into before_count from public.feed_events where student_id=a;
 insert into public.feed_events(student_id,event_type,payload) values(a,'game_score','{"score":100}');
 if (select count(*) from public.feed_events where student_id=a)<>before_count then raise exception 'Automatic sharing continues';end if;
 update public.students set xp=xp+10 where id=a; -- Learning remains operational.
 begin insert into public.notifications(recipient_student_id,sender_student_id,type,message) values(b,a,'mesaj','blocked');raise exception 'Expected outgoing message rejection';exception when others then if sqlerrm='Expected outgoing message rejection' then raise;end if;end;
 begin insert into public.notifications(recipient_student_id,sender_student_id,type,message) values(a,b,'mesaj','blocked');raise exception 'Expected incoming message rejection';exception when others then if sqlerrm='Expected incoming message rejection' then raise;end if;end;
 perform public.dm_guardian_save(session_key,'{"social_enabled":true,"profile_visible":false,"messages_enabled":false,"duels_enabled":true,"gifts_enabled":true}');
 if public.dm_social_allowed(a,'profile') or public.dm_social_allowed(a,'messages') or not public.dm_social_allowed(a,'duels') then raise exception 'Independent settings were not respected';end if;
 perform public.dm_social_action(a,b,'block',''); -- Protection still works when messaging is off.
 if not exists(select 1 from public.student_blocks where blocker_id=a and blocked_id=b) then raise exception 'Blocking unavailable';end if;
 perform public.dm_safety_review(admin,rid,'suspend','Review completed',7);
 if public.dm_social_allowed(b) then raise exception 'Admin suspension not applied';end if;
 perform public.dm_safety_review(admin,rid,'restore','Restriction lifted');
 if not public.dm_social_allowed(b) then raise exception 'Admin restoration failed';end if;
 update public.dm_guardian_sessions set expires_at=now()-interval '1 second' where token_hash=session_key;
 begin perform public.dm_guardian_save(session_key,'{}');raise exception 'Expected expired session rejection';exception when others then if sqlerrm='Expected expired session rejection' then raise;end if;end;
 if has_table_privilege('anon','public.dm_social_controls','SELECT') or has_table_privilege('authenticated','public.dm_safety_reports','SELECT') or has_function_privilege('anon','public.dm_guardian_claim(text,text,text)','EXECUTE') then raise exception 'Private safety data exposed';end if;
 if exists(select 1 from pg_class where oid in ('public.dm_social_controls'::regclass,'public.dm_safety_reports'::regclass) and not relrowsecurity) then raise exception 'Missing RLS';end if;
end $$;
select 'PASS: defaults, private reporting, dedupe, admin authorization, hidden content, guardian replay, forged/expired sessions, granular controls, peer enforcement, learning continuity, blocking and RLS' as result;
rollback;
