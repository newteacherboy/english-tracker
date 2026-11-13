CREATE OR REPLACE FUNCTION public.dm_virtual_duel_start(p_token text, p_bot smallint, p_game text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.students; tries integer; plan text; grade integer; needed integer;
 w record; distractors text[]; opts text[]; qs jsonb:='[]'::jsonb; n integer:=0;
 this_id uuid; this_bot integer; this_difficulty text; active_id uuid;
begin
 s:=dm_private.rpc_ogrenci(p_token,'');
 if s.id is null then return jsonb_build_object('ok',false,'message','Oturum gerekli.'); end if;
 perform 1 from public.students where id=s.id for update;
 if not exists(select 1 from public.dm_virtual_league_rivals where bot_id=p_bot and active) then return jsonb_build_object('ok',false,'message','Rakip bulunamadı.'); end if;
 select coalesce((e.value->>'totalXp')::numeric,0) into grade from public.extra_data e where e.student_id=s.id and e.key_name='yo';
 needed:=case p_game when 'kelime' then 3 when 'hafiza' then 6 when 'bosluk' then 11 when 'asmaca' then 14 when 'jeopardy' then 22 when 'yagmur' then 28 else 999 end;
 if needed=999 then return jsonb_build_object('ok',false,'message','Geçerli düello oyunu seç.'); end if;
 if public.dm_student_level(coalesce(grade,0))<greatest(5,needed) and not public.dm_level_early_access(s.id) then return jsonb_build_object('ok',false,'message','Bu oyun henüz seviyende açılmadı.'); end if;
 select count(*) into tries from public.dm_virtual_duel_runs where student_id=s.id;
 plan:=public.dm_plan(s.id,'student');
 if tries>=2 and plan='free' then return jsonb_build_object('ok',false,'paywall',true,'message','İki ücretsiz düello hakkın tamamlandı.'); end if;
 if tries>=2 and plan='pro' and (select count(*) from public.dm_virtual_duel_runs where student_id=s.id and created_at>=date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul')>=5 then
  return jsonb_build_object('ok',false,'paywall',true,'message','Pro günlük düello hakkın tamamlandı.'); end if;
 -- An unfinished duel is resumed rather than consuming another play.
 select id into active_id from public.dm_virtual_duel_runs where student_id=s.id and completed_at is null order by created_at desc limit 1;
 if active_id is not null then
  return jsonb_build_object('ok',false,'resume',true,'message','Önce başladığın düelloyu tamamla.'); end if;
 grade:=greatest(1,least(8,coalesce(s.selected_class,s.class_no,5)));
 for w in select english,turkish from public.word_bank
    where active is true and class_no<=grade and nullif(btrim(english),'') is not null and nullif(btrim(turkish),'') is not null
    order by random() limit 6 loop
  select array_agg(d.turkish) into distractors from (
    select turkish from (select distinct turkish from public.word_bank where active is true and class_no<=grade and turkish<>w.turkish and nullif(btrim(turkish),'') is not null) src order by random() limit 2
  ) d;
  if coalesce(array_length(distractors,1),0)<2 then continue; end if;
  select array_agg(v order by random()) into opts from unnest(array[w.turkish,distractors[1],distractors[2]]) v;
  qs:=qs||jsonb_build_array(jsonb_build_object('english',w.english,'options',to_jsonb(opts),'correct',array_position(opts,w.turkish)-1));
  n:=n+1;
 end loop;
 if n<>6 then return jsonb_build_object('ok',false,'message','Düello soruları hazırlanamadı.'); end if;
 this_difficulty:=case when tries=0 then 'easy' else 'hard' end;
 this_bot:=case when this_difficulty='easy' then 2 else 4 end;
 insert into public.dm_virtual_duel_runs(student_id,bot_id,game_key,attempt_no,difficulty,questions,bot_score)
 values(s.id,p_bot,p_game,tries+1,this_difficulty,qs,this_bot) returning id into this_id;
 return jsonb_build_object('ok',true,'runId',this_id,'difficulty',this_difficulty,'attempt',tries+1,'remaining',greatest(0,1-tries),
 'game',p_game,'total',6,'question',jsonb_build_object('english',qs->0->>'english','options',qs->0->'options'),'botScore',0,'yourScore',0,'step',0);
end $function$
;
