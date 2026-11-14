begin;
-- Independent Premium routes; existing solo results and wallets are retained.

create table public.dm_tower_progress (
  student_id uuid primary key references public.students(id) on delete cascade,
  free_used integer not null default 0 check (free_used between 0 and 3),
  level_no integer not null default 1 check (level_no between 1 and 160),
  completed boolean not null default false
);
create table public.dm_tower_runs (
  student_id uuid not null references public.students(id) on delete cascade,
  run_id uuid not null,
  level_no integer not null,
  rounds jsonb not null,
  has_more boolean not null,
  started_at timestamptz not null default clock_timestamp(),
  result jsonb,
  primary key (student_id, run_id)
);
alter table public.dm_tower_progress enable row level security;
alter table public.dm_tower_runs enable row level security;
revoke all on public.dm_tower_progress, public.dm_tower_runs from public, anon, authenticated;
grant select, insert, update on public.dm_tower_progress, public.dm_tower_runs to service_role;



create table public.dm_goal_progress (
  student_id uuid primary key references public.students(id) on delete cascade,
  free_used integer not null default 0 check (free_used between 0 and 3),
  level_no integer not null default 1 check (level_no between 1 and 160),
  completed boolean not null default false
);
create table public.dm_goal_runs (
  student_id uuid not null references public.students(id) on delete cascade,
  run_id uuid not null,
  level_no integer not null,
  rounds jsonb not null,
  has_more boolean not null,
  started_at timestamptz not null default clock_timestamp(),
  result jsonb,
  primary key (student_id, run_id)
);
alter table public.dm_goal_progress enable row level security;
alter table public.dm_goal_runs enable row level security;
revoke all on public.dm_goal_progress, public.dm_goal_runs from public, anon, authenticated;
grant select, insert, update on public.dm_goal_progress, public.dm_goal_runs to service_role;



create or replace function public.dm_game_access(actor uuid, game_key text)
returns jsonb language plpgsql stable set search_path='' as $$
declare p text; joined date; today date:=(now() at time zone 'Europe/Istanbul')::date;
 beginning timestamptz:=date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
 n int; lim int; expires date;
begin
 p:=public.dm_plan(actor,'student');
 select (coalesce(t.created_at,s.created_at) at time zone 'Europe/Istanbul')::date into joined
 from public.students s left join public.teacher_portal_guests g on g.student_id=s.id
 left join public.teacher_portal_access a on a.id=g.access_id
 left join public.teachers t on t.id=a.teacher_id where s.id=actor;
 if joined is null then raise exception 'Öğrenci oturumu gerekli.'; end if;
 expires:=greatest(joined,date '2026-11-14')+3;
 lim:=case when p='premium_pro' then 999 when p='pro' then 5 when public.dm_game_trial_active(joined,today) then 1 else 0 end;
 case game_key
 when 'word-match' then select count(*) into n from public.dm_premium_match_runs where student_id=actor and started_at>=beginning;
 when 'cloud-flight' then select count(*) into n from public.dm_cloud_runs where student_id=actor and started_at>=beginning;
 when 'word-blocks' then select count(*) into n from public.dm_blocks_runs where student_id=actor and started_at>=beginning;
 when 'papizzle' then select count(*) into n from public.dm_papizzle_runs where student_id=actor and started_at>=beginning;
 when 'rally' then select count(*) into n from public.dm_rally_runs where student_id=actor and created_at>=beginning;
 when 'tower' then select count(*) into n from public.dm_tower_runs where student_id=actor and started_at>=beginning;
 when 'word-goal' then select count(*) into n from public.dm_goal_runs where student_id=actor and started_at>=beginning;
 else raise exception 'Geçersiz oyun.';
 end case;
 return jsonb_build_object('plan',p,'premium',p='premium_pro','limit',lim,'period','day',
 'trialEnds',expires,'remaining',case when p='premium_pro' then 999 else greatest(0,lim-n) end);
end $$;
revoke all on function public.dm_game_access(uuid,text) from public,anon,authenticated;
grant execute on function public.dm_game_access(uuid,text) to service_role;


