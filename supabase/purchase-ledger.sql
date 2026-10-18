begin;
-- No provider keys or card data. Only server-verified receipts may grant access.
create table public.dm_payment_transactions(
 id uuid primary key default gen_random_uuid(),
 account_id uuid,account_role text not null check(account_role in ('student','teacher')),
 provider text not null check(provider in ('apple','google','web')),
 provider_transaction_id text not null, product_key text not null,
 state text not null check(state in ('pending','verified','refunded','revoked','expired')),
 amount_minor bigint check(amount_minor>=0),currency text check(length(currency)=3),
 verified_at timestamptz,valid_until timestamptz,created_at timestamptz not null default now(),
 unique(provider,provider_transaction_id),check(state<>'verified' or verified_at is not null)
);
create table public.dm_entitlements(
 account_id uuid not null,account_role text not null check(account_role in ('student','teacher')),
 product_key text not null,provider text not null check(provider in ('apple','google','web')),
 transaction_id uuid not null references public.dm_payment_transactions(id),
 state text not null check(state in ('active','revoked','expired')),valid_until timestamptz,
 updated_at timestamptz not null default now(),primary key(account_id,account_role,product_key)
);
create table public.dm_payment_events(
 provider text not null check(provider in ('apple','google','web')),event_id text not null,
 received_at timestamptz not null default now(),processed_at timestamptz,primary key(provider,event_id)
);
alter table public.dm_payment_transactions enable row level security;
alter table public.dm_entitlements enable row level security;
alter table public.dm_payment_events enable row level security;
revoke all on public.dm_payment_transactions,public.dm_entitlements,public.dm_payment_events from public,anon,authenticated;
grant select,insert,update,delete on public.dm_payment_transactions,public.dm_entitlements,public.dm_payment_events to service_role;
create function public.dm_entitlement_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.state='active' and not exists(select 1 from public.dm_payment_transactions t where t.id=new.transaction_id and t.account_id=new.account_id and t.account_role=new.account_role and t.product_key=new.product_key and t.provider=new.provider and t.state='verified' and t.verified_at is not null and (t.valid_until is null or t.valid_until>now()) and (t.valid_until is null or (new.valid_until is not null and new.valid_until<=t.valid_until))) then raise exception 'verified_receipt_required'; end if;
 return new;
end $$;
create trigger dm_entitlement_guard before insert or update on public.dm_entitlements for each row execute function public.dm_entitlement_guard();
create function public.dm_payment_state_sync() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.state in ('refunded','revoked','expired') then update public.dm_entitlements set state=case when new.state='expired' then 'expired' else 'revoked' end,updated_at=now() where transaction_id=new.id; end if;
 return new;
end $$;
create trigger dm_payment_state_sync after update of state on public.dm_payment_transactions for each row execute function public.dm_payment_state_sync();
create function public.dm_account_purchase_cleanup() returns trigger language plpgsql security invoker set search_path='' as $$
declare r text:=case when tg_table_name='students' then 'student' else 'teacher' end;
begin
 delete from public.dm_entitlements where account_id=old.id and account_role=r;
 update public.dm_payment_transactions set account_id=null where account_id=old.id and account_role=r;
 delete from public.dm_account_action_tickets where account_id=old.id and account_role=r;
 return old;
end $$;
create trigger dm_account_purchase_cleanup before delete on public.students for each row execute function public.dm_account_purchase_cleanup();
create trigger dm_account_purchase_cleanup before delete on public.teachers for each row execute function public.dm_account_purchase_cleanup();
revoke all on function public.dm_entitlement_guard(),public.dm_payment_state_sync(),public.dm_account_purchase_cleanup() from public,anon,authenticated;
commit;
