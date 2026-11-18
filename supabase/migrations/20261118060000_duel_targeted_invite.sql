-- [18 Kas 2026] Profil kartındaki "Düelloya Davet Et" artık canlı düello daveti gönderir.
-- Kullanıcı kararları:
--  * Davet yalnız seçilen oyuncuya gider (anlık kanal, veritabanına yazmaz).
--  * 15 sn içinde kabul edilmezse oyuncu isterse Papi ile oynar (otomatik geçiş yok).
--  * Hedefli davet, rastgele "Canlı Düello" aramalarıyla eşleşmez.
-- Haklar değişmedi: davet eden de kabul eden de günlük canlı düello hakkından kullanır;
-- davet iptal edilirse ya da Papi seçilmeden kapatılırsa hak geri gelir.

alter table public.dm_live_duels add column if not exists target_id uuid references public.students(id) on delete set null;

-- Rastgele arama hedefli davetleri kapmasın.
create or replace function public.dm_duel_live_search(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; rights jsonb; d public.dm_live_duels; g int; lvl int;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 perform 1 from public.students where id=s.id for update;
 update public.dm_live_duels set status='cancelled' where host_id=s.id and status='searching';
 rights:=dm_private.duel_rights(s.id);
 if (rights#>>'{live,remaining}')::int<=0 then
  return jsonb_build_object('ok',false,'paywall',true,'kind','live','message','Bugünkü ücretsiz Canlı Düello hakkını kullandın.')||rights;
 end if;
 lvl:=dm_private.duel_level(s.id);
 g:=greatest(1,least(8,coalesce(s.selected_class,s.class_no,5)));
 if (rights->>'social')::boolean then
  select * into d from public.dm_live_duels x
  where x.status='searching' and x.kind='live' and x.target_id is null and x.host_id<>s.id and x.created_at>now()-interval '14 seconds'
   and not public.dm_blocked(x.host_id,s.id) and public.dm_social_allowed(x.host_id,'duels')
  order by x.created_at limit 1 for update skip locked;
  if d.id is not null then
   update public.dm_live_duels set status='matched',guest_id=s.id,guest_name=s.username,guest_level=lvl,matched_at=now()
   where id=d.id returning * into d;
   return dm_private.duel_view(d,s.id,true)||jsonb_build_object('joined',true);
  end if;
 end if;
 insert into public.dm_live_duels(kind,host_id,grade,host_name,host_level,questions)
 values('live',s.id,g,s.username,lvl,dm_private.duel_questions(g)) returning * into d;
 return dm_private.duel_view(d,s.id)||jsonb_build_object('broadcast',(rights->>'social')::boolean,'level',lvl);
end $$;

-- Belirli bir oyuncuya canlı düello daveti.
create or replace function public.dm_duel_live_invite(p_token text, p_target text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; t public.students; rights jsonb; d public.dm_live_duels; g int; lvl int;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 select * into t from public.students x where lower(trim(x.username))=lower(trim(coalesce(p_target,''))) limit 1;
 if t.id is null then return jsonb_build_object('ok',false,'message','Bu oyuncu bulunamadı.'); end if;
 if t.id=s.id then return jsonb_build_object('ok',false,'message','Kendinle düello yapamazsın.'); end if;
 perform 1 from public.students where id=s.id for update;
 update public.dm_live_duels set status='cancelled' where host_id=s.id and status='searching';
 rights:=dm_private.duel_rights(s.id);
 if not (rights->>'social')::boolean then return jsonb_build_object('ok',false,'message','Düellolar hesabında kapalı.'); end if;
 if public.dm_blocked(s.id,t.id) or not public.dm_social_allowed(t.id,'duels') then
  return jsonb_build_object('ok',false,'message','Bu oyuncuya şu an düello daveti gönderilemiyor.');
 end if;
 if (rights#>>'{live,remaining}')::int<=0 then
  return jsonb_build_object('ok',false,'paywall',true,'kind','live','message','Bugünkü ücretsiz Canlı Düello hakkını kullandın.')||rights;
 end if;
 lvl:=dm_private.duel_level(s.id);
 g:=greatest(1,least(8,coalesce(s.selected_class,s.class_no,5)));
 insert into public.dm_live_duels(kind,host_id,target_id,grade,host_name,host_level,questions)
 values('live',s.id,t.id,g,s.username,lvl,dm_private.duel_questions(g)) returning * into d;
 return dm_private.duel_view(d,s.id)||jsonb_build_object('broadcast',true,'level',lvl,'target',t.username);
end $$;

-- Hedefli davet yalnız hedef oyuncu tarafından kabul edilir.
create or replace function public.dm_duel_live_accept(p_token text, p_duel uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; rights jsonb; d public.dm_live_duels;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 perform 1 from public.students where id=s.id for update;
 rights:=dm_private.duel_rights(s.id);
 if not (rights->>'social')::boolean then return jsonb_build_object('ok',false,'message','Düellolar hesabında kapalı.'); end if;
 select * into d from public.dm_live_duels where id=p_duel for update;
 if d.id is not null and d.target_id is not null and d.target_id<>s.id then
  return jsonb_build_object('ok',false,'taken',true,'message','Bu davet sana gönderilmedi.');
 end if;
 if (rights#>>'{live,remaining}')::int<=0 then
  return jsonb_build_object('ok',false,'paywall',true,'kind','live','message','Bugünkü ücretsiz Canlı Düello hakkını kullandın.')||rights;
 end if;
 if d.id is null or d.status<>'searching' or d.kind<>'live' or d.created_at<=now()-interval '15 seconds' then
  return jsonb_build_object('ok',false,'taken',true,'message',case when d.target_id is not null then 'Bu davetin süresi doldu.' else 'Bu düelloyu başkası kaptı.' end);
 end if;
 if d.host_id=s.id then return jsonb_build_object('ok',false,'message','Kendi düellonu kabul edemezsin.'); end if;
 if public.dm_blocked(d.host_id,s.id) then return jsonb_build_object('ok',false,'taken',true,'message','Bu düello artık açık değil.'); end if;
 update public.dm_live_duels set status='matched',guest_id=s.id,guest_name=s.username,guest_level=dm_private.duel_level(s.id),matched_at=now()
 where id=d.id returning * into d;
 return dm_private.duel_view(d,s.id,true);
end $$;

-- Rastgele aramada 15 sn sonra Papi devreye girer; hedefli davette oyuncuya sorulur ("expired").
create or replace function public.dm_duel_live_poll(p_token text, p_duel uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; d public.dm_live_duels;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 select * into d from public.dm_live_duels where id=p_duel and host_id=s.id for update;
 if d.id is null then return jsonb_build_object('ok',false,'message','Düello bulunamadı.'); end if;
 if d.status='searching' and d.created_at<=now()-interval '15 seconds' then
  if d.target_id is not null then
   return dm_private.duel_view(d,s.id)||jsonb_build_object('expired',true);
  end if;
  update public.dm_live_duels set status='matched',vs_papi=true,matched_at=now(),papi_answers=dm_private.duel_papi_answers(d.questions)
  where id=d.id returning * into d;
 end if;
 return dm_private.duel_view(d,s.id,d.status='matched');
end $$;

-- Yanıtsız kalan davet: oyuncu "Papi ile oyna" derse aynı sorularla Papi'ye karşı başlar.
create or replace function public.dm_duel_live_to_papi(p_token text, p_duel uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; d public.dm_live_duels; rights jsonb;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 perform 1 from public.students where id=s.id for update;
 select * into d from public.dm_live_duels where id=p_duel and host_id=s.id for update;
 if d.id is null then return jsonb_build_object('ok',false,'message','Düello bulunamadı.'); end if;
 if d.status='matched' then return dm_private.duel_view(d,s.id,true); end if;
 if d.status<>'searching' or d.target_id is null or d.created_at>now()-interval '15 seconds' then
  return jsonb_build_object('ok',false,'message','Bu düello Papi''ye aktarılamadı.');
 end if;
 -- 40 sn geçtiyse arama artık haktan sayılmıyor: yeniden kontrol et.
 if d.created_at<=now()-interval '40 seconds' then
  rights:=dm_private.duel_rights(s.id);
  if (rights#>>'{live,remaining}')::int<=0 then
   update public.dm_live_duels set status='cancelled' where id=d.id;
   return jsonb_build_object('ok',false,'paywall',true,'kind','live','message','Bugünkü ücretsiz Canlı Düello hakkını kullandın.')||rights;
  end if;
 end if;
 update public.dm_live_duels set status='matched',vs_papi=true,matched_at=now(),papi_answers=dm_private.duel_papi_answers(d.questions)
 where id=d.id returning * into d;
 return dm_private.duel_view(d,s.id,true);
end $$;

revoke all on function public.dm_duel_live_invite(text,text) from public;
revoke all on function public.dm_duel_live_to_papi(text,uuid) from public;
grant execute on function public.dm_duel_live_invite(text,text) to anon,authenticated,service_role;
grant execute on function public.dm_duel_live_to_papi(text,uuid) to anon,authenticated,service_role;
