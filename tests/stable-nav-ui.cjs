const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
const root=path.join(__dirname,'../ingilizce'),index=fs.readFileSync(root+'/index.html','utf8'),css=fs.readFileSync(root+'/bottom-nav.css','utf8');
const realStyles=[...index.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n')+'\n'+fs.readdirSync(root).filter(f=>f.endsWith('.css')&&!f.includes('preview')&&f!=='bottom-nav.css').map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const markup=index.match(/<div class="bottom-nav-mobile" id="bottomNavMobile"[\s\S]*?<\/div>/)[0];
const browser=await chromium.launch({executablePath:process.env.DIJI_CHROMIUM,args:['--no-sandbox']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://nav.test/**',r=>{const f=path.join(root,new URL(r.request().url()).pathname.slice(1));return fs.existsSync(f)?r.fulfill({path:f}):r.fulfill({body:''});});
const fixture='<html><head><meta charset="utf-8"><style>'+css+'</style><style>'+realStyles+'</style></head><body><div style="height:100vh"></div>'+markup+'</body></html>';
await page.route('https://nav.test/',r=>r.fulfill({contentType:'text/html',body:fixture}));
async function state(){return page.evaluate(()=>{
 const n=document.getElementById('bottomNavMobile'),p=n.querySelector('[data-ekran="tab-dunya"]');const r=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,bottom:b.bottom};};
 return {nav:r(n),play:r(p),background:getComputedStyle(n).backgroundImage,playBg:getComputedStyle(p).backgroundImage,transform:getComputedStyle(p).transform,labels:[...n.querySelectorAll('.bn-label')].map(e=>e.textContent),row:[...n.children].filter(e=>e!==p).map(r),selected:getComputedStyle(n.querySelector('[data-ekran="tab-dunyam"]')).backgroundImage,labelColor:getComputedStyle(n.querySelector('[data-ekran="tab-dunyam"] .bn-label')).color};
});}
for(const width of [320,390,600,1024]){
 await page.setViewportSize({width,height:844});await page.goto('https://nav.test/');
 const first=await state();assert.equal(first.row.length,5);assert(Math.abs(first.play.x+first.play.w/2-width/2)<1,'cold start centered');
 assert(first.play.bottom<=Math.min(...first.row.map(r=>r.y)),'no overlap');
 assert(first.background.includes('linear-gradient'));assert(first.playBg.includes('radial-gradient'));
 await page.addScriptTag({url:'https://nav.test/bottom-nav.js'});
 await page.evaluate(()=>{document.body.classList.add('dm-parkur-open');document.querySelector('[data-ekran="tab-dunya"]').classList.add('active');});
 const parkur=await state();assert.deepEqual(parkur.play,first.play,'parkur style must never move play');assert.equal(parkur.background,first.background);assert(parkur.playBg.includes('radial-gradient'));
 await page.evaluate(()=>{document.body.classList.remove('dm-parkur-open');document.querySelector('[data-ekran="tab-dunya"]').classList.remove('active');document.querySelector('[data-ekran="tab-dunyam"]').classList.add('active');});
 const world=await state();assert.deepEqual(world.play,first.play);assert(world.selected.includes('rgb(242, 233, 255)'));assert.equal(world.labelColor,'rgb(48, 36, 134)');
 await page.evaluate(()=>{window.dunyaAc=()=>window.called='play';window.magazaAc=()=>window.called='store';window.benimDunyamAc=()=>window.called='world';});
 for(const [id,expected] of [['tab-dunya','play'],['tab-magaza','store'],['tab-dunyam','world']]){await page.locator('[data-ekran="'+id+'"]').click();assert.equal(await page.evaluate(()=>called),expected);}

 console.log('PASS '+width+'px: static cold start, actual page/theme styles, stable selected states, original navigation');
}
for(const m of index.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(/src=|application\/ld\+json/.test(m[1]))continue;new vm.Script(m[2]);}
assert(index.indexOf('bottom-nav.css?v=6')<index.indexOf('</head>'));
assert(markup.includes('data-bc="parkur"'));assert(markup.includes('onclick="benimDunyamAc()"'));
assert.deepEqual(errors,[]);await browser.close();console.log('PASS inline script parse and early menu stylesheet');
})().catch(e=>{console.error(e);process.exit(1);});
