-- Successful levels scale until the last quarter, when the full reward applies.
create function public.dm_premium_level_reward(p_level integer, p_total integer)
returns table(xp integer, gold integer)
language sql immutable strict set search_path = '' as $$
  with rate as (
    select case when p_total<=1 then 1::numeric else
      least(1, greatest(0, (p_level-1)::numeric / greatest(1, (p_total::bigint*3)/4)))
    end as progress
  )
  select 20 + round(165*progress)::integer, 5 + round(40*progress)::integer from rate;
$$;

-- Route length follows the same distinct active words and batch sizes used by start.
create function public.dm_premium_route_levels(p_repeated_slot integer)
returns integer
language sql stable set search_path = '' as $$
  with bank as (
    select count(distinct (class_no, lower(trim(english)))) as words
    from public.word_bank
    where active and class_no between 1 and 8 and trim(english)<>'' and trim(turkish)<>''
  ), opening as (
    select n, sum(public.dm_cloud_level_size(n) - case when n>=2 then p_repeated_slot else 0 end)
      over(order by n) as covered
    from generate_series(1,7) as n
  )
  select greatest(1, coalesce(min(n) filter (where covered>=words),
    7 + ceil(greatest(0,words-max(covered))::numeric / (20-p_repeated_slot))::integer))
  from opening cross join bank group by words;
$$;

revoke all on function public.dm_premium_level_reward(integer,integer), public.dm_premium_route_levels(integer)
  from public, anon, authenticated;
grant execute on function public.dm_premium_level_reward(integer,integer), public.dm_premium_route_levels(integer)
  to service_role;

create or replace function public.dm_pwm_finish(actor uuid, run_key uuid, p_score integer, p_won boolean, p_moves integer, p_seconds integer)
returns jsonb language plpgsql set search_path to '' as $$
declare r public.dm_premium_match_runs; u public.dm_premium_match_usage; st public.students; v jsonb; elapsed numeric;
  s int:=0; best int; x int; g int; ver bigint; day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_premium_match_runs where student_id=actor and run_id=run_key for update;
  if not found or not r.v2 then raise exception 'Oyun bulunamadı.'; end if;
  if r.completed_at is not null then
    select value into v from public.extra_data where student_id=actor and key_name='yo';
    return public.dm_pwm_status(actor)||jsonb_build_object('runId',run_key,'duplicate',true,'won',r.won,'stars',r.stars,'xp',r.xp,'gold',r.gold,'score',r.score,'yo',v);
  end if;
  elapsed:=extract(epoch from clock_timestamp()-r.started_at);
  if p_score is null or p_score<0 or p_score>public.dm_pwm_star(r.level_no,1)*8+30000 or p_seconds is null or p_seconds<0
     or p_seconds>elapsed+3 or p_moves is null or p_moves<0 or p_moves>60 then raise exception 'Oyun sonucu doğrulanamadı.'; end if;
  if p_won and (p_seconds<8 or p_moves<1) then raise exception 'Oyun sonucu doğrulanamadı.'; end if;
  select * into u from public.dm_premium_match_usage where student_id=actor for update;
  best:=coalesce((u.stars->>r.level_no::text)::int,0);
  if p_won then
    s:=case when p_score>=public.dm_pwm_star(r.level_no,3) then 3 when p_score>=public.dm_pwm_star(r.level_no,2) then 2 else 1 end;
    select xp,gold into x,g from public.dm_premium_level_reward(r.level_no,100);
    if best>=s then x:=round(x*0.5); g:=round(g*0.5); end if;
    update public.dm_premium_match_usage set stars=jsonb_set(stars,array[r.level_no::text],to_jsonb(greatest(best,s))),
      level_no=case when r.level_no=level_no then least(100,level_no+1) else level_no end, updated_at=now() where student_id=actor;
  else
    x:=10; g:=2; -- her oyun ödül kazandırır: küçük teselli
  end if;
  select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
  if v is not null and (x>0 or g>0) then
    ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
    v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
    v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
    v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
    v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));
    v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
    update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
    update public.students set gold=(v->>'altin')::numeric where id=actor;
    select value into v from public.extra_data where student_id=actor and key_name='yo';
    insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values(actor,run_key::text,'premiumkelime',0,'{}',x,g);
  elsif v is null then x:=0; g:=0;
  end if;
  update public.dm_premium_match_runs set completed_at=now(),score=p_score,stars=s,won=p_won,xp=x,gold=g where student_id=actor and run_id=run_key;
  return public.dm_pwm_status(actor)||jsonb_build_object('runId',run_key,'duplicate',false,'won',p_won,'stars',s,'xp',x,'gold',g,'score',p_score,'yo',v);
