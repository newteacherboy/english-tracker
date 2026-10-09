-- DijiMedu 12-question multiplayer rounds.
-- Existing 8-question sessions remain supported with dynamic question length.
create or replace function public.dm_round_score_v3(answers jsonb,questions jsonb,completed boolean default true) returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare base integer:=0;correct integer:=0;wrong integer:=0;streak integer:=0;spent numeric:=0;i integer;v jsonb;speed integer;penalty integer;seconds numeric;seen jsonb:='{}';bonus integer;
begin
 for i in 0..jsonb_array_length(questions)-1 loop
  v:=answers->i::text;
  if v is null and not completed then continue;end if;
  spent:=spent+greatest(0,least(12000,coalesce((v->>'ms')::numeric,12000)));
  if v->>'answer'=questions->i->>'answer' then
   correct:=correct+1;streak:=streak+1;bonus:=case streak when 3 then 50 when 5 then 50 when 8 then 100 else 0 end;
   if seen ? streak::text then bonus:=0;else seen:=seen||jsonb_build_object(streak::text,true);end if;
   base:=base+100+bonus;
  else wrong:=wrong+1;streak:=0;end if;
 end loop;
 seconds:=round(spent/1000,2);speed:=case when correct=0 then 0 else round(correct*600/(1+seconds/correct)) end;penalty:=wrong*40;
 return jsonb_build_object('puan',greatest(0,base+speed-penalty),'temelPuan',base,'hizBonusu',speed,'hataCezasi',penalty,'dogru',correct,'yanlis',wrong,'sure',seconds,'xp',greatest(0,correct*6+floor(speed/100)-wrong*3),'puanSurum',3,'yildiz',case when correct>0 and correct::numeric/(correct+wrong)>=.8 then 3 when correct>0 and correct::numeric/(correct+wrong)>=.5 then 2 else 1 end);
end $$;

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
end $function$
