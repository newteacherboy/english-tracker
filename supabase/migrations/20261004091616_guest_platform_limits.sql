alter table public.dm_guest_previews add column used_features jsonb not null default '{}';
create or replace function public.dm_guest_claim(digest text,feature text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare g public.dm_guest_previews;
begin
 if feature not in ('ky','jp','bosluk','hafiza','yagmur','asmaca','kelimebul','eslestirme','tren','dikte','cumle','harfbahcesi','ba','kp','sh','kk','lesson','quiz','leveltest','shop','profile','ucus','rota') then return jsonb_build_object('ok',false,'mesaj','Bu özellik misafir denemesine dahil değil.');end if;
 select * into g from public.dm_guest_previews where device_hash=digest for update;
 if not found or g.expires_at<=now() then return jsonb_build_object('ok',false,'expired',true,'mesaj','10 dakikalık denemen tamamlandı.');end if;
 if g.used_features ? feature then return jsonb_build_object('ok',false,'used',true,'mesaj','Bu deneme hakkını kullandın. Diğer bölümleri keşfedebilir ya da ücretsiz üye olabilirsin.');end if;
 update public.dm_guest_previews set used_features=used_features||jsonb_build_object(feature,now()) where device_hash=digest;
 return jsonb_build_object('ok',true,'feature',feature);
end $$;
revoke all on function public.dm_guest_claim(text,text) from public,anon,authenticated;
grant execute on function public.dm_guest_claim(text,text) to service_role;
create or replace function public.dm_guest_lesson(digest text,lesson_key text) returns boolean language plpgsql security invoker set search_path='' as $$
declare g public.dm_guest_previews;
begin
 select * into g from public.dm_guest_previews where device_hash=digest for update;
 if not found or g.expires_at<=now() or length(lesson_key)>256 then return false;end if;
 if g.used_features ? 'lesson_key' then return (g.used_features->>'lesson_key')=lesson_key;end if;
 update public.dm_guest_previews set used_features=used_features||jsonb_build_object('lesson_key',lesson_key,'lesson',now()) where device_hash=digest;
 return true;
end $$;
revoke all on function public.dm_guest_lesson(text,text) from public,anon,authenticated;
grant execute on function public.dm_guest_lesson(text,text) to service_role;
