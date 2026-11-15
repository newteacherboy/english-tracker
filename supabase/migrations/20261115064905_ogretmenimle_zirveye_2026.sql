-- Öğretmenimle Zirveye: isolated, service-only campaign domain.
-- All account identities come from verified portal sessions in diji-api.
begin;
create schema dm_campaign;
revoke all on schema dm_campaign from public,anon,authenticated;
grant usage on schema dm_campaign to service_role;
create table dm_campaign.campaigns (
 id text primary key, starts_at timestamptz not null, ends_at timestamptz not null,
 results_at timestamptz not null, archived_at timestamptz, approved_at timestamptz,
 approved_by uuid references public.teachers(id), snapshot jsonb,
 check(starts_at<ends_at and ends_at<=results_at)
);
-- Half-open interval includes the entire final minute, 23:59:00–23:59:59.999.
insert into dm_campaign.campaigns values('zirve-2026','2026-11-20 00:00:00+03','2026-12-11 00:00:00+03','2026-12-11 00:00:00+03',null,null,null,null);
create table dm_campaign.groups (
 campaign_id text not null references dm_campaign.campaigns(id),
 teacher_id uuid not null references public.teachers(id),
 invite_code text not null unique default gen_random_uuid()::text,
 created_at timestamptz not null default now(),
 primary key(campaign_id,teacher_id)
);
create table dm_campaign.participants (
 campaign_id text not null, student_id uuid not null references public.students(id), teacher_id uuid not null,
 joined_at timestamptz not null default clock_timestamp(), kp integer not null default 0 check(kp>=0),
 reached_at timestamptz not null default clock_timestamp(),
 primary key(campaign_id,student_id), foreign key(campaign_id,teacher_id) references dm_campaign.groups(campaign_id,teacher_id)
);
create index participants_top5 on dm_campaign.participants(campaign_id,teacher_id,kp desc,reached_at,student_id);
create table dm_campaign.ledger (
 campaign_id text not null, student_id uuid not null, event_key text not null, kind text not null,
 kp integer not null check(kp>0), day date not null, created_at timestamptz not null default clock_timestamp(),
 primary key(campaign_id,student_id,event_key),
 foreign key(campaign_id,student_id) references dm_campaign.participants(campaign_id,student_id)
);
create index ledger_daily on dm_campaign.ledger(campaign_id,student_id,day,kind);
create table dm_campaign.game_uses (
 campaign_id text not null, student_id uuid not null, game text not null check(game in ('word-goal','word-match')),
 run_id uuid not null, day date not null, created_at timestamptz not null default clock_timestamp(),
 primary key(campaign_id,student_id,game,run_id),
 foreign key(campaign_id,student_id) references dm_campaign.participants(campaign_id,student_id)
);
create index game_uses_daily on dm_campaign.game_uses(campaign_id,student_id,game,day);
create table dm_campaign.rewards (
 campaign_id text not null references dm_campaign.campaigns(id), account_id uuid not null,
 account_role text not null check(account_role in ('student','teacher')), months integer not null,
 approved_by uuid references public.teachers(id), granted_at timestamptz, valid_until timestamptz,
 primary key(campaign_id,account_role,account_id)
);
create table dm_campaign.audit (
 id bigint generated always as identity primary key, campaign_id text not null references dm_campaign.campaigns(id),
 action text not null, actor uuid, created_at timestamptz not null default clock_timestamp(), details jsonb not null default '{}'
);
-- No anon/authenticated policies: the portal's server authenticates and scopes RPCs.
do $$ declare t text; begin
 foreach t in array array['campaigns','groups','participants','ledger','game_uses','rewards','audit'] loop
 execute format('alter table dm_campaign.%I enable row level security',t);
 execute format('revoke all on dm_campaign.%I from public,anon,authenticated',t);
 execute format('grant all on dm_campaign.%I to service_role',t);
 end loop;
end $$;
grant usage,select on all sequences in schema dm_campaign to service_role;

create function dm_campaign.active_at(stamp timestamptz) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from dm_campaign.campaigns where id='zirve-2026' and stamp>=starts_at and stamp<ends_at)
$$;
create function dm_campaign.active() returns boolean language sql stable set search_path='' as $$ select dm_campaign.active_at(now()) $$;
create function dm_campaign.remaining(actor uuid, game_key text) returns integer language sql stable set search_path='' as $$
 select case when dm_campaign.active() and game_key in ('word-goal','word-match')
 and exists(select 1 from dm_campaign.participants where campaign_id='zirve-2026' and student_id=actor)
 then greatest(0,5-(select count(*)::int from dm_campaign.game_uses where campaign_id='zirve-2026' and student_id=actor and game=game_key and day=(now() at time zone 'Europe/Istanbul')::date)) else 0 end
