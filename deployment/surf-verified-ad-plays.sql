begin;
alter table dm_ad_rewards.premium_offers drop constraint premium_offers_game_check;
alter table dm_ad_rewards.premium_offers add constraint premium_offers_game_check check (game in ('word-match','papizzle','cloud-flight','word-blocks','tower','word-goal','rally','duel-live','duel-papi','dalga-sorfu'));
do $patch$
declare src text;
begin
 src:=pg_get_functiondef('public.dm_premium_ad_offer(uuid,text,text,uuid)'::regprocedure);
 if position('surf-verified-ad-v1' in src)>0 then return; end if;
 if position('''word-goal'',''rally'') or game_key is null' in src)=0
 or position('access:=public.dm_game_access(actor,game_key);' in src)=0
 or position('if (access->>''remaining'')::int>0 then' in src)=0
 or position('return public.dm_game_access(actor,game_key)||jsonb_build_object' in src)=0
 or position('and not exists(select 1 from dm_ad_rewards.premium_offers used where used.ad_id=i.id)' in src)=0
 then raise exception 'Unexpected offer contract; stop surf migration'; end if;
 src:=replace(src,'''word-goal'',''rally'') or game_key is null','''word-goal'',''rally'',''dalga-sorfu'') or game_key is null');
 src:=replace(src,'access:=public.dm_game_access(actor,game_key);','access:=case when game_key=''dalga-sorfu'' then jsonb_build_object(''remaining'',0) else public.dm_game_access(actor,game_key) end; /* surf-verified-ad-v1 */');
 src:=replace(src,'return public.dm_game_access(actor,game_key)||jsonb_build_object','return (case when game_key=''dalga-sorfu'' then ''{}''::jsonb else public.dm_game_access(actor,game_key) end)||jsonb_build_object');
 src:=replace(src,'and not exists(select 1 from dm_ad_rewards.premium_offers used where used.ad_id=i.id)','and (game_key<>''dalga-sorfu'' or i.play_offer_id=o.id) and not exists(select 1 from dm_ad_rewards.premium_offers used where used.ad_id=i.id)');
 execute src;
end $patch$;
commit;
