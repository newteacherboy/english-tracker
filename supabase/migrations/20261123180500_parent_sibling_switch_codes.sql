alter table public.dm_parent_links
  add column if not exists switch_seed uuid not null default gen_random_uuid(),
  add column if not exists switch_hash text,
  add column if not exists switch_custom boolean not null default false;
create unique index if not exists dm_parent_sibling_switch_unique
  on public.dm_parent_links(parent_id, switch_hash) where switch_hash is not null;
