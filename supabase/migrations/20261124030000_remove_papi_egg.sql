-- [24 Kas 2026] Parkurdaki Sürpriz Yumurta (her 3 durakta çatlayan) tamamen kaldırıldı.
-- İstemci artık papi-rewards'a 'yumurta' / 'yumurta_cat' göndermiyor; Edge Function bu eylemleri reddediyor.
-- Sunucu tarafındaki fonksiyon ve öğrenci başına tutulan yumurta durum/geçmiş kayıtları silinir.
-- Not: dm_papi_study_count ve dm_papi_energy_credit, Papi'nin Kanadı (dm_papi_feather) tarafından kullanıldığı için korunur.
drop function if exists public.dm_papi_egg(uuid, boolean);

delete from public.extra_data
where key_name = 'papi_egg_v1'
   or key_name like 'papi\_egg\_hatch:%' escape '\';
