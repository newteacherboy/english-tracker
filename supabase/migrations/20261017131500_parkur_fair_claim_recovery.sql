-- Main Parkur: use the recorded 12 answers, not the reward-request score.
-- This is additive and leaves all existing receipts and balances unchanged.
begin;
create table if not exists public.dm_parkur_recovery_runs(
 student_id uuid not null references public.students(id) on delete cascade,
 run_id text not null,
 stop_no integer not null,
 class_no integer not null,
 deck jsonb not null check(jsonb_typeof(deck)='array' and jsonb_array_length(deck)=3),
 step integer not null default 0 check(step between 0 and 3),
 mistakes integer not null default 0 check(mistakes>=0),
 completed boolean not null default false,
 created_at timestamptz not null default now(),
 primary key(student_id,run_id)
);
alter table public.dm_parkur_recovery_runs enable row level security;
revoke all on public.dm_parkur_recovery_runs from public,anon,authenticated;
grant select,insert,update on public.dm_parkur_recovery_runs to service_role;

create or replace function public.dm_parkur_recovery_view(deck jsonb, step_index integer)
returns jsonb language sql immutable set search_path='' as $view$
 select jsonb_build_object('step',step_index,'total',3,'prompt',deck->step_index->>'prompt','options',deck->step_index->'options');
$view$;

