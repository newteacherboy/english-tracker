-- Mağazadan enerji paketi satın alma: İstanbul günü başına en fazla 3 kez.
-- Tekrar gönderilen aynı istek (aynı request_key) sınıra sayılmaz; önceki sonucu döner.
CREATE OR REPLACE FUNCTION public.dm_energy_shop_buy(actor uuid, request_key text, pack_amount integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare price integer; st public.students; v jsonb; balance numeric; available integer; ticks integer; already public.dm_energy_shop_purchases;
 day_start timestamptz; bought_today integer;
begin
 if actor is null or request_key is null or length(request_key) not between 12 and 100 or pack_amount not in (5,10,15) then raise exception 'Geçersiz enerji paketi'; end if;
 price:=case pack_amount when 5 then 100 when 10 then 130 when 15 then 180 end;
 select * into st from public.students where id=actor for update;
 if not found then raise exception 'Öğrenci bulunamadı'; end if;
 select * into already from public.dm_energy_shop_purchases where student_id=actor and dm_energy_shop_purchases.request_key=dm_energy_shop_buy.request_key;
 if found then return jsonb_build_object('ok',true,'duplicate',true,'energy',st.energy,'gold',st.gold,'added',already.energy_amount,'price',already.gold_price); end if;
 day_start:=((now() at time zone 'Europe/Istanbul')::date)::timestamp at time zone 'Europe/Istanbul';
 select count(*) into bought_today from public.dm_energy_shop_purchases where student_id=actor and created_at>=day_start;
 if bought_today>=3 then raise exception 'Bugün en fazla 3 kez enerji alabilirsin. Yarın yine gel!'; end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo' for update;
 if v is null then raise exception 'Öğrenci ekonomisi bulunamadı'; end if;
 balance:=greatest(0,coalesce((v->>'altin')::numeric,0));
 ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900));
 available:=least(st.energy_max,st.energy+ticks);
 if available+pack_amount>st.energy_max then raise exception 'Enerji kapasitesi aşılıyor'; end if;
 if balance<price then raise exception 'Yetersiz altın'; end if;
 insert into public.dm_energy_shop_purchases(student_id,request_key,energy_amount,gold_price) values(actor,request_key,pack_amount,price);
 update public.students set energy=available+pack_amount,energy_updated_at=case when available=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end,gold=balance-price where id=actor;
 update public.extra_data set value=jsonb_set(v,'{altin}',to_jsonb(balance-price)),updated_at=now() where student_id=actor and key_name='yo';
 insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,pack_amount,available+pack_amount,'dm_energy_shop:'||request_key);
 return jsonb_build_object('ok',true,'duplicate',false,'energy',available+pack_amount,'gold',balance-price,'added',pack_amount,'price',price,'remainingToday',2-bought_today);
end $function$;
