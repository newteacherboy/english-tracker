-- iOS (1.1+) ödüllü reklam birimleri de SSV ile ödül alabilsin. Android birimleri aynen geçerli.
-- Enerji: Android 2306894202, iOS 7162953841 · Altın: Android 7589517182, iOS 5948935360
do $$
declare def text;
begin
  def := pg_get_functiondef('public.dm_ad_claim(uuid,text,text,integer,timestamptz)'::regprocedure);
  if position('7162953841' in def) > 0 then return; end if;
  def := replace(def,
    $a$ or p_unit not in (expected,'ca-app-pub-5025780881593375/'||expected)$a$,
    $b$ or p_unit not in (expected,'ca-app-pub-5025780881593375/'||expected,
        case i.kind when 'energy' then '7162953841' else '5948935360' end,
        'ca-app-pub-5025780881593375/'||case i.kind when 'energy' then '7162953841' else '5948935360' end)$b$);
  if position('7162953841' in def) = 0 then raise exception 'dm_ad_claim beklenen yapıda değil'; end if;
  execute def;
end $$;
