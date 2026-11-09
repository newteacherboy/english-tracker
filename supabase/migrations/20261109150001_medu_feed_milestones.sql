-- Medu Akış: only committed accomplishments, once per student and milestone.
-- Old rewards and progress are untouched; no retroactive replay.
create or replace function public.dm_feed_selected_milestones()
returns trigger language plpgsql security invoker set search_path='' as $$
declare n integer; next_class integer; 
begin
  if tg_table_name='dm_progress_rewards' then
    if new.kind='weekly_target' and new.gold>0
       and new.reward_key ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' then
      perform public.dm_feed_publish(new.student_id,
        'weekly-goal:'||new.reward_key,'weekly_goal_complete',
        'Haftalık görevini tamamladı! '||new.gold||' altın kazandı.',
        '🎯',jsonb_build_object('week',new.reward_key,'gold',new.gold));
    end if;
  elsif tg_table_name='level_completions' then
    if new.mode='buyu' and new.class_no between 1 and 8
        and new.unit_no between 1 and 10 and new.level_no>0 then
      -- Scoped to class. Milestones only on newly inserted, unique completed stops.
      select count(*) into n from public.level_completions
        where student_id=new.student_id and mode='buyu'
          and class_no=new.class_no and unit_no between 1 and 10 and level_no>0;
      if n>0 and n%5=0 then
        perform public.dm_feed_publish(new.student_id,
          'five-stops:'||new.class_no||':'||n,'route_five_complete',
          'Okul Yolum '||new.class_no||'. sınıfta '||n||' durağı tamamladı! Yeni rozet yolunda!',
          '🗺️',jsonb_build_object('class',new.class_no,'stops',n));
      end if;
    end if;
  elsif tg_table_name='dm_route_graduations' then
    if new.route='school' and new.level ~ '^[1-8]$' then
      n:=new.level::integer;
      next_class:=n+1;
      perform public.dm_feed_publish(new.student_id,
        'school-graduated:'||new.level,'school_graduation',
        case when n<8 then
          'Okul Yolum '||n||'. sınıf parkurunu bitirdi, '||next_class||'. sınıfa geçti!'
        else 'Okul Yolum 8. sınıf parkurundan mezun oldu!' end,
        '🎓',jsonb_build_object('completed_class',n,'next_class',
          case when n<8 then next_class else null end));
    end if;
  end if;
  return new;
end $$;

revoke all on function public.dm_feed_selected_milestones() from public,anon,authenticated;
grant execute on function public.dm_feed_selected_milestones() to service_role;
drop trigger if exists dm_feed_milestone_weekly on public.dm_progress_rewards;
create trigger dm_feed_milestone_weekly after insert on public.dm_progress_rewards
 for each row execute function public.dm_feed_selected_milestones();
drop trigger if exists dm_feed_milestone_stops on public.level_completions;
create trigger dm_feed_milestone_stops after insert on public.level_completions
 for each row execute function public.dm_feed_selected_milestones();
drop trigger if exists dm_feed_milestone_graduation on public.dm_route_graduations;
create trigger dm_feed_milestone_graduation after insert on public.dm_route_graduations
 for each row execute function public.dm_feed_selected_milestones();
