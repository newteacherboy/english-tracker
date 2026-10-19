-- Okul parkuru: Kelime durakları + Kalıp durakları
--
-- 1) Durak sayımı artık extra.type='pattern' satırlarını saymıyor. Kalıplar kelime kartı olarak
--    sorulmuyordu zaten doğru değildi; bu sayım onları duraklardan da çıkarır (874 -> 852).
--    Durak sayısının AZALMASI güvenlidir: kapı tamamlama kolaylaşır, kimsenin kapısı kilitlenmez.
-- 2) Her 4 kelime durağından sonra bir Kalıp durağı eklenir (300000 bandı). Bu duraklar
--    kapı tamamlamasına (complete) DAHİL EDİLMEZ; oynanmamış olsa bile sonraki kapı açılır.
--    Böylece mevcut öğrencilerin ilerlemesi hiçbir şekilde geriye gitmez.
-- 3) Kalıp durağı yalnızca ünitede en az bir kalıp varsa oluşur.
create or replace function public.dm_progress_context(actor uuid)
 returns jsonb
 language plpgsql
 stable
 set search_path to ''
as $function$
declare v jsonb; l int; done jsonb; units jsonb:='[]'; comp jsonb:='[]';
 word_stops jsonb; group_stops jsonb; b int; n int; cnt int; prev boolean:=true;
 lessons jsonb:='{}'; ce text; ready boolean; ch jsonb:='{}'; cl int; cid text;
 feed boolean; preserved_done jsonb;
