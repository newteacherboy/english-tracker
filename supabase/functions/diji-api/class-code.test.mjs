import test from 'node:test';
import assert from 'node:assert/strict';
import { isClassCode, classCodeCheck } from './class-code.mjs';

test('sınıf kodu biçimi eski onaltılık öğretmen kodlarıyla çakışmaz', () => {
  for (const old of ['F7927E', 'AA10EB3F', '974DD7EF', '3C7FC55F']) assert.equal(isClassCode(old), false);
  assert.equal(isClassCode('GNWGVVE'), true);
  assert.equal(isClassCode('ZEQYJ23'), true);
  assert.equal(isClassCode('ANWGVVE'), false); // ilk harf G-Z olmalı
  assert.equal(isClassCode(''), false);
});
test('sınıf kodu yoksa eski akış aynen sürer', () => {
  assert.deepEqual(classCodeCheck(null, 6), { ok: true });
  assert.deepEqual(classCodeCheck(null, null), { ok: true });
});
test('sınıf numarası uyuşursa şube koddan gelir', () => {
  assert.deepEqual(classCodeCheck({ classNo: 6, branch: 'B' }, 6), { ok: true, branch: 'B' });
  assert.deepEqual(classCodeCheck({ classNo: 6, branch: 'B' }, '6'), { ok: true, branch: 'B' });
});
test('sınıf numarası uyuşmazsa net hata, sınıf sessizce değişmez', () => {
  const r = classCodeCheck({ classNo: 6, branch: 'B' }, 5);
  assert.equal(r.ok, false);
  assert.match(r.mesaj, /6\. sınıf/);
  assert.equal(classCodeCheck({ classNo: 6, branch: 'B' }, null).ok, false);
});
