create table dm_private.teams (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 3 and 30),
 crest smallint not null check (crest between 1 and 20),
 captain uuid not null,
 deleted_at timestamptz
);
create unique index dm_team_active_name on dm_private.teams(lower(name)) where deleted_at is null;

create table dm_private.team_members (
 student_id uuid primary key references public.students(id) on delete cascade,
 team_id uuid not null references dm_private.teams(id),
 joined_at timestamptz not null default now()
);
create index dm_team_members_team on dm_private.team_members(team_id);

create table dm_private.team_requests (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references dm_private.teams(id),
 student_id uuid not null references public.students(id) on delete cascade,
 kind text not null check (kind in ('invite','join','transfer')),
 created_at timestamptz not null default now(),
 unique(team_id,student_id,kind)
);
create index dm_team_requests_recipient on dm_private.team_requests(student_id);

create table dm_private.team_week_members (
 student_id uuid not null references public.students(id) on delete cascade,
 week date not null,
 team_id uuid not null references dm_private.teams(id),
 primary key(student_id,week)
);
create table dm_private.team_runs (
 student_id uuid not null references public.students(id) on delete cascade,
 kind text not null check (kind in ('premium','duel')),
 game text not null,
 run_id uuid not null,
 team_id uuid not null references dm_private.teams(id),
 started_at timestamptz not null default now(),
 primary key(student_id,kind,game,run_id)
);
create table dm_private.team_scores (
 student_id uuid not null references public.students(id) on delete cascade,
 kind text not null,
 game text not null,
 run_id uuid not null,
 team_id uuid not null references dm_private.teams(id),
 week date not null,
 day date not null,
 created_at timestamptz not null default now(),
 points int not null default 10 check (points=10),
 primary key(student_id,kind,game,run_id)
);
create index dm_team_scores_week on dm_private.team_scores(week,team_id,student_id);
create index dm_team_scores_team on dm_private.team_scores(team_id,day);
create table dm_private.team_awards (
 team_id uuid not null references dm_private.teams(id),
 week date not null,
 student_id uuid not null references public.students(id) on delete cascade,
 xp int not null,
 gold int not null,
 energy_remaining int not null default 15,
 claimed_at timestamptz,
 primary key(team_id,week,student_id)
);

create function dm_private.team_today() returns date language sql stable set search_path='' as $$
 select (now() at time zone 'Europe/Istanbul')::date
$$;
create function dm_private.team_week(d date) returns date language sql immutable set search_path='' as $$
 select d-(extract(isodow from d)::int-1)
$$;

-- One short, single-use ticket ties the result to an explicit Team entry.
create table dm_private.team_tickets (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 team_id uuid not null references dm_private.teams(id),
 kind text not null check (kind in ('premium','duel')),
 issued_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '15 minutes',
 used_at timestamptz
);
create index dm_team_tickets_expiry on dm_private.team_tickets(expires_at);

create function dm_private.team_bind(actor uuid, ticket uuid, activity text, game_key text, run_key uuid)
returns boolean language plpgsql set search_path='' as $$
declare t dm_private.team_tickets; w date:=dm_private.team_week(dm_private.team_today()); selected_team uuid;
begin
 if ticket is null or run_key is null then return false;end if;
 select * into t from dm_private.team_tickets x where x.id=ticket and x.student_id=actor and x.kind=activity for update;
 if t.id is null or t.expires_at<=now() then return false;end if;
 if t.used_at is not null then
  return exists(select 1 from dm_private.team_runs r where (r.student_id,r.kind,r.game,r.run_id,r.team_id)=(actor,activity,game_key,run_key,t.team_id));
 end if;
 if not exists(select 1 from dm_private.team_members m join dm_private.teams tm on tm.id=m.team_id
  where m.student_id=actor and m.team_id=t.team_id and tm.deleted_at is null) then return false;end if;
 insert into dm_private.team_week_members values(actor,w,t.team_id) on conflict do nothing;
 select team_id into selected_team from dm_private.team_week_members m where m.student_id=actor and m.week=w;
 if selected_team<>t.team_id then return false;end if;
 insert into dm_private.team_runs values(actor,activity,game_key,run_key,t.team_id,now()) on conflict do nothing;
 update dm_private.team_tickets set used_at=now() where id=ticket;
 return true;
end $$;

