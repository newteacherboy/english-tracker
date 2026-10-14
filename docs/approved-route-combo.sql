-- Preserve current ledgers, auth grants, replay locks and energy caps.
alter table public.papi_story_progress add column if not exists route_combo integer not null default 0;
CREATE OR REPLACE FUNCTION public.dm_parkur_question_step(actor uuid, run_key text, step_no integer, passed boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; oldrow public.dm_parkur_question_ledger; ticks int; balance int; consecutive int:=0; i int; rowdata record; gain int:=0;
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
   if balance<1 then raise exception 'Enerji yetersiz';end if;
   insert into public.dm_parkur_question_ledger(student_id,run_id,question_no) values(actor,run_key,step_no);
   update public.students set energy=balance-1, energy_updated_at=case when balance=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
   insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-1,balance-1,'parkur-question:'||run_key||':'||step_no);
   return jsonb_build_object('ok',true,'energy',balance-1,'max',st.energy_max,'charged',1);
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
   if balance<1 then raise exception 'Enerji yetersiz';end if;
   insert into public.dm_parkur_question_ledger(student_id,run_id,question_no)
     values(actor,run_key,step_no)
     returning * into oldrow;
   update public.students
     set energy=balance-1,
         energy_updated_at=case when balance=st.energy_max then now()
           else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end
     where id=actor;
   insert into public.energy_transactions(student_id,change_amount,balance_after,reason)
     values(actor,-1,balance-1,'parkur-question:'||run_key||':'||step_no);
   st.energy:=balance-1;
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
end $function$

;
CREATE OR REPLACE FUNCTION public.dm_story_apply(owner_key text, chapter_no integer, expected_cursor integer, expected_version integer, answer_correct boolean, is_question boolean, step_count integer, question_count integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare p public.papi_story_progress; s public.students; v jsonb; reward jsonb:='{}'; regen int; e int; cap int; costs int:=0; seen int; cur int; finished boolean; first_done boolean; stars int; l int; n int; g int:=0; bonus int:=0; combo int:=0; combo_gain int:=0;
begin
 if owner_key is null or owner_key !~ '^[st]:[0-9a-f-]{36}$' or chapter_no not between 0 and 79 or step_count not between 2 and 80 or question_count not between 1 and 80 or question_count>step_count or answer_correct is null or is_question is null then raise exception 'Geçersiz öğrenme işlemi';end if;
 if left(owner_key,2)='s:' then
  perform pg_advisory_xact_lock(hashtextextended(substring(owner_key from 3),17));
  select * into s from public.students where id=substring(owner_key from 3)::uuid for update;
  if not found then raise exception 'Öğrenci bulunamadı';end if;
 end if;
 select * into p from public.papi_story_progress where actor_key=owner_key and chapter=chapter_no for update;
 if not found then raise exception 'Önce durağı aç';end if;
 if p.version<>expected_version or p.cursor<>expected_cursor then return jsonb_build_object('ok',true,'stale',true,'progress',to_jsonb(p));end if;
 if p.cursor>=step_count then return jsonb_build_object('ok',true,'alreadyCompleted',true,'correct',true,'progress',to_jsonb(p));end if;
 seen:=p.questions_seen;
 if is_question and p.charged_cursor<>p.cursor then seen:=seen+1;if seen%2=0 then costs:=1;end if;end if;
 if s.id is not null then
  cap:=coalesce(nullif(s.energy_max,0),30);e:=coalesce(s.energy,0);
  if e<cap then
   regen:=greatest(0,floor(extract(epoch from (now()-coalesce(s.energy_updated_at,now())))/900)::int);
   if regen>0 then e:=least(cap,e+regen);end if;
  end if;
  -- Exhausted energy pauses a new question; a previously paid retry stays available.
  if is_question and p.charged_cursor<>p.cursor and e<1 then return jsonb_build_object('ok',false,'energyEmpty',true,'mesaj','Enerjin bitti. Enerji dolunca bu sorudan devam edebilirsin.','enerjiKalan',e,'enerjiMax',cap);end if;
  if e<>coalesce(s.energy,0) then
   insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(s.id,e-coalesce(s.energy,0),e,'dolum');
  end if;
  if costs>0 then insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(s.id,-costs,e-costs,'papi_story:'||chapter_no||':'||p.cursor);end if;
  update public.students set energy=e-costs,energy_updated_at=case when e>=cap or s.energy_updated_at is null then now() when regen>0 then s.energy_updated_at+regen*interval '15 minutes' else s.energy_updated_at end,updated_at=now() where id=s.id;
 end if;
 combo:=case when p.cursor=0 then 0 else p.route_combo end;
 if is_question then
  if not answer_correct then combo:=0;
  else combo:=combo+1;
  end if;
 end if;
 if s.id is not null and answer_correct and is_question and combo>0 and combo%3=0 then
  combo_gain:=least(1,greatest(0,cap-(e-costs)));
  if combo_gain>0 then
   update public.students set energy=e-costs+combo_gain where id=s.id;
   insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(s.id,combo_gain,e-costs+combo_gain,'story-combo:'||chapter_no||':'||p.version);
  end if;
 end if;
 cur:=p.cursor+case when answer_correct then 1 else 0 end;finished:=cur>=step_count;first_done:=finished and not p.reward_claimed;
 if first_done and s.id is not null then
  stars:=case when question_count::numeric/(question_count+p.mistakes+case when answer_correct then 0 else 1 end)>=.9 then 3 when question_count::numeric/(question_count+p.mistakes+case when answer_correct then 0 else 1 end)>=.7 then 2 else 1 end;
  reward:=public.dm_game_reward_claim(s.id,'papi-story-'||chapter_no,'ba',0,array[50+chapter_no],question_count,p.mistakes,1,true,stars,1);
  g:=coalesce((reward->>'gold')::int,0);v:=reward->'yo';l:=public.dm_student_level(coalesce((v->>'totalXp')::numeric,0));
  if l>=5 then
   insert into public.dm_progress_rewards(student_id,kind,reward_key) values(s.id,'stop','papi-story-'||chapter_no) on conflict do nothing;
   if found then
    select count(*) into n from public.dm_progress_rewards where student_id=s.id and kind='stop';
    if n%3=0 then bonus:=(array[15,20,30,40,50,65,80,100])[least(8,(l-5)/5+1)];v:=public.dm_progress_credit(s.id,bonus);g:=g+bonus;update public.dm_progress_rewards set gold=bonus where student_id=s.id and kind='stop' and reward_key='papi-story-'||chapter_no;end if;
   end if;
  end if;
  reward:=reward||jsonb_build_object('gold',g,'yo',v,'stars',stars);
 end if;
 update public.papi_story_progress set route_combo=combo,cursor=cur,completed=p.completed or finished,reward_claimed=p.reward_claimed or finished,questions_seen=seen,charged_cursor=case when is_question then p.cursor else p.charged_cursor end,mistakes=p.mistakes+case when answer_correct then 0 else 1 end,version=p.version+1,last_reward=case when finished then reward else p.last_reward end,updated_at=now() where actor_key=owner_key and chapter=chapter_no returning * into p;
 return jsonb_build_object('ok',true,'progress',to_jsonb(p),'correct',answer_correct,'finished',finished,'leaf',case when first_done then 1 else 0 end,'energySpent',costs,'comboGain',combo_gain,'combo',combo,'enerjiKalan',case when s.id is not null then e-costs+combo_gain else null end,'enerjiMax',cap,'reward',p.last_reward,'yo',reward->'yo');
end $function$

;
