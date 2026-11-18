-- [18 Kas 2026] Canlı düello: kabul eden oyuncunun hakkı yoksa reklam izlerken düello onun için bekletilir.
-- Kullanıcı kararları:
--  * Hakkı olmayan oyuncu "Kabul et"e basınca düello ona ayrılır (karar süresi 20 sn).
--  * "Reklam izle"ye basınca davet eden oyuncuya "X kabul etti, reklam izliyor, bekle" uyarısı gider;
--    bekleme en fazla 45 sn sürer.
--  * Reklam bitince oyuncuya "Hakkın geldi! Şimdi Başla" butonu çıkar, basınca düello başlar.
--  * Reklam yarıda kalırsa / süre dolarsa ayırma kalkar; davet eden oyuncu her zamanki gibi Papi ile oynar
--    (rastgele aramada otomatik, hedefli davette seçerek). Reklamla kazanılan hak boşa gitmez.
-- Sunucu yükü: ayırma satırın üstünde 4 kolonla tutulur, yeni tablo / tetikleyici yok.

alter table public.dm_live_duels add column if not exists hold_id uuid references public.students(id) on delete set null;
alter table public.dm_live_duels add column if not exists hold_name text;
alter table public.dm_live_duels add column if not exists hold_until timestamptz;
alter table public.dm_live_duels add column if not exists hold_ad boolean not null default false;