$$;
-- Called under the existing student row lock in the start transaction. Rollback
-- restores the ticket if words, energy or initialization fails. Retry reuses run_id.
create function dm_campaign.consume(actor uuid, game_key text, run_key uuid) returns boolean language plpgsql set search_path='' as $$
begin
 if exists(select 1 from dm_campaign.game_uses where campaign_id='zirve-2026' and student_id=actor and game=game_key and run_id=run_key) then return true; end if;
 perform 1 from dm_campaign.participants where campaign_id='zirve-2026' and student_id=actor for update;
 if dm_campaign.remaining(actor,game_key)<=0 then return false;end if;
 insert into dm_campaign.game_uses(campaign_id,student_id,game,run_id,day)
 values('zirve-2026',actor,game_key,run_key,(now() at time zone 'Europe/Istanbul')::date);
 return true;
end $$;

create function public.dm_campaign_join(actor uuid, code text) returns jsonb language plpgsql set search_path='' as $$
declare g dm_campaign.groups; p dm_campaign.participants;
begin
 if not dm_campaign.active() then return jsonb_build_object('ok',false,'code','inactive','mesaj','Katılım 20 Kasım–10 Aralık 2026 tarihleri arasında açık.');end if;
 perform 1 from public.students s where s.id=actor and s.status='approved' and s.role='student' and s.frozen_at is null
 and not exists(select 1 from public.teacher_portal_guests where student_id=actor) for update;
 if not found then return jsonb_build_object('ok',false,'code','account','mesaj','Kişisel öğrenci hesabınla giriş yap.');end if;
 select x.* into g from dm_campaign.groups x join public.teachers t on t.id=x.teacher_id and t.active and t.frozen_at is null
 where x.campaign_id='zirve-2026' and x.invite_code=code;
 if not found then return jsonb_build_object('ok',false,'code','invite','mesaj','Davet bağlantısı geçersiz.');end if;
 insert into dm_campaign.participants(campaign_id,student_id,teacher_id) values(g.campaign_id,actor,g.teacher_id) on conflict do nothing;
 select * into p from dm_campaign.participants where campaign_id=g.campaign_id and student_id=actor;
 if p.teacher_id<>g.teacher_id then return jsonb_build_object('ok',false,'code','already_joined','mesaj','Bu kampanyada zaten başka bir öğretmen grubuna katıldın.');end if;
 return jsonb_build_object('ok',true,'joined',true);
end $$;

-- Only trusted completion adapters call award. Points/limits never come from a client.
create function dm_campaign.award(actor uuid, event_id text, activity text, began timestamptz) returns void language plpgsql set search_path='' as $$
declare p dm_campaign.participants; points int; cap int; today date:=(now() at time zone 'Europe/Istanbul')::date; n int;
begin
 if not dm_campaign.active() or began is null then return;end if;
 select * into p from dm_campaign.participants where campaign_id='zirve-2026' and student_id=actor for update;
 if not found or began<p.joined_at then return;end if;
 points:=case activity when 'school' then 100 when 'learning' then 100 when 'plan' then 60 when 'word-goal' then 40 when 'word-match' then 40 when 'solo' then 30 when 'topic' then 25 when 'story' then 40 when 'chat' then 50 else 0 end;
 cap:=case activity when 'word-goal' then 5 when 'word-match' then 5 when 'solo' then 3 when 'topic' then 3 when 'story' then 3 when 'chat' then 1 when 'plan' then 1 else 1000 end;
 if points=0 then return;end if;
 select count(*) into n from dm_campaign.ledger where campaign_id=p.campaign_id and student_id=actor and kind=activity and day=today;
 if n>=cap then return;end if;
 insert into dm_campaign.ledger(campaign_id,student_id,event_key,kind,kp,day) values(p.campaign_id,actor,event_id,activity,points,today) on conflict do nothing;
 if found then update dm_campaign.participants set kp=kp+points,reached_at=clock_timestamp() where campaign_id=p.campaign_id and student_id=actor;end if;
end $$;

