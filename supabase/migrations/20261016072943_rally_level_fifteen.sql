-- Enforce the fifteen-level requirement independently of browser controls.
create or replace function public.dm_rally_start(actor uuid,run_key uuid,class_id int,unit_ids int[],question_deck jsonb,pace text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare st public.students;r public.dm_rally_runs;available int;ticks int;v jsonb;
begin
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci hesabı gerekli.';end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo';
 if public.dm_student_level(coalesce((v->>'totalXp')::numeric,0))<15 then raise exception 'Kelime Rallisi 15. seviyede açılır.';end if;
 select * into r from public.dm_rally_runs where id=run_key;
 if found then if r.student_id<>actor then raise exception 'Yarış bulunamadı.';end if;return public.dm_rally_view(r);end if;
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
