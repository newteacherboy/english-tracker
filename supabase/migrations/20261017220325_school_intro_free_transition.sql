-- Teaching and the first question are free. Later questions keep the same
-- atomic ledger, replay protection and verified-answer accounting.
CREATE OR REPLACE FUNCTION public.dm_parkur_question_step(actor uuid, run_key text, step_no integer, passed boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; oldrow public.dm_parkur_question_ledger; ticks int; balance int; cost int:=case when step_no<=2 then 0 else 1 end; consecutive int:=0; i int; rowdata record; gain int:=0;
begin
 if actor is null or run_key !~ '^[a-zA-Z0-9_-]{16,100}$' or step_no not between 1 and 12 then raise exception 'Geçersiz parkur isteği';end if;
 select * into st from public.students where id=actor for update;
 if not found then raise exception 'Öğrenci bulunamadı';end if;
 if passed is null then
   select * into oldrow from public.dm_parkur_question_ledger where student_id=actor and run_id=run_key and question_no=step_no;
   if found then return jsonb_build_object('ok',true,'duplicate',true,'energy',st.energy,'max',st.energy_max);end if;
   if step_no>1 and not exists(select 1 from public.dm_parkur_question_ledger where student_id=actor and run_id=run_key and question_no=step_no-1 and answered) then raise exception 'Önceki soru tamamlanmadı';end if;
   ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900));
   balance:=least(st.energy_max,st.energy+ticks);
   if balance<cost then raise exception 'Enerji yetersiz';end if;
   insert into public.dm_parkur_question_ledger(student_id,run_id,question_no) values(actor,run_key,step_no);
   update public.students set energy=balance-cost, energy_updated_at=case when balance=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
   if cost>0 then insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-cost,balance-cost,'parkur-question:'||run_key||':'||step_no);end if;
   return jsonb_build_object('ok',true,'energy',balance-cost,'max',st.energy_max,'charged',cost);
 end if;
 select * into oldrow from public.dm_parkur_question_ledger where student_id=actor and run_id=run_key and question_no=step_no for update;
 
 if not found then
   -- Some clients submit the answer without a successful preceding charge request.
   -- Charge and create the ledger atomically before recording the answer.
   if step_no>1 and not exists (
     select 1 from public.dm_parkur_question_ledger
     where student_id=actor and run_id=run_key and question_no=step_no-1 and answered
   ) then
     raise exception 'Önceki soru tamamlanmadı';
   end if;
   ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900));
   balance:=least(st.energy_max,st.energy+ticks);
   if balance<cost then raise exception 'Enerji yetersiz';end if;
   insert into public.dm_parkur_question_ledger(student_id,run_id,question_no)
     values(actor,run_key,step_no)
     returning * into oldrow;
   update public.students
     set energy=balance-cost,
         energy_updated_at=case when balance=st.energy_max then now()
           else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end
     where id=actor;
   if cost>0 then insert into public.energy_transactions(student_id,change_amount,balance_after,reason)
     values(actor,-cost,balance-cost,'parkur-question:'||run_key||':'||step_no);end if;
   st.energy:=balance-cost;
 end if;

 if oldrow.answered then return jsonb_build_object('ok',true,'duplicate',true,'energy',st.energy,'gain',0);end if;
 update public.dm_parkur_question_ledger set answered=true,correct=passed where student_id=actor and run_id=run_key and question_no=step_no;
 if passed and step_no>=3 then
   for i in reverse step_no..1 loop
     if exists(select 1 from public.dm_parkur_question_ledger where student_id=actor and run_id=run_key and question_no=i and answered and correct) then
       consecutive:=consecutive+1;
     else exit;end if;
   end loop;
   if consecutive>=3 and consecutive%3=0 then gain:=1;end if;
 end if;
 if gain>0 then
   balance:=least(st.energy_max,st.energy+gain);gain:=balance-st.energy;
   if gain>0 then
    update public.students set energy=balance where id=actor;
    insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,gain,balance,'parkur-combo:'||run_key||':'||step_no);
   end if;
 end if;
 return jsonb_build_object('ok',true,'energy',st.energy+gain,'max',st.energy_max,'gain',gain);
end $function$;
