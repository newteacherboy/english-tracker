begin;
create table public.dm_verified_runs(
 student_id uuid not null references public.students(id) on delete cascade,
 run_id text not null,game text not null,class_no int not null,units int[] not null,stop_no int not null default 0,
 deck jsonb not null,answers jsonb not null default '{}'::jsonb,events jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null default clock_timestamp()+interval '24 hours',
 primary key(student_id,run_id)
);
alter table public.dm_verified_runs enable row level security;
revoke all on public.dm_verified_runs from public,anon,authenticated;
grant all on public.dm_verified_runs to service_role;
create function public.dm_verified_start(actor uuid,run_key text,game_code text,cls int,unit_ids int[],stop_id int,tasks jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare r public.dm_verified_runs;
begin
 if run_key !~ '^[a-zA-Z0-9_-]{16,100}$' or jsonb_typeof(tasks)<>'array' or jsonb_array_length(tasks) not between 1 and 32 then raise exception 'Geçersiz oturum';end if;
 perform 1 from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci gerekli';end if;
 insert into public.dm_verified_runs(student_id,run_id,game,class_no,units,stop_no,deck) values(actor,run_key,game_code,cls,unit_ids,stop_id,tasks) on conflict do nothing;
 select * into r from public.dm_verified_runs where student_id=actor and run_id=run_key;
 if r.game<>game_code or r.class_no<>cls or r.units<>unit_ids or r.stop_no<>stop_id or r.deck<>tasks then raise exception 'Oturum kapsamı değiştirilemez';end if;
 return jsonb_build_object('answers',r.answers,'startedAt',r.created_at);
end $$;
create function public.dm_verified_answer(actor uuid,run_key text,slot_no int,event_key text,is_correct boolean,is_complete boolean)
returns jsonb language plpgsql set search_path='' as $$
declare r public.dm_verified_runs; s jsonb; good boolean; reply jsonb; energy jsonb;
begin
 if event_key !~ '^[a-zA-Z0-9_-]{16,100}$' or slot_no not between 0 and 31 or is_correct is null or is_complete is null then raise exception 'Geçersiz cevap';end if;
 perform 1 from public.students where id=actor for update;
 select * into r from public.dm_verified_runs where student_id=actor and run_id=run_key for update;
 if not found or r.expires_at<clock_timestamp() or slot_no>=jsonb_array_length(r.deck) then raise exception 'Oturum sona erdi';end if;
 if r.events ? event_key then return r.events->event_key;end if;
 if (select count(*) from jsonb_object_keys(r.events))>=2000 then raise exception 'Oturum işlem sınırı';end if;
 s:=coalesce(r.answers->slot_no::text,jsonb_build_object('misses',0,'complete',false));
 if coalesce((s->>'complete')::boolean,false) then return jsonb_build_object('correct',s->'correct','duplicate',true);end if;
 good:=is_correct and coalesce((s->>'misses')::int,0)=0;
 s:=s||jsonb_build_object('misses',coalesce((s->>'misses')::int,0)+case when is_correct then 0 else 1 end,'complete',is_complete,'correct',is_correct,'firstCorrect',good);
 if r.game='ba' and is_complete then
   energy:=public.dm_parkur_question_step(actor,run_key,slot_no+1,good);
 end if;
 reply:=jsonb_build_object('correct',is_correct,'firstCorrect',good,'complete',is_complete,'energy',energy);
 update public.dm_verified_runs set answers=jsonb_set(r.answers,array[slot_no::text],s),events=jsonb_set(r.events,array[event_key],reply)
 where student_id=actor and run_id=run_key;
 return reply;
end $$;
create function public.dm_verified_result(actor uuid,run_key text,game_code text,cls int,unit_ids int[],stop_id int)
returns jsonb language plpgsql set search_path='' as $$
declare r public.dm_verified_runs; right_n int;wrong_n int;completed_n int;
begin
 select * into r from public.dm_verified_runs where student_id=actor and run_id=run_key;
 if not found or r.game<>game_code or r.class_no<>cls or r.units<>unit_ids or r.stop_no<>stop_id or r.expires_at<clock_timestamp() then raise exception 'Doğrulanmış oyun oturumu gerekli. Uygulamayı yenileyip yeniden başlat.';end if;
 select count(*) filter(where (value->>'complete')::boolean and (value->>'correct')::boolean),coalesce(sum((value->>'misses')::int),0),count(*) filter(where (value->>'complete')::boolean) into right_n,wrong_n,completed_n from jsonb_each(r.answers);
 if r.answers='{}'::jsonb then raise exception 'Doğrulanmış cevap bulunamadı';end if;
 return jsonb_build_object('correct',right_n,'wrong',wrong_n,'complete',completed_n,'total',jsonb_array_length(r.deck),'seconds',greatest(1,extract(epoch from clock_timestamp()-r.created_at)));
end $$;
revoke all on function public.dm_verified_start(uuid,text,text,int,int[],int,jsonb) from public,anon,authenticated;
revoke all on function public.dm_verified_answer(uuid,text,int,text,boolean,boolean) from public,anon,authenticated;
revoke all on function public.dm_verified_result(uuid,text,text,int,int[],int) from public,anon,authenticated;
grant execute on function public.dm_verified_start(uuid,text,text,int,int[],int,jsonb) to service_role;
grant execute on function public.dm_verified_answer(uuid,text,int,text,boolean,boolean) to service_role;
grant execute on function public.dm_verified_result(uuid,text,text,int,int[],int) to service_role;
commit;
