-- First completion timestamps remain stable when a chapter is replayed.
create table if not exists public.dm_route_mission_completions (
 student_id uuid not null references public.students(id) on delete cascade,
 chapter integer not null, completed_at timestamptz not null default now(),
 primary key(student_id,chapter)
);
insert into public.dm_route_mission_completions(student_id,chapter,completed_at) select student_id,chapter,updated_at from public.papi_story_progress where student_id is not null and completed and not replay on conflict do nothing;
alter table public.dm_route_mission_completions enable row level security;
revoke all on public.dm_route_mission_completions from public,anon,authenticated;
grant all on public.dm_route_mission_completions to service_role;
create or replace function public.dm_record_route_mission() returns trigger language plpgsql set search_path='' as $$
begin
 if new.student_id is not null and new.completed and not new.replay and (TG_OP='INSERT' or not old.completed) then
  insert into public.dm_route_mission_completions(student_id,chapter) values(new.student_id,new.chapter) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.dm_record_route_mission() from public,anon,authenticated;
drop trigger if exists dm_route_mission_first_complete on public.papi_story_progress;
create trigger dm_route_mission_first_complete after insert or update of completed on public.papi_story_progress for each row execute function public.dm_record_route_mission();
create or replace function public.dm_mission_summary(actor uuid) returns jsonb language sql stable set search_path='' as $$
with bounds as (
 select (now() at time zone 'Europe/Istanbul')::date d,date_trunc('week',now() at time zone 'Europe/Istanbul')::date w
), periods as (select 'daily' p,d b,d+1 e from bounds union all select 'weekly',w,w+7 from bounds),
routes as (
 select completed_at from public.level_completions where student_id=actor
 union all select completed_at from public.dm_route_mission_completions where student_id=actor
), reviews as (
 select (value->>'lastReviewedAt')::timestamptz t from public.extra_data where student_id=actor and key_name like 'review_word:%' and value->>'lastReviewedAt' ~ '^\d{4}-\d{2}-\d{2}T'
), active as (
 select (completed_at at time zone 'Europe/Istanbul')::date d from routes
 union select (created_at at time zone 'Europe/Istanbul')::date from public.game_scores where student_id=actor
 union select (t at time zone 'Europe/Istanbul')::date from reviews
), result as (
 select p,jsonb_build_object(
 'route',(select count(*) from routes where completed_at>=b::timestamp at time zone 'Europe/Istanbul' and completed_at<e::timestamp at time zone 'Europe/Istanbul'),
 'game',(select count(*) from public.game_scores where student_id=actor and created_at>=b::timestamp at time zone 'Europe/Istanbul' and created_at<e::timestamp at time zone 'Europe/Istanbul'),
 'review',(select count(*) from reviews where t>=b::timestamp at time zone 'Europe/Istanbul' and t<e::timestamp at time zone 'Europe/Istanbul'),
 'days',(select count(*) from active where d>=b and d<e)) v from periods
) select jsonb_object_agg(p,v) from result;
$$;
revoke all on function public.dm_mission_summary(uuid) from public,anon,authenticated;
grant execute on function public.dm_mission_summary(uuid) to service_role;

-- A result is acknowledged only after its actual announcement is dismissed.
create or replace function public.dm_weekly_claim(actor uuid) returns jsonb language plpgsql set search_path='' as $$
declare r public.dm_weekly_results; v jsonb; st public.students; ver bigint;
begin
 if not exists(select 1 from public.students where id=actor and status='approved' and role='student') then raise exception 'Öğrenci bulunamadı'; end if;
 select * into r from public.dm_weekly_results where student_id=actor and shown_at is null order by week_start desc limit 1 for update;
 if not found then return null; end if;
 if r.awarded_at is null then
  select * into st from public.students where id=actor for update;
  select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
  v:=coalesce(v,'{}'::jsonb);ver:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
  if r.gold>0 or r.energy>0 then
   v:=jsonb_set(v,'{altin}',to_jsonb(greatest(coalesce((v->>'altin')::numeric,0),st.gold)+r.gold));
   v:=jsonb_set(v,'{guncelleme}',to_jsonb(ver));v:=jsonb_set(v,'{dmRewardVersion}',to_jsonb(ver));
   insert into public.extra_data(student_id,key_name,value,updated_at) values(actor,'yo',v,now()) on conflict(student_id,key_name) do update set value=excluded.value,updated_at=excluded.updated_at;
   update public.students set gold=(v->>'altin')::numeric,energy=least(500,energy+r.energy) where id=actor;
   insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,r.energy,least(500,st.energy+r.energy),'Haftalık Şampiyonlar Ligi '||r.week_start);
  end if;
  update public.dm_weekly_results set awarded_at=now() where student_id=actor and week_start=r.week_start;
 end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo';
 return to_jsonb(r)||jsonb_build_object('yo',v,'energyBalance',(select energy from public.students where id=actor));
end $$;
