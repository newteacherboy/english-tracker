-- Android anlık bildirimleri: cihaz jetonları ve gönderim kaydı.
create table if not exists public.dm_push_tokens(
  token text primary key check (length(token) between 20 and 4096),
  student_id uuid not null references public.students(id) on delete cascade,
  platform text not null default 'android' check (platform in ('android','ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_error text
);
create index if not exists dm_push_tokens_student on public.dm_push_tokens(student_id);
alter table public.dm_push_tokens enable row level security;
revoke all on public.dm_push_tokens from anon, authenticated;

create table if not exists public.dm_push_log(
  id bigserial primary key,
  created_at timestamptz not null default now(),
  sent_by text,
  target text not null,
  title text not null,
  body text not null,
  sent int not null default 0,
  failed int not null default 0,
  removed int not null default 0
);
alter table public.dm_push_log enable row level security;
revoke all on public.dm_push_log from anon, authenticated;
