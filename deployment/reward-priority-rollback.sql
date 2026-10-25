-- Restores formulas only; earned balances and receipts stay unchanged.
CREATE OR REPLACE FUNCTION public.dm_break_reward(game_code text, score integer, collected_gold integer, seconds integer)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare rate int;unit int;
begin
 if game_code is null or game_code not in ('kosu','zipla','patlat') or seconds is null or seconds<0 or seconds>1800 or score is null or score<0 or collected_gold is null or collected_gold<0 then raise exception 'Geçersiz oyun sonucu.';end if;
 rate:=case game_code when 'kosu' then 35 when 'zipla' then 60 else 2500 end;
 unit:=case game_code when 'kosu' then 100 when 'zipla' then 150 else 1000 end;
 if score>seconds*rate+(case when game_code='patlat' then 0 else 3 end) then raise exception 'Oyun sonucu süreyle uyuşmuyor.';end if;
 return least(100,least(collected_gold,seconds*3,case game_code when 'patlat' then score/60 else score/5 end)+least(20,score/unit));
end $function$;

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
   -- Parkur stop maximum stays 192 XP / 40 gold.
   speed:=round(12000/(120+seconds));
   x:=least(192,round(192*least(1,correct::numeric/12)*(0.7+0.3*least(1,speed::numeric/100))));
   g:=case when x<=0 then 0 else least(40,round(40*least(1,correct::numeric/12)*(0.7+0.3*least(1,speed::numeric/100)))) end;
  end if;
 else
  -- Every completed solo run may earn rewards; duplicate run IDs remain idempotent.
  -- A game run is always worth less than a parkur stop: hard ceiling dm_game_xp_cap() (172).
  if correct=0 then reason:='no_correct';else
   select count(*)+1 into n from public.dm_game_reward_runs where student_id=actor and game_key<>'ba' and game_key not like 'konu:%' and xp>0 and to_char(created_at at time zone 'Europe/Istanbul','YYYY-MM-DD')=day;
   daily:=case when n<=3 then 2 when n>12 then .5 else 1 end;
   fac:=case when public.dm_student_level(coalesce((v->>'totalXp')::numeric,0))>=15 and boost in (2,3) then 2 else 1 end;
   speed:=round(correct*600/(1+seconds/correct));
   x:=least(public.dm_game_xp_cap(),round(least(80,greatest(0,correct*6+floor(speed/100.0)-wrong*3))*daily*fac))::int;
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
end $function$;

CREATE OR REPLACE FUNCTION public.dm_lesson_fair_award(actor uuid, cefr text, category_name text, topic text, requested_tier integer, historical boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare old_tier int:=0; new_tier int; gain_xp int:=0; gain_gold int:=0; v jsonb; today text; ver bigint;
begin
 if actor is null or requested_tier not in (30,60,80,100) then raise exception 'Geçersiz ders başarısı';end if;
 if not exists(select 1 from public.lesson_topics where active and upper(level)=upper(cefr) and category=category_name and topic_name=topic)
 or not exists(select 1 from public.lesson_progress where student_id=actor and upper(level)=upper(cefr) and category=category_name and topic_name=topic and test_success=true)
 then raise exception 'Onaylı ders bitirme kaydı bulunamadı';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,17));
 select best_tier into old_tier from public.dm_lesson_fair_best
 where student_id=actor and level=upper(cefr) and category=category_name and topic_name=topic for update;
 old_tier:=coalesce(old_tier,0);
 -- Historical completions never create another first-clear award.
 if historical and old_tier=0 then
  insert into public.dm_lesson_fair_best(student_id,level,category,topic_name,best_tier)
  values(actor,upper(cefr),category_name,topic,100)
  on conflict do nothing;
  return jsonb_build_object('xp',0,'gold',0,'tier',100,'historical',true);
 end if;
 new_tier:=greatest(old_tier,requested_tier);
 if new_tier=old_tier then return jsonb_build_object('xp',0,'gold',0,'tier',old_tier,'duplicate',true);end if;
 -- Fixed 80 XP/25 gold base. Higher performance earns only the difference.
 gain_xp:=round(80.0*new_tier/100)-round(80.0*old_tier/100);
 gain_gold:=round(25.0*new_tier/100)-round(25.0*old_tier/100);
 insert into public.dm_lesson_fair_best(student_id,level,category,topic_name,best_tier)
 values(actor,upper(cefr),category_name,topic,new_tier)
 on conflict(student_id,level,category,topic_name) do update set
 best_tier=excluded.best_tier,updated_at=now();
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Öğrenci ödül cüzdanı bulunamadı';end if;
 today:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
 ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
 v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+gain_xp,
 'altin',coalesce((v->>'altin')::numeric,0)+gain_gold,'guncelleme',ver,
 'dmRewardVersion',ver,'dmProgressProtocol',1);
 v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=today
 then v->'xpGun' else jsonb_build_object('tarih',today,'xp',0) end);
 v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+gain_xp));
 update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
 update public.students set gold=(v->>'altin')::numeric where id=actor;
 return jsonb_build_object('xp',gain_xp,'gold',gain_gold,'tier',new_tier,'yo',v);
