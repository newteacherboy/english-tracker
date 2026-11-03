-- Repair trusted Edge Function RPC authorization without weakening three-play enforcement.
-- Only the service_role retains EXECUTE on this privileged function.
DO $migration$
DECLARE ddl text;
DECLARE fixed text;
BEGIN
 SELECT pg_get_functiondef('public.dm_premium_match_access(uuid,uuid,boolean)'::regprocedure) INTO ddl;
 fixed := replace(
   ddl,
   E' if coalesce(current_setting(''request.jwt.claim.role'', true),'''') <> ''service_role'' then\n   raise exception ''not_authorized'' using errcode = ''42501'';\n end if;\n',
   ''
 );
 IF fixed = ddl THEN
   -- Already repaired or function implementation changed: do not replace unrelated code.
   RETURN;
 END IF;
 EXECUTE fixed;
END;
$migration$;
REVOKE ALL ON FUNCTION public.dm_premium_match_access(uuid,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dm_premium_match_access(uuid,uuid,boolean) TO service_role;