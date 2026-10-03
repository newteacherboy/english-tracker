-- MeduPro social controls and authoritative two-player rounds.
create table if not exists public.student_blocks (
 blocker_id uuid references public.students(id) on delete cascade,
 blocked_id uuid references public.students(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(blocker_id,blocked_id), check(blocker_id<>blocked_id));
create index if not exists student_blocks_reverse on public.student_blocks(blocked_id,blocker_id);
alter table public.student_blocks enable row level security;
revoke all on public.student_blocks from anon,authenticated;
create or replace function public.dm_blocked(a uuid,b uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.student_blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a)); $$;
revoke all on function public.dm_blocked(uuid,uuid) from public,anon,authenticated;
grant execute on function public.dm_blocked(uuid,uuid) to service_role;
create or replace function public.dm_pair_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare a uuid; b uuid;
begin
 if tg_table_name='feed_events' then a:=new.student_id;b:=new.target_student_id;
 elsif tg_table_name='duels' then a:=new.sender_student_id;b:=new.receiver_student_id;
 else a:=new.sender_student_id;b:=new.recipient_student_id;end if;
 if a is not null and b is not null then
  perform pg_advisory_xact_lock(hashtextextended(least(a::text,b::text)||greatest(a::text,b::text),0));
  if public.dm_blocked(a,b) then raise exception 'Bu kişiyle iletişim kapalı.';end if;
 end if;
 return new;
end $$;
create trigger dm_social_guard before insert on public.feed_events for each row execute function public.dm_pair_guard();
create trigger dm_duel_guard before insert or update on public.duels for each row execute function public.dm_pair_guard();
create trigger dm_notification_guard before insert on public.notifications for each row execute function public.dm_pair_guard();
create table if not exists public.dm_accessory_catalog(id text primary key,name text not null,icon text not null,price integer not null check(price>0));
insert into public.dm_accessory_catalog values
 ('a:canta:#ef4444:duz','Kırmızı sırt çantası','🎒',100),('a:canta:#60a5fa:duz','Mavi sırt çantası','🎒',100),
 ('a:canta:#34d399:duz','Yeşil sırt çantası','🎒',100),('a:canta:#7c3aed:duz','Mor sırt çantası','🎒',100),
 ('a:atki:#ef4444:duz','Kırmızı atkı','🧣',100),('a:atki:#fbbf24:duz','Sarı atkı','🧣',100),
 ('a:atki:#1e3a8a:duz','Lacivert atkı','🧣',100),('a:atki:#f472b6:duz','Pembe atkı','🧣',100),
 ('a:saat:#334155:duz','Füme kol saati','⌚',250),('a:saat:#fbbf24:duz','Altın kol saati','⌚',250),
 ('a:rozet:#fbbf24:duz','Yıldız rozeti','⭐',250),('a:rozet:#f472b6:duz','Kalp rozeti','💗',250)
 on conflict(id) do update set name=excluded.name,icon=excluded.icon,price=excluded.price;
alter table public.dm_accessory_catalog enable row level security;
revoke all on public.dm_accessory_catalog from anon,authenticated;
create table if not exists public.dm_accessory_gifts(id uuid primary key default gen_random_uuid(),sender_id uuid references public.students(id) on delete set null,recipient_id uuid not null references public.students(id) on delete cascade,item_id text not null references public.dm_accessory_catalog(id),created_at timestamptz default now(),unique(recipient_id,item_id));
alter table public.dm_accessory_gifts enable row level security;
revoke all on public.dm_accessory_gifts from anon,authenticated;
create or replace function public.dm_social_action(actor uuid,target uuid,action text,arg text default '') returns jsonb language plpgsql security invoker set search_path='' as $$
declare me public.students; them public.students; v jsonb; k jsonb; item public.dm_accessory_catalog; txt text; n integer;
 presets text[]:=array['Merhaba! 👋','Beni takip eder misin? 🌟','Birlikte Kelime Uçuşu oynayalım! 🪽','Cümle Rotası düellosuna var mısın? 🧩','Kelime Laboratuvarı oynayalım! 🔬','Risk Balonları için hazır mısın? 🎈','Hafıza Sandığı oynayalım! 🧠','Hız Fırtınası yarışına katıl! 🌪️','Eş Bul oynayalım! 🔗','Kelime Treni düellosu yapalım! 🚂','Harf Avı oynayalım! 🔤','Şifre Kırıcı oynayalım! 🔐','Harika oynadın, tebrikler! 🎉','Rövanş yapalım mı? ⚔️','Bugün birlikte ders çalışalım! 📚'];