end $function$;

CREATE OR REPLACE FUNCTION public.dm_match_action(actor uuid, match_id uuid, action text, arg jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare m public.dm_matches;me public.students;them public.students; qs jsonb; pool jsonb;start_at timestamptz;ans jsonb;q jsonb;idx integer;sel integer;elapsed numeric;ra jsonb;rb jsonb;result jsonb;v jsonb;day text;n integer;mul numeric;gold integer;xp integer;
begin
 if action='create' then
  select * into me from public.students where id=actor and status='approved';select * into them from public.students where id=(arg->>'target')::uuid and status='approved';
  if me.id is null or them.id is null or me.id=them.id then raise exception 'Geçersiz rakip.';end if;
  perform pg_advisory_xact_lock(hashtextextended(least(me.id::text,them.id::text)||greatest(me.id::text,them.id::text),0));
  if public.dm_blocked(me.id,them.id) then raise exception 'Bu kişiyle iletişim kapalı.';end if;
  select count(*) into n from public.dm_matches where player_a=actor and created_at>now()-interval '24 hours';if n>=10 then raise exception 'Bugünkü 10 karşılaşma hakkını kullandın.';end if;
  if arg->>'game'='rota' then
   select jsonb_agg(jsonb_build_object('word',english,'answer',turkish)) into pool from (select distinct english,turkish from public.word_bank where active and class_no=least(me.class_no,them.class_no) and position(' ' in trim(english))>0 and length(turkish)<140 order by english limit 400) s;
  else
   select jsonb_agg(jsonb_build_object('word',english,'answer',turkish)) into pool from (select distinct english,turkish from public.word_bank where active and class_no=least(me.class_no,them.class_no) order by english limit 500) s;
  end if;
  if coalesce(jsonb_array_length(pool),0)<12 then raise exception 'Bu sınıfta 12 soruluk yeterli havuz yok.';end if;
  select jsonb_agg(p) into qs from (select p from (select distinct on (x->>'word') x p from jsonb_array_elements(pool) x order by x->>'word') u order by random() limit 12) picked;
  if jsonb_array_length(qs)<>12 then raise exception '12 farklı soru gerekiyor.';end if;
  select jsonb_agg(jsonb_set(x,'{choices}',(select jsonb_agg(txt order by random()) from (select x->>'answer' txt union all select txt from (select txt from (select distinct y->>'answer' txt from jsonb_array_elements(pool) y where y->>'answer'<>x->>'answer') d order by random() limit 5) wrong) opts))) into qs from jsonb_array_elements(qs) x;
  select jsonb_agg(x||jsonb_build_object('puanSurum',3)) into qs from jsonb_array_elements(qs) x;
  insert into public.dm_matches(player_a,player_b,game,mode,class_no,questions) values(actor,them.id,arg->>'game',arg->>'mode',least(me.class_no,them.class_no),qs) returning * into m;
  insert into public.notifications(recipient_student_id,sender_student_id,type,message,payload) values(them.id,actor,'oyunDavet',case when m.mode='live' then 'Aynı anda oynayalım: ' else '24 saatlik karşılaşma: ' end||case when m.game='ucus' then 'Kelime Uçuşu 🪽' else 'Cümle Rotası 🧩' end,jsonb_build_object('matchId',m.id));
 else
  select * into m from public.dm_matches where id=match_id and actor in(player_a,player_b) for update;
  if m.id is null then raise exception 'Karşılaşma bulunamadı.';end if;
 end if;
 if m.ranking_only then return public.dm_teacher_match_action(actor,m.id,action,arg);end if;
 if m.status in ('cancelled','expired') then return jsonb_build_object('ok',true,'id',m.id,'status',m.status);end if;
 if public.dm_blocked(m.player_a,m.player_b) then update public.dm_matches set status='cancelled' where id=m.id;return jsonb_build_object('ok',true,'id',m.id,'status','cancelled');end if;
 if m.expires_at<now() and m.status<>'finished' then update public.dm_matches set status='expired' where id=m.id;return jsonb_build_object('ok',true,'id',m.id,'status','expired');end if;
 if action='ready' and m.status<>'finished' then
  if actor=m.player_a then m.ready_a:=true;else m.ready_b:=true;end if;
  if m.mode='live' and m.ready_a and m.ready_b and m.start_a is null then
   perform 1 from public.students where id in(m.player_a,m.player_b) order by id for update;
   perform public.dm_match_energy(m.player_a);perform public.dm_match_energy(m.player_b);
   m.start_a:=now()+interval '5 seconds';m.start_b:=m.start_a;m.status:='playing';
  elsif m.mode='async' then
   if actor=m.player_a and m.start_a is null then perform public.dm_match_energy(actor);m.start_a:=now()+interval '3 seconds';elsif actor=m.player_b and m.start_b is null then perform public.dm_match_energy(actor);m.start_b:=now()+interval '3 seconds';end if;m.status:='playing';
  end if;
 end if;
 start_at:=case when actor=m.player_a then m.start_a else m.start_b end;
 ans:=case when actor=m.player_a then m.answers_a else m.answers_b end;
 elapsed:=case when start_at is null then -999 else extract(epoch from now()-start_at) end;idx:=floor(elapsed/12);
 if action='answer' then
  if idx<0 or idx>=jsonb_array_length(m.questions) or (arg->>'index')::integer<>idx or ans ? idx::text then raise exception 'Bu sorunun süresi doldu veya cevaplandı.';end if;
  q:=m.questions->idx;sel:=(arg->>'choice')::integer;
  if sel<0 or sel>=jsonb_array_length(q->'choices') then raise exception 'Geçersiz cevap.';end if;
  ans:=jsonb_set(ans,array[idx::text],jsonb_build_object('answer',q->'choices'->>sel,'ms',floor((elapsed-idx*12)*1000)));
  if actor=m.player_a then m.answers_a:=ans;else m.answers_b:=ans;end if;
 end if;
 if m.start_a is not null and now()>=m.start_a+make_interval(secs=>12*jsonb_array_length(m.questions)) and m.result_a is null then m.result_a:=public.dm_round_score(m.answers_a,m.questions);end if;
 if m.start_b is not null and now()>=m.start_b+make_interval(secs=>12*jsonb_array_length(m.questions)) and m.result_b is null then m.result_b:=public.dm_round_score(m.answers_b,m.questions);end if;
 -- Persist each player's ordinary game reward once; replay and polling cannot award twice.
 for n in 0..1 loop
  result:=case when n=0 then m.result_a else m.result_b end;
  if result is not null and not (result ? 'reward') then
   insert into public.extra_data(student_id,key_name,value) values(case when n=0 then m.player_a else m.player_b end,'yo','{}') on conflict(student_id,key_name) do nothing;
   select value into v from public.extra_data where student_id=case when n=0 then m.player_a else m.player_b end and key_name='yo' for update;
   if jsonb_typeof(v)='string' then v:=(v#>>'{}')::jsonb;end if;
   day:=(now() at time zone 'Europe/Istanbul')::date::text;
   idx:=case when v#>>'{oyunGun,t}'=day then coalesce((v#>>'{oyunGun,n}')::integer,0)+1 else 1 end;mul:=case when idx<=3 then 2 when idx>12 then .5 else 1 end;
   gold:=round((case (result->>'yildiz')::integer when 3 then 10 when 2 then 7 else 4 end)*mul);xp:=round((case when result->>'puanSurum'='3' then (result->>'xp')::numeric else case (result->>'yildiz')::integer when 3 then 50 when 2 then 35 else 20 end end)*mul);
   v:=jsonb_set(v,'{altin}',to_jsonb(coalesce((v->>'altin')::numeric,0)+gold));v:=jsonb_set(v,'{xp}',to_jsonb(coalesce((v->>'xp')::numeric,0)+xp));
   v:=jsonb_set(v,'{xpGun}',jsonb_build_object('tarih',day,'xp',case when v#>>'{xpGun,tarih}'=day then coalesce((v#>>'{xpGun,xp}')::numeric,0)+xp else xp end));
   v:=jsonb_set(v,'{log}',jsonb_set(coalesce(v->'log','{}'),array[day],to_jsonb(coalesce((v->'log'->>day)::numeric,0)+xp)));
   v:=jsonb_set(v,'{oyunGun}',jsonb_build_object('t',day,'n',idx));v:=jsonb_set(v,'{guncelleme}',to_jsonb(floor(extract(epoch from clock_timestamp())*1000)));
   if v ? 'lig' then v:=jsonb_set(v,'{lig,xp}',to_jsonb(coalesce((v#>>'{lig,xp}')::numeric,0)+xp));end if;
   update public.extra_data set value=v,updated_at=now() where student_id=case when n=0 then m.player_a else m.player_b end and key_name='yo';
   insert into public.game_scores(game_key,student_id,student_name,class_no,score,correct_count,wrong_count,duration_seconds,played_on,extra) select m.game,id,username,m.class_no,(result->>'puan')::numeric,(result->>'dogru')::integer,(result->>'yanlis')::integer,ceil((result->>'sure')::numeric),current_date,jsonb_build_object('v',coalesce((result->>'puanSurum')::integer,2),'matchId',m.id) from public.students where id=case when n=0 then m.player_a else m.player_b end;
   result:=result||jsonb_build_object('reward',jsonb_build_object('gold',gold,'xp',xp));if n=0 then m.result_a:=result;else m.result_b:=result;end if;
  end if;
 end loop;
 if m.result_a is not null and m.result_b is not null then m.status:='finished';end if;
 update public.dm_matches set ready_a=m.ready_a,ready_b=m.ready_b,start_a=m.start_a,start_b=m.start_b,status=m.status,answers_a=m.answers_a,answers_b=m.answers_b,result_a=m.result_a,result_b=m.result_b where id=m.id;
 idx:=floor(elapsed/12);q:=case when idx between 0 and jsonb_array_length(m.questions)-1 then m.questions->idx else null end;
 ra:=case when actor=m.player_a then m.result_a else m.result_b end;rb:=case when actor=m.player_a then m.result_b else m.result_a end;
 return jsonb_build_object('ok',true,'id',m.id,'game',m.game,'mode',m.mode,'status',m.status,'serverNow',now(),'start',start_at,'ready',case when actor=m.player_a then m.ready_a else m.ready_b end,'opponentReady',case when actor=m.player_a then m.ready_b else m.ready_a end,'index',idx,'total',jsonb_array_length(m.questions),'seconds',greatest(0,ceil(12-mod(greatest(elapsed,0),12))),'question',case when q is null then null else q-'answer' end,'answered',ans ? idx::text,'feedback',case when ans ? idx::text then q->>'answer' else null end,'myScore',(case when m.questions->0->>'puanSurum'='3' then public.dm_round_score_v3(ans,m.questions,false) else public.dm_round_score(ans,m.questions) end)->'puan','myResult',ra,'opponentResult',rb,'opponent',(select username from public.students where id=case when actor=m.player_a then m.player_b else m.player_a end));
end $function$;

CREATE OR REPLACE FUNCTION public.dm_rally_finish(actor uuid, run_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.dm_rally_runs;v jsonb;s jsonb;c int;w int;x int:=0;g int:=0;n int;speed int;daily numeric;secs numeric;ver bigint;result jsonb;st public.students;fair_percent int:=0;slow_count int:=0;slow_percent int:=0;day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 select * into st from public.students where id=actor for update;
 select * into r from public.dm_rally_runs where id=run_key and student_id=actor for update;
 if not found then raise exception 'Yarış bulunamadı.';end if;
 if r.ranking_only then return public.dm_teacher_rally_finish(actor,run_key);end if;

 if r.reward is not null then return public.dm_rally_view(r);end if;
 s:=r.state;c:=(s->>'correct')::int;w:=(s->>'wrong')::int;secs:=greatest(1,(s->>'elapsed')::numeric);
 slow_count:=greatest(0,coalesce((s->>'slowed')::int,0));slow_percent:=least(45,slow_count*3);
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Hesap bilgileri hazır değil.';end if;
 if c>0 then
  select count(*)+1 into n from public.dm_game_reward_runs where student_id=actor and game_key<>'ba' and game_key not like 'konu:%' and xp>0 and created_at>=day::date::timestamp at time zone 'Europe/Istanbul';
  daily:=case when n<=3 then 2 when n>12 then .5 else 1 end;
  speed:=round(c*600/(1+secs/c));x:=least(public.dm_game_xp_cap(),round(least(80,greatest(0,c*6+floor(speed/100.0)-w*3))*daily))::int;
  g:=case when x=0 then 0 else round((array[4,7,10])[case when c::numeric/(c+w)>=.8 then 3 when c::numeric/(c+w)>=.5 then 2 else 1 end]*daily) end;
 end if;
 fair_percent:=case when c=0 then 0 when c=jsonb_array_length(r.deck) and w=0 then 100
   when c>=ceil(jsonb_array_length(r.deck)*0.8)::int and w<=1 then 80 when c>=ceil(jsonb_array_length(r.deck)*8.0/15)::int then 60 else 35 end;
 x:=floor(x*fair_percent/100.0*(100-slow_percent)/100.0)::int;
 g:=floor(g*fair_percent/100.0*(100-slow_percent)/100.0)::int;
 insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values(actor,run_key::text,'ralli',r.class_no,r.units,x,g);
 if x>0 or g>0 then
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
  v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
  v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
  update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';update public.students set gold=(v->>'altin')::numeric where id=actor;
  select value into v from public.extra_data where student_id=actor and key_name='yo';
 end if;
 insert into public.game_scores(student_id,student_name,game_key,class_no,unit_no,unit_name,score,correct_count,wrong_count,duration_seconds,extra)
 values(actor,st.username,'ralli',r.class_no,r.units[1],array_to_string(r.units,','),(s->>'score')::int,c,w,ceil(secs)::int,jsonb_build_object('v',3,'speed',coalesce(speed,0),'run_id',run_key,'reward_protocol',1,'slowed',slow_count));
 if actor<>'dcde2026-1015-4000-8000-000000000001'::uuid then
 insert into public.feed_events(student_id,event_type,payload) values(actor,'game_score',jsonb_build_object('game_name','Kelime Rallisi','game_key','ralli','score',(s->>'score')::int,'icon','🏎️'));
 end if;
 result:=jsonb_build_object('xp',x,'gold',g,'reason',case when c=0 then 'no_correct' when x=0 and g=0 then 'no_correct' else 'awarded' end,'yo',v,'fairPercent',fair_percent,'slowCount',slow_count,'slowPercent',slow_percent,'fairTier',case fair_percent when 100 then 'perfect' when 80 then 'high' when 60 then 'pass' when 35 then 'practice' else 'none' end);
 update public.dm_rally_runs set status='finished',reward=result,finished_at=now() where id=run_key returning * into r;
 return public.dm_rally_view(r);
end $function$;

CREATE OR REPLACE FUNCTION public.dm_topic_game_finish(actor uuid, run_key uuid, picks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.dm_topic_game_runs; v jsonb; i int; c int:=0; n int; x int:=0; used int; ver bigint;
 day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');reason text:='accuracy'; prior_scope text;
begin
 -- Serialize both wallet writes and daily quota checks across simultaneous runs.
 perform 1 from public.students where id=actor for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_topic_game_runs where run_id=run_key and student_id=actor for update;
 if not found then return jsonb_build_object('ok',false,'sebep','missing','mesaj','Oyun oturumu bulunamadı veya tamamlandı.');end if;

 if r.ranking_only then return public.dm_teacher_topic_game_finish(actor,run_key,picks);end if;
 if r.expires_at<=clock_timestamp() then
  delete from public.dm_topic_game_runs where run_id=run_key;
  return jsonb_build_object('ok',false,'sebep','expired','mesaj','Oyun oturumunun süresi doldu.');
 end if;
 if jsonb_typeof(picks) is distinct from 'array' or jsonb_array_length(picks)<>r.question_count then raise exception 'Geçersiz cevaplar.';end if;
 n:=r.question_count;
 for i in 0..n-1 loop
  if jsonb_typeof(picks->i) is distinct from 'string' or not (r.answer_key->i->'allowed' @> jsonb_build_array(picks->i)) then raise exception 'Geçersiz cevaplar.';end if;
  if picks->>i=r.answer_key->i->>'correct' then c:=c+1;end if;
 end loop;
 select count(*) into used from public.dm_game_reward_runs where student_id=actor and topic_key=r.topic_key
 and game_key='konu:'||r.game and xp>0
 and created_at>=day::date::timestamp at time zone 'Europe/Istanbul'
 and created_at<(day::date+1)::timestamp at time zone 'Europe/Istanbul';
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Hesap bilgileri hazır değil.';end if;
 if used>=3 then reason:='daily_limit';
 elsif extract(epoch from clock_timestamp()-r.started_at)<n*1.5 then reason:='too_fast';
 elsif c*100>=n*80 then x:=least(70,public.dm_game_xp_cap());reason:='awarded';end if;
 if x>0 then
  insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold,topic_key)
  values(actor,run_key::text,'konu:'||r.game,0,array[0],x,0,r.topic_key);
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
  v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
  v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
  v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));
  v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
  prior_scope:=coalesce(current_setting('diji.topic_game',true),'');
  perform set_config('diji.topic_game','1',true);
  update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
  perform set_config('diji.topic_game',prior_scope,true);
  select value into v from public.extra_data where student_id=actor and key_name='yo';
 end if;
 delete from public.dm_topic_game_runs where run_id=run_key;
 delete from public.dm_topic_game_runs where expires_at<=now();
 return jsonb_build_object('ok',true,'dogru',c,'toplam',n,'yuzde',round(c*100.0/n),'xp',x,'xpHakkiKaldi',greatest(0,3-used-case when x>0 then 1 else 0 end),'sebep',reason,'yo',v);
end $function$;
CREATE OR REPLACE FUNCTION public.dm_game_xp_cap() RETURNS integer LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT 172 $$;
