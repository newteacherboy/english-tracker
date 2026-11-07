-- This legacy text collector is not used by the current application.
-- RLS cannot protect writes made through its SECURITY DEFINER owner.
-- Keep service-side maintenance available; remove browser/public execution.
do $audit$
begin
 if to_regprocedure('public.ses_metni_bildir(text,text)') is not null then
  revoke all on function public.ses_metni_bildir(text,text) from public, anon, authenticated;
  grant execute on function public.ses_metni_bildir(text,text) to service_role;
 end if;
end;
$audit$;
