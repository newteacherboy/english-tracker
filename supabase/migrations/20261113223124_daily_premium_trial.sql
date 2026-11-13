-- Daily per-game access; calendar days use Europe/Istanbul.
create or replace function public.dm_game_trial_active(joined date, today date)
returns boolean language sql immutable set search_path='' as $$
 select today < greatest(joined,date '2026-11-14')+3
$$;
revoke all on function public.dm_game_trial_active(date,date) from public,anon,authenticated;
grant execute on function public.dm_game_trial_active(date,date) to service_role;
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
 else raise exception 'Geçersiz oyun.';
 end case;
 return jsonb_build_object('plan',p,'premium',p='premium_pro','limit',lim,'period','day',
 'trialEnds',expires,'remaining',case when p='premium_pro' then 999 else greatest(0,lim-n) end);
end $$;
revoke all on function public.dm_game_access(uuid,text) from public,anon,authenticated;
grant execute on function public.dm_game_access(uuid,text) to service_role;
CREATE OR REPLACE FUNCTION public.dm_blocks_start(actor uuid, run_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; u public.dm_blocks_progress; r public.dm_blocks_runs;
  prem boolean; available int; ticks int; questions jsonb; more boolean; batch_size int; repeated jsonb; first_lane int; repeat_lane int;
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_blocks_runs where student_id=actor and run_id=run_key;
  if not found then
    insert into public.dm_blocks_progress(student_id) values(actor) on conflict do nothing;
    select * into u from public.dm_blocks_progress where student_id=actor;
    if u.completed then raise exception 'Geçersiz bölüm. Tüm uçuş rotası tamamlandı.'; end if;
    batch_size:=public.dm_cloud_level_size(u.level_no)-case when u.level_no>=2 then 1 else 0 end;
    prem:=public.dm_pwm_is_premium(actor);
    if not prem and (public.dm_game_access(actor,'word-blocks')->>'remaining')::int<=0 then raise exception 'Ücretsiz oyun hakkın bitti. Daha fazla oynamak için Pro ol.'; end if;
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

    -- Insert a repeat without advancing the Word Bank cursor for it.
    if u.level_no>=2 and jsonb_array_length(questions)>=2 then
      repeated:=questions->0;
      first_lane:=(repeated->>'answer')::int;
      repeat_lane:=case when first_lane=2 then 1 else first_lane+1 end;
      repeated:=jsonb_set(repeated,array['options',first_lane::text],repeated->'options'->repeat_lane);
      repeated:=jsonb_set(repeated,array['options',repeat_lane::text],questions->0->'options'->first_lane);
      repeated:=repeated||jsonb_build_object('repeat',true,'answer',repeat_lane);
      questions:=jsonb_build_array(questions->0,questions->1,repeated)
        ||(questions-0-0);
    end if;
    select jsonb_agg(q||jsonb_build_object('color',(array[0,1,0,2,3,2])[(ord::int-1)%6+1]) order by ord)
      into questions from jsonb_array_elements(questions) with ordinality as rounds(q,ord);

    ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int;
    update public.students set energy=available-5,
      energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end
      where id=actor;
    insert into public.energy_transactions(student_id,change_amount,balance_after,reason)
      values(actor,-5,available-5,'premium-blok:'||run_key);
    if not prem then update public.dm_blocks_progress set free_used=least(3,free_used+1) where student_id=actor; end if;
    insert into public.dm_blocks_runs(student_id,run_id,level_no,rounds,has_more)
      values(actor,run_key,u.level_no,questions,more) returning * into r;
  end if;
  return public.dm_blocks_status(actor)||jsonb_build_object('runId',run_key,'playedLevel',r.level_no,'result',r.result,
    'rounds',r.rounds);
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_blocks_status(actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; u public.dm_blocks_progress; prem boolean;
begin
  select * into st from public.students where id=actor and status='approved' and role='student';
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into u from public.dm_blocks_progress where student_id=actor;
  prem:=public.dm_pwm_is_premium(actor);
  return jsonb_build_object('ok',true,'premium',prem,'remaining',case when prem then 999 else (public.dm_game_access(actor,'word-blocks')->>'remaining')::int end,
    'level',coalesce(u.level_no,1),'completed',coalesce(u.completed,false),'words',public.dm_cloud_level_size(coalesce(u.level_no,1)),'energy',public.dm_pwm_energy(st),'energyMax',st.energy_max);
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_cloud_status(actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; u public.dm_cloud_progress; prem boolean;
begin
  select * into st from public.students where id=actor and status='approved' and role='student';
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into u from public.dm_cloud_progress where student_id=actor;
  prem:=public.dm_pwm_is_premium(actor);
  return jsonb_build_object('ok',true,'premium',prem,'remaining',case when prem then 999 else (public.dm_game_access(actor,'cloud-flight')->>'remaining')::int end,
    'level',coalesce(u.level_no,1),'completed',coalesce(u.completed,false),'words',public.dm_cloud_level_size(coalesce(u.level_no,1)),'energy',public.dm_pwm_energy(st),'energyMax',st.energy_max);
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_cloud_start(actor uuid, run_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; u public.dm_cloud_progress; r public.dm_cloud_runs;
  prem boolean; available int; ticks int; questions jsonb; more boolean; batch_size int;
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_cloud_runs where student_id=actor and run_id=run_key;
  if not found then
    insert into public.dm_cloud_progress(student_id) values(actor) on conflict do nothing;
    select * into u from public.dm_cloud_progress where student_id=actor;
    if u.completed then raise exception 'Geçersiz bölüm. Tüm uçuş rotası tamamlandı.'; end if;
    batch_size:=public.dm_cloud_level_size(u.level_no);
    prem:=public.dm_pwm_is_premium(actor);
    if not prem and (public.dm_game_access(actor,'cloud-flight')->>'remaining')::int<=0 then raise exception 'Ücretsiz oyun hakkın bitti. Daha fazla oynamak için Pro ol.'; end if;
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
      values(actor,-5,available-5,'premium-bulut:'||run_key);
    if not prem then update public.dm_cloud_progress set free_used=least(3,free_used+1) where student_id=actor; end if;
    insert into public.dm_cloud_runs(student_id,run_id,level_no,rounds,has_more)
      values(actor,run_key,u.level_no,questions,more) returning * into r;
  end if;
  return public.dm_cloud_status(actor)||jsonb_build_object('runId',run_key,'playedLevel',r.level_no,'result',r.result,
    'rounds',r.rounds);
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_papizzle_start(actor uuid, run_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
    if not prem and (public.dm_game_access(actor,'papizzle')->>'remaining')::int<=0 then raise exception 'Ücretsiz oyun hakkın bitti. Daha fazla oynamak için Pro ol.'; end if;
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
    if not prem then update public.dm_papizzle_progress set free_used=least(3,free_used+1) where student_id=actor; end if;
    insert into public.dm_papizzle_runs(student_id,run_id,level_no,tiles,target_order)
      values(actor,run_key,p.level_no,tiles,targets) returning * into r;
  end if;
  return public.dm_papizzle_status(actor)||jsonb_build_object(
    'runId',run_key,'playedLevel',r.level_no,'tiles',r.tiles,'order',r.target_order);
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_papizzle_status(actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; p public.dm_papizzle_progress; prem boolean;
begin
  select * into st from public.students where id=actor and status='approved' and role='student';
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into p from public.dm_papizzle_progress where student_id=actor;
  prem:=public.dm_pwm_is_premium(actor);
  return jsonb_build_object('ok',true,'premium',prem,
    'remaining',case when prem then 999 else (public.dm_game_access(actor,'papizzle')->>'remaining')::int end,
    'level',coalesce(p.level_no,1),'energy',public.dm_pwm_energy(st),'energyMax',st.energy_max);
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_pwm_start(actor uuid, run_key uuid, p_level integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; u public.dm_premium_match_usage; r public.dm_premium_match_runs; prem boolean; available int; ticks int;
begin
  if run_key is null or p_level is null or p_level<1 or p_level>100 then raise exception 'Geçersiz bölüm.'; end if;
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  insert into public.dm_premium_match_usage(student_id) values(actor) on conflict(student_id) do nothing;
  select * into u from public.dm_premium_match_usage where student_id=actor for update;
  select * into r from public.dm_premium_match_runs where student_id=actor and run_id=run_key;
  if found then return public.dm_pwm_status(actor)||jsonb_build_object('runId',run_key,'replayed',true); end if;
  if p_level>u.level_no then raise exception 'Bu bölüm henüz açılmadı.'; end if;
  prem:=public.dm_pwm_is_premium(actor);
  if not prem and (public.dm_game_access(actor,'word-match')->>'remaining')::int<=0 then raise exception 'Ücretsiz oyun hakkın bitti. Daha fazla oynamak için Pro ol.'; end if;
  ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int;
  available:=public.dm_pwm_energy(st);
  if available<5 then raise exception 'Oyuna başlamak için 5 enerji gerekli.'; end if;
  update public.students set energy=available-5,
    energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end
    where id=actor;
  insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-5,available-5,'premium-kelime:'||run_key);
  insert into public.dm_premium_match_runs(student_id,run_id,premium,level_no,v2) values(actor,run_key,prem,p_level,true);
  if not prem then update public.dm_premium_match_usage set free_used=least(3,free_used+1),updated_at=now() where student_id=actor; end if;
  return public.dm_pwm_status(actor)||jsonb_build_object('runId',run_key,'replayed',false);
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_pwm_status(actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare u public.dm_premium_match_usage; st public.students; prem boolean;
begin
  select * into st from public.students where id=actor and status='approved' and role='student';
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  insert into public.dm_premium_match_usage(student_id) values(actor) on conflict(student_id) do nothing;
  select * into u from public.dm_premium_match_usage where student_id=actor;
  prem:=public.dm_pwm_is_premium(actor);
  return jsonb_build_object('ok',true,'plan',public.dm_plan(actor,'student'),'premium',prem,'freeUsed',u.free_used,'remaining',(public.dm_game_access(actor,'word-match')->>'remaining')::int,
    'level',u.level_no,'stars',u.stars,'energy',public.dm_pwm_energy(st),'energyMax',st.energy_max,'gold',st.gold);
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_plan_limits(plan text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case plan
    when 'premium_pro' then '{"plan":"premium_pro","energyMax":60,"unlimitedEnergy":true,"dailyGold":75,"monthlyShields":5,"mola":5,"pwmDaily":null,"pwmUnlimited":true,"ads":false,"leagueDailyCap":3500}'::jsonb
    when 'pro' then '{"plan":"pro","energyMax":40,"unlimitedEnergy":false,"dailyGold":30,"monthlyShields":2,"mola":3,"pwmDaily":5,"pwmUnlimited":false,"ads":false,"leagueDailyCap":3500}'::jsonb
    else '{"plan":"free","energyMax":25,"unlimitedEnergy":false,"dailyGold":0,"monthlyShields":0,"mola":1,"pwmDaily":null,"pwmUnlimited":false,"ads":true,"leagueDailyCap":3500}'::jsonb end
$function$
;
CREATE OR REPLACE FUNCTION public.dm_rally_start(actor uuid, run_key uuid, class_id integer, unit_ids integer[], question_deck jsonb, pace text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students;r public.dm_rally_runs;available int;ticks int;v jsonb;
begin
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci hesabı gerekli.';end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo';

 select * into r from public.dm_rally_runs where id=run_key;
 if found then if r.student_id<>actor then raise exception 'Yarış bulunamadı.';end if;return public.dm_rally_view(r);end if;
 if class_id is null or class_id not between 1 and 8 or cardinality(unit_ids) not between 1 and 10 or exists(select 1 from unnest(unit_ids) u where u is null or u not between 1 and 100) or pace not in ('easy','normal','hard') or jsonb_typeof(question_deck) is distinct from 'array' or jsonb_array_length(question_deck) not in (12,15) then raise exception 'Geçerli sınıf, ünite ve 12 veya 15 kelime gerekli.';end if;
 if exists(select 1 from jsonb_array_elements(question_deck) q where jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options')<>3 or (q->>'answer')::int not between 0 and 2 or nullif(q->>'word','') is null) then raise exception 'Geçersiz yarış kelimeleri.';end if;
 if (select count(*) from public.dm_rally_runs where student_id=actor and created_at>now()-interval '1 minute')>=5 then raise exception 'Yeni yarış için kısa bir süre bekle.';end if;
 if (public.dm_game_access(actor,'rally')->>'remaining')::int<=0 then raise exception 'Ücretsiz oyun hakkın bitti. Daha fazla oynamak için Pro ol.';end if;
 ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900));
 available:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+ticks) end;
 if available<3 then raise exception 'Yarışa başlamak için 3 enerji gerekli.';end if;
 insert into public.dm_rally_runs(id,student_id,class_no,units,difficulty,deck) values(run_key,actor,class_id,unit_ids,pace,question_deck) returning * into r;
 update public.students set energy=available-3,energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
 insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-3,available-3,'ralli:'||run_key);
 return public.dm_rally_view(r)||jsonb_build_object('energy',available-3,'energyMax',st.energy_max);
end $function$
;

