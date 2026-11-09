-- Extend existing class report without changing its authorization model or inventing past answers.
-- Original, game-focused implementation is retained under dm_class_report_games.
alter function public.dm_class_report(uuid,uuid,integer) rename to dm_class_report_games;

create function public.dm_class_report(p_teacher uuid, p_class uuid, p_days integer default 7)
returns jsonb language plpgsql stable set search_path to '' as $report$
declare
  baseline jsonb;
  output_students jsonb;
  metrics jsonb;
  topics jsonb;
  start_at timestamptz;
  end_at timestamptz;
  prev_at timestamptz;
begin
  -- The existing function verifies class ownership, validates plan limits and limits membership.
  baseline := public.dm_class_report_games(p_teacher,p_class,p_days);
  start_at := (baseline->>'from')::timestamptz;
  end_at := (baseline->>'to')::timestamptz;
  prev_at := start_at - make_interval(days => (baseline->>'days')::integer);

  with members as (
    select (value->>'id')::uuid student_id, value old, ord
    from jsonb_array_elements(baseline->'students') with ordinality t(value,ord)
  ), events as (
    select g.student_id, 'games'::text source, g.created_at at_time,
      greatest(coalesce(g.correct_count,0),0)::bigint correct,
      greatest(coalesce(g.wrong_count,0),0)::bigint wrong,
      1::bigint attempts, 0::bigint completed
    from public.game_scores g join members m using(student_id)
    where g.created_at >= prev_at and g.created_at < end_at
    union all
    select l.student_id,'study',l.created_at,
      least(greatest(coalesce(l.first_correct,0),0),greatest(coalesce(l.question_count,0),0))::bigint,
      (greatest(coalesce(l.question_count,0),0)-least(greatest(coalesce(l.first_correct,0),0),greatest(coalesce(l.question_count,0),0)))::bigint,
      1::bigint,0::bigint
    from public.dm_lesson_fair_runs l join members m using(student_id)
    where l.created_at >= prev_at and l.created_at < end_at
    union all
    select l.student_id,'studyCompletion',l.completed_at,
      0::bigint,0::bigint,0::bigint,1::bigint
    from public.lesson_progress l join members m using(student_id)
    where l.completed_at >= prev_at and l.completed_at < end_at
    union all
    select p.student_id,'schoolPath',p.created_at,
      case when p.correct then 1 else 0 end::bigint,
      case when p.correct then 0 else 1 end::bigint,0::bigint,0::bigint
    from public.dm_parkur_question_ledger p join members m using(student_id)
    where p.answered is true and p.created_at >= prev_at and p.created_at < end_at
    union all
    select enroll.student_id,'learningPath',a.created_at,
      case when a.first_correct then 1 else 0 end::bigint,
      case when a.first_correct then 0 else 1 end::bigint,0::bigint,0::bigint
    from public.dm_thematic_first_answers a
    join public.dm_thematic_enrollment enroll using(actor_key)
    join members m on m.student_id = enroll.student_id
    where a.created_at >= prev_at and a.created_at < end_at
  ), by_student as (
    select e.student_id,
      coalesce(sum(correct) filter(where source='games' and at_time >= start_at),0) game_ok,
      coalesce(sum(wrong) filter(where source='games' and at_time >= start_at),0) game_bad,
      coalesce(sum(correct) filter(where source='study' and at_time >= start_at),0) study_ok,
      coalesce(sum(wrong) filter(where source='study' and at_time >= start_at),0) study_bad,
      coalesce(sum(attempts) filter(where source='study' and at_time >= start_at),0) study_runs,
      coalesce(sum(completed) filter(where source='studyCompletion' and at_time >= start_at),0) study_done,
      coalesce(sum(correct) filter(where source='schoolPath' and at_time >= start_at),0) school_ok,
      coalesce(sum(wrong) filter(where source='schoolPath' and at_time >= start_at),0) school_bad,
      coalesce(sum(correct) filter(where source='learningPath' and at_time >= start_at),0) learning_ok,
      coalesce(sum(wrong) filter(where source='learningPath' and at_time >= start_at),0) learning_bad
    from events e group by student_id
  ), rebuilt as (
    select m.ord, m.old || jsonb_build_object(
      'gameCorrect',coalesce(b.game_ok,0),'gameWrong',coalesce(b.game_bad,0),
      'study',jsonb_build_object('correct',coalesce(b.study_ok,0),'wrong',coalesce(b.study_bad,0),'runs',coalesce(b.study_runs,0),'completed',coalesce(b.study_done,0)),
      'schoolPath',jsonb_build_object('correct',coalesce(b.school_ok,0),'wrong',coalesce(b.school_bad,0)),
      'learningPath',jsonb_build_object('correct',coalesce(b.learning_ok,0),'wrong',coalesce(b.learning_bad,0)),
      'totalCorrect',coalesce(b.game_ok,0)+coalesce(b.study_ok,0)+coalesce(b.school_ok,0)+coalesce(b.learning_ok,0),
      'totalWrong',coalesce(b.game_bad,0)+coalesce(b.study_bad,0)+coalesce(b.school_bad,0)+coalesce(b.learning_bad,0),
      'accuracy', case when coalesce(b.game_ok,0)+coalesce(b.game_bad,0)+coalesce(b.study_ok,0)+coalesce(b.study_bad,0)+coalesce(b.school_ok,0)+coalesce(b.school_bad,0)+coalesce(b.learning_ok,0)+coalesce(b.learning_bad,0)>0 then round(100.0*(coalesce(b.game_ok,0)+coalesce(b.study_ok,0)+coalesce(b.school_ok,0)+coalesce(b.learning_ok,0))/(coalesce(b.game_ok,0)+coalesce(b.game_bad,0)+coalesce(b.study_ok,0)+coalesce(b.study_bad,0)+coalesce(b.school_ok,0)+coalesce(b.school_bad,0)+coalesce(b.learning_ok,0)+coalesce(b.learning_bad,0))) end
    ) val from members m left join by_student b using(student_id)
  )
  select coalesce(jsonb_agg(val order by ord),'[]'::jsonb) into output_students from rebuilt;

  with members as (
    select (value->>'id')::uuid student_id from jsonb_array_elements(baseline->'students') t(value)
  ), events as (
    select g.student_id,'games'::text source,g.created_at at_time,greatest(coalesce(g.correct_count,0),0)::bigint correct,greatest(coalesce(g.wrong_count,0),0)::bigint wrong,0::bigint completed
    from public.game_scores g join members m using(student_id) where g.created_at >= prev_at and g.created_at < end_at
    union all
    select l.student_id,'study',l.created_at,least(greatest(coalesce(l.first_correct,0),0),greatest(coalesce(l.question_count,0),0))::bigint,(greatest(coalesce(l.question_count,0),0)-least(greatest(coalesce(l.first_correct,0),0),greatest(coalesce(l.question_count,0),0)))::bigint,0::bigint
    from public.dm_lesson_fair_runs l join members m using(student_id) where l.created_at >= prev_at and l.created_at < end_at
    union all
    select l.student_id,'studyCompletion',l.completed_at,0::bigint,0::bigint,1::bigint
    from public.lesson_progress l join members m using(student_id) where l.completed_at >= prev_at and l.completed_at < end_at
    union all
    select p.student_id,'schoolPath',p.created_at,(case when p.correct then 1 else 0 end)::bigint,(case when p.correct then 0 else 1 end)::bigint,0::bigint
    from public.dm_parkur_question_ledger p join members m using(student_id)
    where p.answered is true and p.created_at >= prev_at and p.created_at < end_at
    union all
    select enroll.student_id,'learningPath',a.created_at,(case when a.first_correct then 1 else 0 end)::bigint,(case when a.first_correct then 0 else 1 end)::bigint,0::bigint
    from public.dm_thematic_first_answers a join public.dm_thematic_enrollment enroll using(actor_key) join members m on m.student_id=enroll.student_id
    where a.created_at >= prev_at and a.created_at < end_at
  )
  select jsonb_build_object(
    'active',count(distinct student_id) filter(where at_time >= start_at),
    'prevActive',count(distinct student_id) filter(where at_time < start_at),
    'totalCorrect',coalesce(sum(correct) filter(where at_time >= start_at),0),
    'totalWrong',coalesce(sum(wrong) filter(where at_time >= start_at),0),
    'accuracy',case when coalesce(sum(correct+wrong) filter(where at_time >= start_at),0)>0 then round(100.0*sum(correct) filter(where at_time >= start_at)/sum(correct+wrong) filter(where at_time >= start_at)) end,
    'prevAccuracy',case when coalesce(sum(correct+wrong) filter(where at_time < start_at),0)>0 then round(100.0*sum(correct) filter(where at_time < start_at)/sum(correct+wrong) filter(where at_time < start_at)) end,
    'studyCorrect',coalesce(sum(correct) filter(where source='study' and at_time >= start_at),0),
    'studyWrong',coalesce(sum(wrong) filter(where source='study' and at_time >= start_at),0),
    'studyRuns',count(*) filter(where source='study' and at_time >= start_at),
    'studyCompleted',coalesce(sum(completed) filter(where at_time >= start_at),0),
    'schoolCorrect',coalesce(sum(correct) filter(where source='schoolPath' and at_time >= start_at),0),
    'schoolWrong',coalesce(sum(wrong) filter(where source='schoolPath' and at_time >= start_at),0),
    'learningCorrect',coalesce(sum(correct) filter(where source='learningPath' and at_time >= start_at),0),
    'learningWrong',coalesce(sum(wrong) filter(where source='learningPath' and at_time >= start_at),0),
    'gameCorrect',coalesce(sum(correct) filter(where source='games' and at_time >= start_at),0),
    'gameWrong',coalesce(sum(wrong) filter(where source='games' and at_time >= start_at),0)
  ) into metrics from events;

  with members as (select (value->>'id')::uuid student_id from jsonb_array_elements(baseline->'students') t(value)),
  grouped as (
    select l.level, l.category, l.topic_name, count(distinct l.student_id) students,
      sum(greatest(l.question_count-l.first_correct,0)) wrong,
      sum(greatest(l.question_count,0)) total
    from public.dm_lesson_fair_runs l join members m using(student_id)
    where l.created_at >= start_at and l.created_at < end_at
    group by l.level,l.category,l.topic_name
    having sum(greatest(l.question_count-l.first_correct,0))>0
    order by wrong desc,students desc limit 8
  ) select coalesce(jsonb_agg(jsonb_build_object('level',level,'category',category,'topic',topic_name,'students',students,'wrong',wrong,'total',total) order by wrong desc),'[]'::jsonb)
    into topics from grouped;

  return baseline || jsonb_build_object(
    'students',output_students,
    'summary',(baseline->'summary') || metrics,
    'weakTopics',topics,
    'sources',jsonb_build_array('games','study','schoolPath','learningPath'),
    'dataNote','Doğruluk kaydedilmiş ilk cevaplardan hesaplanır. Çalışma süresi yalnız oyunların kayıtlı süresidir; geçmişte kaydedilmemiş cevaplar dahil değildir.'
  );
end $report$;

revoke all on function public.dm_class_report_games(uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.dm_class_report(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.dm_class_report_games(uuid,uuid,integer) to service_role;
grant execute on function public.dm_class_report(uuid,uuid,integer) to service_role;