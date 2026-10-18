begin;
create table if not exists public.dm_mail_league_snapshots(
 captured_at timestamptz primary key default now(),week_start date not null,board jsonb not null);
alter table public.dm_mail_league_snapshots enable row level security;
revoke all on public.dm_mail_league_snapshots from anon,authenticated;
create or replace function public.dm_mail_capture_league() returns void language plpgsql set search_path='' as $f$
begin
 insert into public.dm_mail_league_snapshots(week_start,board)
 values(date_trunc('week',now() at time zone 'Europe/Istanbul')::date,public.dm_progress_league()) on conflict do nothing;
 delete from public.dm_mail_league_snapshots where captured_at<now()-interval '15 days';
end $f$;
create or replace function public.dm_mail_escape(v text) returns text language sql immutable set search_path='' as $f$
 select replace(replace(replace(coalesce(v,''),'&','&amp;'),'<','&lt;'),'>','&gt;') $f$;
create or replace function public.dm_mail_league_card(sid uuid,moment text) returns text language plpgsql set search_path='' as $f$
declare w date:=date_trunc('week',now() at time zone 'Europe/Istanbul')::date;
 board jsonb:=public.dm_progress_league(); prior jsonb; me jsonb; oldme jsonb; passed text; overtakers text;
 result public.dm_weekly_results%rowtype; tier text; reward int:=0; card text; changed text:=''; enabled boolean;
begin
 select x into me from jsonb_array_elements(board) x where x->>'id'=sid::text;
 select s.board into prior from public.dm_mail_league_snapshots s where s.week_start=w and s.captured_at<=now()-interval '1 hour' order by s.captured_at desc limit 1;
 select x into oldme from jsonb_array_elements(coalesce(prior,'[]')) x where x->>'id'=sid::text;
 if me is null then card:='<p>Lig sıralamasına katılmak için 5. seviyeye ulaş. Bir sonraki adım seni bekliyor!</p>';
 else
 tier:=case me->>'league' when 'sampiyon' then 'Şampiyonlar Ligi' when 'super' then 'Süper Lig' else 'Yerel Lig' end;
 if oldme is not null and oldme->>'league'=me->>'league' then
 select string_agg(public.dm_mail_escape(name),', ') into overtakers from (
 select n->>'name' name from jsonb_array_elements(board) n join jsonb_array_elements(prior) o on n->>'id'=o->>'id'
 where n->>'league'=me->>'league' and o->>'league'=oldme->>'league'
 and (n->>'rank')::int<(me->>'rank')::int and (o->>'rank')::int>(oldme->>'rank')::int order by (n->>'rank')::int limit 3) z;
 select string_agg(public.dm_mail_escape(name),', ') into passed from (
 select n->>'name' name from jsonb_array_elements(board) n join jsonb_array_elements(prior) o on n->>'id'=o->>'id'
 where n->>'league'=me->>'league' and o->>'league'=oldme->>'league'
 and (n->>'rank')::int>(me->>'rank')::int and (o->>'rank')::int<(oldme->>'rank')::int order by (n->>'rank')::int limit 3) z;
 if overtakers is not null then changed:=changed||'<p>⚡ <b>'||overtakers||'</b> seni geçti! Kısa bir ders veya oyunla yeniden yükselmek için güzel bir fırsat.</p>';end if;
 if passed is not null then changed:=changed||'<p>🚀 Harika ilerleme! <b>'||passed||'</b> adlı oyuncuyu/oyuncuları geçtin. Kendi öğrenme ritmini koru!</p>';end if;
 if (me->>'rank')::int<>(oldme->>'rank')::int then changed:=changed||'<p>Önceki kayıt: <b>'||(oldme->>'rank')||'.</b> → Şimdi: <b>'||(me->>'rank')||'.</b></p>';end if;
 elsif oldme is not null then changed:='<p>🌟 Ligin değişti! Güncel ligin: <b>'||tier||'</b>.</p>';
 end if;
 select coalesce(bool_and(f.enabled),true) into enabled from public.dm_release_flags f where f.code in ('lig','lig_odul');
 if enabled and (me->>'xp')::numeric>0 then
 if me->>'league'='sampiyon' and (me->>'rank')::int<=10 then reward:=(array[500,350,250,180,140,110,90,75,60,50])[(me->>'rank')::int];
 elsif me->>'league'='super' and (me->>'rank')::int<=2 then reward:=(array[30,20])[(me->>'rank')::int];end if;end if;
 card:='<p>🏆 <b>'||tier||'</b> · Sıran: <b>'||(me->>'rank')||'.</b> · Haftalık XP: <b>'||(me->>'xp')||'</b></p>';
 if reward>0 then card:=card||'<p>🪙 Bu sırayla haftayı tamamlarsan: <b>'||reward||' altın</b>. Bu tahmindir; kesin ödül hafta sonunda belirlenir.</p>';
 elsif me->>'league'='yerel' and (me->>'xp')::numeric>0 then card:=card||'<p>🏅 Bu haftaki katılımınla katılım rozeti adayı oldun.</p>';
 else card:=card||'<p>Yeni kelimeler öğrenerek ilerle; mevcut sıran için altın ödülü görünmüyor.</p>';end if;
 end if;
 if moment='monday' then
 select * into result from public.dm_weekly_results r where r.student_id=sid and r.week_start=w-7;
 if found then card:='<p>📋 <b>Geçen haftanın kesin sonucu:</b> '||
 case result.league when 'sampiyon' then 'Şampiyonlar Ligi' when 'super' then 'Süper Lig' else 'Yerel Lig' end||
