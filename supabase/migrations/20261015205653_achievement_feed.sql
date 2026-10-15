-- New achievements are published from committed source rows, never from opening a screen.
create table public.dm_feed_awards (
 student_id uuid not null references public.students(id) on delete cascade,
 event_key text not null, created_at timestamptz not null default now(),
 primary key(student_id,event_key)
);
alter table public.dm_feed_awards enable row level security;
revoke all on public.dm_feed_awards from public,anon,authenticated;
grant all on public.dm_feed_awards to service_role;

create function public.dm_feed_publish(actor uuid,event_key text,kind text,message text,icon text,details jsonb default '{}')
returns void language plpgsql security invoker set search_path='' as $$
begin
 if actor is null or actor='dcde2026-1015-4000-8000-000000000001'::uuid or not exists(select 1 from public.students where id=actor and status='approved' and role='student') then return;end if;
 insert into public.dm_feed_awards values(actor,event_key,now()) on conflict do nothing;
 if not found then return;end if;
 insert into public.feed_events(student_id,event_type,payload) values(actor,kind,details||jsonb_build_object('message',message,'icon',icon));
end $$;

-- Same league rules as dm_progress_league, grouped once instead of a correlated query per student.
-- VOLATILE is intentional: AFTER triggers must see the source row just inserted.
create function public.dm_feed_rank(actor uuid) returns jsonb language sql volatile security invoker set search_path='' as $$
with bounds as (select date_trunc('week',now() at time zone 'Europe/Istanbul')::date w),
 scores as (select student_id,sum(greatest(0,correct_count*6+floor(coalesce((extra->>'speed')::numeric,0)/100)-wrong_count*3)) xp from public.game_scores,bounds where extra->>'v'='3' and correct_count>0 and created_at>=w::timestamp at time zone 'Europe/Istanbul' and created_at<(w+7)::timestamp at time zone 'Europe/Istanbul' group by student_id),
 first_lessons as (select student_id,min(completed_at) first_at from public.lesson_progress where test_success group by student_id,level,category,topic_name),
 lessons as (select student_id,count(*)*80 xp from first_lessons,bounds where first_at>=w::timestamp at time zone 'Europe/Istanbul' and first_at<(w+7)::timestamp at time zone 'Europe/Istanbul' group by student_id),
 stops as (select student_id,count(*)*42 xp from public.level_completions,bounds where mode='buyu' and level_no>=1000 and completed_at>=w::timestamp at time zone 'Europe/Istanbul' and completed_at<(w+7)::timestamp at time zone 'Europe/Istanbul' group by student_id),
 base as (select s.id,s.username,public.dm_student_level(coalesce((e.value->>'totalXp')::numeric,0)) level,coalesce(g.xp,0)+coalesce(l.xp,0)+coalesce(p.xp,0) xp from public.students s left join public.extra_data e on e.student_id=s.id and e.key_name='yo' left join scores g on g.student_id=s.id left join lessons l on l.student_id=s.id left join stops p on p.student_id=s.id where s.status='approved' and s.role='student' and s.id<>'dcde2026-1015-4000-8000-000000000001'::uuid),
 tier as (select *,case when level>=15 and xp>=1800 then 'sampiyon' when level>=10 and xp>=750 then 'super' else 'yerel' end league from base where level>=5),
 ranks as (select *,row_number() over(partition by league order by xp desc,username,id) rank from tier)
select jsonb_build_object('league',league,'rank',rank) from ranks where id=actor;
$$;