-- Bekletilen arama da davet edenin hakkından sayılır (40 sn'yi geçse bile).
create or replace function dm_private.duel_rights(actor uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare plan text; t0 timestamptz:=dm_private.duel_day_start(); today date:=(now() at time zone 'Europe/Istanbul')::date;
 live_used int; papi_used int; live_bonus int; papi_bonus int; unlimited boolean;
begin
 plan:=public.dm_plan(actor,'student');
 unlimited:=plan='premium_pro';
 select count(*) into live_used from public.dm_live_duels d where d.kind='live' and (
   (d.host_id=actor and d.created_at>=t0 and (d.status in ('matched','finished')
     or (d.status='searching' and (d.created_at>now()-interval '40 seconds' or d.hold_until>now()))))
   or (d.guest_id=actor and d.matched_at>=t0));
 select count(*) into papi_used from public.dm_live_duels d where d.kind='papi' and d.host_id=actor and d.created_at>=t0;
 select count(*) filter(where game='duel-live'),count(*) filter(where game='duel-papi') into live_bonus,papi_bonus
  from dm_ad_rewards.premium_offers where student_id=actor and reward_day=today and redeemed_at is not null and game in ('duel-live','duel-papi');
 return jsonb_build_object('plan',plan,'unlimited',unlimited,
  'live',jsonb_build_object('used',live_used,'limit',1+live_bonus,'remaining',case when unlimited then 99 else greatest(0,1+live_bonus-live_used) end),
  'papi',jsonb_build_object('used',papi_used,'limit',2+papi_bonus,'remaining',case when unlimited then 99 else greatest(0,2+papi_bonus-papi_used) end),
  'social',public.dm_social_allowed(actor,'duels'));
end $$;

-- Görünüme bekletme bilgisi eklendi: hold = {name, ad, leftMs}
create or replace function dm_private.duel_view(d public.dm_live_duels, actor uuid, with_questions boolean default false) returns jsonb
language plpgsql stable set search_path='' as $$
declare me text:=case when d.host_id=actor then 'host' else 'guest' end; r jsonb; v jsonb;
begin
 r:=jsonb_build_object('ok',true,'id',d.id,'kind',d.kind,'status',d.status,'side',me,'vsPapi',d.vs_papi,'grade',d.grade,
  'opponent',case when me='host' then case when d.vs_papi then 'Papi' else d.guest_name end else d.host_name end,
  'opponentLevel',case when me='host' then d.guest_level else d.host_level end,
  'matchedAt',d.matched_at,'serverNow',now());
 if d.status='searching' and d.hold_id is not null and d.hold_until>now() then
  r:=r||jsonb_build_object('hold',jsonb_build_object('name',d.hold_name,'ad',d.hold_ad,
   'leftMs',greatest(0,floor(extract(epoch from (d.hold_until-now()))*1000))::int));
 end if;
 if with_questions and d.status in ('matched','finished') then
  r:=r||jsonb_build_object('questions',d.questions,'papi',case when d.vs_papi then d.papi_answers end);
 end if;
 if d.status='finished' then
  select value into v from public.extra_data where student_id=actor and key_name='yo';
  r:=r||jsonb_build_object('outcome',case when d.outcome='draw' then 'draw' when d.outcome=me then 'win' else 'lose' end,
   'me',case when me='host' then d.host_reward else d.guest_reward end,
   'them',case when me='host' then d.guest_reward else d.host_reward end,'yo',v);
 end if;
 return r;
end $$;

-- Rastgele arama, başkasına ayrılmış düellolarla eşleşmez.
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
   and (x.hold_until is null or x.hold_until<=now())
   and not public.dm_blocked(x.host_id,s.id) and public.dm_social_allowed(x.host_id,'duels')
  order by x.created_at limit 1 for update skip locked;
  if d.id is not null then
   update public.dm_live_duels set status='matched',guest_id=s.id,guest_name=s.username,guest_level=lvl,matched_at=now(),
    hold_id=null,hold_name=null,hold_until=null,hold_ad=false
   where id=d.id returning * into d;
   return dm_private.duel_view(d,s.id,true)||jsonb_build_object('joined',true);
  end if;
 end if;
 insert into public.dm_live_duels(kind,host_id,grade,host_name,host_level,questions)
 values('live',s.id,g,s.username,lvl,dm_private.duel_questions(g)) returning * into d;
 return dm_private.duel_view(d,s.id)||jsonb_build_object('broadcast',(rights->>'social')::boolean,'level',lvl);
end $$;

-- Kabul: hakkı olmayan oyuncuya düello 20 sn ayrılır (hold=true döner); reklamdan sonra tekrar çağrılınca eşleşir.
create or replace function public.dm_duel_live_accept(p_token text, p_duel uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; rights jsonb; d public.dm_live_duels; mine boolean; open_ok boolean;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 perform 1 from public.students where id=s.id for update;
 rights:=dm_private.duel_rights(s.id);
 if not (rights->>'social')::boolean then return jsonb_build_object('ok',false,'message','Düellolar hesabında kapalı.'); end if;
 select * into d from public.dm_live_duels where id=p_duel for update;
 if d.id is null then return jsonb_build_object('ok',false,'taken',true,'message','Bu düello artık açık değil.'); end if;
 if d.target_id is not null and d.target_id<>s.id then
  return jsonb_build_object('ok',false,'taken',true,'message','Bu davet sana gönderilmedi.');
 end if;
 if d.host_id=s.id then return jsonb_build_object('ok',false,'message','Kendi düellonu kabul edemezsin.'); end if;
 mine:=coalesce(d.hold_id=s.id and d.hold_until>now(),false);
 if d.status<>'searching' or d.kind<>'live' then
  return jsonb_build_object('ok',false,'taken',true,'message',case when mine or coalesce(d.hold_id=s.id,false) then 'Rakibin artık bekleyemedi.'
   when d.target_id is not null then 'Bu davetin süresi doldu.' else 'Bu düelloyu başkası kaptı.' end);
 end if;
 if d.hold_id is not null and d.hold_until>now() and not mine then
  return jsonb_build_object('ok',false,'taken',true,'message','Bu düelloyu başkası kaptı.');
 end if;
 open_ok:=mine or coalesce(d.created_at>now()-interval '15 seconds',false);
 if not open_ok then
  return jsonb_build_object('ok',false,'taken',true,'message',case when coalesce(d.hold_id=s.id,false) then 'Bekleme süresi doldu.'
   when d.target_id is not null then 'Bu davetin süresi doldu.' else 'Bu düelloyu başkası kaptı.' end);
 end if;
 if public.dm_blocked(d.host_id,s.id) then return jsonb_build_object('ok',false,'taken',true,'message','Bu düello artık açık değil.'); end if;
 if (rights#>>'{live,remaining}')::int<=0 then
  -- Hakkı yok: düelloyu ona ayır (karar için 20 sn). Zaten ayrılmışsa süreyi uzatma.
  if not mine then
   update public.dm_live_duels set hold_id=s.id,hold_name=s.username,hold_until=now()+interval '20 seconds',hold_ad=false
   where id=d.id returning * into d;
  end if;
  return jsonb_build_object('ok',false,'paywall',true,'kind','live','hold',true,'duel',d.id,'host',d.host_name,
   'holdLeftMs',greatest(0,floor(extract(epoch from (d.hold_until-now()))*1000))::int,
   'message','Bugünkü ücretsiz Canlı Düello hakkını kullandın.')||rights;
 end if;
 update public.dm_live_duels set status='matched',guest_id=s.id,guest_name=s.username,guest_level=dm_private.duel_level(s.id),matched_at=now(),
  hold_id=null,hold_name=null,hold_until=null,hold_ad=false
 where id=d.id returning * into d;
 return dm_private.duel_view(d,s.id,true);
end $$;

-- Ayrılan oyuncu: 'watch' = reklama bastı (bekleme 45 sn, bir kez), 'release' = vazgeçti / reklam yarıda kaldı.
create or replace function public.dm_duel_live_hold(p_token text, p_duel uuid, p_op text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; d public.dm_live_duels;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 select * into d from public.dm_live_duels where id=p_duel for update;
 if d.id is null or d.hold_id is distinct from s.id then
  return jsonb_build_object('ok',false,'message','Bu davetin süresi doldu.');
 end if;
 if p_op='release' then
  update public.dm_live_duels set hold_id=null,hold_name=null,hold_until=null,hold_ad=false where id=d.id;
  return jsonb_build_object('ok',true,'released',true);
 elsif p_op='watch' then
  if d.status<>'searching' or d.hold_until<=now() then
   return jsonb_build_object('ok',false,'message','Bu davetin süresi doldu.');
  end if;
  if not d.hold_ad then
   update public.dm_live_duels set hold_ad=true,hold_until=now()+interval '45 seconds' where id=d.id returning * into d;
  end if;
  return jsonb_build_object('ok',true,'holdLeftMs',greatest(0,floor(extract(epoch from (d.hold_until-now()))*1000))::int);
 end if;
 return jsonb_build_object('ok',false,'message','Geçersiz işlem.');
end $$;

-- Bekletme sürerken Papi devreye girmez; bitince her zamanki kural işler.
create or replace function public.dm_duel_live_poll(p_token text, p_duel uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; d public.dm_live_duels;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 select * into d from public.dm_live_duels where id=p_duel and host_id=s.id for update;
 if d.id is null then return jsonb_build_object('ok',false,'message','Düello bulunamadı.'); end if;
 if d.status='searching' and d.hold_id is not null and d.hold_until>now() then
  return dm_private.duel_view(d,s.id);
 end if;
 if d.status='searching' and d.created_at<=now()-interval '15 seconds' then
  if d.target_id is not null then
   return dm_private.duel_view(d,s.id)||jsonb_build_object('expired',true,'heldBy',case when d.hold_id is not null then d.hold_name end);
  end if;
  update public.dm_live_duels set status='matched',vs_papi=true,matched_at=now(),papi_answers=dm_private.duel_papi_answers(d.questions)
  where id=d.id returning * into d;
 end if;
 return dm_private.duel_view(d,s.id,d.status='matched');
end $$;

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
 if d.status='searching' and d.hold_id is not null and d.hold_until>now() then
  return jsonb_build_object('ok',false,'message','Rakibin reklam izliyor, biraz bekle.');
 end if;
 if d.status<>'searching' or d.target_id is null or d.created_at>now()-interval '15 seconds' then
  return jsonb_build_object('ok',false,'message','Bu düello Papi''ye aktarılamadı.');
 end if;
 if d.created_at<=now()-interval '40 seconds' then
  rights:=dm_private.duel_rights(s.id);
  if (rights#>>'{live,remaining}')::int<=0 then
   update public.dm_live_duels set status='cancelled' where id=d.id;
   return jsonb_build_object('ok',false,'paywall',true,'kind','live','message','Bugünkü ücretsiz Canlı Düello hakkını kullandın.')||rights;
  end if;
 end if;
 update public.dm_live_duels set status='matched',vs_papi=true,matched_at=now(),papi_answers=dm_private.duel_papi_answers(d.questions),
  hold_id=null,hold_name=null,hold_until=null,hold_ad=false
 where id=d.id returning * into d;
 return dm_private.duel_view(d,s.id,true);
end $$;

revoke all on function public.dm_duel_live_hold(text,uuid,text) from public;
grant execute on function public.dm_duel_live_hold(text,uuid,text) to anon,authenticated,service_role;
