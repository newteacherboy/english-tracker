-- [17 Kas 2026] Papi ile sohbet: ücretsiz deneme hakkı 2'den 1'e düştü (Premium Pro sınırsız devam eder).
-- Canlı veritabanına 17 Kas 2026'da uygulandı; bu dosya aynı değişikliği kayıt altına alır.
do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.dm_papi_dialogue(uuid,text,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'''trialLimit'',2','''trialLimit'',1');
 definition:=replace(definition,'greatest(0,2-used)','greatest(0,1-used)');
 definition:=replace(definition,'not coalesce(premium,false) and used>=2','not coalesce(premium,false) and used>=1');
 execute definition;
end $migration$;