-- No names, usernames, schools, contacts or pupil IDs in the general board.
create function dm_campaign.board() returns jsonb language sql stable set search_path='' as $$
 with ranked as (
 select p.*,row_number() over(partition by teacher_id order by kp desc,reached_at,student_id) pos from dm_campaign.participants p where campaign_id='zirve-2026' and kp>0
 ), totals as (
 select g.teacher_id,g.created_at,coalesce(sum(r.kp) filter(where pos<=5),0)::int score,count(r.student_id)::int active,
 max(r.reached_at) filter(where pos<=5) reached
 from dm_campaign.groups g left join ranked r using(teacher_id) where g.campaign_id='zirve-2026' group by g.teacher_id,g.created_at
 ), board as (
 select teacher_id,score,active,active>=5 eligible,
 row_number() over(order by (active>=5) desc,score desc,active desc,reached nulls last,created_at,teacher_id) rank
 from totals
 ) select coalesce(jsonb_agg(to_jsonb(b) order by rank),'[]') from board b
$$;

create function public.dm_campaign_status(actor uuid, account_role text) returns jsonb language plpgsql set search_path='' as $$
declare c dm_campaign.campaigns; g dm_campaign.groups; p dm_campaign.participants; board jsonb; members jsonb; ownrank int; tid uuid; total int; topsum int;
begin
 select * into c from dm_campaign.campaigns where id='zirve-2026';
 if account_role='teacher' then
  if not exists(select 1 from public.teachers t where t.id=actor and t.active and t.frozen_at is null and
   (t.username='teacher' and t.is_admin or exists(select 1 from public.teacher_portal_access a join public.students s on s.id=a.student_id where a.teacher_id=t.id and a.state='approved' and s.email_verified_at is not null and s.status='approved' and s.frozen_at is null)))
   then return jsonb_build_object('ok',false,'mesaj','Doğrulanmış öğretmen hesabı gerekli.');end if;
  insert into dm_campaign.groups(campaign_id,teacher_id) values(c.id,actor) on conflict do nothing;
  select * into g from dm_campaign.groups where campaign_id=c.id and teacher_id=actor;tid:=actor;
 elsif account_role='student' then
  select * into p from dm_campaign.participants where campaign_id=c.id and student_id=actor;tid:=p.teacher_id;
 else return jsonb_build_object('ok',false,'mesaj','Hesap gerekli.');end if;
 board:=coalesce(c.snapshot,dm_campaign.board());
 select count(*) into total from dm_campaign.participants where campaign_id=c.id and teacher_id=tid;
 select coalesce(sum(kp),0)::int into topsum from (select kp from dm_campaign.participants where campaign_id=c.id and teacher_id=tid order by kp desc,reached_at,student_id limit 5) t;
 select coalesce(jsonb_agg(jsonb_build_object('alias',case when account_role='teacher' then (select coalesce(nullif(s.full_name,''),s.username) from public.students s where s.id=top5.student_id) else 'Yarışmacı '||pos end,'kp',kp,'self',student_id=actor) order by pos),'[]') into members from
 (select student_id,kp,row_number() over(order by kp desc,reached_at,student_id) pos from dm_campaign.participants where campaign_id=c.id and teacher_id=tid order by kp desc,reached_at,student_id limit 5) top5;
 select pos into ownrank from (select student_id,row_number() over(order by kp desc,reached_at,student_id)::int pos from dm_campaign.participants where campaign_id=c.id and teacher_id=tid) t where student_id=actor;
 return jsonb_build_object('ok',true,'serverNow',now(),'startsAt',c.starts_at,'endsAt',c.ends_at,'resultsAt',c.results_at,
 'active',dm_campaign.active(),'joined',p.student_id is not null,'teacher',account_role='teacher',
 'invite',case when account_role='teacher' then g.invite_code else null end,'participants',total,'kp',coalesce(p.kp,0),'groupScore',topsum,'studentRank',ownrank,
 'top5',members,'remaining',jsonb_build_object('word-goal',dm_campaign.remaining(actor,'word-goal'),'word-match',dm_campaign.remaining(actor,'word-match')),
 'groupRank',(select b->'rank' from jsonb_array_elements(board)b where b->>'teacher_id'=tid::text),
 'board',(select coalesce(jsonb_agg((b-'teacher_id')||jsonb_build_object('self',b->>'teacher_id'=tid::text,'label','Öğretmen grubu '||substr(md5(b->>'teacher_id'),1,6)) order by (b->>'rank')::int),'[]') from jsonb_array_elements(board)b),
 'archived',c.archived_at is not null,'approved',c.approved_at is not null);
end $$;

