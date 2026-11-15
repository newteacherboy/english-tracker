const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  http = require("node:http"),
  path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const code = "12345678-1234-4234-8234-123456789abc",
  base = {
    ok: true,
    active: true,
    teacher: true,
    joined: false,
    invite: code,
    serverNow: "2026-11-22T12:00:00+03:00",
    startsAt: "2026-11-20T00:00:00+03:00",
    endsAt: "2026-12-11T00:00:00+03:00",
    resultsAt: "2026-12-11T00:00:00+03:00",
    participants: 32,
    groupScore: 6100,
    groupRank: 2,
    kp: 1500,
    studentRank: 1,
    top5: Array.from({ length: 5 }, (_, i) => ({
      alias: "Yarışmacı " + (i + 1),
      kp: 1500 - i * 100,
      self: i === 0,
    })),
    remaining: { "word-goal": 5, "word-match": 5 },
    board: Array.from({ length: 6 }, (_, i) => ({
      rank: i + 1,
      label: "Öğretmen grubu " + i,
      active: 12 - i,
      score: 6800 - i * 700,
      eligible: true,
      self: i === 1,
    })),
  };
(async () => {
  let browser;
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://local").pathname;
    if (pathname === "/harness") {
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/ingilizce/"><link rel="stylesheet" href="teacher-campaign.css"><main id="tpDashboard"><div class="tp-dash-main"></div></main><div id="login-container"><input id="ogrenci"></div><script src="teacher-campaign.js"></script>',
      );
      return;
    }
    const file = path.join(process.cwd(), decodeURIComponent(pathname));
    if (!file.startsWith(process.cwd()) || !fs.existsSync(file)) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader(
      "Content-Type",
      file.endsWith(".js")
        ? "text/javascript"
        : file.endsWith(".css")
          ? "text/css"
          : "image/webp",
    );
    res.end(fs.readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
      args: ["--no-sandbox"],
    });
    const origin = "http://127.0.0.1:" + server.address().port;
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });
    const calls = [],
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      window.dmTeacherPortalMode = true;
      sessionStorage.setItem(
        "dm_tp_session",
        JSON.stringify({ teacherToken: "teacher-token" }),
      );
      window.apiURL = "/campaign-api";
    });
    await page.route("**/campaign-api", async (route) => {
      const body = route.request().postDataJSON();
      calls.push(body);
      await route.fulfill({ json: base });
    });
    await page.goto(origin + "/harness");
    await page.locator(".zirve-shade").waitFor();
    assert.match(
      await page.locator(".zirve-panel").innerText(),
      /20 KASIM–10 ARALIK/,
    );
    assert.match(
      await page.locator(".zirve-free").innerText(),
      /TAMAMEN ÜCRETSİZ/,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.equal(
      await page
        .locator(".zirve-panel")
        .evaluate((el) => el.scrollWidth > el.clientWidth),
      false,
    );
    await page.screenshot({ path: "/tmp/zirve-teacher-mobile.png" });
    await page.locator(".zirve-close").click();
    await page.evaluate(() =>
      document.dispatchEvent(new Event("dm:teacher-enter")),
    );
    await page.waitForTimeout(100);
    assert.equal(
      await page.locator(".zirve-shade").count(),
      0,
      "same session dismissal",
    );
    await page.evaluate(() => {
      document.dispatchEvent(new Event("dm:teacher-exit"));
      document.dispatchEvent(new Event("dm:teacher-enter"));
    });
    await page.locator(".zirve-shade").waitFor();
    assert.equal(calls.length, 2, "one refresh on reentry, no polling");
    await page.locator("[data-board]").click();
    await page.locator(".zirve-board").waitFor();
    assert.match(await page.locator(".zirve-stats").innerText(), /6[.,]?100/);
    assert.equal(
      await page
        .locator(".zirve-panel")
        .evaluate((el) => el.scrollWidth > el.clientWidth),
      false,
    );
    await page.screenshot({ path: "/tmp/zirve-ranking-mobile.png" });
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".zirve-shade").count(), 0);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => window.dmTeacherCampaign.open());
    await page.locator(".zirve-board").waitFor();
    assert.equal(
      await page
        .locator(".zirve-panel")
        .evaluate((el) => el.scrollWidth > el.clientWidth),
      false,
    );
    await page.screenshot({ path: "/tmp/zirve-ranking-desktop.png" });
    // New visitor stores invitation through authentication, existing learner joins once.
    const student = await browser.newPage({
        viewport: { width: 360, height: 740 },
      }),
      joins = [];
    let joined = false;
    await student.addInitScript(() => {
      window.apiURL = "/campaign-api";
    });
    await student.route("**/campaign-api", async (route) => {
      const b = route.request().postDataJSON();
      if (b.islem === "campaignJoin") {
        joins.push(b);
        joined = true;
        await route.fulfill({ json: { ok: true, joined: true } });
      } else
        await route.fulfill({
          json: { ...base, teacher: false, invite: null, joined },
        });
    });
    await student.goto(origin + "/harness?zirve=" + code);
    await student.locator(".zirve-shade").waitFor();
    assert.equal(
      await student.evaluate(() =>
        localStorage.getItem("dm_zirve_invite_2026"),
      ),
      code,
    );
    assert.equal(await student.evaluate(() => location.search), "");
    await student.locator("[data-login]").click();
    assert.equal(
      await student.evaluate(() => document.activeElement.id),
      "ogrenci",
    );
    await student.evaluate(() => {
      localStorage.setItem("ing_token", "student-token");
      document.dispatchEvent(new Event("dm:login"));
    });
    await student.locator("[data-goal]").waitFor();
    assert.equal(joins.length, 1);
    assert.equal(joins[0].code, code);
    assert.equal(
      await student.evaluate(() =>
        localStorage.getItem("dm_zirve_invite_2026"),
      ),
      null,
    );
    assert.equal(
      await student
        .locator(".zirve-panel")
        .evaluate((el) => el.scrollWidth > el.clientWidth),
      false,
    );
    await student.screenshot({ path: "/tmp/zirve-student-mobile.png" });
    await student.evaluate(() => document.dispatchEvent(new Event("dm:login")));
    await student.waitForTimeout(100);
    assert.equal(joins.length, 1, "join not repeated after auth event");
    assert.deepEqual(errors, []);
    console.log(
      "PASS browser: 360/390 mobile and desktop fit, announcement/session reset, no polling, ranking, invitation persistence, new/existing learner auth join, privacy-safe widgets, Escape/focus",
    );
  } finally {
    await browser?.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
