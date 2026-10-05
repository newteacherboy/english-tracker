create or replace function public.dm_game_reward_claim(actor uuid,run_key text,game text,class_id int,unit_ids int[],correct int,wrong int,seconds numeric,first_clear boolean default false,stars int default 1,boost int default 1) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v jsonb; previous public.dm_game_reward_runs; t timestamptz; n int; x int:=0;g int:=0;speed int;daily numeric;fac int;ver bigint;day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');reason text:='awarded';deadline timestamptz;
begin
 if game is null or class_id is null or unit_ids is null or correct is null or wrong is null or seconds is null or run_key is null or length(run_key) not between 8 and 100 or game not in ('ky','jp','bosluk','hafiza','yagmur','asmaca','kelimebul','eslestirme','tren','dikte','cumle','harfbahcesi','kp','ba') or class_id not between 0 and 12 or cardinality(unit_ids) not between 1 and 20 or exists(select 1 from unnest(unit_ids) u where u is null or u not between 0 and 100) or correct not between 0 and (case when game='ba' then 32 else 8 end) or wrong not between 0 and 10000 or seconds<=0 or seconds>86400 then raise exception 'Geçersiz oyun sonucu';end if;
 perform 1 from public.students where id=actor for update;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;if v is null then raise exception 'Öğrenci verisi gerekli';end if;
 select * into previous from public.dm_game_reward_runs where student_id=actor and run_id=run_key;
 if found then return jsonb_build_object('ok',true,'duplicate',true,'xp',previous.xp,'gold',previous.gold,'reason','duplicate','yo',v);end if;
 select max(created_at)+interval '24 hours' into deadline from public.dm_game_reward_runs where student_id=actor and game_key=game and class_no=class_id and units&&unit_ids and xp>0 and created_at>now()-interval '24 hours';
 if deadline is null then
  select max(created_at)+interval '24 hours' into deadline from public.game_scores where student_id=actor and game_key=case game when 'ky' then 'kelime' when 'jp' then 'jeopardy' when 'kp' then 'konusma' else game end and class_no=class_id and coalesce(unit_no,0)=any(unit_ids) and correct_count>0 and created_at>now()-interval '24 hours' and coalesce(extra->>'reward_protocol','')<>'1';
 end if;
 if correct=0 then reason:='no_correct';elsif deadline is not null then reason:='cooldown';else
  if game='ba' then x:=case when first_clear and not exists(select 1 from public.dm_game_reward_runs where student_id=actor and game_key='ba' and class_no=class_id and units&&unit_ids and xp>0) then (array[42,48,60])[greatest(1,least(3,stars))] else 12 end;
  else
   select count(*)+1 into n from public.dm_game_reward_runs where student_id=actor and game_key<>'ba' and xp>0 and to_char(created_at at time zone 'Europe/Istanbul','YYYY-MM-DD')=day;
   daily:=case when n<=3 then 2 when n>12 then .5 else 1 end;
   fac:=case when public.dm_student_level(coalesce((v->>'totalXp')::numeric,0))>=15 and boost in (2,3) then 2 else 1 end;
   speed:=round(correct*600/(1+seconds/correct));x:=round(least(96,greatest(0,correct*6+floor(speed/100.0)-wrong*3))*daily*fac);
   g:=case when x=0 then 0 else round((array[4,7,10])[case when correct::numeric/(correct+wrong)>=.8 then 3 when correct::numeric/(correct+wrong)>=.5 then 2 else 1 end]*daily*case when public.dm_student_level(coalesce((v->>'totalXp')::numeric,0))>=15 and boost in (2,4) then 2 else 1 end) end;
  end if;
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
end $$;
create index if not exists dm_game_reward_cooldown_idx on public.dm_game_reward_runs(student_id,game_key,class_no,created_at desc);
