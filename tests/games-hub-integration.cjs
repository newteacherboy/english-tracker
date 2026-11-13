require('./_index-source.cjs');
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
const premiumGames=[
 ['rallyActivity','ralliOyunAc'],
 ['premiumWordMatchActivity','premiumKelimeEslestirmeAc'],
 ['premiumCloudFlightActivity','premiumBulutUcusuAc'],
 ['premiumWordBlocksActivity','premiumKelimeBloklariAc'],
 ['papizzleActivity','papizzleAc']
];
const shelfIds=()=>page.locator(".gg-shelf-card:visible").evaluateAll(cards=>cards.map(card=>card.dataset.ggSource));
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']}),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://games.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);if(file)return r.fulfill({path:path.join(base,file)});return r.fulfill({contentType:'text/html',body:'<!doctype html><html data-dm-theme="night"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+styles+'</style><link rel="stylesheet" href="approved-centre.css"><link rel="stylesheet" href="activity-ui.css"><link rel="stylesheet" href="papi-wallet.css"><link rel="stylesheet" href="day-night-theme.css"><style>body{margin:0!important}#tab-aktiviteler{display:block!important;position:static!important;inset:auto!important;height:auto!important;min-height:100vh}#tab-aktiviteler .dc-focus-card{width:100%;margin:0 auto!important}</style></head><body>'+markup+'<div class="yb-fw gor">Yardım</div><script>window.dmTeacherPortalMode=location.search==="?teacher";window.aktifOgrenciAdi="Mert";localStorage.setItem("ing_token","fixture");window.yo={altin:129};window.genelEnerjiKalan=14;window.genelEnerjiMax=30;window.dmProgression={level:()=>11,allowed:()=>true};window.dmMeduPro={api:async()=>({liste:[],serverNow:new Date().toISOString()})};</script><link rel="stylesheet" href="mola-vakti.css"><link rel="stylesheet" href="kelime-golu.css"><script src="activity-ui.js"></script><script src="mola-chapters.js"></script><script src="mola-core.js"></script><script src="mola-vakti.js"></script><script src="kelime-golu.js"></script><script src="papi-wallet.js"></script><script>(function(){'+legacy+'})();</script></body></html>'});});
for(const width of [320,390,768,1180]){
await page.setViewportSize({width,height:844});await page.goto('https://games.test/');
await page.waitForTimeout(3300);
assert.equal(await page.locator('.az-grid2x2>.ak-acik:visible,.az-grid2x2>.ak-etiket:visible').count(),0,'Legacy descriptions escaped the cards');
assert.equal(await page.locator('.gg-title h1').evaluate(e=>getComputedStyle(e).color),'rgb(244, 247, 255)');
const compact=await page.evaluate(()=>{
 const b=document.querySelector('.gg-title').getBoundingClientRect();
 const nav=[...document.querySelectorAll('.gg-tabs button')].map(el=>el.getBoundingClientRect());
 return {bannerHeight:b.height,cards:nav.map(r=>({height:r.height,width:r.width})),fits:nav.every(r=>r.x>=-1&&r.right<=innerWidth+1)};
});
assert.equal(await page.locator('[data-gg-main]:visible').count(),2);
assert.equal(await page.locator('.gg-tabs button:visible').count(),0);
await page.locator('[data-gg-main=free]').click();
assert.equal(await page.locator('.gg-tabs').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),3);
assert.equal(await page.locator('.gg-filters:visible').count(),1);
assert.equal(await page.locator('#ggOnlineTab span').evaluate(el=>getComputedStyle(el).color),'rgb(244, 247, 255)');
assert.equal(await page.locator('.gg-brand [data-pw]:visible').count(),4);
assert(compact.bannerHeight <= 210,'Games header not compact: '+JSON.stringify(compact));

