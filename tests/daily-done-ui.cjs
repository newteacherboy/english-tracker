// Daily missions celebration: shows once per student per day, waits for open activities, fits small phones.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 for(const size of [{width:375,height:667},{width:390,height:844},{width:1024,height:768}]){
  const page=await browser.newPage({viewport:size});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const u=new URL(route.request().url());const file=path.join(process.cwd(),'ingilizce',u.pathname.slice(1));if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><body></body>'});});
  await page.goto('https://papi.test/');
  await page.evaluate(()=>{window.aktifOgrenciAdi='Ece';window.__busy=false;window.dmFirstDiscovery={activityOpen:()=>window.__busy};});
  await page.addScriptTag({url:'/route-missions.js'});
  const partial={daily:{route:1,game:1,review:2},weekly:{}},done={daily:{route:1,game:2,review:3},weekly:{}};
  await page.evaluate(d=>window.dmRouteMissions.set(d,'Ece'),partial);
  assert.equal(await page.locator('#dmDailyDone').count(),0,'no celebration before all three missions');
  // An open activity defers the celebration instead of interrupting it.
  await page.evaluate(d=>{window.__busy=true;window.dmRouteMissions.set(d,'Ece');},done);
  await page.waitForTimeout(500);assert.equal(await page.locator('#dmDailyDone').count(),0,'deferred during activity');
  await page.evaluate(()=>{window.__busy=false;});
  await page.locator('#dmDailyDone').waitFor({timeout:5000});
  assert.match(await page.locator('#dmDailyDone h2').innerText(),/3 görevi tamam/);
  assert.match(await page.locator('#dmDailyDone .dd-next').innerText(),/Yarın seni bekleyenler/);
  const card=await page.locator('#dmDailyDone .dd-card').boundingBox();
  assert(card.x>=0&&card.y>=0&&card.x+card.width<=size.width+0.5&&card.y+card.height<=size.height+0.5,'card fits viewport '+JSON.stringify(card));
  const btn=await page.locator('#dmDailyDone button').boundingBox();assert(btn.height>=44,'tap target');
  await page.screenshot({path:'/tmp/daily-done-'+size.width+'.png'});
  await page.locator('#dmDailyDone button').click();assert.equal(await page.locator('#dmDailyDone').count(),0);
  // Same day, same student: never again. Another student still gets theirs.
  await page.evaluate(d=>window.dmRouteMissions.set(d,'Ece'),done);await page.waitForTimeout(200);
  assert.equal(await page.locator('#dmDailyDone').count(),0,'once per day');
  await page.evaluate(d=>{window.aktifOgrenciAdi='Mert';window.dmRouteMissions.set(d,'Mert');},done);
  await page.locator('#dmDailyDone').waitFor({timeout:3000});await page.keyboard.press('Escape');
  assert.equal(await page.locator('#dmDailyDone').count(),0,'escape closes');
  assert.deepEqual(errors,[]);await page.close();
 }
 await browser.close();console.log('PASS daily-done-ui');
})().catch(e=>{console.error(e);process.exit(1);});
