-- Persistent ten-chapter break games. No XP changes; one gold payment per run.
begin;
alter table public.dm_break_runs
 add column start_chapter integer not null default 1 check(start_chapter between 1 and 10),
 add column chapter integer not null default 1 check(chapter between 1 and 10),
 add column highest_chapter integer not null default 1 check(highest_chapter between 1 and 10),
 add column chapter_start_score integer not null default 0,
 add column checkpoint_score integer not null default 0,
 add column checkpoint_seconds integer not null default 0,
 add column completed_all boolean not null default false;
create table public.dm_break_chapters(game text not null check(game in ('kosu','zipla','patlat')),chapter integer not null check(chapter between 1 and 10),title text not null,theme text not null,goal integer not null check(goal>0),primary key(game,chapter));
create table public.dm_break_progress(student_id uuid not null references public.students(id) on delete cascade,game text not null check(game in ('kosu','zipla','patlat')),unlocked_chapter integer not null default 1 check(unlocked_chapter between 1 and 10),completed_all boolean not null default false,updated_at timestamptz not null default now(),primary key(student_id,game));
create table public.dm_break_checkpoints(run_id uuid not null references public.dm_break_runs(id) on delete cascade,chapter integer not null check(chapter between 1 and 10),score integer not null,seconds integer not null,created_at timestamptz not null default now(),primary key(run_id,chapter));
alter table public.dm_break_chapters enable row level security;
alter table public.dm_break_progress enable row level security;
alter table public.dm_break_checkpoints enable row level security;
revoke all on public.dm_break_chapters,public.dm_break_progress,public.dm_break_checkpoints from public,anon,authenticated;
grant all on public.dm_break_chapters,public.dm_break_progress,public.dm_break_checkpoints to service_role;
insert into public.dm_break_chapters(game,chapter,title,theme,goal) values
('kosu',1,'Yeşil Vadi','vadi',400),
('kosu',2,'Turkuaz Sahil','sahil',700),
('kosu',3,'Sihirli Orman','orman',1100),
('kosu',4,'Altın Çöl','col',1700),
('kosu',5,'Karlı Zirve','kar',2500),
('kosu',6,'Mantar Diyarı','mantar',3500),
('kosu',7,'Neon Şehir','gece',4800),
('kosu',8,'Lav Vadisi','lav',6500),
('kosu',9,'Yıldız Galaksisi','uzay',8500),
('kosu',10,'Kristal Krallık','kristal',11000),
('zipla',1,'Yeşil Vadi','vadi',100),
('zipla',2,'Turkuaz Sahil','sahil',180),
('zipla',3,'Sihirli Orman','orman',300),
('zipla',4,'Altın Çöl','col',480),
('zipla',5,'Karlı Zirve','kar',720),
('zipla',6,'Mantar Diyarı','mantar',1050),
('zipla',7,'Neon Şehir','gece',1500),
('zipla',8,'Lav Vadisi','lav',2100),
('zipla',9,'Yıldız Galaksisi','uzay',2900),
('zipla',10,'Kristal Krallık','kristal',4000),
('patlat',1,'Yeşil Vadi','vadi',1800),
('patlat',2,'Turkuaz Sahil','sahil',3500),
('patlat',3,'Sihirli Orman','orman',6500),
('patlat',4,'Altın Çöl','col',11000),
('patlat',5,'Karlı Zirve','kar',18000),
('patlat',6,'Mantar Diyarı','mantar',28000),
('patlat',7,'Neon Şehir','gece',42000),
('patlat',8,'Lav Vadisi','lav',60000),
('patlat',9,'Yıldız Galaksisi','uzay',85000),
('patlat',10,'Kristal Krallık','kristal',120000);

create function public.dm_break_run_view(r public.dm_break_runs) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('runId',r.id,'finished',r.status='finished','score',r.score,'gold',r.gold,'chapter',r.chapter,'chapterStartScore',r.chapter_start_score,'highestChapter',r.highest_chapter,'completedAll',r.completed_all,'goal',(select goal from public.dm_break_chapters where game=r.game and chapter=r.chapter));
$$;
create or replace function public.dm_break_status(actor uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare st public.students;d text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');games jsonb;available int;
begin
 select * into st from public.students where id=actor and status='approved' and role='student';
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 available:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int) end;
 select jsonb_object_agg(g,jsonb_build_object('unlocked',coalesce((select p.unlocked_chapter from public.dm_break_progress p where p.student_id=actor and p.game=g),1),'currentChapter',coalesce((select p.unlocked_chapter from public.dm_break_progress p where p.student_id=actor and p.game=g),1),'completedAll',coalesce((select p.completed_all from public.dm_break_progress p where p.student_id=actor and p.game=g),false),'chapters',(select jsonb_agg(jsonb_build_object('chapter',c.chapter,'title',c.title,'goal',c.goal,'theme',c.theme) order by c.chapter) from public.dm_break_chapters c where c.game=g),'remaining',greatest(0,2-(select count(*) from public.dm_break_runs r where r.student_id=actor and r.day=d and r.game=g)))) into games from unnest(array['kosu','zipla','patlat']) g;
 return jsonb_build_object('ok',true,'day',d,'games',games,'energy',available,'energyMax',st.energy_max);
