-- Fair lesson reward ledger: server-side tier upgrades without replay farming.
-- Previously earned awards and completed lessons remain intact.
create table if not exists public.dm_lesson_fair_best (
 student_id uuid not null references public.students(id) on delete cascade,
 level text not null, category text not null, topic_name text not null,
 best_tier int not null default 0 check (best_tier in (0,30,60,80,100)),
 updated_at timestamptz not null default now(),
 primary key(student_id,level,category,topic_name)
);
create table if not exists public.dm_lesson_fair_runs (
 student_id uuid not null references public.students(id) on delete cascade,
 run_id text not null check(length(run_id) between 8 and 100),
 level text not null, category text not null, topic_name text not null,
 first_correct int not null, question_count int not null,
 wrong_indices jsonb not null default '[]'::jsonb,
 passed boolean not null default false, recovered boolean not null default false,
 created_at timestamptz not null default now(),
 primary key(student_id,run_id)
);
-- Protect awards earned before this rollout (no retroactive resets or second first-clear grants).
insert into public.dm_lesson_fair_best(student_id,level,category,topic_name,best_tier)
select distinct p.student_id,upper(p.level),p.category,p.topic_name,100
from public.lesson_progress p where p.test_success=true and p.student_id is not null
and p.level is not null and p.category is not null and p.topic_name is not null
on conflict do nothing;
create index if not exists dm_lesson_fair_runs_topic on public.dm_lesson_fair_runs(student_id,level,category,topic_name);
alter table public.dm_lesson_fair_best enable row level security;
alter table public.dm_lesson_fair_runs enable row level security;
revoke all on public.dm_lesson_fair_best, public.dm_lesson_fair_runs from public,anon,authenticated;
grant select,insert,update on public.dm_lesson_fair_best,public.dm_lesson_fair_runs to service_role;

create or replace function public.dm_lesson_fair_award(actor uuid,cefr text,category_name text,topic text,requested_tier int,historical boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $fair$
declare old_tier int:=0; new_tier int; gain_xp int:=0; gain_gold int:=0; v jsonb; today text; ver bigint;
begin
 if actor is null or requested_tier not in (30,60,80,100) then raise exception 'Geçersiz ders başarısı';end if;
 if not exists(select 1 from public.lesson_topics where active and upper(level)=upper(cefr) and category=category_name and topic_name=topic)
 or not exists(select 1 from public.lesson_progress where student_id=actor and upper(level)=upper(cefr) and category=category_name and topic_name=topic and test_success=true)
 then raise exception 'Onaylı ders bitirme kaydı bulunamadı';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,17));
 select best_tier into old_tier from public.dm_lesson_fair_best
 where student_id=actor and level=upper(cefr) and category=category_name and topic_name=topic for update;
 old_tier:=coalesce(old_tier,0);
 -- Historical completions never create another first-clear award.
 if historical and old_tier=0 then
  insert into public.dm_lesson_fair_best(student_id,level,category,topic_name,best_tier)
  values(actor,upper(cefr),category_name,topic,100)
  on conflict do nothing;
  return jsonb_build_object('xp',0,'gold',0,'tier',100,'historical',true);
 end if;
 new_tier:=greatest(old_tier,requested_tier);
 if new_tier=old_tier then return jsonb_build_object('xp',0,'gold',0,'tier',old_tier,'duplicate',true);end if;
 -- Fixed 80 XP/25 gold base. Higher performance earns only the difference.
 gain_xp:=round(80.0*new_tier/100)-round(80.0*old_tier/100);
 gain_gold:=round(25.0*new_tier/100)-round(25.0*old_tier/100);
 insert into public.dm_lesson_fair_best(student_id,level,category,topic_name,best_tier)
 values(actor,upper(cefr),category_name,topic,new_tier)
 on conflict(student_id,level,category,topic_name) do update set
 best_tier=excluded.best_tier,updated_at=now();
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Öğrenci ödül cüzdanı bulunamadı';end if;
 today:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
 ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
 v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+gain_xp,
 'altin',coalesce((v->>'altin')::numeric,0)+gain_gold,'guncelleme',ver,
 'dmRewardVersion',ver,'dmProgressProtocol',1);
 v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=today
 then v->'xpGun' else jsonb_build_object('tarih',today,'xp',0) end);
 v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+gain_xp));
 update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
 update public.students set gold=(v->>'altin')::numeric where id=actor;
 return jsonb_build_object('xp',gain_xp,'gold',gain_gold,'tier',new_tier,'yo',v);
end $fair$;
revoke all on function public.dm_lesson_fair_award(uuid,text,text,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.dm_lesson_fair_award(uuid,text,text,text,integer,boolean) to service_role;
