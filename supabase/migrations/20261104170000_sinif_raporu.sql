-- Sınıf raporu (çoklu sınıfa bağlı). Tek çağrıda: sınıf özeti (önceki döneme göre), zor kelimeler, öğrenci satırları.
-- Kaynaklar: game_scores (oyun, doğru/yanlış, süre), level_completions (seviye), extra_data 'yo'.zk (zor kelimeler), students.
-- Dönem: 7 veya 30 gün. Free planda sunucu her zaman 7 güne indirir.
create or replace function public.dm_class_report(p_teacher uuid, p_class uuid, p_days integer default 7)
returns jsonb language plpgsql stable set search_path to '' as $$
declare c public.dm_teacher_classes; plan text; days integer; t_end timestamptz := now(); t_start timestamptz; p_start timestamptz; res jsonb;
begin
 select * into c from public.dm_teacher_classes where id = p_class and teacher_id = p_teacher and archived_at is null;
 if not found then raise exception 'Sınıf bulunamadı.' using errcode = 'P0001'; end if;
 plan := public.dm_plan(p_teacher, 'teacher');
 days := case when plan = 'free' then 7 when p_days = 30 then 30 else 7 end;
 t_start := t_end - make_interval(days => days);
 p_start := t_start - make_interval(days => days);

 with st as (
  select s.id, s.username, s.full_name, s.xp, s.streak, s.last_login_at
  from public.students s
  where s.teacher_id = p_teacher and s.status = 'approved' and s.frozen_at is null
    and s.class_no = c.class_no and lower(btrim(coalesce(s.branch, ''))) = lower(btrim(c.branch))
 ), g as (
  select x.student_id, x.game_key, x.correct_count, x.wrong_count, x.duration_seconds, x.created_at >= t_start as cur
  from public.game_scores x join st on st.id = x.student_id
  where x.created_at >= p_start and x.created_at < t_end
 ), gs as (
  select student_id, count(*) games, coalesce(sum(correct_count), 0) ok, coalesce(sum(wrong_count), 0) bad,
         coalesce(sum(least(greatest(duration_seconds, 0), 1800)), 0) secs
  from g where cur group by student_id
 ), lv as (
  select l.student_id, count(*) n from public.level_completions l join st on st.id = l.student_id
  where l.completed_at >= t_start and l.completed_at < t_end group by l.student_id
 ), zk as (
  select st.id student_id, w.v->>'en' en, w.v->>'tr' tr, case when w.v->>'yanlis' ~ '^[0-9]{1,6}$' then (w.v->>'yanlis')::int else 1 end wrong
  from st join public.extra_data e on e.student_id = st.id and e.key_name = 'yo' and jsonb_typeof(e.value->'zk') = 'object'
  cross join lateral jsonb_each(e.value->'zk') w(k, v)
  where (case when w.v->>'kutu' ~ '^[0-9]{1,3}$' then (w.v->>'kutu')::int else 0 end) < 5 and jsonb_typeof(w.v) = 'object' and coalesce(w.v->>'en', '') <> ''
 ), period as (
  select cur, count(*) games, count(distinct student_id) active, coalesce(sum(correct_count), 0) ok, coalesce(sum(wrong_count), 0) bad,
         coalesce(sum(least(greatest(duration_seconds, 0), 1800)), 0) secs
  from g group by cur
 )
 select jsonb_build_object(
  'class', jsonb_build_object('id', c.id, 'classNo', c.class_no, 'branch', c.branch, 'name', c.name),
  'plan', plan, 'days', days, 'from', t_start, 'to', t_end,
  'studentCount', (select count(*) from st),
  'summary', (select jsonb_build_object(
     'active', coalesce(max(active) filter (where cur), 0), 'games', coalesce(max(games) filter (where cur), 0),
     'minutes', round(coalesce(max(secs) filter (where cur), 0) / 60.0),
     'accuracy', case when coalesce(max(ok + bad) filter (where cur), 0) > 0 then round(100.0 * max(ok) filter (where cur) / max(ok + bad) filter (where cur)) end,
     'prevActive', coalesce(max(active) filter (where not cur), 0), 'prevGames', coalesce(max(games) filter (where not cur), 0),
     'prevMinutes', round(coalesce(max(secs) filter (where not cur), 0) / 60.0),
     'prevAccuracy', case when coalesce(max(ok + bad) filter (where not cur), 0) > 0 then round(100.0 * max(ok) filter (where not cur) / max(ok + bad) filter (where not cur)) end,
     'levels', (select coalesce(sum(n), 0) from lv)) from period),
  'topGames', coalesce((select jsonb_agg(jsonb_build_object('game', game_key, 'count', n) order by n desc) from
     (select game_key, count(*) n from g where cur group by game_key order by n desc limit 5) q), '[]'::jsonb),
  'weakWords', coalesce((select jsonb_agg(jsonb_build_object('en', en, 'tr', tr, 'students', n, 'wrong', w) order by n desc, w desc) from
     (select min(en) en, min(tr) tr, count(distinct student_id) n, sum(wrong) w from zk group by lower(en) order by n desc, w desc limit 10) q), '[]'::jsonb),
  'students', coalesce((select jsonb_agg(jsonb_build_object(
     'id', st.id, 'username', st.username, 'fullName', st.full_name, 'xp', round(coalesce(st.xp, 0)), 'streak', coalesce(st.streak, 0),
     'lastLogin', st.last_login_at, 'games', coalesce(gs.games, 0), 'minutes', round(coalesce(gs.secs, 0) / 60.0),
     'accuracy', case when coalesce(gs.ok + gs.bad, 0) > 0 then round(100.0 * gs.ok / (gs.ok + gs.bad)) end,
     'levels', coalesce(lv.n, 0),
     'weak', coalesce((select jsonb_agg(z.en order by z.wrong desc) from (select en, wrong from zk where zk.student_id = st.id order by wrong desc limit 3) z), '[]'::jsonb))
     order by coalesce(gs.games, 0) desc, st.username)
   from st left join gs on gs.student_id = st.id left join lv on lv.student_id = st.id), '[]'::jsonb)
 ) into res;
 return res;
end $$;

revoke all on function public.dm_class_report(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.dm_class_report(uuid, uuid, integer) to service_role;
