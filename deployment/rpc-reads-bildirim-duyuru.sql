-- [Kota 27 Eki 2026] Bildirim ve duyuru okumaları Edge Function yerine doğrudan veritabanı fonksiyonuyla.
-- diji-api'deki "bildirimlerim" ve "duyurulariGetir" ile aynı kurallar ve aynı cevap biçimi.
-- Yalnız sıradan öğrenci oturumu burada cevaplanır; diğer her durumda {"fallback":true} döner ve
-- istemci eski diji-api yolunu kullanır (oturum süresi dolmuş, sınıf hesabı, öğretmen, iletişim eksik vb.).

-- JS toLocaleLowerCase('tr') + trim ile aynı karşılaştırma
create or replace function dm_private.tr_ad(v text) returns text
language sql immutable set search_path to '' as $$
 select btrim(lower(replace(replace(coalesce(v,''),'I','ı'),'İ','i')))
$$;

-- Oturum anahtarından öğrenci kimliği; edge auth() + requireStudent + contacts.guard ile aynı kontroller.
create or replace function dm_private.rpc_ogrenci(p_t text, p_ogrenci text) returns public.students
language plpgsql security definer set search_path to '' as $$
declare ses public.portal_sessions; s public.students; lp jsonb;
begin
 if p_t is null or length(p_t) not between 20 and 200 then return null; end if;
 select * into ses from public.portal_sessions where token_hash=encode(sha256(convert_to(p_t,'UTF8')),'hex');
 if not found or ses.expires_at<=now() or ses.role<>'student' or ses.student_id is null or ses.teacher_portal_access_id is not null then return null; end if;
 select * into s from public.students where id=ses.student_id;
 if not found or s.frozen_at is not null or s.status<>'approved' or s.role<>'student'
  or coalesce(s.profile->>'teacher_portal_guest','')='true'
  or s.username ~ ' · (Misafir|Öğretmen Denemesi) [a-f0-9]{8}$' then return null; end if;
 if coalesce(p_ogrenci,'')<>'' and p_ogrenci<>s.id::text and dm_private.tr_ad(p_ogrenci)<>dm_private.tr_ad(s.username) then return null; end if;
 -- İletişim kuralı: tamsa geç; değilse edge karar versin (dondurma/uyarı mantığı orada)
 if not public.student_contacts_complete(s.phone,s.email) then
  select value into lp from public.extra_data where student_id=s.id and key_name='learner_profile_v1';
  if not (coalesce(lp->>'version','')='1' and coalesce(s.email,'') ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then return null; end if;
 end if;
 -- auth() ile aynı: son görülme en fazla 5 dakikada bir yazılır
 if ses.last_seen_at is null or ses.last_seen_at < now()-interval '5 minutes' then
  update public.portal_sessions set last_seen_at=now() where id=ses.id;
 end if;
 return s;
end $$;

-- social-safety.mjs allowed() ile aynı
create or replace function dm_private.sosyal_izin(c public.dm_social_controls, f text) returns boolean
language sql stable set search_path to '' as $$
 select c.student_id is null or (
  c.social_enabled is distinct from false
  and not coalesce(c.suspended_until>now(),false)
  and (f='social' or (case f when 'messages' then c.messages_enabled when 'gifts' then c.gifts_enabled when 'duels' then c.duels_enabled else true end) is distinct from false)
  and (f<>'profile' or c.profile_visible is distinct from false))
$$;

create or replace function dm_private.bildirim_liste(sid uuid, p_tumu boolean) returns jsonb
language sql stable security definer set search_path to '' as $$
 with son as (
  select n.*, snd.username as gonderen_ad, snd.frozen_at as gonderen_donuk,
   case when n.type='mesaj' then 'messages' when n.type in ('hediye','enerji') then 'gifts' else 'duels' end f
  from public.notifications n left join public.students snd on snd.id=n.sender_student_id
  where n.recipient_student_id=sid and (p_tumu or n.read_at is null)
  order by n.created_at desc limit 200)
 select coalesce(jsonb_agg(jsonb_build_object(
   'sat',x.id,'tarih',x.created_at,'gonderen',coalesce(x.gonderen_ad,''),'tur',x.type,'metin',x.message,
   'okundu',x.read_at is not null,
   'duyuruId',case when x.payload->'duyuruId' is null or x.payload->'duyuruId' in ('null'::jsonb,'0'::jsonb,'""'::jsonb,'false'::jsonb) then null else x.payload->'duyuruId' end
  ) order by x.created_at desc),'[]'::jsonb)
 from son x
 left join public.dm_social_controls vc on vc.student_id=sid
 left join public.dm_social_controls sc on sc.student_id=x.sender_student_id
 where (x.sender_student_id is null or (
    dm_private.sosyal_izin(vc,x.f) and not exists(select 1 from public.students v where v.id=sid and v.frozen_at is not null)
    and x.gonderen_donuk is null and dm_private.sosyal_izin(sc,x.f)
    and not exists(select 1 from public.student_blocks b where (b.blocker_id=sid and b.blocked_id=x.sender_student_id) or (b.blocked_id=sid and b.blocker_id=x.sender_student_id))))
  and x.sender_student_id is distinct from 'dcde2026-1015-4000-8000-000000000001'::uuid
  and not exists(select 1 from unnest(array[x.gonderen_ad,x.payload->>'target_name',x.payload->>'student_name']) nm(v)
                 where lower(btrim(coalesce(nm.v,'')))='dijimedu_demo' or coalesce(nm.v,'') ~ ' · Öğretmen Denemesi [a-f0-9]{8}$')
$$;

create or replace function dm_private.duyuru_icin(sid uuid) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare s public.students; d public.announcements; sinif text; sube text;
begin
 select * into s from public.students where id=sid;
 sinif:=coalesce(nullif(s.class_no::text,'0'),'');
 sube:=dm_private.tr_ad(sinif||'|'||coalesce(s.branch,''));
 select a.* into d from public.announcements a
 where a.active
  and not exists(select 1 from public.announcement_reads r where r.student_id=s.id and r.announcement_id=a.id)
  and (a.teacher_id is null or a.teacher_id=s.teacher_id
       or exists(select 1 from public.teachers t where t.id=a.teacher_id and t.is_admin and t.active))
  and (a.target_type in ('all','tumogrenciler','herkes','ogretmen')
   or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(a.target_list)='array' then a.target_list else '[]'::jsonb end) e(v)
      where case a.target_type
        when 'sinif' then (e.v#>>'{}')=sinif
        when 'sube' then dm_private.tr_ad(e.v#>>'{}')=sube
        else dm_private.tr_ad(e.v#>>'{}')=dm_private.tr_ad(s.username) end))
 order by a.created_at desc limit 1;
 if d.id is null then return 'null'::jsonb; end if;
 return jsonb_build_object('id',d.id,'baslik',d.title,'mesaj',d.message,'hedefTipi',d.target_type,
  'gosterimSinir',coalesce(d.display_limit,0),'tema',coalesce(nullif(d.theme,''),'mavi'),'aktif','evet','tarih',d.created_at,'gorselLink',coalesce(d.image_link,''));
end $$;

create or replace function public.dm_read_bildirimler(p_t text, p_ogrenci text default '', p_tumu boolean default false)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare s public.students;
begin
 s:=dm_private.rpc_ogrenci(p_t,p_ogrenci);
 if s.id is null then return jsonb_build_object('fallback',true); end if;
 return jsonb_build_object('data',jsonb_build_object('liste',dm_private.bildirim_liste(s.id,coalesce(p_tumu,false))));
end $$;

create or replace function public.dm_read_duyuru(p_t text, p_ogrenci text default '')
returns jsonb language plpgsql security definer set search_path to '' as $$
declare s public.students;
begin
 s:=dm_private.rpc_ogrenci(p_t,p_ogrenci);
 if s.id is null then return jsonb_build_object('fallback',true); end if;
 return jsonb_build_object('data',dm_private.duyuru_icin(s.id));
end $$;

revoke all on function dm_private.tr_ad(text), dm_private.rpc_ogrenci(text,text), dm_private.sosyal_izin(public.dm_social_controls,text), dm_private.bildirim_liste(uuid,boolean), dm_private.duyuru_icin(uuid) from public, anon, authenticated;
revoke all on function public.dm_read_bildirimler(text,text,boolean), public.dm_read_duyuru(text,text) from public;
grant execute on function public.dm_read_bildirimler(text,text,boolean), public.dm_read_duyuru(text,text) to anon, authenticated;
