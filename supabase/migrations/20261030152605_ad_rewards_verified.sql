-- Only the authenticated Edge handler may create intents or submit Google-verified proofs.
create schema if not exists dm_ad_rewards;
revoke all on schema dm_ad_rewards from public, anon, authenticated;
grant usage on schema dm_ad_rewards to service_role;
create table dm_ad_rewards.intents (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
 kind text not null check(kind in ('energy','gold')), request_key uuid not null,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '15 minutes',
 reward_day date not null default (now() at time zone 'Europe/Istanbul')::date,
 canceled_at timestamptz, claimed_at timestamptz, transaction_id text unique, added integer,
 unique(student_id,request_key)
);
alter table dm_ad_rewards.intents enable row level security;
grant all on dm_ad_rewards.intents to service_role;
create index intents_student_day on dm_ad_rewards.intents(student_id,reward_day,kind);

create function public.dm_ad_intent(p_actor uuid,p_action text,p_kind text default null,p_id uuid default null,p_request uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare st public.students; i dm_ad_rewards.intents; used integer; v jsonb; amount integer;
begin
 select * into st from public.students where id=p_actor for update;
 if not found or st.status<>'approved' or st.role<>'student' or st.frozen_at is not null
 or st.username='dijimedu_demo' or coalesce(st.profile->>'teacher_portal_guest','false')='true'
 or st.username ~ ' · (Misafir|Öğretmen Denemesi) [a-f0-9]{8}$' then raise exception 'Öğrenci oturumu gerekli'; end if;
 if p_action='create' then
  if p_kind is null or p_kind not in ('energy','gold') or p_request is null then raise exception 'Geçersiz reklam isteği'; end if;
  select * into i from dm_ad_rewards.intents where student_id=p_actor and request_key=p_request;
  if not found then
   select count(*) into used from dm_ad_rewards.intents where student_id=p_actor and kind=p_kind and reward_day=(now() at time zone 'Europe/Istanbul')::date
   and (claimed_at is not null or (canceled_at is null and expires_at>now()));
   if used>=(case p_kind when 'energy' then 5 else 3 end) then raise exception 'Bugünkü reklam hakkın tamamlandı'; end if;
   if exists(select 1 from dm_ad_rewards.intents where student_id=p_actor and claimed_at is null and canceled_at is null and expires_at>now()) then raise exception 'Bir reklam isteği zaten açık'; end if;
   if p_kind='energy' and st.energy>=25 then raise exception 'Enerjin zaten dolu'; end if;
   if p_kind='gold' and not exists(select 1 from public.extra_data where student_id=p_actor and key_name='yo') then raise exception 'Öğrenci cüzdanı hazır değil'; end if;
   insert into dm_ad_rewards.intents(student_id,kind,request_key) values(p_actor,p_kind,p_request) returning * into i;
  end if;
 elsif p_action in ('status','cancel') then
  select * into i from dm_ad_rewards.intents where id=p_id and student_id=p_actor for update;
  if not found then raise exception 'Reklam isteği bulunamadı'; end if;
  if p_action='cancel' and i.claimed_at is null then update dm_ad_rewards.intents set canceled_at=coalesce(canceled_at,now()) where id=i.id; end if;
 else raise exception 'Geçersiz işlem'; end if;
 select value into v from public.extra_data where student_id=p_actor and key_name='yo';
 return jsonb_build_object('id',i.id,'kind',i.kind,'claimed',i.claimed_at is not null,'added',coalesce(i.added,0),'expiresAt',i.expires_at,
 'energy',st.energy,'gold',coalesce((v->>'altin')::numeric,st.gold,0));
end; $$;

create function public.dm_ad_claim(p_id uuid,p_transaction text,p_unit text,p_amount integer,p_event_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare i dm_ad_rewards.intents; st public.students; actor uuid; used integer; v jsonb; balance numeric; delta integer; expected text;
begin
 select student_id into actor from dm_ad_rewards.intents where id=p_id;
 if actor is null then return jsonb_build_object('credited',false,'reason','unknown_intent'); end if;
 -- Consistent lock order with create/status and existing wallet purchases.
 select * into st from public.students where id=actor for update;
 select * into i from dm_ad_rewards.intents where id=p_id for update;
 if i.claimed_at is not null then return jsonb_build_object('credited',true,'duplicate',true); end if;
 if st.status<>'approved' or st.role<>'student' or st.frozen_at is not null or st.username='dijimedu_demo'
 or coalesce(st.profile->>'teacher_portal_guest','false')='true' or st.username ~ ' · (Misafir|Öğretmen Denemesi) [a-f0-9]{8}$'
 then return jsonb_build_object('credited',false,'reason','inactive_student'); end if;
 expected:=case i.kind when 'energy' then '2306894202' else '7589517182' end;
 if p_transaction is null or p_transaction !~ '^[a-fA-F0-9]{8,256}$' or p_event_at is null or p_unit is null or p_amount is null
 or p_unit not in (expected,'ca-app-pub-5025780881593375/'||expected)
 or p_amount<>(case i.kind when 'energy' then 3 else 100 end)
 or p_event_at<i.created_at-interval '30 seconds' or p_event_at>i.expires_at
 or p_event_at>now()+interval '1 minute' or now()>i.expires_at+interval '24 hours'
 then return jsonb_build_object('credited',false,'reason','invalid_proof'); end if;
 if exists(select 1 from dm_ad_rewards.intents where transaction_id=p_transaction) then return jsonb_build_object('credited',false,'reason','used_transaction'); end if;
 select count(*) into used from dm_ad_rewards.intents where student_id=actor and kind=i.kind and reward_day=i.reward_day and claimed_at is not null;
 if used>=(case i.kind when 'energy' then 5 else 3 end) then return jsonb_build_object('credited',false,'reason','daily_limit'); end if;
 if i.kind='energy' then
  delta:=least(3,greatest(0,25-st.energy));
  update public.students set energy=st.energy+delta where id=actor;
  insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,delta,st.energy+delta,'admob:'||p_transaction);
 else
  select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
  if v is null then return jsonb_build_object('credited',false,'reason','wallet_missing'); end if;
  balance:=greatest(0,coalesce((v->>'altin')::numeric,0))+100; delta:=100;
  update public.extra_data set value=jsonb_set(jsonb_set(v,'{altin}',to_jsonb(balance)),'{guncelleme}',to_jsonb(floor(extract(epoch from clock_timestamp())*1000))),updated_at=now() where student_id=actor and key_name='yo';
  update public.students set gold=balance where id=actor;
 end if;
 update dm_ad_rewards.intents set claimed_at=now(),transaction_id=p_transaction,added=delta where id=p_id;
 return jsonb_build_object('credited',true,'duplicate',false,'added',delta);
end; $$;
revoke all on function public.dm_ad_intent(uuid,text,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.dm_ad_claim(uuid,text,text,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.dm_ad_intent(uuid,text,text,uuid,uuid),public.dm_ad_claim(uuid,text,text,integer,timestamptz) to service_role;
