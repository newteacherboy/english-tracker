create or replace function public.dm_ad_claim(p_id uuid,p_transaction text,p_unit text,p_amount integer,p_event_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare i dm_ad_rewards.intents; st public.students; actor uuid; used integer; v jsonb; balance numeric; delta integer; expected text;
begin
 select student_id into actor from dm_ad_rewards.intents where id=p_id;
 if actor is null then return jsonb_build_object('credited',false,'reason','unknown_intent'); end if;
 -- Consistent lock order with create/status and existing wallet purchases.
 select * into st from public.students where id=actor for update;
 select * into i from dm_ad_rewards.intents where id=p_id for update;
 if i.claimed_at is not null then return jsonb_build_object('credited',true,'duplicate',true); end if;
 if st.status<>'approved' or st.role<>'student' or st.frozen_at is not null or st.username='dijimedu_demo'
 or coalesce(st.profile->>'teacher_portal_guest','false')='true' or st.username ~ ' · (Misafir|Öğretmen Denemesi) [a-f0-9]{8}$'
 then return jsonb_build_object('credited',false,'reason','inactive_student'); end if;
 expected:=case i.kind when 'energy' then '2306894202' else '7589517182' end;
 if p_transaction is null or (length(p_transaction) not between 8 and 256 or p_transaction !~ '^[a-fA-F0-9]+$') or p_event_at is null or p_unit is null or p_amount is null
 or p_unit not in (expected,'ca-app-pub-5025780881593375/'||expected)
 or p_amount<>(case i.kind when 'energy' then 3 else 100 end)
 or p_event_at<i.created_at-interval '30 seconds' or p_event_at>i.expires_at
 or p_event_at>now()+interval '1 minute' or now()>i.expires_at+interval '24 hours'
 then return jsonb_build_object('credited',false,'reason','invalid_proof'); end if;
 if exists(select 1 from dm_ad_rewards.intents where transaction_id=p_transaction) then return jsonb_build_object('credited',false,'reason','used_transaction'); end if;
 select count(*) into used from dm_ad_rewards.intents where student_id=actor and kind=i.kind and reward_day=i.reward_day and claimed_at is not null;
 if used>=(case i.kind when 'energy' then 5 else 3 end) then return jsonb_build_object('credited',false,'reason','daily_limit'); end if;
 if i.kind='energy' then
  delta:=least(3,greatest(0,25-st.energy));
  update public.students set energy=st.energy+delta where id=actor;
  insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,delta,st.energy+delta,'admob:'||p_transaction);
 else
  select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
  if v is null then return jsonb_build_object('credited',false,'reason','wallet_missing'); end if;
  balance:=greatest(0,coalesce((v->>'altin')::numeric,0))+100; delta:=100;
  update public.extra_data set value=jsonb_set(jsonb_set(v,'{altin}',to_jsonb(balance)),'{guncelleme}',to_jsonb(floor(extract(epoch from clock_timestamp())*1000))),updated_at=now() where student_id=actor and key_name='yo';
  update public.students set gold=balance where id=actor;
 end if;
 update dm_ad_rewards.intents set claimed_at=now(),transaction_id=p_transaction,added=delta where id=p_id;
 return jsonb_build_object('credited',true,'duplicate',false,'added',delta);
end; $$;
