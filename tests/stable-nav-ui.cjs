const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
const root=path.join(__dirname,'../ingilizce'),index=fs.readFileSync(root+'/index.html','utf8');
const styles=[...index.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
const nav=index.match(/<div class="bottom-nav-mobile" id="bottomNavMobile"[\s\S]*?<\/div>/)[0];
const b=await chromium.launch({executablePath:process.env.DIJI_CHROMIUM,args:['--no-sandbox']});const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route('https://flat.test/**',r=>{const f=path.join(root,new URL(r.request().url()).pathname.slice(1));return fs.existsSync(f)?r.fulfill({path:f}):r.fulfill({body:''});});
const html='<html><head><meta charset="utf-8"><style>'+styles+'</style><link rel="stylesheet" href="/parkur-map-theme-v1.css"><link rel="stylesheet" href="/bottom-nav.css"><link rel="stylesheet" href="/benim-dunyam.css"></head><body class="dm-parkur-open">'+nav+'<div id="tab-dunyam" class="bd-kok dc-fullscreen-overlay active"><div class="bd-sahne" style="background-image:url(sahne-sana-ozel.webp)"><p class="bd-balon">Harika gidiyorsun! İlerlemeni aşağıda görebilirsin.</p><div class="bd-ust">'+['Öğretmen','Çıkış','Ayar'].map(s=>'<button class="bd-yuvarlak" onclick="window.headerClicked=true" aria-label="'+s+'"><svg viewBox="0 0 24 24"></svg></button>').join('')+'</div></div></div><script>window.dunyaAc=()=>window.called="play";window.magazaAc=()=>window.called="store";window.benimDunyamAc=()=>window.called="world";</script></body></html>';
await p.route('https://flat.test/',r=>r.fulfill({contentType:'text/html',body:html}));
for(const w of [320,390,600,1024]){
await p.setViewportSize({width:w,height:844});await p.goto('https://flat.test/');
const state=await p.evaluate(()=>{const n=document.getElementById('bottomNavMobile'),bs=[...n.children].filter(e=>getComputedStyle(e).display!=='none');return bs.map(e=>{const r=e.getBoundingClientRect();return{id:e.dataset.ekran,x:r.x,y:r.y,w:r.width,h:r.height,center:r.y+r.height/2};});});
assert.deepEqual(state.map(x=>x.id),['tab-dunya','tab-meduakis','tab-aktiviteler','tab-derscalis','tab-magaza','tab-dunyam']);
assert(Math.max(...state.map(x=>x.center))-Math.min(...state.map(x=>x.center))<1,'all buttons in same row');
assert(Math.max(...state.map(x=>x.w))-Math.min(...state.map(x=>x.w))<1,'equal widths');assert(state.every(x=>x.w>=44&&x.h>=44));
await p.addScriptTag({url:'https://flat.test/bottom-nav.js'});assert.equal(await p.locator('.dm-nav-play').count(),0);
for(const [id,v] of [['tab-dunya','play'],['tab-magaza','store'],['tab-dunyam','world']]){await p.locator('[data-ekran="'+id+'"]').click();assert.equal(await p.evaluate(()=>called),v);}
const head=await p.evaluate(()=>{const a=document.querySelector('.bd-ust'),ball=document.querySelector('.bd-balon');return{bottom:a.getBoundingClientRect().bottom,ballTop:ball.getBoundingClientRect().top,sizes:[...a.children].map(e=>e.getBoundingClientRect().width)};});assert(head.bottom+8<=head.ballTop,'header buttons clear speech bubble');assert(head.sizes.every(x=>x===38));await p.locator('.bd-yuvarlak').first().click();assert.equal(await p.evaluate(()=>headerClicked),true);
await p.evaluate(()=>{const n=document.getElementById('bottomNavMobile');n.append(n.firstElementChild);});await p.waitForTimeout(50);assert.equal(await p.locator('#bottomNavMobile').evaluate(n=>n.firstElementChild.dataset.ekran),'tab-dunya');
console.log('PASS '+w+'px: six equal destinations, Oyna first, original handlers, compact world actions clear text');
}
for(const m of index.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(/src=|application\/ld\+json/.test(m[1]))continue;new vm.Script(m[2]);}
assert.deepEqual(errors,[]);await b.close();console.log('PASS inline JavaScript parse and no runtime errors');
})().catch(e=>{console.error(e);process.exit(1);});