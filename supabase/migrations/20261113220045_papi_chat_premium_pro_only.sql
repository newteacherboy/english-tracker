-- Papi AI chat is exclusively available to active Premium Pro students.
CREATE OR REPLACE FUNCTION public.dm_papi_chat(actor uuid, action text, arg jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare pd date:=(now() at time zone 'Europe/Istanbul')::date; gd date:=(now() at time zone 'UTC')::date;
 used int; attempts int; requests int; people int; blocked boolean; rid uuid; old public.dm_papi_chat_turns%rowtype;
 cefr text; history jsonb;
begin
 if not exists(select 1 from public.students where id=actor and role='student' and status='approved') then return jsonb_build_object('ok',false,'code','auth');end if;
 -- Only the server's current student subscription grants AI chat, regardless of level.
 if public.dm_plan(actor,'student') is distinct from 'premium_pro' then return jsonb_build_object('ok',false,'code','premium');end if;
 select value->>'level' into cefr from public.extra_data where student_id=actor and key_name='placement_cefr_v2';
 if cefr is null or cefr not in ('A1','A2','B1','B2') then cefr:='A1';end if;
 perform pg_advisory_xact_lock(hashtextextended('dm_papi_chat:'||gd,0));
 update public.dm_papi_chat_turns set state='failed' where state='pending' and created_at<now()-interval '90 seconds';
 select count(*) filter(where state<>'failed'),count(*) into used,attempts from public.dm_papi_chat_turns where student_id=actor and personal_day=pd;
 select coalesce(b.blocked,false) into blocked from public.dm_papi_chat_budget b where day=gd;
 select count(*),count(distinct student_id) into requests,people from public.dm_papi_chat_turns where global_day=gd;
 if action='status' then return jsonb_build_object('ok',true,'remaining',greatest(0,5-used),'limit',5,'level',cefr,'day',pd,'globalAvailable',not coalesce(blocked,false) and requests<500 and (people<100 or exists(select 1 from public.dm_papi_chat_turns where global_day=gd and student_id=actor)));end if;
 rid:=(arg->>'requestId')::uuid;
 select * into old from public.dm_papi_chat_turns where student_id=actor and request_id=rid;
 if action='reserve' then
  if old.request_id is not null then
   if old.request_hash<>arg->>'hash' then return jsonb_build_object('ok',false,'code','conflict');end if;
   return jsonb_build_object('ok',true,'state',old.state,'result',old.result,'remaining',greatest(0,5-used),'level',cefr);
  end if;
  if used>=5 or attempts>=10 then return jsonb_build_object('ok',false,'code','daily_limit','remaining',greatest(0,5-used));end if;
  if coalesce(blocked,false) or requests>=500 or (people>=100 and not exists(select 1 from public.dm_papi_chat_turns where global_day=gd and student_id=actor)) then return jsonb_build_object('ok',false,'code','global_limit');end if;
  if exists(select 1 from public.dm_papi_chat_turns where student_id=actor and (state='pending' or created_at>now()-interval '5 seconds')) then return jsonb_build_object('ok',false,'code','busy');end if;
  insert into public.dm_papi_chat_turns(student_id,request_id,request_hash,topic,input_text) values(actor,rid,arg->>'hash',arg->>'topic',arg->>'text');
  select coalesce(jsonb_agg(jsonb_build_object('text',t.input_text,'reply',t.result->>'reply') order by t.created_at),'[]') into history from (select input_text,result,created_at from public.dm_papi_chat_turns where student_id=actor and personal_day=pd and topic=arg->>'topic' and state='done' order by created_at desc limit 2) t;
  return jsonb_build_object('ok',true,'state','reserved','remaining',greatest(0,4-used),'level',cefr,'history',history);
 elsif action in ('finish','fail','quota') then
  if old.request_id is null then return jsonb_build_object('ok',false,'code','missing');end if;
  if old.state='pending' then update public.dm_papi_chat_turns set state=case when action='finish' then 'done' else 'failed' end,result=case when action='finish' then arg->'result' else null end where student_id=actor and request_id=rid;end if;
  if action='quota' then insert into public.dm_papi_chat_budget values(gd,true) on conflict(day) do update set blocked=true;end if;
  return jsonb_build_object('ok',true);
 end if;
 return jsonb_build_object('ok',false,'code','action');
end $function$;
