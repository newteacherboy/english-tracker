-- [18 Kas 2026] "Öğretmenimle Zirveye!" — 24 Kasım Öğretmenler Günü kampanyası.
-- Kullanıcı kararları:
--  * 20 Kasım – 10 Aralık 2026, sonuçlar 11 Aralık. Eski ve yeni tüm kullanıcılar dahil; yalnız bu tarihlerde kazanılan XP sayılır.
--  * Puan = lig XP defteri (dm_game_reward_runs + ilk kez geçilen konu 80). Günde en fazla 3.500 XP sayılır.
--  * Öğrenci sıralaması bireysel: sınıfı olan da olmayan da aynı listede.
--  * Öğretmen sıralaması: en az 10 öğrencisi olan öğretmenler; puan = sınıftaki TÜM öğrencilerin kampanya XP ortalaması.
--  * Davet: eski ya da yeni hesap; e-posta doğrulanmış + ilk 3 parkur durağı + davetten sonra bir günde 300 XP.
--    10 doğrulanmış davet = 2 gün Pro (otomatik). "Davet Şampiyonları" yalnız gösteri.
--  * Final ödülleri: ilk 2 öğretmen 1 yıl Öğretmen Premium Pro, öğrenci 1–5 3 ay Premium Pro, 6–20 3 ay Pro.
--    Yönetici listeyi görür, istediğini çıkarır, tek tuşla onaylar.
--  * Önce yalnız yönetici görür (public=false). Yönetici panelinden herkese açılır.
-- Sunucu yükü: puanlar 15 dakikada bir toplu hesaplanır (pg_cron), okumalar önbellek tablosundan.

create table if not exists public.dm_campaigns(
 key text primary key,
 title text not null,
 starts_on date not null,
 ends_on date not null,
 results_on date not null,
 public boolean not null default false,
 preview_usernames text[] not null default '{}',
 finalized_at timestamptz,
 refreshed_at timestamptz,
 updated_at timestamptz not null default now()
);
insert into public.dm_campaigns(key,title,starts_on,ends_on,results_on)
values('ogretmenimle-zirveye-2026','Öğretmenimle Zirveye!','2026-11-20','2026-12-10','2026-12-11')
on conflict(key) do nothing;

create table if not exists public.dm_campaign_invite_codes(
 student_id uuid primary key references public.students(id) on delete cascade,
 code text not null unique,
 created_at timestamptz not null default now()
);

create table if not exists public.dm_campaign_invites(
 campaign text not null references public.dm_campaigns(key) on delete cascade,
 invitee_id uuid not null references public.students(id) on delete cascade,
 inviter_id uuid not null references public.students(id) on delete cascade,
 created_at timestamptz not null default now(),
 verified_at timestamptz,
 primary key(campaign,invitee_id),
 check(invitee_id<>inviter_id)
);
create index if not exists dm_campaign_invites_inviter on public.dm_campaign_invites(campaign,inviter_id);

create table if not exists public.dm_campaign_scores(
 campaign text not null references public.dm_campaigns(key) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 xp integer not null default 0,
 updated_at timestamptz not null default now(),
 primary key(campaign,student_id)
);

create table if not exists public.dm_campaign_exclusions(
 campaign text not null references public.dm_campaigns(key) on delete cascade,
 account_id uuid not null,
 account_role text not null check(account_role in ('student','teacher')),
 created_at timestamptz not null default now(),
 primary key(campaign,account_id,account_role)
);

create table if not exists public.dm_campaign_rewards(
 campaign text not null references public.dm_campaigns(key) on delete cascade,
 account_id uuid not null,
 account_role text not null check(account_role in ('student','teacher')),
 kind text not null check(kind in ('invite10','final')),
 rank integer,
 product_key text not null,
 duration text not null,
 granted_at timestamptz not null default now(),
 primary key(campaign,account_id,account_role,kind)
);

