begin;

-- Game ceilings follow their unlock tiers, below the existing route ceiling.
create or replace function public.dm_reward_limits(game_code text)
returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('xp',r.xp,'gold',r.gold) from (values
  ('harfbahcesi',140,28),
  ('cumle',132,27),
  ('kule',129,26),
  ('tren',119,25),
  ('rota',116,24),
  ('kp',116,22),
  ('ucus',116,24),
  ('yagmur',111,23),
  ('kelimebul',108,22),
  ('dikte',101,20),
  ('jp',96,19),
  ('canavar',91,18),
  ('eslestirme',88,17),
  ('ralli',79,15),
  ('asmaca',76,14),
  ('bosluk',69,12),
  ('hafiza',58,9),
  ('ky',52,8),
  ('konu:sohbet',28,0),
  ('konu:durum',26,0),
  ('konu:balon',24,0),
  ('konu:dy',22,0),
  ('konu:cark',20,0),
  ('konu:kova',18,0)
 ) r(code,xp,gold) where r.code=game_code
$$;

-- Apply the adjustment after the existing performance, daily and booster ceilings.
create function public.dm_school_game_reward(payout jsonb,enrolled_grade integer,played_grade integer)
returns jsonb language sql immutable security invoker set search_path='' as $$
 select case when enrolled_grade between 1 and 12 and played_grade between 1 and 8 and played_grade<enrolled_grade
 then jsonb_build_object('xp',floor((payout->>'xp')::numeric*.75),'gold',floor((payout->>'gold')::numeric*.75))
 else payout end
$$;

revoke all on function public.dm_school_game_reward(jsonb,integer,integer) from public,anon,authenticated;
grant execute on function public.dm_school_game_reward(jsonb,integer,integer) to service_role;

-- Preserve the live ledger and replay guards while inserting the two grade adjustments.
create function pg_temp.dm_game_policy_patch(signature regprocedure,old_text text,new_text text)
returns void language plpgsql as $$
declare definition text := pg_get_functiondef(signature);
begin
 if strpos(definition,old_text)=0 or strpos(substr(definition,strpos(definition,old_text)+length(old_text)),old_text)>0 then
  raise exception 'Unexpected definition for %',signature;
 end if;
 execute replace(definition,old_text,new_text);
end $$;

select pg_temp.dm_game_policy_patch(
 'public.dm_game_reward_claim(uuid,text,text,integer,integer[],integer,integer,numeric,boolean,integer,integer)',
 'deadline timestamptz; payout jsonb;', 'deadline timestamptz; payout jsonb; enrolled_grade integer;'
);
select pg_temp.dm_game_policy_patch(
 'public.dm_game_reward_claim(uuid,text,text,integer,integer[],integer,integer,numeric,boolean,integer,integer)',
 'perform 1 from public.students where id=actor for update;',
 'select class_no into enrolled_grade from public.students where id=actor for update;'
);
select pg_temp.dm_game_policy_patch(
 'public.dm_game_reward_claim(uuid,text,text,integer,integer[],integer,integer,numeric,boolean,integer,integer)',
 $old$x:=(payout->>'xp')::int;g:=(payout->>'gold')::int;$old$,
 $new$if game<>'kp' then payout:=public.dm_school_game_reward(payout,enrolled_grade,class_id);end if;
   x:=(payout->>'xp')::int;g:=(payout->>'gold')::int;$new$
);
select pg_temp.dm_game_policy_patch(
 'public.dm_rally_finish(uuid,uuid)',
 $old$x:=(payout->>'xp')::int;g:=(payout->>'gold')::int;$old$,
 $new$payout:=public.dm_school_game_reward(payout,st.class_no,r.class_no);
  x:=(payout->>'xp')::int;g:=(payout->>'gold')::int;$new$
);

commit;
