begin;
-- Existing energy videos retain their verified +7-energy reward. This opt-in
-- offer additionally unlocks one selected Premium game, once per verified ad.
create table if not exists dm_ad_rewards.premium_offers (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 game text not null check(game in ('word-match','papizzle','cloud-flight','word-blocks','tower','word-goal','rally')),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '15 minutes',
 ad_id uuid unique references dm_ad_rewards.intents(id),
 reward_day date,
 redeemed_at timestamptz
);
alter table dm_ad_rewards.premium_offers enable row level security;
revoke all on dm_ad_rewards.premium_offers from public,anon,authenticated;
grant all on dm_ad_rewards.premium_offers to service_role;
create index if not exists premium_offers_student_game_day on dm_ad_rewards.premium_offers(student_id,game,reward_day) where redeemed_at is not null;

-- Preserve the live access rules, adding only verified per-game video credits.
do $install$
declare src text; marker text:='premium-ad-plays-v1';
begin
 src:=pg_get_functiondef('public.dm_game_access(uuid,text)'::regprocedure);
 if position(marker in src)=0 then
  if position('case game_key' in src)=0 then raise exception 'Game quota contract changed'; end if;
  src:=replace(src,'case game_key', E'-- premium-ad-plays-v1\n if p<>''premium_pro'' then\n  lim:=lim+(select count(*)::int from dm_ad_rewards.premium_offers where student_id=actor and game=game_key and reward_day=today and redeemed_at is not null);\n end if;\n case game_key');
  execute src;
 end if;
 -- Full energy is allowed ONLY while an explicit Premium game offer is active.
 src:=pg_get_functiondef('public.dm_ad_intent(uuid,text,text,uuid,uuid)'::regprocedure);
 if position(marker in src)=0 then
  if position('then raise exception ''Enerjin zaten dolu''' in src)=0 then raise exception 'Energy intent contract changed'; end if;
  src:=replace(src,'then raise exception ''Enerjin zaten dolu''', E'and not exists(select 1 from dm_ad_rewards.premium_offers where student_id=p_actor and ad_id is null and expires_at>clock_timestamp()) /* premium-ad-plays-v1 */ then raise exception ''Enerjin zaten dolu''');
  execute src;
 end if;
end $install$;

create or replace function public.dm_premium_ad_offer(actor uuid,game_key text,op text,offer_key uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare st public.students; o dm_ad_rewards.premium_offers; proof dm_ad_rewards.intents;
 today date:=(clock_timestamp() at time zone 'Europe/Istanbul')::date; access jsonb;
begin
 select * into st from public.students where id=actor for update;
 if not found or st.status<>'approved' or st.role<>'student' or st.frozen_at is not null
 or st.username='dijimedu_demo' or coalesce(st.profile->>'teacher_portal_guest','false')='true'
 then raise exception 'Öğrenci oturumu gerekli.'; end if;
 if game_key not in ('word-match','papizzle','cloud-flight','word-blocks','tower','word-goal','rally') or game_key is null then raise exception 'Geçersiz oyun.'; end if;
 if op='prepare' then
  access:=public.dm_game_access(actor,game_key);
  if (access->>'remaining')::int>0 then raise exception 'Geçersiz teklif. Kullanılabilir oyun hakkın var.'; end if;
  -- A new video must not redeem an unrelated video already in progress.
  if exists(select 1 from dm_ad_rewards.intents where student_id=actor and claimed_at is null and canceled_at is null and expires_at>clock_timestamp()) then raise exception 'Geçersiz teklif. Açık reklam isteğinin tamamlanmasını bekle.'; end if;
  update dm_ad_rewards.premium_offers set expires_at=clock_timestamp() where student_id=actor and ad_id is null and expires_at>clock_timestamp();
  insert into dm_ad_rewards.premium_offers(student_id,game) values(actor,game_key) returning * into o;
  return jsonb_build_object('ok',true,'offerId',o.id);
 elsif op='redeem' then
  select * into o from dm_ad_rewards.premium_offers where id=offer_key and student_id=actor and game=game_key for update;
  if not found then raise exception 'Geçersiz reklam teklifi.'; end if;
  if o.ad_id is not null then
   return public.dm_game_access(actor,game_key)||jsonb_build_object('ok',true,'claimed',true,'duplicate',true);
  end if;
  -- SSV can arrive late. The VIDEO must have started inside the offer window.
  select i.* into proof from dm_ad_rewards.intents i
  where i.student_id=actor and i.kind='energy' and i.claimed_at is not null and i.transaction_id is not null
   and i.created_at>=o.created_at and i.created_at<o.expires_at and i.reward_day=today
   and not exists(select 1 from dm_ad_rewards.premium_offers used where used.ad_id=i.id)
  order by i.created_at limit 1 for update;
  if not found then return jsonb_build_object('ok',true,'claimed',false); end if;
  update dm_ad_rewards.premium_offers set ad_id=proof.id,reward_day=today,redeemed_at=clock_timestamp() where id=o.id;
  return public.dm_game_access(actor,game_key)||jsonb_build_object('ok',true,'claimed',true,'duplicate',false);
 end if;
 raise exception 'Geçersiz işlem.';
end $$;
revoke all on function public.dm_premium_ad_offer(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.dm_premium_ad_offer(uuid,text,text,uuid) to service_role;
commit;
