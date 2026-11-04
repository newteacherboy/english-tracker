-- Android reklam ayarları sunucuda: uygulama açılışta okur, sürüm gerekmeden değişir.
-- "enabled=false" tüm reklamları (banner, geçiş, ödüllü) tek seferde kapatır.
create table if not exists public.dm_ad_settings(
  key text primary key check (key in ('android','ios')),
  settings jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.dm_ad_settings enable row level security;
revoke all on public.dm_ad_settings from anon, authenticated;

insert into public.dm_ad_settings(key, settings) values ('android', jsonb_build_object(
  'enabled', true,              -- ana anahtar: kapalıysa hiçbir reklam yok
  'banner', true,
  'interstitial', true,
  'rewarded', true,
  'bannerTabs', jsonb_build_array('games','store','lessons'), -- lessons = Ders Çalış anlatım + örnekler (test ekranı hariç)
  'gamesPerInterstitial', 3,
  'gapSeconds', 300,
  'dailyInterstitials', 5,
  'newUserGraceHours', 24,      -- yeni üyeye ilk 24 saat geçiş reklamı yok
  'minAnswers', 3,              -- yarıda bırakılan oyun sayılmaz
  'minGameSeconds', 30,         -- birkaç saniyede biten oyun sayılmaz
  'dailyEnergy', 5,
  'dailyGold', 3
)) on conflict (key) do nothing;

-- Öğrenci oturumu için geçerli ayarlar + hesap yaşı (saat).
create or replace function public.dm_ad_policy(p_student uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'settings', (select settings from public.dm_ad_settings where key = 'android'),
    'accountAgeHours', (select floor(extract(epoch from now() - s.created_at) / 3600)::int from public.students s where s.id = p_student)
  );
$$;
revoke all on function public.dm_ad_policy(uuid) from public, anon, authenticated;
