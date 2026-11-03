-- Premium Kelime Eşleştirme: account-bound three free attempts with idempotent starts.
CREATE TABLE IF NOT EXISTS public.dm_premium_match_usage (
 student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
 free_used integer NOT NULL DEFAULT 0 CHECK (free_used BETWEEN 0 AND 3),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.dm_premium_match_runs (
 student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
 run_id uuid NOT NULL,
 premium boolean NOT NULL DEFAULT false,
 started_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (student_id, run_id)
);
CREATE INDEX IF NOT EXISTS dm_premium_match_runs_time ON public.dm_premium_match_runs(student_id, started_at DESC);
ALTER TABLE public.dm_premium_match_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_premium_match_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dm_premium_match_usage FROM anon, authenticated;
REVOKE ALL ON public.dm_premium_match_runs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.dm_premium_match_usage TO service_role;
GRANT SELECT, INSERT ON public.dm_premium_match_runs TO service_role;
CREATE OR REPLACE FUNCTION public.dm_premium_match_access(
 p_student uuid, p_run uuid DEFAULT NULL, p_check boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_used integer := 0; v_premium boolean := false; v_exists boolean := false;
BEGIN
 IF coalesce(current_setting('request.jwt.claim.role', true),'') <> 'service_role' THEN
   RAISE EXCEPTION 'not_authorized' USING errcode = '42501';
 END IF;
 IF p_student IS NULL THEN RAISE EXCEPTION 'student_required'; END IF;
 SELECT EXISTS (
   SELECT 1 FROM public.dm_entitlements e
   WHERE e.account_id=p_student AND e.account_role='student'
     AND e.state='active'
     AND e.product_key IN (
       'premium','premium_plus','premium_max',
       'diji_premium','diji_premium_plus','diji_premium_max','teacher_premium'
     )
     AND (e.valid_until IS NULL OR e.valid_until>now())
 ) INTO v_premium;
 IF p_check THEN
   SELECT u.free_used INTO v_used FROM public.dm_premium_match_usage u WHERE u.student_id=p_student;
   v_used:=coalesce(v_used,0);
   RETURN jsonb_build_object('allowed',v_premium OR v_used<3,'premium',v_premium,'freeUsed',v_used,'remaining',greatest(0,3-v_used));
 END IF;
 IF p_run IS NULL THEN RAISE EXCEPTION 'run_id_required'; END IF;
 INSERT INTO public.dm_premium_match_usage(student_id,free_used) VALUES(p_student,0)
   ON CONFLICT(student_id) DO NOTHING;
 SELECT u.free_used INTO v_used FROM public.dm_premium_match_usage u
   WHERE u.student_id=p_student FOR UPDATE;
 SELECT EXISTS(
  SELECT 1 FROM public.dm_premium_match_runs r
  WHERE r.student_id=p_student AND r.run_id=p_run
 ) INTO v_exists;
 IF v_exists THEN
   RETURN jsonb_build_object('allowed',true,'premium',v_premium,'freeUsed',v_used,'remaining',greatest(0,3-v_used),'replayed',true);
 END IF;
 IF NOT v_premium AND v_used>=3 THEN
   RETURN jsonb_build_object('allowed',false,'premium',false,'freeUsed',v_used,'remaining',0);
 END IF;
 INSERT INTO public.dm_premium_match_runs(student_id,run_id,premium)
   VALUES(p_student,p_run,v_premium);
 IF NOT v_premium THEN
   UPDATE public.dm_premium_match_usage
     SET free_used=free_used+1,updated_at=now() WHERE student_id=p_student;
   v_used:=v_used+1;
 END IF;
 RETURN jsonb_build_object('allowed',true,'premium',v_premium,'freeUsed',v_used,'remaining',greatest(0,3-v_used),'replayed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.dm_premium_match_access(uuid,uuid,boolean) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dm_premium_match_access(uuid,uuid,boolean) TO service_role;
