-- REVIEW/STAGING ONLY. Full function definition, not a live text patch.
-- Requires reward-success-policy-v2.sql. Do not deploy separately from the
-- coordinated reward release and the tested wallet-trigger schema.
begin;

create table if not exists public.dm_topic_game_results_v2 (
  student_id uuid not null references public.students(id),
  run_id uuid not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (student_id, run_id)
);
alter table public.dm_topic_game_results_v2 enable row level security;
revoke all on public.dm_topic_game_results_v2 from public, anon, authenticated;
grant select, insert on public.dm_topic_game_results_v2 to service_role;

create or replace function public.dm_topic_game_finish(actor uuid, run_key uuid, picks jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $topic$
declare
  r public.dm_topic_game_runs;
  v jsonb; previous jsonb; award jsonb; result jsonb;
  i integer; c integer := 0; n integer; x integer := 0; g integer := 0;
  used integer; ver bigint; passed boolean := false;
  day text := to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
  reason text := 'accuracy'; prior_scope text;
begin
  if actor is null or run_key is null then raise exception 'Geçersiz oyun oturumu.'; end if;
  -- One lock covers both the wallet and the quota across different run IDs.
  perform 1 from public.students where id=actor for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
  if v is null then raise exception 'Hesap bilgileri hazır değil.'; end if;
  select a.result into previous from public.dm_topic_game_results_v2 a
    where a.student_id=actor and a.run_id=run_key;
  if found then
    -- Return the same receipt after a lost response, with the current wallet.
    return previous || jsonb_build_object('duplicate',true,'yo',v);
  end if;
  -- Pre-migration receipts must not be paid again.
  select jsonb_build_object('ok',true,'duplicate',true,'xp',p.xp,'gold',p.gold,
      'sebep','duplicate','yo',v) into previous
    from public.dm_game_reward_runs p where p.student_id=actor
    and p.run_id=run_key::text and p.game_key like 'konu:%';
  if found then return previous; end if;
  select * into r from public.dm_topic_game_runs
    where run_id=run_key and student_id=actor for update;
  if not found then
    return jsonb_build_object('ok',false,'sebep','missing','mesaj','Oyun oturumu bulunamadı.');
  end if;
  if r.ranking_only then
    result := public.dm_teacher_topic_game_finish(actor,run_key,picks);
    -- The teacher implementation records ranking, never wallet rewards.
    if coalesce((result->>'ok')::boolean,false) then
      result := result || jsonb_build_object('xp',0,'gold',0,'rankingOnly',true);
      insert into public.dm_topic_game_results_v2 values(actor,run_key,result-'yo',now());
    end if;
    return result;
  end if;
  if r.expires_at<=clock_timestamp() then
    result := jsonb_build_object('ok',false,'sebep','expired','xp',0,'gold',0,'passed',false);
    insert into public.dm_topic_game_results_v2 values(actor,run_key,result,now());
    delete from public.dm_topic_game_runs where run_id=run_key and student_id=actor;
    return result;
  end if;
  n := r.question_count;
  if n is null or n<=0 or jsonb_typeof(r.answer_key) is distinct from 'array'
    or jsonb_array_length(r.answer_key)<>n then raise exception 'Geçersiz sunucu soru kaydı.'; end if;
  if jsonb_typeof(picks) is distinct from 'array' then raise exception 'Geçersiz cevaplar.'; end if;
  if jsonb_array_length(picks)<>n then raise exception 'Geçersiz cevaplar.'; end if;
  for i in 0..n-1 loop
    if jsonb_typeof(picks->i) is distinct from 'string'
      or jsonb_typeof(r.answer_key->i->'allowed') is distinct from 'array'
      or r.answer_key->i->>'correct' is null
      or not (r.answer_key->i->'allowed' @> jsonb_build_array(picks->i))
      then raise exception 'Geçersiz cevaplar.'; end if;
    if picks->>i=r.answer_key->i->>'correct' then c:=c+1; end if;
  end loop;
  award := public.dm_success_reward_v2(c,n,false,null,90,25);
  passed := (award->>'passed')::boolean;
  select count(*) into used from public.dm_game_reward_runs
    where student_id=actor and topic_key=r.topic_key and game_key='konu:'||r.game and xp>0
      and created_at>=day::date::timestamp at time zone 'Europe/Istanbul'
      and created_at<(day::date+1)::timestamp at time zone 'Europe/Istanbul';
  if extract(epoch from clock_timestamp()-r.started_at)<n*1.5 then
    reason:='too_fast'; passed:=false;
  elsif not passed then reason:='accuracy';
  elsif used>=3 then reason:='daily_limit';
  else
    x:=(award->>'xp')::integer; g:=(award->>'gold')::integer; reason:='awarded';
  end if;
  -- Failed attempts have immutable receipts too, and never consume reward quota.
  insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold,topic_key)
    values(actor,run_key::text,'konu:'||r.game,0,array[0],x,g,r.topic_key);
  if x>0 or g>0 then
    ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,
      coalesce((v->>'guncelleme')::bigint,0)+1);
    v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,
      'altin',coalesce((v->>'altin')::numeric,0)+g,
      'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
    v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun'
      else jsonb_build_object('tarih',day,'xp',0) end);
    v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
    v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));
    v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
    prior_scope:=coalesce(current_setting('diji.topic_game',true),'');
    perform set_config('diji.topic_game','1',true);
    update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
    update public.students set gold=(v->>'altin')::numeric where id=actor;
    perform set_config('diji.topic_game',prior_scope,true);
    select value into v from public.extra_data where student_id=actor and key_name='yo';
  end if;
  result:=jsonb_build_object('ok',true,'dogru',c,'toplam',n,'yuzde',round(c*100.0/n,2),
    'passed',passed,'xp',x,'gold',g,'sebep',reason,
    'xpHakkiKaldi',greatest(0,3-used-case when x>0 then 1 else 0 end));
  insert into public.dm_topic_game_results_v2 values(actor,run_key,result,now());
  delete from public.dm_topic_game_runs where run_id=run_key and student_id=actor;
  return result || jsonb_build_object('yo',v);
end;
$topic$;
revoke all on function public.dm_topic_game_finish(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.dm_topic_game_finish(uuid,uuid,jsonb) to service_role;
commit;
