const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),os=require('node:os');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
const root=path.join(__dirname,'../ingilizce'),index=fs.readFileSync(root+'/index.html','utf8');
const styles=[...index.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
const markup=index.match(/<div class="bottom-nav-mobile" id="bottomNavMobile"[\s\S]*?<\/div>/)[0];
const browser=await chromium.launch({executablePath:process.env.DIJI_CHROMIUM,args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://gap.test/**',r=>{const f=path.join(root,new URL(r.request().url()).pathname.slice(1));return fs.existsSync(f)?r.fulfill({path:f}):r.fulfill({body:''});});
const fixture='<html><head><meta charset="utf-8"><style>'+styles+'</style><link rel="stylesheet" href="/parkur-map-theme-v1.css"><link rel="stylesheet" href="/bottom-nav.css"></head><body class="dm-parkur-open">'+markup+'<div id="tab-dunya" class="active bz-yeni"><div id="bzParkur" style="position:fixed;inset:0"><div class="bz-ic" style="box-sizing:border-box"><header class="dm-parkur-head" style="height:90px;box-sizing:border-box">Diji-Medu</header><div class="dm-parkur-scroll"><div class="dm-parchment-map" data-map-current="0"><div class="dm-map-track"><div class="dm-map-route"><svg class="dm-map-trail"><path></path></svg></div></div><button class="dm-map-continue" onclick="window.called=true">Devam et</button></div></div></div></div></div><script src="/parkur-map-theme-v1.js"></script><script>dmParkurMapMount(document.querySelector(".dm-parkur-scroll"));</script></body></html>';
await page.route('https://gap.test/',r=>r.fulfill({contentType:'text/html',body:fixture}));
for(const width of [320,390,600,1024]){
await page.setViewportSize({width,height:844});await page.goto('https://gap.test/');await page.waitForTimeout(120);
const state=await page.evaluate(()=>{const map=document.querySelector('.dm-parchment-map'),f=map.parentElement.parentElement,n=document.getElementById('bottomNavMobile'),p=n.querySelector('.dm-nav-play'),bg=getComputedStyle(f,'::before');const fr=f.getBoundingClientRect(),mr=map.getBoundingClientRect(),nr=n.getBoundingClientRect();return{paintBottom:fr.top+parseFloat(bg.top)+parseFloat(bg.height),navTop:nr.top,mapBottom:mr.bottom,paintLeft:fr.left+parseFloat(bg.left),mapLeft:mr.left,background:bg.backgroundImage,mapBackground:getComputedStyle(map).backgroundImage,continueBottom:document.querySelector('.dm-map-continue').getBoundingClientRect().bottom,playTop:p.getBoundingClientRect().top};});
assert(state.background.includes('parkur-map-landscape-v1.svg'));assert.equal(state.mapBackground,'none');assert(Math.abs(state.paintBottom-state.navTop)<1,'backdrop reaches menu with no blank gap');assert(Math.abs(state.paintLeft-state.mapLeft)<1,'scene edges align');assert(state.continueBottom<state.playTop,'continue stays clear');
await page.locator('.dm-map-continue').click();assert.equal(await page.evaluate(()=>called),true);
console.log('PASS '+width+'px: continuous backdrop, matching map edges, continue visible/clickable');
}
await page.setViewportSize({width:390,height:740});await page.waitForTimeout(120);
assert(await page.evaluate(()=>{const m=document.querySelector('.dm-parchment-map'),f=m.parentElement.parentElement,b=getComputedStyle(f,'::before');return Math.abs(f.getBoundingClientRect().top+parseFloat(b.top)+parseFloat(b.height)-document.getElementById('bottomNavMobile').getBoundingClientRect().top)<1;}),'resize updates backdrop');
assert.deepEqual(errors,[]);await page.screenshot({path:path.join(os.tmpdir(),'diji-continuous-map.png')});await browser.close();console.log('PASS resize and no runtime errors');
})().catch(e=>{console.error(e);process.exit(1);});