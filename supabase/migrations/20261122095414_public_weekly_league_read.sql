CREATE OR REPLACE FUNCTION public.dm_read_public_weekly_league(p_t text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor public.students;
  control public.dm_social_controls;
  standings jsonb;
begin
  actor := dm_private.rpc_ogrenci(p_t, '');
  if actor.id is null then
    return jsonb_build_object('fallback', true);
  end if;

  select * into control from public.dm_social_controls where student_id = actor.id;
  if not dm_private.sosyal_izin(control, 'social') then
    return jsonb_build_object('fallback', true);
  end if;

  select coalesce(jsonb_agg(entry.value order by entry.position), '[]'::jsonb)
  into standings
  from jsonb_array_elements(public.dm_progress_league()) with ordinality as entry(value, position)
  join public.students student on student.id = (entry.value->>'id')::uuid
  left join public.dm_social_controls visibility on visibility.student_id = student.id
  where student.frozen_at is null
    and dm_private.sosyal_izin(visibility, 'profile');

  return jsonb_build_object('data', jsonb_build_object('ok', true, 'liste', standings));
end
$function$;

revoke all on function public.dm_read_public_weekly_league(text) from public;
grant execute on function public.dm_read_public_weekly_league(text) to anon, authenticated, service_role;
