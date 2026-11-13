-- Premium Pro bypasses feature entry levels only; earned XP, rewards and course order stay intact.
create or replace function public.dm_level_early_access(actor uuid) returns boolean language sql stable security invoker set search_path='' as $$select public.dm_plan(actor,'student')='premium_pro'$$;
revoke all on function public.dm_level_early_access(uuid) from public,anon,authenticated;
grant execute on function public.dm_level_early_access(uuid) to service_role;

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
 available:=least(s.energy_max,coalesce(s.energy,0)+ticks);
 IF available<3 THEN RAISE EXCEPTION 'Oynamak için 3 enerji gerekli.'; END IF;
 result:=public.dm_verified_start(actor,run_key,game_code,cls,unit_ids,stop_id,tasks);
 UPDATE public.students SET energy=available-3,energy_updated_at=CASE WHEN available>=s.energy_max THEN now() ELSE coalesce(s.energy_updated_at,now())+ticks*interval '15 minutes' END WHERE id=actor;
 IF available>coalesce(s.energy,0) THEN INSERT INTO public.energy_transactions(student_id,change_amount,balance_after,reason) VALUES(actor,available-coalesce(s.energy,0),available,'dolum'); END IF;
 INSERT INTO public.energy_transactions(student_id,change_amount,balance_after,reason) VALUES(actor,-3,available-3,game_code||':'||run_key);
 RETURN result||jsonb_build_object('enerjiKalan',available-3,'enerjiMax',s.energy_max,'eklenen',-3);
END $function$
;

