-- Hediye üyelik (4 Kas 2026). Mağaza dışı, ücretsiz plan tanımlama.
-- Kullanım (Supabase SQL editöründe):
--   select public.dm_gift_plan('ogretmen_kullanici_adi','teacher_premium_pro',6);           -- Öğretmenler Günü kampanyası
--   select public.dm_gift_plan('ogrenci_kullanici_adi','diji_pro',1,'destek');               -- başka bir hediye
--   select public.dm_gift_revoke('ogretmen_kullanici_adi','teacher_premium_pro');            -- geri al
-- "ogretmenler-gunu-2026" kampanyası en fazla 20 hesaba verilebilir.
begin;

create or replace function public.dm_gift_plan(p_username text, p_product text, p_months integer default 6, p_campaign text default 'ogretmenler-gunu-2026')
returns jsonb language plpgsql set search_path to '' as $$
declare acct_role text; acct uuid; tx uuid; until timestamptz; used int; ref text;
begin
 if p_product not in ('diji_pro','diji_premium_pro','teacher_pro','teacher_premium_pro') then raise exception 'Bilinmeyen ürün: %', p_product; end if;
 if p_months is null or p_months<1 or p_months>24 then raise exception 'Süre 1-24 ay olmalı'; end if;
 if p_campaign is null or p_campaign !~ '^[a-z0-9-]{3,40}$' then raise exception 'Geçersiz kampanya adı'; end if;
 acct_role:=case when p_product like 'teacher_%' then 'teacher' else 'student' end;
 if acct_role='teacher' then select id into acct from public.teachers where lower(username)=lower(p_username) and active and frozen_at is null;
 else select id into acct from public.students where lower(username)=lower(p_username) and status='approved' and role='student'; end if;
 if acct is null then raise exception 'Hesap bulunamadı veya aktif değil: %', p_username; end if;
 ref:='gift:'||p_campaign||':'||acct::text;
 if p_campaign='ogretmenler-gunu-2026' then
  select count(*) into used from public.dm_payment_transactions where provider='web' and provider_transaction_id like 'gift:ogretmenler-gunu-2026:%' and provider_transaction_id<>ref;
  if used>=20 then raise exception 'Öğretmenler Günü hediyesi 20 hesaba verildi, kontenjan doldu'; end if;
 end if;
 select greatest(now(),coalesce(max(valid_until),now())) into until from public.dm_entitlements
  where account_id=acct and account_role=acct_role and product_key=p_product and state='active';
 until:=until+make_interval(months=>p_months);
 insert into public.dm_payment_transactions(account_id,account_role,provider,provider_transaction_id,product_key,state,amount_minor,currency,verified_at,valid_until)
 values(acct,acct_role,'web',ref,p_product,'verified',0,'TRY',now(),until)
 on conflict(provider,provider_transaction_id) do update set state='verified',verified_at=now(),valid_until=excluded.valid_until,product_key=excluded.product_key
 returning id into tx;
 insert into public.dm_entitlements(account_id,account_role,product_key,provider,transaction_id,state,valid_until,updated_at)
 values(acct,acct_role,p_product,'web',tx,'active',until,now())
 on conflict(account_id,account_role,product_key) do update set provider='web',transaction_id=tx,state='active',valid_until=until,updated_at=now();
 return jsonb_build_object('ok',true,'username',p_username,'role',acct_role,'product',p_product,'validUntil',until,'campaign',p_campaign);
end $$;

create or replace function public.dm_gift_revoke(p_username text, p_product text)
returns jsonb language plpgsql set search_path to '' as $$
declare acct uuid; n int;
begin
 select id into acct from public.teachers where lower(username)=lower(p_username) and p_product like 'teacher_%';
 if acct is null then select id into acct from public.students where lower(username)=lower(p_username) and p_product like 'diji_%'; end if;
 if acct is null then raise exception 'Hesap bulunamadı: %', p_username; end if;
 update public.dm_payment_transactions set state='revoked' where account_id=acct and provider='web' and product_key=p_product and provider_transaction_id like 'gift:%' and state='verified';
 get diagnostics n=row_count;
 return jsonb_build_object('ok',true,'revoked',n);
end $$;

revoke all on function public.dm_gift_plan(text,text,integer,text),public.dm_gift_revoke(text,text) from public,anon,authenticated;
commit;
