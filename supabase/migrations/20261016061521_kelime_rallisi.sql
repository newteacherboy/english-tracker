-- Server-owned vocabulary races. No browser can choose answers, scores or wallet rewards.
create table public.dm_rally_runs (
 id uuid primary key, student_id uuid not null references public.students(id) on delete cascade,
 class_no int not null check(class_no between 1 and 8), units int[] not null,
 difficulty text not null check(difficulty in ('easy','normal','hard')),
 deck jsonb not null, state jsonb not null default '{"index":0,"correct":0,"wrong":0,"hearts":3,"score":0,"combo":0,"bestCombo":0,"elapsed":0,"answers":[]}',
 status text not null default 'playing' check(status in ('playing','finished')),
 reward jsonb, created_at timestamptz not null default now(),round_at timestamptz not null default now(),finished_at timestamptz
);
create index dm_rally_history on public.dm_rally_runs(student_id,created_at desc);
create index dm_rally_ranking on public.dm_rally_runs(class_no,finished_at desc) where status='finished';
alter table public.dm_rally_runs enable row level security;
revoke all on public.dm_rally_runs from public,anon,authenticated;
grant all on public.dm_rally_runs to service_role;

create function public.dm_rally_view(r public.dm_rally_runs) returns jsonb language sql security invoker set search_path='' as $$
select jsonb_build_object('ok',true,'runId',r.id,'classNo',r.class_no,'units',to_jsonb(r.units),'difficulty',r.difficulty,'finished',r.status='finished','state',r.state,'reward',r.reward,
 'question',case when r.status='playing' then (r.deck->(r.state->>'index')::int)-'answer'-'en'-'tr' else null end);
$$;

create function public.dm_rally_start(actor uuid,run_key uuid,class_id int,unit_ids int[],question_deck jsonb,pace text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare st public.students;r public.dm_rally_runs;available int;ticks int;v jsonb;
begin
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci hesabı gerekli.';end if;
 select * into r from public.dm_rally_runs where id=run_key;
 if found then if r.student_id<>actor then raise exception 'Yarış bulunamadı.';end if;return public.dm_rally_view(r);end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo';
 if public.dm_student_level(coalesce((v->>'totalXp')::numeric,0))<3 then raise exception 'Kelime Rallisi 3. seviyede açılır.';end if;
 if class_id is null or class_id not between 1 and 8 or cardinality(unit_ids) not between 1 and 10 or exists(select 1 from unnest(unit_ids) u where u is null or u not between 1 and 100) or pace not in ('easy','normal','hard') or jsonb_typeof(question_deck) is distinct from 'array' or jsonb_array_length(question_deck)<>12 then raise exception 'Geçerli sınıf, ünite ve 12 kelime gerekli.';end if;
 if exists(select 1 from jsonb_array_elements(question_deck) q where jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options')<>3 or (q->>'answer')::int not between 0 and 2 or nullif(q->>'word','') is null) then raise exception 'Geçersiz yarış kelimeleri.';end if;
 if (select count(*) from public.dm_rally_runs where student_id=actor and created_at>now()-interval '1 minute')>=5 then raise exception 'Yeni yarış için kısa bir süre bekle.';end if;
 ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900));
 available:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+ticks) end;
 if available<3 then raise exception 'Yarışa başlamak için 3 enerji gerekli.';end if;
 insert into public.dm_rally_runs(id,student_id,class_no,units,difficulty,deck) values(run_key,actor,class_id,unit_ids,pace,question_deck) returning * into r;
 update public.students set energy=available-3,energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
 insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-3,available-3,'ralli:'||run_key);
 return public.dm_rally_view(r)||jsonb_build_object('energy',available-3,'energyMax',st.energy_max);
end $$;

