const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
const base=path.resolve(__dirname,'../ingilizce'),source=fs.readFileSync(process.env.GAMES_REAL_INDEX||path.join(base,'index.html'),'utf8');
const styles=[...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n');
const start=source.indexOf('<div id="tab-aktiviteler"'),end=source.indexOf('<div id="tab-konusmapratigi"',start);
const markup=source.slice(start,end).replace('class="dc-fullscreen-overlay"','class="dc-fullscreen-overlay active"');
const legacyStart=source.indexOf('  const KART = ['),legacyEnd=source.indexOf('  /* Oyun pencerelerinin başlıkları */',legacyStart);
assert(legacyStart>0&&legacyEnd>legacyStart);
const legacy=source.slice(legacyStart,legacyEnd);
const browser=await chromium.launch({args:['--no-sandbox']}),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://games.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);if(file)return r.fulfill({path:path.join(base,file)});return r.fulfill({contentType:'text/html',body:'<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+styles+'</style><link rel="stylesheet" href="activity-ui.css"><style>body{margin:0!important}#tab-aktiviteler{display:block!important;position:static!important;inset:auto!important;height:auto!important;min-height:100vh}#tab-aktiviteler .dc-focus-card{width:100%;margin:0 auto!important}</style></head><body>'+markup+'<div class="yb-fw gor">Yardım</div><script>window.aktifOgrenciAdi="Mert";localStorage.setItem("ing_token","fixture");window.yo={altin:129};window.genelEnerjiKalan=14;window.genelEnerjiMax=30;window.dmProgression={level:()=>11,allowed:()=>true};window.dmMeduPro={api:async()=>({liste:[],serverNow:new Date().toISOString()})};</script><script src="activity-ui.js"></script><script>(function(){'+legacy+'})();</script></body></html>'});});
for(const width of [320,390,768,1180]){
await page.setViewportSize({width,height:844});await page.goto('https://games.test/');
await page.waitForTimeout(3300);
assert.equal(await page.locator('.az-grid2x2>.ak-acik:visible,.az-grid2x2>.ak-etiket:visible').count(),0,'Legacy descriptions escaped the cards');
assert.equal(await page.locator('.gg-title h1').evaluate(e=>getComputedStyle(e).color),'rgb(56, 35, 22)');
const compact=await page.evaluate(()=>{
 const b=document.querySelector('.gg-title').getBoundingClientRect();
 const nav=[...document.querySelectorAll('.gg-tabs [role=tab]')].map(el=>el.getBoundingClientRect());
 return {bannerHeight:b.height,cards:nav.map(r=>({height:r.height,width:r.width})),fits:nav.every(r=>r.x>=-1&&r.right<=innerWidth+1)};
});
assert.equal(compact.cards.length,5);
assert(compact.bannerHeight <= 200,'Games header not compact: '+JSON.stringify(compact));
assert(compact.cards.every(c=>c.height<=125&&c.width>35),'Game category overflow: '+JSON.stringify(compact));
assert(compact.fits,'Category buttons extend beyond the viewport');
assert.equal(await page.locator('.gg-heading').evaluate(e=>getComputedStyle(e).color),'rgb(56, 35, 22)');
assert.equal(await page.locator('.yb-fw:visible').count(),0,'Floating shortcuts obscure the hub');
await page.evaluate(()=>{for(const [id,title] of [['papiCardsActivity','Papi Kartları'],['meteorActivity','Papi’nin Meteor Düellosu'],['wordWheelActivity','Papi’nin Kelime Çarkı']]){const b=document.createElement('button');b.className='az-gcard';b.id=id;b.innerHTML='<div class="az-gcard-title">'+title+'</div>';document.querySelector('.az-grid2x2').append(b);}});
await page.waitForSelector('#wordWheelActivity.gg-game',{state:'attached'});await page.locator('#ggFreeTab').click();
await page.evaluate(()=>{const b=document.querySelector('[onclick="baModuAc()"]');if(b)b.style.display='grid';});
assert.deepEqual(await page.locator('.az-grid2x2>.az-gcard:visible').evaluateAll(a=>a.map(e=>e.id)),['sentenceRaceActivity','papiCardsActivity','meteorActivity','wordWheelActivity']);
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
if(width===390)console.log('GAMES_REAL_PREVIEW:'+(await page.screenshot({type:'jpeg',quality:65,fullPage:true})).toString('base64'));
console.log('PASS real app styles and late legacy decorators '+width+'px');
}
assert.deepEqual(errors,[]);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
