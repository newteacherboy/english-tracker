-- Premium Kelime Eşleştirme v2 (3 Kas 2026)
-- * Her premium oyun için ayrı 3 ücretsiz deneme (bu tablo: Kelime Eşleştirme). 1 deneme = 1 bölüm başlatma.
-- * Her bölüm 5 enerji. Premium (dm_entitlements) veya demo hesabı sınırsız oynar.
-- * Ödül oyunlar arasında en yüksek: 3 yıldız = 172 XP + 35 altın (parkur 192 − 20).
-- * Güçlendiriciler altınla alınır, sayıları sunucuda tutulur.
begin;

alter table public.dm_premium_match_usage
  add column if not exists stars jsonb not null default '{}'::jsonb,
  add column if not exists boosters jsonb not null default '{"karistir":1,"degistir":1,"satir":1,"renk":1}'::jsonb;
alter table public.dm_premium_match_runs
  add column if not exists stars integer,
  add column if not exists won boolean,
  add column if not exists xp integer,
  add column if not exists gold integer,
  add column if not exists v2 boolean not null default false;
alter table public.dm_premium_match_usage drop constraint if exists dm_premium_match_usage_level_no_check;
alter table public.dm_premium_match_usage add constraint dm_premium_match_usage_level_no_check check (level_no between 1 and 100);

-- Önceki (kaldırılan) sürümün denemeleri yeni oyunda sayılmasın.
update public.dm_premium_match_usage set free_used=0, level_no=1, stars='{}'::jsonb,
  boosters='{"karistir":1,"degistir":1,"satir":1,"renk":1}'::jsonb, updated_at=now();
update public.dm_premium_match_runs set completed_at=coalesce(completed_at,now()) where not v2;

create or replace function public.dm_pwm_star(level_no integer, star integer)
returns integer language sql immutable set search_path to '' as $$
  -- premium-word-match-core.js starScore() ile birebir aynı olmalı.
  select floor(((case when least(100,greatest(1,level_no))<=4 then 8000 when least(100,greatest(1,level_no))<=49 then 6500 else 5500 end)
    + least(100,greatest(1,level_no))*20) * (array[0.5,1.0,1.3])[greatest(1,least(3,star))])::int
$$;

create or replace function public.dm_pwm_is_premium(actor uuid)
returns boolean language sql stable set search_path to '' as $$
  select exists(select 1 from public.students s where s.id=actor and lower(s.username)='dijimedu_demo')
      or exists(select 1 from public.dm_entitlements e
        where e.account_id=actor and e.account_role='student' and e.state='active'
          and e.product_key in ('premium','premium_plus','premium_max','diji_premium','diji_premium_plus','diji_premium_max','teacher_premium')
          and (e.valid_until is null or e.valid_until>now()))
$$;

create or replace function public.dm_pwm_energy(st public.students)
returns integer language sql stable set search_path to '' as $$
  select case when st.energy>=st.energy_max then st.energy
    else least(st.energy_max, st.energy+greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int) end
$$;

create or replace function public.dm_pwm_status(actor uuid)
returns jsonb language plpgsql set search_path to '' as $$
declare u public.dm_premium_match_usage; st public.students; prem boolean;
begin
  select * into st from public.students where id=actor and status='approved' and role='student';
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  insert into public.dm_premium_match_usage(student_id) values(actor) on conflict(student_id) do nothing;
  select * into u from public.dm_premium_match_usage where student_id=actor;
  prem:=public.dm_pwm_is_premium(actor);
  return jsonb_build_object('ok',true,'premium',prem,'freeUsed',u.free_used,'remaining',case when prem then 999 else greatest(0,3-u.free_used) end,
    'level',u.level_no,'stars',u.stars,'boosters',u.boosters,'energy',public.dm_pwm_energy(st),'energyMax',st.energy_max,'gold',st.gold);
end $$;

