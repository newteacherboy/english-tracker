-- Review timestamps are UTC; daily reward eligibility uses Istanbul calendar days.
-- Fixed, server-verified completion rewards. Durable markers live in extra_data.
create or replace function public.dm_companion_reward(actor uuid,reward_kind text,story_key text default null)
returns jsonb language plpgsql security invoker set search_path='' as $reward$
declare
 st public.students; v jsonb; mark text; prior jsonb; work jsonb; missions jsonb;
 day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
 gain_xp int; gain_gold int; gain_energy int; ver bigint; available int; ticks int; stamp timestamptz;
 review_ok boolean; dialogue_ok boolean; result jsonb;
begin
 if reward_kind not in ('plan','story') or actor is null then raise exception 'Geçersiz ödül';end if;
 select * into st from public.students where id=actor and role='student' and status='approved' for update;
 if not found then raise exception 'Aktif öğrenci hesabı gerekli';end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Öğrenci cüzdanı hazırlanıyor';end if;
 if reward_kind='story' then
  if story_key is null or story_key !~ '^[a-z0-9_-]{1,80}$' then raise exception 'Geçersiz içerik';end if;
  mark:='practice_reward:story:'||story_key;gain_xp:=50;gain_gold:=20;gain_energy:=2;
 else
  mark:='practice_reward:plan:'||day;gain_xp:=120;gain_gold:=50;gain_energy:=0;
 end if;
 select value into prior from public.extra_data where student_id=actor and key_name=mark;
 if prior is not null then
  return jsonb_build_object('claimed',false,'duplicate',true,'xp',0,'gold',0,'energy',0,'yo',v,'enerjiKalan',st.energy,'enerjiMax',st.energy_max);
 end if;
 if reward_kind='story' then
  select value into work from public.extra_data where student_id=actor and key_name='practice_dialogue:'||story_key||':'||day;
  if coalesce((work->>'cursor')::int,0)<3 or (select count(*) from jsonb_object_keys(coalesce(work->'answers','{}'::jsonb)))<3
  then raise exception 'Önce içeriğin tüm alıştırmalarını tamamla';end if;
 else
  missions:=public.dm_mission_summary(actor);
  if coalesce((missions#>>'{daily,route}')::int,0)<1 then raise exception 'Önce bir bölüm tamamla';end if;
  select not exists(select 1 from public.extra_data where student_id=actor and key_name like 'review_word:%'
    and (not coalesce(pg_catalog.pg_input_is_valid(value->>'dueAt','timestamp with time zone'),false)
      or case when pg_catalog.pg_input_is_valid(value->>'dueAt','timestamp with time zone') then (value->>'dueAt')::timestamptz<=now() else true end))
   or (select count(*) from public.extra_data where student_id=actor and key_name like 'review_word:%'
     and case when pg_catalog.pg_input_is_valid(value->>'lastReviewedAt','timestamp with time zone') then to_char((value->>'lastReviewedAt')::timestamptz at time zone 'Europe/Istanbul','YYYY-MM-DD')=day else false end)>=3 into review_ok;
  select exists(select 1 from public.extra_data where student_id=actor and key_name like 'practice_dialogue:%:'||day
   and coalesce((value->>'cursor')::int,0)>=3
   and (select count(*) from jsonb_object_keys(coalesce(value->'answers','{}'::jsonb)))>=3) into dialogue_ok;
  if not coalesce(review_ok,false) or not coalesce(dialogue_ok,false) then raise exception 'Önce günlük planın üç adımını tamamla';end if;
 end if;
 ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
 v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+gain_xp,'altin',coalesce((v->>'altin')::numeric,0)+gain_gold,
  'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
 v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
 v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+gain_xp));
 available:=coalesce(st.energy,0);stamp:=coalesce(st.energy_updated_at,now());
 if gain_energy>0 and available<coalesce(st.energy_max,30) then
  ticks:=greatest(0,floor(extract(epoch from (now()-stamp))/900)::int);
  available:=least(coalesce(st.energy_max,30),available+ticks);
  stamp:=case when available>=coalesce(st.energy_max,30) then now() else stamp+ticks*interval '15 minutes' end;
 end if;
 available:=available+gain_energy;
 update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
 update public.students set gold=(v->>'altin')::numeric,energy=available,energy_updated_at=stamp,updated_at=now() where id=actor;
 if gain_energy>0 then insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,gain_energy,available,'hikaye_diyalog_tamamlandi');end if;
 result:=jsonb_build_object('claimed',true,'xp',gain_xp,'gold',gain_gold,'energy',gain_energy,'day',day);
 insert into public.extra_data(student_id,key_name,value) values(actor,mark,result);
 return result||jsonb_build_object('yo',v,'enerjiKalan',available,'enerjiMax',st.energy_max);
end $reward$;
revoke all on function public.dm_companion_reward(uuid,text,text) from public,anon,authenticated;
grant execute on function public.dm_companion_reward(uuid,text,text) to service_role;
