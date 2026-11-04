-- Premium Pro: haftalık veli raporu (her pazar 18:00, Türkiye saati).
-- Mevcut altyapıyı kullanır: dm_progress_mail_preferences (veli onayı), dm_papi_progress_outbox (kuyruk),
-- papi-progress-worker (gönderim; her gönderimden önce onayı yeniden doğrular, günlük kotaya uyar), abonelikten çıkış belirteci.
-- Yönetici dm_communication_rules 'premium_parent_weekly' kuralıyla açıp kapatabilir.
begin;

insert into public.dm_communication_rules(key, category, title, enabled, settings)
values ('premium_parent_weekly', 'mail', 'Premium Pro haftalık veli raporu', true, '{"weekday":"sunday","hour":18,"timezone":"Europe/Istanbul"}')
on conflict (key) do nothing;

-- Raporu üretir (kuyruğa yazmaz): önizleme ve test için ayrı.
create or replace function public.dm_parent_weekly_report(p_student uuid, p_unsubscribe_token text default null)
returns jsonb language plpgsql stable set search_path to '' as $$
declare
 s record; t_end timestamptz := now(); t_start timestamptz := now() - interval '7 days'; p_start timestamptz := now() - interval '14 days';
 games int; prev_games int; secs int; prev_secs int; ok int; bad int; prev_ok int; prev_bad int; days int; prev_days int;
 levels int; lessons int; acc int; prev_acc int; weak text := ''; weak_n int := 0; tip text; who text; cls text := '';
 months text[] := array['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
 range_label text; subject text; html text; row_html text; arrow text; color text := '#0b7f86';
begin
 select st.id, st.username, st.full_name, st.streak, st.class_no, st.branch, te.full_name teacher_name, te.username teacher_user
 into s from public.students st left join public.teachers te on te.id = st.teacher_id and te.active where st.id = p_student;
 if not found then return null; end if;

 select count(*) filter (where created_at >= t_start), count(*) filter (where created_at < t_start),
        coalesce(sum(least(greatest(duration_seconds,0),1800)) filter (where created_at >= t_start),0),
        coalesce(sum(least(greatest(duration_seconds,0),1800)) filter (where created_at < t_start),0),
        coalesce(sum(correct_count) filter (where created_at >= t_start),0), coalesce(sum(wrong_count) filter (where created_at >= t_start),0),
        coalesce(sum(correct_count) filter (where created_at < t_start),0), coalesce(sum(wrong_count) filter (where created_at < t_start),0),
        count(distinct (created_at at time zone 'Europe/Istanbul')::date) filter (where created_at >= t_start),
        count(distinct (created_at at time zone 'Europe/Istanbul')::date) filter (where created_at < t_start)
 into games, prev_games, secs, prev_secs, ok, bad, prev_ok, prev_bad, days, prev_days
 from public.game_scores where student_id = p_student and created_at >= p_start and created_at < t_end;
 select count(*) into levels from public.level_completions where student_id = p_student and completed_at >= t_start;
 select count(*) into lessons from public.lesson_progress where student_id = p_student and test_success and completed_at >= t_start;
 acc := case when ok + bad > 0 then round(100.0 * ok / (ok + bad)) end;
 prev_acc := case when prev_ok + prev_bad > 0 then round(100.0 * prev_ok / (prev_ok + prev_bad)) end;

 select coalesce(string_agg('<span style="display:inline-block;background:#eef7f5;color:#0f5d55;border-radius:999px;padding:5px 12px;margin:3px;font-weight:bold">'
          || public.dm_mail_escape(en) || '</span> <span style="color:#64748b;font-size:13px">' || public.dm_mail_escape(tr) || '</span>', '<br>'), ''), count(*)
 into weak, weak_n from (
  select w.v->>'en' en, coalesce(w.v->>'tr','') tr from public.extra_data e cross join lateral jsonb_each(e.value->'zk') w(k, v)
  where e.student_id = p_student and e.key_name = 'yo' and jsonb_typeof(e.value->'zk') = 'object' and jsonb_typeof(w.v) = 'object'
    and coalesce(w.v->>'en','') <> '' and (case when w.v->>'kutu' ~ '^[0-9]{1,3}$' then (w.v->>'kutu')::int else 0 end) < 5
  order by case when w.v->>'yanlis' ~ '^[0-9]{1,6}$' then (w.v->>'yanlis')::int else 1 end desc limit 5) z;

 who := public.dm_mail_escape(coalesce(nullif(btrim(split_part(s.full_name, ' ', 1)), ''), s.username));
 if s.class_no is not null and s.teacher_name is not null then
  cls := s.class_no || '-' || public.dm_mail_escape(coalesce(s.branch,'')) || ' · Öğretmeni: ' || public.dm_mail_escape(s.teacher_name);
 end if;
 range_label := extract(day from t_start at time zone 'Europe/Istanbul')::int || ' ' || months[extract(month from t_start at time zone 'Europe/Istanbul')::int]
   || ' – ' || extract(day from t_end at time zone 'Europe/Istanbul')::int || ' ' || months[extract(month from t_end at time zone 'Europe/Istanbul')::int];

 tip := case
  when games = 0 then who || ' bu hafta hiç oyun oynamadı. Akşam yemeğinden önce 10 dakikalık tek bir oyun bile alışkanlığı yeniden başlatır.'
  when days < 3 then who || ' bu hafta ' || days || ' gün çalıştı. Haftaya 3 güne çıkmak için kısa ama düzenli oturumlar (günde 10 dakika) en etkilisi.'
  when acc is not null and acc < 70 then 'Doğruluk %' || acc || '. Aşağıdaki kelimeleri birlikte sesli tekrar etmek, hız yerine doğruluğa odaklanmasına yardım eder.'
  when prev_games > 0 and games < prev_games then 'Geçen haftaya göre biraz daha az oynadı. Küçük bir hedef (ör. haftada 15 oyun) motivasyonu artırır.'
  else 'Harika bir hafta! ' || who || ' için küçük bir tebrik çok iyi gelir; takdir edilmek düzenli çalışmanın en güçlü yakıtı.' end;

 subject := '📊 Haftalık İngilizce raporu: ' || who || ' (' || range_label || ')';
 row_html := '';
 for arrow in select unnest(array[
   'Çalıştığı gün|' || days || ' / 7|' || coalesce(days - prev_days, 0),
   'Oyun|' || games || '|' || (games - prev_games),
   'Çalışma süresi|' || round(secs / 60.0) || ' dk|' || (round(secs / 60.0) - round(prev_secs / 60.0)),
   'Doğruluk|' || coalesce('%' || acc, '—') || '|' || coalesce((acc - prev_acc)::text, 'x'),
   'Tamamlanan seviye|' || levels || '|x',
   'Tamamlanan ders|' || lessons || '|x',
   'Güncel seri|' || coalesce(s.streak, 0) || ' gün|x'])
 loop
  row_html := row_html || '<tr><td style="padding:10px 4px;border-bottom:1px solid #eef3f2;color:#334155">' || split_part(arrow, '|', 1)
   || '</td><td style="padding:10px 4px;border-bottom:1px solid #eef3f2;text-align:right;font-weight:bold;color:#0f172a">' || split_part(arrow, '|', 2)
   || case when split_part(arrow, '|', 3) in ('x', '0', '') then ''
           when split_part(arrow, '|', 3)::int > 0 then ' <span style="color:#0f7a5c;font-size:12px">▲ ' || split_part(arrow, '|', 3) || '</span>'
           else ' <span style="color:#b3261e;font-size:12px">▼ ' || abs(split_part(arrow, '|', 3)::int) || '</span>' end
   || '</td></tr>';
 end loop;

 html := '<div style="max-width:620px;margin:auto;padding:26px 16px;font:16px/1.55 Arial,sans-serif;color:#243447;background:#f4fbfa">'
  || '<div style="padding:24px;border-radius:22px;background:linear-gradient(125deg,#0aa3ab,#3b82f6);color:white;text-align:center">'
  || '<img src="https://raw.githubusercontent.com/newteacherboy/english-tracker/main/ingilizce/papi-welcome-v2.png" width="96" height="96" alt="Papi" style="display:block;margin:0 auto 10px;border:0">'
  || '<div style="font-size:13px;letter-spacing:1px;opacity:.9">PREMIUM PRO · HAFTALIK VELİ RAPORU</div>'
  || '<h1 style="margin:6px 0 4px;font-size:24px">' || who || ' · bu hafta</h1><div style="opacity:.92">' || range_label || (case when cls <> '' then ' · ' || cls else '' end) || '</div></div>'
  || '<div style="background:white;border-radius:20px;margin-top:14px;padding:20px 22px">'
  || '<table style="width:100%;border-collapse:collapse;font-size:15px">' || row_html || '</table>'
  || '<p style="font-size:12px;color:#64748b;margin:8px 0 0">▲▼ önceki 7 güne göre. Süre ve doğruluk oyun sonuçlarından hesaplanır.</p></div>'
  || '<div style="background:#fff8ec;border:1px solid #f5d9a8;border-radius:20px;margin-top:14px;padding:18px 22px"><b style="color:#a76016">💡 Bu haftanın önerisi</b><p style="margin:6px 0 0">' || tip || '</p></div>'
  || case when weak_n > 0 then '<div style="background:white;border-radius:20px;margin-top:14px;padding:18px 22px"><b style="color:' || color || '">🔁 Birlikte tekrar edin</b><p style="margin:6px 0 10px;color:#475569;font-size:14px">Henüz tam oturmamış kelimeler:</p>' || weak || '</div>' else '' end
  || '<p style="text-align:center;margin:24px 0"><a href="https://app.dijimedu.com" style="background:#0aa3ab;color:white;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:14px">DİJİ MEDU''YU AÇ →</a></p>'
  || '<p style="text-align:center;font-size:11px;color:#64748b">Bu rapor Premium Pro üyeliğiyle her pazar gönderilir.'
  || case when p_unsubscribe_token is not null then ' Almak istemiyorsanız <a style="color:#64748b" href="https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/papi-progress-unsubscribe?token=' || p_unsubscribe_token || '">abonelikten çıkın</a>.' else '' end
  || '</p></div>';

 return jsonb_build_object('subject', subject, 'html', html,
  'text', who || ' bu hafta: ' || days || ' gün, ' || games || ' oyun, ' || round(secs / 60.0) || ' dk' || coalesce(', doğruluk %' || acc, '') || '. https://app.dijimedu.com',
  'games', games, 'days', days);
end $$;

-- Pazar 18:00'de kuyruğa yazar. Yalnız Premium Pro, yalnız onaylı ve abonelikten çıkmamış veli adresleri.
create or replace function public.dm_parent_weekly_queue()
returns integer language plpgsql set search_path to '' as $$
declare p record; v_day date := (now() at time zone 'Europe/Istanbul')::date; n int := 0; tok text; r jsonb;
begin
 if (select enabled from public.dm_communication_rules where key = 'premium_parent_weekly') is distinct from true then return 0; end if;
 perform public.dm_sync_registered_mail_recipients();
 for p in
  select pref.student_id, pref.recipient_kind, pref.email
  from public.dm_progress_mail_preferences pref join public.students s on s.id = pref.student_id
  where pref.recipient_kind = 'parent' and pref.opted_in_at is not null and pref.unsubscribed_at is null
    and s.role = 'student' and s.status = 'approved' and s.frozen_at is null and lower(s.username) <> 'dijimedu_demo'
    and public.dm_plan(s.id, 'student') = 'premium_pro'
    and not exists (select 1 from public.dm_papi_progress_outbox x where x.kind = 'parent_weekly' and x.student_id = pref.student_id
                    and lower(x.to_email) = lower(pref.email) and x.report_date > v_day - 6)
  order by pref.student_id
  limit 150
 loop
  tok := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.dm_papi_unsubscribe_tokens(token_hash, student_id, email) values (md5(tok), p.student_id, p.email) on conflict do nothing;
  r := public.dm_parent_weekly_report(p.student_id, tok);
  if r is null then continue; end if;
  insert into public.dm_papi_progress_outbox(student_id, recipient_kind, to_email, subject, html, text_body, kind, report_date, send_after)
  values (p.student_id, p.recipient_kind, p.email, r->>'subject', r->>'html', r->>'text', 'parent_weekly', v_day, now() + interval '5 minutes')
  on conflict do nothing;
  n := n + 1;
 end loop;
 return n;
end $$;

revoke all on function public.dm_parent_weekly_report(uuid, text), public.dm_parent_weekly_queue() from public, anon, authenticated;
grant execute on function public.dm_parent_weekly_report(uuid, text), public.dm_parent_weekly_queue() to service_role;

-- Pazar 15:00 UTC = 18:00 Türkiye.
select cron.unschedule('dm-parent-weekly') where exists (select 1 from cron.job where jobname = 'dm-parent-weekly');
select cron.schedule('dm-parent-weekly', '0 15 * * 0', 'select public.dm_parent_weekly_queue();');

commit;