create or replace function public.dm_parkur_fair_claim(
 actor uuid, run_key text, class_id integer, stop_no integer, seconds numeric
) returns jsonb language plpgsql set search_path='' as $fair$
declare v jsonb; reward jsonb; previous public.dm_game_reward_runs; st public.students;
 rec public.dm_parkur_recovery_runs;
 answered_count int; correct_count int; percentage int:=0;
 raw_x int;raw_g int; adj_x int;adj_g int;ver bigint;
 options text[]; meanings text[]; words_count int; i int; n int; a int; b int; c int;
 deck jsonb:='[]'::jsonb;
 day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 if actor is null or run_key !~ '^[a-zA-Z0-9_-]{16,100}$'
 or class_id not between 0 and 12 or stop_no not between 200000 and 300000
 or (stop_no-200000)/10000<>class_id or mod(stop_no-200000,100) not between 1 and 99
 or seconds is null or seconds<=0 or seconds>86400 then
 raise exception 'Geçersiz parkur ödül isteği';end if;
 perform 1 from public.students where id=actor for update;
 select * into previous from public.dm_game_reward_runs
 where student_id=actor and run_id=run_key for update;
 if found then
  select value into v from public.extra_data where student_id=actor and key_name='yo';
  return jsonb_build_object('ok',true,'duplicate',true,'xp',previous.xp,'gold',previous.gold,
    'reason','duplicate','yo',v);
 end if;
 select count(*) filter(where answered),count(*) filter(where answered and correct)
 into answered_count,correct_count from public.dm_parkur_question_ledger
 where student_id=actor and run_id=run_key and question_no between 1 and 12;
 if answered_count<>12 then
  return jsonb_build_object('ok',true,'reason','incomplete','xp',0,'gold',0,
   'answered',answered_count,'required',12);
 end if;
 select * into rec from public.dm_parkur_recovery_runs where student_id=actor and run_id=run_key for update;
 if rec.student_id is not null and (rec.stop_no<>stop_no or rec.class_no<>class_id)
 then raise exception 'Pekiştirme kaydı uyuşmuyor';end if;
 if correct_count<8 and not coalesce(rec.completed,false) then
  if rec.student_id is null then
   select array_agg(w.english order by w.english),array_agg(w.turkish order by w.english)
   into options,meanings from (
     select distinct on (lower(trim(english))) trim(english) english, trim(turkish) turkish
     from public.word_bank where class_no=class_id
       and unit_no=mod(stop_no-200000,10000)/100
       and active and nullif(trim(english),'') is not null and nullif(trim(turkish),'') is not null
     order by lower(trim(english)),trim(english),trim(turkish)
   ) w;
   words_count:=coalesce(cardinality(options),0);
   if words_count<3 then
    select array_agg(w.english order by w.english),array_agg(w.turkish order by w.english)
    into options,meanings from (
     select distinct on (lower(trim(english))) trim(english) english,trim(turkish) turkish
     from public.word_bank where class_no=class_id and active
     and nullif(trim(english),'') is not null and nullif(trim(turkish),'') is not null
     order by lower(trim(english)),trim(english),trim(turkish)
    ) w;
    words_count:=coalesce(cardinality(options),0);
   end if;
   if words_count<3 then return jsonb_build_object('ok',true,'reason','practice_unavailable',
      'xp',0,'gold',0,'mesaj','Bu ünite için pekiştirme içeriği hazırlanıyor.');end if;
   -- Stable but run-specific rotation; answers never leave the protected table.
   n:=mod(abs(hashtext(run_key)::bigint),words_count)::int;
   for i in 0..2 loop
    a:=1+mod(n+i,words_count);
    b:=1+mod(n+i+1,words_count);
    c:=1+mod(n+i+2,words_count);
    deck:=deck||jsonb_build_array(jsonb_build_object(
       'prompt',meanings[a],'answer',options[a],
       'options',case mod(i,3) when 0 then to_jsonb(array[options[b],options[a],options[c]])
         when 1 then to_jsonb(array[options[c],options[b],options[a]])
         else to_jsonb(array[options[a],options[c],options[b]]) end));
   end loop;
   insert into public.dm_parkur_recovery_runs(student_id,run_id,stop_no,class_no,deck)
   values(actor,run_key,stop_no,class_id,deck)
   on conflict(student_id,run_id) do nothing;
   select * into rec from public.dm_parkur_recovery_runs
   where student_id=actor and run_id=run_key for update;
  end if;
 end if;
 if correct_count<8 and not rec.completed then
  return jsonb_build_object('ok',true,'reason','needs_recovery','xp',0,'gold',0,
    'firstCorrect',correct_count,'total',12,
    'recovery',public.dm_parkur_recovery_view(rec.deck,rec.step));
 end if;
 percentage:=case when correct_count>=12 then 100 when correct_count>=10 then 80
   when correct_count>=8 then 60 else 30 end;
 -- The old reward engine is called only after the 12-step gate has passed.
 -- Reuse its first-clear/duplicate rules, and discount the single ledger receipt.
 reward:=public.dm_game_reward_claim(actor,run_key,'ba',class_id,array[stop_no],
   12,0,seconds,true,case percentage when 100 then 3 when 80 then 2 else 1 end,1);
 if coalesce((reward->>'xp')::int,0)<=0 then
  return reward||jsonb_build_object('fairPercent',percentage,
   'firstCorrect',correct_count,'total',12);
 end if;
 raw_x:=(reward->>'xp')::int;raw_g:=(reward->>'gold')::int;
 adj_x:=floor(raw_x*(100-percentage)/100.0)::int;
 adj_g:=floor(raw_g*(100-percentage)/100.0)::int;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Öğrenci ödül verisi bulunamadı';end if;
 if adj_x>0 or adj_g>0 then
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,
    coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)-adj_x,
    'altin',coalesce((v->>'altin')::numeric,0)-adj_g,
    'guncelleme',ver,'dmRewardVersion',ver);
  if v#>>'{xpGun,tarih}'=day then
   v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(greatest(0,coalesce((v#>>'{xpGun,xp}')::numeric,0)-adj_x)));
  end if;
  v:=jsonb_set(v,array['log',day],to_jsonb(greatest(0,coalesce((v#>>array['log',day])::numeric,0)-adj_x)),true);
  update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
  update public.students set gold=(v->>'altin')::numeric where id=actor;
  update public.dm_game_reward_runs set xp=raw_x-adj_x,gold=raw_g-adj_g
   where student_id=actor and run_id=run_key;
 end if;
 return jsonb_build_object('ok',true,'xp',raw_x-adj_x,'gold',raw_g-adj_g,
   'reason','awarded','yo',v,'firstCorrect',correct_count,'total',12,'fairPercent',percentage,
   'fairTier',case percentage when 100 then 'perfect' when 80 then 'high' when 60 then 'pass' else 'recovery' end);
end; $fair$;

create or replace function public.dm_parkur_fair_recover(
 actor uuid,run_key text,stop_no integer,expected_step integer,selected text
) returns jsonb language plpgsql set search_path='' as $recover$
declare rec public.dm_parkur_recovery_runs; good boolean;
begin
 if actor is null or run_key !~ '^[a-zA-Z0-9_-]{16,100}$'
 or stop_no not between 200000 and 300000 or expected_step not between 0 and 2
 or selected is null or length(selected)>200 then raise exception 'Geçersiz pekiştirme isteği';end if;
 perform 1 from public.students where id=actor for update;
 select * into rec from public.dm_parkur_recovery_runs where student_id=actor and run_id=run_key for update;
 if not found or rec.stop_no<>stop_no or rec.completed then
  return jsonb_build_object('ok',false,'mesaj','Pekiştirme açık değil');end if;
 if rec.step<>expected_step then
  return jsonb_build_object('ok',true,'stale',true,'correct',false,
    'recovery',public.dm_parkur_recovery_view(rec.deck,rec.step));end if;
 good:=lower(trim(selected))=lower(trim(rec.deck->rec.step->>'answer'));
 if good then
  update public.dm_parkur_recovery_runs set step=step+1,completed=(step=2)
   where student_id=actor and run_id=run_key returning * into rec;
 else
  update public.dm_parkur_recovery_runs set mistakes=mistakes+1
   where student_id=actor and run_id=run_key;
 end if;
 return jsonb_build_object('ok',true,'correct',good,'completed',rec.completed,
   'recovery',case when rec.completed then null else public.dm_parkur_recovery_view(rec.deck,rec.step) end);
end; $recover$;
revoke all on function public.dm_parkur_recovery_view(jsonb,integer) from public,anon,authenticated;
revoke all on function public.dm_parkur_fair_claim(uuid,text,integer,integer,numeric) from public,anon,authenticated;
revoke all on function public.dm_parkur_fair_recover(uuid,text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.dm_parkur_recovery_view(jsonb,integer) to service_role;
grant execute on function public.dm_parkur_fair_claim(uuid,text,integer,integer,numeric) to service_role;
grant execute on function public.dm_parkur_fair_recover(uuid,text,integer,integer,text) to service_role;
commit;
