-- [18 Kas 2026] Kullanıcı kararları:
-- 1) Lig puanı artık kazanılan XP defterinden (dm_game_reward_runs) hesaplanıyor (20261117235000).
--    Hafta ortasında kural değiştiği için bazı öğrencilerin puanı düştü (ör. Şampiyonlar Ligi'nden düşenler).
--    Bu hafta (16–22 Kas 2026) kimse kural değişikliği yüzünden puan kaybetmesin: eski ve yeni hesaptan
--    büyük olan geçerli. 23 Kas 2026 haftasından itibaren yalnız XP defteri sayılır.
-- 2) Düelloda kaybedene XP verilmez (kazanan 300 XP + 50 altın, berabere 150 XP).

-- Eski (17 Kas 2026 öncesi) lig hesabı: oyun puanı + ilk kez geçilen konu 80 + parkur durağı 42.
create or replace function dm_private.competitive_xp_legacy(actor uuid, week date)
returns numeric language sql stable set search_path='' as $$
with bounds as (select week::timestamp at time zone 'Europe/Istanbul' a,(week+7)::timestamp at time zone 'Europe/Istanbul' b),
ev as (
 select (g.created_at at time zone 'Europe/Istanbul')::date d,
   greatest(0,g.correct_count*6+floor(coalesce((g.extra->>'speed')::numeric,0)/100)-g.wrong_count*3) p
   from public.game_scores g,bounds where g.student_id=actor and g.extra->>'v'='3' and g.correct_count>0 and g.created_at>=bounds.a and g.created_at<bounds.b
 union all
 select (p.first_at at time zone 'Europe/Istanbul')::date,80
   from (select min(completed_at) first_at from public.lesson_progress where student_id=actor and test_success group by level,category,topic_name) p,bounds
   where p.first_at>=bounds.a and p.first_at<bounds.b
 union all
 select (l.completed_at at time zone 'Europe/Istanbul')::date,42
   from public.level_completions l,bounds where l.student_id=actor and l.mode='buyu' and l.level_no>=1000 and l.completed_at>=bounds.a and l.completed_at<bounds.b
)
select coalesce(sum(least(3500,day_points)),0) from (select d,sum(p) day_points from ev group by d) x;
$$;
revoke all on function dm_private.competitive_xp_legacy(uuid,date) from public,anon,authenticated;

create or replace function public.dm_competitive_xp(actor uuid, week date)
 returns numeric
 language sql
 stable
 set search_path to ''
as $function$
with bounds as (select week::timestamp at time zone 'Europe/Istanbul' a,(week+7)::timestamp at time zone 'Europe/Istanbul' b),
ev as (
 select (r.created_at at time zone 'Europe/Istanbul')::date d,r.xp p from public.dm_game_reward_runs r,bounds where r.student_id=actor and r.xp>0 and r.created_at>=bounds.a and r.created_at<bounds.b
 union all
 select (p.first_at at time zone 'Europe/Istanbul')::date,80 from (select min(completed_at) first_at from public.lesson_progress where student_id=actor and test_success group by level,category,topic_name) p,bounds where p.first_at>=bounds.a and p.first_at<bounds.b
),
ledger as (select coalesce(sum(least(3500,day_points)),0) v from (select d,sum(p) day_points from ev group by d) x)
select case when week<date '2026-11-23' then greatest((select v from ledger),dm_private.competitive_xp_legacy(actor,week)) else (select v from ledger) end;
$function$;

-- Düello: kaybeden XP almaz.
create or replace function dm_private.duel_settle(d public.dm_live_duels) returns public.dm_live_duels
language plpgsql set search_path='' as $$
declare hs jsonb; gs jsonb; host_hp int; guest_hp int; res text; hr jsonb; gr jsonb; empty jsonb;
begin
 if d.status='finished' then return d; end if;
 empty:=jsonb_build_array('{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb);
 hs:=dm_private.duel_score(d.questions,coalesce(d.host_answers,empty));
 gs:=dm_private.duel_score(d.questions,coalesce(case when d.vs_papi then d.papi_answers else d.guest_answers end,empty));
 host_hp:=greatest(0,100-(gs->>'damage')::int);
 guest_hp:=greatest(0,100-(hs->>'damage')::int);
 res:=case when host_hp>guest_hp then 'host' when guest_hp>host_hp then 'guest'
  when (hs->>'ms')::bigint<(gs->>'ms')::bigint then 'host' when (gs->>'ms')::bigint<(hs->>'ms')::bigint then 'guest' else 'draw' end;
 -- Hiç cevap vermeyen taraf ödül almaz (bağlantı koptu / uygulamayı kapattı).
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
revoke all on function dm_private.duel_settle(public.dm_live_duels) from public,anon,authenticated;
