import { runInNewContext } from 'node:vm';
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
  assert.match(shop, /packs = \[\[5,350\],\[10,600\],\[15,850\]\]/);
  assert.match(src, /PACKS = \[\[5, 350\], \[10, 600\], \[15, 850\]\]/);
});

test('insufficient-gold messages use the current pack price', async () => {
  const file=readFileSync(new URL('../ingilizce/app-js/i12-1-ekonomi.js',import.meta.url),'utf8');
  const start=file.indexOf('async function enerjiPaketiAl('),end=file.indexOf('  window.enerjiPaketiAl =',start);
  assert(start>=0&&end>start);
  const apiCalls=[];
  const purchase=runInNewContext('('+file.slice(start,end)+')',{
    window:{dmEkonomi:{islem:async(action,payload)=>{apiCalls.push([action,payload.miktar]);return {ok:false,mesaj:'Yetersiz altın',ekonomi:{altin:100}}}},DijiReklam:{altinEksik(){}}},
    yo:{altin:100},yoVar:()=>true,toast(){}
  });
  for(const [amount,shortage] of [[5,250],[10,500],[15,750]]){
    let message='';assert.equal(await purchase(amount,m=>message=m),false);
    assert.equal(message,`🪙 Bu paket için ${shortage} altın daha gerekiyor.`);
  }
  assert.deepEqual(apiCalls,[['enerjiPaketAl',5],['enerjiPaketAl',10],['enerjiPaketAl',15]]);
});
