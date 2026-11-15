const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
 for(const viewport of [{width:390,height:844},{width:320,height:640},{width:844,height:390}]){
  const page=await browser.newPage({viewport}),draws=[],errors=[];let fail=false,allExhausted=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://oral.test/**',async r=>{
   const url=new URL(r.request().url());
   if(url.pathname==='/teacher-oral'){
    const body=JSON.parse(r.request().postData());let data;
    if(body.action==='setup')data={ok:true,pupils:[{id:'a',username:'Ada',class_no:5,branch:'A'}]};
    if(body.action==='units')data={ok:true,units:[1,2,3]};
    if(body.action==='draw'){
     draws.push(body);
     if(fail){fail=false;return r.abort();}
     data=allExhausted||body.unit===1?{ok:true,exhausted:true,mesaj:'Tüm kelimeler soruldu.'}:{ok:true,question:{id:'q',english:'Maths',turkish:'Matematik',status:'pending',expires_at:new Date(Date.now()+15000).toISOString()}};
    }
    if(body.action==='grade')data={ok:true,xp:20,question:{id:'q',english:'Maths',turkish:'Matematik',status:'correct'}};
    return r.fulfill({json:data});
   }
   if(url.pathname==='/')return r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="teacher-oral.css"><script>var apiURL="https://oral.test/diji-api";sessionStorage.setItem("ing_ogr_token","teacher-token");Math.random=()=>.999;</script><script src="teacher-oral.js"></script>'});
   return r.fulfill({path:path.resolve('ingilizce','.'+url.pathname)});
  });
  await page.goto('https://oral.test/');await page.evaluate(()=>dmTeacherOral.open());
  await page.locator('[data-class] + div button').click();await page.locator('[data-student] + div button').click();
  const unit=i=>page.locator('[data-unit] + div button').nth(i);
  await unit(0).click();await unit(1).click();
  assert.deepEqual(await page.locator('[data-unit]').evaluate(s=>[...s.selectedOptions].map(o=>o.value)),['1','2']);
  assert.equal(await page.locator('[data-unit] + div [aria-pressed=true]').count(),2);
  await unit(1).click();assert.equal(await page.locator('[data-unit] + div [aria-pressed=true]').count(),1);await unit(1).click();
  await page.locator('[data-draw]').click();await page.locator('[data-word]').filter({hasText:'Maths'}).waitFor();
  assert.deepEqual(draws.map(d=>d.unit),[1,2],'exhausted unit falls through to the next selected unit');
  assert.notEqual(draws[0].requestId,draws[1].requestId);
  await page.locator('[data-question-back]').click();
  assert.equal(await unit(0).isDisabled(),true,'pending questions lock unit changes');
  assert.equal(await page.locator('[data-unit] + div [aria-pressed=true]').count(),2);
  await page.locator('[data-open-question]').click();await page.locator('[data-grade=yes]').click();
  const next=page.locator('[data-next-word]');await next.waitFor();await page.waitForFunction(()=>!document.querySelector('[data-next-word]').disabled);
  const a=await page.locator('.dm-oral-grades').boundingBox(),b=await next.boundingBox();
  assert(b.y>=a.y+a.height+25,'next button has a clear gap below grading');assert(b.height>=54);
  assert.match(await next.evaluate(e=>getComputedStyle(e).backgroundImage),/linear-gradient/);
  await next.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/oral-multi-'+viewport.width+'.png'});
  await page.locator('[data-question-back]').click();await unit(0).click();
  fail=true;await page.locator('[data-draw]').click();await page.waitForFunction(()=>!document.querySelector('[data-draw]').disabled&&document.querySelector('[data-question-screen]').hidden);
  const failed=draws.at(-1);await page.locator('[data-draw]').click();await page.locator('[data-word]').filter({hasText:'Maths'}).waitFor();
  assert.equal(draws.at(-1).unit,failed.unit);assert.equal(draws.at(-1).requestId,failed.requestId,'retry keeps the same unit and request id');
  await page.locator('[data-grade=yes]').click();await page.waitForFunction(()=>!document.querySelector('[data-next-word]').disabled);
  allExhausted=true;await next.click();await page.waitForFunction(()=>document.querySelector('[data-question-screen]').hidden);
  await unit(1).click();assert.equal(await page.locator('[data-draw]').isDisabled(),true,'no selected units disables draw');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  await page.close();console.log('PASS multi-unit, fallback, retry and layout '+viewport.width+'x'+viewport.height);
 }
 const page=await browser.newPage();
 await page.route('https://games.test/**',r=>{
  const pathname=new URL(r.request().url()).pathname;
  if(pathname!=='/')return r.fulfill({path:path.resolve('ingilizce','.'+pathname)});
  return r.fulfill({contentType:'text/html',body:`<!doctype html><section id="tab-aktiviteler" class="active"><div class="dc-focus-card"><div class="az-grid2x2">${[['rallyActivity','Kelime Rallisi'],['towerActivity','Dengesiz Kule'],['kelimeGoluSolo','Kelime Golü']].map(([id,title])=>'<button id="'+id+'" class="az-gcard"><span class="az-gcard-title">'+title+'</span></button>').join('')}</div></div></section><script>window.yo={altin:0};window.dmProgression={allowed:()=>true};</script><script src="activity-ui.js"></script>`});
 });
 await page.goto('https://games.test/');
 for(const teacher of [false,true]){
  await page.evaluate(t=>{window.dmTeacherPortalMode=t;dmGamesUI.enter();},teacher);
  const ids=await page.locator('.gg-shelf-card').evaluateAll(cards=>cards.map(c=>c.dataset.ggSource));
  assert.deepEqual(ids.slice(0,2),['kelimeGoluSolo','papizzleActivity']);assert.equal(ids.at(-1),'rallyActivity');
 }
 console.log('PASS premium order for student and teacher');await page.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