' · <b>'||result.rank_no||'. sıra</b> · '||result.xp||' XP</p><p>🎁 Kesinleşen ödül: <b>'||result.gold||' altın · '||result.energy||' enerji</b>'||
 case when coalesce((result.summary->>'participationBadge')::boolean,false) then ' ve katılım rozeti' else '' end||
 case when result.awarded_at is null and (result.gold>0 or result.energy>0) then '. Ödülünü almak için uygulamaya gir.' else '.' end||'</p>'||card;
 end if;end if;
 return '<div style="background:#fff7df;border:2px solid #f4bd43;border-radius:16px;padding:18px;margin:16px 0"><h3>🏆 Sana özel lig özeti</h3>'||card||changed||'</div>';
end $f$;
do $patch$
declare r record; d text;
begin
 for r in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('dm_mail_slot','dm_papi_remaining_mail_slots','dm_papi_progress_queue','dm_papi_league_mail_prepare') loop
 d:=pg_get_functiondef(r.oid); d:=replace(d,'280','240');d:=replace(d,'250','240');
 if r.proname='dm_papi_progress_queue' then
 d:=replace(d,'interval ''72 hours''','interval ''7 days''');
 d:=replace(d,'limit cap','limit least(cap,15)');
 d:=replace(d,'and (pref.last_queued_at',E'and not exists(select 1 from public.dm_papi_progress_outbox recent where recent.student_id=pref.student_id and ((recent.sent_at at time zone ''Europe/Istanbul'')::date >= v_day-1 or (recent.sent_at is null and recent.attempts<5)))\n and (pref.last_queued_at');
 d:=replace(d,'html_content,''Papi ilerleme özeti:', 'replace(html_content,''<h2 style='',''<h2 style=''),''Papi ilerleme özeti:');
 -- Add the personal league card ahead of the mail footer.
 d:=replace(d,'insert into public.dm_papi_progress_outbox(',E'html_content:=replace(html_content,''<h2 style="'',public.dm_mail_league_card(p.student_id,''progress'')||''<h2 style="'');\n insert into public.dm_papi_progress_outbox(');
 elsif r.proname='dm_papi_league_mail_prepare' then
 d:=replace(d,'insert into public.dm_papi_progress_outbox(',E'content:=replace(content,''<p>📖'',public.dm_mail_league_card(p.student_id,moment)||''<p>📖'');\n insert into public.dm_papi_progress_outbox(');
 end if;
 execute d;
 end loop;
