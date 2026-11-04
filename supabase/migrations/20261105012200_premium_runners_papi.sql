create table public.dm_runners_progress (
  student_id uuid primary key references public.students(id) on delete cascade,
  free_used integer not null default 0 check (free_used between 0 and 3),
  run_id uuid,
  gate bigint not null default 0,
  flock bigint not null default 0,
  best_flock bigint not null default 0,
  best_level bigint not null default 0,
  questions jsonb not null default '[]',
  feedback jsonb
);
alter table public.dm_runners_progress enable row level security;
revoke all on public.dm_runners_progress from public, anon, authenticated;
grant select, insert, update on public.dm_runners_progress to service_role;

create function public.dm_runners_words()
returns jsonb language sql set search_path='' as $$
  with words as (
    select distinct on (lower(trim(english))) trim(english) en, trim(turkish) tr
    from public.word_bank
    where active and class_no between 1 and 8
      and trim(english) ~ '^[A-Za-z][A-Za-z'' -]{1,23}$'
      and length(trim(turkish)) between 2 and 20 and trim(turkish) !~ '[,;/()]'
    order by lower(trim(english)), random()
  ), meanings as (
    select distinct on (lower(tr)) en,tr from words order by lower(tr), random()
  ), picks as (
    select en,tr from meanings order by random() limit 12
  )
  select jsonb_agg(jsonb_build_object('en',en,'tr',tr,'slot',floor(random()*6)::integer) order by random()) from picks;
$$;

create function public.dm_runners_play(
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
  bonus boolean;
  old_flock bigint;
  options jsonb;
  question jsonb;
begin
  select * into st from public.students where id=actor and status='approved' and role='student'
    for no key update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into p from public.dm_runners_progress where student_id=actor;
  prem:=public.dm_pwm_is_premium(actor);
  available:=public.dm_pwm_energy(st);

  if action='start' and coalesce(p.flock,0)=0 and p.run_id is distinct from run_key then
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
    insert into public.dm_runners_progress(student_id,free_used,run_id,flock,best_flock,best_level,questions)
      values(actor,case when prem then 0 else 1 end,run_key,1,1,1,words)
    on conflict(student_id) do update set
      free_used=dm_runners_progress.free_used+case when prem then 0 else 1 end,
      run_id=run_key,gate=0,flock=1,best_flock=greatest(1,dm_runners_progress.best_flock),
      best_level=greatest(1,dm_runners_progress.best_level),questions=words,feedback=null
    returning * into p;
  elsif action='answer' then
    if p.run_id is distinct from run_key or gate_no>p.gate then raise exception 'Oyun bulunamadı.'; end if;
    if p.flock>0 and gate_no=p.gate then
      idx:=(p.gate%12)::integer;
      count_choices:=case when p.gate<10 then 2 else 3 end;
      correct_slot:=((p.questions->idx->>'slot')::integer)%count_choices;
      if choice not between -1 and count_choices-1 then raise exception 'Geçersiz kapı.'; end if;
      bonus:=p.gate%5=4 and p.flock<=50;
      old_flock:=p.flock;
      p.flock:=case when choice=correct_slot then
          case when bonus then p.flock*2 else p.flock+5 end
        else greatest(0,p.flock-2) end;
      p.feedback:=jsonb_build_object('gate',p.gate,'correct',choice=correct_slot,
        'meaning',p.questions->idx->>'tr','change',p.flock-old_flock);
      p.gate:=p.gate+1;
      if p.flock>0 and p.gate%12=0 then
        words:=public.dm_runners_words();
        if coalesce(jsonb_array_length(words),0)<>12 then raise exception 'Geçersiz kelime havuzu.'; end if;
        p.questions:=words;
      end if;
      update public.dm_runners_progress set gate=p.gate,flock=p.flock,
        best_flock=greatest(best_flock,p.flock),
        best_level=greatest(best_level,case when p.flock>0 then p.gate/5+1 else (p.gate-1)/5+1 end),
        questions=p.questions,feedback=p.feedback
      where student_id=actor returning * into p;
    end if;
  end if;

  if p.flock>0 then
    idx:=(p.gate%12)::integer;
    count_choices:=case when p.gate<10 then 2 else 3 end;
    correct_slot:=((p.questions->idx->>'slot')::integer)%count_choices;
    select jsonb_agg(p.questions->((idx+(slot-correct_slot+count_choices)%count_choices)%12)->>'tr' order by slot)
      into options from generate_series(0,count_choices-1) as slot;
    question:=jsonb_build_object('word',p.questions->idx->>'en','options',options,
      'bonus',p.gate%5=4 and p.flock<=50);
  end if;
  return jsonb_build_object('ok',true,'premium',prem,'remaining',case when prem then 999 else 3-coalesce(p.free_used,0) end,
    'energy',available,'energyMax',st.energy_max,'runId',p.run_id,'gate',coalesce(p.gate,0),
    'level',case when p.flock=0 and p.gate>0 then (p.gate-1)/5+1 else coalesce(p.gate,0)/5+1 end,
    'flock',coalesce(p.flock,0),'best',coalesce(p.best_flock,0),'bestLevel',coalesce(p.best_level,0),
    'question',question,'feedback',p.feedback);
end $$;

revoke all on function public.dm_runners_words(), public.dm_runners_play(uuid,text,uuid,bigint,integer)
  from public, anon, authenticated;
grant execute on function public.dm_runners_words(), public.dm_runners_play(uuid,text,uuid,bigint,integer)
  to service_role;
