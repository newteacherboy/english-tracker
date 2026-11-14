-- Demo learning access follows real entitlements, just like ordinary accounts.
-- Preserve teacher preview rules and existing purchase/expiry checks.
begin;
CREATE OR REPLACE FUNCTION public.dm_plan(actor uuid, account_role text DEFAULT 'student'::text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select case
    when account_role='student' and exists(
      select 1 from public.teacher_portal_guests g
      join public.teacher_portal_access a on a.id=g.access_id and a.state='approved'
      join public.teachers t on t.id=a.teacher_id and t.active and t.frozen_at is null
      where g.student_id=actor and g.alias='Premium Oyun' and g.preview
        and t.is_admin and t.username='teacher'
    ) then 'premium_pro'
    when account_role='student' and exists(
      select 1 from public.teacher_portal_guests g
      join public.teacher_portal_access a on a.id=g.access_id and a.state='approved'
      join public.teachers t on t.id=a.teacher_id and t.active and t.frozen_at is null
      where g.student_id=actor and g.alias='Premium Oyun' and g.preview
    ) then (
      select public.dm_plan(a.teacher_id,'teacher')
      from public.teacher_portal_guests g
      join public.teacher_portal_access a on a.id=g.access_id
      where g.student_id=actor and g.alias='Premium Oyun' and g.preview
      limit 1
    )
    when exists(select 1 from public.dm_entitlements e
      where e.account_id=actor and e.account_role=dm_plan.account_role and e.state='active'
        and (e.valid_until is null or e.valid_until>now())
        and e.product_key = any(case when dm_plan.account_role='teacher'
          then array['teacher_premium_pro']
          else array['diji_premium_pro','premium','premium_plus','premium_max',
            'diji_premium','diji_premium_plus','diji_premium_max'] end))
      then 'premium_pro'
    when exists(select 1 from public.dm_entitlements e
      where e.account_id=actor and e.account_role=dm_plan.account_role and e.state='active'
        and (e.valid_until is null or e.valid_until>now())
        and e.product_key=case when dm_plan.account_role='teacher' then 'teacher_pro' else 'diji_pro' end)
      then 'pro'
    else 'free'
  end
$function$;
commit;