end $$;

create function public.dm_break_start(actor uuid,run_key uuid,game_code text,chapter_no integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare st public.students;r public.dm_break_runs;available int;ticks int;chosen int;unlocked int;d text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 if run_key is null or game_code is null or game_code not in ('kosu','zipla','patlat') then raise exception 'Geçersiz oyun.';end if;
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_break_runs where id=run_key;
 if found then
  if r.student_id<>actor or r.game<>game_code then raise exception 'Oyun bulunamadı.';end if;
  return public.dm_break_status(actor)||public.dm_break_run_view(r);
 end if;
 select coalesce((select p.unlocked_chapter from public.dm_break_progress p where p.student_id=actor and p.game=game_code),1) into unlocked;
 chosen:=coalesce(chapter_no,unlocked);
 if chosen<1 or chosen>unlocked or chosen>10 then raise exception 'Bu bölüm henüz açılmadı.';end if;
 if (select count(*) from public.dm_break_runs where student_id=actor and day=d and game=game_code)>=2 then raise exception 'Bugünkü 2 hakkın bitti, yarın yine gel';end if;
 ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900));
 available:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+ticks) end;
 if available<5 then raise exception 'Oyuna başlamak için 5 enerji gerekli.';end if;
 insert into public.dm_break_runs(id,student_id,game,day,start_chapter,chapter,highest_chapter) values(run_key,actor,game_code,d,chosen,chosen,chosen) returning * into r;
 update public.students set energy=available-5,energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
 insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-5,available-5,'mola:'||run_key);
 return public.dm_break_status(actor)||public.dm_break_run_view(r);
end $$;


-- Preserve existing clients during the migration/function rollout.
create or replace function public.dm_break_start(actor uuid,run_key uuid,game_code text) returns jsonb language sql security invoker set search_path='' as $$ select public.dm_break_start(actor,run_key,game_code,null::integer); $$;
create or replace function public.dm_break_reward(game_code text,score integer,collected_gold integer,seconds integer) returns integer
language plpgsql immutable security invoker set search_path='' as $$
declare rate int;unit int;
begin
 if game_code is null or game_code not in ('kosu','zipla','patlat') or seconds is null or seconds<0 or seconds>1800 or score is null or score<0 or collected_gold is null or collected_gold<0 then raise exception 'Geçersiz oyun sonucu.';end if;
 rate:=case game_code when 'kosu' then 35 when 'zipla' then 60 else 2500 end;
 unit:=case game_code when 'kosu' then 100 when 'zipla' then 150 else 1000 end;
 if score>seconds*rate+(case when game_code='patlat' then 0 else 3 end) then raise exception 'Oyun sonucu süreyle uyuşmuyor.';end if;
 return least(100,least(collected_gold,seconds*3,case game_code when 'patlat' then score/60 else score/5 end)+least(20,score/unit));
end $$;