create function dm_private.team_score(actor uuid, activity text, game_key text, run_key uuid)
returns int language plpgsql set search_path='' as $$
declare r dm_private.team_runs; d date:=dm_private.team_today(); w date:=dm_private.team_week(d); sender text;
begin
 select * into r from dm_private.team_runs x where (x.student_id,x.kind,x.game,x.run_id)=(actor,activity,game_key,run_key);
 if not found then return 0;end if;
 if exists(select 1 from dm_private.team_scores x where (x.student_id,x.kind,x.game,x.run_id)=(actor,activity,game_key,run_key)) then return 10;end if;
 if r.started_at<now()-interval '2 hours' or dm_private.team_week((r.started_at at time zone 'Europe/Istanbul')::date)<>w then return 0;end if;
 if not public.dm_social_allowed(actor,'social') then return 0;end if;
 if not exists(select 1 from dm_private.team_members m join dm_private.teams t on t.id=m.team_id
  where m.student_id=actor and m.team_id=r.team_id and t.deleted_at is null) then return 0;end if;
 insert into dm_private.team_scores(student_id,kind,game,run_id,team_id,week,day)
 values(actor,activity,game_key,run_key,r.team_id,w,d) on conflict do nothing;
 if not found then return 10;end if;
 select username into sender from public.students where id=actor;
 perform dm_private.center_event(m.student_id,'team-score:'||activity||':'||game_key||':'||run_key||':'||actor,
  'gorev','Takımına yeni katkı',sender||' takıma +10 puan kazandırdı.',jsonb_build_object('routeTab','tab-meduakis'),actor)
 from dm_private.team_members m where m.team_id=r.team_id and m.student_id<>actor
 and public.dm_social_allowed(m.student_id,'social') and not public.dm_blocked(actor,m.student_id);
 return 10;
end $$;

