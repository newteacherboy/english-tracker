-- iOS test-release reward ledger. No client writes or direct RPC execution.
create schema if not exists dm_ios_ads;
revoke all on schema dm_ios_ads from public,anon,authenticated;
grant usage on schema dm_ios_ads to service_role;
create table dm_ios_ads.rewards (
 student_id uuid not null references public.students(id) on delete cascade,
 request_id uuid not null,
 kind text not null check(kind in ('enerji','altin')),
 reward_day date not null default (now() at time zone 'Europe/Istanbul')::date,
 created_at timestamptz not null default now(), added integer not null,
 primary key(student_id,request_id)
);
alter table dm_ios_ads.rewards enable row level security;
revoke all on dm_ios_ads.rewards from public,anon,authenticated;
grant all on dm_ios_ads.rewards to service_role;
create index ios_ads_day on dm_ios_ads.rewards(student_id,reward_day,kind);
create index ios_ads_recent on dm_ios_ads.rewards(student_id,created_at desc);

create function public.dm_ios_ad_reward(p_actor uuid,p_claim boolean default false,p_kind text default null,
 p_request uuid default null,p_product jsonb default null,p_candidates jsonb default '[]')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 st public.students; v jsonb; balance numeric; price integer:=0; energy_used integer; gold_used integer;
 last_claim timestamptz; today date:=(now() at time zone 'Europe/Istanbul')::date;
 existing dm_ios_ads.rewards; item public.dm_progress_items; delta integer:=0; allowed_gold boolean;
 candidates jsonb; choice text; h bigint:=0; ch text; first_buy boolean;
begin
 -- Same wallet advisory lock used by purchases, then student and wallet row locks.
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,17));
 select * into st from public.students where id=p_actor for update;
 if not found or st.status<>'approved' or st.role<>'student' or st.frozen_at is not null
 or lower(st.username) in ('dijimedu_demo','teacher')
 or coalesce(st.profile->>'teacher_portal_guest','false')='true'
 or st.username ~ ' · (Misafir|Öğretmen Denemesi) [a-f0-9]{8}$' then raise exception 'Öğrenci oturumu gerekli'; end if;
 select value into v from public.extra_data where student_id=p_actor and key_name='yo' for update;
 if v is null then raise exception 'Öğrenci cüzdanı hazır değil'; end if;
 balance:=greatest(0,coalesce((v->>'altin')::numeric,st.gold,0));
 select count(*) filter(where kind='enerji'),count(*) filter(where kind='altin') into energy_used,gold_used
 from dm_ios_ads.rewards where student_id=p_actor and reward_day=today;
 if p_product->>'tip'='kiyafet' then
  select * into item from public.dm_progress_items where id=p_product->>'id';
  if found and not(item.owned_keys <@ coalesce(v#>'{karakter,sahip}','[]')) then
   first_buy:=not coalesce((v->>'dolapIlkIndirimKullanildi')::boolean,false) and coalesce(v->'dolapIlkAlim','{}')='{}'::jsonb;
   select coalesce(jsonb_agg(x order by ord),'[]') into candidates
    from jsonb_array_elements(p_candidates) with ordinality e(x,ord)
    where (coalesce(x->>'gender','')='' or x->>'gender'=v#>>'{karakter,cins}')
      and not(coalesce(v#>'{karakter,sahip}','[]') ? ('d:'||(x->>'id')));
   for ch in select regexp_split_to_table(today::text||st.username,'') loop h:=mod(h*31+ascii(ch),4294967296);end loop;
   if jsonb_array_length(candidates)>0 then choice:=candidates->(mod(h,jsonb_array_length(candidates))::int)->>'id';end if;
   price:=case when first_buy then floor(item.price*.75+.5) when choice=item.id then floor(item.price*.7+.5) else item.price end;
  end if;
 else
  -- Price supplied only by service-role Edge code, resolved from its own catalog.
  price:=greatest(0,coalesce((p_product->>'price')::int,0));
 end if;
 allowed_gold:=balance<100 or price>balance;
 if p_claim then
  if p_kind is null or p_kind not in ('enerji','altin') or p_request is null then raise exception 'Geçersiz reklam ödülü';end if;
  select * into existing from dm_ios_ads.rewards where student_id=p_actor and request_id=p_request;
  if found then
   if existing.kind<>p_kind then raise exception 'İstek türü değiştirilemez';end if;
   return jsonb_build_object('ok',true,'duplicate',true,'eklenen',existing.added,'enerjiKalan',st.energy,'altin',balance,'yo',v);
  end if;
  if (p_kind='enerji' and energy_used>=5) or (p_kind='altin' and gold_used>=2) then raise exception 'Bugünkü reklam hakkın tamamlandı';end if;
  select max(created_at) into last_claim from dm_ios_ads.rewards where student_id=p_actor;
  if last_claim>now()-interval '30 seconds' then raise exception 'İki ödül arasında en az 30 saniye beklemelisin';end if;
  if p_kind='enerji' then
   if st.energy>=25 then raise exception 'Enerjin zaten dolu';end if;
   delta:=least(7,greatest(0,25-st.energy));st.energy:=st.energy+delta;
   update public.students set energy=st.energy where id=p_actor;
   insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(p_actor,delta,st.energy,'ios-admob:'||p_request);
   energy_used:=energy_used+1;
  else
   if not allowed_gold then raise exception 'Altın reklamı bu bakiye veya ürün için uygun değil';end if;
   delta:=100;balance:=balance+delta;
   v:=jsonb_set(jsonb_set(jsonb_set(v,'{altin}',to_jsonb(balance)),'{guncelleme}',to_jsonb(floor(extract(epoch from clock_timestamp())*1000))),'{dmRewardVersion}',to_jsonb(coalesce((v->>'dmRewardVersion')::bigint,0)+1));
   update public.extra_data set value=v,updated_at=now() where student_id=p_actor and key_name='yo';
   update public.students set gold=balance where id=p_actor;
   gold_used:=gold_used+1;
  end if;
  insert into dm_ios_ads.rewards(student_id,request_id,kind,added) values(p_actor,p_request,p_kind,delta);
 end if;
 return jsonb_build_object('ok',true,'eklenen',delta,'enerjiKalan',st.energy,'altin',balance,'yo',case when p_claim then v else null end,
 'kalan',jsonb_build_object('enerji',greatest(0,5-energy_used),'altin',greatest(0,2-gold_used)),
 'uygun',jsonb_build_object('enerji',st.energy<25,'altin',allowed_gold));
end; $$;
revoke all on function public.dm_ios_ad_reward(uuid,boolean,text,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.dm_ios_ad_reward(uuid,boolean,text,uuid,jsonb,jsonb) to service_role;
