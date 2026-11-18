-- [18 Kas 2026] Kullanıcı kararı: "10 davet = Pro" ödülü kaldırıldı.
-- Davetler yalnız ödül sıralamasına giriş şartı (5 doğrulanmış davet) ve Davet Şampiyonları listesi için sayılır.
do $migration$
declare definition text; a int; b int; patched text;
begin
 select pg_get_functiondef('dm_private.campaign_refresh(text,boolean)'::regprocedure) into strict definition;
 a:=strpos(definition,' for rr in select i.inviter_id from public.dm_campaign_invites');
 if a=0 then return; end if; -- zaten kaldırılmış
 b:=strpos(substr(definition,a),' end loop;');
 if b=0 then raise exception 'Unexpected campaign_refresh definition'; end if;
 patched:=substr(definition,1,a-1)||substr(definition,a+b-1+length(' end loop;'));
 execute patched;
end $migration$;
