const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('Çantam bag module and assets are completely removed',()=>{
 const html=fs.readFileSync('ingilizce/index.html','utf8');
 const store=fs.readFileSync('ingilizce/storefront.js','utf8');
 const nav=fs.readFileSync('ingilizce/bottom-nav.js','utf8');
 assert.equal(fs.existsSync('ingilizce/bag-inventory.js'),false);
 assert.equal(fs.existsSync('ingilizce/bag-inventory.css'),false);
 assert.doesNotMatch(html,/bag-inventory/);
 assert.doesNotMatch(store,/bag-inventory|dmBagInventory/);
 assert.doesNotMatch(nav,/data-profile="bag"|Çantam|dmBagInventory/);
});
test('Profile replaces Çantam with Veli Hesabına Geç in the Mağaza button row',()=>{
 const nav=fs.readFileSync('ingilizce/bottom-nav.js','utf8');
 assert.match(nav,/data-profile="shop"[\s\S]*data-profile="parentSwitch"[\s\S]*Veli Hesabına Geç/);
 assert.match(nav,/parentSwitch:\(\)=>\{if\(typeof window\.dmParentBridge\?\.open==='function'\)/);
});
test('Emoji sticker products are removed from client and server shop catalogs',()=>{
 const shopJs=fs.readFileSync('ingilizce/app-js/i20-fiyatlar.js','utf8');
 assert.doesNotMatch(shopJs,/id:\s*'c:'|\['cik',\s*'🏷️ Çıkartma'\]/);
 for(const p of ['supabase/functions/diji-api/progression-shop.json','supabase/functions/medupro-api/progression-shop.json']){
  const items=JSON.parse(fs.readFileSync(p,'utf8'));
  assert.equal(items.filter(x=>x.kat==='cik'||String(x.id).startsWith('c:')).length,0,p);
 }
});
