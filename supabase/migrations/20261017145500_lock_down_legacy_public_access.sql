-- Privilege least authority. Legacy cleanup must NEVER be callable by an anonymous web client.
begin;
revoke all on function public.diji_veri_temizligi() from public,anon,authenticated;
grant execute on function public.diji_veri_temizligi() to service_role;
-- Trigger functions do not need public EXECUTE permissions to fire.
revoke all on function public.dm_deliver_accessory() from public,anon,authenticated;
revoke all on function public.dm_keep_gifts() from public,anon,authenticated;
revoke all on function public.dm_pair_guard() from public,anon,authenticated;
-- The word bank is already delivered through authenticated Edge services.
-- No direct browser role needs to INSERT, UPDATE, TRUNCATE or DELETE its rows.
revoke all on table public.word_bank from anon,authenticated;
commit;
