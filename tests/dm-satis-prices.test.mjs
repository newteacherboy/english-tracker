// Paket ekranındaki liste fiyatları ve plan sınırları sunucudakilerle aynı kalmalı.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRODUCTS } from '../supabase/functions/billing/play.mjs';
const src = readFileSync(new URL('../ingilizce/dm-satis.js', import.meta.url), 'utf8');
test('dm-satis list prices match billing products', () => {
  for (const [id, p] of Object.entries(PRODUCTS)) {
    const m = src.match(new RegExp(`id: '${id}'[^}]*list: \\{ aylik: (\\d+), yillik: (\\d+) \\}`));
    assert.ok(m, id + ' missing in dm-satis.js');
    assert.deepEqual({ aylik: +m[1], yillik: +m[2] }, p.listPrice, id);
  }
});
test('dm-satis energy packs match the storefront', () => {
  const shop = readFileSync(new URL('../ingilizce/storefront.js', import.meta.url), 'utf8');
  assert.match(shop, /packs = \[\[5,230\],\[10,300\],\[15,460\]\]/);
  assert.match(src, /PACKS = \[\[5, 230\], \[10, 300\], \[15, 460\]\]/);
});
