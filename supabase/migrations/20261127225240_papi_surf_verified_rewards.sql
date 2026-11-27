-- Papi Dalga Sörfü: server-issued questions, transactional 5 XP per correct catch.
create table if not exists public.dm_surf_progress (
 student_id uuid primary key references public.students(id) on delete cascade,
 reward_day date not null default (now() at time zone 'Europe/Istanbul')::date,
 used integer not null default 0 check(used>=0),
 run_id uuid,
 run_started_at timestamptz,
 run_xp integer not null default 0 check(run_xp>=0),
 words integer not null default 0 check(words>=0),
 question jsonb,
 issued_at timestamptz,
 seen text[] not null default '{}',
 last_question uuid,
 last_reply jsonb,
 updated_at timestamptz not null default now()
);
alter table public.dm_surf_progress enable row level security;
revoke all on public.dm_surf_progress from public,anon,authenticated;
grant select,insert,update,delete on public.dm_surf_progress to service_role;

create or replace function public.dm_surf_question(p_grade integer,p_count integer,p_seen text[])
returns jsonb language plpgsql set search_path='' as $$
declare w record; opts jsonb; wanted boolean:=mod(p_count,3)<2;
begin
 select b.english en,b.turkish tr,b.class_no grade into w
 from public.word_bank b where b.active and b.class_no between 1 and 8 and length(trim(b.english)) between 1 and 26 and length(trim(b.turkish)) between 1 and 26
 and (case when wanted then b.class_no=p_grade else b.class_no<>p_grade end)
 and not(lower(trim(b.english))=any(coalesce(p_seen,'{}')))
 order by random() limit 1;
 if not found then
  select b.english en,b.turkish tr,b.class_no grade into w from public.word_bank b
  where b.active and length(trim(b.english)) between 1 and 26 and length(trim(b.turkish)) between 1 and 26
  and not(lower(trim(b.english))=any(coalesce(p_seen,'{}'))) order by random() limit 1;
 end if;
 if not found then
  select b.english en,b.turkish tr,b.class_no grade into w from public.word_bank b
  where b.active and length(trim(b.english)) between 1 and 26 and length(trim(b.turkish)) between 1 and 26 order by random() limit 1;
 end if;
 if not found then raise exception 'Kelime havuzu hazır değil.';end if;
 select jsonb_agg(v.tr order by random()) into opts from (
   select trim(w.tr) tr
   union all
   select q.tr from (select z.tr from (select distinct trim(b.turkish) tr from public.word_bank b where b.active and length(trim(b.turkish)) between 1 and 26 and lower(trim(b.turkish))<>lower(trim(w.tr))) z order by random() limit 2) q
 ) v;
 if jsonb_array_length(opts)<2 then raise exception 'Kelime seçenekleri hazır değil.';end if;
 return jsonb_build_object('id',gen_random_uuid(),'en',trim(w.en),'tr',trim(w.tr),'grade',w.grade,'options',opts);
end $$;
revoke all on function public.dm_surf_question(integer,integer,text[]) from public,anon,authenticated;
grant execute on function public.dm_surf_question(integer,integer,text[]) to service_role;

create or replace function public.dm_surf_play(p_actor uuid,p_op text,p_run uuid default null,p_question uuid default null,p_pick integer default null)
returns jsonb language plpgsql set search_path='' as $$
declare st public.students; s public.dm_surf_progress; today date:=(now() at time zone 'Europe/Istanbul')::date;
 day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); plan text; premium boolean; ads integer; remaining integer; grade integer;
 q jsonb; good boolean; v jsonb; ver bigint; result jsonb:='{}'; last_xp int:=0;
