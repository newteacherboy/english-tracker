-- Preserve archived completed adventure stops in progression context.
-- Never delete or reopen previous completions; active word bank still defines playable new units.
create or replace function public.dm_progress_context(actor uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v jsonb; l int; done jsonb; units jsonb:='[]'; comp jsonb:='[]'; group_stops jsonb; b int; n int; cnt int; prev boolean:=true; lessons jsonb:='{}'; ce text; ready boolean; ch jsonb:='{}'; cl int; cid text; feed boolean;
begin
 select value into v from public.extra_data where student_id=actor and key_name='yo';v:=coalesce(v,'{}');l:=public.dm_student_level(coalesce((v->>'totalXp')::numeric,0));
 select coalesce(jsonb_agg(distinct stop_no order by stop_no),'[]'::jsonb) into done
 from (
   select (x->>'stop')::int stop_no from dm_private.parkur_xp_seed() p
   cross join lateral jsonb_array_elements(p.completed_stops) x where p.student_id=actor
   union
   select c.level_no from public.level_completions c
   where c.student_id=actor and c.mode='buyu' and c.level_no between 1000 and 1999
 ) preserved;
 for b in 0..3 loop
  select coalesce(jsonb_agg(stop_no order by stop_no),'[]') into group_stops from (select distinct 1000+class_no*100+unit_no stop_no from public.word_bank where active and class_no between b*2+1 and b*2+2 and unit_no>0 and coalesce(english,'')<>'' and coalesce(turkish,'')<>'') w;
  units:=units||jsonb_build_array(group_stops);n:=jsonb_array_length(group_stops);select count(*) into cnt from jsonb_array_elements(group_stops) x where done @> jsonb_build_array(x);
  comp:=comp||jsonb_build_array(n>0 and cnt=n);
 end loop;
 feed:=jsonb_array_length(units->0)>=2 and done @> jsonb_build_array(units#>'{0,0}',units#>'{0,1}');
 foreach ce in array array['A1','A2','B1','B2'] loop
  lessons:=jsonb_set(lessons,array[ce],to_jsonb(prev));
  select exists(select 1 from public.lesson_topics where active and upper(level)=ce) and not exists(select 1 from public.lesson_topics t where t.active and upper(t.level)=ce and not exists(select 1 from public.lesson_progress p where p.student_id=actor and upper(p.level)=ce and p.category=t.category and p.topic_name=t.topic_name and p.test_success)) into prev;
 end loop;
 for b in 0..4 loop
  cid:=(array['bronze','silver','gold','crystal','legend'])[b+1];cl:=(array[5,14,24,34,40])[b+1];ready:=l>=cl;
  if b=0 then ready:=ready and jsonb_array_length(units->0)>=3 and done @> jsonb_build_array(units#>'{0,0}',units#>'{0,1}',units#>'{0,2}');
  elsif b=1 then select count(*) into cnt from jsonb_array_elements(units->0) x where done @> jsonb_build_array(x);ready:=ready and cnt>=ceil(jsonb_array_length(units->0)/2.0) and cnt>0;
  else for n in 0..b-1 loop ready:=ready and (comp->>n)::boolean;end loop;
  end if;
  ch:=jsonb_set(ch,array[cid],to_jsonb(case when exists(select 1 from public.dm_progress_rewards where student_id=actor and kind='chest' and reward_key=cid) then 'claimed' when ready then 'ready' else 'locked' end));
 end loop;
 return jsonb_build_object('level',l,'feed',feed,'done',done,'units',units,'complete',comp,'lessons',lessons,'chests',ch,'owned',coalesce(v#>'{karakter,sahip}','[]'),'yo',v);
end $$;