do $$ declare t text; begin
 foreach t in array array['dm_campaigns','dm_campaign_invite_codes','dm_campaign_invites','dm_campaign_scores','dm_campaign_exclusions','dm_campaign_rewards'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;

-- ===================== Yardımcılar =====================
create or replace function dm_private.campaign_student_ok(s public.students) returns boolean
language sql immutable set search_path='' as $$
 select s.id is not null and s.status='approved' and s.role='student' and s.frozen_at is null
  and s.username<>'dijimedu_demo' and s.id<>'dcde2026-1015-4000-8000-000000000001'::uuid
  and coalesce(s.profile->>'teacher_portal_guest','')<>'true'
  and s.username !~ ' · (Misafir|Öğretmen Denemesi) [a-f0-9]{8}$'
$$;

create or replace function dm_private.campaign_teacher_label(t public.teachers) returns text
language sql immutable set search_path='' as $$
 select case when coalesce(btrim(t.full_name),'')='' then t.username
  when array_length(regexp_split_to_array(btrim(t.full_name),'\s+'),1)=1 then btrim(t.full_name)
  else (regexp_split_to_array(btrim(t.full_name),'\s+'))[1]||' '||left((regexp_split_to_array(btrim(t.full_name),'\s+'))[array_length(regexp_split_to_array(btrim(t.full_name),'\s+'),1)],1)||'.' end
$$;

-- Oturum: {kind:'student'|'teacher', student_id, teacher_id, admin, guest}
create or replace function dm_private.campaign_session(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ses public.portal_sessions; g public.teacher_portal_access; t public.teachers; s public.students; adm boolean:=false;
begin
 if p_token is null or length(p_token) not between 16 and 1024 then return null; end if;
 select * into ses from public.portal_sessions where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not found or ses.expires_at<=now() then return null; end if;
 if ses.teacher_portal_access_id is not null then
  select * into g from public.teacher_portal_access where id=ses.teacher_portal_access_id;
  if not found or g.state<>'approved' or g.version is distinct from ses.teacher_portal_version then return null; end if;
  select * into t from public.teachers where id=g.teacher_id;
  if not found or t.active is not true or t.frozen_at is not null then return null; end if;
  adm:=t.username='teacher' and t.is_admin is true;
  if ses.role='teacher' then
   return jsonb_build_object('kind','teacher','teacher_id',t.id,'admin',adm);
  end if;
  -- Öğretmen alanındaki oyuncu oturumu: görüntüler ama yarışmaya sayılmaz.
  return jsonb_build_object('kind','student','student_id',ses.student_id,'teacher_id',t.id,'admin',adm,'guest',true);
 end if;
 if ses.role='teacher' and ses.teacher_id is not null then
  select * into t from public.teachers where id=ses.teacher_id;
  if not found or t.active is not true or t.frozen_at is not null then return null; end if;
  return jsonb_build_object('kind','teacher','teacher_id',t.id,'admin',t.username='teacher' and t.is_admin is true);
 end if;
 s:=dm_private.rpc_ogrenci(p_token,'');
 if s.id is null then return null; end if;
 return jsonb_build_object('kind','student','student_id',s.id,'admin',false,'guest',not dm_private.campaign_student_ok(s),'username',s.username);
end $$;

create or replace function dm_private.campaign_bounds(c public.dm_campaigns, out a timestamptz, out b timestamptz)
language sql immutable set search_path='' as $$
 select c.starts_on::timestamp at time zone 'Europe/Istanbul',(c.ends_on+1)::timestamp at time zone 'Europe/Istanbul'
$$;

create or replace function dm_private.campaign_phase(c public.dm_campaigns) returns text
language sql stable set search_path='' as $$
 select case when c.finalized_at is not null then 'results'
  when now()<(dm_private.campaign_bounds(c)).a then 'soon'
  when now()<(dm_private.campaign_bounds(c)).b then 'live' else 'ended' end
$$;

-- Bugün sayılan XP (en fazla 3.500) — yalnız kampanya içinde.
create or replace function dm_private.campaign_today_xp(c public.dm_campaigns, sid uuid) returns integer
language sql stable set search_path='' as $$
 with t as (select date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul' a),
 ev as (
  select r.xp p from public.dm_game_reward_runs r,t where r.student_id=sid and r.xp>0 and r.created_at>=t.a
  union all
  select 80 from (select min(l.completed_at) f from public.lesson_progress l where l.student_id=sid and l.test_success group by l.level,l.category,l.topic_name) x,t where x.f>=t.a
 )
 select case when dm_private.campaign_phase(c)='live' then least(3500,coalesce((select sum(p) from ev),0))::int else 0 end
$$;

-- Hediye hakkı (dm_gift_plan ile aynı defter; yönetici "Verilen hediyeler" listesinde görünür).
create or replace function dm_private.campaign_grant(acct uuid, acct_role text, product text, dur interval, tag text) returns timestamptz
language plpgsql set search_path='' as $$
declare tx uuid; until timestamptz; ref text:='gift:'||tag||':'||acct::text;
begin
 select greatest(now(),coalesce(max(valid_until),now())) into until from public.dm_entitlements
  where account_id=acct and account_role=acct_role and product_key=product and state='active';
 until:=until+dur;
 insert into public.dm_payment_transactions(account_id,account_role,provider,provider_transaction_id,product_key,state,amount_minor,currency,verified_at,valid_until)
 values(acct,acct_role,'web',ref,product,'verified',0,'TRY',now(),until)
 on conflict(provider,provider_transaction_id) do update set state='verified',verified_at=now(),valid_until=excluded.valid_until,product_key=excluded.product_key
 returning id into tx;
 insert into public.dm_entitlements(account_id,account_role,product_key,provider,transaction_id,state,valid_until,updated_at)
 values(acct,acct_role,product,'web',tx,'active',until,now())
 on conflict(account_id,account_role,product_key) do update set provider='web',transaction_id=tx,state='active',valid_until=until,updated_at=now();
 return until;
end $$;

-- ===================== Toplu hesap (15 dk'da bir) =====================
create or replace function dm_private.campaign_refresh(p_key text default 'ogretmenimle-zirveye-2026', p_force boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.dm_campaigns; a timestamptz; b timestamptz; n_scores int; n_verified int:=0; n_rewards int:=0; rr record;
begin
 select * into c from public.dm_campaigns where key=p_key for update;
 if not found then return jsonb_build_object('ok',false,'reason','no_campaign'); end if;
 if c.finalized_at is not null then return jsonb_build_object('ok',true,'skipped','finalized'); end if;
 select x.a,x.b into a,b from dm_private.campaign_bounds(c) x;
 if not p_force and (now()<a or now()>b+interval '2 hours') then return jsonb_build_object('ok',true,'skipped','outside'); end if;

 with st as (select s.id from public.students s where dm_private.campaign_student_ok(s)),
 ev as (
  select r.student_id sid,(r.created_at at time zone 'Europe/Istanbul')::date d,r.xp p
   from public.dm_game_reward_runs r join st on st.id=r.student_id where r.xp>0 and r.created_at>=a and r.created_at<b
  union all
  select x.sid,(x.f at time zone 'Europe/Istanbul')::date,80
   from (select l.student_id sid,min(l.completed_at) f from public.lesson_progress l join st on st.id=l.student_id where l.test_success group by l.student_id,l.level,l.category,l.topic_name) x
   where x.f>=a and x.f<b
 ),
 daily as (select sid,d,least(3500,sum(p)) v from ev group by sid,d),
 tot as (select sid,sum(v)::int xp from daily group by sid)
 insert into public.dm_campaign_scores(campaign,student_id,xp,updated_at)
 select p_key,sid,xp,now() from tot
 on conflict(campaign,student_id) do update set xp=excluded.xp,updated_at=now() where public.dm_campaign_scores.xp is distinct from excluded.xp;
 get diagnostics n_scores=row_count;
 delete from public.dm_campaign_scores x where x.campaign=p_key
  and not exists(select 1 from public.students s where s.id=x.student_id and dm_private.campaign_student_ok(s));

 -- Davet doğrulama
 update public.dm_campaign_invites i set verified_at=now()
 from public.students s
 where i.campaign=p_key and i.verified_at is null and s.id=i.invitee_id and i.created_at<b
  and dm_private.campaign_student_ok(s) and s.email_verified_at is not null
  and (select count(*) from public.level_completions l where l.student_id=s.id and l.mode='buyu')>=3
  and exists(select 1 from (
    select (g.created_at at time zone 'Europe/Istanbul')::date d,sum(g.xp) v from public.dm_game_reward_runs g
    where g.student_id=s.id and g.xp>0 and g.created_at>=(((i.created_at at time zone 'Europe/Istanbul')::date)::timestamp at time zone 'Europe/Istanbul') and g.created_at<b
    group by 1) q where q.v>=300);
 get diagnostics n_verified=row_count;

 -- 10 davet = 2 gün Pro (bir kez)
 for rr in select i.inviter_id from public.dm_campaign_invites i join public.students s on s.id=i.inviter_id
   where i.campaign=p_key and i.verified_at is not null and dm_private.campaign_student_ok(s)
   and not exists(select 1 from public.dm_campaign_rewards w where w.campaign=p_key and w.account_id=i.inviter_id and w.account_role='student' and w.kind='invite10')
   group by i.inviter_id having count(*)>=10 loop
  perform dm_private.campaign_grant(rr.inviter_id,'student','diji_pro',interval '2 days','zirve-davet');
  insert into public.dm_campaign_rewards(campaign,account_id,account_role,kind,product_key,duration) values(p_key,rr.inviter_id,'student','invite10','diji_pro','2 gün');
  n_rewards:=n_rewards+1;
 end loop;

 update public.dm_campaigns set refreshed_at=now() where key=p_key;
 return jsonb_build_object('ok',true,'scores',n_scores,'verified',n_verified,'inviteRewards',n_rewards);
end $$;

-- ===================== Sıralamalar (önbellekten) =====================
create or replace function dm_private.campaign_student_rows(p_key text) returns table(student_id uuid, name text, xp integer, rank bigint, teacher_id uuid)
language sql stable set search_path='' as $$
 select s.id,s.username,x.xp,row_number() over(order by x.xp desc,s.created_at,s.id),s.teacher_id
 from public.dm_campaign_scores x join public.students s on s.id=x.student_id
 where x.campaign=p_key and x.xp>0 and dm_private.campaign_student_ok(s)
  and not exists(select 1 from public.dm_campaign_exclusions e where e.campaign=p_key and e.account_id=s.id and e.account_role='student')
$$;

create or replace function dm_private.campaign_teacher_rows(p_key text) returns table(teacher_id uuid, name text, school text, students bigint, total bigint, avg_xp integer, rank bigint)
language sql stable set search_path='' as $$
 with k as (
  select t.id,dm_private.campaign_teacher_label(t) nm,t.school,count(s.id) n,coalesce(sum(x.xp),0) tot
  from public.teachers t join public.students s on s.teacher_id=t.id and dm_private.campaign_student_ok(s)
  left join public.dm_campaign_scores x on x.campaign=p_key and x.student_id=s.id
  where t.active is true and t.frozen_at is null and t.username<>'teacher'
   and not exists(select 1 from public.dm_campaign_exclusions e where e.campaign=p_key and e.account_id=t.id and e.account_role='teacher')
  group by t.id,t.full_name,t.username,t.school
 )
 select id,nm,school,n,tot,round(tot::numeric/n)::int,row_number() over(order by tot::numeric/n desc,n desc,id)
 from k where n>=10
$$;

create or replace function dm_private.campaign_teacher_stats(p_key text, tid uuid) returns jsonb
language sql stable set search_path='' as $$
 with k as (
  select count(s.id) n,coalesce(sum(x.xp),0) tot from public.students s
  left join public.dm_campaign_scores x on x.campaign=p_key and x.student_id=s.id
  where s.teacher_id=tid and dm_private.campaign_student_ok(s)
 ), r as (select * from dm_private.campaign_teacher_rows(p_key))
 select jsonb_build_object('students',k.n,'need',greatest(0,10-k.n),'eligible',k.n>=10,
  'avg',case when k.n>0 then round(k.tot::numeric/k.n)::int else 0 end,
  'rank',(select rank from r where r.teacher_id=tid),
  'total',(select count(*) from r),
  'toFirst',greatest(0,coalesce((select avg_xp from r where rank=1),0)-case when k.n>0 then round(k.tot::numeric/k.n)::int else 0 end),
  'toPrize',greatest(0,coalesce((select avg_xp from r where rank=2),0)-case when k.n>0 then round(k.tot::numeric/k.n)::int else 0 end),
  'code',(select invite_code from public.teachers where id=tid))
 from k
$$;

-- ===================== İstemci uç noktaları (token ile) =====================
create or replace function public.dm_campaign_status(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ses jsonb; c public.dm_campaigns; sid uuid; tid uuid; me record; prize int; total int; code text; res jsonb; uname text; visible boolean;
begin
 ses:=dm_private.campaign_session(p_token);
 if ses is null then return jsonb_build_object('ok',false,'visible',false); end if;
 select * into c from public.dm_campaigns where key='ogretmenimle-zirveye-2026';
 if not found then return jsonb_build_object('ok',false,'visible',false); end if;
 uname:=ses->>'username';
 visible:=c.public or (ses->>'admin')::boolean or (uname is not null and uname=any(c.preview_usernames));
 if not visible then return jsonb_build_object('ok',true,'visible',false); end if;
 res:=jsonb_build_object('ok',true,'visible',true,'preview',not c.public,'admin',(ses->>'admin')::boolean,'role',ses->>'kind',
  'campaign',jsonb_build_object('key',c.key,'title',c.title,'startsOn',c.starts_on,'endsOn',c.ends_on,'resultsOn',c.results_on,
    'phase',dm_private.campaign_phase(c),'refreshedAt',c.refreshed_at,
    'daysLeft',greatest(0,c.ends_on-(now() at time zone 'Europe/Istanbul')::date+1),
    'daysToStart',greatest(0,c.starts_on-(now() at time zone 'Europe/Istanbul')::date)),
  'cap',3500);
 if ses->>'kind'='teacher' then
  tid:=(ses->>'teacher_id')::uuid;
  return res||jsonb_build_object('teacher',dm_private.campaign_teacher_stats(c.key,tid));
 end if;
 sid:=(ses->>'student_id')::uuid;
 if coalesce((ses->>'guest')::boolean,false) then
  return res||jsonb_build_object('guest',true,'me',jsonb_build_object('xp',0,'rank',null,'today',0,'toPrize',0));
 end if;
 select * into me from dm_private.campaign_student_rows(c.key) x where x.student_id=sid;
 select count(*)::int,coalesce(max(xp) filter(where rank=20),0) into total,prize from dm_private.campaign_student_rows(c.key);
 select x.code into code from public.dm_campaign_invite_codes x where x.student_id=sid;
 select s.teacher_id into tid from public.students s where s.id=sid;
 return res||jsonb_build_object(
  'me',jsonb_build_object('xp',coalesce(me.xp,0),'rank',me.rank,'participants',total,'today',dm_private.campaign_today_xp(c,sid),
    'toPrize',case when me.rank is not null and me.rank<=20 then 0 when total<20 then case when coalesce(me.xp,0)>0 then 0 else 1 end else greatest(1,prize-coalesce(me.xp,0)+1) end),
  'invite',jsonb_build_object('code',code,'goal',10,
    'verified',(select count(*) from public.dm_campaign_invites i where i.campaign=c.key and i.inviter_id=sid and i.verified_at is not null),
    'pending',(select count(*) from public.dm_campaign_invites i where i.campaign=c.key and i.inviter_id=sid and i.verified_at is null),
    'rewarded',exists(select 1 from public.dm_campaign_rewards w where w.campaign=c.key and w.account_id=sid and w.kind='invite10'),
    'invitedBy',(select s.username from public.dm_campaign_invites i join public.students s on s.id=i.inviter_id where i.campaign=c.key and i.invitee_id=sid)),
  'hasTeacher',tid is not null);
end $$;

create or replace function public.dm_campaign_leaderboard(p_token text, p_kind text default 'students') returns jsonb
language plpgsql security definer set search_path='' as $$
declare ses jsonb; c public.dm_campaigns; sid uuid; tid uuid; rows jsonb; mine jsonb;
begin
 ses:=dm_private.campaign_session(p_token);
 if ses is null then return jsonb_build_object('ok',false,'message','Giriş yapmalısın.'); end if;
 select * into c from public.dm_campaigns where key='ogretmenimle-zirveye-2026';
 if not (c.public or (ses->>'admin')::boolean or coalesce(ses->>'username','')=any(c.preview_usernames)) then return jsonb_build_object('ok',false,'message','Kampanya henüz açılmadı.'); end if;
 sid:=case when ses->>'kind'='student' and not coalesce((ses->>'guest')::boolean,false) then (ses->>'student_id')::uuid end;
 tid:=case when ses->>'kind'='teacher' then (ses->>'teacher_id')::uuid end;
 if p_kind='teachers' then
  select coalesce(jsonb_agg(jsonb_build_object('rank',rank,'name',name,'school',school,'students',students,'avg',avg_xp,'me',teacher_id=tid) order by rank),'[]') into rows
   from dm_private.campaign_teacher_rows(c.key) where rank<=30;
  select jsonb_build_object('rank',rank,'name',name,'students',students,'avg',avg_xp) into mine from dm_private.campaign_teacher_rows(c.key) where teacher_id=tid;
 elsif p_kind='invites' then
  select coalesce(jsonb_agg(jsonb_build_object('rank',rk,'name',username,'count',n,'me',inviter_id=sid) order by rk),'[]') into rows from (
   select i.inviter_id,s.username,count(*) n,row_number() over(order by count(*) desc,max(i.verified_at)) rk
   from public.dm_campaign_invites i join public.students s on s.id=i.inviter_id
   where i.campaign=c.key and i.verified_at is not null and dm_private.campaign_student_ok(s)
   group by i.inviter_id,s.username) q where rk<=10;
 else
  select coalesce(jsonb_agg(jsonb_build_object('rank',rank,'name',name,'xp',xp,'me',student_id=sid) order by rank),'[]') into rows
   from dm_private.campaign_student_rows(c.key) where rank<=50;
  select jsonb_build_object('rank',rank,'name',name,'xp',xp) into mine from dm_private.campaign_student_rows(c.key) where student_id=sid;
 end if;
 return jsonb_build_object('ok',true,'kind',p_kind,'rows',rows,'mine',mine,'refreshedAt',c.refreshed_at);
end $$;

create or replace function public.dm_campaign_invite_code(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ses jsonb; sid uuid; v text; i int:=0;
begin
 ses:=dm_private.campaign_session(p_token);
 if ses is null or ses->>'kind'<>'student' or coalesce((ses->>'guest')::boolean,false) then return jsonb_build_object('ok',false,'message','Davet bağlantısı öğrenci hesabıyla alınır.'); end if;
 sid:=(ses->>'student_id')::uuid;
 select code into v from public.dm_campaign_invite_codes where student_id=sid;
 while v is null and i<8 loop
  i:=i+1;
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',1+floor(random()*31)::int,1),'') into v from generate_series(1,6);
  begin
   insert into public.dm_campaign_invite_codes(student_id,code) values(sid,v);
  exception when unique_violation then
   select code into v from public.dm_campaign_invite_codes where student_id=sid;
  end;
 end loop;
 return jsonb_build_object('ok',v is not null,'code',v);
end $$;

create or replace function public.dm_campaign_invite_accept(p_token text, p_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ses jsonb; c public.dm_campaigns; sid uuid; inviter uuid; inviter_name text;
begin
 ses:=dm_private.campaign_session(p_token);
 if ses is null or ses->>'kind'<>'student' or coalesce((ses->>'guest')::boolean,false) then return jsonb_build_object('ok',false,'message','Daveti öğrenci hesabınla kabul edebilirsin.'); end if;
 sid:=(ses->>'student_id')::uuid;
 select * into c from public.dm_campaigns where key='ogretmenimle-zirveye-2026';
 if dm_private.campaign_phase(c) in ('ended','results') then return jsonb_build_object('ok',false,'message','Kampanya sona erdi.'); end if;
 select x.student_id,s.username into inviter,inviter_name from public.dm_campaign_invite_codes x join public.students s on s.id=x.student_id
  where x.code=upper(btrim(coalesce(p_code,''))) and dm_private.campaign_student_ok(s);
 if inviter is null then return jsonb_build_object('ok',false,'message','Davet kodu bulunamadı.'); end if;
 if inviter=sid then return jsonb_build_object('ok',false,'own',true,'message','Kendi davet bağlantını kullanamazsın.'); end if;
 if exists(select 1 from public.dm_campaign_invites where campaign=c.key and invitee_id=sid) then
  return jsonb_build_object('ok',true,'already',true);
 end if;
 insert into public.dm_campaign_invites(campaign,invitee_id,inviter_id) values(c.key,sid,inviter) on conflict do nothing;
 return jsonb_build_object('ok',true,'inviter',inviter_name);
end $$;

-- ===================== Yönetici =====================
create or replace function dm_private.campaign_proposal(c public.dm_campaigns) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object(
  'teachers',coalesce((select jsonb_agg(jsonb_build_object('id',r.teacher_id,'rank',r.rank,'name',r.name,'username',t.username,'fullName',t.full_name,'school',r.school,'students',r.students,'avg',r.avg_xp,
     'product','teacher_premium_pro','duration','1 yıl') order by r.rank)
   from dm_private.campaign_teacher_rows(c.key) r join public.teachers t on t.id=r.teacher_id where r.rank<=2),'[]'),
  'students',coalesce((select jsonb_agg(jsonb_build_object('id',r.student_id,'rank',r.rank,'name',r.name,'xp',r.xp,
     'invites',(select count(*) from public.dm_campaign_invites i where i.campaign=c.key and i.inviter_id=r.student_id and i.verified_at is not null),
     'product',case when r.rank<=5 then 'diji_premium_pro' else 'diji_pro' end,'duration','3 ay') order by r.rank)
   from dm_private.campaign_student_rows(c.key) r where r.rank<=20),'[]'))
$$;

create or replace function public.dm_campaign_admin(p_token text, p_action text, p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare ses jsonb; c public.dm_campaigns; r jsonb; x jsonb; n int:=0; refreshed jsonb;
begin
 ses:=dm_private.campaign_session(p_token);
 if ses is null or not coalesce((ses->>'admin')::boolean,false) then return jsonb_build_object('ok',false,'message','Bu işlem yalnız yönetici hesabına açık.'); end if;
 select * into c from public.dm_campaigns where key='ogretmenimle-zirveye-2026' for update;
 if p_action='set' then
  update public.dm_campaigns set public=coalesce((p_data->>'public')::boolean,public),
   preview_usernames=coalesce((select array_agg(btrim(v)) from jsonb_array_elements_text(p_data->'previewUsernames') v where btrim(v)<>''),case when p_data ? 'previewUsernames' then '{}'::text[] else preview_usernames end),
   updated_at=now() where key=c.key returning * into c;
 elsif p_action='refresh' then
  refreshed:=dm_private.campaign_refresh(c.key,true);
  select * into c from public.dm_campaigns where key=c.key;
 elsif p_action in ('exclude','include') then
  if p_data->>'role' not in ('student','teacher') or (p_data->>'id') is null then return jsonb_build_object('ok',false,'message','Hesap seçilmedi.'); end if;
  if c.finalized_at is not null then return jsonb_build_object('ok',false,'message','Ödüller onaylandı; liste artık değişmez.'); end if;
  if p_action='exclude' then
   insert into public.dm_campaign_exclusions(campaign,account_id,account_role) values(c.key,(p_data->>'id')::uuid,p_data->>'role') on conflict do nothing;
  else
   delete from public.dm_campaign_exclusions where campaign=c.key and account_id=(p_data->>'id')::uuid and account_role=p_data->>'role';
  end if;
 elsif p_action='finalize' then
  if c.finalized_at is not null then return jsonb_build_object('ok',false,'message','Ödüller zaten onaylandı.'); end if;
  if dm_private.campaign_phase(c)<>'ended' then return jsonb_build_object('ok',false,'message','Ödüller kampanya bittikten sonra (11 Aralık) onaylanabilir.'); end if;
  perform dm_private.campaign_refresh(c.key,true);
  r:=dm_private.campaign_proposal(c);
  for x in select * from jsonb_array_elements(r->'teachers') loop
   perform dm_private.campaign_grant((x->>'id')::uuid,'teacher','teacher_premium_pro',interval '12 months','zirve-final');
   insert into public.dm_campaign_rewards(campaign,account_id,account_role,kind,rank,product_key,duration) values(c.key,(x->>'id')::uuid,'teacher','final',(x->>'rank')::int,'teacher_premium_pro','1 yıl') on conflict do nothing;
   n:=n+1;
  end loop;
  for x in select * from jsonb_array_elements(r->'students') loop
   perform dm_private.campaign_grant((x->>'id')::uuid,'student',x->>'product',interval '3 months','zirve-final');
   insert into public.dm_campaign_rewards(campaign,account_id,account_role,kind,rank,product_key,duration) values(c.key,(x->>'id')::uuid,'student','final',(x->>'rank')::int,x->>'product','3 ay') on conflict do nothing;
   n:=n+1;
  end loop;
  update public.dm_campaigns set finalized_at=now(),updated_at=now() where key=c.key returning * into c;
 elsif p_action<>'get' then
  return jsonb_build_object('ok',false,'message','Bilinmeyen işlem.');
 end if;
 return jsonb_build_object('ok',true,'granted',n,'refresh',refreshed,
  'campaign',jsonb_build_object('public',c.public,'previewUsernames',to_jsonb(c.preview_usernames),'phase',dm_private.campaign_phase(c),'startsOn',c.starts_on,'endsOn',c.ends_on,'finalizedAt',c.finalized_at,'refreshedAt',c.refreshed_at),
  'counts',jsonb_build_object(
    'participants',(select count(*) from dm_private.campaign_student_rows(c.key)),
    'teachers',(select count(*) from dm_private.campaign_teacher_rows(c.key)),
    'invites',(select count(*) from public.dm_campaign_invites where campaign=c.key),
    'verifiedInvites',(select count(*) from public.dm_campaign_invites where campaign=c.key and verified_at is not null),
    'inviteRewards',(select count(*) from public.dm_campaign_rewards where campaign=c.key and kind='invite10')),
  'proposal',dm_private.campaign_proposal(c),
  'excluded',coalesce((select jsonb_agg(jsonb_build_object('id',e.account_id,'role',e.account_role,'name',coalesce(s.username,t.username)))
    from public.dm_campaign_exclusions e left join public.students s on e.account_role='student' and s.id=e.account_id left join public.teachers t on e.account_role='teacher' and t.id=e.account_id
    where e.campaign=c.key),'[]'),
  'rewards',coalesce((select jsonb_agg(jsonb_build_object('role',w.account_role,'kind',w.kind,'rank',w.rank,'product',w.product_key,'duration',w.duration,'name',coalesce(s.username,t.username),'at',w.granted_at) order by w.kind,w.rank)
    from public.dm_campaign_rewards w left join public.students s on w.account_role='student' and s.id=w.account_id left join public.teachers t on w.account_role='teacher' and t.id=w.account_id
    where w.campaign=c.key),'[]'));
end $$;

-- ===================== Yetkiler ve zamanlama =====================
revoke all on function dm_private.campaign_student_ok(public.students),dm_private.campaign_teacher_label(public.teachers),dm_private.campaign_session(text),
 dm_private.campaign_bounds(public.dm_campaigns),dm_private.campaign_phase(public.dm_campaigns),dm_private.campaign_today_xp(public.dm_campaigns,uuid),
 dm_private.campaign_grant(uuid,text,text,interval,text),dm_private.campaign_refresh(text,boolean),dm_private.campaign_student_rows(text),
 dm_private.campaign_teacher_rows(text),dm_private.campaign_teacher_stats(text,uuid),dm_private.campaign_proposal(public.dm_campaigns)
 from public,anon,authenticated;
revoke all on function public.dm_campaign_status(text),public.dm_campaign_leaderboard(text,text),public.dm_campaign_invite_code(text),
 public.dm_campaign_invite_accept(text,text),public.dm_campaign_admin(text,text,jsonb) from public;
grant execute on function public.dm_campaign_status(text),public.dm_campaign_leaderboard(text,text),public.dm_campaign_invite_code(text),
 public.dm_campaign_invite_accept(text,text),public.dm_campaign_admin(text,text,jsonb) to anon,authenticated,service_role;

do $$ begin
 perform cron.unschedule('dm-campaign-refresh') where exists(select 1 from cron.job where jobname='dm-campaign-refresh');
 perform cron.schedule('dm-campaign-refresh','*/15 * * * *',$cron$select dm_private.campaign_refresh('ogretmenimle-zirveye-2026')$cron$);
end $$;
