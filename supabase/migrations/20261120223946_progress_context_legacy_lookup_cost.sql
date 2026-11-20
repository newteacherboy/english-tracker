-- Keep the existing RPC signatures and privileges. Both reads use the same snapshot
-- as before so new lessons, rewards, and vocabulary changes are visible immediately.
set local lock_timeout = '2s';
set local statement_timeout = '15s';

-- Only eight-word legacy chunks need the global word order. Unit completions
-- can look up the original active vocabulary predicates by class and unit.
CREATE OR REPLACE FUNCTION dm_private.parkur_xp_seed_for(actor uuid)
 RETURNS TABLE(student_id uuid, seed_xp integer, completed_stops jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 with completions as materialized (
   select distinct c.student_id,c.level_no,
     case when coalesce(e.value#>>array['baYildiz',c.level_no::text],'') ~ '^[0-9]+$'
       then least(3,greatest(1,(e.value#>>array['baYildiz',c.level_no::text])::numeric))::integer
       else 1 end stars
   from public.level_completions c
   left join public.extra_data e on e.student_id=c.student_id and e.key_name='yo'
   where c.mode='buyu' and c.student_id=actor

 ), words as (
   select w.class_no,w.unit_no,
     row_number() over(order by w.class_no,w.unit_no,w.english,w.id) rn,
     count(*) over(partition by w.class_no,w.unit_no) unit_words
   from public.word_bank w
   where w.active and w.class_no between 1 and 8 and w.unit_no>0
     and coalesce(w.english,'')<>'' and coalesce(w.turkish,'')<>''

     and exists(select 1 from completions where level_no between 1 and 999)
 ), old_units as (
   select c.student_id,1000+w.class_no*100+w.unit_no stop_no,max(c.stars) stars
   from completions c join words w on c.level_no=(w.rn-1)/8+1
   where c.level_no between 1 and 999
   group by c.student_id,w.class_no,w.unit_no
   having count(distinct w.rn)>=max(w.unit_words)::numeric/2
 ), candidate_stops as (
   select c.student_id,c.level_no as stop_no,c.stars
   from completions c
   where exists (
     select 1
     from generate_series(1,8) as g(class_no)
     join public.word_bank w
       on w.class_no=g.class_no
      and w.unit_no=c.level_no::bigint-1000-g.class_no*100
     where w.active and w.unit_no>0
       and coalesce(w.english,'')<>'' and coalesce(w.turkish,'')<>''
   )
   union all select student_id,stop_no,stars from old_units
 ), stops as (
   select student_id,stop_no,max(stars) stars from candidate_stops group by student_id,stop_no
 ), totals as (
   select student_id,sum(case stars when 3 then 60 when 2 then 48 else 42 end)::integer seed_xp,
     jsonb_agg(jsonb_build_object('stop',stop_no,'stars',stars,'xp',case stars when 3 then 60 when 2 then 48 else 42 end) order by stop_no) completed_stops
   from stops group by student_id
 )
 select s.id,coalesce(t.seed_xp,0),coalesce(t.completed_stops,'[]'::jsonb)
 from public.students s left join totals t on t.student_id=s.id where s.role='student' and s.id=actor;

$function$;

-- Each access flag depends on completion of the preceding CEFR level.
-- Build the learner's successful-topic set once and keep empty levels locked.
CREATE OR REPLACE FUNCTION public.dm_progress_context(actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare v jsonb; l int; done jsonb; units jsonb:='[]'; comp jsonb:='[]'; group_stops jsonb; b int; n int; cnt int; lessons jsonb; ready boolean; ch jsonb:='{}'; cl int; cid text; feed boolean; preserved_done jsonb;
begin
 select value into v from public.extra_data where student_id=actor and key_name='yo';v:=coalesce(v,'{}');l:=public.dm_student_level(coalesce((v->>'totalXp')::numeric,0));
 select coalesce(jsonb_agg(distinct stop_no order by stop_no),'[]'::jsonb) into done
 from (
   select (x->>'stop')::int stop_no from dm_private.parkur_xp_seed_for(actor) p
   cross join lateral jsonb_array_elements(p.completed_stops) x
   union
   select c.level_no from public.level_completions c
   where c.student_id=actor and c.mode='buyu' and (c.level_no between 1000 and 1999 or c.level_no between 210000 and 290000)
 ) preserved;
 preserved_done:=done;
 for b in 0..3 loop
  select coalesce(g.group_stops,'[]') into group_stops from dm_private.progress_wb_groups g where g.grp=b;
  group_stops:=coalesce(group_stops,'[]');
  select coalesce(jsonb_agg(distinct stop_no order by stop_no),'[]') into done from (
   select (x.value)::text::int stop_no from jsonb_array_elements(done) x
   union select (x.value)::text::int from jsonb_array_elements(group_stops) x
   where (preserved_done @> jsonb_build_array(((x.value)::text::int/100)*100+(((x.value)::text::int%100-51)/3)+1) or (((x.value)::text::int%100) between 51 and 53 and preserved_done @> jsonb_build_array(1000+(((x.value)::text::int-200000)/10000)*100+(((x.value)::text::int-200000)%10000)/100)) ) and exists(select 1 from dm_private.progress_wb_units u where u.class_no=(((x.value)::text::int-200000)/10000) and u.unit_no=(((x.value)::text::int-200000)%10000)/100 and ((x.value)::text::int%100-50)<=u.parts)
  ) expanded;
  units:=units||jsonb_build_array(group_stops);n:=jsonb_array_length(group_stops);select count(*) into cnt from jsonb_array_elements(group_stops) x where done @> jsonb_build_array(x);
  comp:=comp||jsonb_build_array(n>0 and cnt=n);
 end loop;
 feed:=jsonb_array_length(units->0)>=2 and done @> jsonb_build_array(units#>'{0,0}',units#>'{0,1}');
 with successes as materialized (
  select upper(p.level) as level,p.category,p.topic_name
  from public.lesson_progress p
  where p.student_id=actor and p.test_success and upper(p.level) in ('A1','A2','B1')
 ), completion as (
  select upper(t.level) as level,bool_and(p.level is not null) as done
  from public.lesson_topics t
  left join (select distinct level,category,topic_name from successes) p
    on p.level=upper(t.level) and p.category=t.category and p.topic_name=t.topic_name
  where t.active and upper(t.level) in ('A1','A2','B1')
  group by upper(t.level)
 )
 select jsonb_build_object('A1',true,'A2',coalesce(bool_or(completion.done) filter(where level='A1'),false),
  'B1',coalesce(bool_or(completion.done) filter(where level='A2'),false),
  'B2',coalesce(bool_or(completion.done) filter(where level='B1'),false))
 into lessons from completion;
 for b in 0..4 loop
  cid:=(array['bronze','silver','gold','crystal','legend'])[b+1];cl:=(array[5,14,24,34,40])[b+1];ready:=l>=cl;
  if b=0 then ready:=ready and jsonb_array_length(units->0)>=3 and done @> jsonb_build_array(units#>'{0,0}',units#>'{0,1}',units#>'{0,2}');
  elsif b=1 then select count(*) into cnt from jsonb_array_elements(units->0) x where done @> jsonb_build_array(x);ready:=ready and cnt>=ceil(jsonb_array_length(units->0)/2.0) and cnt>0;
  else for n in 0..b-1 loop ready:=ready and (comp->>n)::boolean;end loop;
  end if;
  ch:=jsonb_set(ch,array[cid],to_jsonb(case when exists(select 1 from public.dm_progress_rewards where student_id=actor and kind='chest' and reward_key=cid) then 'claimed' when ready then 'ready' else 'locked' end));
 end loop;
 return jsonb_build_object('levelEarlyAccess',public.dm_level_early_access(actor),'level',l,'feed',feed,'done',done,'units',units,'complete',comp,'lessons',lessons,'chests',ch,'owned',coalesce(v#>'{karakter,sahip}','[]'),'yo',v);
end

$function$;
