begin;

create table public.dm_blocks_progress (
  student_id uuid primary key references public.students(id) on delete cascade,
  free_used integer not null default 0 check (free_used between 0 and 3),
  word_offset integer not null default 0,
  completed boolean not null default false,
  level_no integer not null default 1
);
create table public.dm_blocks_runs (
  student_id uuid not null references public.students(id) on delete cascade,
  run_id uuid not null,
  level_no integer not null,
  rounds jsonb not null,
  has_more boolean not null,
  started_at timestamptz not null default clock_timestamp(),
  result jsonb,
  primary key (student_id, run_id)
);
alter table public.dm_blocks_progress enable row level security;
alter table public.dm_blocks_runs enable row level security;
revoke all on public.dm_blocks_progress, public.dm_blocks_runs from public, anon, authenticated;
grant select, insert, update on public.dm_blocks_progress, public.dm_blocks_runs to service_role;

create or replace function public.dm_blocks_status(actor uuid)
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; u public.dm_blocks_progress; prem boolean;
begin
  select * into st from public.students where id=actor and status='approved' and role='student';
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into u from public.dm_blocks_progress where student_id=actor;
  prem:=public.dm_pwm_is_premium(actor);
  return jsonb_build_object('ok',true,'premium',prem,'remaining',case when prem then 999 else 3-coalesce(u.free_used,0) end,
    'level',coalesce(u.level_no,1),'completed',coalesce(u.completed,false),'words',public.dm_cloud_level_size(coalesce(u.level_no,1)),'energy',public.dm_pwm_energy(st),'energyMax',st.energy_max);
end $$;

create or replace function public.dm_blocks_start(actor uuid, run_key uuid)
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; u public.dm_blocks_progress; r public.dm_blocks_runs;
  prem boolean; available int; ticks int; questions jsonb; more boolean; batch_size int;
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_blocks_runs where student_id=actor and run_id=run_key;
  if not found then
    insert into public.dm_blocks_progress(student_id) values(actor) on conflict do nothing;
    select * into u from public.dm_blocks_progress where student_id=actor;
    if u.completed then raise exception 'Geçersiz bölüm. Tüm uçuş rotası tamamlandı.'; end if;
    batch_size:=public.dm_cloud_level_size(u.level_no);
    prem:=public.dm_pwm_is_premium(actor);
    if not prem and u.free_used>=3 then raise exception 'Ücretsiz 3 oyun hakkın bitti.'; end if;
    available:=public.dm_pwm_energy(st);
    if available<5 then raise exception 'Oyuna başlamak için 5 enerji gerekli.'; end if;

    with bank as materialized (
      select distinct on (class_no, lower(trim(english)))
        class_no, unit_no, trim(english) as en, trim(turkish) as tr
      from public.word_bank
      where active and class_no between 1 and 8 and trim(english)<>'' and trim(turkish)<>''
      order by class_no, lower(trim(english)), unit_no, trim(turkish), trim(english)
    ), page as (
      select * from bank order by class_no, unit_no, lower(en) limit (batch_size+1) offset u.word_offset
    ), targets as (
      select * from page order by class_no,unit_no,lower(en) limit batch_size
    ), choices as (
      select t.*, array(
        select opt from (
          select t.tr as opt union all
          select d.tr from (
            select tr from (select min(tr) as tr, bool_or(class_no=t.class_no) as same_class
              from bank where lower(tr)<>lower(t.tr) group by lower(tr)) pool
            order by same_class desc, random() limit 2
          ) d
        ) options order by random()
      ) as opts from targets t
    )
    select jsonb_agg(jsonb_build_object('en',en,'options',opts,'answer',array_position(opts,tr)-1)
      order by class_no,unit_no,lower(en)), (select count(*)>batch_size from page) into questions,more
      from choices where cardinality(opts)=3;
    if questions is null then raise exception 'Geçersiz bölüm. Yeni kelime bulunamadı.'; end if;

    ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int;
    update public.students set energy=available-5,
      energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end
      where id=actor;
    insert into public.energy_transactions(student_id,change_amount,balance_after,reason)
      values(actor,-5,available-5,'premium-blok:'||run_key);
    if not prem then update public.dm_blocks_progress set free_used=free_used+1 where student_id=actor; end if;
    insert into public.dm_blocks_runs(student_id,run_id,level_no,rounds,has_more)
      values(actor,run_key,u.level_no,questions,more) returning * into r;
  end if;
  return public.dm_blocks_status(actor)||jsonb_build_object('runId',run_key,'playedLevel',r.level_no,'result',r.result,
    'rounds',r.rounds);
