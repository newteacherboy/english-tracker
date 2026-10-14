-- Transactional catalog, legacy progress and reward regression checks.
BEGIN;

DO $check$
DECLARE ctx jsonb; n int; expected int; oldstop int; mapped int; actor_id uuid; before_xp text; after_xp text;
BEGIN
 ctx:=public.dm_progress_context('00000000-0000-0000-0000-000000000000');
 SELECT sum(ceil(c/4.0)::int) INTO expected FROM (SELECT count(distinct lower(btrim(english))) c FROM public.word_bank WHERE active AND class_no between 1 and 8 AND unit_no>0 AND btrim(coalesce(english,''))<>'' AND btrim(coalesce(turkish,''))<>'' GROUP BY class_no,unit_no) w;
 SELECT count(*) INTO n FROM jsonb_array_elements(ctx->'units') door CROSS JOIN LATERAL jsonb_array_elements(door) x;
 IF n<>expected THEN RAISE EXCEPTION 'Four-word catalog mismatch: % vs %',n,expected;END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(ctx->'units') door CROSS JOIN LATERAL jsonb_array_elements(door) x WHERE ((x.value)::text::int%100)<51) THEN RAISE EXCEPTION 'New levels collide with legacy IDs';END IF;
 SELECT student_id,level_no INTO actor_id,oldstop FROM public.level_completions WHERE mode='buyu' AND level_no BETWEEN 210000 AND 289999 AND level_no%100 BETWEEN 1 AND 49 LIMIT 1;
 IF actor_id IS NOT NULL THEN
  SELECT value->>'totalXp' INTO before_xp FROM public.extra_data WHERE student_id=actor_id AND key_name='yo';
  ctx:=public.dm_progress_context(actor_id);mapped:=(oldstop/100)*100+50+(oldstop%100-1)*3+1;
  IF NOT ctx->'done' @> jsonb_build_array(mapped) THEN RAISE EXCEPTION 'Legacy completed level was lost';END IF;
  SELECT value->>'totalXp' INTO after_xp FROM public.extra_data WHERE student_id=actor_id AND key_name='yo';
  IF before_xp IS DISTINCT FROM after_xp THEN RAISE EXCEPTION 'Context changed wallet XP';END IF;
 END IF;
END $check$;


DO $reward_check$
DECLARE actor_id uuid; oldstop int; mapped int; result jsonb; got int[];
BEGIN
 SELECT array_agg(p+50 ORDER BY p) INTO got FROM generate_series(1,6) p WHERE array[210102] @> array[210100+(p-1)/3+1];
 IF got<>array[54,55,56] THEN RAISE EXCEPTION 'Non-prefix legacy mapping leaked to another group';END IF;
 SELECT r.student_id,u INTO actor_id,oldstop FROM public.dm_game_reward_runs r CROSS JOIN LATERAL unnest(r.units) u JOIN public.extra_data e ON e.student_id=r.student_id AND e.key_name='yo' WHERE r.game_key='ba' AND r.xp>0 AND u BETWEEN 210000 AND 289999 AND u%100 BETWEEN 1 AND 49 LIMIT 1;
 IF actor_id IS NOT NULL THEN
  mapped:=(oldstop/100)*100+50+(oldstop%100-1)*3+1;
  result:=public.dm_game_reward_claim(actor_id,'four-word-verify-'||gen_random_uuid()::text,'ba',(oldstop-200000)/10000,array[mapped],12,0,120);
  IF (result->>'xp')::int<>0 OR (result->>'gold')::int<>0 OR result->>'reason'<>'already_completed' THEN RAISE EXCEPTION 'Inherited level paid rewards again';END IF;
 END IF;
END $reward_check$;
ROLLBACK;
