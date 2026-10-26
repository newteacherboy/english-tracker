const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const SCHOOL=require('../ingilizce/school-curriculum.js');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const words=[{en:'book',tr:'kitap'},{en:'good morning',tr:'günaydın'},{en:'classroom',tr:'derslik'},{en:'Friday',tr:'Cuma'}],tasks=SCHOOL.build(words,words,220151);
 let answers={},events=[],failWrites=false;
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname==='/api'){
  const b=route.request().postDataJSON();events.push(b);let d={ok:true};
  if(['verifiedGameStart','verifiedGameStatus'].includes(b.islem))d={...d,words,tasks,answers,slots:tasks.map((t,slot)=>({slot,kind:t.kind}))};
  if(b.islem==='ekonomi')d={...d,enerjiKalan:10,enerjiMax:25};
  if(b.islem==='verifiedGameAnswer'){
   if(b.answer?.mistake)return route.fulfill({status:503,json:{ok:false,mesaj:'Kombo servisi geçici olarak kapalı.'}});
   if(failWrites)return route.abort();
   if(answers[b.slot]?.complete)d={...d,correct:answers[b.slot].correct,duplicate:true};
   else{const g=SCHOOL.grade(tasks[b.slot],b.answer),old=answers[b.slot]||{misses:0};answers[b.slot]={correct:g.correct,complete:g.complete,firstCorrect:g.correct&&!old.misses,misses:old.misses+(g.correct?0:1)};d={...d,...answers[b.slot],energy:{energy:10,max:25,gain:0}};}
  }
  return route.fulfill({json:d});
 }
 if(u.hostname!=='review.test')return route.abort();
 if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="thematic-learning.css"><link rel="stylesheet" href="learning-question-v1.css"><body><script>let aktifOgrenciAdi="Ada";var apiURL="https://review.test/api",genelEnerjiKalan=10,yo={altin:0};localStorage.setItem("ing_token","fixture");window.OC={basla(){this.aktif={}},dogru(){},yanlis(){}};</script>'+['learning-core.js','verified-games.js','thematic-learning.js','school-curriculum.js','school-lesson.js'].map(f=>'<script src="'+f+'"></script>').join('')+'</body></html>'});const f=path.resolve('ingilizce','.'+u.pathname);return f.startsWith(path.resolve('ingilizce')+path.sep)&&fs.existsSync(f)?route.fulfill({path:f}):route.fulfill({status:404,body:''});});
 await page.goto('https://review.test/');await page.setViewportSize({width:390,height:844});
 for(const scenario of [{wrongAt:0,offline:false},{wrongAt:3,offline:false},{wrongAt:3,offline:true}]){
  answers=Object.fromEntries(Array.from({length:11},(_,i)=>[i,{complete:true,correct:true,firstCorrect:true,misses:0}]));events=[];failWrites=scenario.offline;
  await page.evaluate(async words=>{window.finished=null;localStorage.removeItem('dm_school_shared_v1:Ada:220151');await dmSchoolLesson.start({D:{no:220151,sinif:2,unite:1,kelimeler:words},b:0,d:0,pool:words,onFinish:s=>window.finished=s});},words);await page.locator('.ml-entry-start').click();
  for(let j=0;j<4;j++){await page.waitForFunction(j=>document.querySelector('.ml-review-count')?.textContent==='Kart '+(j+1)+' / 4',j);const c=tasks[11].cards[j],choice=j===scenario.wrongAt?c.options.find(x=>x!==c.tr):c.tr;await page.locator('[data-review-choice="'+c.options.indexOf(choice)+'"]').click();if(j===scenario.wrongAt){assert.match(await page.locator('[data-ml-combo]').textContent(),/^0/);await page.locator('[data-review-continue]').click();}}
  if(scenario.offline){await page.locator('[data-review-retry]').waitFor();assert.match(await page.locator('.ml-review-count').textContent(),/4 \/ 4/);assert.equal(await page.locator('[data-review-choice]').count(),0,'all four choices are retained');assert.equal(await page.locator('[data-review-retry]').isEnabled(),true);failWrites=false;await page.locator('[data-review-retry]').click();}await page.locator('.ml-actions [data-next]').waitFor();assert.match(await page.locator('.ml-feedback').innerText(),/Yanlış cevap/);await page.locator('.ml-actions [data-next]').click();
  await page.waitForFunction(()=>!!window.finished);assert.equal(await page.evaluate(()=>finished.dogru),9);assert.equal(await page.evaluate(()=>finished.yanlis),1);assert.equal(await page.locator('#dmStoryLesson').count(),0);
  assert.equal(events.filter(e=>e.islem==='verifiedGameAnswer'&&e.answer?.mistake).length,0,'review correctness resets combo atomically with the final four answers');
  assert(events.filter(e=>e.islem==='verifiedGameAnswer').every(e=>Array.isArray(e.answer)&&e.answer.length===4));
  if(!scenario.offline)assert.equal(events.filter(e=>e.islem==='ekonomi').length,1,'no separate energy/combo request for a wrong review card');
  console.log('PASS final review completes with wrong card and unavailable combo service',scenario);
 }
 assert.deepEqual(errors,[]);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
