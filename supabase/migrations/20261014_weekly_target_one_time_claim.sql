-- Weekly goal is a single, server-authorized, atomic reward per student and Istanbul week.
-- Existing XP and gold are never subtracted. Previously awarded legacy goals are not paid again.
create or replace function public.dm_weekly_target_select(actor uuid,target_xp integer)
returns jsonb language plpgsql set search_path to '' as $$
declare week_code text := to_char(date_trunc('week',now() at time zone 'Europe/Istanbul'),'YYYY-MM-DD');
        goal jsonb; legacy jsonb; state jsonb; selected_xp int;
begin
 if target_xp not in (1000,1500,2500) then raise exception 'Geçersiz haftalık hedef'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,81015));
 if not exists(select 1 from public.students where id=actor and status='approved' and role='student') then raise exception 'Öğrenci oturumu gerekli'; end if;
 select value into state from public.extra_data where student_id=actor and key_name='yo';
 state:=coalesce(state,'{}'::jsonb);
 select value into goal from public.extra_data where student_id=actor and key_name='weekly_target';
 legacy:=state->'haftaHedef';
 if coalesce(goal->>'h','')=week_code then
   selected_xp:=coalesce((goal->>'xp')::int,target_xp);
 elsif coalesce(legacy->>'h','')=week_code and (legacy->>'xp')::int in (1000,1500,2500) then
   selected_xp:=(legacy->>'xp')::int;
 else selected_xp:=target_xp;
 end if;
 if selected_xp not in (1000,1500,2500) then selected_xp:=target_xp; end if;
 goal:=jsonb_build_object('h',week_code,'xp',selected_xp,'odul',case
   when exists(select 1 from public.dm_progress_rewards where student_id=actor and kind='weekly_target' and reward_key=week_code)
     or (coalesce(legacy->>'h','')=week_code and coalesce(legacy->>'odul','0')='1')
     or (coalesce(goal->>'h','')=week_code and coalesce(goal->>'odul','0')='1')
   then 1 else 0 end,'secildiAt',coalesce(goal->'secildiAt',legacy->'secildiAt',to_jsonb(floor(extract(epoch from clock_timestamp())*1000)::bigint)));
 insert into public.extra_data(student_id,key_name,value,updated_at) values(actor,'weekly_target',goal,now())
 on conflict(student_id,key_name) do update set value=excluded.value,updated_at=excluded.updated_at;
 return jsonb_build_object('ok',true,'haftaHedef',goal);
end $$;

create or replace function public.dm_weekly_target_claim(actor uuid)
returns jsonb language plpgsql set search_path to '' as $$
declare week_date date := (date_trunc('week',now() at time zone 'Europe/Istanbul'))::date;
        week_code text; goal jsonb; legacy jsonb; v jsonb; st public.students;
        target int; awarded int; achieved numeric:=0; logged numeric:=0; weekly numeric:=0; wkxp numeric:=0;
        fresh boolean:=false; ver bigint; old boolean:=false;
