CREATE OR REPLACE FUNCTION public.dm_duel_inbox(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.students; d public.dm_live_duels;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false); end if;
 if not public.dm_social_allowed(s.id,'duels') then return jsonb_build_object('ok',true); end if;
 select x.* into d from public.dm_live_duels x where x.status='searching' and x.kind='live' and x.created_at>now()-interval '15 seconds' and x.host_id<>s.id and (x.target_id is null or x.target_id=s.id) and (x.hold_until is null or x.hold_until<=now()) and not public.dm_blocked(x.host_id,s.id) and public.dm_social_allowed(x.host_id,'duels') order by (x.target_id is not null) desc,x.created_at desc limit 1;
 if d.id is null then return jsonb_build_object('ok',true); end if;
 return jsonb_build_object('ok',true,'offer',jsonb_build_object('id',d.id,'name',d.host_name,'level',d.host_level,'to',case when d.target_id is not null then s.username end,'leftMs',greatest(0,extract(epoch from (d.created_at+interval '15 seconds'-now()))*1000)::int));
end $function$
;
revoke all on function public.dm_duel_inbox(text) from public;
grant execute on function public.dm_duel_inbox(text) to anon,authenticated,service_role;
