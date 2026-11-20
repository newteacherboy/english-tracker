-- Account-scoped notification inbox; keep existing parental/block policy.
create or replace function public.dm_notification_center(p_token text,p_action text default 'list',p_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.students; items jsonb; unseen integer;
begin
 s:=dm_private.rpc_ogrenci(p_token,'');
 if s.id is null or s.username='dijimedu_demo' then return jsonb_build_object('ok',false,'message','Oturum gerekli.');end if;
 if p_action='read' then
  update public.notifications set read_at=now() where recipient_student_id=s.id and id=p_id and read_at is null;
 elsif p_action='read_all' then
  update public.notifications set read_at=now() where recipient_student_id=s.id and read_at is null;
 elsif p_action<>'list' then return jsonb_build_object('ok',false,'message','Geçersiz işlem.');end if;
 select coalesce(jsonb_agg(e.note||jsonb_build_object('title',n.title,'duelId',n.payload->>'duelId','opponent',n.payload->>'opponent','virtualBot',n.payload->>'virtualBot','matchId',n.payload->>'matchId') order by n.created_at desc),'[]'::jsonb)
 into items from jsonb_array_elements(dm_private.bildirim_liste(s.id,true)) e(note)
 join public.notifications n on n.id=(e.note->>'sat')::uuid and n.recipient_student_id=s.id
 where n.created_at>=now()-interval '30 days';
 select count(*) into unseen from jsonb_array_elements(dm_private.bildirim_liste(s.id,false)) e(note)
 where (e.note->>'tarih')::timestamptz>=now()-interval '30 days';
 return jsonb_build_object('ok',true,'items',items,'unread',unseen);
end $$;
revoke all on function public.dm_notification_center(text,text,uuid) from public,anon,authenticated;
grant execute on function public.dm_notification_center(text,text,uuid) to anon,authenticated;
-- Internal event writer, idempotent on recipient and source event.
create or replace function dm_private.center_event(sid uuid,source text,kind text,heading text,body text,meta jsonb default '{}'::jsonb,sender uuid default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if sid is null then return;end if;
 insert into public.notifications(id,recipient_student_id,sender_student_id,type,title,message,payload)
 values(md5('center-v1:'||sid::text||':'||source)::uuid,sid,sender,kind,heading,body,meta)
 on conflict(id) do nothing;
end $$;
revoke all on function dm_private.center_event(uuid,text,text,text,text,jsonb,uuid) from public,anon,authenticated;
create or replace function dm_private.center_duel_event() returns trigger language plpgsql security definer set search_path='' as $$
declare side text; uid uuid; peer uuid; opponent text; a jsonb; b jsonb; caption text; score text; msg text;
begin
 if new.status<>'finished' or old.status='finished' then return new;end if;
 foreach side in array array['host','guest'] loop
  uid:=case when side='host' then new.host_id else new.guest_id end;
  peer:=case when side='host' then new.guest_id else new.host_id end;
  if uid is null or (side='guest' and new.vs_papi) then continue;end if;
  opponent:=case when side='host' then case when new.vs_papi then 'Papi' else new.guest_name end else new.host_name end;
  a:=case when side='host' then new.host_reward else new.guest_reward end;
  b:=case when side='host' then new.guest_reward else new.host_reward end;
  score:=coalesce(a->>'correct','0')||'–'||coalesce(b->>'correct','0');
  caption:=case when new.outcome='draw' then 'Düello berabere!' when new.outcome=side then 'Düelloyu kazandın!' else 'Düello tamamlandı' end;
  msg:=coalesce(opponent,'Rakibin')||' ile doğru cevap skoru: '||score||'. '||case when new.outcome='draw' then 'Yeni bir düelloya ne dersin?' when new.outcome=side then 'Tebrikler! +'||coalesce(a->>'xp','0')||' XP, +'||coalesce(a->>'gold','0')||' altın.' else 'Rövanşa ne dersin?' end;
  perform dm_private.center_event(uid,'live:'||new.id,'canliDuelloSonuc',caption,msg,jsonb_build_object('duelId',new.id,'opponent',opponent),peer);
 end loop;
 return new;
 exception when others then raise warning 'center_duel_event: %',sqlstate;return new;
end $$;
create trigger dm_center_duel_finished after update of status on public.dm_live_duels for each row execute function dm_private.center_duel_event();
create or replace function dm_private.center_virtual_event() returns trigger language plpgsql security definer set search_path='' as $$
declare opponent text;
begin
 if new.completed_at is null or old.completed_at is not null then return new;end if;
 select display_name into opponent from public.dm_virtual_league_rivals where bot_id=new.bot_id;
 opponent:=coalesce(opponent,'Papi');
 perform dm_private.center_event(new.student_id,'virtual:'||new.id,'sanalDuelloSonuc',case when new.won then 'Düelloyu kazandın!' else 'Düello tamamlandı' end,
 opponent||' ile doğru cevap skoru: '||new.correct_count||'–'||new.bot_score||'. '||case when new.won then 'Tebrikler! +'||new.xp||' XP, +'||new.gold||' altın.' else 'Rövanşa ne dersin?' end,
 jsonb_build_object('virtualBot',new.bot_id,'opponent',opponent));
 return new;
 exception when others then raise warning 'center_virtual_event: %',sqlstate;return new;
end $$;
create trigger dm_center_virtual_finished after update of completed_at on public.dm_virtual_duel_runs for each row execute function dm_private.center_virtual_event();
create or replace function dm_private.center_progress_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind in ('chest','weekly_target','level_energy') then
 perform dm_private.center_event(new.student_id,'progress:'||new.kind||':'||new.reward_key,'odul',
 case new.kind when 'chest' then 'Sandık ödülü!' when 'weekly_target' then 'Haftalık hedef tamamlandı!' else 'Seviye ödülü!' end,
 case when new.gold>0 then '+'||new.gold||' altın ödülün kaydedildi.' else 'Yeni ödülün hesabına kaydedildi.' end);
 end if;
 return new;
 exception when others then raise warning 'center_progress_event: %',sqlstate;return new;
end $$;
create trigger dm_center_progress_reward after insert on public.dm_progress_rewards for each row execute function dm_private.center_progress_event();
create or replace function dm_private.center_badge_event() returns trigger language plpgsql security definer set search_path='' as $$
declare sid uuid;
begin
 select id into sid from public.students where username=new.student_name and role='student';
 perform dm_private.center_event(sid,'badge:'||new.id,'rozet','Yeni rozet!',coalesce(new.name,'Rozet')||' rozetini kazandın!');
 return new;
 exception when others then raise warning 'center_badge_event: %',sqlstate;return new;
end $$;
create trigger dm_center_badge_earned after insert on public.badges for each row execute function dm_private.center_badge_event();
-- Existing feather state and shield ownership are preserved. One daily credit; seventh feather gives 7 extra.
do $migration$
declare f text;
begin
 select pg_get_functiondef('public.dm_papi_feather(uuid)'::regprocedure) into f;
 if position('if studied and (last_day is null or last_day<today) then' in f)=0 or position('dm_papi_energy_credit(actor,10,' in f)=0 then raise exception 'Unexpected feather function version';end if;
 f:=replace(f,'if studied and (last_day is null or last_day<today) then','if (last_day is null or last_day<today) then');
 f:=replace(f,'credit:=public.dm_papi_energy_credit(actor,10,''tuy_kanat'');','credit:=public.dm_papi_energy_credit(actor,8,''tuy_kanat'');');
 f:=replace(f,'last_day:=today;missed:=0;','if not wing then credit:=public.dm_papi_energy_credit(actor,1,''tuy_gunluk'');end if;
  last_day:=today;missed:=0;');
 f:=replace(f,'''reward'',10','''reward'',7');
 execute f;
end $migration$;
create or replace function dm_private.center_wing_event() returns trigger language plpgsql security definer set search_path='' as $$
declare oldlevel int:=1; newlevel int;
begin
 if new.key_name<>'papi_wing_v1' then return new;end if;
 if tg_op='UPDATE' then oldlevel:=coalesce((old.value->>'level')::int,1);end if;
 newlevel:=coalesce((new.value->>'level')::int,1);
 if newlevel>oldlevel then
 perform dm_private.center_event(new.student_id,'wing:'||newlevel,'tuy','7 tüy tamamlandı!','Günlük 1 enerjiye ek olarak 7 enerji kazandın.');
 end if;
 return new;
 exception when others then raise warning 'center_wing_event: %',sqlstate;return new;
end $$;
create trigger dm_center_wing_completed after insert or update on public.extra_data for each row when (new.key_name='papi_wing_v1') execute function dm_private.center_wing_event();
notify pgrst,'reload schema';
