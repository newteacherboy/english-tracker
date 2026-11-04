-- Çoklu sınıf: öğretmen sınıfları, sınıfa özel katılım kodu ve plan bazlı sınıf sınırı.
-- Sınıf = (öğretmen, sınıf numarası, şube). Ödev/duyuru hedefleri zaten bu ikiliyle çalışıyor; öğrenci tablosu değişmez.
-- Şube öğretmenin yazdığı gibi saklanır (tek harfliler büyütülür); karşılaştırmalar lower(btrim()) ile.
-- Sınır: Free 1, Pro 5, Premium Pro sınırsız. Yalnız YENİ sınıf açarken uygulanır; mevcut sınıflar hiçbir zaman kilitlenmez.
-- Kod biçimi: 7 karakter, ilk harf G-Z → eski öğretmen kodlarıyla (onaltılık 0-9A-F) asla çakışmaz.
begin;

create table if not exists public.dm_teacher_classes(
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid not null references public.teachers(id) on delete cascade,
 class_no integer not null check(class_no between 1 and 12),
 branch text not null check(length(btrim(branch)) between 1 and 10),
 name text check(name is null or length(name) <= 40),
 join_code text not null unique check(join_code ~ '^[G-Z][A-Z0-9]{6}$'),
 created_at timestamptz not null default now(),
 archived_at timestamptz
);
create unique index if not exists dm_teacher_classes_group on public.dm_teacher_classes(teacher_id, class_no, lower(btrim(branch))) where archived_at is null;
create index if not exists dm_teacher_classes_teacher on public.dm_teacher_classes(teacher_id) where archived_at is null;
alter table public.dm_teacher_classes enable row level security;
revoke all on public.dm_teacher_classes from public, anon, authenticated;
grant select, insert, update on public.dm_teacher_classes to service_role;

create or replace function public.dm_class_code()
returns text language plpgsql volatile set search_path to '' as $$
declare a1 text := 'GHJKMNPQRTUVWXYZ'; a2 text := 'ABCDEFGHJKMNPQRTUVWXYZ2346789'; c text;
begin
 loop
  c := substr(a1, 1 + floor(random() * length(a1))::int, 1);
  for i in 1..6 loop c := c || substr(a2, 1 + floor(random() * length(a2))::int, 1); end loop;
  exit when not exists (select 1 from public.dm_teacher_classes where join_code = c);
 end loop;
 return c;
end $$;

create or replace function public.dm_class_limit(p_teacher uuid)
returns integer language sql stable set search_path to '' as $$
 select case public.dm_plan(p_teacher, 'teacher') when 'premium_pro' then null when 'pro' then 5 else 1 end
$$;

-- Panel listesi: sınıflar (öğrenci sayısıyla) + henüz bir sınıfa ait olmayan öğrenci grupları.
create or replace function public.dm_teacher_classes_list(p_teacher uuid)
returns jsonb language sql stable set search_path to '' as $$
 with st as (
  select id, username, full_name, class_no, nullif(btrim(coalesce(branch, '')), '') as branch
  from public.students where teacher_id = p_teacher and status = 'approved' and frozen_at is null
 ), cl as (
  select * from public.dm_teacher_classes where teacher_id = p_teacher and archived_at is null
 )
 select jsonb_build_object(
  'plan', public.dm_plan(p_teacher, 'teacher'),
  'limit', public.dm_class_limit(p_teacher),
  'used', (select count(*) from cl),
  'classes', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'classNo', c.class_no, 'branch', c.branch, 'name', c.name, 'code', c.join_code,
     'students', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'username', s.username, 'fullName', s.full_name) order by s.username)
        from st s where s.class_no = c.class_no and lower(s.branch) = lower(btrim(c.branch))), '[]'::jsonb))
     order by c.class_no, upper(c.branch)) from cl c), '[]'::jsonb),
  'unassigned', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'username', s.username, 'fullName', s.full_name, 'classNo', s.class_no, 'branch', s.branch) order by s.class_no nulls last, s.branch, s.username)
     from st s where not exists (select 1 from cl c where c.class_no = s.class_no and lower(btrim(c.branch)) = lower(s.branch))), '[]'::jsonb))
$$;

create or replace function public.dm_class_create(p_teacher uuid, p_class_no integer, p_branch text, p_name text default null)
returns jsonb language plpgsql set search_path to '' as $$
declare lim integer; used integer; b text := btrim(coalesce(p_branch, '')); r public.dm_teacher_classes;
begin
 perform pg_advisory_xact_lock(hashtextextended('dm_class:' || p_teacher::text, 0));
 if not exists (select 1 from public.teachers where id = p_teacher and active and frozen_at is null) then raise exception 'Öğretmen hesabı etkin değil.' using errcode = 'P0001'; end if;
 if p_class_no is null or p_class_no not between 1 and 12 then raise exception 'Sınıf 1 ile 12 arasında olmalı.' using errcode = 'P0001'; end if;
 if length(b) = 1 then b := upper(b); end if;
 if b !~ '^[A-Za-zÇĞİÖŞÜçğıöşü0-9]{1,10}$' then raise exception 'Şube harf veya rakam olmalı (en fazla 10 karakter).' using errcode = 'P0001'; end if;
 if exists (select 1 from public.dm_teacher_classes where teacher_id = p_teacher and archived_at is null and class_no = p_class_no and lower(btrim(branch)) = lower(b)) then
  raise exception 'Bu sınıf zaten listende.' using errcode = 'P0001'; end if;
 lim := public.dm_class_limit(p_teacher);
 select count(*) into used from public.dm_teacher_classes where teacher_id = p_teacher and archived_at is null;
 if lim is not null and used >= lim then raise exception 'PLAN_LIMIT:%', lim using errcode = 'P0001'; end if;
 insert into public.dm_teacher_classes(teacher_id, class_no, branch, name, join_code)
 values (p_teacher, p_class_no, b, nullif(left(btrim(coalesce(p_name, '')), 40), ''), public.dm_class_code()) returning * into r;
 return jsonb_build_object('id', r.id, 'code', r.join_code);
