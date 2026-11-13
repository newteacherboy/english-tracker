-- Scripted Papi dialogues: server-checked answers, no energy fee, one atomic reward per completed run.
create table public.dm_papi_dialogue_runs (
 id uuid primary key,
 student_id uuid not null references public.students(id) on delete cascade,
 dialogue_id text not null,
 script jsonb not null,
 step integer not null default 0,
 correct_count integer not null default 0,
 wrong_count integer not null default 0,
 first_count integer not null default 0,
 attempts integer not null default 0,
 last_request uuid,
 last_response jsonb,
 result jsonb,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '2 hours')
);
create index dm_papi_dialogue_student on public.dm_papi_dialogue_runs(student_id,created_at desc);
alter table public.dm_papi_dialogue_runs enable row level security;
revoke all on public.dm_papi_dialogue_runs from public,anon,authenticated;
grant all on public.dm_papi_dialogue_runs to service_role;

create function public.dm_papi_dialogue(actor uuid,action text,arg jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 st public.students; v jsonb; progress jsonb; r public.dm_papi_dialogue_runs;
 script jsonb; prompt jsonb; prereq text; unlocked boolean; total integer; rid uuid; request uuid;
 answer text; normalized text; keyword text; minimum integer; words integer; accepted boolean; advance boolean:=false;
 passed boolean; stars integer; gain_xp integer:=0; gain_gold integer:=0; ver bigint; response jsonb;
 day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
 week text:=to_char(now() at time zone 'Europe/Istanbul','IYYY-"H"IW');
begin
 -- This RPC is service-only; the Edge Function resolves actor from the portal token.
 select * into st from public.students where id=actor and role='student' and status='approved' and frozen_at is null for update;
 if not found then return jsonb_build_object('ok',false,'code','auth');end if;
 if public.dm_plan(actor,'student') is distinct from 'premium_pro' then return jsonb_build_object('ok',false,'code','premium');end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 v:=coalesce(v,'{}');progress:=case when jsonb_typeof(v->'sohbet')='object' then v->'sohbet' else '{}' end;
 if action='status' then return jsonb_build_object('ok',true,'progress',progress,'energyCost',0,'reward',jsonb_build_object('xp',40,'gold',50));end if;
 if action not in ('start','answer','finish') then return jsonb_build_object('ok',false,'code','invalid');end if;
 rid:=(arg->>'runId')::uuid;
 if action='start' then
  -- script and prerequisites are supplied exclusively from the published server curriculum.
  script:=arg->'script';total:=jsonb_array_length(script->'satirlar');
  if script->>'id' is null or total not between 4 and 10 then return jsonb_build_object('ok',false,'code','invalid');end if;
  unlocked:=coalesce((progress->>(script->>'id'))::integer,0)>0 or coalesce((arg->>'first')::boolean,false);
  for prereq in select jsonb_array_elements_text(coalesce(arg->'after','[]')) loop
   if coalesce((progress->>prereq)::integer,0)>0 then unlocked:=true;end if;
  end loop;
  if not unlocked then return jsonb_build_object('ok',false,'code','locked');end if;
  insert into public.dm_papi_dialogue_runs(id,student_id,dialogue_id,script) values(rid,actor,script->>'id',script) on conflict(id) do nothing;
 end if;
 select * into r from public.dm_papi_dialogue_runs where id=rid and student_id=actor for update;
 if not found then return jsonb_build_object('ok',false,'code','missing');end if;
 if action='start' and r.dialogue_id<>script->>'id' then return jsonb_build_object('ok',false,'code','conflict');end if;
 total:=jsonb_array_length(r.script->'satirlar');
 if r.result is not null then return r.result||jsonb_build_object('ok',true,'duplicate',true,'yo',v,'progress',progress);end if;
 if r.expires_at<now() then return jsonb_build_object('ok',false,'code','expired');end if;
 if action='start' then return jsonb_build_object('ok',true,'runId',r.id,'step',r.step,'correctCount',r.correct_count,'wrongCount',r.wrong_count,'firstCount',r.first_count,'attempts',r.attempts,'progress',progress);end if;
 if action='answer' then
  request:=(arg->>'requestId')::uuid;
  if r.last_request=request then return r.last_response;end if;
  if r.step<>coalesce((arg->>'step')::integer,-1) or r.step>=total then return jsonb_build_object('ok',false,'code','stale');end if;
  answer:=btrim(coalesce(arg->>'text',''));
  if length(answer) not between 1 and 400 then return jsonb_build_object('ok',false,'code','invalid');end if;
  normalized:=btrim(regexp_replace(lower(replace(answer,'’','''')),'[^a-z0-9'']+',' ','g'));
  prompt:=r.script->'satirlar'->r.step;minimum:=coalesce((prompt->>'min')::integer,1);
  words:=case when normalized='' then 0 else cardinality(regexp_split_to_array(normalized,'\s+')) end;
  accepted:=false;
  for keyword in select jsonb_array_elements_text(prompt->'k') loop
   keyword:=btrim(regexp_replace(lower(replace(keyword,'’','''')),'[^a-z0-9'']+',' ','g'));
   if keyword<>'' and strpos(' '||normalized||' ',' '||keyword||' ')>0 then accepted:=true;exit;end if;
  end loop;
  if accepted and words<minimum then
   response:=jsonb_build_object('ok',true,'tooShort',true,'minimum',minimum,'accepted',false,'advance',false);
  else
   if accepted then
    r.correct_count:=r.correct_count+1;
    if r.attempts=0 then r.first_count:=r.first_count+1;end if;
    advance:=true;
   else
    r.attempts:=r.attempts+1;
    if r.attempts>=2 then r.wrong_count:=r.wrong_count+1;advance:=true;end if;
   end if;
   if advance then r.step:=r.step+1;r.attempts:=0;end if;
   response:=jsonb_build_object('ok',true,'accepted',accepted,'advance',advance,'tooShort',false);
  end if;
  response:=response||jsonb_build_object('runId',r.id,'step',r.step,'correctCount',r.correct_count,'wrongCount',r.wrong_count,'firstCount',r.first_count,'attempts',r.attempts,'finished',r.step>=total);
  update public.dm_papi_dialogue_runs set step=r.step,correct_count=r.correct_count,wrong_count=r.wrong_count,first_count=r.first_count,attempts=r.attempts,last_request=request,last_response=response where id=r.id;
  return response;
 end if;
 if r.step<total then return jsonb_build_object('ok',false,'code','incomplete');end if;
 passed:=r.correct_count::numeric/total>=0.6;
 stars:=case when not passed then 0 when r.correct_count=total and r.first_count=total then 3 when r.correct_count=total then 2 else 1 end;
 if passed then
  gain_xp:=40;gain_gold:=50;
  progress:=jsonb_set(progress,array[r.dialogue_id],to_jsonb(greatest(stars,coalesce((progress->>r.dialogue_id)::integer,0))));
 end if;
 ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
 v:=v||jsonb_build_object('sohbet',progress,'totalXp',coalesce((v->>'totalXp')::numeric,0)+gain_xp,'altin',coalesce((v->>'altin')::numeric,0)+gain_gold,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
 v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
 v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+gain_xp));
 v:=jsonb_set(v,'{log}',case when jsonb_typeof(v->'log')='object' then v->'log' else '{}' end);
 v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+gain_xp));
 v:=jsonb_set(v,'{lig}',case when v#>>'{lig,hafta}'=week then v->'lig' else jsonb_build_object('hafta',week,'xp',0,'gecen',v->'lig') end);
 v:=jsonb_set(v,'{lig,xp}',to_jsonb(coalesce((v#>>'{lig,xp}')::numeric,0)+gain_xp));
 insert into public.extra_data(student_id,key_name,value) values(actor,'yo',v) on conflict(student_id,key_name) do update set value=excluded.value,updated_at=now();
 update public.students set gold=(v->>'altin')::numeric,updated_at=now() where id=actor;
 response:=jsonb_build_object('ok',true,'runId',r.id,'passed',passed,'stars',stars,'correctCount',r.correct_count,'wrongCount',r.wrong_count,'xp',gain_xp,'gold',gain_gold,'energyCost',0);
 update public.dm_papi_dialogue_runs set result=response where id=r.id;
 return response||jsonb_build_object('yo',v,'progress',progress);
end $$;
revoke all on function public.dm_papi_dialogue(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.dm_papi_dialogue(uuid,text,jsonb) to service_role;

-- Keep temporary, completed runs from accumulating indefinitely.
select cron.schedule('dm-papi-dialogue-retention','37 3 * * *',$job$delete from public.dm_papi_dialogue_runs where created_at<now()-interval '30 days';$job$);