begin
 if actor is null or actor=target then raise exception 'Geçersiz öğrenci.';end if;
 perform pg_advisory_xact_lock(hashtextextended(least(actor::text,target::text)||greatest(actor::text,target::text),0));
 select * into me from public.students where id=actor and status='approved';
 select * into them from public.students where id=target and status='approved';
 if me.id is null or them.id is null then raise exception 'Öğrenci bulunamadı.';end if;
 if action='status' then return jsonb_build_object('ok',true,'blocked',public.dm_blocked(actor,target),'mine',exists(select 1 from public.student_blocks where blocker_id=actor and blocked_id=target));end if;
 if action='unblock' then delete from public.student_blocks where blocker_id=actor and blocked_id=target;return jsonb_build_object('ok',true);end if;
 if action='block' then
  insert into public.student_blocks values(actor,target,now()) on conflict do nothing;
  delete from public.feed_events where event_type='takip' and ((student_id=actor and target_student_id=target) or (student_id=target and target_student_id=actor));
  -- Remove outstanding invitations rather than allowing an acceptance after a block.
  delete from public.duels where status in ('pending','accepted') and ((sender_student_id=actor and receiver_student_id=target) or (sender_student_id=target and receiver_student_id=actor));
  delete from public.notifications where read_at is null and ((sender_student_id=actor and recipient_student_id=target) or (sender_student_id=target and recipient_student_id=actor));
  update public.dm_matches set status='cancelled' where status in ('waiting','playing') and ((player_a=actor and player_b=target) or (player_a=target and player_b=actor));
  return jsonb_build_object('ok',true);
 end if;
 if public.dm_blocked(actor,target) then raise exception 'Bu kişiyle iletişim kapalı.';end if;
 if action='message' then
  n:=arg::integer;if n<0 or n>=array_length(presets,1) then raise exception 'Hazır mesaj seç.';end if;txt:=presets[n+1];
  select count(*) into n from public.notifications where sender_student_id=actor and type='mesaj' and created_at>now()-interval '1 hour';
  if n>=20 then raise exception 'Biraz bekle; saatte 20 mesaj gönderebilirsin.';end if;
  insert into public.notifications(recipient_student_id,sender_student_id,type,message) values(target,actor,'mesaj',txt);
 elsif action='gift' then
  select * into item from public.dm_accessory_catalog where id=arg;if item.id is null then raise exception 'Aksesuar bulunamadı.';end if;
  -- Stable lock order prevents reciprocal gifts from deadlocking.
  perform 1 from public.students where id in(actor,target) order by id for update;
  insert into public.extra_data(student_id,key_name,value) values(actor,'yo','{}') on conflict(student_id,key_name) do nothing;
  select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
  if jsonb_typeof(v)='string' then v:=(v#>>'{}')::jsonb;end if;
  if coalesce((v->>'altin')::numeric,0)<item.price then raise exception 'Yeterli altının yok.';end if;
  select value into k from public.extra_data where student_id=target and key_name='yo' for update;
  if jsonb_typeof(k)='string' then k:=(k#>>'{}')::jsonb;end if;
  if coalesce(k#>'{karakter,sahip}','[]') ? ('d:'||item.id) then raise exception 'Bu aksesuar arkadaşında zaten var.';end if;
  insert into public.dm_accessory_gifts(sender_id,recipient_id,item_id) values(actor,target,item.id);
  v:=jsonb_set(v,'{altin}',to_jsonb((v->>'altin')::numeric-item.price));v:=jsonb_set(v,'{guncelleme}',to_jsonb(floor(extract(epoch from clock_timestamp())*1000)));
  update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';update public.students set gold=(v->>'altin')::numeric where id=actor;
  insert into public.notifications(recipient_student_id,sender_student_id,type,message) values(target,actor,'hediye',item.icon||' '||item.name||' hediye etti! Dolap’ta seni bekliyor.');
  return jsonb_build_object('ok',true,'yo',v);
 else raise exception 'Geçersiz işlem.';end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.dm_social_action(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.dm_social_action(uuid,uuid,text,text) to service_role;
create table if not exists public.dm_matches (
 id uuid primary key default gen_random_uuid(), player_a uuid not null references public.students(id) on delete cascade,player_b uuid not null references public.students(id) on delete cascade,
 game text not null check(game in ('ucus','rota')),mode text not null check(mode in ('live','async')),status text not null default 'waiting' check(status in ('waiting','playing','finished','cancelled','expired')),
 class_no integer not null,questions jsonb not null,ready_a boolean default false,ready_b boolean default false,start_a timestamptz,start_b timestamptz,
 answers_a jsonb not null default '{}',answers_b jsonb not null default '{}',result_a jsonb,result_b jsonb,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '24 hours',check(player_a<>player_b));
create index if not exists dm_matches_a on public.dm_matches(player_a,created_at desc);
create index if not exists dm_matches_b on public.dm_matches(player_b,created_at desc);
alter table public.dm_matches enable row level security;
revoke all on public.dm_matches from anon,authenticated;
create or replace function public.dm_round_score(answers jsonb,questions jsonb) returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare score integer:=0;correct integer:=0;streak integer:=0;spent numeric:=0;i integer;v jsonb;
begin
 for i in 0..7 loop
  v:=answers->i::text;spent:=spent+coalesce((v->>'ms')::numeric,12000);
  if v->>'answer'=questions->i->>'answer' then
   correct:=correct+1;streak:=streak+1;score:=score+100+case streak when 3 then 50 when 5 then 50 when 8 then 100 else 0 end;
  else streak:=0;end if;
 end loop;
 return jsonb_build_object('puan',least(1000,score),'dogru',correct,'yanlis',8-correct,'sure',round(spent/1000,2),'yildiz',case when score>=800 then 3 when score>=500 then 2 else 1 end);
end $$;
create or replace function public.dm_match_energy(actor uuid) returns void language plpgsql security invoker set search_path='' as $$
declare s public.students; available integer; ticks integer;
begin
 select * into s from public.students where id=actor for update;
 ticks:=greatest(0,floor(extract(epoch from now()-coalesce(s.energy_updated_at,now()))/900));
 available:=least(s.energy_max,s.energy+ticks);
 if available<4 then raise exception 'Bu karşılaşma için 4 enerji gerekiyor.';end if;
 update public.students set energy=available-4,energy_updated_at=case when available=s.energy_max then now() else coalesce(s.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
 insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-4,available-4,'iki kişilik oyun · 8 soru');
end $$;
revoke all on function public.dm_match_energy(uuid) from public,anon,authenticated;
grant execute on function public.dm_match_energy(uuid) to service_role;
create or replace function public.dm_match_action(actor uuid,match_id uuid,action text,arg jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.dm_matches;me public.students;them public.students; qs jsonb; pool jsonb;start_at timestamptz;ans jsonb;q jsonb;idx integer;sel integer;elapsed numeric;ra jsonb;rb jsonb;result jsonb;v jsonb;day text;n integer;mul numeric;gold integer;xp integer;
begin
 if action='create' then
  select * into me from public.students where id=actor and status='approved';select * into them from public.students where id=(arg->>'target')::uuid and status='approved';
  if me.id is null or them.id is null or me.id=them.id then raise exception 'Geçersiz rakip.';end if;
  perform pg_advisory_xact_lock(hashtextextended(least(me.id::text,them.id::text)||greatest(me.id::text,them.id::text),0));
  if public.dm_blocked(me.id,them.id) then raise exception 'Bu kişiyle iletişim kapalı.';end if;
  select count(*) into n from public.dm_matches where player_a=actor and created_at>now()-interval '24 hours';if n>=10 then raise exception 'Bugünkü 10 karşılaşma hakkını kullandın.';end if;
  if arg->>'game'='rota' then
   select jsonb_agg(jsonb_build_object('word',english,'answer',turkish)) into pool from (select distinct english,turkish from public.sentence_bank where active and class_no=least(me.class_no,them.class_no) and length(turkish)<140 order by english limit 400) s;
  else
   select jsonb_agg(jsonb_build_object('word',english,'answer',turkish)) into pool from (select distinct english,turkish from public.word_bank where active and class_no=least(me.class_no,them.class_no) order by english limit 500) s;
  end if;
  if coalesce(jsonb_array_length(pool),0)<8 then raise exception 'Bu sınıfta 8 soruluk yeterli havuz yok.';end if;
  select jsonb_agg(p) into qs from (select p from (select distinct on (x->>'word') x p from jsonb_array_elements(pool) x order by x->>'word') u order by random() limit 8) picked;
  if jsonb_array_length(qs)<>8 then raise exception '8 farklı soru gerekiyor.';end if;
  select jsonb_agg(jsonb_set(x,'{choices}',(select jsonb_agg(txt order by random()) from (select x->>'answer' txt union all select txt from (select txt from (select distinct y->>'answer' txt from jsonb_array_elements(pool) y where y->>'answer'<>x->>'answer') d order by random() limit 5) wrong) opts))) into qs from jsonb_array_elements(qs) x;
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
  if idx<0 or idx>7 or (arg->>'index')::integer<>idx or ans ? idx::text then raise exception 'Bu sorunun süresi doldu veya cevaplandı.';end if;
  q:=m.questions->idx;sel:=(arg->>'choice')::integer;
  if sel<0 or sel>=jsonb_array_length(q->'choices') then raise exception 'Geçersiz cevap.';end if;
  ans:=jsonb_set(ans,array[idx::text],jsonb_build_object('answer',q->'choices'->>sel,'ms',floor((elapsed-idx*12)*1000)));
  if actor=m.player_a then m.answers_a:=ans;else m.answers_b:=ans;end if;
 end if;
 if m.start_a is not null and now()>=m.start_a+interval '96 seconds' and m.result_a is null then m.result_a:=public.dm_round_score(m.answers_a,m.questions);end if;
 if m.start_b is not null and now()>=m.start_b+interval '96 seconds' and m.result_b is null then m.result_b:=public.dm_round_score(m.answers_b,m.questions);end if;
 -- Persist each player's ordinary game reward once; replay and polling cannot award twice.
 for n in 0..1 loop
  result:=case when n=0 then m.result_a else m.result_b end;
  if result is not null and not (result ? 'reward') then
   insert into public.extra_data(student_id,key_name,value) values(case when n=0 then m.player_a else m.player_b end,'yo','{}') on conflict(student_id,key_name) do nothing;
   select value into v from public.extra_data where student_id=case when n=0 then m.player_a else m.player_b end and key_name='yo' for update;
   if jsonb_typeof(v)='string' then v:=(v#>>'{}')::jsonb;end if;
   day:=(now() at time zone 'Europe/Istanbul')::date::text;
   idx:=case when v#>>'{oyunGun,t}'=day then coalesce((v#>>'{oyunGun,n}')::integer,0)+1 else 1 end;mul:=case when idx<=3 then 2 when idx>12 then .5 else 1 end;
   gold:=round((case (result->>'yildiz')::integer when 3 then 10 when 2 then 7 else 4 end)*mul);xp:=round((case (result->>'yildiz')::integer when 3 then 50 when 2 then 35 else 20 end)*mul);
   v:=jsonb_set(v,'{altin}',to_jsonb(coalesce((v->>'altin')::numeric,0)+gold));v:=jsonb_set(v,'{xp}',to_jsonb(coalesce((v->>'xp')::numeric,0)+xp));
   v:=jsonb_set(v,'{xpGun}',jsonb_build_object('tarih',day,'xp',case when v#>>'{xpGun,tarih}'=day then coalesce((v#>>'{xpGun,xp}')::numeric,0)+xp else xp end));
   v:=jsonb_set(v,'{log}',jsonb_set(coalesce(v->'log','{}'),array[day],to_jsonb(coalesce((v->'log'->>day)::numeric,0)+xp)));
   v:=jsonb_set(v,'{oyunGun}',jsonb_build_object('t',day,'n',idx));v:=jsonb_set(v,'{guncelleme}',to_jsonb(floor(extract(epoch from clock_timestamp())*1000)));
   if v ? 'lig' then v:=jsonb_set(v,'{lig,xp}',to_jsonb(coalesce((v#>>'{lig,xp}')::numeric,0)+xp));end if;
   update public.extra_data set value=v,updated_at=now() where student_id=case when n=0 then m.player_a else m.player_b end and key_name='yo';
   insert into public.game_scores(game_key,student_id,student_name,class_no,score,correct_count,wrong_count,duration_seconds,played_on,extra) select m.game,id,username,m.class_no,(result->>'puan')::numeric,(result->>'dogru')::integer,(result->>'yanlis')::integer,ceil((result->>'sure')::numeric),current_date,jsonb_build_object('v',2,'matchId',m.id) from public.students where id=case when n=0 then m.player_a else m.player_b end;
   result:=result||jsonb_build_object('reward',jsonb_build_object('gold',gold,'xp',xp));if n=0 then m.result_a:=result;else m.result_b:=result;end if;
  end if;
 end loop;
 if m.result_a is not null and m.result_b is not null then m.status:='finished';end if;
 update public.dm_matches set ready_a=m.ready_a,ready_b=m.ready_b,start_a=m.start_a,start_b=m.start_b,status=m.status,answers_a=m.answers_a,answers_b=m.answers_b,result_a=m.result_a,result_b=m.result_b where id=m.id;
 idx:=floor(elapsed/12);q:=case when idx between 0 and 7 then m.questions->idx else null end;
 ra:=case when actor=m.player_a then m.result_a else m.result_b end;rb:=case when actor=m.player_a then m.result_b else m.result_a end;
 return jsonb_build_object('ok',true,'id',m.id,'game',m.game,'mode',m.mode,'status',m.status,'serverNow',now(),'start',start_at,'ready',case when actor=m.player_a then m.ready_a else m.ready_b end,'opponentReady',case when actor=m.player_a then m.ready_b else m.ready_a end,'index',idx,'seconds',greatest(0,ceil(12-mod(greatest(elapsed,0),12))),'question',case when q is null then null else q-'answer' end,'answered',ans ? idx::text,'feedback',case when ans ? idx::text then q->>'answer' else null end,'myScore',public.dm_round_score(ans,m.questions)->'puan','myResult',ra,'opponentResult',rb,'opponent',(select username from public.students where id=case when actor=m.player_a then m.player_b else m.player_a end));
end $$;
revoke all on function public.dm_match_action(uuid,uuid,text,jsonb),public.dm_round_score(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.dm_match_action(uuid,uuid,text,jsonb),public.dm_round_score(jsonb,jsonb) to service_role;