create function public.dm_team_premium_bind(actor uuid,ticket uuid,game_key text,run_key uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare active_since timestamptz; issued timestamptz;
begin
 select t.issued_at into issued from dm_private.team_tickets t where t.id=ticket and t.student_id=actor;
 if issued is null then return false;end if;
 case game_key
  when 'tower' then select started_at into active_since from public.dm_tower_runs where student_id=actor and run_id=run_key and result is null;
  when 'word-goal' then select started_at into active_since from public.dm_goal_runs where student_id=actor and run_id=run_key and result is null;
  when 'papizzle' then select started_at into active_since from public.dm_papizzle_runs where student_id=actor and run_id=run_key and result is null;
  when 'cloud-flight' then select started_at into active_since from public.dm_cloud_runs where student_id=actor and run_id=run_key and result is null;
  when 'word-blocks' then select started_at into active_since from public.dm_blocks_runs where student_id=actor and run_id=run_key and result is null;
  when 'rally' then select created_at into active_since from public.dm_rally_runs where student_id=actor and id=run_key and status='playing';
  else return false;
 end case;
 if active_since is null or active_since<issued then return false;end if;
 return dm_private.team_bind(actor,ticket,'premium',game_key,run_key);
end $$;
create function public.dm_team_premium_points(actor uuid,game_key text,run_key uuid)
returns int language sql stable security definer set search_path='' as $$
 select coalesce((select s.points from dm_private.team_scores s
  where (s.student_id,s.kind,s.game,s.run_id)=(actor,'premium',game_key,run_key)),0)
$$;
revoke all on function public.dm_team_premium_bind(uuid,uuid,text,uuid), public.dm_team_premium_points(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.dm_team_premium_bind(uuid,uuid,text,uuid), public.dm_team_premium_points(uuid,text,uuid) to service_role;

create function dm_private.team_premium_finished() returns trigger
language plpgsql security definer set search_path='' as $$
declare correct int; wrong int;
begin
 if old.result is null and new.result is not null then
  correct:=coalesce((new.result->>'correct')::int,0);
  wrong:=coalesce((new.result->>'wrong')::int,0);
  if correct>0 and correct*100>=60*(correct+wrong) then
   perform dm_private.team_score(new.student_id,'premium',tg_argv[0],new.run_id);
  end if;
 end if;
 return new;
end $$;
create trigger dm_team_tower_finished after update of result on public.dm_tower_runs for each row execute function dm_private.team_premium_finished('tower');
create trigger dm_team_goal_finished after update of result on public.dm_goal_runs for each row execute function dm_private.team_premium_finished('word-goal');
create trigger dm_team_cloud_finished after update of result on public.dm_cloud_runs for each row execute function dm_private.team_premium_finished('cloud-flight');
create trigger dm_team_blocks_finished after update of result on public.dm_blocks_runs for each row execute function dm_private.team_premium_finished('word-blocks');
create trigger dm_team_papizzle_finished after update of result on public.dm_papizzle_runs for each row execute function dm_private.team_premium_finished('papizzle');

create function dm_private.team_rally_finished() returns trigger
language plpgsql security definer set search_path='' as $$
declare correct int; wrong int;
begin
 if old.status is distinct from 'finished' and new.status='finished' then
  correct:=coalesce((new.state->>'correct')::int,0);
  wrong:=coalesce((new.state->>'wrong')::int,0);
  if correct>0 and correct*100>=60*(correct+wrong) then
   perform dm_private.team_score(new.student_id,'premium','rally',new.id);
  end if;
 end if;
 return new;
end $$;
create trigger dm_team_rally_finished after update of status on public.dm_rally_runs for each row execute function dm_private.team_rally_finished();

create function public.dm_team_duel_start(p_token text,p_ticket uuid,p_kind text,p_target text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.students; result jsonb; run_key uuid;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.');end if;
 if not exists(select 1 from dm_private.team_tickets t where t.id=p_ticket and t.student_id=s.id and t.kind='duel'
  and t.used_at is null and t.expires_at>now()) then
  return jsonb_build_object('ok',false,'message','Takımım ekranından yeniden başlat.');
 end if;
 case p_kind
  when 'live' then result:=public.dm_duel_live_search(p_token);
  when 'papi' then result:=public.dm_duel_papi_start(p_token);
  when 'invite' then result:=public.dm_duel_live_invite(p_token,p_target);
  else return jsonb_build_object('ok',false,'message','Geçersiz düello türü.');
 end case;
 if result->>'id' is not null then
  run_key:=(result->>'id')::uuid;
  if exists(select 1 from public.dm_live_duels d where d.id=run_key and ((d.host_id=s.id and d.created_at=transaction_timestamp()) or (d.guest_id=s.id and d.matched_at=transaction_timestamp()))) then
   perform dm_private.team_bind(s.id,p_ticket,'duel','duel',run_key);
  end if;
 end if;
 return result;
end $$;
revoke all on function public.dm_team_duel_start(text,uuid,text,text) from public;
grant execute on function public.dm_team_duel_start(text,uuid,text,text) to anon,authenticated;

create function dm_private.team_duel_finished() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='finished' and old.status is distinct from 'finished' then
  if new.host_answers is not null and (dm_private.duel_score(new.questions,new.host_answers)->>'correct')::int>=6 then
   perform dm_private.team_score(new.host_id,'duel','duel',new.id);
  end if;
  if new.guest_id is not null and new.guest_answers is not null
   and (dm_private.duel_score(new.questions,new.guest_answers)->>'correct')::int>=6 then
   perform dm_private.team_score(new.guest_id,'duel','duel',new.id);
  end if;
 end if;
 return new;
end $$;
create trigger dm_team_duel_finished after update of status on public.dm_live_duels
for each row execute function dm_private.team_duel_finished();

create function dm_private.team_snapshot(actor uuid) returns jsonb
language sql stable set search_path='' as $$
 with calendar as (select dm_private.team_today() as today),
 my_team as (select t.* from dm_private.team_members m join dm_private.teams t on t.id=m.team_id where m.student_id=actor and t.deleted_at is null),
 scores as (select s.* from dm_private.team_scores s join my_team t on t.id=s.team_id cross join calendar c where s.week=dm_private.team_week(c.today)),
 totals as (select student_id,sum(points) points from scores group by student_id)
 select jsonb_build_object(
 'ok',true,'me',actor,'team',(select jsonb_build_object('id',id,'name',name,'crest',crest,'captain',captain) from my_team),
 'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.student_id,'name',u.username,'points',coalesce(p.points,0)) order by m.joined_at)
 from dm_private.team_members m join my_team t on t.id=m.team_id join public.students u on u.id=m.student_id left join totals p on p.student_id=m.student_id),'[]'),
 'points',(select coalesce(sum(points),0) from scores),
 'latest',(select jsonb_build_object('name',u.username) from scores sc join public.students u on u.id=sc.student_id
  where not public.dm_blocked(actor,sc.student_id) order by sc.created_at desc limit 1),
 'tasks',(select jsonb_build_object('premium',count(*) filter(where kind='premium'),'duel',count(*) filter(where kind='duel'),'people',count(distinct student_id)) from scores,calendar where scores.day=calendar.today),
 'requests',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'kind',q.kind,'name',t.name,'person',u.username,'incoming',q.student_id=actor) order by q.created_at desc)
 from dm_private.team_requests q join dm_private.teams t on t.id=q.team_id join public.students u on u.id=q.student_id where t.deleted_at is null
 and ((q.student_id=actor and q.kind in ('invite','transfer')) or (t.captain=actor and q.kind='join'))),'[]'),
 'outgoing',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'kind',q.kind,'person',u.username))
 from dm_private.team_requests q join my_team t on t.id=q.team_id join public.students u on u.id=q.student_id
 where t.captain=actor and q.kind in ('invite','transfer')),'[]'),
 'eligible',(select team_id=(select id from my_team) from dm_private.team_week_members where student_id=actor and week=dm_private.team_week(dm_private.team_today()))
 )
