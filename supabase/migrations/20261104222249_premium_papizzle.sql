create table public.dm_papizzle_progress (
  student_id uuid primary key references public.students(id) on delete cascade,
  free_used integer not null default 0 check (free_used between 0 and 3),
  level_no integer not null default 1
);
create table public.dm_papizzle_runs (
  student_id uuid not null references public.students(id) on delete cascade,
  run_id uuid not null,
  level_no integer not null,
  tiles jsonb not null,
  target_order integer[] not null,
  started_at timestamptz not null default clock_timestamp(),
  result jsonb,
  primary key (student_id, run_id)
);
alter table public.dm_papizzle_progress enable row level security;
alter table public.dm_papizzle_runs enable row level security;
revoke all on public.dm_papizzle_progress, public.dm_papizzle_runs from public, anon, authenticated;
grant select, insert, update on public.dm_papizzle_progress, public.dm_papizzle_runs to service_role;

create function public.dm_papizzle_status(actor uuid)
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; p public.dm_papizzle_progress; prem boolean;
begin
  select * into st from public.students where id=actor and status='approved' and role='student';
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into p from public.dm_papizzle_progress where student_id=actor;
  prem:=public.dm_pwm_is_premium(actor);
  return jsonb_build_object('ok',true,'premium',prem,
    'remaining',case when prem then 999 else 3-coalesce(p.free_used,0) end,
    'level',coalesce(p.level_no,1),'energy',public.dm_pwm_energy(st),'energyMax',st.energy_max);
end $$;

create function public.dm_papizzle_start(actor uuid, run_key uuid)
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; p public.dm_papizzle_progress; r public.dm_papizzle_runs;
  prem boolean; available integer; ticks integer; board_size integer; tiles jsonb; targets integer[];
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_papizzle_runs where student_id=actor and run_id=run_key;
  if not found then
    insert into public.dm_papizzle_progress(student_id) values(actor) on conflict do nothing;
    select * into p from public.dm_papizzle_progress where student_id=actor;
    prem:=public.dm_pwm_is_premium(actor);
    if not prem and p.free_used>=3 then raise exception 'Ücretsiz 3 oyun hakkın bitti.'; end if;
    available:=public.dm_pwm_energy(st);
    if available<5 then raise exception 'Oyuna başlamak için 5 enerji gerekli.'; end if;
    board_size:=coalesce((array[6,9,12])[p.level_no],16);

    with bank as (
      select distinct on (lower(trim(english))) trim(english) as en, trim(turkish) as tr
      from public.word_bank
      where active and class_no between 1 and 8 and trim(english) ~ '^[A-Za-z][A-Za-z'' -]{1,23}$'
        and length(trim(turkish)) between 2 and 20 and trim(turkish) !~ '[,;/()]'
      order by lower(trim(english)), random()
    ), distinct_meanings as (
      select distinct on (lower(tr)) en,tr from bank order by lower(tr), random()
    ), board as (
      select en,tr,(row_number() over(order by random())-1)::integer as slot from distinct_meanings
      order by slot limit board_size
    )
    select jsonb_agg(jsonb_build_object('en',en,'tr',tr) order by slot),
      array_agg(slot order by random()) into tiles,targets from board;
    if coalesce(cardinality(targets),0)<>board_size then
      raise exception 'Geçersiz bölüm. Yeterli kelime bulunamadı.';
    end if;

    ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int;
    update public.students set energy=available-5,
      energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end
      where id=actor;
    insert into public.energy_transactions(student_id,change_amount,balance_after,reason)
      values(actor,-5,available-5,'premium-papizzle:'||run_key);
    if not prem then update public.dm_papizzle_progress set free_used=free_used+1 where student_id=actor; end if;
    insert into public.dm_papizzle_runs(student_id,run_id,level_no,tiles,target_order)
      values(actor,run_key,p.level_no,tiles,targets) returning * into r;
  end if;
  return public.dm_papizzle_status(actor)||jsonb_build_object(
    'runId',run_key,'playedLevel',r.level_no,'tiles',r.tiles,'order',r.target_order);
end $$;

create function public.dm_papizzle_finish(actor uuid, run_key uuid, selections integer[])
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; r public.dm_papizzle_runs; v jsonb; outcome jsonb;
  total integer; pick integer; correct integer:=0; wrong integer:=0; streak integer:=0; score integer:=0;
  matched integer[]:='{}'; x integer:=0; g integer:=0; ver bigint; mult numeric;
  day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_papizzle_runs where student_id=actor and run_id=run_key;
  if not found then raise exception 'Oyun bulunamadı.'; end if;
  if r.result is not null then
    return public.dm_papizzle_status(actor)||r.result||
      jsonb_build_object('yo',(select value from public.extra_data where student_id=actor and key_name='yo'));
  end if;
  total:=cardinality(r.target_order);
  if selections is null or cardinality(selections) not between total and 256
    or extract(epoch from clock_timestamp()-r.started_at)<total*0.25 then
    raise exception 'Oyun sonucu doğrulanamadı.';
  end if;
  foreach pick in array selections loop
    if pick is null or pick not between 0 and total-1 or pick=any(matched) or correct=total then
      raise exception 'Oyun sonucu doğrulanamadı.';
    end if;
    if pick=r.target_order[correct+1] then
      correct:=correct+1;
      streak:=streak+1;
      score:=score+20+case when streak%3=0 then 10 else 0 end;
      matched:=array_append(matched,pick);
    else
      wrong:=wrong+1;
      streak:=0;
      score:=score-5;
    end if;
  end loop;
  if correct<>total then raise exception 'Oyun sonucu doğrulanamadı.'; end if;

  update public.dm_papizzle_progress set level_no=level_no+1 where student_id=actor and level_no=r.level_no;
  if found then
    mult:=case when correct*100>=(correct+wrong)*90 then 1 when correct*100>=(correct+wrong)*70 then 0.75 else 0.5 end;
    x:=round(172*mult);
    g:=round(35*mult);
  end if;
  select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
  if v is not null and (x>0 or g>0) then
    ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
    v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
    v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
    v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
    v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));
    v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
    update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
    update public.students set gold=(v->>'altin')::numeric where id=actor;
    select value into v from public.extra_data where student_id=actor and key_name='yo';
    insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values(actor,run_key::text,'premiumpapizzle',0,'{}',x,g);
  elsif v is null then x:=0; g:=0;
  end if;

  outcome:=jsonb_build_object('playedLevel',r.level_no,'correct',correct,'wrong',wrong,'score',score,'xp',x,'gold',g);
  update public.dm_papizzle_runs set result=outcome where student_id=actor and run_id=run_key;
  return public.dm_papizzle_status(actor)||outcome||jsonb_build_object('yo',v);
end $$;

revoke all on function public.dm_papizzle_status(uuid), public.dm_papizzle_start(uuid,uuid),
  public.dm_papizzle_finish(uuid,uuid,integer[]) from public, anon, authenticated;
grant execute on function public.dm_papizzle_status(uuid), public.dm_papizzle_start(uuid,uuid),
  public.dm_papizzle_finish(uuid,uuid,integer[]) to service_role;
