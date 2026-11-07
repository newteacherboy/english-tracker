begin;
create table public.dm_bubble_progress(
 student_id uuid primary key references public.students(id) on delete cascade,
 free_used integer not null default 0 check(free_used between 0 and 3),
 level_no integer not null default 1,
 word_offset integer not null default 0,
 completed boolean not null default false
);
create table public.dm_bubble_runs(
 student_id uuid not null references public.students(id) on delete cascade,
 run_id uuid not null,
 level_no integer not null,
 rounds jsonb not null,
 answers jsonb not null default '{}'::jsonb,
 has_more boolean not null,
 started_at timestamptz not null default clock_timestamp(),
 result jsonb,
 primary key(student_id,run_id)
);
alter table public.dm_bubble_progress enable row level security;
alter table public.dm_bubble_runs enable row level security;
revoke all on public.dm_bubble_progress,public.dm_bubble_runs from public,anon,authenticated;
grant select,insert,update on public.dm_bubble_progress,public.dm_bubble_runs to service_role;

create function public.dm_bubble_size(l integer) returns integer language sql immutable set search_path to '' as $$
 select coalesce((array[4,6,8,10,12])[least(greatest(l,1),5)],12)
$$;
create function public.dm_bubble_status(actor uuid)
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; p public.dm_bubble_progress; prem boolean;
begin
 select * into st from public.students where id=actor and status='approved' and role='student';
 if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
 select * into p from public.dm_bubble_progress where student_id=actor;
 prem:=public.dm_pwm_is_premium(actor);
 return jsonb_build_object('ok',true,'premium',prem,'remaining',case when prem then 999 else 3-coalesce(p.free_used,0) end,
 'level',coalesce(p.level_no,1),'completed',coalesce(p.completed,false),
 'words',public.dm_bubble_size(coalesce(p.level_no,1)),'energy',public.dm_pwm_energy(st),'energyMax',st.energy_max);
end $$;

create function public.dm_bubble_start(actor uuid,run_key uuid)
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; p public.dm_bubble_progress; r public.dm_bubble_runs;
 prem boolean; available int; ticks int; questions jsonb; more boolean; size int;
begin
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
 select * into r from public.dm_bubble_runs where student_id=actor and run_id=run_key;
 if not found then
  insert into public.dm_bubble_progress(student_id) values(actor) on conflict do nothing;
  select * into p from public.dm_bubble_progress where student_id=actor for update;
  if p.completed then raise exception 'Tüm baloncuk bölümlerini tamamladın.'; end if;
  prem:=public.dm_pwm_is_premium(actor);
  if not prem and p.free_used>=3 then raise exception 'Ücretsiz 3 oyun hakkın bitti.'; end if;
  available:=public.dm_pwm_energy(st);
  if available<5 then raise exception 'Oyuna başlamak için 5 enerji gerekli.'; end if;
  size:=public.dm_bubble_size(p.level_no);
  with bank as materialized(
   select distinct on (lower(trim(english))) trim(english) en,trim(turkish) tr,class_no,unit_no
   from public.word_bank
   where active and class_no between 1 and 8 and length(trim(english)) between 2 and 28
     and length(trim(turkish)) between 2 and 42
   order by lower(trim(english)),class_no,unit_no
  ), page as (
   select * from bank order by class_no,unit_no,lower(en) limit (size+1) offset p.word_offset
  ), targets as (
   select * from page order by class_no,unit_no,lower(en) limit size
  ), choices as (
   select t.tr,t.en,array(
    select opt from (
     select t.en opt union all
     select d.en opt from (
      select min(en) en,bool_or(class_no=t.class_no) same_class
      from bank where lower(tr)<>lower(t.tr) and lower(en)<>lower(t.en)
      group by lower(en) order by same_class desc,random() limit 3
     ) d
    ) opts order by random()
   ) as options from targets t
  )
  select jsonb_agg(jsonb_build_object('tr',tr,'options',options,'answer',array_position(options,en)-1)),
    (select count(*)>size from page) into questions,more
   from choices where cardinality(options)=4;
  if questions is null or jsonb_array_length(questions)<1 then
   raise exception 'Bu bölüm için yeterli farklı kelime bulunamadı.';
  end if;
  ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int;
  update public.students set energy=available-5,
    energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end
   where id=actor;
  insert into public.energy_transactions(student_id,change_amount,balance_after,reason)
   values(actor,-5,available-5,'premium-bubble:'||run_key);
  if not prem then update public.dm_bubble_progress set free_used=free_used+1 where student_id=actor; end if;
  insert into public.dm_bubble_runs(student_id,run_id,level_no,rounds,has_more)
   values(actor,run_key,p.level_no,questions,more) returning * into r;
 end if;
 return public.dm_bubble_status(actor)||jsonb_build_object('runId',run_key,'playedLevel',r.level_no,
 'result',r.result,'rounds',r.rounds,'hasMore',r.has_more);
end $$;

