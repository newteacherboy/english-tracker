begin;
create table public.dm_topic_game_runs (
 run_id uuid primary key, student_id uuid not null references public.students(id) on delete cascade,
 topic_key text not null, game text not null check(game in ('kova','cark','balon','dy','sohbet','durum')),
 answer_key jsonb not null, question_count int not null check(question_count between 8 and 10),
 started_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '30 minutes'
);
alter table public.dm_topic_game_runs enable row level security;
revoke all on public.dm_topic_game_runs from public,anon,authenticated;
grant all on public.dm_topic_game_runs to service_role;
create index dm_topic_game_expiry on public.dm_topic_game_runs(expires_at);
create index dm_topic_game_owner on public.dm_topic_game_runs(student_id);
-- A nullable receipt label, never answers, scores, or a game history table.
alter table public.dm_game_reward_runs add column topic_key text;
create index dm_topic_game_daily on public.dm_game_reward_runs(student_id,topic_key,game_key,created_at) where game_key like 'konu:%';
-- Existing triggers keep exactly their previous behavior outside this transaction-local scope.
create or replace trigger dm_feed_game_rewards after insert on public.dm_game_reward_runs
 for each row when(new.game_key not like 'konu:%') execute function public.dm_feed_reward_result();
create or replace trigger dm_feed_achievements after insert or update on public.extra_data
 for each row when(new.key_name='yo' and coalesce(current_setting('diji.topic_game',true),'')<>'1') execute function public.dm_feed_achievement();
create or replace trigger dm_01_feed_rank before insert or update on public.extra_data
 for each row when(coalesce(current_setting('diji.topic_game',true),'')<>'1') execute function public.dm_feed_rank_change();
create or replace trigger dm_zz_feed_rank after insert or update on public.extra_data
 for each row when(coalesce(current_setting('diji.topic_game',true),'')<>'1') execute function public.dm_feed_rank_change();


-- Topic receipts must not consume the legacy games' first-three daily multiplier.
-- Preserve both deployed functions byte-for-byte except this added exclusion.
do $legacy$
declare signature text; definition text; marker text:='and game_key<>''ba'' and xp>0';
begin
 foreach signature in array array[
  'public.dm_game_reward_claim(uuid,text,text,integer,integer[],integer,integer,numeric,boolean,integer,integer)',
  'public.dm_rally_finish(uuid,uuid)'
 ] loop
  if to_regprocedure(signature) is null then continue;end if;
  select pg_get_functiondef(to_regprocedure(signature)) into definition;
  if position(marker in definition)=0 then raise exception 'Legacy daily reward filter changed: %',signature;end if;
  execute replace(definition,marker,'and game_key<>''ba'' and game_key not like ''konu:%'' and xp>0');
 end loop;
end $legacy$;

create function public.dm_topic_game_finish(actor uuid,run_key uuid,picks jsonb)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.dm_topic_game_runs; v jsonb; i int; c int:=0; n int; x int:=0; used int; ver bigint;
 day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');reason text:='accuracy'; prior_scope text;
begin
 -- Serialize both wallet writes and daily quota checks across simultaneous runs.
 perform 1 from public.students where id=actor for update;
 if not found then raise exception 'Öğrenci oturumu gerekli.';end if;
 select * into r from public.dm_topic_game_runs where run_id=run_key and student_id=actor for update;
 if not found then return jsonb_build_object('ok',false,'sebep','missing','mesaj','Oyun oturumu bulunamadı veya tamamlandı.');end if;
 if r.expires_at<=clock_timestamp() then
  delete from public.dm_topic_game_runs where run_id=run_key;
  return jsonb_build_object('ok',false,'sebep','expired','mesaj','Oyun oturumunun süresi doldu.');
 end if;
 if jsonb_typeof(picks) is distinct from 'array' or jsonb_array_length(picks)<>r.question_count then raise exception 'Geçersiz cevaplar.';end if;
 n:=r.question_count;
 for i in 0..n-1 loop
  if jsonb_typeof(picks->i) is distinct from 'string' or not (r.answer_key->i->'allowed' @> jsonb_build_array(picks->i)) then raise exception 'Geçersiz cevaplar.';end if;
  if picks->>i=r.answer_key->i->>'correct' then c:=c+1;end if;
 end loop;
 select count(*) into used from public.dm_game_reward_runs where student_id=actor and topic_key=r.topic_key
 and game_key='konu:'||r.game and xp>0
 and created_at>=day::date::timestamp at time zone 'Europe/Istanbul'
 and created_at<(day::date+1)::timestamp at time zone 'Europe/Istanbul';
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Hesap bilgileri hazır değil.';end if;
 if used>=3 then reason:='daily_limit';
 elsif extract(epoch from clock_timestamp()-r.started_at)<n*1.5 then reason:='too_fast';
 elsif c*100>=n*80 then x:=least(70,public.dm_game_xp_cap());reason:='awarded';end if;
 if x>0 then
  insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold,topic_key)
  values(actor,run_key::text,'konu:'||r.game,0,array[0],x,0,r.topic_key);
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
  v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
  v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
  v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));
  v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
  prior_scope:=coalesce(current_setting('diji.topic_game',true),'');
  perform set_config('diji.topic_game','1',true);
  update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
  perform set_config('diji.topic_game',prior_scope,true);
  select value into v from public.extra_data where student_id=actor and key_name='yo';
 end if;
 delete from public.dm_topic_game_runs where run_id=run_key;
 delete from public.dm_topic_game_runs where expires_at<=now();
 return jsonb_build_object('ok',true,'dogru',c,'toplam',n,'yuzde',round(c*100.0/n),'xp',x,'xpHakkiKaldi',greatest(0,3-used-case when x>0 then 1 else 0 end),'sebep',reason,'yo',v);
end $$;
revoke all on function public.dm_topic_game_finish(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.dm_topic_game_finish(uuid,uuid,jsonb) to service_role;
comment on table public.dm_topic_game_runs is 'Ephemeral answer verification only. Deleted on finish or expiry; never a result history.';
commit;
