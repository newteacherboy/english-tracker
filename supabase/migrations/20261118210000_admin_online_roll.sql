-- [18 Kas 2026] Yönetici paneli: "Çevrimiçi" — şu an uygulaması açık öğrenciler (yalnız yönetici hesabı görür).
-- Düşük yük: sürekli kalp atışı / son görülme yazımı YOK. Yönetici bölümü açınca (veya Yenile'ye basınca)
--  1) dm_admin_online('open') kısa ömürlü bir yoklama açar (60 sn),
--  2) yönetici zaten var olan dm-duel-lobby kanalına tek bir 'who' yayını yollar,
--  3) uygulaması önde açık öğrenciler dm_online_here ile bir kez cevap verir (kimlik sunucuda token'dan),
--  4) yönetici dm_admin_online('list') ile listeyi okur.
-- Yoklama kimliği sunucuda doğrulandığı için sahte 'who' yayınları liste toplayamaz.

create table if not exists dm_private.online_rolls(
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '60 seconds'
);
create table if not exists dm_private.online_pings(
 roll_id uuid not null references dm_private.online_rolls(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 screen text,
 in_duel boolean not null default false,
 at timestamptz not null default now(),
 primary key(roll_id,student_id)
);
alter table dm_private.online_rolls enable row level security;
alter table dm_private.online_pings enable row level security;
revoke all on dm_private.online_rolls, dm_private.online_pings from public, anon, authenticated;

create or replace function public.dm_admin_online(p_token text, p_op text, p_roll uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ses jsonb; r dm_private.online_rolls; rows jsonb;
begin
 ses:=dm_private.campaign_session(p_token);
 if ses is null or not coalesce((ses->>'admin')::boolean,false) then
  return jsonb_build_object('ok',false,'message','Bu bölüm yalnız yönetici hesabına açık.');
 end if;
 if p_op='open' then
  delete from dm_private.online_rolls where created_at<now()-interval '10 minutes';
  insert into dm_private.online_rolls default values returning * into r;
  return jsonb_build_object('ok',true,'roll',r.id,'serverNow',now());
 elsif p_op='list' then
  select coalesce(jsonb_agg(jsonb_build_object(
    'name',s.username,'class',coalesce(s.selected_class,s.class_no),'screen',p.screen,'duel',p.in_duel,'at',p.at)
    order by p.in_duel desc, s.username),'[]'::jsonb) into rows
  from dm_private.online_pings p join public.students s on s.id=p.student_id
  where p.roll_id=p_roll;
  return jsonb_build_object('ok',true,'online',rows,'count',jsonb_array_length(rows),'serverNow',now());
 end if;
 return jsonb_build_object('ok',false,'message','Geçersiz işlem.');
end $$;

-- Öğrencinin tek cevabı: yoklama açık değilse hiçbir şey yazmaz.
create or replace function public.dm_online_here(p_token text, p_roll uuid, p_screen text default null, p_duel boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students;
begin
 if p_roll is null or not exists(select 1 from dm_private.online_rolls where id=p_roll and expires_at>now()) then
  return jsonb_build_object('ok',false);
 end if;
 s:=dm_private.rpc_ogrenci(p_token,'');
 if s.id is null then return jsonb_build_object('ok',false); end if;
 insert into dm_private.online_pings(roll_id,student_id,screen,in_duel)
 values(p_roll,s.id,left(nullif(trim(p_screen),''),24),coalesce(p_duel,false))
 on conflict(roll_id,student_id) do update set screen=excluded.screen,in_duel=excluded.in_duel,at=now();
 return jsonb_build_object('ok',true);
end $$;

revoke all on function public.dm_admin_online(text,text,uuid), public.dm_online_here(text,uuid,text,boolean) from public;
grant execute on function public.dm_admin_online(text,text,uuid), public.dm_online_here(text,uuid,text,boolean) to anon,authenticated,service_role;