end $$;

create or replace function public.dm_blocks_finish(actor uuid, run_key uuid, selections integer[])
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; r public.dm_blocks_runs; v jsonb; outcome jsonb;
  total int; played int; crashed boolean:=false; correct int:=0; wrong int:=0;
  board int[]:=array_fill(0,array[10]); anchor int; bits int; tall boolean; bottom int; rows int:=0; score int; s int; x int; g int; ver bigint; mult numeric;
  day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_blocks_runs where student_id=actor and run_id=run_key;
  if not found then raise exception 'Oyun bulunamadı.'; end if;
  if r.result is not null then
    return public.dm_blocks_status(actor)||r.result||
      jsonb_build_object('yo',(select value from public.extra_data where student_id=actor and key_name='yo'));
  end if;
  total:=jsonb_array_length(r.rounds);
  played:=cardinality(selections);
  if selections is null or played not between 1 and total or array_lower(selections,1)<>1
    or exists(select 1 from unnest(selections) as pick where pick is null or pick not between 0 and 5) then
    raise exception 'Oyun sonucu doğrulanamadı.';
  end if;
  for i in 1..played loop
    anchor:=selections[i]%3;
    tall:=r.level_no>=4 and i%3=0;
    if selections[i]>=3 and not tall then raise exception 'Geçersiz blok.'; end if;
    bits:=1<<anchor;
    if selections[i]>=3 then
      bits:=bits | (1<<(case when anchor=2 then 1 else anchor+1 end));
      tall:=false;
    end if;
    if anchor=(r.rounds->(i-1)->>'answer')::int then correct:=correct+1; else wrong:=wrong+1; end if;
    bottom:=9;
    while bottom>1 and (board[bottom-1]&bits)=0 loop bottom:=bottom-1; end loop;
    if bottom+(case when tall then 1 else 0 end)>8 then
      crashed:=true;
    else
      board[bottom]:=board[bottom]|bits;
      if tall then board[bottom+1]:=board[bottom+1]|bits; end if;
      for row_no in reverse 8..1 loop
        if board[row_no]=7 then
          board:=coalesce(board[1:row_no-1],'{}'::int[])||board[row_no+1:10]||0;
          rows:=rows+1;
        end if;
      end loop;
    end if;
    crashed:=crashed or wrong>=5;
    if crashed and i<>played then raise exception 'Oyun sonucu doğrulanamadı.'; end if;
  end loop;
  if not crashed and played<>total then raise exception 'Oyun sonucu doğrulanamadı.'; end if;
  score:=correct*20-wrong*10;
  s:=case when crashed then 0 when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 when correct>0 then 1 else 0 end;
  mult:=(array[0.5,0.75,1.0])[s];
  if r.level_no < (select level_no from public.dm_blocks_progress where student_id=actor) then mult:=mult*0.5; end if;
  x:=coalesce(round(172*mult),10);
  g:=coalesce(round(35*mult),2);
  if not crashed then
    update public.dm_blocks_progress
      set level_no=level_no+case when r.has_more then 1 else 0 end,
          word_offset=word_offset+total, completed=not r.has_more
      where student_id=actor and level_no=r.level_no and not completed;
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
    insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values(actor,run_key::text,'premiumblok',0,'{}',x,g);
  elsif v is null then x:=0; g:=0;
  end if;

  outcome:=jsonb_build_object('playedLevel',r.level_no,'correct',correct,'wrong',wrong,
    'total',total,'played',played,'rows',rows,'crashed',crashed,'hasMore',r.has_more and not crashed,'score',score,'stars',s,'xp',x,'gold',g);
  update public.dm_blocks_runs set result=outcome where student_id=actor and run_id=run_key;
  return public.dm_blocks_status(actor)||outcome||jsonb_build_object('yo',v);
end $$;

revoke all on function public.dm_blocks_status(uuid), public.dm_blocks_start(uuid,uuid),
  public.dm_blocks_finish(uuid,uuid,integer[]) from public, anon, authenticated;
grant execute on function public.dm_blocks_status(uuid), public.dm_blocks_start(uuid,uuid),
  public.dm_blocks_finish(uuid,uuid,integer[]) to service_role;
commit;
