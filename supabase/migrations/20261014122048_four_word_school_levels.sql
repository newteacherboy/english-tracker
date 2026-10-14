-- Four-word school levels use part numbers 51+; old 12-word stops stay intact.
-- Legacy completions expand virtually; repeat reward checks recognize their parent.
-- No student rows, wallet balances, or historic completions are rewritten.

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
   select (x->>'stop')::int stop_no from dm_private.parkur_xp_seed() p
   cross join lateral jsonb_array_elements(p.completed_stops) x where p.student_id=actor
   union
   select c.level_no from public.level_completions c
   where c.student_id=actor and c.mode='buyu' and (c.level_no between 1000 and 1999 or c.level_no between 210000 and 290000)
 ) preserved;
 preserved_done:=done;
 for b in 0..3 loop
  select coalesce(jsonb_agg(stop_no order by stop_no),'[]') into group_stops from (
   select 200000+w.class_no*10000+w.unit_no*100+50+part stop_no from (
    select class_no,unit_no,count(distinct lower(btrim(english))) word_count
    from public.word_bank where active and class_no between b*2+1 and b*2+2 and unit_no>0 and btrim(coalesce(english,''))<>'' and btrim(coalesce(turkish,''))<>'' group by class_no,unit_no
   ) w cross join lateral generate_series(1,ceil(w.word_count/4.0)::int) part
  ) sections;
  select coalesce(jsonb_agg(distinct stop_no order by stop_no),'[]') into done from (
   select (x.value)::text::int stop_no from jsonb_array_elements(done) x
   union select (x.value)::text::int from jsonb_array_elements(group_stops) x
   where preserved_done @> jsonb_build_array(((x.value)::text::int/100)*100+(((x.value)::text::int%100-51)/3)+1) or (((x.value)::text::int%100) between 51 and 53 and preserved_done @> jsonb_build_array(1000+(((x.value)::text::int-200000)/10000)*100+(((x.value)::text::int-200000)%10000)/100))
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
 return jsonb_build_object('level',l,'feed',feed,'done',done,'units',units,'complete',comp,'lessons',lessons,'chests',ch,'owned',coalesce(v#>'{karakter,sahip}','[]'),'yo',v);
end $function$
;

CREATE OR REPLACE FUNCTION public.dm_game_reward_claim(actor uuid, run_key text, game text, class_id integer, unit_ids integer[], correct integer, wrong integer, seconds numeric, first_clear boolean DEFAULT false, stars integer DEFAULT 1, boost integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v jsonb; previous public.dm_game_reward_runs; t timestamptz; n int; x int:=0;g int:=0;speed int;daily numeric;fac int;ver bigint;day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');reason text:='awarded';deadline timestamptz;
begin
 if game is null or class_id is null or unit_ids is null or correct is null or wrong is null or seconds is null or run_key is null or length(run_key) not between 8 and 100 or game not in ('ky','jp','bosluk','hafiza','yagmur','asmaca','kelimebul','eslestirme','tren','dikte','cumle','harfbahcesi','kp','ba') or class_id not between 0 and 12 or cardinality(unit_ids) not between 1 and 20 or exists(select 1 from unnest(unit_ids) u where u is null or u not between 0 and (case when game='ba' then 300000 else 100 end)) or correct not between 0 and (case when game='ba' then 32 else 12 end) or wrong not between 0 and 10000 or seconds<=0 or seconds>86400 then raise exception 'Geçersiz oyun sonucu';end if;
 -- Convert cached unit-scoped parkur claims to the first section only.
 if game='ba' and unit_ids[1]<1000 then unit_ids:=array[200000+class_id*10000+unit_ids[1]*100+1];end if;
 perform 1 from public.students where id=actor for update;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;if v is null then raise exception 'Öğrenci verisi gerekli';end if;
 select * into previous from public.dm_game_reward_runs where student_id=actor and run_id=run_key;
 if found then return jsonb_build_object('ok',true,'duplicate',true,'xp',previous.xp,'gold',previous.gold,'reason','duplicate','yo',v);end if;
 -- Parkur (ba): her yeni durak bağımsızdır; günlük/24 saat sınırı uygulanmaz.
 -- Sadece ilk başarılı tamamlama ödüllüdür. Aynı durak bir daha XP/altın vermez.
 if game='ba' then
  if correct<7 then reason:='no_correct';
  elsif exists(
    select 1 from public.dm_game_reward_runs
    where student_id=actor and game_key='ba' and class_no=class_id
      and (units&&unit_ids or (unit_ids[1]%100 between 51 and 99 and units @> array[(unit_ids[1]/100)*100+(unit_ids[1]%100-51)/3+1])) and xp>0
  ) then reason:='already_completed';
  else
   -- The parkur cap is twice the normal game's base caps (96 XP, 20 gold).
   -- Score both rewards proportionally to correct answers and elapsed time.
   speed:=round(12000/(120+seconds));
   x:=least(192,round(192*least(1,correct::numeric/12)*(0.7+0.3*least(1,speed::numeric/100))));
   g:=case when x<=0 then 0 else least(40,round(40*least(1,correct::numeric/12)*(0.7+0.3*least(1,speed::numeric/100)))) end;
  end if;
 else
  -- Every completed solo run may earn rewards; duplicate run IDs remain idempotent.
  if correct=0 then reason:='no_correct';else
   select count(*)+1 into n from public.dm_game_reward_runs where student_id=actor and game_key<>'ba' and xp>0 and to_char(created_at at time zone 'Europe/Istanbul','YYYY-MM-DD')=day;
   daily:=case when n<=3 then 2 when n>12 then .5 else 1 end;
   fac:=case when public.dm_student_level(coalesce((v->>'totalXp')::numeric,0))>=15 and boost in (2,3) then 2 else 1 end;
   speed:=round(correct*600/(1+seconds/correct));x:=round(least(96,greatest(0,correct*6+floor(speed/100.0)-wrong*3))*daily*fac);
   g:=case when x=0 then 0 else round((array[4,7,10])[case when correct::numeric/(correct+wrong)>=.8 then 3 when correct::numeric/(correct+wrong)>=.5 then 2 else 1 end]*daily*case when public.dm_student_level(coalesce((v->>'totalXp')::numeric,0))>=15 and boost in (2,4) then 2 else 1 end) end;
  end if;
 end if;
 if game='ba' and correct>=7 then
  insert into public.level_completions(student_id,mode,class_no,unit_no,level_no)
  values(actor,'buyu',0,0,unit_ids[1])
  on conflict(student_id,mode,class_no,unit_no,level_no) do nothing;
 end if;
 insert into public.dm_game_reward_runs values(actor,run_key,game,class_id,unit_ids,x,g,now());
 if x>0 or g>0 then
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
  v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
  v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
  update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';update public.students set gold=(v->>'altin')::numeric where id=actor;
  select value into v from public.extra_data where student_id=actor and key_name='yo';
 end if;
 return jsonb_build_object('ok',true,'xp',x,'gold',g,'reason',reason,'nextRewardAt',deadline,'yo',v);
end $function$
;

CREATE OR REPLACE FUNCTION public.dm_progress_award_stop(actor uuid, stop integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare ctx jsonb; n int; g int:=0; v jsonb; l int;
begin
 perform pg_advisory_xact_lock(hashtextextended(actor::text,17));ctx:=public.dm_progress_context(actor);l:=(ctx->>'level')::int;
 if (stop%100 between 51 and 99 and ctx->'done' @> jsonb_build_array((stop/100)*100+(stop%100-51)/3+1)) or (stop%100 between 51 and 53 and ctx->'done' @> jsonb_build_array(1000+((stop-200000)/10000)*100+((stop-200000)%10000)/100)) or l<5 or not ctx->'done' @> jsonb_build_array(stop) or exists(select 1 from public.dm_progress_baseline p cross join lateral jsonb_array_elements(p.stops) x where p.student_id=actor and (x->>'stop')::int=stop) then return jsonb_build_object('gold',0);end if;
 insert into public.dm_progress_rewards(student_id,kind,reward_key) values(actor,'stop',stop::text) on conflict do nothing;
 if not found then return jsonb_build_object('gold',0);end if;
 select count(*) into n from public.dm_progress_rewards where student_id=actor and kind='stop';
 if n%3=0 then g:=(array[15,20,30,40,50,65,80,100])[least(8,(l-5)/5+1)];v:=public.dm_progress_credit(actor,g);update public.dm_progress_rewards set gold=g where student_id=actor and kind='stop' and reward_key=stop::text;end if;
 return jsonb_build_object('gold',g,'yo',v);
end $function$
;
