-- Publish only the top three *real students* in each finalized weekly league.
-- The official result ledger determines league membership, position and rewards.
-- Do not use visual-only virtual opponents for rewards or announcements.
drop trigger if exists dm_feed_weekly_results on public.dm_weekly_results;

create or replace function public.dm_feed_weekly_podium()
returns trigger language plpgsql security invoker set search_path='' as $$
declare winner record; label text;
begin
 if new.settled_at is null or old.settled_at is not null then return new; end if;
 for winner in
  select p.student_id,p.league,p.week_start,p.league_rank,p.xp,p.gold,p.energy
  from (
   select r.student_id,r.league,r.week_start,r.xp,r.gold,r.energy,
    row_number() over(partition by r.league order by r.rank_no asc,r.student_id) as league_rank
   from public.dm_weekly_results r
   join public.students s on s.id=r.student_id
   where r.week_start=new.week_start and s.status='approved' and s.role='student'
     and r.league in ('yerel','super','sampiyon')
  ) p
  where p.league_rank<=3 and p.xp>0
 loop
  label:=case winner.league when 'sampiyon' then 'Şampiyonlar Ligi'
   when 'super' then 'Süper Lig' else 'Yerel Lig' end;
  perform public.dm_feed_publish(
   winner.student_id,
   'weekly-podium:'||winner.week_start||':'||winner.league,
   'weekly_result',
   label||' haftasını '||winner.league_rank||'. sırada tamamladı! Kazandığı ödül: '
    ||winner.gold||' altın, '||winner.energy||' enerji.',
   '🏆',
   jsonb_build_object('week',winner.week_start,'league',winner.league,
    'rank',winner.league_rank,'gold',winner.gold,'energy',winner.energy,'xp',winner.xp)
  );
 end loop;
 return new;
end $$;

revoke all on function public.dm_feed_weekly_podium() from public,anon,authenticated;
grant execute on function public.dm_feed_weekly_podium() to service_role;
create trigger dm_feed_weekly_podium
after update of settled_at on public.dm_league_weeks
for each row execute function public.dm_feed_weekly_podium();
