const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { JSDOM } = require(process.env.JSDOM_MODULE || "jsdom");
const src = fs.readFileSync("ingilizce/teacher-campaign.js", "utf8"),
  code = "12345678-1234-4234-8234-123456789abc";
const data = {
  ok: true,
  active: true,
  teacher: true,
  invite: code,
  serverNow: "2026-11-22T12:00:00+03:00",
  startsAt: "2026-11-20T00:00:00+03:00",
  endsAt: "2026-12-11T00:00:00+03:00",
  participants: 31,
  groupScore: 6000,
  groupRank: 1,
  top5: [{ alias: "<script>attack</script>", kp: 1500 }],
  board: [
    {
      self: true,
      eligible: true,
      rank: 1,
      score: 6000,
      active: 5,
      label: "group",
    },
  ],
  remaining: { "word-goal": 5, "word-match": 5 },
};
const settle = () => new Promise((r) => setTimeout(r, 30));
function fixture({ teacher = true, logged = true, invite = false } = {}) {
  const dom = new JSDOM(
      '<div id="tpDashboard"><div class="tp-dash-main"></div></div><input id="ogrenci">',
      {
        url:
          "https://test.example/ingilizce/" + (invite ? "?zirve=" + code : ""),
        runScripts: "outside-only",
        pretendToBeVisual: true,
      },
    ),
    w = dom.window,
    calls = [];
  w.dmTeacherPortalMode = teacher;
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  if (logged) {
    if (teacher)
      w.sessionStorage.setItem(
        "dm_tp_session",
        JSON.stringify({ teacherToken: "teacher-session" }),
      );
    else w.localStorage.setItem("ing_token", "pupil-token");
  }
  w.fetch = async (_url, o) => {
    const b = JSON.parse(o.body);
    calls.push(b);
    return {
      ok: true,
      json: async () =>
        b.islem === "campaignJoin"
          ? { ok: true, joined: true }
          : {
              ...data,
              teacher,
              invite: teacher ? code : null,
              joined: !teacher,
            },
    };
  };
  w.eval(src);
  return { dom, w, calls };
}
test("announcement is dismissed once per teacher session and reopens on reentry without polling", async () => {
  const { dom, w, calls } = fixture();
  try {
    await settle();
    assert.ok(w.document.querySelector(".zirve-shade"));
    assert.match(w.document.body.textContent, /20 KASIM–10 ARALIK/);
    w.document.querySelector(".zirve-close").click();
    w.document.dispatchEvent(new w.Event("dm:teacher-enter"));
    await settle();
    assert.equal(w.document.querySelector(".zirve-shade"), null);
    w.document.dispatchEvent(new w.Event("dm:teacher-exit"));
    w.document.dispatchEvent(new w.Event("dm:teacher-enter"));
    await settle();
    assert.ok(w.document.querySelector(".zirve-shade"));
    assert.equal(calls.length, 2);
    w.document.querySelector("[data-board]").click();
    await settle();
    assert.equal(w.document.querySelector(".zirve-panel script"), null);
    assert.match(
      w.document.querySelector(".zirve-section").textContent,
      /<script>attack<\/script>/,
    );
    w.document.querySelector(".zirve-close").click();
  } finally {
    w.dispatchEvent(new w.Event("pagehide"));
    dom.window.close();
  }
});
test("new or existing pupil keeps invitation through login, then joins exactly once", async () => {
  const { dom, w, calls } = fixture({
    teacher: false,
    logged: false,
    invite: true,
  });
  try {
    assert.equal(w.localStorage.getItem("dm_zirve_invite_2026"), code);
    assert.equal(w.location.search, "");
    w.document.querySelector("[data-login]").click();
    assert.equal(w.document.activeElement.id, "ogrenci");
    w.localStorage.setItem("ing_token", "normal-pupil-token");
    w.document.dispatchEvent(new w.Event("dm:login"));
    await settle();
    assert.equal(calls.filter((x) => x.islem === "campaignJoin").length, 1);
    assert.equal(w.localStorage.getItem("dm_zirve_invite_2026"), null);
    assert.ok(w.document.querySelector("[data-goal]"));
    w.document.dispatchEvent(new w.Event("dm:login"));
    await settle();
    assert.equal(calls.filter((x) => x.islem === "campaignJoin").length, 1);
  } finally {
    w.dispatchEvent(new w.Event("pagehide"));
    dom.window.close();
  }
});
test("already authenticated pupil automatically joins from link without registration", async () => {
  const { dom, w, calls } = fixture({
    teacher: false,
    logged: true,
    invite: true,
  });
  try {
    await settle();
    assert.equal(calls[0].islem, "campaignJoin");
    assert.equal(calls[0].t, "pupil-token");
    assert.equal(calls[0].code, code);
    assert.ok(w.document.querySelector("[data-candy]"));
  } finally {
    w.dispatchEvent(new w.Event("pagehide"));
    dom.window.close();
  }
});