CREATE OR REPLACE FUNCTION public.dm_papi_chat(actor uuid, action text, arg jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare pd date:=(now() at time zone 'Europe/Istanbul')::date; gd date:=(now() at time zone 'UTC')::date;
 used int; attempts int; requests int; people int; blocked boolean; rid uuid; old public.dm_papi_chat_turns%rowtype;
 cefr text; lvl int; history jsonb;
begin
 if not exists(select 1 from public.students where id=actor and role='student' and status='approved') then return jsonb_build_object('ok',false,'code','auth');end if;
 select public.dm_student_level(coalesce((value->>'totalXp')::numeric,0)) into lvl from public.extra_data where student_id=actor and key_name='yo';
 if coalesce(lvl,1)<20 and not public.dm_level_early_access(actor) then return jsonb_build_object('ok',false,'code','level','minimumLevel',20);end if;
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
end $function$
;

CREATE OR REPLACE FUNCTION public.dm_progress_context(actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare v jsonb; l int; done jsonb; units jsonb:='[]'; comp jsonb:='[]'; group_stops jsonb; b int; n int; cnt int; prev boolean:=true; lessons jsonb:='{}'; ce text; ready boolean; ch jsonb:='{}'; cl int; cid text; feed boolean; preserved_done jsonb;
begin
 select value into v from public.extra_data where student_id=actor and key_name='yo';v:=coalesce(v,'{}');l:=public.dm_student_level(coalesce((v->>'totalXp')::numeric,0));
 select coalesce(jsonb_agg(distinct stop_no order by stop_no),'[]'::jsonb) into done
 from (
   select (x->>'stop')::int stop_no from dm_private.parkur_xp_seed_for(actor) p
   cross join lateral jsonb_array_elements(p.completed_stops) x
   union
   select c.level_no from public.level_completions c
   where c.student_id=actor and c.mode='buyu' and (c.level_no between 1000 and 1999 or c.level_no between 210000 and 290000)
 ) preserved;
 preserved_done:=done;
 for b in 0..3 loop
  select coalesce(g.group_stops,'[]') into group_stops from dm_private.progress_wb_groups g where g.grp=b;
  group_stops:=coalesce(group_stops,'[]');
  select coalesce(jsonb_agg(distinct stop_no order by stop_no),'[]') into done from (
   select (x.value)::text::int stop_no from jsonb_array_elements(done) x
   union select (x.value)::text::int from jsonb_array_elements(group_stops) x
   where (preserved_done @> jsonb_build_array(((x.value)::text::int/100)*100+(((x.value)::text::int%100-51)/3)+1) or (((x.value)::text::int%100) between 51 and 53 and preserved_done @> jsonb_build_array(1000+(((x.value)::text::int-200000)/10000)*100+(((x.value)::text::int-200000)%10000)/100)) ) and exists(select 1 from dm_private.progress_wb_units u where u.class_no=(((x.value)::text::int-200000)/10000) and u.unit_no=(((x.value)::text::int-200000)%10000)/100 and ((x.value)::text::int%100-50)<=u.parts)
  ) expanded;
  units:=units||jsonb_build_array(group_stops);n:=jsonb_array_length(group_stops);select count(*) into cnt from jsonb_array_elements(group_stops) x where done @> jsonb_build_array(x);
  comp:=comp||jsonb_build_array(n>0 and cnt=n);
 end loop;
 feed:=jsonb_array_length(units->0)>=2 and done @> jsonb_build_array(units#>'{0,0}',units#>'{0,1}');
 foreach ce in array array['A1','A2','B1','B2'] loop
  lessons:=jsonb_set(lessons,array[ce],to_jsonb(prev));
  select exists(select 1 from public.lesson_topics where active and upper(level)=ce) and not exists(select 1 from public.lesson_topics t where t.active and upper(t.level)=ce and not exists(select 1 from public.lesson_progress p where p.student_id=actor and upper(p.level)=ce and p.category=t.category and p.topic_name=t.topic_name and p.test_success)) into prev;
 end loop;
 for b in 0..4 loop
  cid:=(array['bronze','silver','gold','crystal','legend'])[b+1];cl:=(array[5,14,24,34,40])[b+1];ready:=l>=cl;
  if b=0 then ready:=ready and jsonb_array_length(units->0)>=3 and done @> jsonb_build_array(units#>'{0,0}',units#>'{0,1}',units#>'{0,2}');
  elsif b=1 then select count(*) into cnt from jsonb_array_elements(units->0) x where done @> jsonb_build_array(x);ready:=ready and cnt>=ceil(jsonb_array_length(units->0)/2.0) and cnt>0;
  else for n in 0..b-1 loop ready:=ready and (comp->>n)::boolean;end loop;
  end if;
  ch:=jsonb_set(ch,array[cid],to_jsonb(case when exists(select 1 from public.dm_progress_rewards where student_id=actor and kind='chest' and reward_key=cid) then 'claimed' when ready then 'ready' else 'locked' end));
 end loop;
 return jsonb_build_object('levelEarlyAccess',public.dm_level_early_access(actor),'level',l,'feed',feed,'done',done,'units',units,'complete',comp,'lessons',lessons,'chests',ch,'owned',coalesce(v#>'{karakter,sahip}','[]'),'yo',v);
end

$function$
;

CREATE OR REPLACE FUNCTION public.dm_progress_purchase(actor uuid, item_key text, is_showcase boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare ctx jsonb; v jsonb; o public.dm_progress_items; f int; x jsonb; owns jsonb; first_purchase boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(actor::text,17));ctx:=public.dm_progress_context(actor);v:=ctx->'yo';
 select * into o from public.dm_progress_items where id=item_key;if not found then raise exception 'Ürün bulunamadı';end if;
 if (ctx->>'level')::int<o.minimum_level and not coalesce((ctx->>'levelEarlyAccess')::boolean,false) then raise exception 'Ürün % . seviyede açılır',o.minimum_level;end if;
 if o.owned_keys<@coalesce(v#>'{karakter,sahip}','[]') then raise exception 'Bu ürüne zaten sahipsin';end if;
 if nullif(v#>>'{karakter,cins}','') is null then raise exception 'Önce avatarını seç';end if;
 first_purchase:=not coalesce((v->>'dolapIlkIndirimKullanildi')::boolean,false) and coalesce(v->'dolapIlkAlim','{}')='{}'::jsonb;
 f:=case when first_purchase then floor(o.price*.75+.5)::int when is_showcase then floor(o.price*.7+.5)::int else o.price end;
 v:=public.dm_progress_credit(actor,-f);
  select jsonb_agg(distinct e) into owns from jsonb_array_elements(coalesce(v#>'{karakter,sahip}','[]')||o.owned_keys) e;
  v:=jsonb_set(v,'{karakter,sahip}',owns);v:=jsonb_set(v,'{karakter,s}',coalesce(v#>'{karakter,s}','{}')||o.style);v:=jsonb_set(v,'{dolapIlkIndirimKullanildi}','true');
 update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
 insert into public.dm_progress_rewards(student_id,kind,reward_key,gold) values(actor,'purchase',item_key||':'||gen_random_uuid()::text,-f);
 return jsonb_build_object('price',f,'yo',v);
end $function$
;

CREATE OR REPLACE FUNCTION public.dm_rally_start(actor uuid, run_key uuid, class_id integer, unit_ids integer[], question_deck jsonb, pace text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students;r public.dm_rally_runs;available int;ticks int;v jsonb;
begin
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci hesabı gerekli.';end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo';
 if public.dm_student_level(coalesce((v->>'totalXp')::numeric,0))<15 and not public.dm_level_early_access(actor) then raise exception 'Kelime Rallisi 15. seviyede açılır.';end if;
 select * into r from public.dm_rally_runs where id=run_key;
 if found then if r.student_id<>actor then raise exception 'Yarış bulunamadı.';end if;return public.dm_rally_view(r);end if;
 if class_id is null or class_id not between 1 and 8 or cardinality(unit_ids) not between 1 and 10 or exists(select 1 from unnest(unit_ids) u where u is null or u not between 1 and 100) or pace not in ('easy','normal','hard') or jsonb_typeof(question_deck) is distinct from 'array' or jsonb_array_length(question_deck) not in (12,15) then raise exception 'Geçerli sınıf, ünite ve 12 veya 15 kelime gerekli.';end if;
 if exists(select 1 from jsonb_array_elements(question_deck) q where jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options')<>3 or (q->>'answer')::int not between 0 and 2 or nullif(q->>'word','') is null) then raise exception 'Geçersiz yarış kelimeleri.';end if;
 if (select count(*) from public.dm_rally_runs where student_id=actor and created_at>now()-interval '1 minute')>=5 then raise exception 'Yeni yarış için kısa bir süre bekle.';end if;
 ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900));
 available:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+ticks) end;
 if available<3 then raise exception 'Yarışa başlamak için 3 enerji gerekli.';end if;
 insert into public.dm_rally_runs(id,student_id,class_no,units,difficulty,deck) values(run_key,actor,class_id,unit_ids,pace,question_deck) returning * into r;
 update public.students set energy=available-3,energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
 insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-3,available-3,'ralli:'||run_key);
 return public.dm_rally_view(r)||jsonb_build_object('energy',available-3,'energyMax',st.energy_max);
end $function$
;

CREATE OR REPLACE FUNCTION public.dm_virtual_duel_native_start(p_token text, p_bot smallint, p_game text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.students; r public.dm_virtual_duel_runs; used integer; today_used integer; plan text; current_level integer; needed integer; game_native text; run_key uuid;
begin
 s:=dm_private.rpc_ogrenci(p_token,'');
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 perform 1 from public.students where id=s.id for update;
 if not exists(select 1 from public.dm_virtual_league_rivals b where b.bot_id=p_bot and b.active) then
  return jsonb_build_object('ok',false,'message','Sanal rakip bulunamadı.'); end if;
 game_native:=case p_game when 'kelime' then 'ky' when 'hafiza' then 'hafiza' when 'bosluk' then 'bosluk' when 'asmaca' then 'asmaca' when 'jeopardy' then 'jp' when 'yagmur' then 'yagmur' else null end;
 needed:=case p_game when 'kelime' then 3 when 'hafiza' then 6 when 'bosluk' then 11 when 'asmaca' then 14 when 'jeopardy' then 22 when 'yagmur' then 28 else 999 end;
 if game_native is null then return jsonb_build_object('ok',false,'message','Bu oyunun gerçek düello bağlantısı henüz yok.'); end if;
 select public.dm_student_level(coalesce((e.value->>'totalXp')::numeric,0)) into current_level
 from public.extra_data e where e.student_id=s.id and e.key_name='yo';
 if coalesce(current_level,1)<greatest(5,needed) and not public.dm_level_early_access(s.id) then return jsonb_build_object('ok',false,'message','Bu oyun seviyende henüz açılmadı.'); end if;
 select * into r from public.dm_virtual_duel_runs where student_id=s.id and completed_at is null order by created_at desc limit 1;
 if r.id is not null then
  if not r.native_mode then
  update public.dm_virtual_duel_runs set native_mode=true, game_key=p_game,bot_id=p_bot,questions='[]'::jsonb,next_index=0,correct_count=0 where id=r.id;
  r.game_key:=p_game;
  r.bot_id:=p_bot;
 end if;
  return jsonb_build_object('ok',true,'runId',r.id,'game',r.game_key,'botId',r.bot_id,'difficulty',r.difficulty,'resumed',true,'papiTarget',case when r.difficulty='easy' then 25 else 70 end);
 end if;
 select count(*) into used from public.dm_virtual_duel_runs where student_id=s.id;
 plan:=public.dm_plan(s.id,'student');
 if used>=2 and plan='free' then return jsonb_build_object('ok',false,'paywall',true,'message','İki ücretsiz düello hakkın tamamlandı.'); end if;
 select count(*) into today_used from public.dm_virtual_duel_runs where student_id=s.id
 and created_at>=date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
 if used>=2 and plan='pro' and today_used>=5 then return jsonb_build_object('ok',false,'paywall',true,'message','Pro günlük düello hakkın doldu.'); end if;
 insert into public.dm_virtual_duel_runs(student_id,bot_id,game_key,attempt_no,difficulty,questions,bot_score,native_mode)
 values(s.id,p_bot,p_game,used+1,case when used=0 then 'easy' else 'hard' end,'[]'::jsonb,
 case when used=0 then 2 else 4 end,true) returning id into run_key;
 return jsonb_build_object('ok',true,'runId',run_key,'game',p_game,'botId',p_bot,'difficulty',case when used=0 then 'easy' else 'hard' end,'papiTarget',case when used=0 then 25 else 70 end,'freeRemaining',greatest(0,1-used));
end $function$
;

CREATE OR REPLACE FUNCTION public.dm_virtual_duel_start(p_token text, p_bot smallint, p_game text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.students; tries integer; plan text; grade integer; needed integer;
 w record; distractors text[]; opts text[]; qs jsonb:='[]'::jsonb; n integer:=0;
 this_id uuid; this_bot integer; this_difficulty text; active_id uuid;
begin
 s:=dm_private.rpc_ogrenci(p_token,'');
 if s.id is null then return jsonb_build_object('ok',false,'message','Oturum gerekli.'); end if;
 perform 1 from public.students where id=s.id for update;
 if not exists(select 1 from public.dm_virtual_league_rivals where bot_id=p_bot and active) then return jsonb_build_object('ok',false,'message','Rakip bulunamadı.'); end if;
 select coalesce((e.value->>'totalXp')::numeric,0) into grade from public.extra_data e where e.student_id=s.id and e.key_name='yo';
 needed:=case p_game when 'kelime' then 3 when 'hafiza' then 6 when 'bosluk' then 11 when 'asmaca' then 14 when 'jeopardy' then 22 when 'yagmur' then 28 else 999 end;
 if public.dm_student_level(coalesce(grade,0))<greatest(5,needed) and not public.dm_level_early_access(s.id) then return jsonb_build_object('ok',false,'message','Bu oyun henüz seviyende açılmadı.'); end if;
 select count(*) into tries from public.dm_virtual_duel_runs where student_id=s.id;
 plan:=public.dm_plan(s.id,'student');
 if tries>=2 and plan='free' then return jsonb_build_object('ok',false,'paywall',true,'message','İki ücretsiz düello hakkın tamamlandı.'); end if;
 if tries>=2 and plan='pro' and (select count(*) from public.dm_virtual_duel_runs where student_id=s.id and created_at>=date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul')>=5 then
  return jsonb_build_object('ok',false,'paywall',true,'message','Pro günlük düello hakkın tamamlandı.'); end if;
 -- An unfinished duel is resumed rather than consuming another play.
 select id into active_id from public.dm_virtual_duel_runs where student_id=s.id and completed_at is null order by created_at desc limit 1;
 if active_id is not null then
  return jsonb_build_object('ok',false,'resume',true,'message','Önce başladığın düelloyu tamamla.'); end if;
 grade:=greatest(1,least(8,coalesce(s.selected_class,s.class_no,5)));
 for w in select english,turkish from public.word_bank
    where active is true and class_no<=grade and nullif(btrim(english),'') is not null and nullif(btrim(turkish),'') is not null
    order by random() limit 6 loop
  select array_agg(d.turkish) into distractors from (
    select turkish from (select distinct turkish from public.word_bank where active is true and class_no<=grade and turkish<>w.turkish and nullif(btrim(turkish),'') is not null) src order by random() limit 2
  ) d;
  if coalesce(array_length(distractors,1),0)<2 then continue; end if;
  select array_agg(v order by random()) into opts from unnest(array[w.turkish,distractors[1],distractors[2]]) v;
  qs:=qs||jsonb_build_array(jsonb_build_object('english',w.english,'options',to_jsonb(opts),'correct',array_position(opts,w.turkish)-1));
  n:=n+1;
 end loop;
 if n<>6 then return jsonb_build_object('ok',false,'message','Düello soruları hazırlanamadı.'); end if;
 this_difficulty:=case when tries=0 then 'easy' else 'hard' end;
 this_bot:=case when this_difficulty='easy' then 2 else 4 end;
 insert into public.dm_virtual_duel_runs(student_id,bot_id,game_key,attempt_no,difficulty,questions,bot_score)
 values(s.id,p_bot,p_game,tries+1,this_difficulty,qs,this_bot) returning id into this_id;
 return jsonb_build_object('ok',true,'runId',this_id,'difficulty',this_difficulty,'attempt',tries+1,'remaining',greatest(0,1-tries),
 'game',p_game,'total',6,'question',jsonb_build_object('english',qs->0->>'english','options',qs->0->'options'),'botScore',0,'yourScore',0,'step',0);
end $function$
;
