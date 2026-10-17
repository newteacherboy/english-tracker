begin;
do $qa$
declare sid uuid:=gen_random_uuid();runid uuid;initial numeric;final numeric;st jsonb;r jsonb;xp1 int;xp2 int;xp3 int;c int;i int;
begin
 insert into public.students(id,username,password_hash,status,energy,energy_max,energy_updated_at)
 values(sid,'rally-repeat-'||sid,'not-a-login','approved',30,30,now());
 insert into public.extra_data(student_id,key_name,value)
 values(sid,'yo','{"totalXp":5000,"altin":100,"guncelleme":1,"log":{}}');
 select (value->>'totalXp')::numeric into initial from public.extra_data where student_id=sid and key_name='yo';
 for i in 1..3 loop
  runid:=gen_random_uuid();c:=case i when 1 then 7 else 15 end;
  st:=jsonb_build_object('index',case i when 1 then 9 else 15 end,'score',c*100,
    'wrong',case i when 1 then 2 else 0 end,'correct',c,
    'hearts',case i when 1 then 0 else 2 end,'elapsed',180,'answers','[]'::jsonb,
    'combo',0,'bestCombo',0);
  insert into public.dm_rally_runs(id,student_id,class_no,units,difficulty,deck,state,status)
  values(runid,sid,2,array[3],'normal','[]'::jsonb,st,'playing');
  r:=public.dm_rally_finish(sid,runid);
  if i=1 then xp1:=(r#>>'{reward,xp}')::int;
   if (r#>>'{reward,fairPercent}')::int<>35 then raise exception 'Early finish tier wrong';end if;
  elsif i=2 then xp2:=(r#>>'{reward,xp}')::int;
   if xp2<=0 or (r#>>'{reward,fairPercent}')::int<>100 then raise exception 'Higher result failed to gain difference';end if;
  else xp3:=(r#>>'{reward,xp}')::int;
   if xp3<>0 or (r#>>'{reward,reason}')<>'already_practiced' then
    raise exception 'Repeated rally high score farmed XP: %',r->'reward';end if;
  end if;
 end loop;
 select (value->>'totalXp')::numeric into final from public.extra_data where student_id=sid and key_name='yo';
 if final-initial<>xp1+xp2
 or (select sum(xp) from public.dm_game_reward_runs where student_id=sid and game_key='ralli')<>xp1+xp2
 then raise exception 'Best-of-day Rally wallet/ledger diverged';end if;
end $qa$;
rollback;