assert(compact.fits,'Category buttons extend beyond the viewport');
assert(await page.locator('#ggPremiumTab').count()===1,'Premium Oyunlar tab must be visible');
await page.locator('[data-gg-main=premium]').click();
assert.deepEqual((await shelfIds()).sort(),premiumGames.map(([id])=>id).sort());
await page.locator('[data-gg-main=free]').click();
await page.locator('#ggSoloTab').click();
assert(await page.locator('.gg-list-row:visible').count()>0);
assert((await page.locator('.gg-row-copy small:visible').allTextContents()).every(label=>label==='Tek Kişilik'));
assert.equal(await page.locator('.yb-fw:visible').count(),0,'Floating shortcuts obscure the hub');
await page.evaluate(()=>{for(const [id,title] of [['papiCardsActivity','Papi Kartları'],['meteorActivity','Papi’nin Meteor Düellosu'],['wordWheelActivity','Papi’nin Kelime Çarkı']]){const b=document.createElement('button');b.className='az-gcard';b.id=id;b.innerHTML='<div class="az-gcard-title">'+title+'</div>';document.querySelector('.az-grid2x2').append(b);}});
await page.waitForSelector('#wordWheelActivity.gg-game',{state:'attached'});await page.locator('#ggFreeTab').click();
await page.evaluate(()=>{const b=document.querySelector('[onclick="baModuAc()"]');if(b)b.style.display='grid';});
assert.deepEqual(await shelfIds(),['papiCardsActivity','meteorActivity','wordWheelActivity','sentenceRaceActivity']);
assert.equal(await page.locator('[data-gg-source=sentenceRaceActivity] .gg-cover img').getAttribute('src'),'games-assets/cumle-yarisi-cover.svg');

const fitted=await page.locator('[data-gg-source=papiCardsActivity] .gg-cover').evaluate(cover=>{
 const frame=cover.getBoundingClientRect(),art=cover.querySelector('.gg-art').getBoundingClientRect();
 return Math.abs(frame.width-frame.height)<=1&&Math.abs(art.width-frame.width)<=1&&!cover.querySelector('.gg-cover-backdrop');
});
assert(fitted,'Atlas artwork fills the square thumbnail');
const challenge=await page.locator('.gg-matches>div').evaluate(el=>({color:getComputedStyle(el.querySelector('span')).color,bg:getComputedStyle(el).backgroundImage}));
assert.equal(challenge.color,'rgb(244, 247, 255)');
assert.match(challenge.bg,/rgb\(51, 73, 111\)/);
if(width===390&&process.env.GAMES_SCREENSHOT)await page.screenshot({path:process.env.GAMES_SCREENSHOT+'.challenge.png'});
await page.locator('#ggBreakTab').click();
assert.deepEqual(await shelfIds(),['mola-kosu','mola-zipla','mola-patlat']);
const coverFit=await page.locator('.gg-cover').evaluateAll(covers=>covers.every(cover=>{
 const art=cover.querySelector('.gg-art'),img=cover.querySelector('img'),box=cover.getBoundingClientRect();
 return getComputedStyle(cover).overflow==='hidden'&&art.getBoundingClientRect().width<=box.width&&img.getBoundingClientRect().height<=box.height;
}));
assert(coverFit,'Mola artwork must stay within its cover');
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
await page.locator('[data-gg-main=premium]').click();
if(width===390&&process.env.GAMES_SCREENSHOT)await page.screenshot({path:process.env.GAMES_SCREENSHOT});
await page.evaluate(()=>{document.documentElement.dataset.dmTheme='day';});
assert.equal(await page.locator('.gg-list-view').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(248, 250, 252)');
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Day mode horizontal overflow');
if(width===390&&process.env.GAMES_SCREENSHOT)await page.screenshot({path:process.env.GAMES_SCREENSHOT+'.day.png'});
console.log('PASS real app styles and late legacy decorators '+width+'px');
}
await page.setViewportSize({width:390,height:844});
await page.goto('https://games.test/?teacher');
await page.evaluate(games=>{
 window.openedPremium=[];
 for(const [id,open] of games)window[open]=()=>window.openedPremium.push(id);
},premiumGames);
assert(await page.locator('.gg-list-view.gg-teacher-list').isVisible());
assert(await page.locator('.gg-search input').isVisible());
assert(await page.locator('#ggOnlineTab').isHidden());
assert(await page.locator('#ggBreakTab').isHidden());
assert.equal(await page.locator('#ggFreeTab span').textContent(),'Sınıfta Oyna');
assert(await page.locator('.gg-list-row:visible').count()>0);
assert(await page.locator('.gg-brand').isHidden());
await page.locator('[data-gg-main=premium]').click();
assert.deepEqual((await shelfIds()).sort(),premiumGames.map(([id])=>id).sort());
for(const [id] of premiumGames)await page.locator('[data-gg-source="'+id+'"]').click();
assert.deepEqual(await page.evaluate(()=>window.openedPremium),premiumGames.map(([id])=>id));
assert.deepEqual(errors,[]);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
