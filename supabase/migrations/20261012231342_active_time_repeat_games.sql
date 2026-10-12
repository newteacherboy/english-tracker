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
      and units&&unit_ids and xp>0
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
create table if not exists public.dm_active_time (
 student_id uuid primary key references public.students(id) on delete cascade,
 seconds bigint not null default 0 check(seconds>=0),
 base_chest bigint not null default 0,
 claimed bigint[] not null default '{}',
 last_tick timestamptz not null default now(),
 last_run text not null default '', last_seq bigint not null default 0
);
alter table public.dm_active_time enable row level security;
revoke all on public.dm_active_time from public,anon,authenticated;
grant all on public.dm_active_time to service_role;
create or replace function public.dm_active_time_tick(actor uuid,run_key text,seq bigint,active_seconds int,claim_index bigint default 0)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.dm_active_time; seed bigint; credit int; gold int:=0; quality int; v jsonb; ver bigint;
begin
 if run_key is null or length(run_key) not between 8 and 100 or seq is null or seq<0 or active_seconds is null or active_seconds not between 0 and 45 or claim_index is null or claim_index<0 then raise exception 'Geçersiz süre isteği';end if;
 select coalesce(total_seconds,0) into seed from public.students where id=actor for update;
 if not found then raise exception 'Öğrenci bulunamadı';end if;
 insert into public.dm_active_time(student_id,seconds,base_chest) values(actor,greatest(0,seed),greatest(0,seed)/6000) on conflict do nothing;
 select * into r from public.dm_active_time where student_id=actor for update;
 if active_seconds>0 and not(r.last_run=run_key and seq<=r.last_seq) then
  credit:=least(active_seconds,45,greatest(0,floor(extract(epoch from now()-r.last_tick))::int));
  r.seconds:=r.seconds+credit;r.last_tick:=now();r.last_run:=run_key;r.last_seq:=seq;
  update public.dm_active_time set seconds=r.seconds,last_tick=r.last_tick,last_run=r.last_run,last_seq=r.last_seq where student_id=actor;
  update public.students set total_seconds=greatest(coalesce(total_seconds,0),r.seconds) where id=actor;
 end if;
 if claim_index>0 then
  if claim_index<=r.base_chest or claim_index>r.seconds/6000 then raise exception 'Bu sandık henüz hazır değil';end if;
  if not(claim_index=any(r.claimed)) then
   quality:=least(4,((claim_index-r.base_chest-1)/5)::int);gold:=(array[20,40,75,120,200])[quality+1];
   select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
   if v is null then raise exception 'Hesap bilgileri hazır değil';end if;
   ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
   v:=v||jsonb_build_object('altin',coalesce((v->>'altin')::numeric,0)+gold,'guncelleme',ver,'dmRewardVersion',ver);
   update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
   update public.students set gold=(v->>'altin')::numeric where id=actor;
   r.claimed:=array_append(r.claimed,claim_index);update public.dm_active_time set claimed=r.claimed where student_id=actor;
  end if;
 end if;
 return jsonb_build_object('ok',true,'seconds',r.seconds,'stars',r.seconds/600,'baseChest',r.base_chest,'chestCount',r.seconds/6000,'claimed',to_jsonb(r.claimed),'gold',gold,'yo',v);
end $$;
revoke all on function public.dm_active_time_tick(uuid,text,bigint,int,bigint) from public,anon,authenticated;
grant execute on function public.dm_active_time_tick(uuid,text,bigint,int,bigint) to service_role;
