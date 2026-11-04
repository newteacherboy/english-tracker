-- Hediye üyelik: yönetici paneli ve yeni öğretmenlere otomatik hediye anahtarı (4 Kas 2026).
begin;

create table if not exists public.dm_gift_settings(
 key text primary key,
 enabled boolean not null default false,
 product_key text not null default 'teacher_premium_pro',
 months integer not null default 6 check(months between 1 and 24),
 campaign text not null default 'ogretmenler-gunu-2026',
 updated_at timestamptz not null default now()
);
alter table public.dm_gift_settings enable row level security;
revoke all on public.dm_gift_settings from public,anon,authenticated;
grant select,insert,update on public.dm_gift_settings to service_role;
insert into public.dm_gift_settings(key) values('new_teachers') on conflict do nothing;

-- Yeni öğretmen aktif olduğunda (kayıt onayı) anahtar açıksa hediye verilir; kontenjan dolunca sessizce atlanır.
create or replace function public.dm_gift_new_teacher() returns trigger
language plpgsql set search_path to '' as $$
declare s public.dm_gift_settings;
begin
 if not new.active or new.frozen_at is not null or coalesce(new.is_admin,false) or lower(new.username)='teacher' then return null; end if;
 if tg_op='UPDATE' and old.active then return null; end if;
 select * into s from public.dm_gift_settings where key='new_teachers' and enabled;
 if not found then return null; end if;
 if exists(select 1 from public.dm_payment_transactions where account_id=new.id and account_role='teacher' and provider_transaction_id like 'gift:%') then return null; end if;
 begin
  perform public.dm_gift_plan(new.username, s.product_key, s.months, s.campaign);
 exception when others then null; -- kontenjan dolu vb.: kayıt işlemini asla bozma
 end;
 return null;
end $$;
create trigger dm_gift_new_teacher after insert or update of active on public.teachers
for each row execute function public.dm_gift_new_teacher();

-- Yönetici paneli için hediye listesi.
create or replace function public.dm_gift_list()
returns jsonb language sql stable set search_path to '' as $$
 select jsonb_build_object(
  'gifts', coalesce((select jsonb_agg(jsonb_build_object(
     'username', coalesce(t.username, s.username), 'role', x.account_role, 'product', x.product_key,
     'campaign', split_part(x.provider_transaction_id, ':', 2), 'state', x.state, 'validUntil', x.valid_until, 'createdAt', x.created_at)
     order by x.created_at desc)
   from public.dm_payment_transactions x
   left join public.teachers t on x.account_role='teacher' and t.id=x.account_id
   left join public.students s on x.account_role='student' and s.id=x.account_id
   where x.provider='web' and x.provider_transaction_id like 'gift:%'), '[]'::jsonb),
  'teachersDayUsed', (select count(*) from public.dm_payment_transactions where provider='web' and provider_transaction_id like 'gift:ogretmenler-gunu-2026:%'),
  'teachersDayLimit', 20,
  'auto', (select to_jsonb(g) - 'key' from public.dm_gift_settings g where key='new_teachers'))
$$;

revoke all on function public.dm_gift_new_teacher(),public.dm_gift_list() from public,anon,authenticated;
grant execute on function public.dm_gift_plan(text,text,integer,text),public.dm_gift_revoke(text,text),public.dm_gift_list() to service_role;
commit;
