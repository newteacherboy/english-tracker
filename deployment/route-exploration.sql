-- PREPARED ONLY: do not apply before the owner's publication approval.
-- Uses the existing RLS-protected reward ledger; no balances or progress are reset.
begin;
create or replace function public.dm_route_exploration(actor uuid,route_name text,stop_no integer,pickup_no integer default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare ctx jsonb; st public.students; v jsonb; prefix_key text; claims jsonb;
 amount int; ticks int; available int; added int:=0;
begin
 if actor is null or route_name is null or route_name not in ('school','learning') or stop_no is null or stop_no<=0
 or (pickup_no is not null and pickup_no not between 0 and 3) then raise exception 'Geçersiz keşif';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,17));
 select * into st from public.students where id=actor for update;
 if not found or st.status<>'approved' or st.role<>'student' then raise exception 'Aktif öğrenci gerekli';end if;
 if route_name='school' then
  ctx:=public.dm_progress_context(actor);
  if not (ctx->'done' @> jsonb_build_array(stop_no))
   or not exists(select 1 from jsonb_array_elements(ctx->'units') u cross join lateral jsonb_array_elements(u) n where n=to_jsonb(stop_no)) then raise exception 'Tamamlanmış durak gerekli';end if;
 else
  if not exists(select 1 from public.papi_story_progress where student_id=actor and chapter=stop_no and completed) then raise exception 'Tamamlanmış bölüm gerekli';end if;
 end if;
 prefix_key:=route_name||':'||stop_no||':';
 select coalesce(jsonb_agg((right(r.reward_key,1))::int order by r.reward_key),'[]'::jsonb) into claims
 from public.dm_progress_rewards r where r.student_id=actor and r.kind='exploration' and r.reward_key like prefix_key||'%';
 if pickup_no is null then return jsonb_build_object('ok',true,'claims',claims);end if;
 if claims @> jsonb_build_array(pickup_no) then return jsonb_build_object('ok',true,'duplicate',true,'claims',claims,'gold',0,'energyAdded',0);end if;
 ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int;
 available:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+ticks) end;
 if pickup_no=3 then
  added:=greatest(0,least(1,st.energy_max-available));
  if added=0 then return jsonb_build_object('ok',true,'full',true,'energyAdded',0,'claims',claims);end if;
 end if;
 amount:=case when pickup_no<3 then 2 else 0 end;
 insert into public.dm_progress_rewards(student_id,kind,reward_key,gold) values(actor,'exploration',prefix_key||pickup_no,amount);
 v:=public.dm_progress_credit(actor,amount);
 if added>0 then
  update public.students set energy=available+added,energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
  insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,added,available+added,'route-exploration:'||prefix_key||pickup_no);
 end if;
 return jsonb_build_object('ok',true,'duplicate',false,'gold',amount,'energyAdded',added,'energy',available+added,'energyMax',st.energy_max,'claims',claims||jsonb_build_array(pickup_no),'yo',v);
end $$;
revoke all on function public.dm_route_exploration(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.dm_route_exploration(uuid,text,integer,integer) to service_role;
commit;