create or replace function public.dm_pwm_start(actor uuid, run_key uuid, p_level integer)
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; u public.dm_premium_match_usage; r public.dm_premium_match_runs; prem boolean; available int; ticks int;
begin
  if run_key is null or p_level is null or p_level<1 or p_level>100 then raise exception 'Geçersiz bölüm.'; end if;
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  insert into public.dm_premium_match_usage(student_id) values(actor) on conflict(student_id) do nothing;
  select * into u from public.dm_premium_match_usage where student_id=actor for update;
  select * into r from public.dm_premium_match_runs where student_id=actor and run_id=run_key;
  if found then return public.dm_pwm_status(actor)||jsonb_build_object('runId',run_key,'replayed',true); end if;
  if p_level>u.level_no then raise exception 'Bu bölüm henüz açılmadı.'; end if;
  prem:=public.dm_pwm_is_premium(actor);
  if not prem and u.free_used>=3 then raise exception 'Ücretsiz 3 oyun hakkın bitti.'; end if;
  ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int;
  available:=public.dm_pwm_energy(st);
  if available<5 then raise exception 'Oyuna başlamak için 5 enerji gerekli.'; end if;
  update public.students set energy=available-5,
    energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end
    where id=actor;
  insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-5,available-5,'premium-kelime:'||run_key);
  insert into public.dm_premium_match_runs(student_id,run_id,premium,level_no,v2) values(actor,run_key,prem,p_level,true);
  if not prem then update public.dm_premium_match_usage set free_used=free_used+1,updated_at=now() where student_id=actor; end if;
  return public.dm_pwm_status(actor)||jsonb_build_object('runId',run_key,'replayed',false);
end $$;

create or replace function public.dm_pwm_finish(actor uuid, run_key uuid, p_score integer, p_won boolean, p_moves integer, p_seconds integer)
returns jsonb language plpgsql set search_path to '' as $$
declare r public.dm_premium_match_runs; u public.dm_premium_match_usage; st public.students; v jsonb; elapsed numeric;
  s int:=0; best int; x int; g int; ver bigint; mult numeric; day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_premium_match_runs where student_id=actor and run_id=run_key for update;
  if not found or not r.v2 then raise exception 'Oyun bulunamadı.'; end if;
  if r.completed_at is not null then
    select value into v from public.extra_data where student_id=actor and key_name='yo';
    return public.dm_pwm_status(actor)||jsonb_build_object('runId',run_key,'duplicate',true,'won',r.won,'stars',r.stars,'xp',r.xp,'gold',r.gold,'score',r.score,'yo',v);
  end if;
  elapsed:=extract(epoch from clock_timestamp()-r.started_at);
  if p_score is null or p_score<0 or p_score>public.dm_pwm_star(r.level_no,1)*8+30000 or p_seconds is null or p_seconds<0
     or p_seconds>elapsed+3 or p_moves is null or p_moves<0 or p_moves>60 then raise exception 'Oyun sonucu doğrulanamadı.'; end if;
  if p_won and (p_seconds<8 or p_moves<1) then raise exception 'Oyun sonucu doğrulanamadı.'; end if;
  select * into u from public.dm_premium_match_usage where student_id=actor for update;
  best:=coalesce((u.stars->>r.level_no::text)::int,0);
  if p_won then
    s:=case when p_score>=public.dm_pwm_star(r.level_no,3) then 3 when p_score>=public.dm_pwm_star(r.level_no,2) then 2 else 1 end;
    mult:=(array[0.5,0.75,1.0])[s];
    if best>=s then mult:=mult*0.5; end if; -- daha önce aynı/daha iyi yıldızla geçilmiş bölüm: yarım ödül
    x:=round(172*mult); g:=round(35*mult);
    update public.dm_premium_match_usage set stars=jsonb_set(stars,array[r.level_no::text],to_jsonb(greatest(best,s))),
      level_no=case when r.level_no=level_no then least(100,level_no+1) else level_no end, updated_at=now() where student_id=actor;
  else
    x:=10; g:=2; -- her oyun ödül kazandırır: küçük teselli
  end if;
  select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
  if v is not null and (x>0 or g>0) then
    ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
    v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
    v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
    v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
    v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));
    v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
    update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
    update public.students set gold=(v->>'altin')::numeric where id=actor;
    select value into v from public.extra_data where student_id=actor and key_name='yo';
    insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values(actor,run_key::text,'premiumkelime',0,'{}',x,g);
  elsif v is null then x:=0; g:=0;
  end if;
  update public.dm_premium_match_runs set completed_at=now(),score=p_score,stars=s,won=p_won,xp=x,gold=g where student_id=actor and run_id=run_key;
  return public.dm_pwm_status(actor)||jsonb_build_object('runId',run_key,'duplicate',false,'won',p_won,'stars',s,'xp',x,'gold',g,'score',p_score,'yo',v);
