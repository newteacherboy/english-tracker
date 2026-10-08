const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const root=path.join(__dirname,'../ingilizce');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.DIJI_CHROMIUM,args:['--no-sandbox']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://nav.test/**',route=>{const f=path.join(root,new URL(route.request().url()).pathname.slice(1));return fs.existsSync(f)?route.fulfill({path:f}):route.fulfill({body:''});});
const ids=['tab-dunya','tab-meduakis','tab-sanaozel','tab-aktiviteler','tab-derscalis','tab-magaza','tab-profil','tab-dunyam'];
const fixture='<html><head><meta charset="utf-8"><style>body{margin:0;background:#e4f4ed;font-family:Arial}.bottom-nav-mobile{position:fixed;z-index:99998;display:flex}.bn-item{display:flex;flex-direction:column;align-items:center}#bottomNavMobile .nav-akis-rozet{position:absolute;top:0;right:0}.dc-fullscreen-overlay{display:none}</style><link rel="stylesheet" href="/bottom-nav.css"></head><body><div class="bottom-nav-mobile" id="bottomNavMobile">'+ids.map(id=>'<button class="bn-item" data-ekran="'+id+'" onclick="window.called=this.dataset.ekran"><span class="bn-icon">🦜</span><span class="bn-label">Old</span></button>').join('')+'</div><script src="/bottom-nav.js"></script></body></html>';
await page.route('https://nav.test/',r=>r.fulfill({contentType:'text/html',body:fixture}));
let checks=0;
for(const width of [320,390,768,1024]){
await page.setViewportSize({width,height:844});await page.goto('https://nav.test/');await page.waitForTimeout(150);
const state=await page.evaluate(()=>{
const nav=document.getElementById('bottomNavMobile');const bs=[...nav.querySelectorAll('.bn-item')].filter(b=>getComputedStyle(b).display!=='none');
const rect=b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
const play=bs.find(b=>b.dataset.ekran==='tab-dunya'),others=bs.filter(b=>b!==play);
return {display:getComputedStyle(nav).display,play:rect(play),nav:rect(nav),labels:others.map(b=>b.querySelector('.bn-label').textContent),others:others.map(rect),aria:bs.map(b=>b.getAttribute('aria-label')),sprite:bs.map(b=>getComputedStyle(b.querySelector('.dm-nav-art')).backgroundImage)};
});
assert.equal(state.display,'grid');assert.deepEqual(state.labels,['Arkadaşlar','Oyunlar','Ders Çalış','Mağaza','Benim Dünyam']);
assert(Math.abs(state.play.x+state.play.w/2-width/2)<1);
assert(state.play.bottom<=Math.min(...state.others.map(r=>r.y))+1,'raised control must not overlap lower row');
assert(state.play.w>state.others[0].h,'Oyna visibly larger');
for(const r of state.others){assert(r.w>=44&&r.h>=44);assert(r.x>=0&&r.right<=width+.1);}
const widths=state.others.map(r=>r.w);assert(Math.max(...widths)-Math.min(...widths)<1);
assert(state.sprite.every(x=>x.includes('bottom-nav-icons-v3.webp')));
await page.locator('[data-ekran="tab-dunya"]').click();assert.equal(await page.evaluate(()=>called),'tab-dunya');
await page.locator('[data-ekran="tab-magaza"]').click();assert.equal(await page.evaluate(()=>called),'tab-magaza');
if(width===390)await page.screenshot({path:'/workspace/scratch/3b1e0e84cae5/nav-approved/mobile-nav.png',clip:{x:0,y:620,width:390,height:224}});
if(width===1024)await page.screenshot({path:'/workspace/scratch/3b1e0e84cae5/nav-approved/desktop-nav.png',clip:{x:160,y:610,width:704,height:234}});
console.log('PASS '+width+'px: centered play, five equal targets, no overlap, original handlers');checks++;
}
await page.evaluate(()=>{const n=document.getElementById('bottomNavMobile');n.append(n.querySelector('[data-ekran="tab-meduakis"]'));n.querySelector('[data-ekran="tab-meduakis"] .bn-label').textContent='Medu Akış';n.querySelector('[data-ekran="tab-dunya"]').classList.add('active');});
await page.waitForTimeout(150);
assert.equal(await page.locator('[data-ekran="tab-meduakis"] .bn-label').textContent(),'Arkadaşlar');
assert.equal(await page.locator('[data-ekran="tab-dunya"]').getAttribute('aria-current'),'page');
assert.equal(await page.locator('[data-ekran="tab-dunyam"]').evaluate(e=>e===e.parentElement.lastElementChild),true);
console.log('PASS dynamic menu updates keep names, keyboard order and selected state');checks++;
const index=fs.readFileSync(root+'/index.html','utf8');for(const m of index.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(/src=|application\/ld\+json/.test(m[1]))continue;new vm.Script(m[2]);}
assert(!index.includes('Medu Akış'));assert(index.includes('bottom-nav.css?v=5'));assert(index.includes('papi-guide-content.js?v=2'));
const guide=require(root+'/papi-guide-content.js');assert(guide.sections.find(s=>s.id==='navigation').text.includes('Mağaza’nın kendi alt menü düğmesi'));
assert.equal(guide.sections.length,56);assert.equal(guide.tours['level-guide'].length,40);
console.log('PASS renamed UI, Help and tours preserve all existing content');checks++;
assert.deepEqual(errors,[]);console.log(checks+' checks passed');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
