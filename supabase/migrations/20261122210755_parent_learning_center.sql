begin;
create table public.dm_parents (
 id uuid primary key default gen_random_uuid(), email text not null unique check(email=lower(email)),
 name text not null, password_hash text not null, pin_hash text not null,
 verified_at timestamptz, created_at timestamptz not null default now(), settings jsonb not null default '{}'
);
create table public.dm_parent_sessions (
 token_hash text primary key, parent_id uuid not null references public.dm_parents(id) on delete cascade,
 expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index on public.dm_parent_sessions(parent_id);
create table public.dm_parent_tokens (
 token_hash text primary key, parent_id uuid not null references public.dm_parents(id) on delete cascade,
 purpose text not null check(purpose in ('verify','reset')), expires_at timestamptz not null,
 used_at timestamptz, created_at timestamptz not null default now()
);
create index on public.dm_parent_tokens(parent_id);
create table public.dm_parent_links (
 parent_id uuid not null references public.dm_parents(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(parent_id,student_id)
);
create index on public.dm_parent_links(student_id);
create table public.dm_parent_codes (
 student_id uuid primary key references public.students(id) on delete cascade,
 code_hash text not null unique, pin_hash text not null, expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create table public.dm_home_practice (
 id uuid primary key, parent_id uuid not null references public.dm_parents(id),
 student_id uuid not null references public.students(id) on delete cascade,
 kind text not null check(kind in ('test','game','plan','summary')),
 feature text not null default '', deck jsonb not null, answers jsonb not null default '[]',
 cursor integer not null default 0, correct integer not null default 0,
 settings jsonb not null default '{}', created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), completed_at timestamptz
);
create index on public.dm_home_practice(student_id,created_at desc);
create index on public.dm_home_practice(parent_id,created_at desc);
create table public.dm_home_word_errors (
 student_id uuid not null references public.students(id) on delete cascade,
 word_key text not null, en text not null, tr text not null, mistakes integer not null default 0,
 updated_at timestamptz not null default now(), primary key(student_id,word_key)
);
create table public.dm_parent_goals (
 parent_id uuid not null references public.dm_parents(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 days integer not null default 4 check(days between 2 and 7), minutes integer not null default 10 check(minutes in(5,10,15)),
 primary key(parent_id,student_id)
);
alter table public.dm_parents enable row level security;
alter table public.dm_parent_sessions enable row level security;
alter table public.dm_parent_tokens enable row level security;
alter table public.dm_parent_links enable row level security;
alter table public.dm_parent_codes enable row level security;
alter table public.dm_home_practice enable row level security;
alter table public.dm_home_word_errors enable row level security;
alter table public.dm_parent_goals enable row level security;
revoke all on public.dm_parents,public.dm_parent_sessions,public.dm_parent_tokens,public.dm_parent_links,public.dm_parent_codes,public.dm_home_practice,public.dm_home_word_errors,public.dm_parent_goals from public,anon,authenticated;
grant all on public.dm_parents,public.dm_parent_sessions,public.dm_parent_tokens,public.dm_parent_links,public.dm_parent_codes,public.dm_home_practice,public.dm_home_word_errors,public.dm_parent_goals to service_role;

create function public.dm_parent_link(p_parent uuid,p_student uuid) returns jsonb
language plpgsql set search_path='' as $$
declare n integer; premium boolean;
begin
 perform 1 from public.dm_parents where id=p_parent and verified_at is not null for update;
 if not found then raise exception 'Önce e-posta adresini doğrula.'; end if;
 perform 1 from public.students where id=p_student and status='approved' and frozen_at is null and email_verified_at is not null;
 if not found then raise exception 'Öğrenci hesabının onaylanması gerekiyor.'; end if;
 if exists(select 1 from public.dm_parent_links where parent_id=p_parent and student_id=p_student) then return '{"ok":true}'; end if;
 select count(*) into n from public.dm_parent_links where parent_id=p_parent;
 select exists(select 1 from public.dm_parent_links l where l.parent_id=p_parent and public.dm_plan(l.student_id,'student')='premium_pro') or public.dm_plan(p_student,'student')='premium_pro' into premium;
 if n>=2 and not premium then return '{"ok":false,"premium":true,"mesaj":"İlk çocuk ve bir kardeş ücretsiz. Ek çocuk için Premium Pro gerekir."}'; end if;
 insert into public.dm_parent_links(parent_id,student_id) values(p_parent,p_student);
 return '{"ok":true}';
end $$;

create function public.dm_home_start(p_id uuid,p_parent uuid,p_student uuid,p_kind text,p_feature text,p_deck jsonb,p_settings jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare tier text; n integer; lim integer; today date := (now() at time zone 'Europe/Istanbul')::date; r public.dm_home_practice;
begin
 perform 1 from public.students where id=p_student and status='approved' and frozen_at is null for update;
 if not found then raise exception 'Öğrenci hesabı aktif değil.'; end if;
 if not exists(select 1 from public.dm_parent_links where parent_id=p_parent and student_id=p_student) then raise exception 'Çocuk bağlantısı gerekli.'; end if;
 select * into r from public.dm_home_practice where id=p_id;
 if found then
  if r.parent_id<>p_parent or r.student_id<>p_student then raise exception 'Çalışmaya erişim yok.'; end if;
  return to_jsonb(r);
 end if;
 tier:=public.dm_plan(p_student,'student');
 if p_kind in ('plan','summary') and tier<>'premium_pro' then
  select count(*) into n from public.dm_home_practice where student_id=p_student and kind=p_kind and feature=p_feature;
  if n>=2 then return '{"ok":false,"premium":true,"mesaj":"İki ücretsiz deneme tamamlandı. Premium Pro ile devam edebilirsin."}';end if;
 end if;
 if p_kind in ('test','game') then
  lim:=case when p_kind='test' then case when tier='free' then 1 else 1000 end else case tier when 'premium_pro' then 1000 when 'pro' then 5 else 1 end end;
  select count(*) into n from public.dm_home_practice where student_id=p_student and kind=p_kind and (created_at at time zone 'Europe/Istanbul')::date=today;
  if n>=lim then return '{"ok":false,"premium":true,"mesaj":"Bugünkü ücretsiz hakkın tamamlandı. Kaydedilmiş çalışmalarını sürdürebilirsin."}';end if;
 end if;
 if jsonb_array_length(p_deck)<1 or jsonb_array_length(p_deck)>15 then raise exception 'Soru sayısını kontrol et.';end if;
 insert into public.dm_home_practice(id,parent_id,student_id,kind,feature,deck,settings)
 values(p_id,p_parent,p_student,p_kind,p_feature,p_deck,p_settings) returning * into r;
 return to_jsonb(r);
end $$;

create function public.dm_home_answer(p_id uuid,p_student uuid,p_cursor integer,p_answer text) returns jsonb
language plpgsql set search_path='' as $$
declare r public.dm_home_practice; q jsonb; good boolean; v jsonb;
begin
 select * into r from public.dm_home_practice where id=p_id and student_id=p_student for update;
 if not found then raise exception 'Çalışma bulunamadı.';end if;
 if r.cursor<>p_cursor or r.completed_at is not null then return to_jsonb(r);end if;
 q:=r.deck->r.cursor;
 good:=lower(regexp_replace(trim(p_answer),'\s+',' ','g'))=lower(regexp_replace(trim(q->>'answer'),'\s+',' ','g'));
 v:=jsonb_build_object('answer',left(p_answer,400),'correct',good,'expected',q->>'answer','en',q->>'en','tr',q->>'tr');
 update public.dm_home_practice set answers=answers||jsonb_build_array(v),cursor=cursor+1,correct=correct+case when good then 1 else 0 end,
 updated_at=now(),completed_at=case when cursor+1>=jsonb_array_length(deck) then now() else null end
 where id=p_id returning * into r;
 if not good and coalesce(q->>'en','')<>'' then
  insert into public.dm_home_word_errors(student_id,word_key,en,tr,mistakes) values(p_student,lower(q->>'en'),q->>'en',q->>'tr',1)
  on conflict(student_id,word_key) do update set mistakes=public.dm_home_word_errors.mistakes+1,updated_at=now();
 end if;
 return to_jsonb(r);
end $$;
revoke all on function public.dm_parent_link(uuid,uuid),public.dm_home_start(uuid,uuid,uuid,text,text,jsonb,jsonb),public.dm_home_answer(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.dm_parent_link(uuid,uuid),public.dm_home_start(uuid,uuid,uuid,text,text,jsonb,jsonb),public.dm_home_answer(uuid,uuid,integer,text) to service_role;
commit;
