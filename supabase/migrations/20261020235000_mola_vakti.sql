-- Gold-only break games. Every wallet and quota mutation is serialized on students.
begin;
create table public.dm_break_runs (
 id uuid primary key,
 student_id uuid not null references public.students(id) on delete cascade,
 game text not null check (game in ('kosu','zipla','patlat')),
 day text not null,
 score integer not null default 0 check (score>=0),
 gold integer not null default 0 check (gold between 0 and 100),
 status text not null default 'playing' check (status in ('playing','finished')),
 created_at timestamptz not null default now(),
 finished_at timestamptz
);
create index dm_break_daily on public.dm_break_runs(student_id,day,game);
create index dm_break_best on public.dm_break_runs(game,score desc,student_id) where status='finished';
alter table public.dm_break_runs enable row level security;
revoke all on public.dm_break_runs from public,anon,authenticated;
grant all on public.dm_break_runs to service_role;

create function public.dm_break_status(actor uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare st public.students;d text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');games jsonb;available int;
begin
 select * into st from public.students where id=actor and status='approved' and role='student';
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 available:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int) end;
 select jsonb_object_agg(g,jsonb_build_object('remaining',greatest(0,2-(select count(*) from public.dm_break_runs r where r.student_id=actor and r.day=d and r.game=g)))) into games from unnest(array['kosu','zipla','patlat']) g;
 return jsonb_build_object('ok',true,'day',d,'games',games,'energy',available,'energyMax',st.energy_max);
end $$;

create function public.dm_break_start(actor uuid,run_key uuid,game_code text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare st public.students;r public.dm_break_runs;available int;ticks int;d text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 if run_key is null or game_code is null or game_code not in ('kosu','zipla','patlat') then raise exception 'Geçersiz oyun.';end if;
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_break_runs where id=run_key;
 if found then
  if r.student_id<>actor or r.game<>game_code then raise exception 'Oyun bulunamadı.';end if;
  return public.dm_break_status(actor)||jsonb_build_object('runId',r.id,'finished',r.status='finished','score',r.score,'gold',r.gold);
 end if;
 if (select count(*) from public.dm_break_runs where student_id=actor and day=d and game=game_code)>=2 then raise exception 'Bugünkü 2 hakkın bitti, yarın yine gel';end if;
 ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900));
 available:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+ticks) end;
 if available<5 then raise exception 'Oyuna başlamak için 5 enerji gerekli.';end if;
 insert into public.dm_break_runs(id,student_id,game,day) values(run_key,actor,game_code,d);
 update public.students set energy=available-5,energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
 insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-5,available-5,'mola:'||run_key);
 return public.dm_break_status(actor)||jsonb_build_object('runId',run_key,'finished',false);
end $$;

-- Small, testable reward policy shared by all finishes; duration is checked against server time below.
create function public.dm_break_reward(game_code text,score integer,collected_gold integer,seconds integer) returns integer
language plpgsql immutable security invoker set search_path='' as $$
declare rate int;unit int;
begin
 if game_code is null or game_code not in ('kosu','zipla','patlat') or seconds is null or seconds<0 or seconds>1800 or score is null or score<0 or collected_gold is null or collected_gold<0 then raise exception 'Geçersiz oyun sonucu.';end if;
 rate:=case game_code when 'kosu' then 35 when 'zipla' then 60 else 2500 end;
 unit:=case game_code when 'kosu' then 100 when 'zipla' then 150 else 1000 end;
 if score>seconds*rate+(case when game_code='patlat' then 0 else 3 end) or (game_code='patlat' and score>60000) then raise exception 'Oyun sonucu süreyle uyuşmuyor.';end if;
 return least(100,least(collected_gold,seconds*3,case game_code when 'patlat' then score/60 else score/5 end)+least(20,score/unit));
end $$;

create function public.dm_break_finish(actor uuid,run_key uuid,score integer,collected_gold integer,seconds integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare st public.students;r public.dm_break_runs;v jsonb;g int;ver bigint;best int;elapsed numeric;
begin
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_break_runs where id=run_key and student_id=actor for update;
 if not found then raise exception 'Oyun bulunamadı.';end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Hesap bilgileri hazır değil.';end if;
 select coalesce(max(b.score),0) into best from public.dm_break_runs b where b.student_id=actor and b.game=r.game and b.status='finished' and b.id<>run_key;
 if r.status='finished' then
  return public.dm_break_status(actor)||jsonb_build_object('runId',r.id,'finished',true,'score',r.score,'gold',r.gold,'record',r.score>best,'yo',v);
 end if;
 elapsed:=extract(epoch from clock_timestamp()-r.created_at);
 if seconds is null or seconds>elapsed+1 or elapsed>7200 then raise exception 'Oyun süresi doğrulanamadı.';end if;
 g:=public.dm_break_reward(r.game,score,collected_gold,seconds);
 ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
 v:=v||jsonb_build_object('altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
 update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
 update public.students set gold=(v->>'altin')::numeric where id=actor;
 select value into v from public.extra_data where student_id=actor and key_name='yo';
 update public.dm_break_runs set score=dm_break_finish.score,gold=g,status='finished',finished_at=now() where id=run_key returning * into r;
 return public.dm_break_status(actor)||jsonb_build_object('runId',r.id,'finished',true,'score',r.score,'gold',g,'record',r.score>best,'yo',v);
end $$;

create function public.dm_break_ranking(actor uuid,game_code text,period text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if game_code is null or game_code not in ('kosu','zipla','patlat') or period is null or period not in ('week','all') then raise exception 'Geçersiz sıralama.';end if;
 if not exists(select 1 from public.students where id=actor and status='approved' and role='student') then raise exception 'Öğrenci oturumu gerekli.';end if;
 with best as (
  select distinct on (r.student_id) r.student_id,s.username,r.score,r.finished_at
  from public.dm_break_runs r join public.students s on s.id=r.student_id
  where r.game=game_code and r.status='finished' and s.status='approved' and s.role='student'
   and s.id<>'dcde2026-1015-4000-8000-000000000001'::uuid and lower(s.username)<>'dijimedu_demo'
   and (period='all' or r.finished_at>=date_trunc('week',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul')
  order by r.student_id,r.score desc,r.finished_at,r.id
 ), ranked as (
  select row_number() over(order by score desc,finished_at,student_id) rank,username name,score,student_id=actor mine from best
 ) select jsonb_build_object('ok',true,'liste',coalesce((select jsonb_agg(to_jsonb(t) order by t.rank) from ranked t where rank<=50),'[]'::jsonb),'me',(select to_jsonb(t) from ranked t where mine)) into result;
 return result;
end $$;
revoke all on function public.dm_break_status(uuid),public.dm_break_start(uuid,uuid,text),public.dm_break_reward(text,int,int,int),public.dm_break_finish(uuid,uuid,int,int,int),public.dm_break_ranking(uuid,text,text) from public,anon,authenticated;
grant execute on function public.dm_break_status(uuid),public.dm_break_start(uuid,uuid,text),public.dm_break_reward(text,int,int,int),public.dm_break_finish(uuid,uuid,int,int,int),public.dm_break_ranking(uuid,text,text) to service_role;
commit;
