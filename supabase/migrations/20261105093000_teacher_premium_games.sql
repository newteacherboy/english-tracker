-- Öğretmen Premium Oyunları: sınıf misafirleri değil, yalnızca yetkili öğretmenin
-- kendisine ait izole "Premium Oyun" profili paket haklarına bağlanır.
begin;

create table if not exists public.dm_teacher_premium_quota_runs (
  student_id uuid not null references public.students(id) on delete cascade,
  game_key text not null check(game_key in ('word-match','cloud-flight','word-blocks','papizzle','runners-papi')),
  run_id uuid not null,
  started_at timestamptz not null default now(),
  primary key (student_id, game_key, run_id)
);
create index if not exists dm_teacher_premium_quota_today
 on public.dm_teacher_premium_quota_runs(student_id, game_key, started_at);
alter table public.dm_teacher_premium_quota_runs enable row level security;
revoke all on public.dm_teacher_premium_quota_runs from public, anon, authenticated;
grant select, insert on public.dm_teacher_premium_quota_runs to service_role;

-- Yalnızca sunucunun öğretmen erişiminden oluşturduğu özel preview profili.
-- Öğrencilerin ve diğer sınıf misafirlerinin satın alma hakları değişmez.
create or replace function public.dm_plan(actor uuid, account_role text default 'student')
returns text language sql stable set search_path to '' as $$
  select case
    when account_role='student' and exists(
      select 1 from public.teacher_portal_guests g
      join public.teacher_portal_access a on a.id=g.access_id and a.state='approved'
      join public.teachers t on t.id=a.teacher_id and t.active and t.frozen_at is null
      where g.student_id=actor and g.alias='Premium Oyun' and g.preview
        and t.is_admin and t.username='teacher'
    ) then 'premium_pro'
    when account_role='student' and exists(
      select 1 from public.teacher_portal_guests g
      join public.teacher_portal_access a on a.id=g.access_id and a.state='approved'
      join public.teachers t on t.id=a.teacher_id and t.active and t.frozen_at is null
      where g.student_id=actor and g.alias='Premium Oyun' and g.preview
    ) then (
      select public.dm_plan(a.teacher_id,'teacher')
      from public.teacher_portal_guests g
      join public.teacher_portal_access a on a.id=g.access_id
      where g.student_id=actor and g.alias='Premium Oyun' and g.preview
      limit 1
    )
    when account_role='student' and exists(
      select 1 from public.students s where s.id=actor and lower(s.username)='dijimedu_demo'
    ) then 'premium_pro'
    when exists(select 1 from public.dm_entitlements e
      where e.account_id=actor and e.account_role=dm_plan.account_role and e.state='active'
        and (e.valid_until is null or e.valid_until>now())
        and e.product_key = any(case when dm_plan.account_role='teacher'
          then array['teacher_premium_pro']
          else array['diji_premium_pro','premium','premium_plus','premium_max',
            'diji_premium','diji_premium_plus','diji_premium_max'] end))
      then 'premium_pro'
    when exists(select 1 from public.dm_entitlements e
      where e.account_id=actor and e.account_role=dm_plan.account_role and e.state='active'
        and (e.valid_until is null or e.valid_until>now())
        and e.product_key=case when dm_plan.account_role='teacher' then 'teacher_pro' else 'diji_pro' end)
      then 'pro'
    else 'free'
  end
$$;

create or replace function public.dm_pwm_is_premium(actor uuid)
returns boolean language sql stable set search_path to '' as $$
  select public.dm_plan(actor,'student')='premium_pro'
    or (public.dm_plan(actor,'student')='pro' and exists(
      select 1 from public.teacher_portal_guests g
      where g.student_id=actor and g.alias='Premium Oyun' and g.preview
    ))
$$;

-- Pro öğretmenlerde her premium oyun için günlük beş başlangıç.
-- Atomik ayrım, tekrar gönderilen runId için hak düşmesini engeller.
create or replace function public.dm_teacher_premium_quota(
  p_actor uuid, p_game text, p_run uuid default null, p_reserve boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare p text; n integer; beginning timestamptz;
begin
  if p_game not in ('word-match','cloud-flight','word-blocks','papizzle','runners-papi')
    then raise exception 'Geçersiz oyun.'; end if;
  perform 1 from public.teacher_portal_guests g
    join public.teacher_portal_access a on a.id=g.access_id and a.state='approved'
    join public.teachers t on t.id=a.teacher_id and t.active and t.frozen_at is null
    where g.student_id=p_actor and g.alias='Premium Oyun' and g.preview;
  if not found then raise exception 'Öğretmen oyun profili gerekli.'; end if;
  p:=public.dm_plan(p_actor,'student');
  if p<>'pro' then return jsonb_build_object('plan',p,'remaining',case when p='premium_pro' then 999 else 3 end); end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':'||p_game,2026));
  beginning:=((now() at time zone 'Europe/Istanbul')::date::timestamp at time zone 'Europe/Istanbul');
  if p_reserve then
    if p_run is null then raise exception 'Geçersiz oyun.'; end if;
    if not exists(select 1 from public.dm_teacher_premium_quota_runs
      where student_id=p_actor and game_key=p_game and run_id=p_run) then
      select count(*) into n from public.dm_teacher_premium_quota_runs
        where student_id=p_actor and game_key=p_game and started_at>=beginning;
      if n>=5 then raise exception 'Bugünkü 5 bölüm hakkın bitti.'; end if;
      insert into public.dm_teacher_premium_quota_runs(student_id,game_key,run_id)
        values(p_actor,p_game,p_run);
    end if;
  end if;
  select count(*) into n from public.dm_teacher_premium_quota_runs
    where student_id=p_actor and game_key=p_game and started_at>=beginning;
  return jsonb_build_object('plan',p,'remaining',greatest(0,5-n));
end $$;
revoke all on function public.dm_teacher_premium_quota(uuid,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.dm_teacher_premium_quota(uuid,text,uuid,boolean) to service_role;
commit;