$$;

create function public.dm_team_manage(p_token text,p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.students; target public.students; t dm_private.teams; q dm_private.team_requests;
 my_id uuid; target_id uuid; team_id_param uuid; n text; emblem int; rows jsonb; ticket uuid;
 w date:=dm_private.team_week(dm_private.team_today()); activity text:=p_data->>'kind';
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.');end if;
 if not public.dm_social_allowed(s.id,'social') and p_action not in ('leave','delete') then
  return jsonb_build_object('ok',false,'message','Takım özellikleri sosyal ayarlarında kapalı.');end if;
 if p_action='state' then return dm_private.team_snapshot(s.id);end if;

 if p_action in ('search','ranking') then
  if p_action='search' then
   select jsonb_agg(to_jsonb(x)) into rows from
   (select id,name,crest from dm_private.teams where deleted_at is null
    and strpos(lower(name),lower(left(trim(coalesce(p_data->>'name','')),30)))>0 order by name limit 30) x;
  else
   select jsonb_agg(to_jsonb(x)) into rows from
   (select ranked_team.id,ranked_team.name,ranked_team.crest,sum(sc.points) points
    from dm_private.teams ranked_team join dm_private.team_scores sc on sc.team_id=ranked_team.id
    where (p_data->>'period'='all' and sc.week<=w) or sc.week=w
    group by ranked_team.id having p_data->>'period'='all' or sum(sc.points)>=150
    order by sum(sc.points) desc,ranked_team.id limit 50) x;
  end if;
  return jsonb_build_object('ok',true,'rows',coalesce(rows,'[]'));
 end if;

 -- Serialize roster mutations, including two captains accepting a request at once.
 perform pg_advisory_xact_lock(19732026);
 select m.team_id into my_id from dm_private.team_members m where m.student_id=s.id;
 if p_action in ('create','edit') then
  n:=trim(p_data->>'name');
  emblem:=(p_data->>'crest')::int;
  if n is null or char_length(n) not between 3 and 30 or n ~ '[[:cntrl:]]' or emblem is null or emblem not between 1 and 20 then
   return jsonb_build_object('ok',false,'message','3–30 karakterlik takım adı ve bir arma seç.');
  end if;
  if p_action='create' and my_id is null then
   insert into dm_private.teams(name,crest,captain) values(n,emblem,s.id) returning id into my_id;
   insert into dm_private.team_members(student_id,team_id) values(s.id,my_id);
  elsif p_action='edit' then
   update dm_private.teams set name=n,crest=emblem where id=my_id and captain=s.id;
   if not found then return jsonb_build_object('ok',false,'message','Kaptan yetkisi gerekli.');end if;
  else return jsonb_build_object('ok',false,'message','Zaten bir takımdasın.');
  end if;
 elsif p_action='ticket' then
  if my_id is null or activity is null or activity not in ('duel','premium') then return jsonb_build_object('ok',false,'message','Önce bir takıma katıl.');end if;
  if exists(select 1 from dm_private.team_week_members where student_id=s.id and week=w and team_id<>my_id) then
   return jsonb_build_object('ok',false,'message','Yeni takımın için pazartesi puan toplamaya başlayabilirsin.');
  end if;
  delete from dm_private.team_tickets where student_id=s.id and expires_at<now();
  insert into dm_private.team_tickets(student_id,team_id,kind) values(s.id,my_id,activity) returning id into ticket;
  return jsonb_build_object('ok',true,'ticket',ticket);
 elsif p_action='join' then
  team_id_param:=(p_data->>'id')::uuid;
  if my_id is not null or not exists(select 1 from dm_private.teams where id=team_id_param and deleted_at is null)
   or (select count(*) from dm_private.team_members where team_id=team_id_param)>=6 then
   return jsonb_build_object('ok',false,'message','Bu takıma şu anda katılınamıyor.');
  end if;
  insert into dm_private.team_requests(team_id,student_id,kind) values(team_id_param,s.id,'join') on conflict do nothing returning id into ticket;
  if ticket is not null then
   select * into t from dm_private.teams where id=team_id_param;
   if public.dm_blocked(s.id,t.captain) or not public.dm_social_allowed(t.captain,'social') then
    delete from dm_private.team_requests where id=ticket;
    return jsonb_build_object('ok',false,'message','Bu takıma şu anda katılınamıyor.');end if;
   perform dm_private.center_event(t.captain,'team-request:'||ticket,'gorev','Takıma katılma isteği',s.username||' takımına katılmak istiyor.',jsonb_build_object('routeTab','tab-meduakis'),s.id);
  end if;
 elsif p_action in ('accept','reject') then
  select * into q from dm_private.team_requests where id=(p_data->>'id')::uuid;
  select * into t from dm_private.teams where id=q.team_id and deleted_at is null;
  if t.id is null or not coalesce(case when q.kind='join' then t.captain=s.id else q.student_id=s.id end,false) then
   return jsonb_build_object('ok',false,'message','İstek bulunamadı.');
  end if;
  if p_action='accept' then
   if not public.dm_social_allowed(q.student_id,'social') or not public.dm_social_allowed(t.captain,'social') or public.dm_blocked(q.student_id,t.captain) then
    return jsonb_build_object('ok',false,'message','Bu takım işlemi sosyal ayarlar nedeniyle kapalı.');end if;
   if q.kind='transfer' then
    update dm_private.teams set captain=s.id where id=t.id and my_id=t.id;
    if not found then return jsonb_build_object('ok',false,'message','Kaptanlık devri artık geçerli değil.');end if;
    delete from dm_private.team_requests where team_id=t.id and kind='transfer';
   else
    if exists(select 1 from dm_private.team_members where student_id=q.student_id)
      or (select count(*) from dm_private.team_members where team_id=t.id)>=6 then
     return jsonb_build_object('ok',false,'message','Takım dolu veya öğrenci başka bir takımda.');
    end if;
    insert into dm_private.team_members(student_id,team_id) values(q.student_id,t.id);
    delete from dm_private.team_requests where student_id=q.student_id and kind in ('join','invite');
   end if;
  end if;
  delete from dm_private.team_requests where id=q.id;
 elsif p_action='withdraw' then
  delete from dm_private.team_requests r using dm_private.teams tm
  where r.id=(p_data->>'id')::uuid and r.team_id=tm.id and tm.captain=s.id and r.kind in ('invite','transfer');
  if not found then return jsonb_build_object('ok',false,'message','Bekleyen davet bulunamadı.');end if;
 elsif p_action='leave' then
  if exists(select 1 from dm_private.teams where id=my_id and captain=s.id) then
   return jsonb_build_object('ok',false,'message','Önce kaptanlığı devret veya takımı sil.');
  end if;
  delete from dm_private.team_requests where team_id=my_id and student_id=s.id;
  delete from dm_private.team_members where student_id=s.id;
 elsif p_action in ('invite','remove','transfer','delete') then
  select * into t from dm_private.teams where id=my_id and captain=s.id and deleted_at is null;
  if t.id is null then return jsonb_build_object('ok',false,'message','Kaptan yetkisi gerekli.');end if;
  if p_action='delete' then
   update dm_private.teams set deleted_at=now() where id=t.id;
   delete from dm_private.team_requests where team_id=t.id;
   delete from dm_private.team_members where team_id=t.id;
  else
   if p_action='invite' then
    select * into target from public.students where dm_private.tr_ad(username)=dm_private.tr_ad(trim(left(p_data->>'name',80))) limit 1;
    target_id:=target.id;
    if target_id is null or target.status<>'approved' or target_id=s.id or not public.dm_social_allowed(target_id,'social') or public.dm_blocked(s.id,target_id) or exists(select 1 from dm_private.team_members where student_id=target_id)
      or (select count(*) from dm_private.team_members where team_id=t.id)>=6 then
     return jsonb_build_object('ok',false,'message','Bu üyeye davet gönderilemiyor.');
    end if;
   else
    target_id:=(p_data->>'id')::uuid;
    if target_id=s.id or not exists(select 1 from dm_private.team_members where team_id=t.id and student_id=target_id) then
     return jsonb_build_object('ok',false,'message','Üye bulunamadı.');
    end if;
   end if;
   if p_action='remove' then
    delete from dm_private.team_requests where team_id=t.id and student_id=target_id;
    delete from dm_private.team_members where team_id=t.id and student_id=target_id;
   else
    if p_action='transfer' then delete from dm_private.team_requests where team_id=t.id and kind='transfer';end if;
    insert into dm_private.team_requests(team_id,student_id,kind) values(t.id,target_id,p_action) on conflict do nothing returning id into ticket;
    if ticket is not null then
     perform dm_private.center_event(target_id,'team-request:'||ticket,'gorev',
      case when p_action='invite' then 'Takım daveti' else 'Kaptanlık teklifi' end,
      t.name||case when p_action='invite' then ' seni takıma davet etti.' else ' kaptanlığı sana devretmek istiyor.' end,
      jsonb_build_object('routeTab','tab-meduakis'),s.id);
    end if;
   end if;
  end if;
 else
  return jsonb_build_object('ok',false,'message','Geçersiz takım işlemi.');
 end if;
 return dm_private.team_snapshot(s.id);
exception
 when unique_violation then return jsonb_build_object('ok',false,'message','Bu takım adı kullanılıyor.');
 when invalid_text_representation or numeric_value_out_of_range then return jsonb_build_object('ok',false,'message','Geçersiz takım bilgisi.');
end $$;
revoke all on function public.dm_team_manage(text,text,jsonb) from public;
grant execute on function public.dm_team_manage(text,text,jsonb) to anon,authenticated;

create table dm_private.team_bonus_energy (
 student_id uuid primary key references public.students(id) on delete cascade,
 remaining int not null check(remaining between 0 and 10)
);
create function dm_private.team_use_energy() returns trigger
language plpgsql security definer set search_path='' as $$
declare balance int; spent int;
begin
 if new.energy is null or new.energy>=old.energy then return new;end if;
 select remaining into balance from dm_private.team_bonus_energy where student_id=old.id for update;
 spent:=least(coalesce(balance,0),old.energy-new.energy);
 if spent>0 then
  update dm_private.team_bonus_energy set remaining=remaining-spent where student_id=old.id;
  new.energy:=new.energy+spent;
 end if;
 return new;
end $$;
create trigger dm_team_use_energy before update of energy on public.students
for each row execute function dm_private.team_use_energy();

create function dm_private.team_awards_for(actor uuid) returns void
language sql set search_path='' as $$
 with my_weeks as (
  select distinct team_id,week from dm_private.team_scores
  where student_id=actor and week<dm_private.team_week(dm_private.team_today())
 ), qualifying as (
  select s.team_id,s.week from dm_private.team_scores s join my_weeks m using(team_id,week)
  group by s.team_id,s.week having sum(s.points)>=150
 ), shares as (
  select s.team_id,s.week,s.student_id,sum(s.points)::int as points
  from dm_private.team_scores s join qualifying q using(team_id,week)
  group by s.team_id,s.week,s.student_id having sum(s.points)>=30
 )
 insert into dm_private.team_awards(team_id,week,student_id,xp,gold)
 select team_id,week,student_id,
  floor(500::numeric*points/sum(points) over(partition by team_id,week))::int,points
 from shares where (team_id,week) in(select a.team_id,a.week from shares a where a.student_id=actor)
 order by team_id,week,student_id
 on conflict do nothing
$$;

create function public.dm_team_rewards(p_token text,p_week date default null,p_team uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.students; a dm_private.team_awards; items jsonb; yo jsonb; ver bigint;
 base int; bonus int; add_base int; add_bonus int; earned_xp int:=0; earned_gold int:=0;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false,'message','Öğrenci oturumu gerekli.');end if;
 perform dm_private.team_awards_for(s.id);
 if p_week is not null and p_team is not null then
  select * into s from public.students where id=s.id for update;
  select * into a from dm_private.team_awards where student_id=s.id and week=p_week and team_id=p_team for update;
  if not found then return jsonb_build_object('ok',false,'message','Ödül bulunamadı.');end if;
  if a.claimed_at is null then
   select value into yo from public.extra_data where student_id=s.id and key_name='yo' for update;
   if yo is null then return jsonb_build_object('ok',false,'message','Ödül için önce Parkur ekranını aç.');end if;
   ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((yo->>'guncelleme')::bigint,0)+1);
   yo:=yo||jsonb_build_object('totalXp',coalesce((yo->>'totalXp')::numeric,0)+a.xp,
    'altin',coalesce((yo->>'altin')::numeric,0)+a.gold,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
   update public.extra_data set value=yo,updated_at=now() where student_id=s.id and key_name='yo';
   update public.students set gold=(yo->>'altin')::numeric where id=s.id;
   earned_xp:=a.xp;earned_gold:=a.gold;
  end if;
  base:=public.dm_pwm_energy(s);
  select coalesce((select remaining from dm_private.team_bonus_energy where student_id=s.id),0) into bonus;
  add_base:=least(a.energy_remaining,greatest(0,25-base));
  add_bonus:=least(a.energy_remaining-add_base,10-bonus);
  if add_base>0 then
   update public.students set energy=base+add_base,energy_updated_at=now() where id=s.id;
   insert into public.energy_transactions(student_id,change_amount,balance_after,reason)
   values(s.id,add_base,base+add_base,'dm_team_reward:'||p_team||':'||p_week);
  end if;
  if add_bonus>0 then
   insert into dm_private.team_bonus_energy values(s.id,bonus+add_bonus)
   on conflict(student_id) do update set remaining=excluded.remaining;
  end if;
  update dm_private.team_awards set claimed_at=coalesce(claimed_at,now()),energy_remaining=energy_remaining-add_base-add_bonus
  where student_id=s.id and week=p_week and team_id=p_team;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('team',pr.team_id,'name',t.name,'week',pr.week,'xp',pr.xp,'gold',pr.gold,
 'energy',pr.energy_remaining,'claimed',pr.claimed_at is not null) order by pr.week desc),'[]') into items
 from dm_private.team_awards pr join dm_private.teams t on t.id=pr.team_id
 where pr.student_id=s.id and (pr.claimed_at is null or pr.energy_remaining>0);
 select coalesce((select remaining from dm_private.team_bonus_energy where student_id=s.id),0) into bonus;
 return jsonb_build_object('ok',true,'awards',items,'bonusEnergy',bonus,'xp',earned_xp,'gold',earned_gold,'yo',yo);
