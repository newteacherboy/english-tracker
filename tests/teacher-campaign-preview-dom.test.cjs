const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { JSDOM } = require(process.env.JSDOM_MODULE || "jsdom");
const source = fs.readFileSync("ingilizce/teacher-campaign-preview.js", "utf8");
const turn = () => new Promise((r) => setTimeout(r, 40));
async function fixture({ hint = true, allowed = true } = {}) {
  const { previewData } = await import(
    "../supabase/functions/teacher-campaign-preview/handler.mjs"
  );
  const dom = new JSDOM(
      '<div id="tpDashboard"><div class="tp-dash-main"></div></div><div id="ogretmenMenuModal"><div class="rubric-content"></div></div>',
      {
        url: "https://test.invalid",
        runScripts: "outside-only",
        pretendToBeVisual: true,
      },
    ),
    w = dom.window,
    calls = [];
  w.sessionStorage.setItem(
    "ing_ogr_token",
    "preview-test-token-never-a-real-session",
  );
  if (hint) w.sessionStorage.setItem("ing_ogr_yonetici", "1");
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.fetch = async (url, o) => {
    const b = JSON.parse(o.body);
    calls.push(b);
    return {
      ok: allowed,
      json: async () => (allowed ? previewData(b.view) : { ok: false }),
    };
  };
  w.eval(source);
  return {
    dom,
    w,
    calls,
    close() {
      w.dispatchEvent(new w.Event("pagehide"));
      dom.window.close();
    },
  };
}
test("normal accounts never receive campaign buttons, announcements or background polling", async () => {
  const f = await fixture({ hint: false });
  try {
    await turn();
    assert.equal(f.calls.length, 0);
    assert.equal(f.w.document.querySelector(".zirve-shade"), null);
    assert.equal(f.w.document.querySelector("[data-zirve-preview-open]"), null);
  } finally {
    f.close();
  }
});
test("forging the client admin flag does not reveal a campaign surface", async () => {
  const f = await fixture({ allowed: false });
  try {
    await turn();
    assert.equal(f.calls.length, 1);
    assert.equal(f.w.document.querySelector(".zirve-shade"), null);
    assert.equal(f.w.document.querySelector("[data-zirve-preview-open]"), null);
    await f.w.dmTeacherCampaignPreview.open();
    assert.equal(f.w.document.querySelector(".zirve-shade"), null);
  } finally {
    f.close();
  }
});
test("owner can inspect all views without joining, launching a game or distributing rewards", async () => {
  const f = await fixture();
  try {
    await turn();
    const d = f.w.document;
    assert.ok(d.querySelector(".zirve-shade"));
    assert.ok(d.querySelector("#ogretmenMenuModal [data-zirve-preview-open]"));
    assert.match(d.body.textContent, /YÖNETİCİ ÖNİZLEMESİ/);
    d.querySelector('[data-pv="student"]').click();
    await turn();
    assert.ok(d.querySelector("[data-goal]"));
    d.querySelector("[data-goal]").click();
    assert.match(
      d.querySelector(".zirve-status").textContent,
      /Gerçek oyun başlatılmadı/,
    );
    d.querySelector('[data-pv="results"]').click();
    await turn();
    assert.equal(
      d.querySelectorAll(".zirve-preview-result .zirve-row").length,
      6,
    );
    assert.equal(d.querySelector("[data-approve]"), null);
    assert.ok(f.calls.every((x) => x.op === "status"));
    d.querySelector('[data-pv="notice"]').click();
    await turn();
    assert.ok(d.querySelector("[data-wa]"));
    d.querySelector("[data-wa]").click();
    assert.match(
      d.querySelector(".zirve-preview-share").textContent,
      /davet gönderilmez/,
    );
    f.w.sessionStorage.setItem("ing_ogr_token", "another-account");
    d.dispatchEvent(new f.w.Event("dm:login"));
    await turn();
  } finally {
    f.close();
  }
});