end $$;

create or replace function public.dm_pwm_booster(actor uuid, kind text, op text, run_key uuid default null)
returns jsonb language plpgsql set search_path to '' as $$
declare u public.dm_premium_match_usage; v jsonb; price int; have int; ver bigint;
begin
  price:=case kind when 'karistir' then 40 when 'degistir' then 60 when 'satir' then 80 when 'renk' then 120 else null end;
  if price is null or op not in ('buy','use') then raise exception 'Geçersiz güçlendirici.'; end if;
  perform 1 from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  insert into public.dm_premium_match_usage(student_id) values(actor) on conflict(student_id) do nothing;
  select * into u from public.dm_premium_match_usage where student_id=actor for update;
  have:=coalesce((u.boosters->>kind)::int,0);
  if op='use' then
    if run_key is null or not exists(select 1 from public.dm_premium_match_runs r where r.student_id=actor and r.run_id=run_key and r.v2 and r.completed_at is null)
      then raise exception 'Oyun bulunamadı.'; end if;
    if have<1 then raise exception 'Bu güçlendiriciden kalmadı.'; end if;
    update public.dm_premium_match_usage set boosters=jsonb_set(boosters,array[kind],to_jsonb(have-1)),updated_at=now() where student_id=actor;
    return public.dm_pwm_status(actor);
  end if;
  if have>=99 then raise exception 'Bu güçlendiriciden en fazla 99 tane olabilir.'; end if;
  select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
  if v is null then raise exception 'Hesap bilgileri hazır değil.'; end if;
  if coalesce((v->>'altin')::numeric,0)<price then raise exception 'Yeterli altının yok.'; end if;
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('altin',(v->>'altin')::numeric-price,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
  update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
  update public.students set gold=(v->>'altin')::numeric where id=actor;
  update public.dm_premium_match_usage set boosters=jsonb_set(boosters,array[kind],to_jsonb(have+1)),updated_at=now() where student_id=actor;
  select value into v from public.extra_data where student_id=actor and key_name='yo';
  return public.dm_pwm_status(actor)||jsonb_build_object('yo',v,'price',price);
end $$;

revoke all on function public.dm_pwm_star(integer,integer) from public,anon,authenticated;
revoke all on function public.dm_pwm_is_premium(uuid) from public,anon,authenticated;
revoke all on function public.dm_pwm_energy(public.students) from public,anon,authenticated;
revoke all on function public.dm_pwm_status(uuid) from public,anon,authenticated;
revoke all on function public.dm_pwm_start(uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.dm_pwm_finish(uuid,uuid,integer,boolean,integer,integer) from public,anon,authenticated;
revoke all on function public.dm_pwm_booster(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.dm_pwm_status(uuid) to service_role;
grant execute on function public.dm_pwm_start(uuid,uuid,integer) to service_role;
grant execute on function public.dm_pwm_finish(uuid,uuid,integer,boolean,integer,integer) to service_role;
grant execute on function public.dm_pwm_booster(uuid,text,text,uuid) to service_role;
grant execute on function public.dm_pwm_star(integer,integer) to service_role;
grant execute on function public.dm_pwm_is_premium(uuid) to service_role;
grant execute on function public.dm_pwm_energy(public.students) to service_role;
commit;