end $$;

create or replace function public.dm_papizzle_finish(actor uuid, run_key uuid, selections integer[])
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; r public.dm_papizzle_runs; v jsonb; outcome jsonb;
  total integer; pick integer; correct integer:=0; wrong integer:=0; streak integer:=0; score integer:=0;
  matched integer[]:='{}'; x integer:=0; g integer:=0; ver bigint;
  day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_papizzle_runs where student_id=actor and run_id=run_key;
  if not found then raise exception 'Oyun bulunamadı.'; end if;
  if r.result is not null then
    return public.dm_papizzle_status(actor)||r.result||
      jsonb_build_object('yo',(select value from public.extra_data where student_id=actor and key_name='yo'));
  end if;
  total:=cardinality(r.target_order);
  if selections is null or cardinality(selections) not between total and 256
    or extract(epoch from clock_timestamp()-r.started_at)<total*0.25 then
    raise exception 'Oyun sonucu doğrulanamadı.';
  end if;
  foreach pick in array selections loop
    if pick is null or pick not between 0 and total-1 or pick=any(matched) or correct=total then
      raise exception 'Oyun sonucu doğrulanamadı.';
    end if;
    if pick=r.target_order[correct+1] then
      correct:=correct+1;
      streak:=streak+1;
      score:=score+20+case when streak%3=0 then 10 else 0 end;
      matched:=array_append(matched,pick);
    else
      wrong:=wrong+1;
      streak:=0;
      score:=score-5;
    end if;
  end loop;
  if correct<>total then raise exception 'Oyun sonucu doğrulanamadı.'; end if;

  update public.dm_papizzle_progress set level_no=level_no+1 where student_id=actor and level_no=r.level_no;
  if found then
    -- Papizzle can continue indefinitely; its reward scale uses 40 levels.
    select xp,gold into x,g from public.dm_premium_level_reward(r.level_no,40);
  end if;
  select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
  if v is not null and (x>0 or g>0) then
    ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
    v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
    v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
    v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
    v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));
    v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
    update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
    update public.students set gold=(v->>'altin')::numeric where id=actor;
    select value into v from public.extra_data where student_id=actor and key_name='yo';
    insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values(actor,run_key::text,'premiumpapizzle',0,'{}',x,g);
  elsif v is null then x:=0; g:=0;
  end if;

  outcome:=jsonb_build_object('playedLevel',r.level_no,'correct',correct,'wrong',wrong,'score',score,'xp',x,'gold',g);
  update public.dm_papizzle_runs set result=outcome where student_id=actor and run_id=run_key;
  return public.dm_papizzle_status(actor)||outcome||jsonb_build_object('yo',v);
end $$;

