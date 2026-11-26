-- Daily gift v2: 15-day cycle, authoritative Turkish date, one claim, no polling.
-- Preserve ordinary plan refill capacity; only the reward function can create overflow.
alter table public.students drop constraint dm_energy_capacity_plan;
alter table public.students add constraint dm_energy_capacity_plan check (energy_max in (25,40,60) and energy>=0);
create or replace function public.dm_energy_fixed_capacity() returns trigger
language plpgsql set search_path='' as $$
declare lim jsonb:=public.dm_plan_limits(public.dm_plan(new.id,'student')); cap int:=(lim->>'energyMax')::int; ceiling int:=cap;
begin
 new.energy_max:=cap;
 if (lim->>'unlimitedEnergy')::boolean then new.energy:=cap;return new;end if;
 if tg_op='UPDATE' then
  if old.energy_max=cap then ceiling:=greatest(cap,coalesce(old.energy,0));
  else ceiling:=cap+greatest(0,coalesce(old.energy,0)-coalesce(old.energy_max,cap));end if;
 end if;
 if current_setting('dm.daily_energy_credit',true)=new.id::text and tg_op='UPDATE' then
  ceiling:=greatest(ceiling,coalesce(old.energy,0),cap)+30;
 end if;
 new.energy:=greatest(0,least(ceiling,coalesce(new.energy,cap)));
 return new;
end $$;
revoke all on function public.dm_energy_fixed_capacity() from public,anon,authenticated;

create or replace function public.dm_daily_energy_gift_v2(actor uuid, claim boolean default false)
returns jsonb language plpgsql set search_path='' as $$
declare s public.students; today date:=(now() at time zone 'Europe/Istanbul')::date;
 st jsonb; last_day date; prev int; day_no int; cap int; balance int; ticks int; stamp timestamptz; gain int:=0; old_balance int;
 unlimited boolean; taken boolean; pending_old int:=0; transferred int:=0; chunk int;
begin
 if claim then select * into s from public.students where id=actor and role='student' and status='approved' and frozen_at is null for update;
 else select * into s from public.students where id=actor and role='student' and status='approved' and frozen_at is null;end if;
 if not found then return jsonb_build_object('ok',false,'code','auth');end if;
 select value into st from public.extra_data where student_id=actor and key_name='daily_energy_gift_v2';
 st:=coalesce(st,'{}');last_day:=nullif(st->>'lastDay','')::date;prev:=greatest(0,least(15,coalesce((st->>'cycleDay')::int,0)));
 taken:=coalesce(last_day=today,false);
 -- No loss of earned energy after a break; the next consecutive cycle starts at day one.
 day_no:=case when taken then greatest(1,prev) when last_day=today-1 then (prev%15)+1 else 1 end;
 cap:=coalesce(s.energy_max,25);balance:=coalesce(s.energy,0);old_balance:=balance;stamp:=coalesce(s.energy_updated_at,now());
 unlimited:=coalesce((public.dm_plan_limits(public.dm_plan(actor,'student'))->>'unlimitedEnergy')::boolean,false);
 if balance<cap then
  ticks:=greatest(0,floor(extract(epoch from(now()-stamp))/900)::int);
  balance:=least(cap,balance+ticks);
  if ticks>0 then stamp:=case when balance>=cap then now() else stamp+ticks*interval '15 minutes' end;end if;
 end if;
 if claim and not taken then
  if balance>old_balance and not unlimited then insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,balance-old_balance,balance,'dolum');end if;
  gain:=case when unlimited then 0 else day_no*2 end;
  if gain>0 then
   perform set_config('dm.daily_energy_credit',actor::text,true);
   update public.students set energy=balance+gain,energy_updated_at=stamp where id=actor returning energy into balance;
   perform set_config('dm.daily_energy_credit','',true);
   insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,gain,balance,'daily-energy-gift-v2');
  end if;
  if not unlimited then
   select greatest(0,coalesce((value->>'amount')::int,0)) into pending_old from public.extra_data where student_id=actor and key_name='papi_energy_pending_v1';
   pending_old:=coalesce(pending_old,0);
   while pending_old>0 loop
    chunk:=least(30,pending_old);
    perform set_config('dm.daily_energy_credit',actor::text,true);
    update public.students set energy=balance+chunk where id=actor returning energy into balance;
    perform set_config('dm.daily_energy_credit','',true);
    insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,chunk,balance,'old-wing-credit');
    transferred:=transferred+chunk;pending_old:=pending_old-chunk;
   end loop;
   if transferred>0 then update public.extra_data set value=jsonb_build_object('amount',0),updated_at=now() where student_id=actor and key_name='papi_energy_pending_v1';end if;
  end if;
  insert into public.extra_data(student_id,key_name,value) values(actor,'daily_energy_gift_v2',jsonb_build_object('lastDay',today,'cycleDay',day_no))
  on conflict(student_id,key_name) do update set value=excluded.value,updated_at=now();
  taken:=true;
 end if;
 return jsonb_build_object('ok',true,'day',today,'cycleDay',day_no,'amount',day_no*2,'nextAmount',((day_no%15)+1)*2,'claimed',taken,'added',gain,'oldCredit',transferred,'enerjiKalan',balance,'enerjiMax',cap,'unlimited',unlimited);
