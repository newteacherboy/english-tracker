-- Premium oyunlar: Pro üyeler günde 5 oyun oynayabiliyor ama "ücretsiz hak" sayacı
-- (free_used) her oyunda 1 artıyordu. Tablolardaki CHECK (free_used <= 3) kuralı 4. oyunda
-- kaydı reddediyor, sunucu 503 dönüyor ve oyun "Bağlantı kurulamadı" diyerek açılmıyordu
-- (12 Kas 2026, Candy Papiş). Sayaç artık 3'te tavan yapar; ücretsiz kullanıcıların
-- 3 hak sınırı değişmez (onlar 3'ten sonra zaten başlatamaz).
do $$
declare f record; def text;
begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosrc like '%free_used=free_used+1%'
  loop
    def := replace(pg_get_functiondef(f.oid), 'free_used=free_used+1', 'free_used=least(3,free_used+1)');
    execute def;
  end loop;
end $$;

-- dm_runners_play aynı sayacı farklı yazımla artırıyor.
do $$
declare def text;
begin
  def := replace(pg_get_functiondef('public.dm_runners_play'::regproc),
    'free_used=dm_runners_progress.free_used+case when prem then 0 else 1 end',
    'free_used=least(3,dm_runners_progress.free_used+case when prem then 0 else 1 end)');
  execute def;
end $$;
