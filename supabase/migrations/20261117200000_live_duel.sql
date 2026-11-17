-- [17 Kas 2026] Canlı Düello + Papi'ye Karşı (6 soruluk savaş paneli)
-- Kullanıcı kararları:
--  * Canlı Düello günde 1, Papi'ye Karşı günde 2 ücretsiz; sonrası ödüllü reklam (+1) ya da Premium Pro (sınırsız).
--  * İsteği kabul eden de günlük canlı hakkından kullanır.
--  * 15 sn içinde rakip yoksa oyuncu otomatik Papi ile kapışır (canlı hakkından sayılır).
--  * Kazanan 300 XP + 50 altın, berabere 150 XP, kaybeden 50 XP (rakip Papi olsa da).
--  * Sorular Word Bank'ten (public.word_bank), oyuncunun sınıfına göre.
-- Sunucu yükü: davet anlık kanaldan (Realtime broadcast) gider, veritabanına yazmaz.
-- Veritabanına yalnız arama/kabul, en fazla 5 bekleme kontrolü ve sonuç kaydı gelir.

create table if not exists public.dm_live_duels(
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('live','papi')),
 status text not null default 'searching' check(status in ('searching','matched','cancelled','finished')),
 host_id uuid not null references public.students(id) on delete cascade,
 guest_id uuid references public.students(id) on delete set null,
 vs_papi boolean not null default false,
 grade smallint not null check(grade between 1 and 8),
 host_name text not null,
 guest_name text,
 host_level integer,
 guest_level integer,
 questions jsonb not null,
 papi_answers jsonb,
 host_answers jsonb,
 guest_answers jsonb,
 host_reward jsonb,
 guest_reward jsonb,
 outcome text check(outcome in ('host','guest','draw')),
 created_at timestamptz not null default now(),
 matched_at timestamptz,
 finished_at timestamptz
);
create index if not exists dm_live_duels_searching on public.dm_live_duels(created_at) where status='searching';
create index if not exists dm_live_duels_host on public.dm_live_duels(host_id,created_at desc);
create index if not exists dm_live_duels_guest on public.dm_live_duels(guest_id,created_at desc);
alter table public.dm_live_duels enable row level security;
revoke all on public.dm_live_duels from public,anon,authenticated;
grant all on public.dm_live_duels to service_role;

-- Ödüllü reklam teklifleri mevcut premium_offers tablosunu kullanır (yeni reklam birimi gerekmez).
alter table dm_ad_rewards.premium_offers drop constraint if exists premium_offers_game_check;
alter table dm_ad_rewards.premium_offers add constraint premium_offers_game_check
 check (game = any (array['word-match','papizzle','cloud-flight','word-blocks','tower','word-goal','rally','duel-live','duel-papi']));

create or replace function dm_private.duel_day_start() returns timestamptz
language sql stable set search_path='' as $$
 select date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'
$$;

create or replace function dm_private.duel_level(actor uuid) returns integer
language sql stable set search_path='' as $$
 select coalesce((select public.dm_student_level(coalesce((e.value->>'totalXp')::numeric,0))
  from public.extra_data e where e.student_id=actor and e.key_name='yo'),1)
$$;

