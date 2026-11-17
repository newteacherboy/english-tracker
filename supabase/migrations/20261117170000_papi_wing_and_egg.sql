-- [17 Kas 2026] Papi'nin Kanadı (ateş serisinin yerine) ve parkurda Sürpriz Yumurta (sandık yerine).
-- Bütün sayımlar ve ödüller sunucuda; istemciden gelen hiçbir sayı kullanılmaz.

-- Öğrencinin `since` anından beri bitirdiği parkur durakları:
-- Okul Yolum durakları (dm_game_reward_runs 'ba', ödüllü) + Öğrenme Yolu bölümleri (ödül anı last_reward.yo.guncelleme).
create or replace function public.dm_papi_study_count(actor uuid, since timestamptz)
returns integer language sql stable set search_path='' as $$
 select (
  (select count(*) from public.dm_game_reward_runs
    where student_id=actor and game_key='ba' and xp>0 and created_at>=since)
 +(select count(*) from public.papi_story_progress
    where student_id=actor and reward_claimed
      and coalesce(last_reward#>>'{yo,guncelleme}','') ~ '^[0-9]{10,16}$'
      and to_timestamp((last_reward#>>'{yo,guncelleme}')::bigint/1000.0)>=since)
 )::int
$$;
revoke all on function public.dm_papi_study_count(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.dm_papi_study_count(uuid,timestamptz) to service_role;

-- Enerji ödülü: önce bekleyen dolumu işler, sonra kapasiteye kadar ekler.
-- Enerji doluysa ödül kaybolmaz; 'papi_energy_pending_v1' içinde bekler ve enerji azalınca eklenir.
-- Çağıran fonksiyon öğrenci satırını FOR UPDATE ile kilitlemiş olmalı.
create or replace function public.dm_papi_energy_credit(actor uuid, amount integer, why text)
returns jsonb language plpgsql set search_path='' as $$
declare s public.students; cap int; before_energy int; balance int; stamp timestamptz; steps int;
 pending int; added int:=0;
begin
 select * into s from public.students where id=actor;
 cap:=coalesce(nullif(s.energy_max,0),25);before_energy:=coalesce(s.energy,0);balance:=before_energy;stamp:=coalesce(s.energy_updated_at,now());
 if balance<cap then
  steps:=greatest(0,floor(extract(epoch from (now()-stamp))/900)::int);
  if steps>0 then
   balance:=least(cap,balance+steps);stamp:=case when balance>=cap then now() else stamp+steps*interval '15 minutes' end;
   insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,balance-before_energy,balance,'dolum');
  end if;
 elsif now()-stamp>interval '15 minutes' then stamp:=now(); end if;
 select coalesce((value->>'amount')::int,0) into pending from public.extra_data where student_id=actor and key_name='papi_energy_pending_v1';
 pending:=greatest(0,coalesce(pending,0))+greatest(0,coalesce(amount,0));
 if pending>0 and balance<cap then
  added:=least(pending,cap-balance);balance:=balance+added;pending:=pending-added;
  insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,added,balance,left(coalesce(why,'papi'),20));
 end if;
 insert into public.extra_data(student_id,key_name,value) values(actor,'papi_energy_pending_v1',jsonb_build_object('amount',pending))
 on conflict(student_id,key_name) do update set value=excluded.value,updated_at=now();
 update public.students set energy=balance,energy_updated_at=stamp where id=actor;
 return jsonb_build_object('added',added,'pending',pending,'enerjiKalan',balance,'enerjiMax',cap);
end $$;
revoke all on function public.dm_papi_energy_credit(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.dm_papi_energy_credit(uuid,integer,text) to service_role;

-- Papi'nin Kanadı: o gün en az 1 durak bitiren öğrenci günün tüyünü otomatik alır.
-- 7 tüy = kanat dolar: +10 enerji, kanat seviyesi +1. Kaçan her gün 1 tüy düşürür; 3+ gün kaçarsa
-- kanattaki tüyler sıfırlanır ama seviye kalır. Seri kalkanı (Tüy Yağı) olan gün kaçmış sayılmaz;
-- 1–2 kaçan gün için sahip olunan Tüy Yağı (yo.dondurucu) otomatik kullanılır.
create or replace function public.dm_papi_feather(actor uuid)
returns jsonb language plpgsql set search_path='' as $$
declare
 s public.students; today date:=(now() at time zone 'Europe/Istanbul')::date;
 day_start timestamptz; st jsonb; feathers int; lvl int; last_day date; days jsonb; d date;
 missed int:=0; kept int; studied boolean; earned boolean:=false; wing boolean:=false; shield_used int:=0; lost int:=0;
 v jsonb; owned int; credit jsonb:='{}'; total int; ver bigint;
begin
 select * into s from public.students where id=actor and role='student' and status='approved' and frozen_at is null for update;
 if not found then return jsonb_build_object('ok',false,'code','auth');end if;
 day_start:=today::timestamp at time zone 'Europe/Istanbul';
 select value into st from public.extra_data where student_id=actor and key_name='papi_wing_v1';
 st:=coalesce(st,'{}');
 feathers:=least(6,greatest(0,coalesce((st->>'feathers')::int,0)));lvl:=greatest(1,coalesce((st->>'level')::int,1));
 last_day:=nullif(st->>'lastDay','')::date;days:=case when jsonb_typeof(st->'days')='array' then st->'days' else '[]' end;
 total:=greatest(0,coalesce((st->>'total')::int,0));
 if last_day is not null and last_day<today-1 then
  for d in select generate_series(last_day+1,today-1,interval '1 day')::date loop
   if not exists(select 1 from public.extra_data where student_id=actor and key_name='streak_shield:'||d::text) then missed:=missed+1;end if;
  end loop;
 end if;
 studied:=public.dm_papi_study_count(actor,day_start)>0;
 if studied and (last_day is null or last_day<today) then
  if missed between 1 and 2 then
   select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
   owned:=greatest(0,floor(coalesce((v->>'dondurucu')::numeric,0))::int);
   if owned>=missed then
    shield_used:=missed;missed:=0;
    ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
    v:=v||jsonb_build_object('dondurucu',owned-shield_used,'guncelleme',ver);
    update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
   end if;
  end if;
  kept:=case when missed>=3 then 0 else greatest(0,feathers-missed) end;lost:=feathers-kept;
  feathers:=kept+1;total:=total+1;earned:=true;
  days:=(select coalesce(jsonb_agg(x order by x),'[]') from (select distinct e.x from jsonb_array_elements_text(days||to_jsonb(today::text)) as e(x) order by e.x desc limit 7) t);
  if feathers>=7 then
   wing:=true;lvl:=lvl+1;feathers:=7;
   credit:=public.dm_papi_energy_credit(actor,10,'tuy_kanat');
  end if;
  last_day:=today;missed:=0;
  st:=jsonb_build_object('feathers',case when wing then 0 else feathers end,'level',lvl,'lastDay',today,'days',days,'total',total);
  insert into public.extra_data(student_id,key_name,value) values(actor,'papi_wing_v1',st)
  on conflict(student_id,key_name) do update set value=excluded.value,updated_at=now();
 elsif credit='{}'::jsonb then
  -- Kanat ödülü enerji dolu olduğu için beklemedeyse, enerji azalınca burada eklenir.
  if exists(select 1 from public.extra_data where student_id=actor and key_name='papi_energy_pending_v1' and coalesce((value->>'amount')::int,0)>0) then
   credit:=public.dm_papi_energy_credit(actor,0,'tuy_kanat');
  end if;
 end if;
 return jsonb_build_object('ok',true,'day',today,'feathers',case when earned then feathers else (case when missed>=3 then 0 else greatest(0,feathers-missed) end) end,
  'level',lvl,'need',7,'reward',10,'todayDone',coalesce(last_day=today,false),'justEarned',earned,'wingDone',wing,'shieldUsed',shield_used,'lost',lost,
  'atRisk',case when last_day=today then 0 when missed>=3 then feathers else least(feathers,missed) end,'studiedToday',studied,'days',days,'total',total,
  'eklenen',coalesce((credit->>'added')::int,0),'bekleyenEnerji',coalesce((credit->>'pending')::int,0),
  'enerjiKalan',coalesce((credit->>'enerjiKalan')::int,s.energy),'enerjiMax',coalesce((credit->>'enerjiMax')::int,nullif(s.energy_max,0),25));
end $$;
revoke all on function public.dm_papi_feather(uuid) from public,anon,authenticated;
grant execute on function public.dm_papi_feather(uuid) to service_role;

-- Parkurda Sürpriz Yumurta: her 3 durakta bir yumurta çatlar. Türü sırayla belirlenir:
-- her 5. yumurta altın, her 3. gümüş, diğerleri benekli. Ödüller tek yerden (aşağıdaki tablo) ayarlanır.
create or replace function public.dm_papi_egg(actor uuid, hatch boolean default false)
returns jsonb language plpgsql set search_path='' as $$
declare
 s public.students; st jsonb; since timestamptz; hatched int; n int; progress int; need int:=3; kind text;
 gold int; energy int; v jsonb; ver bigint; credit jsonb:='{}'; result jsonb:=null;
begin
 select * into s from public.students where id=actor and role='student' and status='approved' and frozen_at is null for update;
 if not found then return jsonb_build_object('ok',false,'code','auth');end if;
 select value into st from public.extra_data where student_id=actor and key_name='papi_egg_v1';
 if st is null then
  st:=jsonb_build_object('since',now(),'hatched',0);
  insert into public.extra_data(student_id,key_name,value) values(actor,'papi_egg_v1',st) on conflict(student_id,key_name) do nothing;
 end if;
 since:=(st->>'since')::timestamptz;hatched:=greatest(0,coalesce((st->>'hatched')::int,0));
 n:=hatched+1;progress:=least(need,public.dm_papi_study_count(actor,since));
 kind:=case when n%5=0 then 'altin' when n%3=0 then 'gumus' else 'benekli' end;
 gold:=case kind when 'altin' then 80 when 'gumus' then 40 else 20 end;
 energy:=case kind when 'altin' then 5 when 'gumus' then 3 else 2 end;
 if hatch then
  if progress<need then return jsonb_build_object('ok',false,'code','not_ready','progress',progress,'need',need);end if;
  select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
  v:=coalesce(v,'{}');
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('altin',coalesce((v->>'altin')::numeric,0)+gold,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
  insert into public.extra_data(student_id,key_name,value) values(actor,'yo',v)
  on conflict(student_id,key_name) do update set value=excluded.value,updated_at=now();
  update public.students set gold=(v->>'altin')::numeric,updated_at=now() where id=actor;
  credit:=public.dm_papi_energy_credit(actor,energy,'yumurta');
  insert into public.extra_data(student_id,key_name,value) values(actor,'papi_egg_hatch:'||n,jsonb_build_object('kind',kind,'gold',gold,'energy',energy,'at',now()))
  on conflict(student_id,key_name) do nothing;
  result:=jsonb_build_object('kind',kind,'gold',gold,'energy',energy,'eklenen',coalesce((credit->>'added')::int,0));
  hatched:=n;n:=hatched+1;since:=now();progress:=0;
  st:=jsonb_build_object('since',since,'hatched',hatched);
  update public.extra_data set value=st,updated_at=now() where student_id=actor and key_name='papi_egg_v1';
  kind:=case when n%5=0 then 'altin' when n%3=0 then 'gumus' else 'benekli' end;
 end if;
 return jsonb_build_object('ok',true,'progress',progress,'need',need,'ready',progress>=need,'kind',kind,'number',n,'hatched',hatched,
  'reward',jsonb_build_object('gold',case kind when 'altin' then 80 when 'gumus' then 40 else 20 end,'energy',case kind when 'altin' then 5 when 'gumus' then 3 else 2 end),
  'opened',result,'altin',case when result is null then null else (v->>'altin')::numeric end,'yo',case when result is null then null else v end,
  'enerjiKalan',coalesce((credit->>'enerjiKalan')::int,s.energy),'enerjiMax',coalesce((credit->>'enerjiMax')::int,nullif(s.energy_max,0),25));
end $$;
revoke all on function public.dm_papi_egg(uuid,boolean) from public,anon,authenticated;
grant execute on function public.dm_papi_egg(uuid,boolean) to service_role;
