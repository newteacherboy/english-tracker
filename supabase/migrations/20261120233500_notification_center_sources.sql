-- Additional notification sources, preserving each existing audience.
alter table public.dm_push_log add column if not exists route_tab text;
create or replace function dm_private.center_sync_announcements(s public.students)
returns void language plpgsql security definer set search_path='' as $$
declare a record;
begin
 for a in select x.* from public.announcements x
 where x.active and x.created_at>=greatest(s.created_at,now()-interval '30 days')
 and (x.teacher_id is null or x.teacher_id=s.teacher_id or exists(select 1 from public.teachers t where t.id=x.teacher_id and t.is_admin and t.active))
 and (x.target_type in ('all','tumogrenciler','herkes','ogretmen') or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(x.target_list)='array' then x.target_list else '[]'::jsonb end) e(v)
 where case x.target_type when 'sinif' then e.v#>>'{}'=s.class_no::text when 'sube' then dm_private.tr_ad(e.v#>>'{}')=dm_private.tr_ad(s.class_no::text||'|'||coalesce(s.branch,'')) else dm_private.tr_ad(e.v#>>'{}')=dm_private.tr_ad(s.username) end))
 and not exists(select 1 from public.notifications n where n.id=md5('center-v1:'||s.id::text||':announcement:'||x.id::text)::uuid)
 loop
 perform dm_private.center_event(s.id,'announcement:'||a.id,'duyuru',a.title,a.message,jsonb_build_object('duyuruId',a.id));
 end loop;
 for a in select x.* from public.dm_push_log x where x.created_at>=greatest(s.created_at,now()-interval '30 days')
 and (x.target='all' or (left(x.target,5)='user:' and dm_private.tr_ad(substring(x.target from 6))=dm_private.tr_ad(s.username)))
 and not exists(select 1 from public.notifications n where n.id=md5('center-v1:'||s.id::text||':push:'||x.id::text)::uuid)
 loop
 perform dm_private.center_event(s.id,'push:'||a.id,'duyuru',a.title,a.body,jsonb_build_object('routeTab',a.route_tab));
 end loop;
