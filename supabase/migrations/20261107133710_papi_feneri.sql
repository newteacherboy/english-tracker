begin;

-- Extend the live arcade and reward functions without replacing unrelated rules.
create function pg_temp.dm_fener_patch(signature regprocedure, old_text text, new_text text)
returns void language plpgsql as $$
declare definition text := pg_get_functiondef(signature);
begin
 if strpos(definition, new_text)>0 then return; end if;
 if strpos(definition, old_text)=0 then
  raise exception 'Unexpected definition for %', signature;
 end if;
 execute replace(definition, old_text, new_text);
end $$;

select pg_temp.dm_fener_patch(
 'public.dm_arcade_verified_start(uuid,text,text,integer,integer[],integer,jsonb)',
 $old$'canavar','kule'$old$, $new$'canavar','kule','fener'$new$
);
select pg_temp.dm_fener_patch(
 'public.dm_arcade_verified_start(uuid,text,text,integer,integer[],integer,jsonb)',
 $old$CASE WHEN game_code='canavar' THEN 20 ELSE 35 END$old$,
 $new$CASE game_code WHEN 'fener' THEN 11 WHEN 'canavar' THEN 20 ELSE 35 END$new$
);
select pg_temp.dm_fener_patch(
 'public.dm_game_reward_claim(uuid,text,text,integer,integer[],integer,integer,numeric,boolean,integer,integer)',
 $old$'canavar','kule'$old$, $new$'canavar','kule','fener'$new$
);
select pg_temp.dm_fener_patch(
 'public.dm_solo_fair_claim(uuid,text,text,integer,integer[],integer,integer,numeric,integer)',
 $old$'canavar','kule'$old$, $new$'canavar','kule','fener'$new$
);
select pg_temp.dm_fener_patch(
 'public.dm_solo_fair_percent(text,integer,integer)',
 $old$'canavar','kule'$old$, $new$'canavar','kule','fener'$new$
);
select pg_temp.dm_fener_patch(
 'public.dm_reward_limits(text)', $old$('bosluk',69,12)$old$, $new$('fener',69,12), ('bosluk',69,12)$new$
);

drop function pg_temp.dm_fener_patch(regprocedure,text,text);
commit;