create function public.dm_rally_finish(actor uuid,run_key uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.dm_rally_runs;v jsonb;s jsonb;c int;w int;x int:=0;g int:=0;n int;speed int;daily numeric;secs numeric;ver bigint;result jsonb;st public.students;day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 select * into st from public.students where id=actor for update;
 select * into r from public.dm_rally_runs where id=run_key and student_id=actor for update;
 if not found then raise exception 'Yarış bulunamadı.';end if;
 if r.reward is not null then return public.dm_rally_view(r);end if;
 s:=r.state;c:=(s->>'correct')::int;w:=(s->>'wrong')::int;secs:=greatest(1,(s->>'elapsed')::numeric);
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Hesap bilgileri hazır değil.';end if;
 if c>0 then
  select count(*)+1 into n from public.dm_game_reward_runs where student_id=actor and game_key<>'ba' and xp>0 and created_at>=day::date::timestamp at time zone 'Europe/Istanbul';
  daily:=case when n<=3 then 2 when n>12 then .5 else 1 end;
  speed:=round(c*600/(1+secs/c));x:=round(least(96,greatest(0,c*6+floor(speed/100.0)-w*3))*daily);
  g:=case when x=0 then 0 else round((array[4,7,10])[case when c::numeric/(c+w)>=.8 then 3 when c::numeric/(c+w)>=.5 then 2 else 1 end]*daily) end;
 end if;
 -- One wallet credit and one competitive score per run, within the same transaction.
 insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values(actor,run_key::text,'ralli',r.class_no,r.units,x,g);
 if x>0 or g>0 then
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
  v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
  v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
  update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';update public.students set gold=(v->>'altin')::numeric where id=actor;
  select value into v from public.extra_data where student_id=actor and key_name='yo';
 end if;
 insert into public.game_scores(student_id,student_name,game_key,class_no,unit_no,unit_name,score,correct_count,wrong_count,duration_seconds,extra)
 values(actor,st.username,'ralli',r.class_no,r.units[1],array_to_string(r.units,','),(s->>'score')::int,c,w,ceil(secs)::int,jsonb_build_object('v',3,'speed',coalesce(speed,0),'run_id',run_key,'reward_protocol',1));
 if actor<>'dcde2026-1015-4000-8000-000000000001'::uuid then
 insert into public.feed_events(student_id,event_type,payload) values(actor,'game_score',jsonb_build_object('game_name','Kelime Rallisi','game_key','ralli','score',(s->>'score')::int,'icon','🏎️'));
 end if;
 result:=jsonb_build_object('xp',x,'gold',g,'reason',case when c=0 then 'no_correct' else 'awarded' end,'yo',v);
 update public.dm_rally_runs set status='finished',reward=result,finished_at=now() where id=run_key returning * into r;
 return public.dm_rally_view(r);
end $$;

create function public.dm_rally_answer(actor uuid,run_key uuid,round_no int,lane int) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.dm_rally_runs;s jsonb;q jsonb;right_answer boolean;delta int;elapsed numeric;combo int;hearts int;last jsonb;
begin
 perform 1 from public.students where id=actor for update;
 select * into r from public.dm_rally_runs where id=run_key and student_id=actor for update;
 if not found then raise exception 'Yarış bulunamadı.';end if;
 if r.status='finished' or round_no<(r.state->>'index')::int then return public.dm_rally_view(r);end if;
 if round_no is null or round_no<>(r.state->>'index')::int or lane is null or lane not between 0 and 2 then raise exception 'Geçerli kelime kapısını seç.';end if;
 elapsed:=extract(epoch from clock_timestamp()-r.round_at);
 if elapsed<2 then raise exception 'Kelime kapısına henüz ulaşmadın.';end if;
 if now()-r.created_at>interval '4 hours' then return public.dm_rally_finish(actor,run_key);end if;
 q:=r.deck->round_no;right_answer:=lane=(q->>'answer')::int;s:=r.state;
 delta:=case when right_answer then 100+greatest(0,least(40,round(50-least(60,elapsed)*3)::int)) else -40 end;
 combo:=case when right_answer then (s->>'combo')::int+1 else 0 end;hearts:=(s->>'hearts')::int-case when right_answer then 0 else 1 end;
 last:=jsonb_build_object('round',round_no,'correct',right_answer,'answer',q->'options'->(q->>'answer')::int,'word',q->'word','en',q->'en','tr',q->'tr','lane',lane,'correctLane',(q->>'answer')::int,'delta',delta);
 s:=s||jsonb_build_object('index',round_no+1,'correct',(s->>'correct')::int+case when right_answer then 1 else 0 end,'wrong',(s->>'wrong')::int+case when right_answer then 0 else 1 end,'hearts',hearts,'score',greatest(0,(s->>'score')::int+delta),'combo',combo,'bestCombo',greatest((s->>'bestCombo')::int,combo),'elapsed',(s->>'elapsed')::numeric+elapsed,'last',last,'answers',(s->'answers')||jsonb_build_array(last));
 update public.dm_rally_runs set state=s,round_at=clock_timestamp() where id=run_key returning * into r;
 if round_no+1>=12 or hearts<=0 then return public.dm_rally_finish(actor,run_key);end if;
 return public.dm_rally_view(r);
end $$;

revoke all on function public.dm_rally_view(public.dm_rally_runs),public.dm_rally_start(uuid,uuid,int,int[],jsonb,text),public.dm_rally_finish(uuid,uuid),public.dm_rally_answer(uuid,uuid,int,int) from public,anon,authenticated;
grant execute on function public.dm_rally_view(public.dm_rally_runs),public.dm_rally_start(uuid,uuid,int,int[],jsonb,text),public.dm_rally_finish(uuid,uuid),public.dm_rally_answer(uuid,uuid,int,int) to service_role;
