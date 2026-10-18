-- Production-applied: gate the existing preparation jobs through central enabled flags.
-- Timing and legacy subscriber eligibility remain unchanged.
create or replace function public.dm_communication_mail_tick(rule_key text, kind text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare active_rule boolean; result_count integer;
begin
 if rule_key not in ('weekly_league_mail','monday_league_mail','three_day_mail') then
   raise exception 'Unsupported communication rule';
 end if;
 select enabled into active_rule from public.dm_communication_rules
  where key=rule_key and category='mail';
 if active_rule is distinct from true then return 0; end if;
 if rule_key='weekly_league_mail' then
  select public.dm_papi_league_mail_prepare('sunday') into result_count;
 elsif rule_key='monday_league_mail' then
  select public.dm_papi_league_mail_prepare('monday') into result_count;
 else
  select public.dm_papi_progress_queue() into result_count;
 end if;
 return coalesce(result_count,0);
end; $$;
revoke all on function public.dm_communication_mail_tick(text,text) from public,anon,authenticated;
select cron.schedule('dm-papi-league-sunday','0 16 * * 0',
 $cron$select public.dm_communication_mail_tick('weekly_league_mail');$cron$);
select cron.schedule('dm-papi-league-monday','0 9 * * 1',
 $cron$select public.dm_communication_mail_tick('monday_league_mail');$cron$);
select cron.schedule('dm-papi-progress-prepare','5 5 * * *',
 $cron$select public.dm_communication_mail_tick('three_day_mail');$cron$);