end $patch$;
create or replace function public.dm_papi_take_due()
 returns table(mail_id bigint,student_id uuid,to_email text,subject text,html text,text_body text)
 language plpgsql set search_path='' as $f$
declare chosen bigint;
begin
 perform pg_advisory_xact_lock(741918);
 update public.dm_papi_progress_outbox q set attempts=5,error='Permission absent or withdrawn'
 where q.sent_at is null and q.attempts<5 and not public.dm_progress_mail_allowed(q.student_id,q.to_email);
 update public.dm_papi_progress_outbox q
 set send_after=greatest(q.send_after,((r.last_day+2)::timestamp at time zone 'Europe/Istanbul')+interval '8 hours')
 from (select s.student_id,max((s.sent_at at time zone 'Europe/Istanbul')::date) last_day
 from public.dm_papi_progress_outbox s where s.sent_at is not null group by s.student_id) r
 where q.student_id=r.student_id and q.sent_at is null and q.attempts<5 and q.send_after<=now()
 and r.last_day>=(now() at time zone 'Europe/Istanbul')::date-1;
 select q.id into chosen from public.dm_papi_progress_outbox q
 where q.sent_at is null and q.attempts<5 and q.send_after<=now()
 and not exists(select 1 from public.dm_papi_progress_outbox other where other.student_id=q.student_id and other.id<>q.id and other.claimed_at>now()-interval '30 minutes' and other.sent_at is null)
 order by case when q.kind like 'papi_league_%' then 0 else 1 end,q.send_after,q.id limit 1 for update skip locked;
 if chosen is null then return;end if;
 return query update public.dm_papi_progress_outbox q set attempts=q.attempts+1,claimed_at=now(),send_after=now()+interval '30 minutes'
 where q.id=chosen returning q.id,q.student_id,q.to_email,q.subject,q.html,q.text_body;
end $f$;
revoke all on function public.dm_mail_capture_league(),public.dm_mail_escape(text),public.dm_mail_league_card(uuid,text) from public,anon,authenticated;
grant execute on function public.dm_mail_capture_league(),public.dm_mail_escape(text),public.dm_mail_league_card(uuid,text) to service_role;
select public.dm_mail_capture_league();
select cron.schedule('dm-mail-league-snapshot','55 * * * *','select public.dm_mail_capture_league();');
commit;
do $fix$ declare d text; begin
 d:=pg_get_functiondef('public.dm_papi_league_mail_prepare(text)'::regprocedure);
 d:=replace(d,'kind text;','mail_kind text;');
 d:=replace(d,'kind:=''papi_league_''','mail_kind:=''papi_league_''');
 d:=replace(d,'o.kind=kind','o.kind=mail_kind');
 d:=replace(d,',kind,today_tr,',',mail_kind,today_tr,');
 d:=replace(d,'p.email,heading,content,','p.email,heading,replace(content,chr(92)||chr(34),chr(34)),');
 execute d;
 d:=pg_get_functiondef('public.dm_papi_progress_queue()'::regprocedure);
 d:=replace(d,'limit least(cap,15)','limit least(cap,greatest(0,15-(select count(*)::int from public.dm_papi_progress_outbox daily where daily.kind=''papi_progress'' and daily.report_date=v_day)))');
 d:=replace(d,'replace(html_content,''<h2 style='',''<h2 style='')','replace(html_content,chr(92)||chr(34),chr(34))');
 execute d;
end $fix$;
begin;
drop index public.dm_papi_progress_outbox_unique;
create unique index dm_papi_progress_outbox_unique on public.dm_papi_progress_outbox(student_id,recipient_kind,lower(to_email),report_date,kind);
do $fix$ declare d text; begin
 d:=pg_get_functiondef('public.dm_papi_league_mail_prepare(text)'::regprocedure);
 d:=replace(d,'if cap<=0 then return 0; end if;','cap:=100000;');
 execute d;
end $fix$;
commit;