create or replace function dm_private.duel_rights(actor uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare plan text; t0 timestamptz:=dm_private.duel_day_start(); today date:=(now() at time zone 'Europe/Istanbul')::date;
 live_used int; papi_used int; live_bonus int; papi_bonus int; unlimited boolean;
begin
 plan:=public.dm_plan(actor,'student');
 unlimited:=plan='premium_pro';
 select count(*) into live_used from public.dm_live_duels d where d.kind='live' and (
   (d.host_id=actor and d.created_at>=t0 and (d.status in ('matched','finished') or (d.status='searching' and d.created_at>now()-interval '40 seconds')))
   or (d.guest_id=actor and d.matched_at>=t0));
 select count(*) into papi_used from public.dm_live_duels d where d.kind='papi' and d.host_id=actor and d.created_at>=t0;
 select count(*) filter(where game='duel-live'),count(*) filter(where game='duel-papi') into live_bonus,papi_bonus
  from dm_ad_rewards.premium_offers where student_id=actor and reward_day=today and redeemed_at is not null and game in ('duel-live','duel-papi');
 return jsonb_build_object('plan',plan,'unlimited',unlimited,
  'live',jsonb_build_object('used',live_used,'limit',1+live_bonus,'remaining',case when unlimited then 99 else greatest(0,1+live_bonus-live_used) end),
  'papi',jsonb_build_object('used',papi_used,'limit',2+papi_bonus,'remaining',case when unlimited then 99 else greatest(0,2+papi_bonus-papi_used) end),
  'social',public.dm_social_allowed(actor,'duels'));
end $$;

-- 6 soru: 1 Anlamı ne? 2 İngilizcesi ne? 3 Boşluğu doldur 4 Doğru mu yanlış mı? 5 Doğru eşi bul 6 Final (2 kat hasar)
-- Her soru: {t,p,o[],a,lim}. a = doğru şıkkın sırası.
create or replace function dm_private.duel_pick(correct text, wrong text[]) returns jsonb
language plpgsql volatile set search_path='' as $$
declare pos int:=floor(random()*4)::int; o text[]:='{}'; i int; k int:=1;
begin
 for i in 0..3 loop
  if i=pos then o:=o||correct; else o:=o||wrong[k]; k:=k+1; end if;
 end loop;
 return jsonb_build_object('o',to_jsonb(o),'a',pos);
end $$;

create or replace function dm_private.duel_questions(g integer) returns jsonb
language plpgsql volatile set search_path='' as $$
declare en text[]; tr text[]; ph_en text[]; n int; q jsonb:='[]'::jsonb; pick jsonb; tf boolean;
 words text[]; idx int; target text; sentence text; i int; used_blank int:=0; slot int; cand int[]; base int;
begin
 g:=greatest(1,least(8,coalesce(g,5)));
 select array_agg(x.en),array_agg(x.tr) into en,tr from (
  select b.en,b.tr from (
   select distinct on (lower(a.tr)) a.en,a.tr from (
    select distinct on (lower(trim(w.english))) trim(w.english) en,trim(w.turkish) tr
    from public.word_bank w where w.active and w.class_no between greatest(1,g-1) and g
     and trim(w.english) ~ '^[A-Za-z][A-Za-z''-]{1,20}$' and nullif(trim(w.turkish),'') is not null and length(trim(w.turkish))<=28
    order by lower(trim(w.english)),w.id) a
   order by lower(a.tr),a.en) b
  order by random() limit 24) x;
 if coalesce(cardinality(en),0)<20 then
  select array_agg(x.en),array_agg(x.tr) into en,tr from (
   select b.en,b.tr from (
    select distinct on (lower(a.tr)) a.en,a.tr from (
     select distinct on (lower(trim(w.english))) trim(w.english) en,trim(w.turkish) tr
     from public.word_bank w where w.active and w.class_no between 1 and 8
      and trim(w.english) ~ '^[A-Za-z][A-Za-z''-]{1,20}$' and nullif(trim(w.turkish),'') is not null and length(trim(w.turkish))<=28
     order by lower(trim(w.english)),w.id) a
    order by lower(a.tr),a.en) b
   order by random() limit 24) x;
 end if;
 n:=coalesce(cardinality(en),0);
 if n<20 then raise exception 'Düello için yeterli kelime yok.'; end if;
 select array_agg(x.e) into ph_en from (
  select trim(w.english) e from public.word_bank w where w.active
   and w.class_no between greatest(1,g-1) and greatest(2,g)
   and array_length(regexp_split_to_array(trim(w.english),'\s+'),1) between 3 and 9
   and trim(w.english) ~ '[A-Za-z]{3,}'
  order by random() limit 6) x;

 -- 1) Anlamı ne?
 pick:=dm_private.duel_pick(tr[1],array[tr[2],tr[3],tr[4]]);
 q:=q||(jsonb_build_object('t','meaning','p',en[1],'lim',10)||pick);
 -- 2) İngilizcesi ne?
 pick:=dm_private.duel_pick(en[5],array[en[6],en[7],en[8]]);
 q:=q||(jsonb_build_object('t','reverse','p',tr[5],'lim',10)||pick);
 -- 3) ve 6) Boşluğu doldur (cümle yoksa anlam sorusu)
 for slot in 1..2 loop
  sentence:=null;target:=null;base:=12+3*slot; -- 15 ya da 18
  for i in 1..coalesce(cardinality(ph_en),0) loop
   if i<=used_blank then continue; end if;
   words:=regexp_split_to_array(ph_en[i],'\s+');
   select array_agg(k) into cand from generate_subscripts(words,1) k
    where regexp_replace(words[k],'[^A-Za-z'']','','g') ~ '^[A-Za-z]{3,}$';
   if coalesce(cardinality(cand),0)=0 then continue; end if;
   idx:=cand[1+floor(random()*cardinality(cand))::int];
   target:=regexp_replace(words[idx],'[^A-Za-z'']','','g');
   if exists(select 1 from unnest(array[en[base],en[base+1],en[base+2]]) d where lower(d)=lower(target)) then continue; end if;
   words[idx]:=regexp_replace(words[idx],'[A-Za-z'']+','___');
   sentence:=array_to_string(words,' ');
   used_blank:=i;
   exit;
  end loop;
  if sentence is null then
   pick:=dm_private.duel_pick(tr[base],array[tr[base+1],tr[base+2],tr[base-1]]);
   q:=q||(jsonb_build_object('t',case slot when 1 then 'meaning' else 'final' end,'p',en[base],'lim',case slot when 1 then 10 else 12 end,'ask','meaning')||pick);
  else
   pick:=dm_private.duel_pick(lower(target),array[lower(en[base]),lower(en[base+1]),lower(en[base+2])]);
   q:=q||(jsonb_build_object('t',case slot when 1 then 'blank' else 'final' end,'p',sentence,'lim',12,'ask','blank')||pick);
  end if;
  if slot=1 then
   -- 4) Doğru mu yanlış mı? 5) Doğru eşi bul (3. sorudan sonra eklenir)
   tf:=random()<.5;
   q:=q||jsonb_build_object('t','tf','p',en[9]||' = '||case when tf then tr[9] else tr[10] end,'o',jsonb_build_array('Doğru','Yanlış'),'a',case when tf then 0 else 1 end,'lim',6);
   pick:=dm_private.duel_pick(en[11]||' = '||tr[11],array[en[12]||' = '||tr[13],en[13]||' = '||tr[14],en[14]||' = '||tr[12]]);
   q:=q||(jsonb_build_object('t','pair','p','Hangisi doğru eşleşme?','lim',10)||pick);
  end if;
 end loop;
 return q;
