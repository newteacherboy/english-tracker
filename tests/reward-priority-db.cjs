const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
function functionSQL(file,name){
 const source=fs.readFileSync(file,'utf8'),match=new RegExp('create(?: or replace)? function public\\.'+name+'\\b','i').exec(source);
 assert.ok(match,'Missing baseline '+name);
 const tail=source.slice(match.index),body=/\bas\s+(\$[a-z_]*\$)/i.exec(tail);assert.ok(body);
 const end=tail.indexOf(body[1],body.index+body[0].length);assert.ok(end>=0);
 return tail.slice(0,end+body[1].length)+';';
}
(async()=>{
 const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');
 const tables=JSON.parse(fs.readFileSync('tests/fixtures/teacher-ranking-tables.json','utf8'));
 for(const t of tables){for(const m of t.columns.matchAll(/nextval\('([^']+)'::regclass\)/g))await db.exec('create sequence if not exists '+m[1]+';');await db.exec('create table public.'+t.name+'('+t.columns+');');}
 await db.exec(`create unique index on teachers(id);create unique index on students(id);create unique index on extra_data(student_id,key_name);create unique index on dm_rally_runs(id);create unique index on dm_verified_runs(student_id,run_id);create unique index on dm_break_checkpoints(run_id,chapter);create unique index on dm_break_progress(student_id,game);create unique index on dm_game_reward_runs(student_id,run_id);
 create table lesson_topics(level text,category text,topic_name text,active boolean);
 create table lesson_progress(student_id uuid,level text,category text,topic_name text,test_success boolean);
 create table dm_lesson_fair_best(student_id uuid,level text,category text,topic_name text,best_tier int,updated_at timestamptz,primary key(student_id,level,category,topic_name));
 create table level_completions(student_id uuid,mode text,class_no int,unit_no int,level_no int,primary key(student_id,mode,class_no,unit_no,level_no));
 create function dm_rally_view(r dm_rally_runs) returns jsonb language sql as $$select jsonb_build_object('ok',true,'reward',r.reward,'score',r.state->'score');$$;
 create function dm_break_run_view(r dm_break_runs) returns jsonb language sql as $$select jsonb_build_object('runId',r.id,'score',r.score,'gold',r.gold);$$;
 create function dm_break_reward(game_code text,score int,collected_gold int,seconds int) returns int language sql as $$select 77;$$;
 create function dm_blocked(a uuid,b uuid) returns boolean language sql as $$select false;$$;
 insert into lesson_topics values('A1','grammar','QA',true);
 `);
 await db.exec(functionSQL('supabase/migrations/20261010160000_dm_matches_12_questions.sql','dm_round_score_v3'));
 await db.exec(`create function dm_round_score(a jsonb,b jsonb) returns jsonb language sql as $$select public.dm_round_score_v3(a,b,true);$$;`);
 await db.exec(functionSQL('supabase/migrations/20261020200000_game_xp_cap_level_curve_rally_slow.sql','dm_student_level'));
 await db.exec(functionSQL('supabase/migrations/20261017140000_adaptive_solo_game_fair_claim.sql','dm_solo_fair_percent'));
 await db.exec('create function dm_round_score_legacy(a jsonb,b jsonb) returns jsonb language sql as $$select public.dm_round_score_v3(a,b,true);$$;');
 await db.exec(fs.readFileSync('supabase/migrations/20261024141820_teacher_portal_access.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/20261024151250_teacher_ranking_only.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/20261025210928_rally_12_words_compatible.sql','utf8'));
 const migration=fs.readdirSync('supabase/migrations').find(n=>n.endsWith('_ranked_learning_rewards.sql'));assert.ok(migration);
 await db.exec(fs.readFileSync(path.join('supabase/migrations',migration),'utf8'));
 const policy=JSON.parse(fs.readFileSync('ingilizce/reward-policy.json','utf8'));
 for(const g of policy.games){const r=(await db.query('select dm_reward_limits($1) r',[g.code])).rows[0].r;assert.deepEqual(r,{xp:g.xp,gold:g.gold});}
 const topicUI=fs.readFileSync('ingilizce/konu-oyunlari.js','utf8');const uiMap=topicUI.match(/const rewardXp=(\{[^;]+\});/);assert.ok(uiMap);assert.deepEqual(require('node:vm').runInNewContext('JSON.stringify('+uiMap[1]+')'),JSON.stringify(policy.topicGames),'Topic labels must match server rewards');
 for(const [code,xp] of Object.entries(policy.topicGames)){const r=(await db.query('select dm_reward_limits($1) r',['konu:'+code])).rows[0].r;assert.equal(r.xp,xp);}
 await db.exec(fs.readFileSync('tests/reward-priority-db.sql','utf8'));
 assert.equal((await db.query('select count(*)::int n from students')).rows[0].n,0,'SQL fixtures must roll back');
 console.log('PASS: all ranked limits, 7,776 boost/cap cases, lesson tier differences, historical/duplicate guards, 13 solo games, daily bands, route first-clear, rally slowdown, topic quota, online payout/polling, break caps, RPC privileges and rolled-back fixtures');
 await db.close();
})().catch(e=>{console.error(e.message,e.detail||'',e.where||'');process.exit(1)});