create function public.dm_feed_rank_change() returns trigger language plpgsql security invoker set search_path='' as $$
declare sid uuid; previous jsonb; current_rank jsonb; setting text; league_name text; week text:=date_trunc('week',now() at time zone 'Europe/Istanbul')::date::text;
begin
 sid:=new.student_id;
 if sid is null or sid='dcde2026-1015-4000-8000-000000000001'::uuid then return new;end if;
 if tg_table_name='extra_data' then
  if new.key_name<>'yo' or (tg_op='UPDATE' and coalesce(new.value->>'totalXp','0')=coalesce(old.value->>'totalXp','0')) then return new;end if;
 elsif tg_table_name='lesson_progress' then
  if not coalesce(new.test_success,false) or (tg_op='UPDATE' and coalesce(old.test_success,false)) then return new;end if;
 elsif tg_table_name='level_completions' then
  if new.mode<>'buyu' or new.level_no<1000 then return new;end if;
 elsif tg_table_name='game_scores' then
  if new.correct_count<=0 or new.extra->>'v' is distinct from '3' then return new;end if;
 end if;
 setting:='dm.feed_'||tg_table_name||'_'||replace(sid::text,'-','');
 if tg_when='BEFORE' then
  perform set_config(setting,coalesce(public.dm_feed_rank(sid),'{}')::text,true);return new;
 end if;
 previous:=coalesce(nullif(current_setting(setting,true),'')::jsonb,'{}');current_rank:=public.dm_feed_rank(sid);
 if current_rank is null then return new;end if;
 league_name:=case current_rank->>'league' when 'sampiyon' then 'Şampiyonlar Ligi' when 'super' then 'Süper Lig' else 'Yerel Lig' end;
 if previous->>'league' is distinct from current_rank->>'league' and
    (case current_rank->>'league' when 'sampiyon' then 3 when 'super' then 2 else 1 end)>
    (case previous->>'league' when 'sampiyon' then 3 when 'super' then 2 when 'yerel' then 1 else 0 end) then
  perform public.dm_feed_publish(sid,'league:'||week||':'||(current_rank->>'league'),'league_promotion',league_name||' seviyesine yükseldi!','🏆',current_rank);
 elsif previous->>'league'=current_rank->>'league' and (current_rank->>'rank')::int<(previous->>'rank')::int then
  perform public.dm_feed_publish(sid,'rank:'||week||':'||(current_rank->>'league')||':'||(current_rank->>'rank'),'rank_up',league_name||' sıralamasında '||(previous->>'rank')||'. sıradan '||(current_rank->>'rank')||'. sıraya yükseldi!','📈',current_rank||jsonb_build_object('previous_rank',previous->'rank'));
 end if;
 return new;
end $$;