-- Result snapshot is immutable once captured, and can be prepared by cron or admin.
create function public.dm_campaign_finalize() returns jsonb language plpgsql set search_path='' as $$
declare c dm_campaign.campaigns; board jsonb; winner uuid;
begin
 select * into c from dm_campaign.campaigns where id='zirve-2026' for update;
 if now()<c.results_at then return jsonb_build_object('ok',false,'mesaj','Sonuçlar 11 Aralık 2026 tarihinde hazırlanacak.');end if;
 if c.archived_at is null then
  board:=dm_campaign.board();
  update dm_campaign.campaigns set snapshot=board,archived_at=clock_timestamp() where id=c.id;
  select (b->>'teacher_id')::uuid into winner from jsonb_array_elements(board)b where (b->>'rank')::int=1 and (b->>'eligible')::boolean;
  if winner is not null then
   insert into dm_campaign.rewards(campaign_id,account_id,account_role,months) values(c.id,winner,'teacher',3) on conflict do nothing;
   insert into dm_campaign.rewards(campaign_id,account_id,account_role,months)
   select c.id,student_id,'student',1 from dm_campaign.participants where campaign_id=c.id and teacher_id=winner and kp>0 order by kp desc,reached_at,student_id limit 5 on conflict do nothing;
  end if;
  insert into dm_campaign.audit(campaign_id,action,details) values(c.id,'finalized',jsonb_build_object('winner',winner));
  if exists(select 1 from pg_extension where extname='pg_cron') then
   if exists(select 1 from cron.job where jobname='zirve-2026-finalize') then perform cron.unschedule('zirve-2026-finalize');end if;
  end if;
 end if;
 return jsonb_build_object('ok',true,'rewards',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from dm_campaign.rewards r where campaign_id=c.id),'board',(select snapshot from dm_campaign.campaigns where id=c.id));
end $$;
create function public.dm_campaign_approve(admin_actor uuid) returns jsonb language plpgsql set search_path='' as $$
declare c dm_campaign.campaigns; r dm_campaign.rewards;
begin
 if not exists(select 1 from public.teachers where id=admin_actor and is_admin and active and frozen_at is null) then raise exception 'Yönetici gerekli.';end if;
 perform public.dm_campaign_finalize();
 select * into c from dm_campaign.campaigns where id='zirve-2026' for update;
 if c.archived_at is null then raise exception 'Sonuçlar henüz hazır değil.';end if;
 if c.approved_at is not null then return jsonb_build_object('ok',true,'duplicate',true);end if;
 for r in select * from dm_campaign.rewards where campaign_id=c.id loop
  update dm_campaign.rewards set approved_by=admin_actor,granted_at=clock_timestamp(),valid_until=clock_timestamp()+make_interval(months=>r.months)
  where campaign_id=c.id and account_id=r.account_id and account_role=r.account_role and granted_at is null;
 end loop;
 update dm_campaign.campaigns set approved_by=admin_actor,approved_at=clock_timestamp() where id=c.id;
 insert into dm_campaign.audit(campaign_id,action,actor) values(c.id,'approved_and_granted',admin_actor);
 return jsonb_build_object('ok',true,'duplicate',false);
end $$;

