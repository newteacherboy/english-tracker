-- Ultra Performance Engineering: Targeted partial/composite indexes + set-based dm_progress_league
-- Rollback safety: all indexes use IF NOT EXISTS; original dm_progress_league can be restored from git history.

-- 1. Partial & covering indexes for league, XP, duel leaderboard, and hot social foreign keys
CREATE INDEX IF NOT EXISTS idx_extra_data_yo_student
  ON public.extra_data (student_id)
  WHERE key_name = 'yo';

CREATE INDEX IF NOT EXISTS idx_dm_game_reward_runs_created_xp
  ON public.dm_game_reward_runs (created_at, student_id)
  INCLUDE (xp)
  WHERE xp > 0;

CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_success
  ON public.lesson_progress (student_id, level, category, topic_name, completed_at)
  WHERE test_success = true;

CREATE INDEX IF NOT EXISTS idx_students_approved_student
  ON public.students (id)
  INCLUDE (username, class_no)
  WHERE status = 'approved' AND role = 'student';

CREATE INDEX IF NOT EXISTS idx_dm_live_duels_finished
  ON public.dm_live_duels (host_id, guest_id, outcome)
  WHERE status = 'finished';

-- High-traffic unindexed foreign keys reported by Supabase Performance Advisor
CREATE INDEX IF NOT EXISTS idx_duels_receiver_student
  ON public.duels (receiver_student_id);

CREATE INDEX IF NOT EXISTS idx_duels_sender_student
  ON public.duels (sender_student_id);

CREATE INDEX IF NOT EXISTS idx_follow_edges_following_student
  ON public.follow_edges (following_student_id);

CREATE INDEX IF NOT EXISTS idx_notifications_sender_student
  ON public.notifications (sender_student_id);

CREATE INDEX IF NOT EXISTS idx_feed_reactions_student
  ON public.feed_reactions (student_id);

CREATE INDEX IF NOT EXISTS idx_feed_events_target_student
  ON public.feed_events (target_student_id);

-- 2. Set-based dm_progress_league: eliminates per-student N+1 calls to dm_competitive_xp & dm_plan
CREATE OR REPLACE FUNCTION public.dm_progress_league(
  week date DEFAULT (date_trunc('week'::text, (now() AT TIME ZONE 'Europe/Istanbul'::text)))::date
)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with bounds as (
    select
      week::timestamp at time zone 'Europe/Istanbul' as a,
      (week + 7)::timestamp at time zone 'Europe/Istanbul' as b
  ),
  eligible as materialized (
    select
      s.id,
      s.username,
      s.class_no,
      public.dm_student_level(coalesce((e.value->>'totalXp')::numeric, 0)) as level
    from public.students s
    left join public.extra_data e
      on e.student_id = s.id and e.key_name = 'yo'
    where s.status = 'approved'
      and s.role = 'student'
      and s.id <> 'dcde2026-1015-4000-8000-000000000001'::uuid
  ),
  qualified as materialized (
    select * from eligible where level >= 5
  ),
  run_ev as (
    select
      r.student_id,
      (r.created_at at time zone 'Europe/Istanbul')::date as d,
      r.xp::numeric as p
    from public.dm_game_reward_runs r
    cross join bounds
    join qualified q on q.id = r.student_id
    where week >= date '2026-11-23'
      and r.xp > 0
      and r.created_at >= bounds.a
      and r.created_at < bounds.b
  ),
  lp_ev as (
    select
      p.student_id,
      (p.first_at at time zone 'Europe/Istanbul')::date as d,
      80::numeric as p
    from (
      select
        lp.student_id,
        min(lp.completed_at) as first_at
      from public.lesson_progress lp
      join qualified q on q.id = lp.student_id
      where week >= date '2026-11-23'
        and lp.test_success
      group by lp.student_id, lp.level, lp.category, lp.topic_name
    ) p
    cross join bounds
    where p.first_at >= bounds.a
      and p.first_at < bounds.b
  ),
  daily_xp as (
    select student_id, d, sum(p) as day_points
    from (
      select * from run_ev
      union all
      select * from lp_ev
    ) u
    group by student_id, d
  ),
  weekly_xp as (
    select student_id, coalesce(sum(least(3500::numeric, day_points)), 0::numeric) as xp
    from daily_xp
    group by student_id
  ),
  base as materialized (
    select
      q.id,
      q.username,
      q.class_no,
      q.level,
      case
        when week < date '2026-11-23' then public.dm_competitive_xp(q.id, week)
        else coalesce(wx.xp, 0::numeric)
      end as xp
    from qualified q
    left join weekly_xp wx on wx.student_id = q.id
  ),
  active_ent as materialized (
    select account_id, account_role, product_key
    from public.dm_entitlements
    where state = 'active'
      and (valid_until is null or valid_until > now())
  ),
  guest_info as materialized (
    select
      g.student_id,
      a.teacher_id,
      (t.is_admin and t.username = 'teacher') as is_admin_teacher
    from public.teacher_portal_guests g
    join public.teacher_portal_access a
      on a.id = g.access_id and a.state = 'approved'
    join public.teachers t
      on t.id = a.teacher_id and t.active and t.frozen_at is null
    where g.alias = 'Premium Oyun'
      and g.preview
  ),
  student_plan as (
    select
      b.id,
      case
        when gi.is_admin_teacher then 'premium_pro'
        when gi.teacher_id is not null then
          case
            when exists (
              select 1 from active_ent ae
              where ae.account_id = gi.teacher_id
                and ae.account_role = 'teacher'
                and ae.product_key = 'teacher_premium_pro'
            ) then 'premium_pro'
            when exists (
              select 1 from active_ent ae
              where ae.account_id = gi.teacher_id
                and ae.account_role = 'teacher'
                and ae.product_key = 'teacher_pro'
            ) then 'pro'
            else 'free'
          end
        when exists (
          select 1 from active_ent ae
          where ae.account_id = b.id
            and ae.account_role = 'student'
            and ae.product_key = any (array[
              'diji_premium_pro','premium','premium_plus','premium_max',
              'diji_premium','diji_premium_plus','diji_premium_max'
            ])
        ) then 'premium_pro'
        when exists (
          select 1 from active_ent ae
          where ae.account_id = b.id
            and ae.account_role = 'student'
            and ae.product_key = 'diji_pro'
        ) then 'pro'
        else 'free'
      end as membership_tier
    from base b
    left join guest_info gi on gi.student_id = b.id
  ),
  tier as (
    select
      b.*,
      case
        when b.level >= 15 and b.xp >= 1800 then 'sampiyon'
        when b.level >= 10 and b.xp >= 750 then 'super'
        else 'yerel'
      end as league,
      sp.membership_tier
    from base b
    join student_plan sp on sp.id = b.id
  ),
  ranks as (
    select
      *,
      row_number() over (partition by league order by xp desc, username, id) as rank
    from tier
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'name', username,
    'class', class_no,
    'level', level,
    'xp', xp,
    'league', league,
    'rank', rank,
    'membership_tier', membership_tier
  ) order by xp desc, username, id), '[]')
  from ranks;
$function$;
