-- School/thematic completion separation and verified shop purchases.
-- Keeps previous award keys, RLS and reward accounting unchanged.
create or replace function public.dm_feed_achievement() returns trigger language plpgsql security invoker set search_path='' as $$
declare sid uuid:=new.student_id; prev jsonb:='{}'; current_value jsonb; item text; label text; badge_names jsonb:='{"hos-geldin": "aktif-5", "aktif-5": "Meraklı Papi", "aktif-15": "Odak Ustası", "aktif-60": "Bir Saatlik Kaşif", "oyun-25": "Oyun Gezgini", "dogru-50": "Parlayan Zihin", "parkur-50": "Rota Efsanesi", "seri-14": "İki Haftalık Azim", "ilk-adim": "İlk Adım", "ilk-zafer": "İlk Zafer", "seri-3": "3 Gün Seri", "seri-7": "7 Gün Seri", "seri-30": "30 Gün Seri", "kelime-avcisi": "Kelime Avcısı", "kelime-ustasi": "Kelime Ustası", "tam-isabet": "Tam İsabet", "keskin-goz": "Keskin Göz", "ders-kurdu": "Ders Kurdu", "konu-ustasi": "Konu Ustası", "yildiz-toplayici": "Yıldız Toplayıcı", "parkurcu": "Parkurcu", "kasif": "Kaşif", "sampiyon": "Şampiyon", "gorev-avcisi": "Görev Avcısı", "seviye-5": "Seviye 5", "seviye-10": "Seviye 10", "seviye-20": "Seviye 20", "koleksiyoncu": "Koleksiyoncu", "puan-avcisi": "Puan Avcısı", "puan-efsanesi": "Puan Efsanesi", "altin-kumbara": "Altın Kumbara", "dinleme-ustasi": "Dinleme Ustası"}'::jsonb; n int; g int; message text; key text; kind text;
begin
 if tg_op='UPDATE' then prev:=to_jsonb(old);end if;
 if sid is null or sid='dcde2026-1015-4000-8000-000000000001'::uuid then return new;end if;
 if tg_table_name='lesson_progress' then
  if not coalesce(new.test_success,false) or coalesce((prev->>'test_success')::boolean,false) then return new;end if;
  perform public.dm_feed_publish(sid,'lesson:'||jsonb_build_array(new.level,new.category,new.topic_name)::text,'lesson_complete',new.level||' · '||new.topic_name||' ders konusunu tamamladı!','📚',jsonb_build_object('level',new.level,'category',new.category,'topic',new.topic_name));
 elsif tg_table_name='level_completions' then
  -- Zero-class legacy/thematic records are not school-unit achievements.
  if new.mode='buyu' and (new.class_no not between 1 and 8 or new.unit_no not between 1 and 10) then return new;end if;
  message:=case new.mode when 'buyu' then 'Macera Haritası · '||new.class_no||'. sınıf, '||new.unit_no||'. ünite, '||case when new.level_no>=200000 then new.level_no%100 else new.level_no end||'. durağı tamamladı!' when 'konusma' then 'Kelime Modu · '||new.level_no||'. bölümü tamamladı!' else new.mode||' parkurunda '||new.level_no||'. bölümü tamamladı!' end;
  perform public.dm_feed_publish(sid,'stop:'||jsonb_build_array(new.mode,new.class_no,new.unit_no,new.level_no)::text,'route_complete',message,'🗺️',jsonb_build_object('mode',new.mode,'class',new.class_no,'unit',new.unit_no,'stop',new.level_no));
 elsif tg_table_name='papi_story_progress' then
  if not new.completed or coalesce((prev->>'completed')::boolean,false) then return new;end if;
  perform public.dm_feed_publish(sid,'story:'||new.chapter,'story_complete','Öğrenme Yolu · '||(new.chapter+1)||'. bölümü tamamladı!','🚩',jsonb_build_object('chapter',new.chapter));
 elsif tg_table_name='dm_progress_rewards' then
  if new.kind='purchase' then
   label:=case split_part(new.reward_key,':',2)
     when 'pantolon' then 'Yeni bir pantolon' when 'tisort' then 'Yeni bir tişört'
     when 'canta' then 'Yeni bir çanta' when 'rozet' then 'Özel bir rozet'
     when 'kahraman' then 'Özel bir karakter' when 'durus' then 'Yeni bir karakter pozu'
     when 'sapka' then 'Yeni bir şapka' when 'gozluk' then 'Yeni bir gözlük'
     else 'Mağazadan yeni bir ürün' end;
   perform public.dm_feed_publish(sid,'purchase:'||new.reward_key,'purchase',label||' satın aldı!','🛍️',
     jsonb_build_object('category',split_part(new.reward_key,':',2)));
   return new;
  end if;
  if new.kind='lesson' or new.gold<=0 then return new;end if;
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
    if coalesce(current_value->'krkSatin','[]') ? item and not (coalesce(prev->'krkSatin','[]') ? item) then
     perform public.dm_feed_publish(sid,'character:'||item,'purchase',item||' karakterini satın aldı!','🛍️',jsonb_build_object('character_name',item));
    else
     perform public.dm_feed_publish(sid,'character:'||item,'character_earned',item||' karakterini koleksiyonuna kattı!','🎭',jsonb_build_object('character_name',item));
    end if;
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


-- Remove only false 0th-class feed announcements, never their progress rows.
delete from public.feed_events where event_type='route_complete'
 and payload->>'mode'='buyu'
 and (not (coalesce(nullif(payload->>'class',''),'0') ~ '^[1-8]$')
   or not (coalesce(nullif(payload->>'unit',''),'0') ~ '^(10|[1-9])$'));