begin
 select value into v from public.extra_data where student_id=actor and key_name='yo';
 v:=coalesce(v,'{}');l:=public.dm_student_level(coalesce((v->>'totalXp')::numeric,0));
 select coalesce(jsonb_agg(distinct stop_no order by stop_no),'[]'::jsonb) into done
 from (
   select (x->>'stop')::int stop_no from dm_private.parkur_xp_seed() p
   cross join lateral jsonb_array_elements(p.completed_stops) x where p.student_id=actor
   union
   select c.level_no from public.level_completions c
   where c.student_id=actor and c.mode='buyu'
     and (c.level_no between 1000 and 1999
       or c.level_no between 210000 and 290000
       or c.level_no between 310000 and 390000)
 ) preserved;
 preserved_done:=done;
 for b in 0..3 loop
  /* Kelime durakları: kapı tamamlamasını belirleyen tek küme. */
  select coalesce(jsonb_agg(stop_no order by class_no,unit_no,part),'[]') into word_stops from (
   select c.class_no,c.unit_no,part,
          200000+c.class_no*10000+c.unit_no*100+50+part stop_no
   from (
    select class_no,unit_no,
           count(distinct lower(btrim(english)))
             filter (where coalesce(extra->>'type','word')<>'pattern') word_count
    from public.word_bank
    where active and class_no between b*2+1 and b*2+2 and unit_no>0
      and btrim(coalesce(english,''))<>'' and btrim(coalesce(turkish,''))<>''
    group by class_no,unit_no
   ) c cross join lateral generate_series(1,ceil(c.word_count/4.0)::int) part
   where c.word_count>0
  ) w;
  /* Kelime + Kalıp durakları, oynanma sırasına göre: w1 w2 w3 w4 P1 w5 ... */
  select coalesce(jsonb_agg(stop_no order by class_no,unit_no,part,kind),'[]') into group_stops from (
   select c.class_no,c.unit_no,part,0 kind,
          200000+c.class_no*10000+c.unit_no*100+50+part stop_no
   from (
    select class_no,unit_no,
           count(distinct lower(btrim(english)))
             filter (where coalesce(extra->>'type','word')<>'pattern') word_count,
           count(*) filter (where extra->>'type'='pattern') pattern_count
    from public.word_bank
    where active and class_no between b*2+1 and b*2+2 and unit_no>0
      and btrim(coalesce(english,''))<>'' and btrim(coalesce(turkish,''))<>''
    group by class_no,unit_no
   ) c cross join lateral generate_series(1,ceil(c.word_count/4.0)::int) part
   where c.word_count>0
   union all
   select c.class_no,c.unit_no,grp*4 part,1 kind,
          300000+c.class_no*10000+c.unit_no*100+50+grp stop_no
   from (
    select class_no,unit_no,
           count(distinct lower(btrim(english)))
             filter (where coalesce(extra->>'type','word')<>'pattern') word_count,
           count(*) filter (where extra->>'type'='pattern') pattern_count
    from public.word_bank
    where active and class_no between b*2+1 and b*2+2 and unit_no>0
      and btrim(coalesce(english,''))<>'' and btrim(coalesce(turkish,''))<>''
    group by class_no,unit_no
   ) c cross join lateral generate_series(1,ceil(ceil(c.word_count/4.0)/4.0)::int) grp
   where c.word_count>0 and c.pattern_count>0
  ) sections;
  /* Eski 8'erli seviyelerden taşıma: yalnızca kelime durakları için anlamlı. */
  select coalesce(jsonb_agg(distinct stop_no order by stop_no),'[]') into done from (
   select (x.value)::text::int stop_no from jsonb_array_elements(done) x
   union select (x.value)::text::int from jsonb_array_elements(word_stops) x
   where preserved_done @> jsonb_build_array(((x.value)::text::int/100)*100+(((x.value)::text::int%100-51)/3)+1)
      or (((x.value)::text::int%100) between 51 and 53
          and preserved_done @> jsonb_build_array(1000+(((x.value)::text::int-200000)/10000)*100+(((x.value)::text::int-200000)%10000)/100))
  ) expanded;
  units:=units||jsonb_build_array(group_stops);
  n:=jsonb_array_length(word_stops);
  select count(*) into cnt from jsonb_array_elements(word_stops) x where done @> jsonb_build_array(x);
  comp:=comp||jsonb_build_array(n>0 and cnt=n);
 end loop;
 feed:=jsonb_array_length(units->0)>=2 and done @> jsonb_build_array(units#>'{0,0}',units#>'{0,1}');
 foreach ce in array array['A1','A2','B1','B2'] loop
  lessons:=jsonb_set(lessons,array[ce],to_jsonb(prev));
  select exists(select 1 from public.lesson_topics where active and upper(level)=ce)
     and not exists(select 1 from public.lesson_topics t where t.active and upper(t.level)=ce
       and not exists(select 1 from public.lesson_progress p where p.student_id=actor
         and upper(p.level)=ce and p.category=t.category and p.topic_name=t.topic_name and p.test_success))
   into prev;
 end loop;
 for b in 0..4 loop
  cid:=(array['bronze','silver','gold','crystal','legend'])[b+1];
  cl:=(array[5,14,24,34,40])[b+1];ready:=l>=cl;
  if b=0 then ready:=ready and jsonb_array_length(units->0)>=3 and done @> jsonb_build_array(units#>'{0,0}',units#>'{0,1}',units#>'{0,2}');
  elsif b=1 then select count(*) into cnt from jsonb_array_elements(units->0) x where done @> jsonb_build_array(x);
   ready:=ready and cnt>=ceil(jsonb_array_length(units->0)/2.0) and cnt>0;
  else for n in 0..b-1 loop ready:=ready and (comp->>n)::boolean;end loop;
  end if;
  ch:=jsonb_set(ch,array[cid],to_jsonb(case
    when exists(select 1 from public.dm_progress_rewards where student_id=actor and kind='chest' and reward_key=cid) then 'claimed'
    when ready then 'ready' else 'locked' end));
 end loop;
 return jsonb_build_object('level',l,'feed',feed,'done',done,'units',units,'complete',comp,
   'lessons',lessons,'chests',ch,'owned',coalesce(v#>'{karakter,sahip}','[]'),'yo',v);
end $function$;
