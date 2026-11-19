create or replace function dm_private.progress_wb_refresh()
returns void language plpgsql security definer set search_path to '' as $f$
begin
 perform pg_advisory_xact_lock(hashtext('dm_progress_wb_cache'));
 delete from dm_private.progress_wb_units where true;
 insert into dm_private.progress_wb_units(class_no,unit_no,parts)
  select class_no,unit_no,ceil(count(distinct lower(btrim(english)))/4.0)::int from public.word_bank where active and class_no is not null and unit_no is not null group by class_no,unit_no;
 delete from dm_private.progress_wb_groups where true;
 insert into dm_private.progress_wb_groups(grp,group_stops)
  select b,(select coalesce(jsonb_agg(stop_no order by class_no, mixed, unit_no, part),'[]') from (
   select w.class_no,w.unit_no,part,part>ceil(w.word_count/4.0)::int mixed,200000+w.class_no*10000+w.unit_no*100+50+part stop_no from (
    select class_no,unit_no,count(distinct lower(btrim(english))) word_count
    from public.word_bank where active and class_no between b*2+1 and b*2+2 and unit_no>0 and btrim(coalesce(english,''))<>'' and btrim(coalesce(turkish,''))<>'' group by class_no,unit_no
   ) w cross join lateral generate_series(1,ceil(w.word_count/4.0)::int * case when w.class_no in (1,3,7,8) then 2 else 1 end) part
    where not (w.word_count>1 and w.word_count%4=1 and part=ceil(w.word_count/4.0)::int)
  ) sections) from generate_series(0,3) b;

end $f$;
revoke all on function dm_private.progress_wb_refresh() from public, anon, authenticated;
grant execute on function dm_private.progress_wb_refresh() to service_role;


select dm_private.progress_wb_refresh();
