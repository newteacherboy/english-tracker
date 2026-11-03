-- Üyelik planları (4 Kas 2026): Free / Pro / Premium Pro (öğrenci) ve Öğretmen Free / Pro / Premium Pro.
-- Plan bilgisi yalnızca sunucuda, doğrulanmış mağaza makbuzundan (dm_entitlements) gelir.
--   Öğrenci ürünleri: diji_pro, diji_premium_pro   Öğretmen ürünleri: teacher_pro, teacher_premium_pro
-- Bu sürümde uygulanan kurallar:
--   * Günlük enerji: 25 / 40 / sınırsız (Premium Pro'da enerji her yazımda dolu tutulur, kapasite 60).
--   * Günlük giriş altını: 0 / +30 / +75. Ayda ücretsiz seri kalkanı: 0 / 2 / 5.
--   * Mola Vakti: her oyun günde 2 / 3 / 5.
--   * Premium Oyunlar: Free 3 deneme, Pro günde 5 bölüm, Premium Pro sınırsız.
--   * Ödüllü enerji reklamı +7 (AdMob panelinde ödül 7'ye çekilene kadar gelen 3 kanıtı da kabul edilir).
--   * Lig: herkes için günlük 3.500 lig puanı üst sınırı.
-- Bu sürümde YOK (sonraki adım): Pro 1,5 kat enerji dolumu, öğretmen sınıf/öğrenci sınırları.
begin;

-- Var olan fonksiyon metnini güvenli biçimde yamalar: eşleşme yoksa migration durur.
create function pg_temp.dm_patch(sig regprocedure, old_text text, new_text text) returns void language plpgsql as $$
declare fn text;
begin
  fn:=pg_get_functiondef(sig);
  if position(old_text in fn)=0 then raise exception 'dm_patch: % içinde beklenen metin yok: %', sig, old_text; end if;
  execute replace(fn,old_text,new_text);
end $$;

-- ---------------------------------------------------------------- plan
create function public.dm_plan(actor uuid, account_role text default 'student')
returns text language sql stable set search_path to '' as $$
  select case
    when account_role='student' and exists(select 1 from public.students s where s.id=actor and lower(s.username)='dijimedu_demo') then 'premium_pro'
    when exists(select 1 from public.dm_entitlements e where e.account_id=actor and e.account_role=dm_plan.account_role and e.state='active'
      and (e.valid_until is null or e.valid_until>now())
      and e.product_key = any(case when dm_plan.account_role='teacher' then array['teacher_premium_pro']
                                   else array['diji_premium_pro','premium','premium_plus','premium_max','diji_premium','diji_premium_plus','diji_premium_max'] end))
      then 'premium_pro'
    when exists(select 1 from public.dm_entitlements e where e.account_id=actor and e.account_role=dm_plan.account_role and e.state='active'
      and (e.valid_until is null or e.valid_until>now())
      and e.product_key = case when dm_plan.account_role='teacher' then 'teacher_pro' else 'diji_pro' end)
      then 'pro'
    else 'free' end
$$;

create function public.dm_plan_limits(plan text)
returns jsonb language sql immutable set search_path to '' as $$
  select case plan
    when 'premium_pro' then '{"plan":"premium_pro","energyMax":60,"unlimitedEnergy":true,"dailyGold":75,"monthlyShields":5,"mola":5,"pwmDaily":null,"pwmUnlimited":true,"ads":false,"leagueDailyCap":3500}'::jsonb
    when 'pro' then '{"plan":"pro","energyMax":40,"unlimitedEnergy":false,"dailyGold":30,"monthlyShields":2,"mola":3,"pwmDaily":5,"pwmUnlimited":false,"ads":false,"leagueDailyCap":3500}'::jsonb
    else '{"plan":"free","energyMax":25,"unlimitedEnergy":false,"dailyGold":0,"monthlyShields":0,"mola":2,"pwmDaily":null,"pwmUnlimited":false,"ads":true,"leagueDailyCap":3500}'::jsonb end
$$;

create function public.dm_plan_limit(actor uuid, limit_key text)
returns integer language sql stable set search_path to '' as $$
  select (public.dm_plan_limits(public.dm_plan(actor,'student'))->>limit_key)::int
$$;

-- ---------------------------------------------------------------- enerji kapasitesi
alter table public.students drop constraint if exists dm_energy_capacity_25;
create or replace function public.dm_energy_fixed_capacity() returns trigger
language plpgsql set search_path='' as $$
declare lim jsonb:=public.dm_plan_limits(public.dm_plan(new.id,'student')); cap int:=(lim->>'energyMax')::int;
begin
 new.energy_max:=cap;
 if (lim->>'unlimitedEnergy')::boolean then new.energy:=cap; -- Premium Pro: harcanan enerji anında geri dolar.
 else new.energy:=greatest(0,least(cap,coalesce(new.energy,cap))); end if;
 return new;
end $$;
alter table public.students add constraint dm_energy_capacity_plan check(energy_max in (25,40,60) and energy between 0 and energy_max);

-- Abonelik değişince öğrencinin kapasitesi hemen yenilensin.
create function public.dm_plan_entitlement_refresh() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op<>'DELETE' and new.account_role='student' then update public.students set energy_max=energy_max where id=new.account_id; end if;
 if tg_op<>'INSERT' and old.account_role='student' and (tg_op='DELETE' or old.account_id<>new.account_id) then
  update public.students set energy_max=energy_max where id=old.account_id; end if;
 return null;
end $$;
create trigger dm_plan_entitlement_refresh after insert or update or delete on public.dm_entitlements
for each row execute function public.dm_plan_entitlement_refresh();

-- Sabit 25 kullanan eski yazıcılar plan kapasitesini kullansın.
select pg_temp.dm_patch('public.dm_daily_energy_bonus(uuid)','cap:=25;','cap:=coalesce(nullif(s.energy_max,0),25);');
select pg_temp.dm_patch('public.dm_progress_lesson_energy(uuid,text,text,text)','25-st.energy','st.energy_max-st.energy');
select pg_temp.dm_patch('public.dm_arcade_verified_start'::regproc::regprocedure,'''enerjiMax'',25','''enerjiMax'',s.energy_max');
select pg_temp.dm_patch('public.dm_arcade_verified_start'::regproc::regprocedure,'least(25,coalesce(s.energy,0)+ticks)','least(s.energy_max,coalesce(s.energy,0)+ticks)');
select pg_temp.dm_patch('public.dm_arcade_verified_start'::regproc::regprocedure,'available=25 THEN','available>=s.energy_max THEN');

-- ---------------------------------------------------------------- ödüllü reklam: +7 enerji
select pg_temp.dm_patch('public.dm_ad_intent(uuid,text,text,uuid,uuid)','st.energy>=25','st.energy>=st.energy_max');
select pg_temp.dm_patch('public.dm_ad_claim(uuid,text,text,integer,timestamptz)',
  'p_amount<>(case i.kind when ''energy'' then 3 else 100 end)',
  'p_amount<>all(case i.kind when ''energy'' then array[3,7] else array[100] end)');
select pg_temp.dm_patch('public.dm_ad_claim(uuid,text,text,integer,timestamptz)','least(3,greatest(0,25-st.energy))','least(7,greatest(0,st.energy_max-st.energy))');

-- ---------------------------------------------------------------- günlük altın ve aylık seri kalkanı
-- Günlük enerji hediyesi günde bir kez extra_data'ya 'energy_daily:<gün>' yazar; plan hediyesi buna bağlanır.
create function public.dm_plan_daily_perks() returns trigger
language plpgsql set search_path='' as $$
declare lim jsonb; gold int; shields int; v jsonb; month_key text:='plan_shields:'||to_char(now() at time zone 'Europe/Istanbul','YYYY-MM');
  st public.students; balance numeric;
begin
 select * into st from public.students where id=new.student_id and status='approved' and role='student';
 if not found then return null; end if;
 lim:=public.dm_plan_limits(public.dm_plan(new.student_id,'student'));
 gold:=(lim->>'dailyGold')::int; shields:=(lim->>'monthlyShields')::int;
 if gold=0 and shields=0 then return null; end if;
 select value into v from public.extra_data where student_id=new.student_id and key_name='yo' for update;
 if v is null then return null; end if;
 if shields>0 and not exists(select 1 from public.extra_data where student_id=new.student_id and key_name=month_key) then
  insert into public.extra_data(student_id,key_name,value) values(new.student_id,month_key,jsonb_build_object('count',shields,'plan',lim->>'plan'));
  v:=jsonb_set(v,'{dondurucu}',to_jsonb(greatest(0,coalesce((v->>'dondurucu')::numeric,0))+shields));
 else shields:=0; end if;
 balance:=greatest(0,coalesce((v->>'altin')::numeric,0))+gold;
 v:=jsonb_set(jsonb_set(v,'{altin}',to_jsonb(balance)),'{guncelleme}',to_jsonb(floor(extract(epoch from clock_timestamp())*1000)));
 update public.extra_data set value=v,updated_at=now() where student_id=new.student_id and key_name='yo';
 update public.students set gold=balance where id=new.student_id;
 insert into public.extra_data(student_id,key_name,value) values(new.student_id,'plan_daily:'||substr(new.key_name,14),jsonb_build_object('gold',gold,'shields',shields))
 on conflict(student_id,key_name) do nothing;
 return null;
end $$;
create trigger dm_plan_daily_perks after insert on public.extra_data
for each row when (new.key_name like 'energy_daily:%' and coalesce(new.value->>'legacy','false')<>'true')
execute function public.dm_plan_daily_perks();

-- ---------------------------------------------------------------- Mola Vakti hakları
select pg_temp.dm_patch('public.dm_break_status(uuid)','greatest(0,2-(select','greatest(0,public.dm_plan_limit(actor,''mola'')-(select');
select pg_temp.dm_patch('public.dm_break_start(uuid,uuid,text,integer)',
  ')>=2 then raise exception ''Bugünkü 2 hakkın bitti, yarın yine gel''',
  ')>=public.dm_plan_limit(actor,''mola'') then raise exception ''Bugünkü oyun hakkın bitti, yarın yine gel''');

-- ---------------------------------------------------------------- Premium Oyunlar
create or replace function public.dm_pwm_is_premium(actor uuid)
returns boolean language sql stable set search_path to '' as $$
  select public.dm_plan(actor,'student')='premium_pro'
$$;
create function public.dm_pwm_today_runs(actor uuid)
returns integer language sql stable set search_path to '' as $$
  select count(*)::int from public.dm_premium_match_runs r where r.student_id=actor and r.v2
    and r.started_at>=((now() at time zone 'Europe/Istanbul')::date::timestamp at time zone 'Europe/Istanbul')
$$;
select pg_temp.dm_patch('public.dm_pwm_status(uuid)','''ok'',true,''premium'',prem,','''ok'',true,''plan'',public.dm_plan(actor,''student''),''premium'',prem,');
select pg_temp.dm_patch('public.dm_pwm_status(uuid)',
  'case when prem then 999 else greatest(0,3-u.free_used) end',
  'case when prem then 999 when public.dm_plan(actor,''student'')=''pro'' then greatest(0,5-public.dm_pwm_today_runs(actor)) else greatest(0,3-u.free_used) end');
select pg_temp.dm_patch('public.dm_pwm_start(uuid,uuid,integer)',
  'if not prem and u.free_used>=3 then raise exception ''Ücretsiz 3 oyun hakkın bitti.''; end if;',
  'if not prem and public.dm_plan(actor,''student'')=''pro'' then
    if public.dm_pwm_today_runs(actor)>=5 then raise exception ''Bugünkü 5 bölüm hakkın bitti.''; end if;
  elsif not prem and u.free_used>=3 then raise exception ''Ücretsiz 3 oyun hakkın bitti.''; end if;');

-- ---------------------------------------------------------------- lig: günlük 3.500 puan sınırı (herkese aynı)
create or replace function public.dm_competitive_xp(actor uuid, week date)
returns numeric language sql stable set search_path to '' as $$
with bounds as (select week::timestamp at time zone 'Europe/Istanbul' a,(week+7)::timestamp at time zone 'Europe/Istanbul' b),
ev as (
 select (g.created_at at time zone 'Europe/Istanbul')::date d,
   greatest(0,g.correct_count*6+floor(coalesce((g.extra->>'speed')::numeric,0)/100)-g.wrong_count*3) p
   from public.game_scores g,bounds where g.student_id=actor and g.extra->>'v'='3' and g.correct_count>0 and g.created_at>=bounds.a and g.created_at<bounds.b
 union all
 select (p.first_at at time zone 'Europe/Istanbul')::date,80
   from (select min(completed_at) first_at from public.lesson_progress where student_id=actor and test_success group by level,category,topic_name) p,bounds
   where p.first_at>=bounds.a and p.first_at<bounds.b
 union all
 select (l.completed_at at time zone 'Europe/Istanbul')::date,42
   from public.level_completions l,bounds where l.student_id=actor and l.mode='buyu' and l.level_no>=1000 and l.completed_at>=bounds.a and l.completed_at<bounds.b
)
select coalesce(sum(least(3500,day_points)),0) from (select d,sum(p) day_points from ev group by d) x;
$$;

revoke all on function public.dm_plan(uuid,text),public.dm_plan_limits(text),public.dm_plan_limit(uuid,text),public.dm_pwm_today_runs(uuid),
  public.dm_plan_entitlement_refresh(),public.dm_plan_daily_perks() from public,anon,authenticated;
grant execute on function public.dm_plan(uuid,text),public.dm_plan_limits(text),public.dm_plan_limit(uuid,text),public.dm_pwm_today_runs(uuid) to service_role;

-- Mevcut öğrencilerin kapasitesi yeni kurala göre hesaplansın (herkes Free: 25).
update public.students set energy_max=energy_max;
commit;
