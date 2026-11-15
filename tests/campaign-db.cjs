const assert = require("node:assert/strict"),
  fs = require("node:fs");
const { PGlite } = require(process.env.PGLITE_MODULE || "@electric-sql/pglite");
(async () => {
  const db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role;",
  );
  const fixture = JSON.parse(
    fs.readFileSync("tests/fixtures/campaign-schema.json", "utf8"),
  );
  for (const t of fixture.tables) {
    for (const m of t.columns.matchAll(/nextval\('([^']+)'::regclass\)/g))
      await db.exec("create sequence if not exists " + m[1]);
    await db.exec("create table public." + t.name + "(" + t.columns + ");");
  }
  for (const [t, k] of Object.entries({
    students: "id",
    teachers: "id",
    teacher_portal_access: "id",
    teacher_portal_guests: "student_id",
    dm_goal_progress: "student_id",
    dm_goal_runs: "student_id,run_id",
    dm_premium_match_usage: "student_id",
    dm_premium_match_runs: "student_id,run_id",
    extra_data: "student_id,key_name",
    dm_game_reward_runs: "student_id,run_id",
  }))
    await db.exec("create unique index on " + t + "(" + k + ")");
  const defs = new Map(fixture.functions.map((x) => [x.proname, x.definition]));
  const curriculum = fs.readFileSync(
    "supabase/migrations/20261114193634_premium_progressive_curriculum.sql",
    "utf8",
  );
  defs.set(
    "dm_premium_course_words",
    curriculum.slice(
      curriculum.indexOf(
        "create or replace function public.dm_premium_course_words",
      ),
      curriculum.indexOf("$course$;") + 10,
    ),
  );
  for (const n of [
    "dm_plan",
    "dm_game_trial_active",
    "dm_pwm_energy",
    "dm_pwm_is_premium",
    "dm_pwm_star",
    "dm_premium_course_words",
    "dm_premium_level_reward",
    "dm_game_access",
    "dm_pwm_status",
    "dm_goal_status",
    "dm_pwm_start",
    "dm_pwm_finish",
    "dm_goal_start",
    "dm_goal_finish",
  ])
    await db.exec(defs.get(n));
  await db.exec(
    fs.readFileSync(
      "supabase/migrations/20261115064905_ogretmenimle_zirveye_2026.sql",
      "utf8",
    ),
  );
  const one = async (q, args = []) => (await db.query(q, args)).rows[0],
    call = async (q, args = []) =>
      (await one("select " + q + " result", args)).result;
  const teacher = async (name) =>
    (
      await one(
        "insert into teachers(username,password_hash,is_admin) values($1,'unused',true) returning id",
        [name],
      )
    ).id;
  const student = async (name, tid = null) =>
    (
      await one(
        "insert into students(username,password_hash,teacher_id,status,role,created_at,energy,energy_max) values($1,'unused',$2,'approved','student',now()-interval '30 days',0,25) returning id",
        [name, tid],
      )
    ).id;
  const t1 = await teacher("teacher"),
    t2 = await teacher("other"),
    p = await student("ExistingPupil", t2);
  const owner = await student("TeacherOwner");
  await db.query("update students set email_verified_at=now() where id=$1", [
    owner,
  ]);
  await db.query(
    "insert into teacher_portal_access(student_id,teacher_id,state) values($1,$2,'approved')",
    [owner, t2],
  );
  const raw = await one(
    "select teacher_id,energy,gold,xp,profile from students where id=$1",
    [p],
  );
  const d = await call("dm_campaign_status($1,'teacher')", [t1]),
    d2 = await call("dm_campaign_status($1,'teacher')", [t2]);
  assert.ok(d.invite);
  assert.equal(
    (await call("dm_campaign_status($1,'teacher')", [t1])).invite,
    d.invite,
  );
  assert.notEqual(d.invite, d2.invite);
  assert.equal(
    (await call("dm_campaign_join($1,$2)", [p, d.invite])).code,
    "inactive",
  );
  assert.equal(await call("dm_campaign.remaining($1,'word-goal')", [p]), 0);
  for (const [stamp, expected] of [
    ["2026-11-19T23:59:59+03:00", false],
    ["2026-11-20T00:00:00+03:00", true],
    ["2026-12-10T23:59:59.999+03:00", true],
    ["2026-12-11T00:00:00+03:00", false],
  ])
    assert.equal(await call("dm_campaign.active_at($1)", [stamp]), expected);
  assert.equal(
    await call(
      "('2026-11-20T20:59:59Z'::timestamptz at time zone 'Europe/Istanbul')::date::text",
    ),
    "2026-11-20",
  );
  assert.equal(
    await call(
      "('2026-11-20T21:00:00Z'::timestamptz at time zone 'Europe/Istanbul')::date::text",
    ),
    "2026-11-21",
  );
  await db.exec(
    "update dm_campaign.campaigns set starts_at=now()-interval '1 day',ends_at=now()+interval '1 day',results_at=now()+interval '1 day'",
  );
  assert.equal(
    (await call("dm_campaign_join($1,$2)", [p, d.invite])).joined,
    true,
  );
  assert.equal(
    (await call("dm_campaign_join($1,$2)", [p, d.invite])).joined,
    true,
  );
  assert.equal(
    (await call("dm_campaign_join($1,$2)", [p, d2.invite])).code,
    "already_joined",
  );
  assert.deepEqual(
    await one(
      "select teacher_id,energy,gold,xp,profile from students where id=$1",
      [p],
    ),
    raw,
  );
  for (let i = 0; i < 30; i++) {
    const s = await student("New" + i);
    assert.equal(
      (await call("dm_campaign_join($1,$2)", [s, d.invite])).joined,
      true,
    );
  }
  assert.equal(
    (await call("dm_campaign_status($1,'teacher')", [t1])).participants,
    31,
  );
  const day = (
    await one(
      "select (now() at time zone 'Europe/Istanbul')::date::text as day",
    )
  ).day;
  await db.query(
    "update dm_campaign.participants set joined_at=now()-interval '2 hours' where student_id=$1",
    [p],
  );
  await db.query(
    'insert into extra_data(student_id,key_name,value) values($1,\'yo\',\'{"totalXp":10,"altin":5,"guncelleme":1}\')',
    [p],
  );
  await assert.rejects(
    db.query("select dm_goal_start($1,$2)", [p, crypto.randomUUID()]),
    /Geçersiz bölüm/,
  );
  assert.equal(
    await call("dm_campaign.remaining($1,'word-goal')", [p]),
    5,
    "failed initialization rolls back the ticket",
  );
  await db.exec(
    "insert into word_bank(class_no,unit_no,english,turkish) select 1,1,'word'||n,'anlam'||n from generate_series(1,20)n",
  );
  const normalBefore = await call(
    "dm_game_access($1,'word-goal')->>'normalRemaining'",
    [p],
  );
  const goal = crypto.randomUUID(),
    g = await call("dm_goal_start($1,$2)", [p, goal]);
  assert.equal(g.energy, 0);
  assert.equal(
    (await call("dm_goal_start($1,$2)", [p, crypto.randomUUID()])).runId,
    goal,
  );
  assert.equal(await call("dm_campaign.remaining($1,'word-goal')", [p]), 4);
  await db.query(
    "update dm_goal_runs set started_at=now()-interval '1 minute' where student_id=$1",
    [p],
  );
  const picks = g.rounds.map((x) => x.answer);
  assert.equal(
    (await call("dm_goal_finish($1,$2,$3)", [p, goal, picks])).passed,
    true,
  );
  await call("dm_goal_finish($1,$2,$3)", [p, goal, picks]);
  assert.equal(
    (
      await one("select kp from dm_campaign.participants where student_id=$1", [
        p,
      ])
    ).kp,
    40,
  );
  assert.equal(
    (
      await one("select free_used from dm_goal_progress where student_id=$1", [
        p,
      ])
    ).free_used,
    0,
  );
  assert.equal(
    (await one("select count(*)::int n from energy_transactions")).n,
    0,
  );
  for (let i = 0; i < 4; i++)
    assert.equal(
      await call("dm_campaign.consume($1,'word-goal',$2)", [
        p,
        crypto.randomUUID(),
      ]),
      true,
    );
  assert.equal(
    await call("dm_campaign.consume($1,'word-goal',$2)", [
      p,
      crypto.randomUUID(),
    ]),
    false,
  );
  assert.equal(await call("dm_campaign.remaining($1,'word-match')", [p]), 5);
  await assert.rejects(
    db.query("select dm_goal_start($1,$2)", [p, crypto.randomUUID()]),
    /Ücretsiz oyun|5 enerji/,
  );
  await db.query(
    "update dm_campaign.game_uses set day=$2::date-1 where student_id=$1",
    [p, day],
  );
  assert.equal(await call("dm_campaign.remaining($1,'word-goal')", [p]), 5);
  assert.equal(
    await call("dm_game_access($1,'word-goal')->>'normalRemaining'", [p]),
    normalBefore,
  );
  const candy = crypto.randomUUID(),
    c = await call("dm_pwm_start($1,$2,1)", [p, candy]);
  assert.ok(Number.isInteger(c.seed));
  assert.equal((await call("dm_pwm_start($1,$2,1)", [p, candy])).seed, c.seed);
  assert.equal(await call("dm_campaign.remaining($1,'word-match')", [p]), 4);
  await db.query(
    "update dm_premium_match_runs set started_at=now()-interval '1 minute' where student_id=$1",
    [p],
  );
  await call("dm_pwm_finish($1,$2,5000,true,10,30)", [p, candy]);
  assert.equal(
    (
      await one("select kp from dm_campaign.participants where student_id=$1", [
        p,
      ])
    ).kp,
    40,
  );
  await call(
    "dm_campaign.award($1,'prejoin','school',now()-interval '3 hours')",
    [p],
  );
  await call("dm_campaign.award($1,'stop-1','school',now())", [p]);
  await call("dm_campaign.award($1,'stop-1','school',now())", [p]);
  assert.equal(
    (
      await one("select kp from dm_campaign.participants where student_id=$1", [
        p,
      ])
    ).kp,
    140,
  );
  for (let i = 0; i < 5; i++)
    await call("dm_campaign.award($1,$2,'solo',now())", [p, "solo" + i]);
  assert.equal(
    (
      await one(
        "select count(*)::int n from dm_campaign.ledger where kind='solo'",
      )
    ).n,
    3,
  );
  const run = "verified-test-123456",
    answers = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [
        i,
        { complete: true, correct: true },
      ]),
    );
  await db.query(
    "insert into dm_verified_runs(student_id,run_id,game,class_no,units,stop_no,deck,answers) values($1,$2,'ba',3,array[230101],230101,$3,$4)",
    [p, run, JSON.stringify(Array(12).fill({})), JSON.stringify(answers)],
  );
  await db.query(
    "insert into dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values($1,$2,'ba',3,array[230101],80,10)",
    [p, run],
  );
  assert.equal(
    (
      await one(
        "select count(*)::int n from dm_campaign.ledger where event_key='school:3:230101'",
      )
    ).n,
    1,
  );
  await db.query(
    "insert into extra_data(student_id,key_name,value) values($1,'practice_reward:plan:'||$2,'{}')",
    [p, day],
  );
  assert.equal(
    (
      await one(
        "select count(*)::int n from dm_campaign.ledger where kind='plan'",
      )
    ).n,
    1,
  );
  await db.query(
    "insert into dm_thematic_first_answers(actor_key,chapter,question_cursor,first_correct) values('s:'||$1,1,0,true)",
    [p],
  );
  await db.query(
    "insert into papi_story_progress(actor_key,student_id,chapter) values('s:'||$1,$1::uuid,1)",
    [p],
  );
  await db.query(
    "update papi_story_progress set completed=true,reward_claimed=true where student_id=$1",
    [p],
  );
  assert.equal(
    (
      await one(
        "select count(*)::int n from dm_campaign.ledger where kind='learning'",
      )
    ).n,
    1,
  );
  await db.query(
    "insert into extra_data(student_id,key_name,value) values($1,'practice_dialogue:story-1:'||$2,'{\"cursor\":3}')",
    [p, day],
  );
  await db.query(
    "insert into extra_data(student_id,key_name,value) values($1,'practice_reward:story:story-1','{}')",
    [p],
  );
  assert.equal(
    (
      await one(
        "select count(*)::int n from dm_campaign.ledger where kind='story'",
      )
    ).n,
    1,
  );
  const chat = crypto.randomUUID();
  await db.query(
    "insert into dm_papi_dialogue_runs(id,student_id,dialogue_id,script) values($1,$2,'test','{}')",
    [chat, p],
  );
  await db.query(
    "update dm_papi_dialogue_runs set result='{\"passed\":true}' where id=$1",
    [chat],
  );
  assert.equal(
    (
      await one(
        "select count(*)::int n from dm_campaign.ledger where kind='chat'",
      )
    ).n,
    1,
  );
  const topic = crypto.randomUUID();
  await db.query(
    "insert into dm_topic_game_runs(run_id,student_id,topic_key,game,answer_key,question_count) values($1,$2,'topic','balon','[]',8)",
    [topic, p],
  );
  await db.query(
    "insert into dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values($1,$2,'konu:balon',0,'{}',70,0)",
    [p, topic],
  );
  assert.equal(
    (
      await one(
        "select count(*)::int n from dm_campaign.ledger where kind='topic'",
      )
    ).n,
    1,
  );
  const failed = await student("FailedLevel");
  await call("dm_campaign_join($1,$2)", [failed, d.invite]);
  await db.query(
    "update dm_campaign.participants set joined_at=now()-interval '2 hours' where student_id=$1",
    [failed],
  );
  await db.query(
    "insert into dm_verified_runs(student_id,run_id,game,class_no,units,deck,answers) values($1,'failed-run-12345678','ky',1,array[1],$2,$3)",
    [
      failed,
      JSON.stringify(Array(12).fill({})),
      JSON.stringify(
        Object.fromEntries(
          Array.from({ length: 12 }, (_, i) => [
            i,
            { complete: true, correct: true, firstCorrect: false },
          ]),
        ),
      ),
    ],
  );
  await db.query(
    "insert into dm_game_reward_runs(student_id,run_id,game_key,class_no,units,xp,gold) values($1,'failed-run-12345678','ky',1,array[1],10,2)",
    [failed],
  );
  assert.equal(
    (
      await one("select kp from dm_campaign.participants where student_id=$1", [
        failed,
      ])
    ).kp,
    0,
    "retrying wrong answers does not turn a failed level into campaign success",
  );
  const pupils = (
    await db.query(
      "select student_id from dm_campaign.participants where student_id<>$1 order by student_id limit 5",
      [p],
    )
  ).rows.map((x) => x.student_id);
  for (let i = 0; i < pupils.length; i++)
    await db.query(
      "update dm_campaign.participants set kp=$2,reached_at=now()-interval '1 hour' where student_id=$1",
      [pupils[i], 1500 - i * 100],
    );
  const ts = await call("dm_campaign_status($1,'teacher')", [t1]);
  assert.equal(ts.groupScore, 6500);
  const ss = await call("dm_campaign_status($1,'student')", [p]);
  assert.ok(ss.board[0].eligible);
  for (const k of ["student_id", "teacher_id", "ExistingPupil"])
    assert.equal(JSON.stringify(ss.board).includes(k), false);
  const rivals = [];
  for (let i = 0; i < 6; i++) {
    const id = await student("Rival" + i);
    rivals.push(id);
    await call("dm_campaign_join($1,$2)", [id, d2.invite]);
    if (i < 5)
      await db.query(
        "update dm_campaign.participants set kp=$2,reached_at=now()-interval '2 hours' where student_id=$1",
        [id, 1500 - i * 100],
      );
  }
  assert.equal(
    (await call("dm_campaign_status($1,'teacher')", [t1])).groupRank,
    1,
    "active pupil count breaks a score tie",
  );
  await db.query(
    "update dm_campaign.participants set kp=1 where student_id=$1",
    [rivals[5]],
  );
  assert.equal(
    (await call("dm_campaign_status($1,'teacher')", [t2])).groupRank,
    1,
    "earlier arrival breaks a score/active-count tie",
  );
  const extra = await student("SeventhActive");
  await call("dm_campaign_join($1,$2)", [extra, d.invite]);
  await db.query(
    "update dm_campaign.participants set kp=1 where student_id=$1",
    [extra],
  );
  assert.equal(
    (await call("dm_campaign_status($1,'teacher')", [t1])).groupRank,
    1,
  );
  const {replayCandy}=await import('../supabase/functions/premium-games/campaign-proof.mjs'),core=globalThis.dmPwmCore;
  const cp=await student('CandyFive');await call('dm_campaign_join($1,$2)',[cp,d.invite]);await db.query("update dm_campaign.participants set joined_at=now()-interval '2 hours' where student_id=$1",[cp]);await db.query("insert into extra_data(student_id,key_name,value) values($1,'yo','{\"totalXp\":0,\"altin\":0}')",[cp]);let expectedCandyKP=0;
  for(let i=0;i<5;i++){
   const id=crypto.randomUUID(),started=await call('dm_pwm_start($1,$2,1)',[cp,id]);
   assert.equal(await call("dm_campaign.remaining($1,'word-match')",[cp]),4-i);
   if(i===4)assert.equal((await call('dm_pwm_start($1,$2,1)',[cp,crypto.randomUUID()])).runId,id,'fifth uncertain start resumes with zero tickets');
   const st=core.create(core.levelConfig(1),started.seed),actions=[];while(st.moves>0&&!core.goalsDone(st)){const pair=core.findMove(st);actions.push(pair.flat());core.trySwap(st,...pair);}
   const proof=replayCandy({level_no:1,campaign_seed:started.seed},actions);if(proof.won)expectedCandyKP+=40;
   await db.query("update dm_premium_match_runs set started_at=now()-interval '1 minute' where student_id=$1 and run_id=$2",[cp,id]);
   await call('dm_campaign_pwm_finish($1,$2,$3,$4,$5,30)',[cp,id,proof.score,proof.won,proof.moves]);
   await call('dm_campaign_pwm_finish($1,$2,$3,$4,$5,30)',[cp,id,proof.score,proof.won,proof.moves]);
  }
  assert.equal((await one('select kp from dm_campaign.participants where student_id=$1',[cp])).kp,expectedCandyKP);
  await assert.rejects(db.query('select dm_pwm_start($1,$2,1)',[cp,crypto.randomUUID()]),/Ücretsiz oyun|5 enerji/);
  await db.exec(
    "update dm_campaign.campaigns set ends_at=now()-interval '1 second',results_at=now()-interval '1 second'",
  );
  const before = (
    await one("select kp from dm_campaign.participants where student_id=$1", [
      p,
    ])
  ).kp;
  await call("dm_campaign.award($1,'late','school',now())", [p]);
  assert.equal(
    (
      await one("select kp from dm_campaign.participants where student_id=$1", [
        p,
      ])
    ).kp,
    before,
  );
  assert.equal(await call("dm_campaign.remaining($1,'word-match')", [p]), 0);
  await db.query(
    "insert into dm_entitlements(account_id,account_role,product_key,provider,transaction_id,state,valid_until) values($1,'student','diji_pro','apple',$2,'active',now()+interval '1 year')",
    [pupils[0], crypto.randomUUID()],
  );
  const paid = await one("select * from dm_entitlements where account_id=$1", [
    pupils[0],
  ]);
  const final = await call("dm_campaign_finalize()");
  assert.equal(final.rewards.length, 6);
  assert.equal(await call("dm_plan($1,'student')", [pupils[0]]), "pro");
  await assert.rejects(
    db.query("select dm_campaign_approve($1)", [p]),
    /Yönetici/,
  );
  await call("dm_campaign_approve($1)", [t1]);
  assert.equal(await call("dm_plan($1,'student')", [pupils[0]]), "premium_pro");
  assert.equal((await call("dm_campaign_approve($1)", [t1])).duplicate, true);
  assert.deepEqual(
    await one("select * from dm_entitlements where account_id=$1", [pupils[0]]),
    paid,
  );
  await db.exec(
    "update dm_campaign.rewards set valid_until=now()-interval '1 second'",
  );
  assert.equal(await call("dm_plan($1,'student')", [pupils[0]]), "pro");
  assert.equal(await call("dm_plan($1,'student')", [pupils[1]]), "free");
  for (const role of ["anon", "authenticated"]) {
    assert.equal(
      (
        await one(
          "select has_schema_privilege($1,'dm_campaign','USAGE') allowed",
          [role],
        )
      ).allowed,
      false,
    );
    for (const fn of [
      "dm_campaign_join(uuid,text)",
      "dm_campaign_status(uuid,text)",
      "dm_campaign_approve(uuid)",
      "dm_campaign_pwm_finish(uuid,uuid,integer,boolean,integer,integer)",
    ])
      assert.equal(
        (
          await one("select has_function_privilege($1,$2,'EXECUTE') allowed", [
            role,
            fn,
          ])
        ).allowed,
        false,
      );
  }
  assert.equal(
    (
      await one(
        "select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='dm_campaign' and c.relkind='r' and not c.relrowsecurity",
      )
    ).n,
    0,
  );
  console.log(
    "PASS campaign PostgreSQL: joins/capacity, progress isolation, real starts/finishes, 5+5, retry, daily reset, KP caps/dedup, source adapters, first-five/privacy, dates/archive, admin approval, expiry/paid fallback, RLS",
  );
  await db.close();
})().catch((e) => {
  console.error(e.message, e.detail || "", e.where || "", e.query || "");
  process.exit(1);
});
