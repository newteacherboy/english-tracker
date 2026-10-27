-- [Kota 27 Eki 2026] Lig ve ek veri (yo: altın, XP, karakter) okumaları + sosyal görünürlük tek sorgu.
-- rpc-reads-bildirim-duyuru.sql'deki dm_private.rpc_ogrenci / sosyal_izin fonksiyonlarını kullanır.

-- duyurulariGetir, release-api guard'ı ile aynı: 'duyurular' özelliği kapalıysa edge 403 verir → burada eski yola bırak.
create or replace function public.dm_read_duyuru(p_t text, p_ogrenci text default '')
returns jsonb language plpgsql security definer set search_path to '' as $$
declare s public.students;
begin
 s:=dm_private.rpc_ogrenci(p_t,p_ogrenci);
 if s.id is null or exists(select 1 from public.dm_release_flags where code='duyurular' and enabled=false) then return jsonb_build_object('fallback',true); end if;
 return jsonb_build_object('data',dm_private.duyuru_icin(s.id));
end $$;

-- social-safety.mjs filterStudents() ile aynı süzgeç
create or replace function dm_private.lig_suz(sid uuid, rows jsonb) returns jsonb
language sql stable security definer set search_path to '' as $$
 select coalesce(jsonb_agg(r.v order by r.n),'[]'::jsonb)
 from jsonb_array_elements(case when jsonb_typeof(rows)='array' then rows else '[]'::jsonb end) with ordinality r(v,n)
 left join public.dm_social_controls c on c.student_id::text=r.v->>'id'
 left join public.students st on st.id::text=r.v->>'id'
 where r.v->>'id'=sid::text or (
  st.frozen_at is null and dm_private.sosyal_izin(c,'profile')
  and not exists(select 1 from public.student_blocks b where (b.blocker_id=sid and b.blocked_id::text=r.v->>'id') or (b.blocked_id=sid and b.blocker_id::text=r.v->>'id')))
$$;

-- seviyeLigListesi (haftalık). Tüm zamanlar ve geçersiz kapsam eski yoldan gider.
create or replace function public.dm_read_lig(p_t text, p_kapsam text default '')
returns jsonb language plpgsql security definer set search_path to '' as $$
declare s public.students; vc public.dm_social_controls;
begin
 if coalesce(nullif(p_kapsam,''),'weekly')<>'weekly' then return jsonb_build_object('fallback',true); end if;
 s:=dm_private.rpc_ogrenci(p_t,'');
 if s.id is null then return jsonb_build_object('fallback',true); end if;
 -- socialSafety.guard: lig 'social' özelliğidir; kapalıysa edge 403 verir
 select * into vc from public.dm_social_controls where student_id=s.id;
 if not dm_private.sosyal_izin(vc,'social') then return jsonb_build_object('fallback',true); end if;
 return jsonb_build_object('data',jsonb_build_object('ok',true,'liste',dm_private.lig_suz(s.id,public.dm_progress_league())));
end $$;

-- ekVeriGetir: ham satırları verir; cevap istemcide diji-api ile aynı kodla kurulur (JSON metni birebir aynı olsun diye).
create or replace function public.dm_read_ekveri(p_t text, p_ogrenci text default '', p_anahtar text default '')
returns jsonb language plpgsql security definer set search_path to '' as $$
declare s public.students; r public.extra_data; g jsonb;
begin
 s:=dm_private.rpc_ogrenci(p_t,p_ogrenci);
 if s.id is null then return jsonb_build_object('fallback',true); end if;
 select * into r from public.extra_data where student_id=s.id and key_name=coalesce(p_anahtar,'');
 if coalesce(p_anahtar,'')='yo' then select value into g from public.extra_data where student_id=s.id and key_name='weekly_target'; end if;
 return jsonb_build_object('data',jsonb_build_object('var',r.student_id is not null,'value',r.value,'updated_at',r.updated_at,'goal',g,'created_at',s.created_at));
end $$;

-- Edge'deki visibility(): dondurulmuş hesaplar, veli/yönetici ayarları ve engeller tek sorguda (3 sorgu yerine).
create or replace function public.dm_social_visibility(p_ids uuid[], p_viewer uuid default null)
returns jsonb language sql stable security definer set search_path to '' as $$
 select jsonb_build_object(
  'frozen',coalesce((select jsonb_agg(s.id) from public.students s where s.id=any(p_ids) and s.frozen_at is not null),'[]'::jsonb),
  'controls',coalesce((select jsonb_agg(jsonb_build_object('student_id',c.student_id,'social_enabled',c.social_enabled,'profile_visible',c.profile_visible,'messages_enabled',c.messages_enabled,'duels_enabled',c.duels_enabled,'gifts_enabled',c.gifts_enabled,'suspended_until',c.suspended_until)) from public.dm_social_controls c where c.student_id=any(p_ids)),'[]'::jsonb),
  'blocks',case when p_viewer is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('blocker_id',b.blocker_id,'blocked_id',b.blocked_id)) from public.student_blocks b where b.blocker_id=p_viewer or b.blocked_id=p_viewer),'[]'::jsonb) end)
$$;

revoke all on function dm_private.lig_suz(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.dm_social_visibility(uuid[],uuid) from public, anon, authenticated;
grant execute on function public.dm_social_visibility(uuid[],uuid) to service_role;
revoke all on function public.dm_read_lig(text,text), public.dm_read_ekveri(text,text,text), public.dm_read_duyuru(text,text) from public;
grant execute on function public.dm_read_lig(text,text), public.dm_read_ekveri(text,text,text), public.dm_read_duyuru(text,text) to anon, authenticated;