end $$;
revoke all on function public.dm_daily_energy_gift_v2(uuid,boolean) from public,anon,authenticated;
grant execute on function public.dm_daily_energy_gift_v2(uuid,boolean) to service_role;

-- Legacy cached clients no longer run active-time accumulation or feather bookkeeping.
create or replace function public.dm_active_time_tick(actor uuid,run_key text,seq bigint,active_seconds integer,claim_index bigint default 0)
returns jsonb language sql set search_path='' as $$
select jsonb_build_object('ok',true,'retired',true,'seconds',0,'stars',0,'baseChest',0,'chestCount',0,'claimed','[]'::jsonb,'gold',0);
$$;
create or replace function public.dm_papi_feather(actor uuid)
returns jsonb language sql set search_path='' as $$
select jsonb_build_object('ok',true,'retired',true,'day',(now() at time zone 'Europe/Istanbul')::date,'feathers',0,'level',1,'todayDone',true,'justEarned',false,'wingDone',false,'days','[]'::jsonb,'eklenen',0);
$$;
CREATE OR REPLACE FUNCTION public.dm_parkur_question_step(actor uuid, run_key text, step_no integer, passed boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; oldrow public.dm_parkur_question_ledger; ticks int; balance int; cost int:=case when step_no<=2 then 0 else 1 end; consecutive int:=0; i int; rowdata record; gain int:=0; school_shared boolean:=false; combo_target int:=3;
begin
 if actor is null or run_key !~ '^[a-zA-Z0-9_-]{16,100}$' or step_no not between 1 and 12 then raise exception 'Geçersiz parkur isteği';end if;
 select * into st from public.students where id=actor for update;
 if not found then raise exception 'Öğrenci bulunamadı';end if;
 if passed is null then
   select * into oldrow from public.dm_parkur_question_ledger where student_id=actor and run_id=run_key and question_no=step_no;
   if found then return jsonb_build_object('ok',true,'duplicate',true,'energy',st.energy,'max',st.energy_max);end if;
   if step_no>1 and not exists(select 1 from public.dm_parkur_question_ledger where student_id=actor and run_id=run_key and question_no=step_no-1 and answered) then raise exception 'Önceki soru tamamlanmadı';end if;
   ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900));
   balance:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+ticks) end;
   if balance<cost then raise exception 'Enerji yetersiz';end if;
   insert into public.dm_parkur_question_ledger(student_id,run_id,question_no) values(actor,run_key,step_no);
   update public.students set energy=balance-cost, energy_updated_at=case when balance>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
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
   balance:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+ticks) end;
   if balance<cost then raise exception 'Enerji yetersiz';end if;
   insert into public.dm_parkur_question_ledger(student_id,run_id,question_no)
     values(actor,run_key,step_no)
     returning * into oldrow;
   update public.students
     set energy=balance-cost,
         energy_updated_at=case when balance>=st.energy_max then now()
           else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end
     where id=actor;
   if cost>0 then insert into public.energy_transactions(student_id,change_amount,balance_after,reason)
     values(actor,-cost,balance-cost,'parkur-question:'||run_key||':'||step_no);end if;
   st.energy:=balance-cost;
 end if;

 if oldrow.answered then return jsonb_build_object('ok',true,'duplicate',true,'energy',st.energy,'gain',0);end if;
 update public.dm_parkur_question_ledger set answered=true,correct=passed where student_id=actor and run_id=run_key and question_no=step_no;
 select exists(select 1 from public.dm_verified_runs where student_id=actor and run_id=run_key and deck->0->>'schoolVersion'='9') into school_shared;
 combo_target:=case when school_shared then 5 else 3 end;
 if passed and step_no>=3 then
   for i in reverse step_no..(case when school_shared then 3 else 1 end) loop
     if exists(select 1 from public.dm_parkur_question_ledger where student_id=actor and run_id=run_key and question_no=i and answered and correct) then
       consecutive:=consecutive+1;
     else exit;end if;
   end loop;
   if consecutive>=combo_target and consecutive%combo_target=0 then gain:=1;end if;
 end if;
 if gain>0 then
   balance:=greatest(st.energy,least(st.energy_max,st.energy+gain));gain:=balance-st.energy;
   if gain>0 then
    update public.students set energy=balance where id=actor;
    insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,gain,balance,'parkur-combo:'||run_key||':'||step_no);
   end if;
 end if;
 return jsonb_build_object('ok',true,'energy',st.energy+gain,'max',st.energy_max,'gain',gain);
