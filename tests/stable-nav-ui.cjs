const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
const root=path.join(__dirname,'../ingilizce'),index=fs.readFileSync(root+'/index.html','utf8');
const styles=[...index.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
const nav=index.match(/<div class="bottom-nav-mobile" id="bottomNavMobile"[\s\S]*?<\/div>/)[0];
const b=await chromium.launch({executablePath:process.env.DIJI_CHROMIUM,args:['--no-sandbox']});const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route('https://flat.test/**',r=>{const f=path.join(root,new URL(r.request().url()).pathname.slice(1));return fs.existsSync(f)?r.fulfill({path:f}):r.fulfill({body:''});});
const html='<html><head><meta charset="utf-8"><style>'+styles+'</style><link rel="stylesheet" href="/bottom-nav.css"></head><body>'+nav+'<script>window.dunyaAc=()=>window.called="play";window.magazaAc=()=>window.called="store";</script></body></html>';
await p.route('https://flat.test/',r=>r.fulfill({contentType:'text/html',body:html}));
for(const w of [320,390,600,1024]){
await p.setViewportSize({width:w,height:844});await p.goto('https://flat.test/');
const state=await p.evaluate(()=>{const n=document.getElementById('bottomNavMobile'),bs=[...n.children].filter(e=>getComputedStyle(e).display!=='none');return bs.map(e=>{const r=e.getBoundingClientRect();return{id:e.dataset.ekran,x:r.x,y:r.y,w:r.width,h:r.height,center:r.y+r.height/2};});});
assert.deepEqual(state.map(x=>x.id),['tab-dunya','tab-meduakis','tab-aktiviteler','tab-derscalis','tab-magaza','tab-profile-menu']);
assert(Math.max(...state.map(x=>x.center))-Math.min(...state.map(x=>x.center))<1,'all buttons in same row');
assert(Math.max(...state.map(x=>x.w))-Math.min(...state.map(x=>x.w))<1,'equal widths');assert(state.every(x=>x.w>=44&&x.h>=44));
await p.addScriptTag({url:'https://flat.test/bottom-nav.js'});assert.equal(await p.locator('.dm-nav-play').count(),0);
assert.deepEqual(await p.locator('#bottomNavMobile .bn-label:visible').allTextContents(),['Parkur','Arkadaşlar','Oyunlar','Ders Çalış','Mağaza','Profil']);
const compact=await p.locator('#bottomNavMobile').evaluate(e=>({height:e.getBoundingClientRect().height,overflow:e.scrollWidth>e.clientWidth}));assert(compact.height<=84);assert(!compact.overflow);
await p.evaluate(()=>{document.querySelectorAll('#bottomNavMobile .bn-item').forEach(e=>e.classList.toggle('active',e.dataset.ekran==='tab-dunya'));});
assert.equal(await p.locator('[data-ekran="tab-dunya"] .bn-icon').evaluate(e=>getComputedStyle(e,'::after').backgroundColor),'rgb(0, 165, 171)');
await p.locator('#bottomNavMobile').screenshot({path:'/tmp/sticker-nav-'+w+'.png'});

for(const [id,v] of [['tab-dunya','play'],['tab-magaza','store']]){await p.locator('[data-ekran="'+id+'"]').click();assert.equal(await p.evaluate(()=>called),v);}
await p.locator('[data-ekran="tab-profile-menu"]').click();assert(await p.locator('#rtProfileBackdrop').isVisible());await p.locator('.rt-close').click();
await p.evaluate(()=>{const n=document.getElementById('bottomNavMobile');n.append(n.firstElementChild);});await p.waitForTimeout(50);assert.equal(await p.locator('#bottomNavMobile').evaluate(n=>n.firstElementChild.dataset.ekran),'tab-dunya');
console.log('PASS '+w+'px: six equal destinations, original handlers and independent profile menu');
}
for(const m of index.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(/src=|application\/ld\+json/.test(m[1]))continue;new vm.Script(m[2]);}
assert.deepEqual(errors,[]);await b.close();console.log('PASS inline JavaScript parse and no runtime errors');
})().catch(e=>{console.error(e);process.exit(1);});