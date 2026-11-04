import test from 'node:test';
import assert from 'node:assert/strict';
import { classError, cleanName, isUuid } from './rules.mjs';

test('plan sınırı hatası sınırı ve yükseltme mesajını taşır', () => {
  const e = classError({ code: 'P0001', message: 'PLAN_LIMIT:5' });
  assert.equal(e.limit, 5);
  assert.match(e.mesaj, /5 sınıf/);
});
test('yalnız bizim P0001 mesajlarımız kullanıcıya gösterilir', () => {
  assert.equal(classError({ code: 'P0001', message: 'Bu sınıf zaten listende.' }).mesaj, 'Bu sınıf zaten listende.');
  assert.equal(classError({ code: '42501', message: 'permission denied for table students' }).mesaj, 'İşlem tamamlanamadı.');
  assert.equal(classError(null).limit, undefined);
});
test('sınıf adı temizlenir ve 40 karakterle sınırlanır', () => {
  assert.equal(cleanName('  Sabah   grubu <b> '), 'Sabah grubu b');
  assert.equal(cleanName(''), null);
  assert.equal(cleanName(undefined), null);
  assert.equal(cleanName('x'.repeat(60)).length, 40);
});
test('uuid denetimi', () => {
  assert.ok(isUuid('5de16ad5-e084-4f29-8d95-2e5fab20325f'));
  assert.ok(!isUuid("1' or '1'='1"));
  assert.ok(!isUuid(42));
});
