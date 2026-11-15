begin;
do $$
declare actor uuid; other uuid; offer uuid; offer2 uuid; ad uuid; d jsonb; before_limit int; after_limit int;
begin
 select id into actor from public.students where status='approved' and role='student' and frozen_at is null
 and username<>'dijimedu_demo' and coalesce(profile->>'teacher_portal_guest','false')='false'
 order by created_at limit 1 for update;
 if actor is null then raise exception 'No approved account for rollback-only quota verification'; end if;
 select id into other from public.students where id<>actor and status='approved' and role='student' and frozen_at is null
 and username<>'dijimedu_demo' and coalesce(profile->>'teacher_portal_guest','false')='false' limit 1;
 before_limit:=(public.dm_game_access(actor,'papizzle')->>'limit')::int;
 insert into dm_ad_rewards.premium_offers(student_id,game) values(actor,'papizzle') returning id into offer;
 d:=public.dm_premium_ad_offer(actor,'papizzle','redeem',offer);
 if d->>'claimed'<>'false' then raise exception 'Unverified video granted a play'; end if;
 insert into dm_ad_rewards.intents(student_id,kind,request_key,created_at,claimed_at,transaction_id,added)
 values(actor,'energy',gen_random_uuid(),clock_timestamp(),clock_timestamp(),'qa-'||gen_random_uuid(),0) returning id into ad;
 d:=public.dm_premium_ad_offer(actor,'papizzle','redeem',offer);
 if d->>'claimed'<>'true' then raise exception 'Verified proof did not grant play'; end if;
 if public.dm_plan(actor,'student')<>'premium_pro' and (d->>'limit')::int<>before_limit+1 then raise exception 'Quota did not increase by one'; end if;
 after_limit:=(d->>'limit')::int;
 d:=public.dm_premium_ad_offer(actor,'papizzle','redeem',offer);
 if d->>'duplicate'<>'true' or (d->>'limit')::int<>after_limit then raise exception 'Replay granted duplicate quota'; end if;
 begin
  perform public.dm_premium_ad_offer(actor,'word-goal','redeem',offer);
  raise exception 'Wrong game was accepted';
 exception when raise_exception then if sqlerrm='Wrong game was accepted' then raise; end if; end;
 if other is not null then
  begin
   perform public.dm_premium_ad_offer(other,'papizzle','redeem',offer);
   raise exception 'Wrong account was accepted';
  exception when raise_exception then if sqlerrm='Wrong account was accepted' then raise; end if; end;
 end if;
 insert into dm_ad_rewards.premium_offers(student_id,game,created_at)
 values(actor,'word-goal',clock_timestamp()-interval '1 minute') returning id into offer2;
 d:=public.dm_premium_ad_offer(actor,'word-goal','redeem',offer2);
 if d->>'claimed'<>'false' then raise exception 'Same proof reused in a second game'; end if;
end $$;
rollback;
