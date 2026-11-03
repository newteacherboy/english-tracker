-- Persistent level advancement guarded by prior authorized game session.
ALTER TABLE public.dm_premium_match_usage ADD COLUMN IF NOT EXISTS level_no integer NOT NULL DEFAULT 1 CHECK (level_no BETWEEN 1 AND 300);
ALTER TABLE public.dm_premium_match_runs ADD COLUMN IF NOT EXISTS completed_at timestamptz, ADD COLUMN IF NOT EXISTS score integer, ADD COLUMN IF NOT EXISTS level_no integer;
CREATE OR REPLACE FUNCTION public.dm_premium_match_complete(p_student uuid,p_run uuid,p_level integer,p_score integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE current_level integer;run_row record;threshold integer;
BEGIN
 IF p_student IS NULL OR p_run IS NULL OR p_level IS NULL OR p_score IS NULL THEN RAISE EXCEPTION 'invalid_args' USING errcode='22023'; END IF;
 INSERT INTO public.dm_premium_match_usage(student_id,free_used,level_no) VALUES(p_student,0,1) ON CONFLICT(student_id) DO NOTHING;
 SELECT level_no INTO current_level FROM public.dm_premium_match_usage WHERE student_id=p_student FOR UPDATE;
 SELECT * INTO run_row FROM public.dm_premium_match_runs WHERE student_id=p_student AND run_id=p_run FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'message','Oyun oturumu bulunamadı.','level',current_level); END IF;
 IF run_row.completed_at IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'unlocked',true,'level',current_level,'replayed',true); END IF;
 IF p_level<>current_level OR p_score<0 OR p_score>100000 THEN RETURN jsonb_build_object('ok',false,'level',current_level,'message','Seviye veya puan geçersiz.'); END IF;
 threshold:=least(3000,1200+(current_level-1)*150);
 IF p_score<threshold THEN RETURN jsonb_build_object('ok',false,'level',current_level,'target',threshold,'message','Hedef puana ulaşılmadı.'); END IF;
 UPDATE public.dm_premium_match_runs SET completed_at=now(),score=p_score,level_no=p_level WHERE student_id=p_student AND run_id=p_run AND completed_at IS NULL;
 UPDATE public.dm_premium_match_usage SET level_no=least(300,level_no+1),updated_at=now() WHERE student_id=p_student;
 RETURN jsonb_build_object('ok',true,'unlocked',true,'level',least(300,current_level+1),'target',threshold);
END;$$;
REVOKE ALL ON FUNCTION public.dm_premium_match_complete(uuid,uuid,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dm_premium_match_complete(uuid,uuid,integer,integer) TO service_role;