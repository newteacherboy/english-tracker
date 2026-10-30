-- New games reuse the current multiple-choice solo reward policy; existing rules are unchanged.
CREATE OR REPLACE FUNCTION public.dm_game_reward_claim(actor uuid, run_key text, game text, class_id integer, unit_ids integer[], correct integer, wrong integer, seconds numeric, first_clear boolean DEFAULT false, stars integer DEFAULT 1, boost integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v jsonb; previous public.dm_game_reward_runs; t timestamptz; n int; x int:=0;g int:=0;speed int;daily numeric;fac int;ver bigint;day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');reason text:='awarded';deadline timestamptz; payout jsonb;
begin
 if game is null or class_id is null or unit_ids is null or correct is null or wrong is null or seconds is null or run_key is null or length(run_key) not between 8 and 100 or game not in ('ky','jp','bosluk','hafiza','yagmur','asmaca','kelimebul','eslestirme','tren','dikte','cumle','harfbahcesi','canavar','kule','kp','ba') or class_id not between 0 and 12 or cardinality(unit_ids) not between 1 and 20 or exists(select 1 from unnest(unit_ids) u where u is null or u not between 0 and (case when game='ba' then 300000 else 100 end)) or correct not between 0 and (case when game='ba' then 32 else 12 end) or wrong not between 0 and 10000 or seconds<=0 or seconds>86400 then raise exception 'Geçersiz oyun sonucu';end if;
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
  -- Game-specific ceilings are below the route reward, including daily/paid boosts.
  if correct=0 then reason:='no_correct';else
   select count(*)+1 into n from public.dm_game_reward_runs where student_id=actor and game_key<>'ba' and game_key not like 'konu:%' and xp>0 and to_char(created_at at time zone 'Europe/Istanbul','YYYY-MM-DD')=day;
   daily:=case when n<=3 then 2 when n>12 then .5 else 1 end;
   fac:=case when public.dm_student_level(coalesce((v->>'totalXp')::numeric,0))>=15 and boost in (2,3) then 2 else 1 end;
   speed:=round(correct*600/(1+seconds/correct));
   payout:=public.dm_ranked_game_reward(game,
    greatest(0,correct*6+floor(speed/100.0)-wrong*3),
    (array[4,7,10])[case when correct::numeric/(correct+wrong)>=.8 then 3 when correct::numeric/(correct+wrong)>=.5 then 2 else 1 end],daily,fac,
    case when public.dm_student_level(coalesce((v->>'totalXp')::numeric,0))>=15 and boost in (2,4) then 2 else 1 end);
   x:=(payout->>'xp')::int;g:=(payout->>'gold')::int;
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

CREATE OR REPLACE FUNCTION public.dm_solo_fair_claim(actor uuid, run_key text, game_code text, class_id integer, unit_ids integer[], right_count integer, wrong_count integer, duration_seconds numeric, boost_factor integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare earlier public.dm_game_reward_runs; raw jsonb; v jsonb;
 percentage integer; base_x int; base_g int; reduced_x int; reduced_g int; earned_x int:=0;earned_g int:=0;
 ver bigint; day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
 if actor is null or run_key is null or length(run_key) not between 8 and 100
 or game_code not in ('ky','jp','bosluk','hafiza','yagmur','asmaca','kelimebul','eslestirme',
  'tren','dikte','cumle','harfbahcesi','canavar','kule','kp')
 or class_id not between 0 and 12 or cardinality(unit_ids) not between 1 and 20
 or exists(select 1 from unnest(unit_ids) x where x is null or x not between 0 and 100)
 or duration_seconds is null or duration_seconds<=0 or duration_seconds>86400
 or right_count not between 0 and 12 or wrong_count not between 0 and 10000
 then raise exception 'Geçersiz adil oyun sonucu';end if;
 perform 1 from public.students where id=actor for update;
 select * into earlier from public.dm_game_reward_runs
 where student_id=actor and run_id=run_key for update;
 if found then
  select value into v from public.extra_data where student_id=actor and key_name='yo';
  return jsonb_build_object('ok',true,'duplicate',true,'reason','duplicate',
   'xp',earlier.xp,'gold',earlier.gold,'yo',v);
 end if;
 if exists(select 1 from public.dm_verified_runs where student_id=actor and run_id=run_key and ranking_only) then select value into v from public.extra_data where student_id=actor and key_name='yo';return jsonb_build_object('ok',true,'xp',0,'gold',0,'reason','ranking_only','yo',v);end if;
 percentage:=public.dm_solo_fair_percent(game_code,right_count,wrong_count);
 raw:=public.dm_game_reward_claim(actor,run_key,game_code,class_id,unit_ids,
    right_count,wrong_count,duration_seconds,false,1,
    case when boost_factor in (2,3,4) then boost_factor else 1 end);
 if not coalesce((raw->>'ok')::boolean,false) then raise exception 'Ödül doğrulanamadı';end if;
 if coalesce((raw->>'duplicate')::boolean,false) then return raw;end if;
 base_x:=coalesce((raw->>'xp')::int,0);base_g:=coalesce((raw->>'gold')::int,0);
 earned_x:=floor(base_x*percentage/100.0)::int;
 earned_g:=floor(base_g*percentage/100.0)::int;
 reduced_x:=base_x-earned_x;
 reduced_g:=base_g-earned_g;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Öğrenci cüzdanı bulunamadı';end if;
 if reduced_x>0 or reduced_g>0 then
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,
   coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',greatest(0,coalesce((v->>'totalXp')::numeric,0)-reduced_x),
   'altin',greatest(0,coalesce((v->>'altin')::numeric,0)-reduced_g),
   'guncelleme',ver,'dmRewardVersion',ver);
  if v#>>'{xpGun,tarih}'=day then
   v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(greatest(0,coalesce((v#>>'{xpGun,xp}')::numeric,0)-reduced_x)));
  end if;
  v:=jsonb_set(v,array['log',day],to_jsonb(greatest(0,
   coalesce((v#>>array['log',day])::numeric,0)-reduced_x)),true);
  update public.extra_data set value=v,updated_at=now()
   where student_id=actor and key_name='yo';
  update public.students set gold=(v->>'altin')::numeric where id=actor;
  update public.dm_game_reward_runs set xp=base_x-reduced_x,gold=base_g-reduced_g
   where student_id=actor and run_id=run_key;
 end if;
 return raw||jsonb_build_object('xp',earned_x,'gold',earned_g,
  'yo',v,'reason',case when earned_x>0 or earned_g>0 then 'awarded' else 'no_correct' end,
  'fairPercent',percentage,'fairTier',case percentage
     when 100 then 'perfect' when 80 then 'high' when 60 then 'pass'
     when 35 then 'practice' else 'none' end);
end $function$;

CREATE OR REPLACE FUNCTION public.dm_solo_fair_percent(game_code text, right_count integer, wrong_count integer)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare effective_errors numeric; accuracy numeric;
begin
 if game_code not in ('ky','jp','bosluk','hafiza','yagmur','asmaca','kelimebul',
 'eslestirme','tren','dikte','cumle','harfbahcesi','canavar','kule','kp')
 or right_count not between 0 and 12 or wrong_count not between 0 and 10000
 then raise exception 'Geçersiz tek kişilik oyun skoru';end if;
 if right_count=0 then return 0;end if;
 -- Trying many cards in memory is not the same as answering a question wrong.
 effective_errors:=case
  when game_code in ('hafiza','eslestirme') then wrong_count*.40
  when game_code in ('asmaca','harfbahcesi','kelimebul') then wrong_count*.60
  else wrong_count::numeric end;
 accuracy:=right_count/(right_count+effective_errors);
 -- Short or prematurely-ended games may still earn something, but cannot
 -- receive the same premium as an accurate and complete performance.
 if right_count>=6 and accuracy>=.97 then return 100;end if;
 if right_count>=5 and accuracy>=.80 then return 80;end if;
 if right_count>=3 and accuracy>=.60 then return 60;end if;
 return 35;
end $function$;

CREATE OR REPLACE FUNCTION public.dm_reward_limits(game_code text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object('xp',r.xp,'gold',r.gold) from (values
('cumle',140,28),
('rota',136,27),
('dikte',132,26),
('tren',124,24),
('kp',116,22),
('ucus',112,21),
('ralli',108,20),
('bosluk',100,18),
('asmaca',92,16),
('kelimebul',84,14),
('harfbahcesi',76,12),
('jp',68,10),
('yagmur',60,9),
('ky',52,8),
('canavar',52,8),
('kule',52,8),
('eslestirme',44,7),
('hafiza',36,6),
('konu:sohbet',28,0),
('konu:durum',26,0),
('konu:balon',24,0),
('konu:dy',22,0),
('konu:cark',20,0),
('konu:kova',18,0)
 ) r(code,xp,gold) where r.code=game_code
$function$;
CREATE OR REPLACE FUNCTION public.dm_arcade_verified_start(actor uuid,run_key text,game_code text,cls integer,unit_ids integer[],stop_id integer,tasks jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $arcade$
DECLARE s public.students; result jsonb; ticks integer; available integer; old_run public.dm_verified_runs; xp numeric; required_level integer;
BEGIN
 IF game_code IS NULL OR game_code NOT IN ('canavar','kule') OR stop_id<>0 OR cls NOT BETWEEN 1 AND 8 OR cardinality(unit_ids)<>1 THEN RAISE EXCEPTION 'Geçersiz oyun kapsamı'; END IF;
 SELECT * INTO s FROM public.students WHERE id=actor AND status='approved' AND role='student' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Öğrenci oturumu gerekli'; END IF;
 SELECT coalesce((value->>'totalXp')::numeric,0) INTO xp FROM public.extra_data WHERE student_id=actor AND key_name='yo';
 required_level:=CASE WHEN game_code='canavar' THEN 20 ELSE 35 END;
 IF public.dm_student_level(coalesce(xp,0))<required_level THEN RAISE EXCEPTION 'Bu oyun %. seviyede açılır.',required_level; END IF;
 SELECT * INTO old_run FROM public.dm_verified_runs WHERE student_id=actor AND run_id=run_key;
 IF FOUND THEN
  IF old_run.ranking_only OR old_run.expires_at<now() THEN RAISE EXCEPTION 'Oyun oturumu sona erdi. Yeniden aç.'; END IF;
  result:=public.dm_verified_start(actor,run_key,game_code,cls,unit_ids,stop_id,tasks);
  RETURN result||jsonb_build_object('enerjiKalan',s.energy,'enerjiMax',25,'duplicate',true);
 END IF;
 -- Match the existing solo regeneration interval; lock and debit in the same transaction as session creation.
 ticks:=greatest(0,floor(extract(epoch FROM now()-coalesce(s.energy_updated_at,now()))/900));
 available:=least(25,coalesce(s.energy,0)+ticks);
 IF available<3 THEN RAISE EXCEPTION 'Oynamak için 3 enerji gerekli.'; END IF;
 result:=public.dm_verified_start(actor,run_key,game_code,cls,unit_ids,stop_id,tasks);
 UPDATE public.students SET energy=available-3,energy_updated_at=CASE WHEN available=25 THEN now() ELSE coalesce(s.energy_updated_at,now())+ticks*interval '15 minutes' END WHERE id=actor;
 IF available>coalesce(s.energy,0) THEN INSERT INTO public.energy_transactions(student_id,change_amount,balance_after,reason) VALUES(actor,available-coalesce(s.energy,0),available,'dolum'); END IF;
 INSERT INTO public.energy_transactions(student_id,change_amount,balance_after,reason) VALUES(actor,-3,available-3,game_code||':'||run_key);
 RETURN result||jsonb_build_object('enerjiKalan',available-3,'enerjiMax',25,'eklenen',-3);
END $arcade$;
REVOKE ALL ON FUNCTION public.dm_arcade_verified_start(uuid,text,text,integer,integer[],integer,jsonb) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dm_arcade_verified_start(uuid,text,text,integer,integer[],integer,jsonb) TO service_role;
