-- Metadata-only assertions: no student rows or account changes.
begin;
do $audit$
begin
 if has_function_privilege('anon','public.ses_metni_bildir(text,text)','execute')
 or has_function_privilege('authenticated','public.ses_metni_bildir(text,text)','execute')
 or not has_function_privilege('service_role','public.ses_metni_bildir(text,text)','execute')
 then raise exception 'Speech collector permission regression';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity)
 then raise exception 'Public application table without RLS';end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef and
   (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute')))
 then raise exception 'Publicly executable definer function';end if;
end;
$audit$;
rollback;
