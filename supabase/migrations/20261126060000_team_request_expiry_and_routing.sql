CREATE OR REPLACE FUNCTION dm_private.team_snapshot(actor uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
 'requests',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'kind',q.kind,'name',t.name,'person',u.username,'incoming',q.student_id=actor,'expiresAt',case when q.kind in ('join','invite') then q.created_at+interval '24 hours' end) order by q.created_at desc)
 from dm_private.team_requests q join dm_private.teams t on t.id=q.team_id join public.students u on u.id=q.student_id where t.deleted_at is null
 and (q.kind='transfer' or q.created_at>now()-interval '24 hours')
 and ((q.student_id=actor and q.kind in ('invite','transfer')) or (t.captain=actor and q.kind='join'))),'[]'),
 'outgoing',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'kind',q.kind,'person',u.username))
 from dm_private.team_requests q join my_team t on t.id=q.team_id join public.students u on u.id=q.student_id
 where t.captain=actor and q.kind in ('invite','transfer') and (q.kind='transfer' or q.created_at>now()-interval '24 hours')),'[]'),
 'eligible',(select team_id=(select id from my_team) from dm_private.team_week_members where student_id=actor and week=dm_private.team_week(dm_private.team_today()))
 )
$function$;

CREATE OR REPLACE FUNCTION public.dm_team_manage(p_token text, p_action text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
   (select tm.id,tm.name,tm.crest,exists(select 1 from dm_private.team_requests r where r.team_id=tm.id and r.student_id=s.id and r.kind='join' and r.created_at>now()-interval '24 hours') as requested from dm_private.teams tm where tm.deleted_at is null
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
 delete from dm_private.team_requests where kind in ('join','invite') and created_at<=now()-interval '24 hours';
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
   or (select count(*) from dm_private.team_members where team_id=team_id_param)>=3 then
   return jsonb_build_object('ok',false,'message','Bu takıma şu anda katılınamıyor.');
  end if;
  insert into dm_private.team_requests(team_id,student_id,kind) values(team_id_param,s.id,'join') on conflict do nothing returning id into ticket;
  if ticket is not null then
   select * into t from dm_private.teams where id=team_id_param;
   if public.dm_blocked(s.id,t.captain) or not public.dm_social_allowed(t.captain,'social') then
    delete from dm_private.team_requests where id=ticket;
    return jsonb_build_object('ok',false,'message','Bu takıma şu anda katılınamıyor.');end if;
   perform dm_private.center_event(t.captain,'team-request:'||ticket,'gorev','Takıma katılma isteği',s.username||' takımına katılmak istiyor.',jsonb_build_object('routeTab','team-requests'),s.id);
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
      or (select count(*) from dm_private.team_members where team_id=t.id)>=3 then
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
      or (select count(*) from dm_private.team_members where team_id=t.id)>=3 then
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
      jsonb_build_object('routeTab','team-requests'),s.id);
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
end $function$;