create function public.dm_bubble_check(actor uuid,run_key uuid,slot integer,pick integer)
returns jsonb language plpgsql set search_path to '' as $
declare r public.dm_bubble_runs; q jsonb; answer_index int; existing jsonb;
begin
 if slot<0 or pick not between -1 and 3 then raise exception 'Geçersiz cevap.';end if;
 select * into r from public.dm_bubble_runs where student_id=actor and run_id=run_key for update;
 if not found or r.result is not null or slot>=jsonb_array_length(r.rounds) then
  raise exception 'Oyun bulunamadı.'; end if;
 q:=r.rounds->slot;
 answer_index:=(q->>'answer')::int;
 existing:=r.answers->slot::text;
 if existing is not null then
  if (existing->>'pick')::int<>pick then raise exception 'Bu soru zaten cevaplandı.';end if;
 else
  if slot>0 and r.answers->(slot-1)::text is null then raise exception 'Soru sırası geçersiz.';end if;
  update public.dm_bubble_runs
   set answers=jsonb_set(answers,array[slot::text],jsonb_build_object('pick',pick,'correct',pick=answer_index),true)
   where student_id=actor and run_id=run_key;
 end if;
 return jsonb_build_object('ok',true,'correct',pick=answer_index,
  'expected',q->'options'->answer_index,'pick',pick,'slot',slot);
end $;

create function public.dm_bubble_finish(actor uuid,run_key uuid,selections integer[])
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; r public.dm_bubble_runs; v jsonb; outcome jsonb;
 total int;correct int;wrong int;score int;stars int;xp int:=0;gold int:=0;
 mult numeric;ver bigint;advanced boolean;
 day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
 select * into r from public.dm_bubble_runs where student_id=actor and run_id=run_key for update;
 if not found then raise exception 'Oyun bulunamadı.'; end if;
 if r.result is not null then return public.dm_bubble_status(actor)||r.result||
  jsonb_build_object('yo',(select value from public.extra_data where student_id=actor and key_name='yo')); end if;
 total:=jsonb_array_length(r.rounds);
 if selections is null or cardinality(selections)<>total or (select count(*) from jsonb_object_keys(r.answers))<>total or
    exists(select 1 from unnest(selections) pick where pick is null or pick not between -1 and 3)
    or extract(epoch from clock_timestamp()-r.started_at)<greatest(1,total*1.4-2) then
  raise exception 'Oyun sonucu doğrulanamadı.';
 end if;
 if exists (select 1 from generate_series(0,total-1) n where
   r.answers->n::text is null or ((r.answers->n::text)->>'pick')::int<>selections[n+1]) then
   raise exception 'Oyun cevapları doğrulanamadı.';
 end if;
 select count(*) filter(where selections[ord::int]=(q->>'answer')::int),
 count(*) filter(where selections[ord::int]>=0 and selections[ord::int]<>(q->>'answer')::int)
 into correct,wrong from jsonb_array_elements(r.rounds) with ordinality rows(q,ord);
 score:=greatest(0,correct*100-wrong*25);
 stars:=case when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 when correct>0 then 1 else 0 end;
 mult:=case stars when 3 then 1 when 2 then .75 when 1 then .5 else 0 end;
 update public.dm_bubble_progress set
  word_offset=word_offset+total,
  level_no=level_no+case when r.has_more then 1 else 0 end,
  completed=not r.has_more
 where student_id=actor and level_no=r.level_no and not completed;
 advanced:=found;
 if advanced then xp:=round(150*mult);gold:=round(30*mult);end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is not null and (xp>0 or gold>0) then
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+xp,'altin',coalesce((v->>'altin')::numeric,0)+gold,
   'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
  v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
  v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+xp));
  v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));
  v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+xp));
  update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
  update public.students set gold=(v->>'altin')::numeric where id=actor;
  insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold)
    values(actor,run_key::text,'premiumbubble',0,'{}',xp,gold);
 elsif v is null then xp:=0;gold:=0;end if;
 outcome:=jsonb_build_object('playedLevel',r.level_no,'correct',correct,'wrong',wrong,'total',total,
  'score',score,'stars',stars,'xp',xp,'gold',gold,'hasMore',r.has_more);
 update public.dm_bubble_runs set result=outcome where student_id=actor and run_id=run_key;
 return public.dm_bubble_status(actor)||outcome||jsonb_build_object('yo',v);
end $$;
revoke all on function public.dm_bubble_size(integer),public.dm_bubble_status(uuid),
 public.dm_bubble_start(uuid,uuid),public.dm_bubble_check(uuid,uuid,integer,integer),public.dm_bubble_finish(uuid,uuid,integer[]) from public,anon,authenticated;
grant execute on function public.dm_bubble_size(integer),public.dm_bubble_status(uuid),
 public.dm_bubble_start(uuid,uuid),public.dm_bubble_check(uuid,uuid,integer,integer),public.dm_bubble_finish(uuid,uuid,integer[]) to service_role;
commit;
