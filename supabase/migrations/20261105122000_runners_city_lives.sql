alter table public.dm_runners_progress
  add column lives integer check (lives between 0 and 3),
  add column correct_count bigint not null default 0,
  add column best_correct bigint not null default 0;

create or replace function public.dm_runners_play(
  actor uuid, action text, run_key uuid, gate_no bigint, choice integer
) returns jsonb language plpgsql set search_path='' as $$
declare
  st public.students;
  p public.dm_runners_progress;
  prem boolean;
  available integer;
  ticks integer;
  words jsonb;
  idx integer;
  count_choices integer;
  correct_slot integer;
  lives_left integer;
  correct_answer boolean;
  options jsonb;
  question jsonb;
begin
  select * into st from public.students where id=actor and status='approved' and role='student'
    for no key update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into p from public.dm_runners_progress where student_id=actor;
  prem:=public.dm_pwm_is_premium(actor);
  available:=public.dm_pwm_energy(st);
  -- Legacy runs keep their question and level and enter the new mode with three lives.
  lives_left:=coalesce(p.lives,case when p.flock>0 then 3 else 0 end);

  if action='start' and lives_left=0 and p.run_id is distinct from run_key then
    if not prem and coalesce(p.free_used,0)>=3 then raise exception 'Ücretsiz 3 oyun hakkın bitti.'; end if;
    if available<5 then raise exception 'Oyuna başlamak için 5 enerji gerekli.'; end if;
    words:=public.dm_runners_words();
    if coalesce(jsonb_array_length(words),0)<>12 then raise exception 'Geçersiz kelime havuzu.'; end if;
    ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int;
    available:=available-5;
    update public.students set energy=available,
      energy_updated_at=case when available+5>=st.energy_max then now()
        else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
    insert into public.energy_transactions(student_id,change_amount,balance_after,reason)
      values(actor,-5,available,'premium-runners:'||run_key);
    insert into public.dm_runners_progress(student_id,free_used,run_id,lives,best_level,questions)
      values(actor,case when prem then 0 else 1 end,run_key,3,1,words)
    on conflict(student_id) do update set
      free_used=dm_runners_progress.free_used+case when prem then 0 else 1 end,
      run_id=run_key,gate=0,lives=3,correct_count=0,
      best_level=greatest(1,dm_runners_progress.best_level),questions=words,feedback=null
    returning * into p;
    lives_left:=p.lives;
  elsif action='answer' then
    if p.run_id is distinct from run_key or gate_no>p.gate then raise exception 'Oyun bulunamadı.'; end if;
    if lives_left>0 and gate_no=p.gate then
      idx:=(p.gate%12)::integer;
      count_choices:=case when p.gate<10 then 2 else 3 end;
      correct_slot:=((p.questions->idx->>'slot')::integer)%count_choices;
      if choice not between -1 and count_choices-1 then raise exception 'Geçersiz kapı.'; end if;
      correct_answer:=choice=correct_slot;
      if correct_answer then
        p.correct_count:=p.correct_count+1;
      else
        lives_left:=lives_left-1;
      end if;
      p.feedback:=jsonb_build_object('gate',p.gate,'correct',correct_answer,
        'meaning',p.questions->idx->>'tr','change',case when correct_answer then 1 else -1 end);
      p.gate:=p.gate+1;
      if lives_left>0 and p.gate%12=0 then
        words:=public.dm_runners_words();
        if coalesce(jsonb_array_length(words),0)<>12 then raise exception 'Geçersiz kelime havuzu.'; end if;
        p.questions:=words;
      end if;
      update public.dm_runners_progress set gate=p.gate,lives=lives_left,correct_count=p.correct_count,
        best_correct=greatest(best_correct,p.correct_count),
        best_level=greatest(best_level,case when lives_left>0 then p.gate/5+1 else (p.gate-1)/5+1 end),
        questions=p.questions,feedback=p.feedback
      where student_id=actor returning * into p;
    end if;
  end if;

  if lives_left>0 then
    idx:=(p.gate%12)::integer;
    count_choices:=case when p.gate<10 then 2 else 3 end;
    correct_slot:=((p.questions->idx->>'slot')::integer)%count_choices;
    select jsonb_agg(p.questions->((idx+(slot-correct_slot+count_choices)%count_choices)%12)->>'tr' order by slot)
      into options from generate_series(0,count_choices-1) as slot;
    question:=jsonb_build_object('word',p.questions->idx->>'en','options',options);
  end if;
  return jsonb_build_object('ok',true,'premium',prem,'remaining',case when prem then 999 else 3-coalesce(p.free_used,0) end,
    'energy',available,'energyMax',st.energy_max,'runId',p.run_id,'gate',coalesce(p.gate,0),
    'level',case when lives_left=0 and p.gate>0 then (p.gate-1)/5+1 else coalesce(p.gate,0)/5+1 end,
    'lives',lives_left,'correctCount',coalesce(p.correct_count,0),'bestCorrect',coalesce(p.best_correct,0),
    'flock',lives_left,'best',coalesce(p.best_correct,0),'bestLevel',coalesce(p.best_level,0),
    'question',question,'feedback',p.feedback);
end $$;

