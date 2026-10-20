begin;
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
  select coalesce(jsonb_agg(stop_no order by class_no, mixed, unit_no, part),'[]') into group_stops from (
   select w.class_no,w.unit_no,part,part>ceil(w.word_count/4.0)::int mixed,200000+w.class_no*10000+w.unit_no*100+50+part stop_no from (
    select class_no,unit_no,count(distinct lower(btrim(english))) word_count
    from public.word_bank where active and class_no between b*2+1 and b*2+2 and unit_no>0 and btrim(coalesce(english,''))<>'' and btrim(coalesce(turkish,''))<>'' group by class_no,unit_no
   ) w cross join lateral generate_series(1,ceil(w.word_count/4.0)::int * case when w.class_no in (1,3,7,8) then 2 else 1 end) part
  ) sections;
  select coalesce(jsonb_agg(distinct stop_no order by stop_no),'[]') into done from (
   select (x.value)::text::int stop_no from jsonb_array_elements(done) x
   union select (x.value)::text::int from jsonb_array_elements(group_stops) x
   where (preserved_done @> jsonb_build_array(((x.value)::text::int/100)*100+(((x.value)::text::int%100-51)/3)+1) or (((x.value)::text::int%100) between 51 and 53 and preserved_done @> jsonb_build_array(1000+(((x.value)::text::int-200000)/10000)*100+(((x.value)::text::int-200000)%10000)/100)) ) and exists(select 1 from public.word_bank wb where wb.active and wb.class_no=(((x.value)::text::int-200000)/10000) and wb.unit_no=(((x.value)::text::int-200000)%10000)/100 group by wb.class_no,wb.unit_no having ((x.value)::text::int%100-50)<=ceil(count(distinct lower(btrim(wb.english)))/4.0))
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
alter table public.papi_story_progress drop constraint papi_story_progress_chapter_check;
alter table public.papi_story_progress add constraint papi_story_progress_chapter_check check(chapter between 0 and 79 or chapter between 1000 and 1383);
alter table public.dm_thematic_first_answers drop constraint dm_thematic_first_answers_chapter_check;
alter table public.dm_thematic_first_answers add constraint dm_thematic_first_answers_chapter_check check(chapter between 1000 and 1383);
alter table public.dm_thematic_recovery drop constraint dm_thematic_recovery_chapter_check;
alter table public.dm_thematic_recovery add constraint dm_thematic_recovery_chapter_check check(chapter between 1000 and 1383);
CREATE OR REPLACE FUNCTION public.dm_thematic_fair_step(owner_key text, chapter_no integer, expected_cursor integer, expected_version integer, answer_correct boolean, is_question boolean, step_count integer, question_count integer, combo_correct boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare p public.papi_story_progress; r jsonb; n integer; correct_count integer;
 existing_answer boolean; effective_correct boolean; tier integer:=0; score_eligible boolean:=false;
 rec public.dm_thematic_recovery; new_award jsonb;
begin
 if owner_key is null or owner_key !~ '^[st]:[0-9a-f-]{36}$'
 or chapter_no not between 1000 and 1383 or expected_cursor not between 0 and 13
 or expected_version<0 or step_count not in (10,11,12,14)
 or (case when step_count=14 then question_count<>10 else question_count<>step_count-1 end) or answer_correct is null or is_question is null or combo_correct is null
 then raise exception 'Geçersiz öğrenme işlemi';end if;
 if left(owner_key,2)='s:' then
  perform pg_advisory_xact_lock(hashtextextended(substring(owner_key from 3),17));
  perform 1 from public.students where id=substring(owner_key from 3)::uuid for update;
 end if;
 select * into p from public.papi_story_progress where actor_key=owner_key and chapter=chapter_no for update;
 if not found then raise exception 'Önce bölümü aç';end if;
 if p.cursor<>expected_cursor or p.version<>expected_version then
  return jsonb_build_object('ok',true,'stale',true,'progress',to_jsonb(p));
 end if;
 select * into rec from public.dm_thematic_recovery
 where actor_key=owner_key and chapter=chapter_no for update;
 if rec.actor_key is not null and not rec.completed and not p.completed then
  select count(*),count(*) filter(where first_correct)
   into n,correct_count from public.dm_thematic_first_answers
   where actor_key=owner_key and chapter=chapter_no;
  return jsonb_build_object('ok',true,'correct',false,'needsRecovery',true,
   'progress',to_jsonb(p),'firstAttempt',jsonb_build_object('answered',n,'correct',correct_count,
     'total',question_count,'complete',n=question_count,'percentage',round(100.0*correct_count/greatest(n,1))),
   'recovery',jsonb_build_object('step',rec.step,'total',3));
 end if;
 -- Inspect the final task without accepting client-supplied correctness counts.
 -- Legacy/in-progress decks missing a complete historical first-answer ledger
 -- are grandfathered: do not block or discount those students.
 if step_count in (12,14) and p.cursor=step_count-1 and not p.replay and not p.reward_claimed then
  select count(*),count(*) filter(where first_correct) into n,correct_count
  from public.dm_thematic_first_answers where actor_key=owner_key and chapter=chapter_no;
  if not exists(select 1 from public.dm_thematic_first_answers where actor_key=owner_key
        and chapter=chapter_no and question_cursor=step_count-1) and p.charged_cursor<>p.cursor then
   n:=n+1;
   if combo_correct then correct_count:=correct_count+1;end if;
  end if;
  score_eligible:=n=question_count;
  if score_eligible then
   tier:=case when correct_count=question_count then 100
         when correct_count>=question_count-1 then 80
         when correct_count>=ceil(question_count*0.7) then 60 else 0 end;
  end if;
 end if;
 -- A below-8/11 learner finishes the review QUESTION but not the lesson.
 -- This deliberately returns cursor=11 and requires three new recovery questions.
 if score_eligible and tier=0 then
  r:=public.dm_story_apply(owner_key,chapter_no,expected_cursor,expected_version,
     false,is_question,step_count,question_count,combo_correct);
 else
  r:=public.dm_story_apply(owner_key,chapter_no,expected_cursor,expected_version,
     answer_correct,is_question,step_count,question_count,combo_correct);
 end if;
 if not coalesce((r->>'ok')::boolean,false)
  or coalesce((r->>'stale')::boolean,false)
  or coalesce((r->>'energyEmpty')::boolean,false) then return r;end if;
 if is_question and p.cursor>(step_count-question_count-1) and p.cursor<step_count
  and p.charged_cursor<>p.cursor and not p.replay and not p.completed then
  insert into public.dm_thematic_first_answers(actor_key,chapter,question_cursor,first_correct)
  values(owner_key,chapter_no,p.cursor,combo_correct) on conflict do nothing;
 end if;
 select count(*),count(*) filter(where first_correct)
  into n,correct_count from public.dm_thematic_first_answers
  where actor_key=owner_key and chapter=chapter_no;
 if score_eligible and tier=0 then
  insert into public.dm_thematic_recovery(actor_key,chapter)
  values(owner_key,chapter_no) on conflict do nothing;
  r:=r||jsonb_build_object('needsRecovery',true,
     'recovery',jsonb_build_object('step',0,'total',3),
     'mesaj','Kısa pekiştirme turuyla bölümü bitir.');
 elsif score_eligible and tier>0 and coalesce((r->>'finished')::boolean,false)
   and left(owner_key,2)='s:' then
  new_award:=public.dm_thematic_discount_final(owner_key,chapter_no,r->'reward',tier);
  r:=jsonb_set(r,'{reward}',new_award);
  r:=jsonb_set(r,'{yo}',new_award->'yo');
  r:=jsonb_set(r,'{progress,last_reward}',new_award);
 end if;
 return r||jsonb_build_object('firstAttempt',
   jsonb_build_object('answered',n,'correct',correct_count,'total',question_count,
     'complete',n=question_count,'eligible',n=question_count and not p.replay,
     'percentage',case when n>0 then round(100.0*correct_count/n) else null end));
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_thematic_recovery_answer(owner_key text, chapter_no integer, expected_version integer, expected_step integer, answer_correct boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare p public.papi_story_progress; rec public.dm_thematic_recovery; r jsonb; new_award jsonb;
 n integer; c integer; step_total integer; question_total integer; final_cursor integer;
begin
 if owner_key is null or owner_key !~ '^[st]:[0-9a-f-]{36}$'
  or chapter_no not between 1000 and 1383 or expected_version<0
  or expected_step not between 0 and 2 or answer_correct is null then
  raise exception 'Geçersiz pekiştirme cevabı';end if;
 if left(owner_key,2)='s:' then
  perform pg_advisory_xact_lock(hashtextextended(substring(owner_key from 3),17));
  perform 1 from public.students where id=substring(owner_key from 3)::uuid for update;
 end if;
 select * into p from public.papi_story_progress where actor_key=owner_key and chapter=chapter_no for update;
 if not found then raise exception 'Bölüm bulunamadı';end if;
 select * into rec from public.dm_thematic_recovery
 where actor_key=owner_key and chapter=chapter_no for update;
 step_total:=case when p.deck_version=8 then 14 else 12 end;
 question_total:=case when p.deck_version=8 then 10 else 11 end;
 final_cursor:=step_total-1;
 if not found or rec.completed or p.completed or p.replay or p.cursor<>final_cursor
 then raise exception 'Pekiştirme açık değil';end if;
 if rec.step<>expected_step or p.version<>expected_version then
  return jsonb_build_object('ok',true,'stale',true,'progress',to_jsonb(p),
   'needsRecovery',true,'recovery',jsonb_build_object('step',rec.step,'total',3));
 end if;
 if not answer_correct then
  update public.dm_thematic_recovery set errors=errors+1,updated_at=now()
   where actor_key=owner_key and chapter=chapter_no;
  return jsonb_build_object('ok',true,'correct',false,'accepted',false,'needsRecovery',true,
   'progress',to_jsonb(p),'recovery',jsonb_build_object('step',rec.step,'total',3));
 end if;
 if rec.step<2 then
  update public.dm_thematic_recovery set step=step+1,updated_at=now()
  where actor_key=owner_key and chapter=chapter_no;
  return jsonb_build_object('ok',true,'correct',true,'accepted',true,'needsRecovery',true,
   'progress',to_jsonb(p),'recovery',jsonb_build_object('step',rec.step+1,'total',3));
 end if;
 select count(*),count(*) filter(where first_correct) into n,c
 from public.dm_thematic_first_answers where actor_key=owner_key and chapter=chapter_no;
 if n<>question_total or c>=ceil(question_total*0.7) then raise exception 'İlk başarı kaydı tutarsız';end if;
 -- Final review was already answered (and charged), so this completion costs
 -- no additional energy and never adds a second five-answer combo.
 r:=public.dm_story_apply(owner_key,chapter_no,p.cursor,p.version,
   true,false,step_total,question_total,false);
 if not coalesce((r->>'ok')::boolean,false) or not coalesce((r->>'finished')::boolean,false)
 then raise exception 'Pekiştirme tamamlanamadı';end if;
 if left(owner_key,2)='s:' then
  new_award:=public.dm_thematic_discount_final(owner_key,chapter_no,r->'reward',30);
  r:=jsonb_set(r,'{reward}',new_award);
  r:=jsonb_set(r,'{yo}',new_award->'yo');
  r:=jsonb_set(r,'{progress,last_reward}',new_award);
 end if;
 update public.dm_thematic_recovery set step=3,completed=true,updated_at=now()
 where actor_key=owner_key and chapter=chapter_no;
 return r||jsonb_build_object('accepted',true,'recovered',true,'firstAttempt',
 jsonb_build_object('answered',n,'correct',c,'total',question_total,'percentage',round(100.0*c/question_total)));
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_thematic_discount_final(owner_key text, chapter_no integer, award jsonb, percent integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare sid uuid; previous public.dm_game_reward_runs; v jsonb;
 base_x integer; base_g integer; next_x integer; next_g integer; dx integer; dg integer;
 day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); ver bigint;
 result_reward jsonb;
begin
 if owner_key !~ '^s:[0-9a-f-]{36}$' or chapter_no not between 1000 and 1383 or percent not in (30,60,80,100)
 then raise exception 'Geçersiz ödül oranı';end if;
 sid:=substring(owner_key from 3)::uuid;
 select * into previous from public.dm_game_reward_runs where student_id=sid
   and run_id='papi-story-'||chapter_no for update;
 if not found or previous.game_key<>'ba' then raise exception 'Tamamlama ödül kaydı eksik';end if;
 base_x:=previous.xp; base_g:=previous.gold;
 next_x:=floor(base_x*percent/100.0)::int;
 next_g:=floor(base_g*percent/100.0)::int;
 dx:=base_x-next_x;dg:=base_g-next_g;
 select value into v from public.extra_data where student_id=sid and key_name='yo' for update;
 if v is null then raise exception 'Öğrenci ödül verisi bulunamadı';end if;
 if dx>0 or dg>0 then
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',greatest(0,coalesce((v->>'totalXp')::numeric,0)-dx),
    'altin',greatest(0,coalesce((v->>'altin')::numeric,0)-dg),
    'guncelleme',ver,'dmRewardVersion',ver);
  if v#>>'{xpGun,tarih}'=day then
   v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(greatest(0,coalesce((v#>>'{xpGun,xp}')::numeric,0)-dx)));
  end if;
  v:=jsonb_set(v,array['log',day],to_jsonb(greatest(0,coalesce((v#>>array['log',day])::numeric,0)-dx)),true);
  update public.extra_data set value=v,updated_at=now() where student_id=sid and key_name='yo';
  update public.students set gold=(v->>'altin')::numeric where id=sid;
  update public.dm_game_reward_runs set xp=next_x,gold=next_g where student_id=sid and run_id=previous.run_id;
 end if;
 result_reward:=coalesce(award,'{}'::jsonb)||
    jsonb_build_object('xp',next_x,'gold',greatest(0,coalesce((award->>'gold')::int,base_g)-dg),'yo',v,
      'fairPercent',percent,'fairTier',case percent when 100 then 'perfect' when 80 then 'high' when 60 then 'pass' else 'recovery' end);
 update public.papi_story_progress set last_reward=result_reward
 where actor_key=owner_key and chapter=chapter_no;
 return result_reward;
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_story_apply(owner_key text, chapter_no integer, expected_cursor integer, expected_version integer, answer_correct boolean, is_question boolean, step_count integer, question_count integer, combo_correct boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare p public.papi_story_progress; s public.students; v jsonb; reward jsonb:='{}'; regen int; e int; cap int; costs int:=0; seen int; cur int; finished boolean; first_done boolean; stars int; l int; n int; g int:=0; bonus int:=0; combo int:=0; combo_gain int:=0;
begin
 if owner_key is null or owner_key !~ '^[st]:[0-9a-f-]{36}$' or (chapter_no not between 0 and 79 and chapter_no not between 1000 and 1383) or step_count not between 2 and 80 or question_count not between 1 and 80 or question_count>step_count or answer_correct is null or (is_question is null or combo_correct is null) then raise exception 'Geçersiz öğrenme işlemi';end if;
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
 if is_question and p.charged_cursor<>p.cursor then seen:=seen+1;if chapter_no>=1000 or seen%2=0 then costs:=1;end if;end if;
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
  if not combo_correct then combo:=0;
  else combo:=combo+1;
  end if;
 end if;
 if s.id is not null and combo_correct and is_question and combo>0 and combo % (case when chapter_no>=1000 then 5 else 3 end)=0 then
  combo_gain:=least(1,greatest(0,cap-(e-costs)));
  if combo_gain>0 then
   update public.students set energy=e-costs+combo_gain where id=s.id;
   insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(s.id,combo_gain,e-costs+combo_gain,'story-combo:'||chapter_no||':'||p.version);
  end if;
 end if;
 cur:=p.cursor+case when answer_correct then 1 else 0 end;finished:=cur>=step_count;first_done:=finished and not p.reward_claimed;
 if first_done and s.id is not null then
  stars:=case when question_count::numeric/(question_count+p.mistakes+case when combo_correct then 0 else 1 end)>=.9 then 3 when question_count::numeric/(question_count+p.mistakes+case when combo_correct then 0 else 1 end)>=.7 then 2 else 1 end;
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
 update public.papi_story_progress set route_combo=combo,cursor=cur,completed=p.completed or finished,reward_claimed=p.reward_claimed or finished,questions_seen=seen,charged_cursor=case when is_question then p.cursor else p.charged_cursor end,mistakes=p.mistakes+case when combo_correct then 0 else 1 end,version=p.version+1,last_reward=case when finished then reward else p.last_reward end,updated_at=now() where actor_key=owner_key and chapter=chapter_no returning * into p;
 return jsonb_build_object('ok',true,'progress',to_jsonb(p),'correct',answer_correct,'finished',finished,'leaf',case when first_done then 1 else 0 end,'energySpent',costs,'comboGain',combo_gain,'combo',combo,'enerjiKalan',case when s.id is not null then e-costs+combo_gain else null end,'enerjiMax',cap,'reward',p.last_reward,'yo',reward->'yo');
end $function$
;
do $verify$ declare c jsonb; begin
select public.dm_progress_context(id) into c from public.students limit 1;
if c is null or jsonb_array_length(c->'units')<>4 then raise exception 'Invalid route context'; end if;
if (select count(*) from jsonb_array_elements(c->'units') g cross join lateral jsonb_array_elements_text(g) n where (n::int-200000)/10000=1)<>48 then raise exception 'Class 1 count mismatch';end if;
end $verify$;
commit;
