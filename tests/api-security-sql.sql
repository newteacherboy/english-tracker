-- Run after security migrations. Does not change real accounts.
begin;
do $qa$
declare k text:='diji-security-regression-fixture-20261017';r jsonb;
begin
 if has_function_privilege('anon','public.diji_veri_temizligi()','EXECUTE')
 or has_function_privilege('authenticated','public.diji_veri_temizligi()','EXECUTE')
 or not has_function_privilege('service_role','public.diji_veri_temizligi()','EXECUTE')
 then raise exception 'Privileged cleanup exposed';end if;
 if has_table_privilege('anon','public.word_bank','INSERT')
 or has_table_privilege('authenticated','public.word_bank','UPDATE')
 or not has_table_privilege('service_role','public.word_bank','SELECT')
 then raise exception 'Word bank permissions too broad';end if;
 if has_table_privilege('anon','public.dm_security_buckets','SELECT')
 or has_function_privilege('anon','public.dm_security_rate_check(text,integer,integer)','EXECUTE')
 then raise exception 'Rate limiter externally callable';end if;
 r:=public.dm_security_rate_check(k,2,60);if not (r->>'allowed')::boolean then raise exception 'First denied';end if;
 r:=public.dm_security_rate_check(k,2,60);if not (r->>'allowed')::boolean then raise exception 'Second denied';end if;
 r:=public.dm_security_rate_check(k,2,60);if (r->>'allowed')::boolean or (r->>'retryAfter')::int<=0 then raise exception 'Throttle bypass';end if;
end $qa$;
rollback;
