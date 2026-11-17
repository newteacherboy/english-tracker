-- [18 Kas 2026] Canlı Düello ve Papi'ye Karşı: 6 sorudan 10 soruya.
-- Sıra: anlam, İngilizcesi, boşluk, doğru/yanlış, doğru eş, anlam, İngilizcesi, doğru/yanlış, boşluk, FİNAL (boşluk, 2 kat).
-- Can dengesi korunur: doğru cevap 8 + hız bonusu (en fazla 5), final 2 kat; en yüksek toplam ≈ 143 (önce 140).
-- Ödüller ve günlük haklar değişmez. Yayın anında süren 6 soruluk düellolar da sonuçlanabilir.

create or replace function dm_private.duel_questions(g integer) returns jsonb
language plpgsql volatile set search_path='' as $$
declare en text[]; tr text[]; ph_en text[]; n int; q jsonb:='[]'::jsonb; pick jsonb; tf boolean;
 words text[]; idx int; target text; sentence text; i int; used_blank int:=0; slot int; cand int[]; base int; lim int;
begin
 g:=greatest(1,least(8,coalesce(g,5)));
 select array_agg(x.en),array_agg(x.tr) into en,tr from (
  select b.en,b.tr from (
   select distinct on (lower(a.tr)) a.en,a.tr from (
    select distinct on (lower(trim(w.english))) trim(w.english) en,trim(w.turkish) tr
    from public.word_bank w where w.active and w.class_no between greatest(1,g-1) and g
     and trim(w.english) ~ '^[A-Za-z][A-Za-z''-]{1,20}$' and nullif(trim(w.turkish),'') is not null and length(trim(w.turkish))<=28
    order by lower(trim(w.english)),w.id) a
   order by lower(a.tr),a.en) b
  order by random() limit 44) x;
 if coalesce(cardinality(en),0)<40 then
  select array_agg(x.en),array_agg(x.tr) into en,tr from (
   select b.en,b.tr from (
    select distinct on (lower(a.tr)) a.en,a.tr from (
     select distinct on (lower(trim(w.english))) trim(w.english) en,trim(w.turkish) tr
     from public.word_bank w where w.active and w.class_no between greatest(1,g-2) and least(8,g+1)
      and trim(w.english) ~ '^[A-Za-z][A-Za-z''-]{1,20}$' and nullif(trim(w.turkish),'') is not null and length(trim(w.turkish))<=28
     order by lower(trim(w.english)),w.id) a
    order by lower(a.tr),a.en) b
   order by random() limit 44) x;
 end if;
 if coalesce(cardinality(en),0)<40 then
  select array_agg(x.en),array_agg(x.tr) into en,tr from (
   select b.en,b.tr from (
    select distinct on (lower(a.tr)) a.en,a.tr from (
     select distinct on (lower(trim(w.english))) trim(w.english) en,trim(w.turkish) tr
     from public.word_bank w where w.active and w.class_no between 1 and 8
      and trim(w.english) ~ '^[A-Za-z][A-Za-z''-]{1,20}$' and nullif(trim(w.turkish),'') is not null and length(trim(w.turkish))<=28
     order by lower(trim(w.english)),w.id) a
    order by lower(a.tr),a.en) b
   order by random() limit 44) x;
 end if;
 n:=coalesce(cardinality(en),0);
 if n<40 then raise exception 'Düello için yeterli kelime yok.'; end if;
 select array_agg(x.e) into ph_en from (
  select trim(w.english) e from public.word_bank w where w.active
   and w.class_no between greatest(1,g-1) and greatest(2,g)
   and array_length(regexp_split_to_array(trim(w.english),'\s+'),1) between 3 and 9
   and trim(w.english) ~ '[A-Za-z]{3,}' and trim(w.english) !~ '(\.\.|…)'
  order by random() limit 10) x;

 -- Kelime indeksleri soru başına ayrıdır, çakışmaz (en fazla 36 kelime kullanılır).
 for slot in 1..10 loop
  if slot in (1,6) then -- Anlamı ne?
   base:=case slot when 1 then 1 else 19 end;
   pick:=dm_private.duel_pick(tr[base],array[tr[base+1],tr[base+2],tr[base+3]]);
   q:=q||(jsonb_build_object('t','meaning','p',en[base],'lim',10)||pick);
  elsif slot in (2,7) then -- İngilizcesi ne?
   base:=case slot when 2 then 5 else 23 end;
   pick:=dm_private.duel_pick(en[base],array[en[base+1],en[base+2],en[base+3]]);
   q:=q||(jsonb_build_object('t','reverse','p',tr[base],'lim',10)||pick);
  elsif slot in (4,8) then -- Doğru mu yanlış mı?
   base:=case slot when 4 then 13 else 27 end;
   tf:=random()<.5;
   q:=q||jsonb_build_object('t','tf','p',en[base]||' = '||case when tf then tr[base] else tr[base+1] end,'o',jsonb_build_array('Doğru','Yanlış'),'a',case when tf then 0 else 1 end,'lim',6);
  elsif slot=5 then -- Doğru eşi bul
   pick:=dm_private.duel_pick(en[15]||' = '||tr[15],array[en[16]||' = '||tr[17],en[17]||' = '||tr[18],en[18]||' = '||tr[16]]);
   q:=q||(jsonb_build_object('t','pair','p','Hangisi doğru eşleşme?','lim',10)||pick);
  else -- 3, 9: boşluk; 10: final (cümle yoksa anlam sorusu)
   base:=case slot when 3 then 9 when 9 then 29 else 33 end;
   lim:=case when slot=10 then 12 else 10 end;
   sentence:=null;target:=null;
   for i in 1..coalesce(cardinality(ph_en),0) loop
    if i<=used_blank then continue; end if;
    words:=regexp_split_to_array(ph_en[i],'\s+');
    select array_agg(k) into cand from generate_subscripts(words,1) k
     where regexp_replace(words[k],'[^A-Za-z'']','','g') ~ '^[A-Za-z]{3,}$';
    if coalesce(cardinality(cand),0)=0 then continue; end if;
    idx:=cand[1+floor(random()*cardinality(cand))::int];
    target:=regexp_replace(words[idx],'[^A-Za-z'']','','g');
    if exists(select 1 from unnest(array[en[base],en[base+1],en[base+2]]) d where lower(d)=lower(target)) then continue; end if;
    words[idx]:=regexp_replace(words[idx],'[A-Za-z'']+','___');
    sentence:=array_to_string(words,' ');
    used_blank:=i;
    exit;
   end loop;
   if sentence is null then
    pick:=dm_private.duel_pick(tr[base],array[tr[base+1],tr[base+2],tr[base+3]]);
    q:=q||(jsonb_build_object('t',case when slot=10 then 'final' else 'meaning' end,'p',en[base],'lim',lim,'ask','meaning')||pick);
   else
    pick:=dm_private.duel_pick(lower(target),array[lower(en[base]),lower(en[base+1]),lower(en[base+2])]);
    q:=q||(jsonb_build_object('t',case when slot=10 then 'final' else 'blank' end,'p',sentence,'lim',12,'ask','blank')||pick);
   end if;
  end if;
 end loop;
 return q;