create function public.dm_break_checkpoint(actor uuid,run_key uuid,chapter_no integer,score integer,seconds integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.dm_break_runs;goal int;elapsed numeric;unlocked int;
begin
 perform 1 from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_break_runs where id=run_key and student_id=actor for update;
 if not found then raise exception 'Oyun bulunamadı.';end if;
 if exists(select 1 from public.dm_break_checkpoints c where c.run_id=run_key and c.chapter=chapter_no) then return public.dm_break_status(actor)||public.dm_break_run_view(r)||jsonb_build_object('duplicate',true);end if;
 if r.status<>'playing' or r.completed_all or chapter_no is null or chapter_no<>r.chapter then raise exception 'Geçersiz bölüm sırası.';end if;
 elapsed:=extract(epoch from clock_timestamp()-r.created_at);
 if seconds is null or seconds>elapsed+1 or elapsed>7200 or seconds<r.checkpoint_seconds or score<r.checkpoint_score then raise exception 'Oyun süresi doğrulanamadı.';end if;
 perform public.dm_break_reward(r.game,score,0,seconds);
 select c.goal into goal from public.dm_break_chapters c where c.game=r.game and c.chapter=r.chapter;
 if score-r.chapter_start_score<goal then raise exception 'Bölüm eşiği henüz tamamlanmadı.';end if;
 insert into public.dm_break_checkpoints(run_id,chapter,score,seconds) values(run_key,r.chapter,score,seconds);
 unlocked:=least(10,r.chapter+1);
 insert into public.dm_break_progress(student_id,game,unlocked_chapter,completed_all) values(actor,r.game,unlocked,r.chapter=10)
 on conflict(student_id,game) do update set unlocked_chapter=greatest(public.dm_break_progress.unlocked_chapter,excluded.unlocked_chapter),completed_all=public.dm_break_progress.completed_all or excluded.completed_all,updated_at=now();
 update public.dm_break_runs set chapter=unlocked,highest_chapter=greatest(highest_chapter,unlocked),chapter_start_score=dm_break_checkpoint.score,checkpoint_score=dm_break_checkpoint.score,checkpoint_seconds=dm_break_checkpoint.seconds,score=dm_break_checkpoint.score,completed_all=(r.chapter=10) where id=run_key returning * into r;
 return public.dm_break_status(actor)||public.dm_break_run_view(r)||jsonb_build_object('completedChapter',chapter_no,'duplicate',false);
end $$;
create or replace function public.dm_break_finish(actor uuid,run_key uuid,score integer,collected_gold integer,seconds integer) returns jsonb
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
  return public.dm_break_status(actor)||jsonb_build_object('runId',r.id,'finished',true,'score',r.score,'gold',r.gold,'record',r.score>best,'yo',v)||public.dm_break_run_view(r);
 end if;
 elapsed:=extract(epoch from clock_timestamp()-r.created_at);
 if seconds is null or seconds>elapsed+1 or elapsed>7200 then raise exception 'Oyun süresi doğrulanamadı.';end if;
 if score<r.checkpoint_score or seconds<r.checkpoint_seconds then raise exception 'Oyun sonucu kayıtlı ilerlemenin gerisinde.';end if;
 g:=public.dm_break_reward(r.game,score,collected_gold,seconds);
 if not r.completed_all and score-r.chapter_start_score>=(select c.goal from public.dm_break_chapters c where c.game=r.game and c.chapter=r.chapter) then
 perform public.dm_break_checkpoint(actor,run_key,r.chapter,score,seconds);select * into r from public.dm_break_runs where id=run_key;end if;
 ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
 v:=v||jsonb_build_object('altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
 update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
 update public.students set gold=(v->>'altin')::numeric where id=actor;
 select value into v from public.extra_data where student_id=actor and key_name='yo';
 update public.dm_break_runs set score=dm_break_finish.score,gold=g,status='finished',finished_at=now() where id=run_key returning * into r;
 return public.dm_break_status(actor)||jsonb_build_object('runId',r.id,'finished',true,'score',r.score,'gold',g,'record',r.score>best,'yo',v)||public.dm_break_run_view(r);
end $$;

create or replace function public.dm_break_ranking(actor uuid,game_code text,period text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if game_code is null or game_code not in ('kosu','zipla','patlat') or period is null or period not in ('week','all') then raise exception 'Geçersiz sıralama.';end if;
 if not exists(select 1 from public.students where id=actor and status='approved' and role='student') then raise exception 'Öğrenci oturumu gerekli.';end if;
 with best as (
  select distinct on (r.student_id) r.student_id,s.username,r.score,r.highest_chapter,coalesce(r.finished_at,r.created_at) finished_at
  from public.dm_break_runs r join public.students s on s.id=r.student_id
  where r.game=game_code and (r.status='finished' or r.checkpoint_score>0) and s.status='approved' and s.role='student'
   and s.id<>'dcde2026-1015-4000-8000-000000000001'::uuid and lower(s.username)<>'dijimedu_demo'
   and (period='all' or coalesce(r.finished_at,r.created_at)>=date_trunc('week',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul')
  order by r.student_id,r.highest_chapter desc,r.score desc,r.finished_at,r.id
 ), ranked as (
  select row_number() over(order by highest_chapter desc,score desc,finished_at,student_id) rank,username name,score,highest_chapter chapter,student_id=actor mine from best
 ) select jsonb_build_object('ok',true,'liste',coalesce((select jsonb_agg(to_jsonb(t) order by t.rank) from ranked t where rank<=50),'[]'::jsonb),'me',(select to_jsonb(t) from ranked t where mine)) into result;
 return result;
end $$;

revoke all on function public.dm_break_run_view(public.dm_break_runs),public.dm_break_start(uuid,uuid,text,integer),public.dm_break_checkpoint(uuid,uuid,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.dm_break_run_view(public.dm_break_runs),public.dm_break_start(uuid,uuid,text,integer),public.dm_break_checkpoint(uuid,uuid,integer,integer,integer) to service_role;
commit;
