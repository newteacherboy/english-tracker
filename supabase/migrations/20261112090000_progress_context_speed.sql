-- [Yük 12 Kas 2026] dm_progress_context hızlandırma
-- Ölçüm (pg_stat_statements): 92.707 çağrı x ortalama 133 ms = veritabanı süresinin en büyük kalemi.
-- 1) parkur_xp_seed() her çağrıda TÜM öğrencileri hesaplayıp sonra tek öğrenciyi süzüyordu;
--    parkur_xp_seed_for(actor) aynı mantığı yalnızca o öğrenci için çalıştırır.
-- 2) Kelime bankasından türeyen (öğrenciden bağımsız) durak listeleri her çağrıda yeniden
--    hesaplanıyordu; artık word_bank değiştiğinde tetikleyiciyle yenilenen iki küçük tabloda tutulur.
-- Çıktı birebir aynıdır (339 öğrenci + rastgele kimlikle karşılaştırıldı: 0 fark). 65 ms -> 9,7 ms.

create table if not exists dm_private.progress_wb_units(
  class_no int not null, unit_no int not null, parts int not null,
  primary key(class_no,unit_no));
create table if not exists dm_private.progress_wb_groups(
  grp int primary key, group_stops jsonb not null);
revoke all on dm_private.progress_wb_units, dm_private.progress_wb_groups from public, anon, authenticated;
grant select on dm_private.progress_wb_units, dm_private.progress_wb_groups to service_role;

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
  ) sections) from generate_series(0,3) b;

end $f$;
revoke all on function dm_private.progress_wb_refresh() from public, anon, authenticated;
grant execute on function dm_private.progress_wb_refresh() to service_role;

create or replace function dm_private.progress_wb_refresh_trg()
returns trigger language plpgsql security definer set search_path to '' as $f$
begin perform dm_private.progress_wb_refresh(); return null; end $f$;
revoke all on function dm_private.progress_wb_refresh_trg() from public, anon, authenticated;

drop trigger if exists dm_progress_wb_cache_refresh on public.word_bank;
create trigger dm_progress_wb_cache_refresh
 after insert or update or delete or truncate on public.word_bank
 for each statement execute function dm_private.progress_wb_refresh_trg();

select dm_private.progress_wb_refresh();

create or replace function dm_private.parkur_xp_seed_for(actor uuid)
returns table(student_id uuid, seed_xp integer, completed_stops jsonb)
language sql stable set search_path to '' as $f$
 with words as (
   select w.class_no,w.unit_no,
     row_number() over(order by w.class_no,w.unit_no,w.english,w.id) rn,
     count(*) over(partition by w.class_no,w.unit_no) unit_words
   from public.word_bank w
   where w.active and w.class_no between 1 and 8 and w.unit_no>0
     and coalesce(w.english,'')<>'' and coalesce(w.turkish,'')<>''
 ), units as (
   select distinct class_no,unit_no,1000+class_no*100+unit_no stop_no from words
 ), completions as (
   select distinct c.student_id,c.level_no,
     case when coalesce(e.value#>>array['baYildiz',c.level_no::text],'') ~ '^[0-9]+$'
       then least(3,greatest(1,(e.value#>>array['baYildiz',c.level_no::text])::numeric))::integer
       else 1 end stars
   from public.level_completions c
   left join public.extra_data e on e.student_id=c.student_id and e.key_name='yo'
   where c.mode='buyu' and c.student_id=actor
 ), old_units as (
   select c.student_id,1000+w.class_no*100+w.unit_no stop_no,max(c.stars) stars
   from completions c join words w on c.level_no=(w.rn-1)/8+1
   where c.level_no between 1 and 999
   group by c.student_id,w.class_no,w.unit_no
   having count(distinct w.rn)>=max(w.unit_words)::numeric/2
 ), candidate_stops as (
   select c.student_id,u.stop_no,c.stars from completions c join units u on u.stop_no=c.level_no
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

$f$;
revoke all on function dm_private.parkur_xp_seed_for(uuid) from public, anon, authenticated;
grant execute on function dm_private.parkur_xp_seed_for(uuid) to service_role;

create or replace function public.dm_progress_context(actor uuid)
 returns jsonb
 language plpgsql
 stable
 set search_path to ''
as $function$
declare v jsonb; l int; done jsonb; units jsonb:='[]'; comp jsonb:='[]'; group_stops jsonb; b int; n int; cnt int; prev boolean:=true; lessons jsonb:='{}'; ce text; ready boolean; ch jsonb:='{}'; cl int; cid text; feed boolean; preserved_done jsonb;
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
end

$function$;