end $$;
revoke all on function dm_private.center_sync_announcements(public.students) from public,anon,authenticated;
create or replace function public.dm_notification_center(p_token text,p_action text default 'list',p_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.students; items jsonb; unseen integer;
begin
 s:=dm_private.rpc_ogrenci(p_token,'');
 if s.id is null or s.username='dijimedu_demo' then return jsonb_build_object('ok',false,'message','Oturum gerekli.');end if;
 perform dm_private.center_sync_announcements(s);
 if p_action='read' then
  update public.notifications set read_at=now() where recipient_student_id=s.id and id=p_id and read_at is null;
 elsif p_action='read_all' then
  update public.notifications set read_at=now() where recipient_student_id=s.id and read_at is null;
 elsif p_action<>'list' then return jsonb_build_object('ok',false,'message','Geçersiz işlem.');end if;
 select coalesce(jsonb_agg(e.note||jsonb_build_object('title',n.title,'duelId',n.payload->>'duelId','opponent',n.payload->>'opponent','virtualBot',n.payload->>'virtualBot','matchId',n.payload->>'matchId','routeTab',n.payload->>'routeTab','noticeId',n.payload->>'noticeId','badgeId',n.payload->>'badgeId','chestIndex',n.payload->>'chestIndex') order by n.created_at desc),'[]'::jsonb)
 into items from jsonb_array_elements(dm_private.bildirim_liste(s.id,true)) e(note)
 join public.notifications n on n.id=(e.note->>'sat')::uuid and n.recipient_student_id=s.id
 where n.created_at>=now()-interval '30 days';
 select count(*) into unseen from jsonb_array_elements(dm_private.bildirim_liste(s.id,false)) e(note)
 where (e.note->>'tarih')::timestamptz>=now()-interval '30 days';
 return jsonb_build_object('ok',true,'items',items,'unread',unseen);
end $$;
revoke all on function public.dm_notification_center(text,text,uuid) from public,anon,authenticated;
grant execute on function public.dm_notification_center(text,text,uuid) to anon,authenticated;

create or replace function dm_private.center_live_invite() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.target_id is not null and new.target_id<>new.host_id and new.status='searching' and not new.vs_papi then
 perform dm_private.center_event(new.target_id,'invite:'||new.id,'canliDuelloDavet','Canlı düello daveti',coalesce(new.host_name,'Bir arkadaşın')||' seni düelloya davet etti!',jsonb_build_object('duelId',new.id,'opponent',new.host_name),new.host_id);
 end if;
 return new;
 exception when others then raise warning 'center_live_invite: %',sqlstate;return new;
end $$;
create trigger dm_center_live_invite after insert or update of target_id on public.dm_live_duels for each row execute function dm_private.center_live_invite();
create or replace function dm_private.center_teacher_notice() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform dm_private.center_event(new.student_id,'teacher-notice:'||new.id,'ogretmen','Öğretmeninden bildirim',new.message,jsonb_build_object('noticeId',new.id));
 return new;
 exception when others then raise warning 'center_teacher_notice: %',sqlstate;return new;
end $$;
create trigger dm_center_teacher_notice after insert on public.dm_teacher_student_notices for each row execute function dm_private.center_teacher_notice();
create or replace function dm_private.center_activity_assignment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform dm_private.center_event(new.student_id,'activity:'||new.id,'gorev','Yeni etkinliğin var!','Öğretmenin sana yeni bir etkinlik atadı.');
 return new;
 exception when others then raise warning 'center_activity_assignment: %',sqlstate;return new;
end $$;
create trigger dm_center_activity_assignment after insert on public.student_activities for each row execute function dm_private.center_activity_assignment();
create or replace function dm_private.center_entitlement() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.account_role<>'student' or new.state<>'active' or new.product_key not in ('diji_pro','diji_premium_pro') then return new;end if;
 if tg_op='UPDATE' then if old.state='active' and old.product_key=new.product_key and old.transaction_id is not distinct from new.transaction_id then return new;end if;end if;
 perform dm_private.center_event(new.account_id,'member:'||new.product_key||':'||coalesce(new.transaction_id::text,new.updated_at::text),'uyelik','Üyeliğin aktif!',case new.product_key when 'diji_premium_pro' then 'Premium Pro üyeliğin aktifleşti.' else 'Pro üyeliğin aktifleşti.' end);
 return new;
 exception when others then raise warning 'center_entitlement: %',sqlstate;return new;
end $$;
create trigger dm_center_entitlement after insert or update on public.dm_entitlements for each row execute function dm_private.center_entitlement();
create or replace function dm_private.center_time_chest() returns trigger language plpgsql security definer set search_path='' as $$
declare before_idx bigint; after_idx bigint; idx bigint;
begin
 before_idx:=greatest(old.base_chest,old.seconds/6000);
 after_idx:=new.seconds/6000;
 if after_idx>before_idx and after_idx-before_idx<=5 then
 for idx in select generate_series(before_idx+1,after_idx) loop
 perform dm_private.center_event(new.student_id,'time-chest:'||idx,'sureSandik','Öğrenme sandığın hazır!','100 aktif dakika tamamladın. Sandığını aç!',jsonb_build_object('chestIndex',idx));
 end loop;end if;
 return new;
 exception when others then raise warning 'center_time_chest: %',sqlstate;return new;
end $$;
create trigger dm_center_time_chest after update of seconds on public.dm_active_time for each row execute function dm_private.center_time_chest();
create or replace function dm_private.center_world_badges() returns trigger language plpgsql security definer set search_path='' as $$
declare prev jsonb:='[]'; curr jsonb; item text; label text;
 catalogue constant jsonb:='{"hos-geldin":"aktif-5","aktif-5":"Meraklı Papi","aktif-15":"Odak Ustası","aktif-60":"Bir Saatlik Kaşif","oyun-25":"Oyun Gezgini","dogru-50":"Parlayan Zihin","parkur-50":"Rota Efsanesi","seri-14":"İki Haftalık Azim","ilk-adim":"İlk Adım","ilk-zafer":"İlk Zafer","seri-3":"3 Gün Seri","seri-7":"7 Gün Seri","seri-30":"30 Gün Seri","kelime-avcisi":"Kelime Avcısı","kelime-ustasi":"Kelime Ustası","tam-isabet":"Tam İsabet","keskin-goz":"Keskin Göz","ders-kurdu":"Ders Kurdu","konu-ustasi":"Konu Ustası","yildiz-toplayici":"Yıldız Toplayıcı","parkurcu":"Parkurcu","kasif":"Kaşif","sampiyon":"Şampiyon","gorev-avcisi":"Görev Avcısı","seviye-5":"Seviye 5","seviye-10":"Seviye 10","seviye-20":"Seviye 20","puan-avcisi":"Puan Avcısı","puan-efsanesi":"Puan Efsanesi","altin-kumbara":"Altın Kumbara","dinleme-ustasi":"Dinleme Ustası"}'::jsonb;
begin
 if new.key_name<>'yo' then return new;end if;
 curr:=new.value#>'{dmWorldBadges,ids}';
 if jsonb_typeof(curr) is distinct from 'array' then return new;end if;
 if tg_op='UPDATE' then prev:=old.value#>'{dmWorldBadges,ids}';end if;
 if jsonb_typeof(prev) is distinct from 'array' then prev:='[]';end if;
 for item in select distinct e.value from jsonb_array_elements_text(curr) e(value) where not prev ? e.value loop
  if jsonb_array_length(prev)=0 and item<>'hos-geldin' then continue;end if;
  label:=catalogue->>item;
  if label is not null then perform dm_private.center_event(new.student_id,'world-badge:'||item,'rozet','Yeni rozet kazandın!',label||' rozetini kazandın!',jsonb_build_object('badgeId',item));end if;
 end loop;
 return new;
 exception when others then raise warning 'center_world_badges: %',sqlstate;return new;
end $$;
create trigger dm_center_world_badges after insert or update on public.extra_data for each row when (new.key_name='yo') execute function dm_private.center_world_badges();
do $fix$ declare f text;begin
 select pg_get_functiondef('dm_private.center_duel_event()'::regprocedure) into f;
 f:=replace(f,'else ''Düello tamamlandı''','else ''Düelloyu kaybettin!''');execute f;
 select pg_get_functiondef('dm_private.center_virtual_event()'::regprocedure) into f;
 f:=replace(f,'else ''Düello tamamlandı''','else ''Düelloyu kaybettin!''');execute f;
end $fix$;
notify pgrst,'reload schema';
