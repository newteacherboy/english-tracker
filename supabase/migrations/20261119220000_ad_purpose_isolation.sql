-- Bind an existing game offer to the ad intent at creation, not at redemption.
alter table dm_ad_rewards.intents add column if not exists play_offer_id uuid references dm_ad_rewards.premium_offers(id);
create unique index if not exists dm_ad_intent_play_offer_unique on dm_ad_rewards.intents(play_offer_id) where play_offer_id is not null and canceled_at is null;
do $patch$
declare s text; name text; sig text;
begin
 s:=pg_get_functiondef('public.dm_ad_intent(uuid,text,text,uuid,uuid)'::regprocedure);
 if position('play_offer_id' in s)=0 then
  s:=replace(s,'amount integer;','amount integer; offer uuid; purpose text; explicit_play boolean:=p_kind=''play'';');
  s:=replace(s,'if p_action=''create'' then','if p_action=''create'' then
  if explicit_play then p_kind:=''energy''; end if;');
  s:=replace(s,'if not found then
   select count(*) into used', 'if not found then
   if p_kind=''energy'' then
    select id,game into offer,purpose from dm_ad_rewards.premium_offers where student_id=p_actor and ad_id is null and expires_at>clock_timestamp() and (not explicit_play or id=p_id) order by created_at desc limit 1;
    if explicit_play and offer is null then raise exception ''Geçersiz oyun reklamı teklifi''; end if;
   end if;
   select count(*) into used');
  s:=replace(s,'and kind=p_kind and reward_day=', 'and kind=p_kind and (case when offer is null then play_offer_id is null else play_offer_id in (select id from dm_ad_rewards.premium_offers where game=purpose) end) and reward_day=');
  s:=replace(s,'and not exists(select 1 from dm_ad_rewards.premium_offers where student_id=p_actor and ad_id is null and expires_at>clock_timestamp()) /* premium-ad-plays-v1 */','and offer is null');
  s:=replace(s,'insert into dm_ad_rewards.intents(student_id,kind,request_key) values(p_actor,p_kind,p_request)','insert into dm_ad_rewards.intents(student_id,kind,request_key,play_offer_id) values(p_actor,p_kind,p_request,offer)');
  if position('select id,game into offer,purpose' in s)=0 or position('explicit_play' in s)=0 or position('values(p_actor,p_kind,p_request,offer)' in s)=0 or position('offer is null' in s)=0 then raise exception 'Unexpected intent definition'; end if;
  execute s;
 end if;
 s:=pg_get_functiondef('public.dm_ad_claim(uuid,text,text,integer,timestamptz)'::regprocedure);
 if position('play_offer_id' in s)=0 then
  s:=replace(s,'and kind=i.kind and reward_day=i.reward_day','and kind=i.kind and (case when i.play_offer_id is null then play_offer_id is null else play_offer_id in (select id from dm_ad_rewards.premium_offers where game=(select game from dm_ad_rewards.premium_offers where id=i.play_offer_id)) end) and reward_day=i.reward_day');
  s:=replace(s,'if i.kind=''energy'' then
  delta:=','if i.play_offer_id is not null then
  if i.canceled_at is not null then return jsonb_build_object(''credited'',false,''reason'',''canceled''); end if;
  delta:=0;
 elsif i.kind=''energy'' then
  delta:=');
  if position('delta:=0;' in s)=0 then raise exception 'Unexpected claim definition'; end if;
  execute s;
 end if;
 foreach sig in array array['public.dm_duel_ad(text,text,text,uuid)','public.dm_premium_ad_offer(uuid,text,text,uuid)'] loop
  s:=pg_get_functiondef(sig::regprocedure);
  if position('i.play_offer_id=o.id' in s)=0 then
   s:=replace(s,'i.kind=''energy'' and i.claimed_at', 'i.kind=''energy'' and i.play_offer_id=o.id and i.claimed_at');
   if position('i.play_offer_id=o.id' in s)=0 then raise exception 'Unexpected redeem definition'; end if;
   execute s;
  end if;
 end loop;
end $patch$;