create or replace function public.dm_cloud_finish(actor uuid, run_key uuid, selections integer[])
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; r public.dm_cloud_runs; v jsonb; outcome jsonb;
  total int; played int; fifth_wrong int; crashed boolean; correct int; wrong int; score int; s int; x int; g int; ver bigint;
  day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_cloud_runs where student_id=actor and run_id=run_key;
  if not found then raise exception 'Oyun bulunamadı.'; end if;
  if r.result is not null then
    return public.dm_cloud_status(actor)||r.result||
      jsonb_build_object('yo',(select value from public.extra_data where student_id=actor and key_name='yo'));
  end if;
  total:=jsonb_array_length(r.rounds);
  played:=cardinality(selections);
  if selections is null or played not between 1 and total or array_lower(selections,1)<>1
    or exists(select 1 from unnest(selections) as pick where pick is null or pick not between -1 and 2) then
    raise exception 'Oyun sonucu doğrulanamadı.';
  end if;
  select ord::int into fifth_wrong
    from jsonb_array_elements(r.rounds) with ordinality as rows(q,ord)
    where ord<=played and selections[ord::int]>=0 and selections[ord::int]<>(q->>'answer')::int
    order by ord offset 4 limit 1;
  crashed:=fifth_wrong is not null;
  if (not crashed and played<>total)
    or extract(epoch from clock_timestamp()-r.started_at)<least(played,coalesce(fifth_wrong,played))*2.5-2 then
    raise exception 'Oyun sonucu doğrulanamadı.';
  end if;
  played:=coalesce(fifth_wrong,played);
  select count(*) filter(where selections[ord::int]=(q->>'answer')::int),
         count(*) filter(where selections[ord::int]>=0 and selections[ord::int]<>(q->>'answer')::int)
    into correct,wrong from jsonb_array_elements(r.rounds) with ordinality as rows(q,ord) where ord<=played;
  score:=correct*20-wrong*10;
  s:=case when crashed then 0 when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 when correct>0 then 1 else 0 end;
  if s=0 then
    x:=10; g:=2;
  else
    select xp,gold into x,g from public.dm_premium_level_reward(r.level_no,
      case when r.has_more then greatest(r.level_no+1,public.dm_premium_route_levels(0)) else r.level_no end);
    if exists(select 1 from public.dm_cloud_progress where student_id=actor
        and (level_no>r.level_no or (level_no=r.level_no and completed))) then
      x:=round(x*0.5); g:=round(g*0.5);
    end if;
  end if;
  if not crashed then
    update public.dm_cloud_progress
      set level_no=level_no+case when r.has_more then 1 else 0 end,
          word_offset=word_offset+total, completed=not r.has_more
      where student_id=actor and level_no=r.level_no and not completed;
  end if;
  select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
  if v is not null and (x>0 or g>0) then
    ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
    v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
    v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
    v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
    v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));
    v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
    update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
    update public.students set gold=(v->>'altin')::numeric where id=actor;
    select value into v from public.extra_data where student_id=actor and key_name='yo';
    insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values(actor,run_key::text,'premiumbulut',0,'{}',x,g);
  elsif v is null then x:=0; g:=0;
  end if;

  outcome:=jsonb_build_object('playedLevel',r.level_no,'correct',correct,'wrong',wrong,
    'total',total,'played',played,'crashed',crashed,'hasMore',r.has_more and not crashed,'score',score,'stars',s,'xp',x,'gold',g);
  update public.dm_cloud_runs set result=outcome where student_id=actor and run_id=run_key;
  return public.dm_cloud_status(actor)||outcome||jsonb_build_object('yo',v);
end $$;

create or replace function public.dm_blocks_finish(actor uuid, run_key uuid, selections integer[])
returns jsonb language plpgsql set search_path to '' as $$
declare st public.students; r public.dm_blocks_runs; v jsonb; outcome jsonb;
  total int; played int; crashed boolean:=false; correct int:=0; wrong int:=0;
  board int[]:=array_fill(0,array[10]); anchor int; bits int; tall boolean; bottom int; rows int:=0; score int; s int; x int; g int; ver bigint;
  cells int[]:=array_fill(0,array[30]); cell int; neighbor int; round_data jsonb; previous jsonb;
  good boolean; same_word boolean; same_color boolean; bonus int:=0;
  day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