begin
 if p_op not in ('status','start','answer','finish') then raise exception 'Geçersiz işlem.';end if;
 select * into st from public.students where id=p_actor and status='approved' and role='student' and frozen_at is null for update;
 if not found or coalesce(st.profile->>'teacher_portal_guest','false')='true' or st.username='dijimedu_demo' then raise exception 'Kişisel öğrenci oturumu gerekli.';end if;
 insert into public.dm_surf_progress(student_id) values(p_actor) on conflict do nothing;
 select * into s from public.dm_surf_progress where student_id=p_actor for update;
 if s.reward_day<>today then s.reward_day:=today;s.used:=0;end if;
 plan:=public.dm_plan(p_actor,'student'); premium:=coalesce(plan in ('pro','premium','premium_pro','diji_pro','diji_premium_pro'),false);
 select count(*)::int into ads from dm_ad_rewards.premium_offers where student_id=p_actor and game='dalga-sorfu' and reward_day=today and redeemed_at is not null;
 remaining:=case when premium then 999 else greatest(0,2+ads-s.used) end;
 grade:=case when coalesce(st.selected_class,st.class_no) between 1 and 8 then coalesce(st.selected_class,st.class_no) else 5 end;
 if p_op='start' then
  if p_run is null then raise exception 'Geçersiz oyun oturumu.';end if;
  if s.run_id is distinct from p_run then
   if remaining<=0 then return jsonb_build_object('ok',false,'message','Bugünkü oyun hakkın doldu.','premium',premium,'remaining',remaining,'used',s.used,'adGrants',ads,'plan',plan);end if;
   if s.run_started_at is not null and s.run_started_at>clock_timestamp()-interval '1 second' then return jsonb_build_object('ok',false,'message','Yeni oyuna başlamak için bir saniye bekle.');end if;
   s.used:=s.used+1;s.run_id:=p_run;s.run_started_at:=clock_timestamp();s.run_xp:=0;s.words:=0;
   s.question:=public.dm_surf_question(grade,0,s.seen);s.issued_at:=clock_timestamp();s.seen:=array_append(s.seen,lower(s.question->>'en'));s.last_question:=null;s.last_reply:=null;
  end if;
 elsif p_op='answer' then
  if p_run is null or p_question is null or p_run is distinct from s.run_id then return jsonb_build_object('ok',false,'message','Oyun oturumu değişti.');end if;
  if p_question=s.last_question and s.last_reply is not null then return s.last_reply||jsonb_build_object('duplicate',true);end if;
  if s.question is null or p_question::text<>s.question->>'id' or p_pick is null or p_pick<0 or p_pick>=jsonb_array_length(s.question->'options') then return jsonb_build_object('ok',false,'message','Soru güncellendi.');end if;
  if s.run_started_at < clock_timestamp()-interval '2 hours' then return jsonb_build_object('ok',false,'message','Oturum süresi doldu.');end if;
  if s.issued_at>clock_timestamp()-interval '1 second' then return jsonb_build_object('ok',false,'message','Cevap henüz kaydedilemiyor.');end if;
  q:=s.question; good:=(q->'options'->>p_pick)=q->>'tr';s.last_question:=p_question;
  result:=jsonb_build_object('correct',good,'answer',q->>'tr','word',q->>'en');
  if good then
   insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold)
   values(p_actor,'surf:'||s.run_id::text||':'||day,'dalga-sorfu',grade,'{}',5,0)
   on conflict(student_id,run_id) do update set xp=public.dm_game_reward_runs.xp+5;
   insert into public.extra_data(student_id,key_name,value) values(p_actor,'yo',jsonb_build_object('totalXp',0,'altin',coalesce(st.gold,0))) on conflict(student_id,key_name) do nothing;
   select value into v from public.extra_data where student_id=p_actor and key_name='yo' for update;
   ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
   v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+5,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
   v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
   v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+5));
   v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));
   v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+5));
   update public.extra_data set value=v,updated_at=now() where student_id=p_actor and key_name='yo';
   s.run_xp:=s.run_xp+5;s.words:=s.words+1;last_xp:=5;
   s.question:=public.dm_surf_question(grade,s.words,s.seen);s.issued_at:=clock_timestamp();s.seen:=array_append(s.seen,lower(s.question->>'en'));
  else s.question:=null;end if;
 elsif p_op='finish' then
  if p_run is not distinct from s.run_id then s.question:=null;end if;
 end if;
 if cardinality(s.seen)>120 then s.seen:=s.seen[cardinality(s.seen)-119:cardinality(s.seen)];end if;
 remaining:=case when premium then 999 else greatest(0,2+ads-s.used) end;
 result:=result||jsonb_build_object('ok',true,'premium',premium,'plan',plan,'remaining',remaining,'used',s.used,'adGrants',ads,'runId',s.run_id,'question',s.question-'tr','words',s.words,'runXp',s.run_xp,'xp',last_xp);
 if p_op='answer' then
   if v is null then select value into v from public.extra_data where student_id=p_actor and key_name='yo';end if;
   result:=result||jsonb_build_object('yo',v);s.last_reply:=result;
 end if;
 update public.dm_surf_progress set reward_day=s.reward_day,used=s.used,run_id=s.run_id,run_started_at=s.run_started_at,run_xp=s.run_xp,words=s.words,question=s.question,issued_at=s.issued_at,seen=s.seen,last_question=s.last_question,last_reply=s.last_reply,updated_at=now() where student_id=p_actor;
 return result;
end $$;
revoke all on function public.dm_surf_play(uuid,text,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.dm_surf_play(uuid,text,uuid,uuid,integer) to service_role;
