-- Öğretmen paneli "Sınıflar" sekmesi (sınıf ligi). Tek çağrıda öğretmenin TÜM öğrencileri için ham ölçüleri verir;
-- sıralama, genel puan ve Free plan kırpması (yalnız ilk 2) edge function'da (teacher-classes, action 'league') yapılır.
-- Yalnız service_role çağırabilir; öğretmen kimliği edge function'da oturumdan gelir.
--   p_period: 'week' (bu lig haftası, Pazartesi), 'month' (son 4 hafta), 'all' (tüm zamanlar)
-- Ölçüler:
--   xp / prevXp : lig XP'si (dm_weekly_xp; öğretmen +/- puanları dahil değil). all: students.xp, prevXp = önceki 4 hafta.
--   ok / bad    : kayıtlı ilk cevaplar (oyunlar, Okul Yolum, Ders Çalış, Öğrenme Yolu)
--   minutes     : week/month: oyunların kayıtlı süresi; all: uygulamada aktif süre (dm_active_time)
--   levels      : tamamlanan durak/seviye + tamamlanan konu
--   hwDone/hwTotal : dönem içinde verilen ödevlerden tamamlananlar
create or replace function public.dm_teacher_league(p_teacher uuid, p_period text default 'week')
returns jsonb language plpgsql stable set search_path to '' as $$
declare
  wk date := (now() at time zone 'Europe/Istanbul')::date - (extract(isodow from (now() at time zone 'Europe/Istanbul'))::int - 1);
  t_start timestamptz; xp_from date; prev_from date; prev_to date; res jsonb;
begin
  if p_period = 'week' then
    t_start := (wk::timestamp at time zone 'Europe/Istanbul'); xp_from := wk; prev_from := wk - 7; prev_to := wk;
  elsif p_period = 'month' then
    t_start := ((wk - 21)::timestamp at time zone 'Europe/Istanbul'); xp_from := wk - 21; prev_from := wk - 49; prev_to := wk - 21;
  else
    t_start := '-infinity'; xp_from := null; prev_from := wk - 49; prev_to := wk - 21;
  end if;

  with cls as (
    select c.id, c.class_no, c.branch, c.name from public.dm_teacher_classes c
    where c.teacher_id = p_teacher and c.archived_at is null
  ), st as (
    select s.id, coalesce(nullif(btrim(s.full_name), ''), s.username) nm, s.class_no, s.branch, s.xp, s.streak, s.last_login_at,
      (select c.id from cls c where c.class_no = s.class_no and lower(btrim(c.branch)) = lower(btrim(coalesce(s.branch, ''))) limit 1) class_id
    from public.students s
    where s.teacher_id = p_teacher and s.status = 'approved' and s.frozen_at is null
  ), ans as (
    select g.student_id, greatest(coalesce(g.correct_count,0),0)::bigint ok, greatest(coalesce(g.wrong_count,0),0)::bigint bad
    from public.game_scores g join st on st.id = g.student_id where g.created_at >= t_start
    union all
    select p.student_id, (p.correct is true)::int, (p.correct is not true)::int
    from public.dm_parkur_question_ledger p join st on st.id = p.student_id where p.answered is true and p.created_at >= t_start
    union all
    select l.student_id, least(greatest(coalesce(l.first_correct,0),0),greatest(coalesce(l.question_count,0),0)),
      greatest(coalesce(l.question_count,0),0) - least(greatest(coalesce(l.first_correct,0),0),greatest(coalesce(l.question_count,0),0))
    from public.dm_lesson_fair_runs l join st on st.id = l.student_id where l.created_at >= t_start
    union all
    select e.student_id, (a.first_correct is true)::int, (a.first_correct is not true)::int
    from public.dm_thematic_first_answers a join public.dm_thematic_enrollment e using(actor_key) join st on st.id = e.student_id
    where a.created_at >= t_start
  ), a2 as (select student_id, sum(ok) ok, sum(bad) bad from ans group by student_id),
  gm as (
    select g.student_id, sum(least(greatest(coalesce(g.duration_seconds,0),0),1800)) secs
    from public.game_scores g join st on st.id = g.student_id where g.created_at >= t_start group by g.student_id
  ), lv as (
    select student_id, count(*) n from (
      select l.student_id from public.level_completions l join st on st.id = l.student_id where l.completed_at >= t_start
      union all
      select l.student_id from public.lesson_progress l join st on st.id = l.student_id where l.completed_at >= t_start
    ) q group by student_id
  ), wx as (
    select w.student_id,
      coalesce(sum(w.xp) filter (where xp_from is not null and w.week_start >= xp_from), 0) cur,
      coalesce(sum(w.xp) filter (where w.week_start >= prev_from and w.week_start < prev_to), 0) prev,
      coalesce(sum(w.xp) filter (where p_period = 'all' and w.week_start >= prev_to), 0) recent
    from public.dm_weekly_xp w join st on st.id = w.student_id where w.week_start >= prev_from group by w.student_id
  ), hw as (
    select st.id student_id, count(a.id) total, count(x.assignment_id) done
    from st join public.assignments a on a.teacher_id = p_teacher and a.class_no = st.class_no
      and lower(btrim(coalesce(a.branch,''))) = lower(btrim(coalesce(st.branch,''))) and a.created_at >= t_start
    left join public.assignment_status x on x.assignment_id = a.id and x.student_id = st.id and x.done_at is not null
    group by st.id
  )
  select jsonb_build_object(
    'plan', public.dm_plan(p_teacher, 'teacher'),
    'period', p_period,
    'weekStart', wk,
    'classes', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'classNo', class_no, 'branch', branch, 'name', name) order by class_no, branch) from cls), '[]'::jsonb),
    'students', coalesce((select jsonb_agg(jsonb_build_object(
      'id', st.id, 'name', st.nm, 'classNo', st.class_no, 'branch', st.branch, 'classId', st.class_id,
      'xp', round(case when p_period = 'all' then coalesce(st.xp,0) else coalesce(wx.cur,0) end),
      'growthNow', round(case when p_period = 'all' then coalesce(wx.recent,0) else coalesce(wx.cur,0) end),
      'growthPrev', round(coalesce(wx.prev,0)),
      'ok', coalesce(a2.ok,0), 'bad', coalesce(a2.bad,0),
      'minutes', round(case when p_period = 'all'
        then greatest(coalesce((select t.seconds from public.dm_active_time t where t.student_id = st.id),0), coalesce(gm.secs,0))
        else coalesce(gm.secs,0) end / 60.0),
      'levels', coalesce(lv.n,0), 'streak', coalesce(st.streak,0),
      'hwDone', coalesce(hw.done,0), 'hwTotal', coalesce(hw.total,0),
      'lastLogin', st.last_login_at))
      from st left join a2 on a2.student_id = st.id left join gm on gm.student_id = st.id left join lv on lv.student_id = st.id
      left join wx on wx.student_id = st.id left join hw on hw.student_id = st.id), '[]'::jsonb)
  ) into res;
  return res;
end $$;

revoke all on function public.dm_teacher_league(uuid, text) from public, anon, authenticated;
grant execute on function public.dm_teacher_league(uuid, text) to service_role;
