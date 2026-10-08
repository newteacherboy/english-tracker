-- Geri alma: konuları yedek tablodaki eski hallerine döndürür.
begin;
update public.lesson_topics t set content = y.content from public.lesson_topics_yedek_20261008 y where y.id = t.id;
commit;
