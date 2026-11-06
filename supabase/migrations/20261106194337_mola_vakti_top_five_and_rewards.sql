begin;

-- Existing ten-chapter progress carries forward to the five new chapters.
alter table public.dm_break_runs
 drop constraint dm_break_runs_gold_check,
 drop constraint dm_break_runs_start_chapter_check,
 drop constraint dm_break_runs_chapter_check,
 drop constraint dm_break_runs_highest_chapter_check,
 add check (gold between 0 and 500),
 add check (start_chapter between 1 and 15),
 add check (chapter between 1 and 15),
 add check (highest_chapter between 1 and 15);
alter table public.dm_break_chapters drop constraint dm_break_chapters_chapter_check,
 add check (chapter between 1 and 15);
alter table public.dm_break_progress drop constraint dm_break_progress_unlocked_chapter_check,
 add check (unlocked_chapter between 1 and 15);
alter table public.dm_break_checkpoints drop constraint dm_break_checkpoints_chapter_check,
 add check (chapter between 1 and 15);

insert into public.dm_break_chapters(game,chapter,title,theme,goal) values
('kosu',11,'Mercan Koyu','mercan',11500),
('kosu',12,'Gökkuşağı Tepesi','gokkusagi',12000),
('kosu',13,'Ay Bahçesi','ay',12500),
('kosu',14,'Kutup Işıkları','kutup',13000),
('kosu',15,'Altın Gökyüzü','altin',13500),
('zipla',11,'Mercan Koyu','mercan',4600),
('zipla',12,'Gökkuşağı Tepesi','gokkusagi',5300),
('zipla',13,'Ay Bahçesi','ay',6100),
('zipla',14,'Kutup Işıkları','kutup',7000),
('zipla',15,'Altın Gökyüzü','altin',8000),
('patlat',11,'Mercan Koyu','mercan',140000),
('patlat',12,'Gökkuşağı Tepesi','gokkusagi',165000),
('patlat',13,'Ay Bahçesi','ay',195000),
('patlat',14,'Kutup Işıkları','kutup',230000),
('patlat',15,'Altın Gökyüzü','altin',270000);

update public.dm_break_progress
set unlocked_chapter=11, completed_all=false
where completed_all and unlocked_chapter=10;

create function pg_temp.dm_mola_patch(signature regprocedure, old_text text, new_text text)
returns void language plpgsql as $$
declare definition text := pg_get_functiondef(signature);
begin
 if strpos(definition,old_text)=0 then
  raise exception 'Unexpected definition for %', signature;
 end if;
 execute replace(definition,old_text,new_text);
end $$;

select pg_temp.dm_mola_patch('public.dm_break_start(uuid,uuid,text,integer)','chosen>10','chosen>15');
select pg_temp.dm_mola_patch('public.dm_teacher_break_start(uuid,uuid,text,integer)','chosen>10','chosen>15');
select pg_temp.dm_mola_patch('public.dm_teacher_break_start(uuid,uuid,text,integer)','unlocked:=10','unlocked:=15');
select pg_temp.dm_mola_patch('public.dm_break_checkpoint(uuid,uuid,integer,integer,integer)','least(10,r.chapter+1)','least(15,r.chapter+1)');
select pg_temp.dm_mola_patch('public.dm_break_checkpoint(uuid,uuid,integer,integer,integer)','r.chapter=10','r.chapter=15');
select pg_temp.dm_mola_patch('public.dm_teacher_break_checkpoint(uuid,uuid,integer,integer,integer)','least(10,r.chapter+1)','least(15,r.chapter+1)');
select pg_temp.dm_mola_patch('public.dm_teacher_break_checkpoint(uuid,uuid,integer,integer,integer)','r.chapter=10','r.chapter=15');

-- The existing validation still bounds awards by the submitted score and time.
select pg_temp.dm_mola_patch('public.dm_break_reward(text,integer,integer,integer)','return least(case game_code when ''kosu'' then 5 when ''zipla'' then 4 else 3 end,','return least(500,');
select pg_temp.dm_mola_patch('public.dm_break_finish(uuid,uuid,integer,integer,integer)',
 ' ver:=greatest(',
 ' g:=least(g,case when r.completed_all and r.chapter=15 then 500 else least(r.highest_chapter,14)*500/15 end);
 ver:=greatest(');
-- Keep the legacy signature so cached clients can still open the same board.
create or replace function public.dm_break_ranking(actor uuid,game_code text,period text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if game_code is null or game_code not in ('kosu','zipla','patlat') then
  raise exception 'Geçersiz sıralama.';
 end if;
 if not exists(select 1 from public.students where id=actor and status='approved' and role='student') then
  raise exception 'Öğrenci oturumu gerekli.';
 end if;
 with best as (
  select distinct on (r.student_id)
   r.student_id,s.username,r.score,r.highest_chapter,coalesce(r.finished_at,r.created_at) recorded_at
  from public.dm_break_runs r join public.students s on s.id=r.student_id
  where r.game=game_code and (r.status='finished' or r.checkpoint_score>0)
   and s.status='approved' and s.role='student'
   and s.id<>'dcde2026-1015-4000-8000-000000000001'::uuid and lower(s.username)<>'dijimedu_demo'
  order by r.student_id,r.highest_chapter desc,r.score desc,recorded_at,r.id
 ), top_five as (
  select * from best order by highest_chapter desc,score desc,recorded_at,student_id limit 5
 ), ranked as (
  select row_number() over(order by highest_chapter desc,score desc,recorded_at,student_id) rank,
   username name,score,highest_chapter chapter,student_id=actor mine
  from top_five
 )
 select jsonb_build_object('ok',true,'liste',coalesce(jsonb_agg(to_jsonb(ranked) order by rank),'[]'::jsonb))
 into result from ranked;
 return result;
end $$;

commit;
