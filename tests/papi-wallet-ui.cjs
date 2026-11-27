require('./_index-source.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.DIJI_CHROMIUM,args:['--no-sandbox']}),page=await browser.newPage(),root=path.resolve('ingilizce'),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://wallet.test/**',r=>{const f=path.join(root,new URL(r.request().url()).pathname.slice(1));return fs.existsSync(f)&&fs.statSync(f).isFile()?r.fulfill({path:f}):r.fulfill({body:''});});
await page.goto('https://wallet.test/');
const source=fs.readFileSync(root+'/index.html','utf8'),styles=[...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(x=>x[1]).join('\n');
const files=['portal-world-extracted.css','oyna-v2.css','activity-ui.css','friends-ui.css','study-ui.css','storefront.css','profile-sections.css','member-polish.css','day-night-theme.css','papi-wallet.css','papi-tuy.css','notification-center.css'];
const screens=[['tab-dunya','<header class="rt-top"><h1>İngilizce Yolum</h1><div class="rt-wallet"></div></header>'],['tab-aktiviteler','<div class="gg-brand"><b>DijiMedu</b><span>Eski altın</span></div><h1>Oyunlar</h1>'],['tab-meduakis','<div class="fr-wallet-host"></div><div class="akis-baslik"><h2>Arkadaşlar</h2><button class="fr-back">Geri</button></div>'],['tab-derscalis','<div class="su-levels-heading"><h1>Ders Çalış</h1></div>'],['tab-magaza','<header class="ds-header"><div class="ds-heading"><h1>Mağaza</h1></div><button class="ds-wallet">Eski altın</button></header>'],['tab-ilerlemem','<header><h1>İlerlemem</h1></header>']];
await page.setContent('<meta charset="utf-8"><style>'+styles+'</style>'+files.map(f=>'<link rel="stylesheet" href="/'+f+'">').join('')+'<style>body{margin:0!important;padding:0!important;display:block!important}#panel-alani{display:block!important;width:100%!important}#panel-alani>.fixture{position:relative!important;inset:auto!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;padding:12px!important;min-height:0!important}.fixture[hidden]{display:none!important}</style><div id="panel-alani">'+screens.map(([id,content],i)=>'<section class="fixture dc-fullscreen-overlay'+(!i?' active':'')+(id==='tab-meduakis'?' fr-home-view':'')+'" id="'+id+'" '+(i?'hidden':'')+'>'+content+'</section>').join('')+'</div>');
await page.evaluate(()=>{window.aktifOgrenciAdi='Fixture';window.yo={altin:422,totalXp:5106};window.genelEnerjiKalan=31;window.dmProgression={level:()=>5};window.dmActiveTime={summary:()=>({stars:45,seconds:27240}),panel:()=>window.opened='time'};window.dijiEnerjiPaneliAc=()=>window.opened='energy';window.magazaAc=()=>window.opened='gold';window.dmIlerlememAc=()=>window.opened='xp';});
await page.addScriptTag({url:'/papi-wallet.js'});
for(const width of [320,390,768,1280])for(const theme of ['day','night']){
await page.setViewportSize({width,height:844});await page.evaluate(theme=>document.documentElement.dataset.dmTheme=theme,theme);
for(const [id] of screens){
await page.evaluate(id=>{for(const e of document.querySelectorAll('.fixture')){e.hidden=e.id!==id;e.classList.toggle('active',e.id===id);}DijiMeduPapiWallet.refresh();},id);
assert.equal(await page.locator('.dm-unified-wallet').count(),1,id);
assert.equal(await page.locator('#'+id+' .dm-unified-wallet').count(),1,id);
assert.deepEqual(await page.locator('[data-pw-value]').allTextContents(),['31','422','5.106']);
assert.equal(await page.locator('[data-pw=time],[data-pw-minutes]').count(),0);
fs.mkdirSync('/tmp/compact-wallet',{recursive:true});await page.locator('#'+id).screenshot({path:'/tmp/compact-wallet/'+id+'-'+width+'-'+theme+'.png'});
const sizes=await page.locator('.dm-unified-wallet').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,pills:[...e.querySelectorAll('button')].filter(x=>x.getClientRects().length).map(x=>{const r=x.getBoundingClientRect();return {top:r.top,right:r.right,height:r.height,width:r.width,client:x.clientWidth,scroll:x.scrollWidth};})}));
assert(sizes.scroll<=sizes.width+1,'strip fits '+id+' '+width);assert(sizes.pills.every(x=>x.right<=width+1&&x.height>=(id==='tab-meduakis'?34:44)&&x.width>=40&&x.scroll<=x.client+1),'pills fit '+id+' '+width+' '+JSON.stringify(sizes));assert(Math.max(...sizes.pills.map(x=>x.top))-Math.min(...sizes.pills.map(x=>x.top))<1,'one row');
const activeKeys=id==='tab-magaza'?['energy','gold']:id==='tab-ilerlemem'?['xp']:['energy','gold','xp'];
assert.deepEqual(await page.locator('[data-pw]:visible').evaluateAll(xs=>xs.map(x=>x.dataset.pw)),activeKeys,id);
for(const key of activeKeys){await page.locator('[data-pw='+key+']').click();assert.equal(await page.evaluate(()=>opened),key);}
}
await page.evaluate(()=>{const friends=document.getElementById('tab-meduakis');for(const screen of document.querySelectorAll('.fixture'))screen.hidden=screen!==friends;friends.classList.add('active');friends.classList.remove('fr-home-view');DijiMeduPapiWallet.refresh();});
assert.equal(await page.locator('.dm-unified-wallet').count(),0,'Friends detail has no wallet');
await page.evaluate(()=>document.getElementById('tab-meduakis').classList.add('fr-home-view'));
console.log('PASS six destinations, '+width+'px, '+theme);
}
// Large balances must stay inside every mobile status pill, not merely be clipped.
for(const width of [320,360,390,430]){
 await page.setViewportSize({width,height:844});
 for(const [id] of screens.slice(0,2))for(const balance of [9999,12345,99999,1234567,999999999]){
  await page.evaluate(({id,balance})=>{for(const e of document.querySelectorAll('.fixture')){e.hidden=e.id!==id;e.classList.toggle('active',!e.hidden);}yo.altin=balance;yo.totalXp=balance;DijiMeduPapiWallet.refresh();},{id,balance});
  const contained=await page.locator('[data-pw=gold]').evaluate(e=>{const p=e.getBoundingClientRect(),v=e.querySelector('[data-pw-value]').getBoundingClientRect();return v.left>=p.left&&v.right<=p.right&&v.top>=p.top&&v.bottom<=p.bottom;});
  assert(contained,'gold value fits '+id+' '+width+' '+balance);
 }
}
await page.evaluate(()=>{window.savedIcon=document.querySelector('.dm-pw-xp');yo.totalXp=98765;DijiMeduPapiWallet.refresh();});assert(await page.evaluate(()=>savedIcon===document.querySelector('.dm-pw-xp')),'updates retain icons');
await page.evaluate(()=>{const e=document.createElement('div');e.id='dmStoryLesson';e.textContent='Question';document.body.append(e);});await page.waitForFunction(()=>!document.querySelector('.dm-unified-wallet'));await page.evaluate(()=>document.getElementById('dmStoryLesson').remove());await page.waitForFunction(()=>document.querySelector('.dm-unified-wallet'));
await page.evaluate(()=>{yo.totalXp=1234567;DijiMeduPapiWallet.refresh();});assert((await page.locator('[data-pw=xp]').getAttribute('aria-label')).includes('1.234.567'));
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.documentElement.dataset.dmTheme='day';yo.totalXp=5106;for(const e of document.querySelectorAll('.fixture')){e.hidden=e.id!=='tab-dunya';e.classList.toggle('active',!e.hidden);}DijiMeduPapiWallet.refresh();});
fs.mkdirSync('/tmp/compact-wallet',{recursive:true});await page.locator('#tab-dunya').screenshot({path:'/tmp/compact-wallet/wallet-390.png'});
// Real notification UI with a mocked, account-bound RPC transport.
await page.evaluate(()=>{window.SUPABASE_URL='https://wallet.test';window.SUPABASE_ANON_KEY='fixture';sessionStorage.setItem('ing_ogr_token','fixture-session');window.DijiPapiWing=window.DijiDailyGift={open:()=>window.opened='feather',decorateButton:b=>{if(!b.querySelector('[data-daily-count]'))b.innerHTML='<span data-daily-count>4/7</span>';else b.querySelector('[data-daily-count]').textContent='4/7';},onParkurVisible:()=>{}};window.fixtureUnread=5;window.dmBasarilarimAc=()=>window.opened='badge';window.fetch=async(u,o)=>{const x=JSON.parse(o.body);if(x.p_token!=='fixture-session')throw Error('session');if(x.p_action==='read_all')fixtureUnread=0;if(x.p_action==='read')fixtureUnread=Math.max(0,fixtureUnread-1);return {ok:true,json:async()=>({ok:true,unread:fixtureUnread,items:[{sat:'fixture-id',tur:'rozet',title:'Yeni rozet',metin:'Rozet kazandın',tarih:new Date().toISOString(),okundu:fixtureUnread<5}]})}};});
await page.addScriptTag({url:'/notification-center.js'});
await page.evaluate(()=>{window.dmZirve={openStudentHub:()=>window.opened='campaign'};window.fetch=async(u,o)=>{const x=JSON.parse(o.body);if(x.p_action==='read_all')fixtureUnread=0;else if(x.p_action==='read')fixtureUnread=Math.max(0,fixtureUnread-1);return {ok:true,json:async()=>({ok:true,unread:fixtureUnread,items:[{sat:'fixture-id',tur:'rozet',title:'Yeni rozet',metin:'Rozet kazandın',tarih:new Date().toISOString(),okundu:fixtureUnread<5},{sat:'fixture-campaign',tur:'duyuru',title:'24 Kasım Yarışması',metin:'Öğretmenimle Zirveye yarışmasında sıralamanı gör.',routeTab:'campaign',tarih:new Date().toISOString(),okundu:false},{sat:'fixture-long',tur:'duyuru',title:'Yeni bir yarışma duyurusu',metin:'Bu uzun bir açıklamadır. Bildirim metni uzasa bile satırlar en fazla iki satırda kalmalı ve kart boyutu sabit olmalıdır.',tarih:new Date().toISOString(),okundu:false}]})}};});
await page.evaluate(()=>DijiMeduPapiWallet.refresh());
await page.waitForFunction(()=>document.querySelector('.dm-center-count')?.textContent==='+5');
assert.equal(await page.locator('.dm-unified-wallet > button').count(),5);
assert.equal(await page.locator('.dm-unified-wallet > button').last().getAttribute('class'),'dm-center-bell');
for(const width of [320,390,768]){
 await page.setViewportSize({width,height:844});
 await page.evaluate(()=>{for(const e of document.querySelectorAll('.fixture')){e.hidden=e.id!=='tab-meduakis';e.classList.toggle('active',!e.hidden);}DijiMeduPapiWallet.refresh();});
 const metrics=await page.locator('.dm-unified-wallet').evaluate(h=>{const r=h.getBoundingClientRect(),buttons=[...h.querySelectorAll(':scope>button')];return{wallet:[r.left,r.right],buttons:buttons.map(x=>{const z=x.getBoundingClientRect();return[z.left,z.right,z.top,z.bottom]})};});
 assert.equal(metrics.buttons.length,5,'five HUD indicators including bell');
 assert(metrics.buttons.every((x,i)=>x[0]>=metrics.wallet[0]-2&&x[1]<=metrics.wallet[1]+2&&(!i||x[0]>=metrics.buttons[i-1][1]-2)),'Friends HUD no overlap: '+JSON.stringify({width,metrics}));
 }
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{for(const e of document.querySelectorAll('.fixture')){e.hidden=e.id!=='tab-dunya';e.classList.toggle('active',!e.hidden);}DijiMeduPapiWallet.refresh();});
const bellMetrics=await page.locator('.dm-center-bell').evaluate(b=>{const x=b.getBoundingClientRect(),n=b.querySelector('.dm-center-count').getBoundingClientRect(),v=b.querySelector('svg').getBoundingClientRect();return {button:[x.left,x.top,x.right,x.bottom],count:[n.left,n.top,n.right,n.bottom],icon:v.width};});
assert(bellMetrics.icon<=20,'bell icon matches compact controls');
assert(bellMetrics.count[0]>=bellMetrics.button[0]&&bellMetrics.count[2]<=bellMetrics.button[2]+3&&bellMetrics.count[1]>=bellMetrics.button[1]-5&&bellMetrics.count[3]<=bellMetrics.button[3]+2,'red count anchored to bell: '+JSON.stringify(bellMetrics));
await page.locator('.dm-center-bell').click();
const panelBox=await page.locator('.dm-center-panel').boundingBox();assert(panelBox.width<=322&&panelBox.height<=366,'compact popover: '+JSON.stringify(panelBox));
const heights=await page.locator('.dm-center-item').evaluateAll(list=>list.map(x=>Math.round(x.getBoundingClientRect().height)));assert(heights.length===3&&Math.max(...heights)-Math.min(...heights)<=3,'consistent notification card heights: '+heights);
await page.locator('.dm-center-row').first().click();
await page.waitForFunction(()=>window.opened==='badge');assert.equal(await page.locator('.dm-center-count').textContent(),'+4');
await page.locator('.dm-center-bell').click();await page.locator('.dm-center-row').nth(1).click();await page.waitForFunction(()=>window.opened==='campaign');
await page.locator('.dm-center-layer').waitFor({state:'detached'});await page.locator('.dm-center-bell').click();await page.locator('.dm-center-controls button').click();await page.waitForFunction(()=>document.querySelector('.dm-center-count').hidden);
await page.keyboard.press('Escape');assert.equal(await page.locator('.dm-center-layer').count(),0);
await page.locator('[data-dm-daily-streak]').click();assert.equal(await page.evaluate(()=>opened),'feather');
await page.evaluate(()=>{document.body.classList.add('dm-guest-mode');document.querySelector('#panel-alani').innerHTML='<section id="tab-dunya" class="dc-fullscreen-overlay active"><header class="rt-top"><h1>Okul Yolum</h1></header></section><button id="ybEnerji">Eski enerji</button>';DijiMeduPapiWallet.refresh();});
assert.equal(await page.locator('#tab-dunya').evaluate(e=>e.getBoundingClientRect().top),44,'guest toolbar does not cover the status strip');assert(await page.locator('#ybEnerji').isHidden(),'one energy indicator');
assert.deepEqual(errors,[]);await browser.close();console.log('PASS compact status strip, buttons, combined indicators, stable icon DOM and activity suppression');
})().catch(e=>{console.error(e);process.exit(1)});
