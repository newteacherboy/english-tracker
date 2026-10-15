-- Service-only short-lived AI conversation state; the portal uses its existing opaque sessions.
create table public.dm_papi_chat_turns (
 student_id uuid not null references public.students(id) on delete cascade,
 request_id uuid not null, request_hash text not null,
 personal_day date not null default (now() at time zone 'Europe/Istanbul')::date,
 global_day date not null default (now() at time zone 'UTC')::date,
 topic text not null check(topic in ('intro','school','food','animals')),
 input_text text not null check(length(input_text)<=400),
 state text not null default 'pending' check(state in ('pending','done','failed')),
 result jsonb, created_at timestamptz not null default now(),
 primary key(student_id,request_id), check(result is null or length(result::text)<=4000)
);
create index dm_papi_chat_global_day on public.dm_papi_chat_turns(global_day,student_id);
create index dm_papi_chat_personal_day on public.dm_papi_chat_turns(student_id,personal_day,created_at);
create table public.dm_papi_chat_budget(day date primary key,blocked boolean not null default false);
alter table public.dm_papi_chat_turns enable row level security;
alter table public.dm_papi_chat_budget enable row level security;
revoke all on public.dm_papi_chat_turns,public.dm_papi_chat_budget from public,anon,authenticated;
grant all on public.dm_papi_chat_turns,public.dm_papi_chat_budget to service_role;

create function public.dm_papi_chat(actor uuid,action text,arg jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare pd date:=(now() at time zone 'Europe/Istanbul')::date; gd date:=(now() at time zone 'UTC')::date;
 used int; attempts int; requests int; people int; blocked boolean; rid uuid; old public.dm_papi_chat_turns%rowtype;
 cefr text; lvl int; history jsonb;
begin
 if not exists(select 1 from public.students where id=actor and role='student' and status='approved') then return jsonb_build_object('ok',false,'code','auth');end if;
 select public.dm_student_level(coalesce((value->>'totalXp')::numeric,0)) into lvl from public.extra_data where student_id=actor and key_name='yo';
 if coalesce(lvl,1)<20 then return jsonb_build_object('ok',false,'code','level','minimumLevel',20);end if;
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
end $$;
revoke all on function public.dm_papi_chat(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.dm_papi_chat(uuid,text,jsonb) to service_role;
-- No conversations enter social feeds; remove their short-lived retry/context records automatically.
select cron.schedule('dm-papi-chat-retention','17 * * * *',$job$delete from public.dm_papi_chat_turns where created_at<now()-interval '48 hours';delete from public.dm_papi_chat_budget where day<current_date-3;$job$);