end $$;

-- Ad değiştir, yeni kod üret veya arşivle (öğrenciler yerinde kalır, "sınıfı tanımlanmamış" listesine düşer).
create or replace function public.dm_class_update(p_teacher uuid, p_class uuid, p_name text default null, p_new_code boolean default false, p_archive boolean default false)
returns jsonb language plpgsql set search_path to '' as $$
declare r public.dm_teacher_classes;
begin
 select * into r from public.dm_teacher_classes where id = p_class and teacher_id = p_teacher and archived_at is null for update;
 if not found then raise exception 'Sınıf bulunamadı.' using errcode = 'P0001'; end if;
 update public.dm_teacher_classes set
  name = case when p_name is null then name else nullif(left(btrim(p_name), 40), '') end,
  join_code = case when p_new_code then public.dm_class_code() else join_code end,
  archived_at = case when p_archive then now() else null end
 where id = p_class returning * into r;
 return jsonb_build_object('id', r.id, 'code', r.join_code, 'archived', r.archived_at is not null);
end $$;

-- Öğrenciyi öğretmenin kendi sınıflarından birine taşır (yalnız kendi öğrencisi).
create or replace function public.dm_class_move_student(p_teacher uuid, p_student uuid, p_class uuid)
returns jsonb language plpgsql set search_path to '' as $$
declare c public.dm_teacher_classes;
begin
 select * into c from public.dm_teacher_classes where id = p_class and teacher_id = p_teacher and archived_at is null;
 if not found then raise exception 'Sınıf bulunamadı.' using errcode = 'P0001'; end if;
 update public.students set class_no = c.class_no, branch = c.branch, updated_at = now()
 where id = p_student and teacher_id = p_teacher and status = 'approved';
 if not found then raise exception 'Öğrenci bulunamadı.' using errcode = 'P0001'; end if;
 return jsonb_build_object('ok', true, 'classNo', c.class_no, 'branch', c.branch);
end $$;

-- Kayıt/bağlanma sırasında sınıf kodunu çözer. Yoksa null döner ve eski öğretmen kodu akışı devam eder.
create or replace function public.dm_class_resolve_code(p_code text)
returns jsonb language sql stable set search_path to '' as $$
 select jsonb_build_object('teacherId', c.teacher_id, 'classNo', c.class_no, 'branch', c.branch)
 from public.dm_teacher_classes c join public.teachers t on t.id = c.teacher_id
 where c.join_code = upper(btrim(p_code)) and c.archived_at is null and t.active and t.frozen_at is null
 limit 1
$$;

revoke all on function public.dm_class_code(), public.dm_class_limit(uuid), public.dm_teacher_classes_list(uuid),
 public.dm_class_create(uuid, integer, text, text), public.dm_class_update(uuid, uuid, text, boolean, boolean),
 public.dm_class_move_student(uuid, uuid, uuid), public.dm_class_resolve_code(text) from public, anon, authenticated;
grant execute on function public.dm_class_code(), public.dm_class_limit(uuid), public.dm_teacher_classes_list(uuid),
 public.dm_class_create(uuid, integer, text, text), public.dm_class_update(uuid, uuid, text, boolean, boolean),
 public.dm_class_move_student(uuid, uuid, uuid), public.dm_class_resolve_code(text) to service_role;

-- Mevcut düzen: en az 2 öğrencisi olan her (öğretmen, sınıf, şube) grubu sınıf olur (sınırdan muaf).
do $$
declare g record;
begin
 for g in
  select s.teacher_id, s.class_no, case when length(min(btrim(s.branch))) = 1 then upper(min(btrim(s.branch))) else min(btrim(s.branch)) end as branch
  from public.students s join public.teachers t on t.id = s.teacher_id and t.active
  where s.status = 'approved' and s.frozen_at is null and s.class_no between 1 and 12
    and btrim(coalesce(s.branch, '')) ~ '^[A-Za-zÇĞİÖŞÜçğıöşü0-9]{1,10}$'
  group by s.teacher_id, s.class_no, lower(btrim(s.branch)) having count(*) >= 2
 loop
  insert into public.dm_teacher_classes(teacher_id, class_no, branch, join_code)
  values (g.teacher_id, g.class_no, g.branch, public.dm_class_code()) on conflict do nothing;
 end loop;
end $$;

commit;
