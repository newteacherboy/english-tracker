-- [27 Eki 2026, kullanıcı onaylı]
-- 1) Lig e-postaları birleşti: tek e-posta pazar 15:00 (İstanbul) = 12:00 UTC; son durumu gösterir ve
--    pazartesi yeni lig haftasının başlayacağını söyler. Pazartesi e-postası kapatıldı (panelden geri açılabilir).
-- 2) Kişisel ilerleme e-postası haftada bir yerine 10 günde bir; içerik son 10 günü özetler.

create or replace function pg_temp.degistir(src text, a text, b text) returns text language plpgsql as $f$
begin
 if position(a in src)=0 then raise exception 'Beklenen metin bulunamadı: %', left(a,80); end if;
 return replace(src,a,b);
end $f$;

do $m$
declare d text;
begin
 -- Lig e-postası: pazar metni
 select pg_get_functiondef('public.dm_papi_league_mail_prepare'::regproc) into d;
 d:=pg_temp.degistir(d,$q$heading:='Papi hatırlatıyor: Lig haftası bitiyor!';$q$,
   $q$heading:='🏆 Lig haftası bitiyor: işte son durumun!';$q$);
 d:=pg_temp.degistir(d,$q$para:='Bu gece ligler yenileniyor. Öğrendiklerin ve gösterdiğin çaba değerli! Yeni haftada seni yepyeni kelimeler ve maceralar bekliyor.';$q$,
   $q$para:='Bu haftanın lig sıralamasında son durum aşağıda. Lig bu gece yarısı kapanıyor; bugün yapacağın her ders ve oyun sıranı hâlâ değiştirebilir. Kesin sonuçlar ve ödüller pazartesi uygulamada görünecek. 🌅 Pazartesi yeni lig haftası başlıyor: herkes sıfırdan başlıyor, yeni haftada seni yepyeni kelimeler ve maceralar bekliyor!';$q$);
 execute d;

 -- İlerleme e-postası: 7 gün → 10 gün
 select pg_get_functiondef('public.dm_papi_progress_queue'::regproc) into d;
 d:=pg_temp.degistir(d,$q$x.sent_at>now()-interval '7 days'$q$,$q$x.sent_at>now()-interval '10 days'$q$);
 d:=pg_temp.degistir(d,$q$pref.last_queued_at<=now()-interval '7 days'$q$,$q$pref.last_queued_at<=now()-interval '10 days'$q$);
 d:=pg_temp.degistir(d,$q$from public.game_scores where student_id=p.student_id and created_at>=now()-interval '7 days'$q$,$q$from public.game_scores where student_id=p.student_id and created_at>=now()-interval '10 days'$q$);
 d:=pg_temp.degistir(d,$q$test_success and completed_at>=now()-interval '7 days'$q$,$q$test_success and completed_at>=now()-interval '10 days'$q$);
 d:=pg_temp.degistir(d,$q$mode='buyu' and completed_at>=now()-interval '7 days'$q$,$q$mode='buyu' and completed_at>=now()-interval '10 days'$q$);
 d:=pg_temp.degistir(d,$q$'🌟 Papi''den haftalık başarı haberi!'$q$,$q$'🌟 Papi''den 10 günlük başarı haberi!'$q$);
 d:=pg_temp.degistir(d,$q$'💫 Bu hafta neler başardın?'$q$,$q$'💫 Son 10 günde neler başardın?'$q$);
 d:=pg_temp.degistir(d,$q$'Bu hafta oyunlar, dersler ve maceralarla güzel adımlar attın.$q$,$q$'Son 10 günde oyunlar, dersler ve maceralarla güzel adımlar attın.$q$);
 d:=pg_temp.degistir(d,$q$Senin son 7 günün$q$,$q$Senin son 10 günün$q$);
 execute d;

 -- Kuyruktan alırken aynı adrese ilerleme e-postası en az 10 gün arayla
 select pg_get_functiondef('public.dm_papi_take_due'::regproc) into d;
 d:=pg_temp.degistir(d,$q$(q.kind='papi_progress' and previous.sent_at>now()-interval '7 days')$q$,$q$(q.kind='papi_progress' and previous.sent_at>now()-interval '10 days')$q$);
 execute d;
end $m$;

-- Panel ayarları ve zamanlama
update public.dm_communication_rules set title='Pazar lig özeti (son durum + yeni hafta)', settings=settings||'{"hour":15}'::jsonb, updated_at=now() where key='weekly_league_mail';
update public.dm_communication_rules set enabled=false, title='Pazartesi lig hatırlatması (pazar e-postasıyla birleşti)', updated_at=now() where key='monday_league_mail';
update public.dm_communication_rules set title='10 günlük ilerleme e-postası', settings=settings||'{"interval_days":10}'::jsonb, updated_at=now() where key='three_day_mail';
select cron.alter_job(job_id:=jobid, schedule:='0 12 * * 0') from cron.job where jobname='dm-papi-league-sunday';
