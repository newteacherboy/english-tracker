create or replace function public.dm_verified_result(actor uuid,run_key text,game_code text,cls int,unit_ids int[],stop_id int)
returns jsonb language plpgsql set search_path='' as $$
declare r public.dm_verified_runs; right_n int;wrong_n int;completed_n int;
begin
 select * into r from public.dm_verified_runs where student_id=actor and run_id=run_key;
 if not found or r.game<>game_code or r.class_no<>cls or r.units<>unit_ids or r.stop_no<>stop_id or r.expires_at<clock_timestamp() then raise exception 'Doğrulanmış oyun oturumu gerekli. Uygulamayı yenileyip yeniden başlat.';end if;
 select count(*) filter(where (value->>'complete')::boolean and (value->>'correct')::boolean),coalesce(sum((value->>'misses')::int),0),count(*) filter(where (value->>'complete')::boolean) into right_n,wrong_n,completed_n from jsonb_each(r.answers);
 if r.answers='{}'::jsonb then raise exception 'Doğrulanmış cevap bulunamadı';end if;
 if game_code='ba' then
  if completed_n<>12 then raise exception 'Parkurun 12 cevabı doğrulanmalı';end if;
  update public.dm_parkur_question_ledger l set answered=true,correct=coalesce((r.answers->(l.question_no-1)::text->>'firstCorrect')::boolean,false) where l.student_id=actor and l.run_id=run_key;
 end if;
 return jsonb_build_object('correct',right_n,'wrong',wrong_n,'complete',completed_n,'total',jsonb_array_length(r.deck),'seconds',greatest(1,extract(epoch from clock_timestamp()-r.created_at)));
end $$;
