-- Test sırasında kurulan gölge fonksiyonu kaldırır.
-- dm_progress_context_next, göçün gerçek 54 öğrenci üzerinde gerilemeye yol açmadığını
-- doğrulamak için geçici olarak kurulmuştu; hiçbir yerden çağrılmıyor.
drop function if exists public.dm_progress_context_next(uuid);