end $$;
revoke all on function public.dm_team_rewards(text,date,uuid) from public;
grant execute on function public.dm_team_rewards(text,date,uuid) to anon,authenticated;

create function public.dm_team_duel_credit(p_token text,p_duel uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.students; points int; enrolled boolean;
begin
 s:=dm_private.duel_session(p_token);
 if s.id is null then return jsonb_build_object('ok',false);end if;
 select a.points into points from dm_private.team_scores a where a.student_id=s.id and a.kind='duel' and a.run_id=p_duel;
 select exists(select 1 from dm_private.team_runs a where a.student_id=s.id and a.kind='duel' and a.run_id=p_duel) into enrolled;
 return jsonb_build_object('ok',true,'points',coalesce(points,0),'enrolled',enrolled);
end $$;
revoke all on function public.dm_team_duel_credit(text,uuid) from public;
grant execute on function public.dm_team_duel_credit(text,uuid) to anon,authenticated;

alter table dm_private.teams enable row level security;
alter table dm_private.team_members enable row level security;
alter table dm_private.team_requests enable row level security;
alter table dm_private.team_week_members enable row level security;
alter table dm_private.team_runs enable row level security;
alter table dm_private.team_scores enable row level security;
alter table dm_private.team_awards enable row level security;
alter table dm_private.team_tickets enable row level security;
alter table dm_private.team_bonus_energy enable row level security;
revoke all on function dm_private.team_today(), dm_private.team_week(date),
 dm_private.team_bind(uuid,uuid,text,text,uuid), dm_private.team_score(uuid,text,text,uuid),
 dm_private.team_premium_finished(), dm_private.team_rally_finished(), dm_private.team_duel_finished(),
 dm_private.team_snapshot(uuid), dm_private.team_use_energy(), dm_private.team_awards_for(uuid)
 from public,anon,authenticated;
