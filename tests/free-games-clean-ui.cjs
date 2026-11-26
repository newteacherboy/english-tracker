const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../ingilizce');
(async()=>{const browser=await chromium.launch({headless:true});
try{for(const teacher of [false,true]){
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const cards=[['kelimeYarismasiAc','Kelime Laboratuvarı'],['hafizaOyunAc','Hafıza Sandığı'],['harfBahcesiAc','Harf Bahçesi'],['trenOyunAc','Kelime Treni'],['cumleAc','Cümle Ustası']].map(([fn,title])=>'<button class="az-gcard" onclick="'+fn+'()"><div class="az-gcard-title">'+title+'</div></button>').join('');
await page.route('https://games.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);if(file){const p=path.join(root,file);return fs.existsSync(p)?r.fulfill({path:p}):r.fulfill({status:404,body:''});}
return r.fulfill({contentType:'text/html',body:'<!doctype html><html data-dm-theme="day"><meta charset="utf-8"><link rel="stylesheet" href="activity-ui.css"><link rel="stylesheet" href="games-cat-a.css"><body><section id="tab-aktiviteler" class="active"><div class="dc-focus-card"><div class="az-grid2x2">'+cards+'</div></div></section><script>window.dmTeacherPortalMode='+teacher+';window.aktifOgrenciAdi="learner";window.apiURL="/api";window.dmProgression={level:()=>40,allowed:()=>true};window.dmMeduPro={api:async()=>({liste:[]})};window.yo={altin:0};window.genelEnerjiKalan=25;window.genelEnerjiMax=25;</script><script src="activity-ui.js"></script></body></html>'});});
await page.goto('https://games.test/');
await page.locator('[data-gg-main=free]').click();
const text=await page.locator('.gg-overview').innerText();assert(text.includes('Kelime Laboratuvarı'));
for(const title of ['Harf Bahçesi','Kelime Treni','Cümle Ustası'])assert.equal(text.includes(title),teacher,title+' teacher='+teacher);
for(const selector of ['.gg-category-question','.gg-tabs','.gg-filters'])assert.equal(await page.locator(selector).isVisible(),teacher,selector);
assert.equal(await page.locator('[data-gg-main=premium]').isVisible(),true);
assert.deepEqual(errors,[]);await page.close();console.log('PASS',teacher?'teacher':'student');
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
