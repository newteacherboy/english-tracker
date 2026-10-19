// Günün / Haftanın 3 görevi: counts on first load, reward button fits the fixed-height purple card,
// claiming applies the server wallet and shows one announcement with the rewards; repeat logins keep data.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const inside=(inner,outer)=>inner&&outer&&inner.y>=outer.y-0.5&&inner.y+inner.height<=outer.y+outer.height+0.5&&inner.x>=outer.x-0.5&&inner.x+inner.width<=outer.x+outer.width+0.5;
const fits=(box,size)=>box&&box.x>=0&&box.y>=0&&box.x+box.width<=size.width+0.5&&box.y+box.height<=size.height+0.5;
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 for(const size of [{width:375,height:667},{width:390,height:844},{width:1024,height:768}]){
  const page=await browser.newPage({viewport:size,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const u=new URL(route.request().url());const file=path.join(process.cwd(),'ingilizce',u.pathname.slice(1));if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
   return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/learning-companion.css"><link rel="stylesheet" href="/parkur-purple.css"><body><div id="tab-dunya"><section class="dm-goal-carousel"><div class="dm-goal-pages" id="pages"></div></section></div></body>'});});
  await page.goto('https://papi.test/');
  await page.evaluate(()=>{window.aktifOgrenciAdi='Ece';window.__period='daily';window.__asks=0;window.__applied=[];window.__toasts=[];window.__ops=[];
   window.__reply={gunlukGorevOdul:{ok:true,eklenen:30,xp:70,alindi:true,yo:{altin:40,totalXp:570,dmRewardVersion:2}},haftalikGorevOdul:{ok:true,eklenen:100,xp:120,alindi:true,yo:{altin:140,totalXp:690,dmRewardVersion:3}}};
   window.dmLearningCompanion={refresh:()=>{window.__asks++;return Promise.resolve(null);}};
   window.dmEkonomi={islem:async is=>{window.__ops.push(is);return window.__reply[is];},odulIslem:async is=>{window.__ops.push(is);return window.__reply[is];}};
   window.dmApplyRewardState=(y,o)=>{window.__applied.push([y.totalXp,o]);return true;};window.yoToast=m=>window.__toasts.push(m);
   window.dmRefreshRouteCards=()=>{document.getElementById('pages').innerHTML=window.dmRouteMissions.markup(window.__period);};});
  await page.addScriptTag({url:'/route-missions.js'});
  // First paint before data: placeholder, and the card asks for the summary itself (no tap needed).
  await page.evaluate(()=>window.dmRefreshRouteCards());
  assert.match(await page.locator('#pages').innerText(),/…/);await page.waitForFunction(()=>window.__asks===1);
  await page.evaluate(()=>window.dmRouteMissions.set({daily:{route:1,game:1,review:2},weekly:{route:4,game:9,days:2}},'Ece'));
  assert.match(await page.locator('#pages').innerText(),/2\/3/);assert.equal(await page.locator('[data-rt="claim-mission"]').count(),0);
  await page.evaluate(()=>{document.dispatchEvent(new Event('dm:login'));window.dmRefreshRouteCards();});
  assert.match(await page.locator('#pages').innerText(),/2\/3/,'same-student login keeps missions');
  for(const period of ['daily','weekly']){
   const gold=period==='daily'?30:100,xp=period==='daily'?70:120;
   await page.evaluate(p=>{window.__period=p;window.dmRouteMissions.set({daily:{route:1,game:2,review:3},weekly:{route:10,game:20,days:5}},'Ece');},period);
   const btn=page.locator('[data-rt="claim-mission"]');await btn.waitFor();
   assert.match(await btn.innerText(),new RegExp('\\+'+gold+'.*\\+'+xp+' XP'));
   assert(inside(await btn.boundingBox(),await page.locator('#pages').boundingBox()),period+' reward button not clipped');
   // The compact dm-mission-v2 card sizes this button itself; guard only against a genuinely unusable target.
  assert((await btn.boundingBox()).height>=40,'tap target');
   await btn.click();const dlg=page.locator('#dmMissionReward');await dlg.waitFor();
   const text=await dlg.innerText();assert.match(text,new RegExp('\\+'+gold));assert.match(text,new RegExp('\\+'+xp));assert.match(text,period==='daily'?/Bugünün 3 görevi tamam/:/Haftanın 3 görevi tamam/);
   assert(fits(await dlg.locator('.mr-card').boundingBox(),size),period+' announcement fits screen');
   await page.screenshot({path:'/tmp/mission-reward-'+period+'-'+size.width+'.png'});
   await dlg.locator('button').click();assert.equal(await dlg.count(),0);
   await page.locator('.rt-claim-done').waitFor();
  }
  assert.deepEqual(await page.evaluate(()=>window.__ops),['gunlukGorevOdul','haftalikGorevOdul']);
  assert.deepEqual(await page.evaluate(()=>window.__applied),[[570,'Ece'],[690,'Ece']],'server wallet applied once per claim');
  // Already claimed on another device: no announcement, a short note instead.
  await page.evaluate(()=>{localStorage.clear();window.__period='daily';window.__reply.gunlukGorevOdul={ok:true,eklenen:0,xp:0,alindi:true};window.dmRefreshRouteCards();});
  await page.locator('[data-rt="claim-mission"]').click();await page.locator('.rt-claim-done').waitFor();
  assert.equal(await page.locator('#dmMissionReward').count(),0);assert(await page.evaluate(()=>window.__toasts.some(t=>/zaten aldın/.test(t))));
  // Server refusal keeps the button usable and explains why.
  await page.evaluate(()=>{localStorage.clear();window.__reply.gunlukGorevOdul={ok:false,mesaj:'Önce günün 3 görevini tamamla.'};window.dmRefreshRouteCards();});
  await page.locator('[data-rt="claim-mission"]').click();await page.waitForFunction(()=>window.__toasts.some(t=>/Önce günün 3 görevini/.test(t)));
  assert.equal(await page.locator('[data-rt="claim-mission"]').isEnabled(),true);
  // Offline: the claim is stored on the device and the child is told so, instead of an error.
  await page.evaluate(()=>{localStorage.clear();window.__period='daily';window.__reply.gunlukGorevOdul={ok:true,kuyrukta:true};window.dmRefreshRouteCards();});
  await page.locator('[data-rt="claim-mission"]').click();
  const off=page.locator('#dmMissionReward');await off.waitFor();
  assert.match(await off.innerText(),/internet yok/i,'offline notice shown');
  assert.match(await off.innerText(),/\+30/,'reward still shown');
  await off.locator('button').click();
  await page.locator('.rt-claim-done').waitFor();
  assert.equal(await page.evaluate(()=>window.__toasts.some(t=>/alınamadı|hata/i.test(t))),false,'no error toast offline');
  await page.evaluate(()=>{window.aktifOgrenciAdi='Mert';document.dispatchEvent(new Event('dm:login'));window.dmRefreshRouteCards();});
  assert.match(await page.locator('#pages').innerText(),/…/,'account switch clears missions');
  assert.deepEqual(errors,[]);await page.close();
 }
 await browser.close();console.log('PASS daily-done-ui');
})().catch(e=>{console.error(e);console.log('::error title=daily-done-ui::'+String(e&&e.stack||e).slice(0,900).replace(/%/g,'%25').replace(/\n/g,'%0A'));process.exit(1);});