end $$;

create or replace function dm_private.duel_papi_answers(qs jsonb) returns jsonb
language plpgsql volatile set search_path='' as $$
declare res jsonb:='[]'::jsonb; q jsonb; lim int; ok boolean; c int; n int;
begin
 for q in select value from jsonb_array_elements(qs) loop
  lim:=(q->>'lim')::int; n:=jsonb_array_length(q->'o');
  ok:=random()<.62;
  c:=case when ok then (q->>'a')::int else mod((q->>'a')::int+1+floor(random()*(n-1))::int,n) end;
  res:=res||jsonb_build_object('c',c,'ms',round(lim*1000*(.3+random()*.5))::int);
 end loop;
 return res;
end $$;

-- Hasar: doğru cevap 12 + hız bonusu (en fazla 8); final 2 kat.
create or replace function dm_private.duel_score(qs jsonb, ans jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare i int; dmg int:=0; correct int:=0; ms bigint:=0; q jsonb; a jsonb; lim int; t int; hit int;
begin
 for i in 0..5 loop
  q:=qs->i; a:=ans->i; lim:=(q->>'lim')::int*1000;
  t:=least(lim,greatest(0,coalesce((a->>'ms')::int,lim)));
  ms:=ms+t;
  if a is not null and (a->>'c') ~ '^[0-9]+$' and (a->>'c')::int=(q->>'a')::int then
   correct:=correct+1;
   hit:=12+round(8.0*(lim-t)/lim)::int;
   if i=5 then hit:=hit*2; end if;
   dmg:=dmg+hit;
  end if;
 end loop;
 return jsonb_build_object('damage',dmg,'correct',correct,'ms',ms);
end $$;

create or replace function dm_private.duel_valid_answers(ans jsonb) returns boolean
language sql immutable set search_path='' as $$
 select jsonb_typeof(ans)='array' and jsonb_array_length(ans)=6 and not exists(
  select 1 from jsonb_array_elements(ans) e where jsonb_typeof(e.value)<>'object'
   or not ((e.value->>'c') ~ '^-?[0-9]$') or not ((e.value->>'ms') ~ '^[0-9]{1,6}$'))
$$;

create or replace function dm_private.duel_award(actor uuid, duel uuid, side text, x int, g int) returns jsonb
language plpgsql set search_path='' as $$
declare v jsonb; ver bigint; day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); run text:='duel:'||duel||':'||side;
begin
 if exists(select 1 from public.dm_game_reward_runs where student_id=actor and run_id=run) then return null; end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then return null; end if;
 ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
 v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
 v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
 v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
 v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));
 v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
 update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
 update public.students set gold=(v->>'altin')::numeric where id=actor;
 insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values(actor,run,'live_duel',0,'{}',x,g) on conflict do nothing;
 return v;
