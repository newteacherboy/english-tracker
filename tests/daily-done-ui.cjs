// Günün 3 görevi: counts appear on first load, the reward button fits the fixed-height purple card,
// claiming shows the reward animation once, and a repeated login event for the same student keeps the data.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const inside=(inner,outer)=>inner&&outer&&inner.y>=outer.y-0.5&&inner.y+inner.height<=outer.y+outer.height+0.5&&inner.x>=outer.x-0.5&&inner.x+inner.width<=outer.x+outer.width+0.5;
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 for(const size of [{width:375,height:667},{width:390,height:844},{width:1024,height:768}]){
  const page=await browser.newPage({viewport:size,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const u=new URL(route.request().url());const file=path.join(process.cwd(),'ingilizce',u.pathname.slice(1));if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
   return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/learning-companion.css"><link rel="stylesheet" href="/parkur-purple.css"><body><div id="tab-dunya"><section class="dm-goal-carousel"><div class="dm-goal-pages" id="pages"></div></section></div></body>'});});
  await page.goto('https://papi.test/');
  await page.evaluate(()=>{window.aktifOgrenciAdi='Ece';window.__asks=0;window.__rewards=[];window.__xp=[];window.__toasts=[];window.__claim={ok:true,eklenen:5,alindi:true};
   window.dmLearningCompanion={refresh:()=>{window.__asks++;return Promise.resolve(null);}};
   window.dmEkonomi={islem:async is=>{window.__lastOp=is;return window.__claim;}};
   window.odulGoster=o=>window.__rewards.push(o);window.dmBaseXpAdd=(x,g)=>window.__xp.push([x,g]);window.yoToast=m=>window.__toasts.push(m);
   window.dmRefreshRouteCards=()=>{document.getElementById('pages').innerHTML=window.dmRouteMissions.markup('daily');};});
  await page.addScriptTag({url:'/route-missions.js'});
  // First paint before data: placeholder, and the card asks for the summary itself (no tap needed).
  await page.evaluate(()=>window.dmRefreshRouteCards());
  assert.match(await page.locator('#pages').innerText(),/…/);await page.waitForFunction(()=>window.__asks===1);
  // Partial progress: counts visible, no reward button.
  await page.evaluate(()=>window.dmRouteMissions.set({daily:{route:1,game:1,review:2},weekly:{}},'Ece'));
  assert.match(await page.locator('#pages').innerText(),/2\/3/);assert.equal(await page.locator('[data-rt="claim-daily"]').count(),0);
  // A repeated login event for the same student must not wipe the counts.
  await page.evaluate(()=>{document.dispatchEvent(new Event('dm:login'));window.dmRefreshRouteCards();});
  assert.match(await page.locator('#pages').innerText(),/2\/3/,'same-student login keeps missions');
  // All done: compact card with a fully visible reward button inside the fixed-height page.
  await page.evaluate(()=>window.dmRouteMissions.set({daily:{route:1,game:2,review:3},weekly:{}},'Ece'));
  const btn=page.locator('[data-rt="claim-daily"]');await btn.waitFor();
  assert(inside(await btn.boundingBox(),await page.locator('#pages').boundingBox()),'reward button not clipped by the card');
  assert((await btn.boundingBox()).height>=44,'tap target');
  await page.screenshot({path:'/tmp/daily-done-'+size.width+'.png'});
  // Claim: server op, XP once, reward animation once, then the claimed note.
  await btn.click();await page.locator('.rt-claim-done').waitFor();
  assert.equal(await page.evaluate(()=>window.__lastOp),'gunlukGorevOdul');
  const rewards=await page.evaluate(()=>window.__rewards);assert.equal(rewards.length,1);assert.equal(rewards[0].altin,5);assert.equal(rewards[0].xp,10);assert.match(rewards[0].alt,/Yarın/);
  assert.deepEqual(await page.evaluate(()=>window.__xp),[[10,0]]);
  assert(inside(await page.locator('.rt-claim-done').boundingBox(),await page.locator('#pages').boundingBox()),'claimed note fits');
  await page.screenshot({path:'/tmp/daily-claimed-'+size.width+'.png'});
  // Already claimed on another device: no second animation or XP.
  await page.evaluate(()=>{localStorage.clear();window.__claim={ok:true,eklenen:0,alindi:true};window.dmRefreshRouteCards();});
  await page.locator('[data-rt="claim-daily"]').click();await page.locator('.rt-claim-done').waitFor();
  assert.equal(await page.evaluate(()=>window.__rewards.length),1);assert.equal(await page.evaluate(()=>window.__xp.length),1);
  // Server refusal keeps the button usable and explains why.
  await page.evaluate(()=>{localStorage.clear();window.__claim={ok:false,mesaj:'Önce günün 3 görevini tamamla.'};window.dmRefreshRouteCards();});
  await page.locator('[data-rt="claim-daily"]').click();await page.waitForFunction(()=>window.__toasts.some(t=>/Önce günün 3 görevini/.test(t)));
  assert.equal(await page.locator('[data-rt="claim-daily"]').isEnabled(),true);
  // A different student clears the previous student's missions.
  await page.evaluate(()=>{window.aktifOgrenciAdi='Mert';document.dispatchEvent(new Event('dm:login'));window.dmRefreshRouteCards();});
  assert.match(await page.locator('#pages').innerText(),/…/,'account switch clears missions');
  assert.deepEqual(errors,[]);await page.close();
 }
 await browser.close();console.log('PASS daily-done-ui');
})().catch(e=>{console.error(e);console.log('::error title=daily-done-ui::'+String(e&&e.stack||e).slice(0,900).replace(/%/g,'%25').replace(/\n/g,'%0A'));process.exit(1);});