begin
 week_code:=to_char(week_date,'YYYY-MM-DD');
 perform pg_advisory_xact_lock(hashtextextended(actor::text,81015));
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci bulunamadı'; end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 v:=coalesce(v,'{}'::jsonb);
 select value into goal from public.extra_data where student_id=actor and key_name='weekly_target' for update;
 legacy:=v->'haftaHedef';
 if coalesce(goal->>'h','')<>week_code then
   if coalesce(legacy->>'h','')<>week_code then
      return jsonb_build_object('ok',false,'message','Önce bu hafta için hedef seç.');
   end if;
   goal:=legacy;
 end if;
 if coalesce(goal->>'xp','') !~ '^(1000|1500|2500)$' then
   return jsonb_build_object('ok',false,'message','Geçerli bir haftalık hedef seç.');
 end if;
 target:=(goal->>'xp')::int;
 old:=exists(select 1 from public.dm_progress_rewards
   where student_id=actor and kind='weekly_target' and reward_key=week_code)
   or coalesce(goal->>'odul','0')='1'
   or (coalesce(legacy->>'h','')=week_code and coalesce(legacy->>'odul','0')='1');
 if old then
   insert into public.dm_progress_rewards(student_id,kind,reward_key,gold)
      values(actor,'weekly_target',week_code,0) on conflict do nothing;
   goal:=jsonb_set(goal,'{odul}','1'::jsonb,true);
   insert into public.extra_data(student_id,key_name,value,updated_at) values(actor,'weekly_target',goal,now())
      on conflict(student_id,key_name) do update set value=excluded.value,updated_at=excluded.updated_at;
   if coalesce(legacy->>'h','')=week_code and coalesce(legacy->>'odul','0')<>'1' then
     v:=jsonb_set(v,'{haftaHedef}',goal,true);
     update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
   end if;
   return jsonb_build_object('ok',true,'duplicate',true,'newlyAwarded',false,'awardedGold',0,'haftaHedef',goal,'altin',greatest(coalesce(st.gold,0),coalesce((v->>'altin')::numeric,0)),'yo',v);
 end if;
 -- Match existing weekly UI: positive log XP this Istanbul week, or the league's current XP.
 select coalesce(sum(case when data.value~'^[0-9]+([.][0-9]+)?$' then greatest(0,data.value::numeric) else 0 end),0)
 into logged from jsonb_each_text(case when jsonb_typeof(v->'log')='object' then v->'log' else '{}'::jsonb end) data
 where data.key>=week_code and data.key<to_char(week_date+7,'YYYY-MM-DD');
 if coalesce(v#>>'{lig,xp}','')~'^[0-9]+([.][0-9]+)?$' then
   weekly:=(v#>>'{lig,xp}')::numeric;
 end if;
 select coalesce(xp,0) into wkxp from public.dm_weekly_xp where student_id=actor and week_start=week_date;
 achieved:=greatest(logged,weekly,coalesce(wkxp,0));
 if achieved<target then
   return jsonb_build_object('ok',false,'reached',false,'progress',achieved,'target',target,'message','Haftalık hedef henüz tamamlanmadı.');
 end if;
 awarded:=round(target/20.0)::int;
 insert into public.dm_progress_rewards(student_id,kind,reward_key,gold)
 values(actor,'weekly_target',week_code,awarded) on conflict do nothing;
 if not found then
   return jsonb_build_object('ok',true,'duplicate',true,'newlyAwarded',false,'awardedGold',0,'haftaHedef',goal,'altin',st.gold,'yo',v);
 end if;
 fresh:=true;
 goal:=jsonb_set(goal,'{odul}','1'::jsonb,true);
 ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
 v:=v||jsonb_build_object('altin',greatest(coalesce(st.gold,0),coalesce((v->>'altin')::numeric,0))+awarded,'haftaHedef',goal,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
 insert into public.extra_data(student_id,key_name,value,updated_at) values(actor,'yo',v,now())
 on conflict(student_id,key_name) do update set value=excluded.value,updated_at=excluded.updated_at;
 insert into public.extra_data(student_id,key_name,value,updated_at) values(actor,'weekly_target',goal,now())
 on conflict(student_id,key_name) do update set value=excluded.value,updated_at=excluded.updated_at;
 update public.students set gold=(v->>'altin')::numeric,updated_at=now() where id=actor;
 return jsonb_build_object('ok',true,'duplicate',false,'newlyAwarded',fresh,'awardedGold',awarded,'haftaHedef',goal,'altin',(v->>'altin')::numeric,'yo',v);
end $$;
revoke all on function public.dm_weekly_target_select(uuid,integer) from public,anon,authenticated;
revoke all on function public.dm_weekly_target_claim(uuid) from public,anon,authenticated;
grant execute on function public.dm_weekly_target_select(uuid,integer) to service_role;
grant execute on function public.dm_weekly_target_claim(uuid) to service_role;

-- Current-week legacy awards that have *already* been flagged are protected
-- without crediting or removing any gold. Each future week uses a new reward_key.
insert into public.dm_progress_rewards(student_id,kind,reward_key,gold)
select student_id,'weekly_target',value#>>'{haftaHedef,h}',0
from public.extra_data
where key_name='yo' and value#>>'{haftaHedef,odul}'='1'
  and (value#>>'{haftaHedef,h}')~'^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
on conflict do nothing;

-- Keep pre-existing clients from overwriting a completed legacy goal with
-- the separate (previously stale) weekly_target record on the next refresh.
update public.extra_data wt
set value=jsonb_set(wt.value,'{odul}','1'::jsonb,true),updated_at=now()
from public.extra_data legacy
where legacy.student_id=wt.student_id and legacy.key_name='yo'
  and wt.key_name='weekly_target'
  and legacy.value#>>'{haftaHedef,odul}'='1'
  and legacy.value#>>'{haftaHedef,h}'=wt.value->>'h'
  and coalesce(wt.value->>'odul','0')<>'1';