end $$;

-- Hasar: 10 soruda doğru cevap 8 + hız bonusu (en fazla 5); 6 soruda eski 12 + 8. Son soru (final) 2 kat.
create or replace function dm_private.duel_score(qs jsonb, ans jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare i int; n int:=jsonb_array_length(qs); dmg int:=0; correct int:=0; ms bigint:=0; q jsonb; a jsonb; lim int; t int; hit int;
begin
 for i in 0..n-1 loop
  q:=qs->i; a:=ans->i; lim:=(q->>'lim')::int*1000;
  t:=least(lim,greatest(0,coalesce((a->>'ms')::int,lim)));
  ms:=ms+t;
  if a is not null and (a->>'c') ~ '^[0-9]+$' and (a->>'c')::int=(q->>'a')::int then
   correct:=correct+1;
   -- 6 soruluk (eski) düellolar eski hasarla, 10 soruluklar yeni hasarla sayılır.
   hit:=case when n<=6 then 12+round(8.0*(lim-t)/lim)::int else 8+round(5.0*(lim-t)/lim)::int end;
   if i=n-1 then hit:=hit*2; end if;
   dmg:=dmg+hit;
  end if;
 end loop;
 return jsonb_build_object('damage',dmg,'correct',correct,'ms',ms,'total',n);
end $$;

create or replace function dm_private.duel_valid_answers(ans jsonb) returns boolean
language sql immutable set search_path='' as $$
 select jsonb_typeof(ans)='array' and jsonb_array_length(ans) in (6,10) and not exists(
  select 1 from jsonb_array_elements(ans) e where jsonb_typeof(e.value)<>'object'
   or not ((e.value->>'c') ~ '^-?[0-9]$') or not ((e.value->>'ms') ~ '^[0-9]{1,6}$'))
$$;

create or replace function dm_private.duel_settle(d public.dm_live_duels) returns public.dm_live_duels
language plpgsql set search_path='' as $$
declare hs jsonb; gs jsonb; host_hp int; guest_hp int; res text; hr jsonb; gr jsonb; empty jsonb;
begin
 if d.status='finished' then return d; end if;
 select coalesce(jsonb_agg('{}'::jsonb),'[]'::jsonb) into empty from generate_series(1,jsonb_array_length(d.questions));
 hs:=dm_private.duel_score(d.questions,coalesce(d.host_answers,empty));
 gs:=dm_private.duel_score(d.questions,coalesce(case when d.vs_papi then d.papi_answers else d.guest_answers end,empty));
 host_hp:=greatest(0,100-(gs->>'damage')::int);
 guest_hp:=greatest(0,100-(hs->>'damage')::int);
 res:=case when host_hp>guest_hp then 'host' when guest_hp>host_hp then 'guest'
  when (hs->>'ms')::bigint<(gs->>'ms')::bigint then 'host' when (gs->>'ms')::bigint<(hs->>'ms')::bigint then 'guest' else 'draw' end;
 -- Hiç cevap vermeyen taraf ödül almaz; kaybeden XP almaz.
 hr:=case when d.host_answers is null then jsonb_build_object('xp',0,'gold',0)
  when res='host' then jsonb_build_object('xp',300,'gold',50) when res='draw' then jsonb_build_object('xp',150,'gold',0) else jsonb_build_object('xp',0,'gold',0) end;
 gr:=case when d.vs_papi or d.guest_id is null or d.guest_answers is null then jsonb_build_object('xp',0,'gold',0)
  when res='guest' then jsonb_build_object('xp',300,'gold',50) when res='draw' then jsonb_build_object('xp',150,'gold',0) else jsonb_build_object('xp',0,'gold',0) end;
 if (hr->>'xp')::int>0 then perform dm_private.duel_award(d.host_id,d.id,'host',(hr->>'xp')::int,(hr->>'gold')::int); end if;
 if (gr->>'xp')::int>0 then perform dm_private.duel_award(d.guest_id,d.id,'guest',(gr->>'xp')::int,(gr->>'gold')::int); end if;
 update public.dm_live_duels set status='finished',outcome=res,finished_at=now(),
  host_reward=hr||jsonb_build_object('hp',host_hp)||hs,guest_reward=gr||jsonb_build_object('hp',guest_hp)||gs
 where id=d.id returning * into d;
 return d;
end $$;

create or replace function public.dm_duel_finish(p_token text, p_duel uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; d public.dm_live_duels; side text;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 if not dm_private.duel_valid_answers(p_answers) then return jsonb_build_object('ok',false,'message','Geçersiz düello sonucu.'); end if;
 select * into d from public.dm_live_duels where id=p_duel and (host_id=s.id or guest_id=s.id) for update;
 if d.id is null then return jsonb_build_object('ok',false,'message','Düello bulunamadı.'); end if;
 if d.status='finished' then return dm_private.duel_view(d,s.id); end if;
 if d.status<>'matched' then return jsonb_build_object('ok',false,'message','Düello başlamadı.'); end if;
 if jsonb_array_length(p_answers)<>jsonb_array_length(d.questions) then return jsonb_build_object('ok',false,'message','Geçersiz düello sonucu.'); end if;
 side:=case when d.host_id=s.id then 'host' else 'guest' end;
 if side='host' and d.host_answers is null then
  update public.dm_live_duels set host_answers=p_answers where id=d.id returning * into d;
 elsif side='guest' and d.guest_answers is null then
  update public.dm_live_duels set guest_answers=p_answers where id=d.id returning * into d;
 end if;
 if d.vs_papi or (d.host_answers is not null and d.guest_answers is not null) then
  d:=dm_private.duel_settle(d);
 end if;
 return dm_private.duel_view(d,s.id);
end $$;

-- Rakibi bekleyen oyuncu sorar; maç başlangıcından 240 sn sonra bitirmeyen taraf kaybetmiş sayılır.
create or replace function public.dm_duel_result(p_token text, p_duel uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; d public.dm_live_duels;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.'); end if;
 select * into d from public.dm_live_duels where id=p_duel and (host_id=s.id or guest_id=s.id) for update;
 if d.id is null then return jsonb_build_object('ok',false,'message','Düello bulunamadı.'); end if;
 if d.status='matched' and d.matched_at<=now()-interval '240 seconds' then d:=dm_private.duel_settle(d); end if;
 return dm_private.duel_view(d,s.id);
end $$;

revoke all on function dm_private.duel_questions(integer),dm_private.duel_score(jsonb,jsonb),dm_private.duel_valid_answers(jsonb),
 dm_private.duel_settle(public.dm_live_duels) from public,anon,authenticated;
revoke all on function public.dm_duel_finish(text,uuid,jsonb),public.dm_duel_result(text,uuid) from public;
grant execute on function public.dm_duel_finish(text,uuid,jsonb),public.dm_duel_result(text,uuid) to anon,authenticated,service_role;
