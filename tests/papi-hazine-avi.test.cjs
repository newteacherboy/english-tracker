'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('all 6 islands, 100 levels, and 33 GLB models are valid and complete', async () => {
  const data = await import('../ingilizce/papi-hazine-avi/src/levels-data.mjs');
  assert.equal(data.ISLANDS.length, 6);
  assert.equal(data.ALL_LEVELS.length, 100);
  assert.equal(data.LAUNCH_AT_ISO, '2026-12-10T19:00:00+03:00');
  assert.equal(data.LAUNCH_AT_MS, Date.parse('2026-12-10T19:00:00+03:00'));

  // Maps 1-3 must be FREE, Maps 4-6 must require Premium Pro!
  assert.deepEqual(
    data.ISLANDS.map((i) => i.requiresPro),
    [false, false, false, true, true, true]
  );

  // Verify level counts: 10, 15, 15, 20, 20, 20
  assert.deepEqual(
    data.ISLANDS.map((i) => data.getLevelsForIsland(i.id).length),
    [10, 15, 15, 20, 20, 20]
  );

  // Verify every referenced prop model exists as a real .glb file
  const modelDir = path.join(__dirname, '../ingilizce/papi-hazine-avi/assets/models');
  const glbs = fs.readdirSync(modelDir).filter((f) => f.endsWith('.glb'));
  assert.equal(glbs.length, 33);

  const seenIds = new Set();
  for (const lvl of data.ALL_LEVELS) {
    assert(!seenIds.has(lvl.id), 'Duplicate level id: ' + lvl.id);
    seenIds.add(lvl.id);
    assert(lvl.missions.length >= 5 && lvl.missions.length <= 8, 'Mission count out of range for ' + lvl.id);
    for (const p of lvl.props) {
      assert(fs.existsSync(path.join(modelDir, `${p.model}.glb`)), `Missing GLB: ${p.model}.glb`);
    }
  }
});

test('Dec 10 19:00 launch gate blocks non-Irmak accounts and allows ONLY Irmak before launch', () => {
  const launcherSrc = fs.readFileSync(path.join(__dirname, '../ingilizce/papi-hazine-avi-launcher.js'), 'utf8');

  function runLauncher({ studentName, nowMs, plan = 'free' }) {
    const storage = new Map();
    if (studentName) storage.set('ing_aktifOgrenci', studentName);
    const win = {
      aktifOgrenciAdi: studentName || '',
      dmAndroidPlan: { plan },
      dmTeacherPortalMode: false
    };
    const FakeDate = class extends Date {
      constructor(...a) { super(...(a.length ? a : [nowMs])); }
      static now() { return nowMs; }
      static parse(s) { return Date.parse(s); }
    };
    const ctx = {
      window: win,
      aktifOgrenciAdi: studentName || '',
      localStorage: { getItem: (k) => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
      document: { documentElement: { dataset: {} }, body: { classList: { add() {}, remove() {} }, appendChild() {} } },
      Date: FakeDate,
      setInterval: () => 1,
      clearInterval: () => {},
      setTimeout: (fn) => fn()
    };
    vm.runInNewContext(launcherSrc, ctx);
    return win.dmHazineAvi;
  }

  const beforeLaunch = Date.parse('2026-12-09T18:00:00+03:00');
  const afterLaunch  = Date.parse('2026-12-10T19:01:00+03:00');

  // Non-Irmak accounts blocked before Dec 10 19:00
  for (const name of ['', 'Mert', 'Ayşe', 'Ahmet', 'Zeynep']) {
    const api = runLauncher({ studentName: name, nowMs: beforeLaunch });
    assert.equal(api.isIrmakAccount(), false, `Expected non-Irmak for "${name}"`);
    assert.equal(api.isLaunchOpen(), false, `Expected launch closed before Dec 10 for "${name}"`);
  }

  // Irmak variants bypass launch gate immediately!
  for (const name of ['Irmak', 'irmak', 'IRMAK', 'Irmak Yılmaz']) {
    const api = runLauncher({ studentName: name, nowMs: beforeLaunch });
    assert.equal(api.isIrmakAccount(), true, `Expected Irmak match for "${name}"`);
    assert.equal(api.isLaunchOpen(), true, `Expected Irmak early access for "${name}"`);
  }

  // Everyone opens automatically at Dec 10 19:00+
  const apiAfter = runLauncher({ studentName: 'Mert', nowMs: afterLaunch });
  assert.equal(apiAfter.isLaunchOpen(), true);

  // Premium Pro detection (only premium_pro unlocks Pro, NOT free or standard pro!)
  assert.equal(runLauncher({ studentName: 'Mert', nowMs: afterLaunch, plan: 'free' }).isPremiumPro(), false);
  assert.equal(runLauncher({ studentName: 'Mert', nowMs: afterLaunch, plan: 'pro' }).isPremiumPro(), false);
  assert.equal(runLauncher({ studentName: 'Mert', nowMs: afterLaunch, plan: 'premium_pro' }).isPremiumPro(), true);
  assert.equal(runLauncher({ studentName: 'Mert', nowMs: afterLaunch, plan: 'diji_premium_pro' }).isPremiumPro(), true);
});