-- Gift overlay: paid entitlement rows and transactions are never changed.
CREATE OR REPLACE FUNCTION public.dm_plan(actor uuid, account_role text DEFAULT 'student'::text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select case
    when account_role='student' and exists(
      select 1 from public.teacher_portal_guests g
      join public.teacher_portal_access a on a.id=g.access_id and a.state='approved'
      join public.teachers t on t.id=a.teacher_id and t.active and t.frozen_at is null
      where g.student_id=actor and g.alias='Premium Oyun' and g.preview
        and t.is_admin and t.username='teacher'
    ) then 'premium_pro'
    when account_role='student' and exists(
      select 1 from public.teacher_portal_guests g
      join public.teacher_portal_access a on a.id=g.access_id and a.state='approved'
      join public.teachers t on t.id=a.teacher_id and t.active and t.frozen_at is null
      where g.student_id=actor and g.alias='Premium Oyun' and g.preview
    ) then (
      select public.dm_plan(a.teacher_id,'teacher')
      from public.teacher_portal_guests g
      join public.teacher_portal_access a on a.id=g.access_id
      where g.student_id=actor and g.alias='Premium Oyun' and g.preview
      limit 1
    )
    when exists(select 1 from dm_campaign.rewards r where r.account_id=actor and r.account_role=dm_plan.account_role and r.granted_at is not null and r.valid_until>now()) then 'premium_pro'
    when exists(select 1 from public.dm_entitlements e
      where e.account_id=actor and e.account_role=dm_plan.account_role and e.state='active'
        and (e.valid_until is null or e.valid_until>now())
        and e.product_key = any(case when dm_plan.account_role='teacher'
          then array['teacher_premium_pro']
          else array['diji_premium_pro','premium','premium_plus','premium_max',
            'diji_premium','diji_premium_plus','diji_premium_max'] end))
      then 'premium_pro'
    when exists(select 1 from public.dm_entitlements e
      where e.account_id=actor and e.account_role=dm_plan.account_role and e.state='active'
        and (e.valid_until is null or e.valid_until>now())
        and e.product_key=case when dm_plan.account_role='teacher' then 'teacher_pro' else 'diji_pro' end)
      then 'pro'
    else 'free'
  end
$function$
;
CREATE OR REPLACE FUNCTION public.dm_game_access(actor uuid, game_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare p text; joined date; today date:=(now() at time zone 'Europe/Istanbul')::date;
 beginning timestamptz:=date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul';
 n int; lim int; expires date;
begin
 p:=public.dm_plan(actor,'student');
 select (coalesce(t.created_at,s.created_at) at time zone 'Europe/Istanbul')::date into joined
 from public.students s left join public.teacher_portal_guests g on g.student_id=s.id
 left join public.teacher_portal_access a on a.id=g.access_id
 left join public.teachers t on t.id=a.teacher_id where s.id=actor;
 if joined is null then raise exception 'Öğrenci oturumu gerekli.'; end if;
 expires:=greatest(joined,date '2026-11-14')+3;
 lim:=case when p='premium_pro' then 999 when p='pro' then 5 when public.dm_game_trial_active(joined,today) then 1 else 0 end;
 case game_key
 when 'word-match' then select count(*) into n from public.dm_premium_match_runs r where student_id=actor and started_at>=beginning and not exists(select 1 from dm_campaign.game_uses u where u.student_id=actor and u.run_id=r.run_id and u.campaign_id='zirve-2026');
 when 'cloud-flight' then select count(*) into n from public.dm_cloud_runs where student_id=actor and started_at>=beginning;
 when 'word-blocks' then select count(*) into n from public.dm_blocks_runs where student_id=actor and started_at>=beginning;
 when 'papizzle' then select count(*) into n from public.dm_papizzle_runs where student_id=actor and started_at>=beginning;
 when 'rally' then select count(*) into n from public.dm_rally_runs where student_id=actor and created_at>=beginning;
 when 'tower' then select count(*) into n from public.dm_tower_runs where student_id=actor and started_at>=beginning;
 when 'word-goal' then select count(*) into n from public.dm_goal_runs r where student_id=actor and started_at>=beginning and not exists(select 1 from dm_campaign.game_uses u where u.student_id=actor and u.run_id=r.run_id and u.campaign_id='zirve-2026');
 else raise exception 'Geçersiz oyun.';
 end case;
 return jsonb_build_object('plan',p,'premium',p='premium_pro','limit',lim,'period','day','normalRemaining',case when p='premium_pro' then 999 else greatest(0,lim-n) end,'campaignRemaining',dm_campaign.remaining(actor,game_key),
 'trialEnds',expires,'remaining',case when p='premium_pro' then 999 else greatest(0,lim-n)+dm_campaign.remaining(actor,game_key) end);
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_goal_start(actor uuid, run_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; u public.dm_goal_progress; r public.dm_goal_runs;
  campaign_ticket boolean:=false; prem boolean; available int; ticks int; questions jsonb; more boolean; batch_size int;
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_goal_runs where student_id=actor and run_id=run_key;
  if not found then
    insert into public.dm_goal_progress(student_id) values(actor) on conflict do nothing;
    select * into u from public.dm_goal_progress where student_id=actor;
    select * into r from public.dm_goal_runs where student_id=actor and result is null order by started_at desc limit 1;
    if found then return public.dm_goal_status(actor)||jsonb_build_object('runId',r.run_id,'playedLevel',r.level_no,'result',r.result,'rounds',r.rounds); end if;
    if u.completed and u.level_no>=160 then raise exception 'Geçersiz bölüm. Tüm oyun rotası tamamlandı.'; end if;
    batch_size:=12;
    campaign_ticket:=dm_campaign.consume(actor,'word-goal',run_key);
    prem:=public.dm_pwm_is_premium(actor);
    if not campaign_ticket and not prem and (public.dm_game_access(actor,'word-goal')->>'remaining')::int<=0 then raise exception 'Ücretsiz oyun hakkın bitti. Daha fazla oynamak için Pro ol.'; end if;
    available:=public.dm_pwm_energy(st);
    if not campaign_ticket and available<5 then raise exception 'Oyuna başlamak için 5 enerji gerekli.'; end if;

    with bank as materialized (
      select distinct on (class_no, lower(trim(english)))
        class_no, unit_no, trim(english) as en, trim(turkish) as tr
      from public.dm_premium_course_words(u.level_no)
      where true and trim(english)<>'' and trim(turkish)<>''
      order by class_no, lower(trim(english)), unit_no, trim(turkish), trim(english)
    ), page as (
      select * from bank order by class_no, unit_no, lower(en) limit (batch_size+1)
    ), targets as (
      select * from page order by class_no,unit_no,lower(en) limit batch_size
    ), choices as (
      select t.*, array(
        select opt from (
          select t.tr as opt union all
          select d.tr from (
            select tr from (select min(tr) as tr, bool_or(class_no=t.class_no) as same_class
              from bank where lower(tr)<>lower(t.tr) group by lower(tr)) pool
            order by same_class desc, random() limit 3
          ) d
        ) options order by random()
      ) as opts from targets t
    )
    select jsonb_agg(jsonb_build_object('en',en,'options',opts,'answer',array_position(opts,tr)-1)
      order by class_no,unit_no,lower(en)), (select count(*)>batch_size from page) into questions,more
      from choices where cardinality(opts)=4;
    more:=u.level_no<160;
    if questions is null or jsonb_array_length(questions)<4 then raise exception 'Geçersiz bölüm. Yeni kelime bulunamadı.'; end if;

  if not campaign_ticket then
    ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int;
    update public.students set energy=available-5,
      energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end
      where id=actor;
    insert into public.energy_transactions(student_id,change_amount,balance_after,reason)
      values(actor,-5,available-5,'premium-goal:'||run_key);
  end if;
    if not campaign_ticket and not prem then update public.dm_goal_progress set free_used=least(3,free_used+1) where student_id=actor; end if;
    insert into public.dm_goal_runs(student_id,run_id,level_no,rounds,has_more)
      values(actor,run_key,u.level_no,questions,more) returning * into r;
  end if;
  return public.dm_goal_status(actor)||jsonb_build_object('runId',run_key,'playedLevel',r.level_no,'result',r.result,
    'rounds',r.rounds);
end $function$
;
CREATE OR REPLACE FUNCTION public.dm_pwm_start(actor uuid, run_key uuid, p_level integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.students; u public.dm_premium_match_usage; r public.dm_premium_match_runs; campaign_ticket boolean:=false; prem boolean; available int; ticks int;
begin
  if run_key is null or p_level is null or p_level<1 or p_level>100 then raise exception 'Geçersiz bölüm.'; end if;
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  insert into public.dm_premium_match_usage(student_id) values(actor) on conflict(student_id) do nothing;
  select * into u from public.dm_premium_match_usage where student_id=actor for update;
  select * into r from public.dm_premium_match_runs where student_id=actor and run_id=run_key;
  if found then return public.dm_pwm_status(actor)||jsonb_build_object('seed',(select campaign_seed from public.dm_premium_match_runs where student_id=actor and run_id=run_key),'runId',run_key,'playedLevel',r.level_no,'replayed',true,'words',(select jsonb_agg(jsonb_build_object('en',english,'tr',turkish)) from public.dm_premium_course_words(least(160,ceil(r.level_no*1.6)::int)) where length(english) between 2 and 14 and length(turkish)<=24)); end if;
  select * into r from public.dm_premium_match_runs x where x.student_id=actor and x.completed_at is null
    and exists(select 1 from dm_campaign.game_uses c where c.student_id=actor and c.run_id=x.run_id and c.game='word-match') order by x.started_at desc limit 1;
  if found then return public.dm_pwm_status(actor)||jsonb_build_object('seed',r.campaign_seed,'runId',r.run_id,'playedLevel',r.level_no,'replayed',true,'words',(select jsonb_agg(jsonb_build_object('en',english,'tr',turkish)) from public.dm_premium_course_words(least(160,ceil(r.level_no*1.6)::int)) where length(english) between 2 and 14 and length(turkish)<=24));end if;
  if p_level>u.level_no then raise exception 'Bu bölüm henüz açılmadı.'; end if;
  campaign_ticket:=dm_campaign.consume(actor,'word-match',run_key);
    prem:=public.dm_pwm_is_premium(actor);
  if not campaign_ticket and not prem and (public.dm_game_access(actor,'word-match')->>'remaining')::int<=0 then raise exception 'Ücretsiz oyun hakkın bitti. Daha fazla oynamak için Pro ol.'; end if;
  if not campaign_ticket then
  ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900))::int;
  available:=public.dm_pwm_energy(st);
  if not campaign_ticket and available<5 then raise exception 'Oyuna başlamak için 5 enerji gerekli.'; end if;
  update public.students set energy=available-5,
    energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end
    where id=actor;
  insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-5,available-5,'premium-kelime:'||run_key);
  end if;
  insert into public.dm_premium_match_runs(student_id,run_id,premium,level_no,v2) values(actor,run_key,prem,p_level,true);
  if not campaign_ticket and not prem then update public.dm_premium_match_usage set free_used=least(3,free_used+1),updated_at=now() where student_id=actor; end if;
  return public.dm_pwm_status(actor)||jsonb_build_object('seed',(select campaign_seed from public.dm_premium_match_runs where student_id=actor and run_id=run_key),'runId',run_key,'replayed',false,'words',(select jsonb_agg(jsonb_build_object('en',english,'tr',turkish)) from public.dm_premium_course_words(least(160,ceil(p_level*1.6)::int)) where length(english) between 2 and 14 and length(turkish)<=24));
end $function$
;

alter table public.dm_premium_match_runs add column campaign_seed integer not null default (('x'||substr(md5(gen_random_uuid()::text),1,7))::bit(28)::integer);
alter table public.dm_premium_match_runs add column campaign_verified boolean not null default false;
-- Proof is replayed at the edge; this RPC makes proof marking + normal finish atomic.
create function public.dm_campaign_pwm_finish(actor uuid, run_key uuid, p_score integer, p_won boolean, p_moves integer, p_seconds integer)
returns jsonb language plpgsql set search_path='' as $$
begin
 perform 1 from public.students where id=actor for update;
 update public.dm_premium_match_runs set campaign_verified=true where student_id=actor and run_id=run_key and completed_at is null;
 return public.dm_pwm_finish(actor,run_key,p_score,p_won,p_moves,p_seconds);
end $$;
CREATE OR REPLACE FUNCTION public.dm_pwm_status(actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare u public.dm_premium_match_usage; st public.students; prem boolean;
begin
  select * into st from public.students where id=actor and status='approved' and role='student';
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  insert into public.dm_premium_match_usage(student_id) values(actor) on conflict(student_id) do nothing;
  select * into u from public.dm_premium_match_usage where student_id=actor;
  prem:=public.dm_pwm_is_premium(actor);
  return jsonb_build_object('ok',true,'plan',public.dm_plan(actor,'student'),'premium',prem,'freeUsed',u.free_used,'remaining',(public.dm_game_access(actor,'word-match')->>'remaining')::int,
    'campaignRemaining',dm_campaign.remaining(actor,'word-match'),'activeRunId',(select run_id from public.dm_premium_match_runs r where r.student_id=actor and r.completed_at is null and exists(select 1 from dm_campaign.game_uses cu where cu.student_id=actor and cu.run_id=r.run_id and cu.game='word-match') order by started_at desc limit 1),'level',u.level_no,'stars',u.stars,'energy',public.dm_pwm_energy(st),'energyMax',st.energy_max,'gold',st.gold);
end $function$
;
-- Trusted database completion adapters, with no extra browser request per result.
create function dm_campaign.on_game_reward() returns trigger language plpgsql set search_path='' as $$
declare v public.dm_verified_runs; began timestamptz; good int; complete_n int; total int; stopkey text;
begin
 if not dm_campaign.active() then return new;end if;
 if new.game_key like 'konu:%' then
  select started_at into began from public.dm_topic_game_runs where student_id=new.student_id and run_id::text=new.run_id;
  perform dm_campaign.award(new.student_id,'topic:'||new.run_id,'topic',began);return new;
 end if;
 select * into v from public.dm_verified_runs where student_id=new.student_id and run_id=new.run_id and not ranking_only;
 if not found then return new;end if;
 select count(*) filter(where (value->>'complete')::boolean),count(*) filter(where coalesce((value->>'firstCorrect')::boolean,(value->>'correct')::boolean,false)) into complete_n,good from jsonb_each(v.answers);
 total:=jsonb_array_length(v.deck);
 if complete_n<total or total=0 then return new;end if;
 if new.game_key='ba' then
  stopkey:='school:'||v.class_no||':'||v.stop_no;
  if exists(select 1 from public.dm_game_reward_runs r where r.student_id=new.student_id and r.game_key='ba' and r.run_id<>new.run_id and r.class_no=new.class_no and r.units=new.units) then return new;end if;
  perform dm_campaign.award(new.student_id,stopkey,'school',v.created_at);
 elsif good*4>=total*3 then
  perform dm_campaign.award(new.student_id,'solo:'||new.run_id,'solo',v.created_at);
 end if;
 return new;
end $$;
create trigger dm_campaign_game_reward after insert on public.dm_game_reward_runs for each row execute function dm_campaign.on_game_reward();
create function dm_campaign.on_learning() returns trigger language plpgsql set search_path='' as $$
declare began timestamptz;
begin
 if new.completed and new.reward_claimed and not new.replay and (tg_op='INSERT' or not old.reward_claimed) then
  select min(created_at) into began from public.dm_thematic_first_answers where actor_key=new.actor_key and chapter=new.chapter;
  perform dm_campaign.award(new.student_id,'learning:'||new.chapter,'learning',began);
 end if;return new;
end $$;
create trigger dm_campaign_learning after insert or update on public.papi_story_progress for each row execute function dm_campaign.on_learning();
create function dm_campaign.on_practice_reward() returns trigger language plpgsql set search_path='' as $$
declare began timestamptz; activity text;
begin
 if new.key_name like 'practice_reward:plan:%' then
  activity:='plan';
  -- A completion marker can only be inserted by dm_companion_reward after verification.
  began:=new.updated_at;
 elsif new.key_name like 'practice_reward:story:%' then
  activity:='story';
  select updated_at into began from public.extra_data where student_id=new.student_id and key_name='practice_dialogue:'||substr(new.key_name,length('practice_reward:story:')+1)||':'||to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
 else return new;end if;
 perform dm_campaign.award(new.student_id,new.key_name,activity,coalesce(began,now()));return new;
end $$;
create trigger dm_campaign_practice_reward after insert on public.extra_data for each row when(new.key_name like 'practice_reward:%') execute function dm_campaign.on_practice_reward();
create function dm_campaign.on_goal() returns trigger language plpgsql set search_path='' as $$
begin
 if old.result is null and coalesce((new.result->>'passed')::boolean,false) and exists(select 1 from dm_campaign.game_uses where campaign_id='zirve-2026' and student_id=new.student_id and game='word-goal' and run_id=new.run_id) then
 perform dm_campaign.award(new.student_id,'goal:'||new.run_id,'word-goal',new.started_at);end if;return new;
end $$;
create trigger dm_campaign_goal after update of result on public.dm_goal_runs for each row execute function dm_campaign.on_goal();
create function dm_campaign.on_candy() returns trigger language plpgsql set search_path='' as $$
begin
 if old.completed_at is null and new.completed_at is not null and new.won and new.campaign_verified and exists(select 1 from dm_campaign.game_uses where campaign_id='zirve-2026' and student_id=new.student_id and game='word-match' and run_id=new.run_id) then
 perform dm_campaign.award(new.student_id,'candy:'||new.run_id,'word-match',new.started_at);end if;return new;
end $$;
create trigger dm_campaign_candy after update of completed_at on public.dm_premium_match_runs for each row execute function dm_campaign.on_candy();
create function dm_campaign.on_chat() returns trigger language plpgsql set search_path='' as $$
begin
 if old.result is null and coalesce((new.result->>'passed')::boolean,false) then perform dm_campaign.award(new.student_id,'chat:'||new.id,'chat',new.created_at);end if;return new;
end $$;
create trigger dm_campaign_chat after update of result on public.dm_papi_dialogue_runs for each row execute function dm_campaign.on_chat();

-- Default EXECUTE is revoked on every new function, including private helpers.
revoke all on all functions in schema dm_campaign from public,anon,authenticated;
grant execute on all functions in schema dm_campaign to service_role;
revoke all on function public.dm_campaign_join(uuid,text),public.dm_campaign_status(uuid,text),public.dm_campaign_finalize(),public.dm_campaign_approve(uuid),public.dm_campaign_pwm_finish(uuid,uuid,integer,boolean,integer,integer) from public,anon,authenticated;
grant execute on function public.dm_campaign_join(uuid,text),public.dm_campaign_status(uuid,text),public.dm_campaign_finalize(),public.dm_campaign_approve(uuid),public.dm_campaign_pwm_finish(uuid,uuid,integer,boolean,integer,integer) to service_role;
-- One scheduled result job, removed after finalization. 10 Dec 21:00 UTC
-- is 11 Dec 00:00 Europe/Istanbul. No per-user polling or reset job.
do $cron$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('zirve-2026-finalize','0 21 10 12 *',$job$select public.dm_campaign_finalize()$job$);
 end if;
end $cron$;
commit;