create function public.dm_feed_achievement() returns trigger language plpgsql security invoker set search_path='' as $$
declare sid uuid:=new.student_id; prev jsonb:='{}'; current_value jsonb; item text; label text; badge_names jsonb:='{"hos-geldin": "aktif-5", "aktif-5": "Meraklı Papi", "aktif-15": "Odak Ustası", "aktif-60": "Bir Saatlik Kaşif", "oyun-25": "Oyun Gezgini", "dogru-50": "Parlayan Zihin", "parkur-50": "Rota Efsanesi", "seri-14": "İki Haftalık Azim", "ilk-adim": "İlk Adım", "ilk-zafer": "İlk Zafer", "seri-3": "3 Gün Seri", "seri-7": "7 Gün Seri", "seri-30": "30 Gün Seri", "kelime-avcisi": "Kelime Avcısı", "kelime-ustasi": "Kelime Ustası", "tam-isabet": "Tam İsabet", "keskin-goz": "Keskin Göz", "ders-kurdu": "Ders Kurdu", "konu-ustasi": "Konu Ustası", "yildiz-toplayici": "Yıldız Toplayıcı", "parkurcu": "Parkurcu", "kasif": "Kaşif", "sampiyon": "Şampiyon", "gorev-avcisi": "Görev Avcısı", "seviye-5": "Seviye 5", "seviye-10": "Seviye 10", "seviye-20": "Seviye 20", "koleksiyoncu": "Koleksiyoncu", "puan-avcisi": "Puan Avcısı", "puan-efsanesi": "Puan Efsanesi", "altin-kumbara": "Altın Kumbara", "dinleme-ustasi": "Dinleme Ustası"}'::jsonb; n int; g int; message text; key text; kind text;
begin
 if tg_op='UPDATE' then prev:=to_jsonb(old);end if;
 if sid is null or sid='dcde2026-1015-4000-8000-000000000001'::uuid then return new;end if;
 if tg_table_name='lesson_progress' then
  if not coalesce(new.test_success,false) or coalesce((prev->>'test_success')::boolean,false) then return new;end if;
  perform public.dm_feed_publish(sid,'lesson:'||jsonb_build_array(new.level,new.category,new.topic_name)::text,'lesson_complete',new.level||' · '||new.topic_name||' ders konusunu tamamladı!','📚',jsonb_build_object('level',new.level,'category',new.category,'topic',new.topic_name));
 elsif tg_table_name='level_completions' then
  message:=case new.mode when 'buyu' then 'Macera Haritası · '||new.class_no||'. sınıf, '||new.unit_no||'. ünite, '||case when new.level_no>=200000 then new.level_no%100 else new.level_no end||'. durağı tamamladı!' when 'konusma' then 'Kelime Modu · '||new.level_no||'. bölümü tamamladı!' else new.mode||' parkurunda '||new.level_no||'. bölümü tamamladı!' end;
  perform public.dm_feed_publish(sid,'stop:'||jsonb_build_array(new.mode,new.class_no,new.unit_no,new.level_no)::text,'route_complete',message,'🗺️',jsonb_build_object('mode',new.mode,'class',new.class_no,'unit',new.unit_no,'stop',new.level_no));
 elsif tg_table_name='papi_story_progress' then
  if not new.completed or coalesce((prev->>'completed')::boolean,false) then return new;end if;
  perform public.dm_feed_publish(sid,'story:'||new.chapter,'story_complete','Öğrenme Yolu · '||(new.chapter+1)||'. bölümü tamamladı!','🚩',jsonb_build_object('chapter',new.chapter));
 elsif tg_table_name='dm_progress_rewards' then
  if new.kind='purchase' or new.kind='lesson' or new.gold<=0 then return new;end if;
  label:=case new.kind when 'chest' then 'Parkur sandığını açarak' when 'weekly_target' then 'Haftalık hedefini tamamlayarak' when 'stop' then 'Parkur ödülü olarak' else 'Başarı ödülü olarak' end;
  perform public.dm_feed_publish(sid,'reward:'||new.kind||':'||new.reward_key,'reward_earned',label||' '||new.gold||' altın kazandı!','🎁',jsonb_build_object('kind',new.kind,'gold',new.gold));
 elsif tg_table_name='dm_active_time' then
  for item in select x::text from unnest(new.claimed) x where not(to_jsonb(x)<@coalesce(prev->'claimed','[]')) loop
   n:=item::int;g:=(array[20,40,75,120,200])[least(4,((n-new.base_chest-1)/5)::int)+1];
   perform public.dm_feed_publish(sid,'time-chest:'||item,'reward_earned','Aktif öğrenme sandığını açtı ve '||g||' altın kazandı!','🎁',jsonb_build_object('gold',g));
  end loop;
 elsif tg_table_name='extra_data' then
  if new.key_name<>'yo' or jsonb_typeof(new.value)<>'object' then return new;end if;
  current_value:=new.value;prev:=coalesce(prev->'value','{}');
  for item in select jsonb_array_elements_text(coalesce(current_value#>'{dmWorldBadges,ids}','[]')) except select jsonb_array_elements_text(coalesce(prev#>'{dmWorldBadges,ids}','[]')) loop
   label:=badge_names->>item;if label is null then continue;end if;
   -- First historical badge migration is a silent baseline, as in the badge UI.
   if not(prev ? 'dmWorldBadges') and item<>'hos-geldin' then
    insert into public.dm_feed_awards values(sid,'badge:'||item,now()) on conflict do nothing;
   else
    perform public.dm_feed_publish(sid,'badge:'||item,'badge_earned',label||' rozetini kazandı!','🏅',jsonb_build_object('badge_id',item,'badge_name',label));
   end if;
  end loop;
  for item in select jsonb_array_elements_text(coalesce(current_value->'krkSatin','[]')||coalesce(current_value->'krkGoruldu','[]')) except select jsonb_array_elements_text(coalesce(prev->'krkSatin','[]')||coalesce(prev->'krkGoruldu','[]')) loop
   if not(prev ? 'krkGoruldu') and not(coalesce(current_value->'krkSatin','[]') ? item) then
    insert into public.dm_feed_awards values(sid,'character:'||item,now()) on conflict do nothing;
   else
    perform public.dm_feed_publish(sid,'character:'||item,'character_earned',item||' karakterini koleksiyonuna kattı!','🎭',jsonb_build_object('character_name',item));
   end if;
  end loop;
  for item in select jsonb_array_elements_text(coalesce(current_value#>'{karakter,sahip}','[]')) except select jsonb_array_elements_text(coalesce(prev#>'{karakter,sahip}','[]')) loop
   perform public.dm_feed_publish(sid,'item:'||item,'item_earned','Koleksiyonuna yeni bir kıyafet veya aksesuar kattı!','🛍️',jsonb_build_object('item_id',item));
  end loop;
  if public.dm_student_level(coalesce((current_value->>'totalXp')::numeric,0))>public.dm_student_level(coalesce((prev->>'totalXp')::numeric,0)) then
   n:=public.dm_student_level((current_value->>'totalXp')::numeric);
   perform public.dm_feed_publish(sid,'level:'||n,'student_level_up',n||'. seviyeye yükseldi!','🦜',jsonb_build_object('level',n));
  end if;
  if coalesce((current_value#>>'{gorev,alindi}')::boolean,false) and not coalesce((prev#>>'{gorev,alindi}')::boolean,false) then
   perform public.dm_feed_publish(sid,'daily:'||(current_value#>>'{gorev,t}'),'daily_complete','Günün 3 görevini tamamladı ve ödülünü aldı!','✅');
  end if;
 end if;
 return new;
end $$;

-- Seed deduplication keys only: old completions must not flood the public feed on replay.
insert into public.dm_feed_awards(student_id,event_key)
select student_id,'lesson:'||jsonb_build_array(level,category,topic_name)::text from public.lesson_progress where test_success
union select student_id,'stop:'||jsonb_build_array(mode,class_no,unit_no,level_no)::text from public.level_completions
union select student_id,'story:'||chapter from public.papi_story_progress where completed and student_id is not null
union select student_id,'reward:'||kind||':'||reward_key from public.dm_progress_rewards
union select student_id,'badge:'||x from public.extra_data e cross join lateral jsonb_array_elements_text(coalesce(e.value#>'{dmWorldBadges,ids}','[]')) x where key_name='yo'
union select student_id,'character:'||x from public.extra_data e cross join lateral jsonb_array_elements_text(coalesce(e.value->'krkSatin','[]')||coalesce(e.value->'krkGoruldu','[]')) x where key_name='yo'
on conflict do nothing;

create trigger dm_feed_achievements after insert or update on public.extra_data for each row when(new.key_name='yo') execute function public.dm_feed_achievement();
create trigger dm_feed_lessons after insert or update on public.lesson_progress for each row execute function public.dm_feed_achievement();
create trigger dm_feed_stops after insert on public.level_completions for each row execute function public.dm_feed_achievement();
create trigger dm_feed_story after insert or update on public.papi_story_progress for each row execute function public.dm_feed_achievement();
create trigger dm_feed_rewards after insert or update on public.dm_progress_rewards for each row execute function public.dm_feed_achievement();
create trigger dm_feed_time_chests after update on public.dm_active_time for each row when(old.claimed is distinct from new.claimed) execute function public.dm_feed_achievement();
create trigger dm_01_feed_rank before insert or update on public.extra_data for each row execute function public.dm_feed_rank_change();
create trigger dm_zz_feed_rank after insert or update on public.extra_data for each row execute function public.dm_feed_rank_change();
create trigger dm_01_feed_rank before insert on public.game_scores for each row execute function public.dm_feed_rank_change();
create trigger dm_zz_feed_rank after insert on public.game_scores for each row execute function public.dm_feed_rank_change();
create trigger dm_01_feed_rank before insert or update on public.lesson_progress for each row execute function public.dm_feed_rank_change();
create trigger dm_zz_feed_rank after insert or update on public.lesson_progress for each row execute function public.dm_feed_rank_change();
create trigger dm_01_feed_rank before insert on public.level_completions for each row execute function public.dm_feed_rank_change();
create trigger dm_zz_feed_rank after insert on public.level_completions for each row execute function public.dm_feed_rank_change();

revoke all on function public.dm_feed_publish(uuid,text,text,text,text,jsonb),public.dm_feed_rank(uuid),public.dm_feed_rank_change(),public.dm_feed_achievement() from public,anon,authenticated;
grant execute on function public.dm_feed_publish(uuid,text,text,text,text,jsonb),public.dm_feed_rank(uuid),public.dm_feed_rank_change(),public.dm_feed_achievement() to service_role;