CREATE OR REPLACE FUNCTION public.dm_tower_status(actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; u public.dm_tower_progress; prem boolean;
begin
  select * into st from public.students where id=actor and status='approved' and role='student';
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into u from public.dm_tower_progress where student_id=actor;
  prem:=public.dm_pwm_is_premium(actor);
  return public.dm_game_access(actor,'tower')||jsonb_build_object('ok',true,'premium',prem,'remaining',case when prem then 999 else (public.dm_game_access(actor,'tower')->>'remaining')::int end,
    'activeRunId',(select run_id from public.dm_tower_runs where student_id=actor and result is null order by started_at desc limit 1),'level',coalesce(u.level_no,1),'completed',coalesce(u.completed,false),'words',12,'energy',public.dm_pwm_energy(st),'energyMax',st.energy_max);
end $function$
;


CREATE OR REPLACE FUNCTION public.dm_tower_start(actor uuid, run_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; u public.dm_tower_progress; r public.dm_tower_runs;
  prem boolean; available int; ticks int; questions jsonb; more boolean; batch_size int;
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_tower_runs where student_id=actor and run_id=run_key;
  if not found then
    insert into public.dm_tower_progress(student_id) values(actor) on conflict do nothing;
    select * into u from public.dm_tower_progress where student_id=actor;
    select * into r from public.dm_tower_runs where student_id=actor and result is null order by started_at desc limit 1;
    if found then return public.dm_tower_status(actor)||jsonb_build_object('runId',r.run_id,'playedLevel',r.level_no,'result',r.result,'rounds',r.rounds); end if;
    if u.completed and u.level_no>=160 then raise exception 'Geçersiz bölüm. Tüm oyun rotası tamamlandı.'; end if;
    batch_size:=12;
    prem:=public.dm_pwm_is_premium(actor);
    if not prem and (public.dm_game_access(actor,'tower')->>'remaining')::int<=0 then raise exception 'Ücretsiz oyun hakkın bitti. Daha fazla oynamak için Pro ol.'; end if;
    available:=public.dm_pwm_energy(st);
    if available<5 then raise exception 'Oyuna başlamak için 5 enerji gerekli.'; end if;

    with bank as materialized (
      select distinct on (class_no, lower(trim(english)))
        class_no, unit_no, trim(english) as en, trim(turkish) as tr
      from public.dm_premium_course_words(u.level_no)
      where true and trim(english)<>'' and trim(turkish)<>''
      order by class_no, lower(trim(english)), unit_no, trim(turkish), trim(english)
    ), page as (
      select * from bank order by class_no, unit_no, lower(en) limit (batch_size+1)
    ), targets as (
      select * from page order by class_no,unit_no,lower(en) limit batch_size
    ), choices as (
      select t.*, array(
        select opt from (
          select t.tr as opt union all
          select d.tr from (
            select tr from (select min(tr) as tr, bool_or(class_no=t.class_no) as same_class
              from bank where lower(tr)<>lower(t.tr) group by lower(tr)) pool
            order by same_class desc, random() limit 3
          ) d
        ) options order by random()
      ) as opts from targets t
    )
    select jsonb_agg(jsonb_build_object('en',en,'options',opts,'answer',array_position(opts,tr)-1)
      order by class_no,unit_no,lower(en)), (select count(*)>batch_size from page) into questions,more
      from choices where cardinality(opts)=4;
    more:=u.level_no<160;
    if questions is null or jsonb_array_length(questions)<4 then raise exception 'Geçersiz bölüm. Yeni kelime bulunamadı.'; end if;

    ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int;
    update public.students set energy=available-5,
      energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end
      where id=actor;
    insert into public.energy_transactions(student_id,change_amount,balance_after,reason)
      values(actor,-5,available-5,'premium-tower:'||run_key);
    if not prem then update public.dm_tower_progress set free_used=least(3,free_used+1) where student_id=actor; end if;
    insert into public.dm_tower_runs(student_id,run_id,level_no,rounds,has_more)
      values(actor,run_key,u.level_no,questions,more) returning * into r;
  end if;
  return public.dm_tower_status(actor)||jsonb_build_object('runId',run_key,'playedLevel',r.level_no,'result',r.result,
    'rounds',r.rounds);
end $function$
;



create function public.dm_tower_finish(actor uuid, run_key uuid, selections integer[])
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; r public.dm_tower_runs; v jsonb; outcome jsonb;
  total int; passed boolean; correct int; wrong int; score int; s int; x int; g int; ver bigint;
  day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_tower_runs where student_id=actor and run_id=run_key;
  if not found then raise exception 'Oyun bulunamadı.'; end if;
  if r.result is not null then
    return public.dm_tower_status(actor)||r.result||
      jsonb_build_object('yo',(select value from public.extra_data where student_id=actor and key_name='yo'));
  end if;
  total:=jsonb_array_length(r.rounds);
  if selections is null or cardinality(selections)<>total
    or exists(select 1 from unnest(selections) as pick where pick is null or pick not between -1 and 3)
    or extract(epoch from clock_timestamp()-r.started_at)<total*0.75 then
    raise exception 'Oyun sonucu doğrulanamadı.';
  end if;
  select count(*) filter(where selections[ord::int]=(q->>'answer')::int),
         count(*) filter(where selections[ord::int]>=0 and selections[ord::int]<>(q->>'answer')::int)
    into correct,wrong from jsonb_array_elements(r.rounds) with ordinality as rows(q,ord);
  wrong:=total-correct;
  score:=correct*20-wrong*10;
  s:=case when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 when correct>0 then 1 else 0 end;
  passed:=correct*100>=total*70;
  if passed then
    select xp,gold into x,g from public.dm_premium_level_reward(r.level_no,160);
    update public.dm_tower_progress set level_no=least(160,level_no+1),completed=not r.has_more
      where student_id=actor and level_no=r.level_no and not completed;
    if not found then x:=0; g:=0; end if;
  else x:=10; g:=2;
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
    insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values(actor,run_key::text,'premiumtower',0,'{}',x,g);
  elsif v is null then x:=0; g:=0;
  end if;

  outcome:=jsonb_build_object('playedLevel',r.level_no,'correct',correct,'wrong',wrong,
    'total',total,'passed',passed,'hasMore',r.has_more,'score',score,'stars',s,'xp',x,'gold',g);
  update public.dm_tower_runs set result=outcome where student_id=actor and run_id=run_key;
  return public.dm_tower_status(actor)||outcome||jsonb_build_object('yo',v);
end $$;

create index dm_tower_runs_today on public.dm_tower_runs(student_id,started_at);
revoke all on function public.dm_tower_status(uuid),public.dm_tower_start(uuid,uuid),public.dm_tower_finish(uuid,uuid,integer[]) from public,anon,authenticated;
grant execute on function public.dm_tower_status(uuid),public.dm_tower_start(uuid,uuid),public.dm_tower_finish(uuid,uuid,integer[]) to service_role;

CREATE OR REPLACE FUNCTION public.dm_goal_status(actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; u public.dm_goal_progress; prem boolean;
begin
  select * into st from public.students where id=actor and status='approved' and role='student';
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into u from public.dm_goal_progress where student_id=actor;
  prem:=public.dm_pwm_is_premium(actor);
  return public.dm_game_access(actor,'word-goal')||jsonb_build_object('ok',true,'premium',prem,'remaining',case when prem then 999 else (public.dm_game_access(actor,'word-goal')->>'remaining')::int end,
    'activeRunId',(select run_id from public.dm_goal_runs where student_id=actor and result is null order by started_at desc limit 1),'level',coalesce(u.level_no,1),'completed',coalesce(u.completed,false),'words',12,'energy',public.dm_pwm_energy(st),'energyMax',st.energy_max);
end $function$
;


CREATE OR REPLACE FUNCTION public.dm_goal_start(actor uuid, run_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; u public.dm_goal_progress; r public.dm_goal_runs;
  prem boolean; available int; ticks int; questions jsonb; more boolean; batch_size int;
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_goal_runs where student_id=actor and run_id=run_key;
  if not found then
    insert into public.dm_goal_progress(student_id) values(actor) on conflict do nothing;
    select * into u from public.dm_goal_progress where student_id=actor;
    select * into r from public.dm_goal_runs where student_id=actor and result is null order by started_at desc limit 1;
    if found then return public.dm_goal_status(actor)||jsonb_build_object('runId',r.run_id,'playedLevel',r.level_no,'result',r.result,'rounds',r.rounds); end if;
    if u.completed and u.level_no>=160 then raise exception 'Geçersiz bölüm. Tüm oyun rotası tamamlandı.'; end if;
    batch_size:=12;
    prem:=public.dm_pwm_is_premium(actor);
    if not prem and (public.dm_game_access(actor,'word-goal')->>'remaining')::int<=0 then raise exception 'Ücretsiz oyun hakkın bitti. Daha fazla oynamak için Pro ol.'; end if;
    available:=public.dm_pwm_energy(st);
    if available<5 then raise exception 'Oyuna başlamak için 5 enerji gerekli.'; end if;

    with bank as materialized (
      select distinct on (class_no, lower(trim(english)))
        class_no, unit_no, trim(english) as en, trim(turkish) as tr
      from public.dm_premium_course_words(u.level_no)
      where true and trim(english)<>'' and trim(turkish)<>''
      order by class_no, lower(trim(english)), unit_no, trim(turkish), trim(english)
    ), page as (
      select * from bank order by class_no, unit_no, lower(en) limit (batch_size+1)
    ), targets as (
      select * from page order by class_no,unit_no,lower(en) limit batch_size
    ), choices as (
      select t.*, array(
        select opt from (
          select t.tr as opt union all
          select d.tr from (
            select tr from (select min(tr) as tr, bool_or(class_no=t.class_no) as same_class
              from bank where lower(tr)<>lower(t.tr) group by lower(tr)) pool
            order by same_class desc, random() limit 3
          ) d
        ) options order by random()
      ) as opts from targets t
    )
    select jsonb_agg(jsonb_build_object('en',en,'options',opts,'answer',array_position(opts,tr)-1)
      order by class_no,unit_no,lower(en)), (select count(*)>batch_size from page) into questions,more
      from choices where cardinality(opts)=4;
    more:=u.level_no<160;
    if questions is null or jsonb_array_length(questions)<4 then raise exception 'Geçersiz bölüm. Yeni kelime bulunamadı.'; end if;

    ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int;
    update public.students set energy=available-5,
      energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end
      where id=actor;
    insert into public.energy_transactions(student_id,change_amount,balance_after,reason)
      values(actor,-5,available-5,'premium-goal:'||run_key);
    if not prem then update public.dm_goal_progress set free_used=least(3,free_used+1) where student_id=actor; end if;
    insert into public.dm_goal_runs(student_id,run_id,level_no,rounds,has_more)
      values(actor,run_key,u.level_no,questions,more) returning * into r;
  end if;
  return public.dm_goal_status(actor)||jsonb_build_object('runId',run_key,'playedLevel',r.level_no,'result',r.result,
    'rounds',r.rounds);
end $function$
;



create function public.dm_goal_finish(actor uuid, run_key uuid, selections integer[])
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; r public.dm_goal_runs; v jsonb; outcome jsonb;
  total int; passed boolean; correct int; wrong int; score int; s int; x int; g int; ver bigint;
  day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_goal_runs where student_id=actor and run_id=run_key;
  if not found then raise exception 'Oyun bulunamadı.'; end if;
  if r.result is not null then
    return public.dm_goal_status(actor)||r.result||
      jsonb_build_object('yo',(select value from public.extra_data where student_id=actor and key_name='yo'));
  end if;
  total:=jsonb_array_length(r.rounds);
  if selections is null or cardinality(selections)<>total
    or exists(select 1 from unnest(selections) as pick where pick is null or pick not between -1 and 3)
    or extract(epoch from clock_timestamp()-r.started_at)<total*0.75 then
    raise exception 'Oyun sonucu doğrulanamadı.';
  end if;
  select count(*) filter(where selections[ord::int]=(q->>'answer')::int),
         count(*) filter(where selections[ord::int]>=0 and selections[ord::int]<>(q->>'answer')::int)
    into correct,wrong from jsonb_array_elements(r.rounds) with ordinality as rows(q,ord);
  wrong:=total-correct;
  score:=correct*20-wrong*10;
  s:=case when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 when correct>0 then 1 else 0 end;
  passed:=correct*100>=total*70;
  if passed then
    select xp,gold into x,g from public.dm_premium_level_reward(r.level_no,160);
    update public.dm_goal_progress set level_no=least(160,level_no+1),completed=not r.has_more
      where student_id=actor and level_no=r.level_no and not completed;
    if not found then x:=0; g:=0; end if;
  else x:=10; g:=2;
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
    insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values(actor,run_key::text,'premiumgoal',0,'{}',x,g);
  elsif v is null then x:=0; g:=0;
  end if;

  outcome:=jsonb_build_object('playedLevel',r.level_no,'correct',correct,'wrong',wrong,
    'total',total,'passed',passed,'hasMore',r.has_more,'score',score,'stars',s,'xp',x,'gold',g);
  update public.dm_goal_runs set result=outcome where student_id=actor and run_id=run_key;
  return public.dm_goal_status(actor)||outcome||jsonb_build_object('yo',v);
end $$;

create index dm_goal_runs_today on public.dm_goal_runs(student_id,started_at);
revoke all on function public.dm_goal_status(uuid),public.dm_goal_start(uuid,uuid),public.dm_goal_finish(uuid,uuid,integer[]) from public,anon,authenticated;
grant execute on function public.dm_goal_status(uuid),public.dm_goal_start(uuid,uuid),public.dm_goal_finish(uuid,uuid,integer[]) to service_role;

commit;