end $$;

-- Maçı sonuçlandır (iki taraf da bitirdi ya da süre doldu). Satır kilitli çağrılmalı.
create or replace function dm_private.duel_settle(d public.dm_live_duels) returns public.dm_live_duels
language plpgsql set search_path='' as $$
declare hs jsonb; gs jsonb; host_hp int; guest_hp int; res text; hr jsonb; gr jsonb; empty jsonb;
begin
 if d.status='finished' then return d; end if;
 empty:=jsonb_build_array('{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb);
 hs:=dm_private.duel_score(d.questions,coalesce(d.host_answers,empty));
 gs:=dm_private.duel_score(d.questions,coalesce(case when d.vs_papi then d.papi_answers else d.guest_answers end,empty));
 host_hp:=greatest(0,100-(gs->>'damage')::int);
 guest_hp:=greatest(0,100-(hs->>'damage')::int);
 res:=case when host_hp>guest_hp then 'host' when guest_hp>host_hp then 'guest'
  when (hs->>'ms')::bigint<(gs->>'ms')::bigint then 'host' when (gs->>'ms')::bigint<(hs->>'ms')::bigint then 'guest' else 'draw' end;
 -- Hiç cevap vermeyen taraf ödül almaz (bağlantı koptu / uygulamayı kapattı).
 hr:=case when d.host_answers is null then jsonb_build_object('xp',0,'gold',0)
  when res='host' then jsonb_build_object('xp',300,'gold',50) when res='draw' then jsonb_build_object('xp',150,'gold',0) else jsonb_build_object('xp',50,'gold',0) end;
 gr:=case when d.vs_papi or d.guest_id is null or d.guest_answers is null then jsonb_build_object('xp',0,'gold',0)
  when res='guest' then jsonb_build_object('xp',300,'gold',50) when res='draw' then jsonb_build_object('xp',150,'gold',0) else jsonb_build_object('xp',50,'gold',0) end;
 if (hr->>'xp')::int>0 then perform dm_private.duel_award(d.host_id,d.id,'host',(hr->>'xp')::int,(hr->>'gold')::int); end if;
 if (gr->>'xp')::int>0 then perform dm_private.duel_award(d.guest_id,d.id,'guest',(gr->>'xp')::int,(gr->>'gold')::int); end if;
 update public.dm_live_duels set status='finished',outcome=res,finished_at=now(),
  host_reward=hr||jsonb_build_object('hp',host_hp)||hs,guest_reward=gr||jsonb_build_object('hp',guest_hp)||gs
 where id=d.id returning * into d;
 return d;
end $$;

create or replace function dm_private.duel_view(d public.dm_live_duels, actor uuid, with_questions boolean default false) returns jsonb
language plpgsql stable set search_path='' as $$
declare me text:=case when d.host_id=actor then 'host' else 'guest' end; r jsonb; v jsonb;
begin
 r:=jsonb_build_object('ok',true,'id',d.id,'kind',d.kind,'status',d.status,'side',me,'vsPapi',d.vs_papi,'grade',d.grade,
  'opponent',case when me='host' then case when d.vs_papi then 'Papi' else d.guest_name end else d.host_name end,
  'opponentLevel',case when me='host' then d.guest_level else d.host_level end,
  'matchedAt',d.matched_at,'serverNow',now());
 if with_questions and d.status in ('matched','finished') then
  r:=r||jsonb_build_object('questions',d.questions,'papi',case when d.vs_papi then d.papi_answers end);
 end if;
 if d.status='finished' then
  select value into v from public.extra_data where student_id=actor and key_name='yo';
  r:=r||jsonb_build_object('outcome',case when d.outcome='draw' then 'draw' when d.outcome=me then 'win' else 'lose' end,
   'me',case when me='host' then d.host_reward else d.guest_reward end,
   'them',case when me='host' then d.guest_reward else d.host_reward end,'yo',v);
 end if;
 return r;
end $$;

create or replace function dm_private.duel_session(p_token text) returns public.students
language plpgsql set search_path='' as $$
declare s public.students;
begin
 s:=dm_private.rpc_ogrenci(p_token,'');
 if s.id is null or s.username='dijimedu_demo' then return null; end if;
 return s;
end $$;

-- ===================== İstemci uç noktaları (token ile) =====================
create or replace function public.dm_duel_status(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 return jsonb_build_object('ok',true,'me',s.username,'level',dm_private.duel_level(s.id))||dm_private.duel_rights(s.id);
end $$;

create or replace function public.dm_duel_live_search(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; rights jsonb; d public.dm_live_duels; g int; lvl int;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 perform 1 from public.students where id=s.id for update;
 -- Açık kalan eski aramayı kapat (hakkı geri gelir).
 update public.dm_live_duels set status='cancelled' where host_id=s.id and status='searching';
 rights:=dm_private.duel_rights(s.id);
 if (rights#>>'{live,remaining}')::int<=0 then
  return jsonb_build_object('ok',false,'paywall',true,'kind','live','message','Bugünkü ücretsiz Canlı Düello hakkını kullandın.')||rights;
 end if;
 lvl:=dm_private.duel_level(s.id);
 g:=greatest(1,least(8,coalesce(s.selected_class,s.class_no,5)));
 -- Aynı anda arayan biri varsa doğrudan eşleş.
 if (rights->>'social')::boolean then
  select * into d from public.dm_live_duels x
  where x.status='searching' and x.kind='live' and x.host_id<>s.id and x.created_at>now()-interval '14 seconds'
   and not public.dm_blocked(x.host_id,s.id) and public.dm_social_allowed(x.host_id,'duels')
  order by x.created_at limit 1 for update skip locked;
  if d.id is not null then
   update public.dm_live_duels set status='matched',guest_id=s.id,guest_name=s.username,guest_level=lvl,matched_at=now()
   where id=d.id returning * into d;
   return dm_private.duel_view(d,s.id,true)||jsonb_build_object('joined',true);
  end if;
 end if;
 insert into public.dm_live_duels(kind,host_id,grade,host_name,host_level,questions)
 values('live',s.id,g,s.username,lvl,dm_private.duel_questions(g)) returning * into d;
 return dm_private.duel_view(d,s.id)||jsonb_build_object('broadcast',(rights->>'social')::boolean,'level',lvl);
end $$;

create or replace function public.dm_duel_live_accept(p_token text, p_duel uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; rights jsonb; d public.dm_live_duels;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 perform 1 from public.students where id=s.id for update;
 rights:=dm_private.duel_rights(s.id);
 if not (rights->>'social')::boolean then return jsonb_build_object('ok',false,'message','Düellolar hesabında kapalı.'); end if;
 if (rights#>>'{live,remaining}')::int<=0 then
  return jsonb_build_object('ok',false,'paywall',true,'kind','live','message','Bugünkü ücretsiz Canlı Düello hakkını kullandın.')||rights;
 end if;
 select * into d from public.dm_live_duels where id=p_duel for update;
 if d.id is null or d.status<>'searching' or d.kind<>'live' or d.created_at<=now()-interval '15 seconds' then
  return jsonb_build_object('ok',false,'taken',true,'message','Bu düelloyu başkası kaptı.');
 end if;
 if d.host_id=s.id then return jsonb_build_object('ok',false,'message','Kendi düellonu kabul edemezsin.'); end if;
 if public.dm_blocked(d.host_id,s.id) then return jsonb_build_object('ok',false,'taken',true,'message','Bu düello artık açık değil.'); end if;
 update public.dm_live_duels set status='matched',guest_id=s.id,guest_name=s.username,guest_level=dm_private.duel_level(s.id),matched_at=now()
 where id=d.id returning * into d;
 return dm_private.duel_view(d,s.id,true);
end $$;

-- Arayan oyuncu 3 sn'de bir sorar (en fazla 5 kez). 15 sn dolunca Papi devreye girer.
create or replace function public.dm_duel_live_poll(p_token text, p_duel uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; d public.dm_live_duels;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 select * into d from public.dm_live_duels where id=p_duel and host_id=s.id for update;
 if d.id is null then return jsonb_build_object('ok',false,'message','Düello bulunamadı.'); end if;
 if d.status='searching' and d.created_at<=now()-interval '15 seconds' then
  update public.dm_live_duels set status='matched',vs_papi=true,matched_at=now(),papi_answers=dm_private.duel_papi_answers(d.questions)
  where id=d.id returning * into d;
 end if;
 return dm_private.duel_view(d,s.id,d.status='matched');
end $$;

create or replace function public.dm_duel_live_cancel(p_token text, p_duel uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; d public.dm_live_duels;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 update public.dm_live_duels set status='cancelled' where id=p_duel and host_id=s.id and status='searching' returning * into d;
 if d.id is null then
  select * into d from public.dm_live_duels where id=p_duel and host_id=s.id;
  if d.id is null then return jsonb_build_object('ok',false,'message','Düello bulunamadı.'); end if;
  return dm_private.duel_view(d,s.id,d.status='matched')||jsonb_build_object('cancelled',false);
 end if;
 return jsonb_build_object('ok',true,'cancelled',true);
end $$;

create or replace function public.dm_duel_papi_start(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; rights jsonb; d public.dm_live_duels; g int; qs jsonb;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 perform 1 from public.students where id=s.id for update;
 rights:=dm_private.duel_rights(s.id);
 if (rights#>>'{papi,remaining}')::int<=0 then
  return jsonb_build_object('ok',false,'paywall',true,'kind','papi','message','Bugünkü 2 ücretsiz Papi düellonu kullandın.')||rights;
 end if;
 g:=greatest(1,least(8,coalesce(s.selected_class,s.class_no,5)));
 qs:=dm_private.duel_questions(g);
 insert into public.dm_live_duels(kind,status,host_id,vs_papi,grade,host_name,host_level,questions,papi_answers,matched_at)
 values('papi','matched',s.id,true,g,s.username,dm_private.duel_level(s.id),qs,dm_private.duel_papi_answers(qs),now()) returning * into d;
 return dm_private.duel_view(d,s.id,true);
end $$;

create or replace function public.dm_duel_finish(p_token text, p_duel uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; d public.dm_live_duels; side text;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 if not dm_private.duel_valid_answers(p_answers) then return jsonb_build_object('ok',false,'message','Geçersiz düello sonucu.'); end if;
 select * into d from public.dm_live_duels where id=p_duel and (host_id=s.id or guest_id=s.id) for update;
 if d.id is null then return jsonb_build_object('ok',false,'message','Düello bulunamadı.'); end if;
 if d.status='finished' then return dm_private.duel_view(d,s.id); end if;
 if d.status<>'matched' then return jsonb_build_object('ok',false,'message','Düello başlamadı.'); end if;
 side:=case when d.host_id=s.id then 'host' else 'guest' end;
 if side='host' and d.host_answers is null then
  update public.dm_live_duels set host_answers=p_answers where id=d.id returning * into d;
 elsif side='guest' and d.guest_answers is null then
  update public.dm_live_duels set guest_answers=p_answers where id=d.id returning * into d;
 end if;
 if d.vs_papi or (d.host_answers is not null and d.guest_answers is not null) then
  d:=dm_private.duel_settle(d);
 end if;
 return dm_private.duel_view(d,s.id);
end $$;

-- Rakibi bekleyen oyuncu sorar; maç başlangıcından 150 sn sonra bitirmeyen taraf kaybetmiş sayılır.
create or replace function public.dm_duel_result(p_token text, p_duel uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; d public.dm_live_duels;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 select * into d from public.dm_live_duels where id=p_duel and (host_id=s.id or guest_id=s.id) for update;
 if d.id is null then return jsonb_build_object('ok',false,'message','Düello bulunamadı.'); end if;
 if d.status='matched' and d.matched_at<=now()-interval '150 seconds' then d:=dm_private.duel_settle(d); end if;
 return dm_private.duel_view(d,s.id);
end $$;

-- Ödüllü reklam: +1 Canlı / +1 Papi düellosu. Mevcut enerji reklam birimi ve SSV doğrulaması kullanılır.
create or replace function public.dm_duel_ad(p_token text, p_kind text, p_op text, p_offer uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; o dm_ad_rewards.premium_offers; proof dm_ad_rewards.intents; g_key text; rights jsonb;
 today date:=(clock_timestamp() at time zone 'Europe/Istanbul')::date;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 if p_kind not in ('live','papi') then return jsonb_build_object('ok',false,'message','Geçersiz düello türü.'); end if;
 g_key:='duel-'||p_kind;
 perform 1 from public.students where id=s.id for update;
 if p_op='prepare' then
  rights:=dm_private.duel_rights(s.id);
  if (rights->p_kind->>'remaining')::int>0 then return jsonb_build_object('ok',false,'message','Kullanılabilir düello hakkın var.'); end if;
  if exists(select 1 from dm_ad_rewards.intents where student_id=s.id and claimed_at is null and canceled_at is null and expires_at>clock_timestamp()) then
   return jsonb_build_object('ok',false,'message','Açık reklam isteğinin tamamlanmasını bekle.'); end if;
  update dm_ad_rewards.premium_offers set expires_at=clock_timestamp() where student_id=s.id and ad_id is null and expires_at>clock_timestamp();
  insert into dm_ad_rewards.premium_offers(student_id,game) values(s.id,g_key) returning * into o;
  return jsonb_build_object('ok',true,'offerId',o.id);
 elsif p_op='redeem' then
  select * into o from dm_ad_rewards.premium_offers where id=p_offer and student_id=s.id and premium_offers.game=g_key for update;
  if o.id is null then return jsonb_build_object('ok',false,'message','Geçersiz reklam teklifi.'); end if;
  if o.ad_id is null then
   select i.* into proof from dm_ad_rewards.intents i
   where i.student_id=s.id and i.kind='energy' and i.claimed_at is not null and i.transaction_id is not null
    and i.created_at>=o.created_at and i.created_at<o.expires_at and i.reward_day=today
    and not exists(select 1 from dm_ad_rewards.premium_offers used where used.ad_id=i.id)
   order by i.created_at limit 1 for update;
   if proof.id is null then return jsonb_build_object('ok',true,'claimed',false); end if;
   update dm_ad_rewards.premium_offers set ad_id=proof.id,reward_day=today,redeemed_at=clock_timestamp() where id=o.id;
  end if;
  return jsonb_build_object('ok',true,'claimed',true)||dm_private.duel_rights(s.id);
 end if;
 return jsonb_build_object('ok',false,'message','Geçersiz işlem.');
end $$;

revoke all on function dm_private.duel_day_start(),dm_private.duel_level(uuid),dm_private.duel_rights(uuid),
 dm_private.duel_pick(text,text[]),dm_private.duel_questions(integer),dm_private.duel_papi_answers(jsonb),
 dm_private.duel_score(jsonb,jsonb),dm_private.duel_valid_answers(jsonb),dm_private.duel_award(uuid,uuid,text,int,int),
 dm_private.duel_settle(public.dm_live_duels),dm_private.duel_view(public.dm_live_duels,uuid,boolean),dm_private.duel_session(text)
 from public,anon,authenticated;
revoke all on function public.dm_duel_status(text),public.dm_duel_live_search(text),public.dm_duel_live_accept(text,uuid),
 public.dm_duel_live_poll(text,uuid),public.dm_duel_live_cancel(text,uuid),public.dm_duel_papi_start(text),
 public.dm_duel_finish(text,uuid,jsonb),public.dm_duel_result(text,uuid),public.dm_duel_ad(text,text,text,uuid) from public;
grant execute on function public.dm_duel_status(text),public.dm_duel_live_search(text),public.dm_duel_live_accept(text,uuid),
 public.dm_duel_live_poll(text,uuid),public.dm_duel_live_cancel(text,uuid),public.dm_duel_papi_start(text),
 public.dm_duel_finish(text,uuid,jsonb),public.dm_duel_result(text,uuid),public.dm_duel_ad(text,text,text,uuid) to anon,authenticated,service_role;