begin
  select * into st from public.students where id=actor and status='approved' and role='student' for update;
  if not found then raise exception 'Öğrenci oturumu gerekli.'; end if;
  select * into r from public.dm_blocks_runs where student_id=actor and run_id=run_key;
  if not found then raise exception 'Oyun bulunamadı.'; end if;
  if r.result is not null then
    return public.dm_blocks_status(actor)||r.result||
      jsonb_build_object('yo',(select value from public.extra_data where student_id=actor and key_name='yo'));
  end if;
  total:=jsonb_array_length(r.rounds);
  played:=cardinality(selections);
  if selections is null or played not between 1 and total or array_lower(selections,1)<>1
    or exists(select 1 from unnest(selections) as pick where pick is null or pick not between 0 and 5) then
    raise exception 'Oyun sonucu doğrulanamadı.';
  end if;
  for i in 1..played loop
    anchor:=selections[i]%3;
    tall:=r.level_no>=4 and i%3=0;
    if selections[i]>=3 and not tall then raise exception 'Geçersiz blok.'; end if;
    bits:=1<<anchor;
    if selections[i]>=3 then
      bits:=bits | (1<<(case when anchor=2 then 1 else anchor+1 end));
      tall:=false;
    end if;
    round_data:=r.rounds->(i-1);
    good:=anchor=(round_data->>'answer')::int;
    if good then correct:=correct+1; else wrong:=wrong+1; end if;
    bottom:=9;
    while bottom>1 and (board[bottom-1]&bits)=0 loop bottom:=bottom-1; end loop;
    if bottom+(case when tall then 1 else 0 end)>8 then
      crashed:=true;
    else
      same_word:=false;
      same_color:=false;
      for y in bottom..(bottom+case when tall then 1 else 0 end) loop
        for x_pos in 0..2 loop
          continue when (bits&(1<<x_pos))=0;
          cell:=(y-1)*3+x_pos+1;
          foreach neighbor in array array[case when x_pos>0 then cells[cell-1] end,
                                          case when x_pos<2 then cells[cell+1] end] loop
            if good and neighbor>0 and neighbor<i and round_data ? 'color' then
              previous:=r.rounds->(neighbor-1);
              same_word:=same_word or lower(previous->>'en')=lower(round_data->>'en');
              same_color:=same_color or (previous->>'color')=(round_data->>'color');
            end if;
          end loop;
          cells[cell]:=case when good then i else -i end;
        end loop;
      end loop;
      bonus:=bonus+(case when same_word then 15 else 0 end)+(case when same_color then 5 else 0 end);
      board[bottom]:=board[bottom]|bits;
      if tall then board[bottom+1]:=board[bottom+1]|bits; end if;
      for row_no in reverse 8..1 loop
        if board[row_no]=7 then
          board:=coalesce(board[1:row_no-1],'{}'::int[])||board[row_no+1:10]||0;
          cells:=coalesce(cells[1:(row_no-1)*3],'{}'::int[])||cells[row_no*3+1:30]||array[0,0,0];
          rows:=rows+1;
        end if;
      end loop;
    end if;
    crashed:=crashed or wrong>=5;
    if crashed and i<>played then raise exception 'Oyun sonucu doğrulanamadı.'; end if;
  end loop;
  if not crashed and played<>total then raise exception 'Oyun sonucu doğrulanamadı.'; end if;
  score:=correct*20-wrong*10+bonus;
  s:=case when crashed then 0 when correct*100>=total*90 then 3 when correct*100>=total*70 then 2 when correct>0 then 1 else 0 end;
  if s=0 then
    x:=10; g:=2;
  else
    select xp,gold into x,g from public.dm_premium_level_reward(r.level_no,
      case when r.has_more then greatest(r.level_no+1,public.dm_premium_route_levels(1)) else r.level_no end);
    if exists(select 1 from public.dm_blocks_progress where student_id=actor
        and (level_no>r.level_no or (level_no=r.level_no and completed))) then
      x:=round(x*0.5); g:=round(g*0.5);
    end if;
  end if;
  if not crashed then
    update public.dm_blocks_progress
      set level_no=level_no+case when r.has_more then 1 else 0 end,
          word_offset=word_offset+(select count(*)::int from jsonb_array_elements(r.rounds) q where not (q ? 'repeat')), completed=not r.has_more
      where student_id=actor and level_no=r.level_no and not completed;
  end if;
  select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
  if v is not null and (x>0 or g>0) then
    ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
    v:=v||jsonb_build_object('totalXp',coalesce((v->>'totalXp')::numeric,0)+x,'altin',coalesce((v->>'altin')::numeric,0)+g,'guncelleme',ver,'dmRewardVersion',ver,'dmProgressProtocol',1);
    v:=jsonb_set(v,'{xpGun}',case when v#>>'{xpGun,tarih}'=day then v->'xpGun' else jsonb_build_object('tarih',day,'xp',0) end);
    v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(coalesce((v#>>'{xpGun,xp}')::numeric,0)+x));
    v:=jsonb_set(v,'{log}',coalesce(v->'log','{}'));
    v:=jsonb_set(v,array['log',day],to_jsonb(coalesce((v#>>array['log',day])::numeric,0)+x));
    update public.extra_data set value=v,updated_at=now() where student_id=actor and key_name='yo';
    update public.students set gold=(v->>'altin')::numeric where id=actor;
    select value into v from public.extra_data where student_id=actor and key_name='yo';
    insert into public.dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values(actor,run_key::text,'premiumblok',0,'{}',x,g);
  elsif v is null then x:=0; g:=0;
  end if;

  outcome:=jsonb_build_object('playedLevel',r.level_no,'correct',correct,'wrong',wrong,
    'total',total,'played',played,'rows',rows,'bonus',bonus,'crashed',crashed,'hasMore',r.has_more and not crashed,'score',score,'stars',s,'xp',x,'gold',g);
  update public.dm_blocks_runs set result=outcome where student_id=actor and run_id=run_key;
  return public.dm_blocks_status(actor)||outcome||jsonb_build_object('yo',v);
end $$;
