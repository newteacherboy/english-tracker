-- Fifteen-question races, two hearts; keep saved twelve-question races resumable.
alter table public.dm_rally_runs alter column state set default '{"index":0,"correct":0,"wrong":0,"hearts":2,"score":0,"combo":0,"bestCombo":0,"elapsed":0,"answers":[]}';
update public.dm_rally_runs set state=jsonb_set(state,'{hearts}',to_jsonb(greatest(0,2-(state->>'wrong')::int))) where status='playing';

create or replace function public.dm_rally_view(r public.dm_rally_runs) returns jsonb language sql security invoker set search_path='' as $$
select jsonb_build_object('ok',true,'runId',r.id,'totalQuestions',jsonb_array_length(r.deck),'classNo',r.class_no,'units',to_jsonb(r.units),'difficulty',r.difficulty,'finished',r.status='finished','state',r.state,'reward',r.reward,
 'question',case when r.status='playing' then (r.deck->(r.state->>'index')::int)-'answer'-'en'-'tr' else null end);
$$;

create or replace function public.dm_rally_start(actor uuid,run_key uuid,class_id int,unit_ids int[],question_deck jsonb,pace text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare st public.students;r public.dm_rally_runs;available int;ticks int;v jsonb;
begin
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci hesabı gerekli.';end if;
 select * into r from public.dm_rally_runs where id=run_key;
 if found then if r.student_id<>actor then raise exception 'Yarış bulunamadı.';end if;return public.dm_rally_view(r);end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo';
 if public.dm_student_level(coalesce((v->>'totalXp')::numeric,0))<3 then raise exception 'Kelime Rallisi 3. seviyede açılır.';end if;
 if class_id is null or class_id not between 1 and 8 or cardinality(unit_ids) not between 1 and 10 or exists(select 1 from unnest(unit_ids) u where u is null or u not between 1 and 100) or pace not in ('easy','normal','hard') or jsonb_typeof(question_deck) is distinct from 'array' or jsonb_array_length(question_deck)<>15 then raise exception 'Geçerli sınıf, ünite ve 15 kelime gerekli.';end if;
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

create or replace function public.dm_rally_answer(actor uuid,run_key uuid,round_no int,lane int) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.dm_rally_runs;s jsonb;q jsonb;right_answer boolean;delta int;elapsed numeric;combo int;hearts int;last jsonb;
begin
 perform 1 from public.students where id=actor for update;
 select * into r from public.dm_rally_runs where id=run_key and student_id=actor for update;
 if not found then raise exception 'Yarış bulunamadı.';end if;
 if (r.state->>'hearts')::int<=0 and r.status='playing' then return public.dm_rally_finish(actor,run_key);end if;
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
 if round_no+1>=jsonb_array_length(r.deck) or hearts<=0 then return public.dm_rally_finish(actor,run_key);end if;
 return public.dm_rally_view(r);
end $$;