end $function$;

CREATE OR REPLACE FUNCTION public.dm_arcade_verified_start(actor uuid, run_key text, game_code text, cls integer, unit_ids integer[], stop_id integer, tasks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE s public.students; result jsonb; ticks integer; available integer; old_run public.dm_verified_runs; xp numeric; required_level integer;
BEGIN
 IF game_code IS NULL OR game_code NOT IN ('canavar','kule','fener') OR stop_id<>0 OR cls NOT BETWEEN 1 AND 8 OR cardinality(unit_ids)<>1 THEN RAISE EXCEPTION 'Geçersiz oyun kapsamı'; END IF;
 SELECT * INTO s FROM public.students WHERE id=actor AND status='approved' AND role='student' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Öğrenci oturumu gerekli'; END IF;
 SELECT coalesce((value->>'totalXp')::numeric,0) INTO xp FROM public.extra_data WHERE student_id=actor AND key_name='yo';
 required_level:=CASE game_code WHEN 'fener' THEN 11 WHEN 'canavar' THEN 20 ELSE 35 END;
 IF public.dm_student_level(coalesce(xp,0))<required_level AND NOT public.dm_level_early_access(actor) THEN RAISE EXCEPTION 'Bu oyun %. seviyede açılır.',required_level; END IF;
 SELECT * INTO old_run FROM public.dm_verified_runs WHERE student_id=actor AND run_id=run_key;
 IF FOUND THEN
  IF old_run.ranking_only OR old_run.expires_at<now() THEN RAISE EXCEPTION 'Oyun oturumu sona erdi. Yeniden aç.'; END IF;
  result:=public.dm_verified_start(actor,run_key,game_code,cls,unit_ids,stop_id,tasks);
  RETURN result||jsonb_build_object('enerjiKalan',s.energy,'enerjiMax',s.energy_max,'duplicate',true);
 END IF;
 -- Match the existing solo regeneration interval; lock and debit in the same transaction as session creation.
 ticks:=greatest(0,floor(extract(epoch FROM now()-coalesce(s.energy_updated_at,now()))/900));
 available:=case when s.energy>=s.energy_max then s.energy else least(s.energy_max,coalesce(s.energy,0)+ticks) end;
 IF available<3 THEN RAISE EXCEPTION 'Oynamak için 3 enerji gerekli.'; END IF;
 result:=public.dm_verified_start(actor,run_key,game_code,cls,unit_ids,stop_id,tasks);
 UPDATE public.students SET energy=available-3,energy_updated_at=CASE WHEN available>=s.energy_max THEN now() ELSE coalesce(s.energy_updated_at,now())+ticks*interval '15 minutes' END WHERE id=actor;
 IF available>coalesce(s.energy,0) THEN INSERT INTO public.energy_transactions(student_id,change_amount,balance_after,reason) VALUES(actor,available-coalesce(s.energy,0),available,'dolum'); END IF;
 INSERT INTO public.energy_transactions(student_id,change_amount,balance_after,reason) VALUES(actor,-3,available-3,game_code||':'||run_key);
 RETURN result||jsonb_build_object('enerjiKalan',available-3,'enerjiMax',s.energy_max,'eklenen',-3);
END $function$;

CREATE OR REPLACE FUNCTION public.dm_match_energy(actor uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare s public.students; available integer; ticks integer;
begin
 select * into s from public.students where id=actor for update;
 ticks:=greatest(0,floor(extract(epoch from now()-coalesce(s.energy_updated_at,now()))/900));
 available:=case when s.energy>=s.energy_max then s.energy else least(s.energy_max,s.energy+ticks) end;
 if available<4 then raise exception 'Bu karşılaşma için 4 enerji gerekiyor.';end if;
 update public.students set energy=available-4,energy_updated_at=case when available>=s.energy_max then now() else coalesce(s.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
 insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-4,available-4,'iki kişilik oyun · 8 soru');
end $function$;

CREATE OR REPLACE FUNCTION public.dm_energy_shop_buy(actor uuid, request_key text, pack_amount integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare price integer; st public.students; v jsonb; balance numeric; available integer; ticks integer; already public.dm_energy_shop_purchases;
 day_start timestamptz; bought_today integer;
begin
 if actor is null or request_key is null or length(request_key) not between 12 and 100 or pack_amount is null or pack_amount not in (5,10,15) then raise exception 'Geçersiz enerji paketi'; end if;
 price:=case pack_amount when 5 then 350 when 10 then 600 when 15 then 850 end;
 select * into st from public.students where id=actor for update;
 if not found then raise exception 'Öğrenci bulunamadı'; end if;
 select * into already from public.dm_energy_shop_purchases where student_id=actor and dm_energy_shop_purchases.request_key=dm_energy_shop_buy.request_key;
 if found then return jsonb_build_object('ok',true,'duplicate',true,'energy',st.energy,'gold',st.gold,'added',already.energy_amount,'price',already.gold_price); end if;
 day_start:=((now() at time zone 'Europe/Istanbul')::date)::timestamp at time zone 'Europe/Istanbul';
 select count(*) into bought_today from public.dm_energy_shop_purchases where student_id=actor and created_at>=day_start;
 if bought_today>=3 then raise exception 'Bugünkü 3 enerji paketi alma hakkını kullandın. Yeni alım hakkın Türkiye saatiyle gece 00.00’da yenilenir.'; end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Öğrenci ekonomisi bulunamadı'; end if;
 balance:=greatest(0,coalesce((v->>'altin')::numeric,0));
 ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900));
 available:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+ticks) end;
 if available+pack_amount>st.energy_max then raise exception 'Enerji kapasitesi aşılıyor'; end if;
 if balance<price then raise exception 'Yetersiz altın'; end if;
 insert into public.dm_energy_shop_purchases(student_id,request_key,energy_amount,gold_price) values(actor,request_key,pack_amount,price);
 update public.students set energy=available+pack_amount,energy_updated_at=case when available+pack_amount=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end,gold=balance-price where id=actor;
 update public.extra_data set value=jsonb_set(v,'{altin}',to_jsonb(balance-price)),updated_at=now() where student_id=actor and key_name='yo';
 insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,pack_amount,available+pack_amount,'dm_energy_shop:'||request_key);
 return jsonb_build_object('ok',true,'duplicate',false,'energy',available+pack_amount,'gold',balance-price,'added',pack_amount,'price',price,'remainingToday',2-bought_today);
end $function$;
