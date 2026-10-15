-- Publish explicit server-issued game rewards and the final weekly league result.
create function public.dm_feed_reward_result() returns trigger language plpgsql security invoker set search_path='' as $$
declare label text; games jsonb:='{"ky":"Kelime Laboratuvarı","kelime":"Kelime Laboratuvarı","ba":"Macera Haritası","kp":"Kelime Modu","jp":"Risk Balonları","jeopardy":"Risk Balonları","hafiza":"Hafıza Sandığı","bosluk":"Eksik Harf","asmaca":"Harf Avı","eslestirme":"Eşini Bul","yagmur":"Hız Fırtınası","dikte":"Kulak Dedektifi","tren":"Kelime Treni","cumle":"Cümle Ustası","harfbahcesi":"Harf Bahçesi","kelimebul":"Şifre Kırıcı"}';
begin
 if tg_table_name='dm_game_reward_runs' then
  if new.xp<=0 and new.gold<=0 then return new;end if;
  label:=coalesce(games->>new.game_key,'Oyun');
  perform public.dm_feed_publish(new.student_id,'game-reward:'||new.run_id,'reward_earned',label||' etkinliğinde '||new.xp||' XP ve '||new.gold||' altın kazandı!','✨',jsonb_build_object('game',new.game_key,'xp',new.xp,'gold',new.gold));
 else
  if new.xp<=0 then return new;end if;
  label:=case new.league when 'sampiyon' then 'Şampiyonlar Ligi' when 'super' then 'Süper Lig' else 'Yerel Lig' end;
  perform public.dm_feed_publish(new.student_id,'weekly-result:'||new.week_start,'weekly_result',label||' haftasını '||new.rank_no||'. sırada tamamladı!'||case when new.gold>0 or new.energy>0 then ' Ödülü: '||new.gold||' altın, '||new.energy||' enerji.' else '' end,'🏆',jsonb_build_object('league',new.league,'rank',new.rank_no,'gold',new.gold,'energy',new.energy));
 end if;
 return new;
end $$;
revoke all on function public.dm_feed_reward_result() from public,anon,authenticated;
grant execute on function public.dm_feed_reward_result() to service_role;
create trigger dm_feed_game_rewards after insert on public.dm_game_reward_runs for each row execute function public.dm_feed_reward_result();
create trigger dm_feed_weekly_results after insert on public.dm_weekly_results for each row execute function public.dm_feed_reward_result();
