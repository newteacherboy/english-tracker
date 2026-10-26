const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.DIJI_CHROMIUM,args:['--no-sandbox']}),page=await browser.newPage(),root=path.resolve('ingilizce'),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://wallet.test/**',r=>{const f=path.join(root,new URL(r.request().url()).pathname.slice(1));return fs.existsSync(f)&&fs.statSync(f).isFile()?r.fulfill({path:f}):r.fulfill({body:''});});
await page.goto('https://wallet.test/');
const source=fs.readFileSync(root+'/index.html','utf8'),styles=[...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(x=>x[1]).join('\n');
const files=['portal-world-extracted.css','oyna-v2.css','activity-ui.css','friends-ui.css','study-ui.css','storefront.css','profile-sections.css','member-polish.css','day-night-theme.css','papi-wallet.css'];
const screens=[['tab-dunya','<header class="rt-top"><h1>İngilizce Yolum</h1><div class="rt-wallet"></div></header>'],['tab-aktiviteler','<div class="gg-brand"><b>DijiMedu</b><span>Eski altın</span></div><h1>Oyunlar</h1>'],['tab-meduakis','<div class="akis-baslik"><h2>Arkadaşlar</h2><button class="fr-back">Geri</button></div>'],['tab-derscalis','<div class="su-levels-heading"><h1>Ders Çalış</h1></div>'],['tab-magaza','<header class="ds-header"><div class="ds-heading"><h1>Mağaza</h1></div><button class="ds-wallet">Eski altın</button></header>'],['tab-ilerlemem','<header><h1>İlerlemem</h1></header>']];
await page.setContent('<meta charset="utf-8"><style>'+styles+'</style>'+files.map(f=>'<link rel="stylesheet" href="/'+f+'">').join('')+'<style>body{margin:0!important;padding:0!important;display:block!important}#panel-alani{display:block!important;width:100%!important}#panel-alani>.fixture{position:relative!important;inset:auto!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;padding:12px!important;min-height:0!important}.fixture[hidden]{display:none!important}</style><div id="panel-alani">'+screens.map(([id,content],i)=>'<section class="fixture dc-fullscreen-overlay'+(!i?' active':'')+'" id="'+id+'" '+(i?'hidden':'')+'>'+content+'</section>').join('')+'</div>');
await page.evaluate(()=>{window.aktifOgrenciAdi='Fixture';window.yo={altin:422,totalXp:5106};window.genelEnerjiKalan=31;window.dmProgression={level:()=>5};window.dmActiveTime={summary:()=>({stars:45,seconds:27240}),panel:()=>window.opened='time'};window.dijiEnerjiPaneliAc=()=>window.opened='energy';window.magazaAc=()=>window.opened='gold';window.dmIlerlememAc=()=>window.opened='xp';});
await page.addScriptTag({url:'/papi-wallet.js'});
for(const width of [320,390,768,1280])for(const theme of ['day','night']){
await page.setViewportSize({width,height:844});await page.evaluate(theme=>document.documentElement.dataset.dmTheme=theme,theme);
for(const [id] of screens){
await page.evaluate(id=>{for(const e of document.querySelectorAll('.fixture')){e.hidden=e.id!==id;e.classList.toggle('active',e.id===id);}DijiMeduPapiWallet.refresh();},id);
if(id==='tab-meduakis'){assert.equal(await page.locator('.dm-unified-wallet').count(),0,'Friends feed has no wallet by design');continue;}
assert.equal(await page.locator('.dm-unified-wallet').count(),1,id);
assert.equal(await page.locator('#'+id+' .dm-unified-wallet').count(),1,id);
assert.deepEqual(await page.locator('[data-pw-value]').allTextContents(),['31','422','5.106','45']);
assert.equal(await page.locator('[data-pw-minutes]').textContent(),'454 dk');
fs.mkdirSync('/tmp/compact-wallet',{recursive:true});await page.locator('#'+id).screenshot({path:'/tmp/compact-wallet/'+id+'-'+width+'-'+theme+'.png'});
const sizes=await page.locator('.dm-unified-wallet').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,pills:[...e.querySelectorAll('button')].map(x=>{const r=x.getBoundingClientRect();return {top:r.top,right:r.right,height:r.height,width:r.width,client:x.clientWidth,scroll:x.scrollWidth};})}));
assert(sizes.scroll<=sizes.width+1,'strip fits '+id+' '+width);assert(sizes.pills.every(x=>x.right<=width+1&&x.height>=44&&x.width>=40&&x.scroll<=x.client+1),'pills fit '+id+' '+width+' '+JSON.stringify(sizes));assert(Math.max(...sizes.pills.map(x=>x.top))-Math.min(...sizes.pills.map(x=>x.top))<1,'one row');
for(const key of ['energy','gold','xp','time']){await page.locator('[data-pw='+key+']').click();assert.equal(await page.evaluate(()=>opened),key);}
}
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
await page.evaluate(()=>{document.body.classList.add('dm-guest-mode');document.querySelector('#panel-alani').innerHTML='<section id="tab-dunya" class="dc-fullscreen-overlay active"><header class="rt-top"><h1>Okul Yolum</h1></header></section><button id="ybEnerji">Eski enerji</button>';DijiMeduPapiWallet.refresh();});
assert.equal(await page.locator('#tab-dunya').evaluate(e=>e.getBoundingClientRect().top),44,'guest toolbar does not cover the status strip');assert(await page.locator('#ybEnerji').isHidden(),'one energy indicator');
assert.deepEqual(errors,[]);await browser.close();console.log('PASS compact status strip, buttons, existing-time meaning, stable icon DOM and activity suppression');
})().catch(e=>{console.error(e);process.exit(1)});
