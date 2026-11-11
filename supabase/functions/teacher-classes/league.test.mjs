import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLeague, CATEGORIES, FREE_ROWS } from './league.mjs';

const now = Date.parse('2026-11-11T20:00:00Z');
const day = n => new Date(now - n * 86400000).toISOString();
const A = '00000000-0000-4000-8000-00000000000a', B = '00000000-0000-4000-8000-00000000000b';
const stu = (i, cls, x = {}) => ({ id: `s${i}`, name: `Öğrenci ${i}`, classNo: 6, branch: cls === A ? 'A' : 'B', classId: cls,
  xp: 100 * i, growthNow: 50 * i, growthPrev: 40, ok: 20 * i, bad: 5, minutes: 10 * i, levels: i, streak: i, hwDone: i % 3, hwTotal: 3, lastLogin: day(1), ...x });
const raw = plan => ({ plan, period: 'week', weekStart: '2026-11-09',
  classes: [{ id: A, classNo: 6, branch: 'A', name: null }, { id: B, classNo: 6, branch: 'B', name: 'Kuşlar' }],
  students: [1, 2, 3, 4, 5, 6].map(i => stu(i, i % 2 ? A : B)).concat(stu(7, null, { lastLogin: day(10), ok: 3, bad: 30 })) });

test('free plan shows only the overall top 2 students anywhere', () => {
  const r = buildLeague(raw('free'), { now });
  assert.equal(r.unlocked, false); assert.equal(FREE_ROWS, 2);
  for (const sc of Object.values(r.scopes)) for (const k of CATEGORIES) {
    const c = sc.categories[k];
    assert.ok(c.rows.length <= 2, k);
    assert.equal(c.rows.length + c.hidden, c.total);
  }
  const visible = new Set(Object.values(r.scopes).flatMap(sc => [...Object.values(sc.categories).flatMap(c => c.rows.map(x => x.id)), ...Object.values(sc.leaders).filter(x => x.id).map(x => x.id)]));
  assert.deepEqual(Object.keys(r.students).sort(), [...visible].sort(), 'only visible students are described');
  assert.equal(r.scopes.all.attention.rows.length, 0);
  assert.equal(Object.keys(r.students).length, 2, 'only 2 student names in the whole response');
  assert.deepEqual(r.scopes.all.categories.genel.rows.map(x => x.rank), [1, 2]);
  assert.ok(Object.values(r.scopes.all.leaders).some(l => l.locked));
  assert.ok(r.scopes.all.attention.count >= 1);
});

test('pro and premium pro see everything, including attention list', () => {
  for (const plan of ['pro', 'premium_pro']) {
    const r = buildLeague(raw(plan), { now });
    assert.equal(r.unlocked, true);
    assert.equal(r.scopes.all.categories.genel.hidden, 0);
    assert.equal(r.scopes.all.categories.genel.rows.length, 7);
    assert.ok(r.scopes.all.attention.rows.some(x => x.id === 's7' && /gündür/.test(x.why)));
    assert.equal(r.students.s7.name, 'Öğrenci 7');
  }
});

test('class scopes contain only their own students and class league is sorted', () => {
  const r = buildLeague(raw('pro'), { now });
  assert.deepEqual(r.scopes[A].categories.genel.rows.map(x => x.id).sort(), ['s1', 's3', 's5']);
  assert.equal(r.scopes[B].count, 3);
  assert.ok(r.classLeague[0].avg >= r.classLeague[1].avg);
  assert.equal(r.classes.find(c => c.id === B).label, '6-B');
});

test('accuracy needs enough answers; growth needs a previous week', () => {
  const r = buildLeague({ plan: 'pro', period: 'week', classes: [], students: [
    { id: 'a', name: 'Az', ok: 5, bad: 0, growthNow: 10, growthPrev: 0 },
    { id: 'b', name: 'Çok', ok: 40, bad: 10, growthNow: 90, growthPrev: 30 }] }, { now });
  assert.deepEqual(r.scopes.all.categories.dogruluk.rows.map(x => x.id), ['b']);
  assert.deepEqual(r.scopes.all.categories.gelisen.rows.map(x => x.id), ['b']);
  assert.equal(r.scopes.all.categories.gelisen.rows[0].value, '+%200');
});
