-- Live duel: 45s visible watch + at most 15s technical verification grace.
CREATE OR REPLACE FUNCTION dm_private.duel_view(d public.dm_live_duels, actor uuid, with_questions boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare me text:=case when d.host_id=actor then 'host' else 'guest' end; r jsonb; v jsonb;
begin
 r:=jsonb_build_object('ok',true,'id',d.id,'kind',d.kind,'status',d.status,'side',me,'vsPapi',d.vs_papi,'grade',d.grade,
  'opponent',case when me='host' then case when d.vs_papi then 'Papi' else d.guest_name end else d.host_name end,
  'opponentLevel',case when me='host' then d.guest_level else d.host_level end,
  'matchedAt',d.matched_at,'serverNow',now(),'startAt',case when d.matched_at is not null and not d.vs_papi then d.matched_at+interval '6 seconds' end);
 if d.status='searching' and d.hold_id is not null and d.hold_until>now() then
  r:=r||jsonb_build_object('hold',jsonb_build_object('name',d.hold_name,'ad',d.hold_ad,
   'leftMs',greatest(0,floor(extract(epoch from (d.hold_until-now()))*1000))::int,'adLeftMs',case when d.hold_ad then greatest(0,floor(extract(epoch from (d.hold_until-now()-interval '15 seconds'))*1000))::int end));
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
end $function$;
CREATE OR REPLACE FUNCTION dm_private.duel_rights(actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare plan text; t0 timestamptz:=dm_private.duel_day_start(); today date:=(now() at time zone 'Europe/Istanbul')::date;
 live_used int; papi_used int; live_bonus int; papi_bonus int; unlimited boolean;
begin
 plan:=public.dm_plan(actor,'student');
 unlimited:=plan='premium_pro';
 select count(*) into live_used from public.dm_live_duels d where d.kind='live' and (
   (d.host_id=actor and d.created_at>=t0 and (d.status in ('matched','finished')
     or (d.status='searching' and (d.created_at>now()-interval '40 seconds' or d.hold_until>now()))))
   or (d.guest_id=actor and d.matched_at>=t0));
 select count(*) into papi_used from public.dm_live_duels d where d.kind='papi' and d.host_id=actor and d.created_at>=t0 and d.status<>'cancelled';
 select count(*) filter(where game='duel-live'),count(*) filter(where game='duel-papi') into live_bonus,papi_bonus
  from dm_ad_rewards.premium_offers where student_id=actor and reward_day=today and redeemed_at is not null and game in ('duel-live','duel-papi');
 return jsonb_build_object('plan',plan,'unlimited',unlimited,
  'live',jsonb_build_object('used',live_used,'limit',1+live_bonus,'remaining',case when unlimited then 99 else greatest(0,1+live_bonus-live_used) end),
  'papi',jsonb_build_object('used',papi_used,'limit',2+papi_bonus,'remaining',case when unlimited then 99 else greatest(0,2+papi_bonus-papi_used) end),
  'social',public.dm_social_allowed(actor,'duels'));
end $function$;
CREATE OR REPLACE FUNCTION public.dm_duel_live_accept(p_token text, p_duel uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 -- An acceptance whose response was lost may be retried by the same guest.
 if d.status='matched' and d.kind='live' and d.guest_id=s.id and not d.vs_papi then
  return dm_private.duel_view(d,s.id,true);
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
end $function$;
CREATE OR REPLACE FUNCTION public.dm_duel_live_hold(p_token text, p_duel uuid, p_op text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
   update public.dm_live_duels set hold_ad=true,hold_until=now()+interval '60 seconds' where id=d.id returning * into d;
  end if;
  return jsonb_build_object('ok',true,'holdLeftMs',greatest(0,floor(extract(epoch from (d.hold_until-now()))*1000))::int,'adLeftMs',greatest(0,floor(extract(epoch from (d.hold_until-now()-interval '15 seconds'))*1000))::int);
 end if;
 return jsonb_build_object('ok',false,'message','Geçersiz işlem.');
end $function$;

create or replace function public.dm_duel_ad_accept(p_token text,p_offer uuid,p_duel uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare reward jsonb; match_result jsonb; s public.students; d public.dm_live_duels;
begin
 reward:=public.dm_duel_ad(p_token,'live','redeem',p_offer);
 if not coalesce((reward->>'ok')::boolean,false) or not coalesce((reward->>'claimed')::boolean,false) then return reward; end if;
 s:=dm_private.duel_session(p_token);
 if s.id is null then return reward||jsonb_build_object('match',jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.')); end if;
 select * into d from public.dm_live_duels where id=p_duel for update;
 if d.id is null or not coalesce((d.status='searching' and d.hold_id=s.id and d.hold_until>now()) or (d.status='matched' and d.guest_id=s.id and not d.vs_papi),false) then
  return reward||jsonb_build_object('match',jsonb_build_object('ok',false,'message','Davet artık açık değil. Kazandığın hakkın duruyor.'));
 end if;
 match_result:=public.dm_duel_live_accept(p_token,p_duel);
 return reward||jsonb_build_object('match',match_result);
end $$;
revoke all on function public.dm_duel_ad_accept(text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.dm_duel_ad_accept(text,uuid,uuid) to anon,authenticated;

create or replace function public.dm_duel_papi_cancel(p_token text,p_duel uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; d public.dm_live_duels;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 perform 1 from public.students where id=s.id for update;
 select * into d from public.dm_live_duels where id=p_duel and host_id=s.id and vs_papi for update;
 if d.id is null then return jsonb_build_object('ok',false,'message','Düello bulunamadı.'); end if;
 if d.status='cancelled' then return jsonb_build_object('ok',true,'cancelled',true); end if;
 if d.status<>'matched' or d.host_answers is not null or d.matched_at is null or d.matched_at<clock_timestamp()-interval '6 seconds' then
  return jsonb_build_object('ok',false,'message','Düello başladı. Oyun ekranından çıkabilirsin.');
 end if;
 update public.dm_live_duels set status='cancelled' where id=d.id;
 return jsonb_build_object('ok',true,'cancelled',true);
end $$;
revoke all on function public.dm_duel_papi_cancel(text,uuid) from public,anon,authenticated;
grant execute on function public.dm_duel_papi_cancel(text,uuid) to anon,authenticated;
