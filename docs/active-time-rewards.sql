create table if not exists public.dm_active_time (
 student_id uuid primary key references public.students(id) on delete cascade,
 seconds bigint not null default 0 check(seconds>=0),
 base_chest bigint not null default 0,
 claimed bigint[] not null default '{}',
 last_tick timestamptz not null default now(),
 last_run text not null default '', last_seq bigint not null default 0
);
alter table public.dm_active_time enable row level security;
revoke all on public.dm_active_time from public,anon,authenticated;
grant all on public.dm_active_time to service_role;
create or replace function public.dm_active_time_tick(actor uuid,run_key text,seq bigint,active_seconds int,claim_index bigint default 0)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.dm_active_time; seed bigint; credit int; gold int:=0; quality int; v jsonb; ver bigint;
begin
 if run_key is null or length(run_key) not between 8 and 100 or seq is null or seq<0 or active_seconds is null or active_seconds not between 0 and 45 or claim_index is null or claim_index<0 then raise exception 'Geçersiz süre isteği';end if;
 select coalesce(total_seconds,0) into seed from public.students where id=actor for update;
 if not found then raise exception 'Öğrenci bulunamadı';end if;
 insert into public.dm_active_time(student_id,seconds,base_chest) values(actor,greatest(0,seed),greatest(0,seed)/6000) on conflict do nothing;
 select * into r from public.dm_active_time where student_id=actor for update;
 if active_seconds>0 and not(r.last_run=run_key and seq<=r.last_seq) then
  credit:=least(active_seconds,45,greatest(0,floor(extract(epoch from now()-r.last_tick))::int));
  r.seconds:=r.seconds+credit;r.last_tick:=now();r.last_run:=run_key;r.last_seq:=seq;
  update public.dm_active_time set seconds=r.seconds,last_tick=r.last_tick,last_run=r.last_run,last_seq=r.last_seq where student_id=actor;
  update public.students set total_seconds=greatest(coalesce(total_seconds,0),r.seconds) where id=actor;
 end if;
 if claim_index>0 then
  if claim_index<=r.base_chest or claim_index>r.seconds/6000 then raise exception 'Bu sandık henüz hazır değil';end if;
  if not(claim_index=any(r.claimed)) then
   quality:=least(4,((claim_index-r.base_chest-1)/5)::int);gold:=(array[20,40,75,120,200])[quality+1];
   select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
   if v is null then raise exception 'Hesap bilgileri hazır değil';end if;
   ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
   v:=v||jsonb_build_object('altin',coalesce((v->>'altin')::numeric,0)+gold,'guncelleme',ver,'dmRewardVersion',ver);
   update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
   update public.students set gold=(v->>'altin')::numeric where id=actor;
   r.claimed:=array_append(r.claimed,claim_index);update public.dm_active_time set claimed=r.claimed where student_id=actor;
  end if;
 end if;
 return jsonb_build_object('ok',true,'seconds',r.seconds,'stars',r.seconds/600,'baseChest',r.base_chest,'chestCount',r.seconds/6000,'claimed',to_jsonb(r.claimed),'gold',gold,'yo',v);
end $$;
revoke all on function public.dm_active_time_tick(uuid,text,bigint,int,bigint) from public,anon,authenticated;
grant execute on function public.dm_active_time_tick(uuid,text,bigint,int,bigint) to service_role;
