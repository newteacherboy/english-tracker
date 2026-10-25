const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const SCHOOL=require('../ingilizce/school-curriculum.js');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const banks=[[{en:'book',tr:'kitap'},{en:'good morning',tr:'günaydın'},{en:'classroom',tr:'derslik'},{en:'Friday',tr:'Cuma'}],[{en:'Pay attention to your teacher.',tr:'Öğretmenini dikkatle dinle.'},{en:'May I come in, please?',tr:'İçeri girebilir miyim, lütfen?'},{en:'Keep your classroom clean.',tr:'Sınıfını temiz tut.'},{en:'Raise your hand to speak.',tr:'Konuşmak için elini kaldır.'}]];
 let words=banks[0],tasks=SCHOOL.build(words,words,220151),answers={},events=[],energy=25,finished,failOnce=false;
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname==='/api'){
  const b=route.request().postDataJSON();events.push(b);let d={ok:true};
  if(['verifiedGameStart','verifiedGameStatus'].includes(b.islem))d={...d,words,tasks,answers,slots:tasks.map((t,slot)=>({slot,kind:t.kind,en:t.en}))};
  if(b.islem==='verifiedGameAnswer'){const g=SCHOOL.grade(tasks[b.slot],b.answer),old=answers[b.slot]||{misses:0},a={correct:g.correct,complete:g.complete,firstCorrect:g.correct&&!old.misses,misses:old.misses+(g.correct?0:1)};answers[b.slot]=a;if(failOnce){failOnce=false;return route.abort();}d={...d,...a,energy:{energy,max:25,gain:0}};}
  if(b.islem==='ekonomi')d={...d,enerjiKalan:energy,enerjiMax:25};
  return route.fulfill({json:d});
 }
 if(u.hostname!=='school.test')return route.abort();
 if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:system-ui}.dm-papi-held{display:none!important}</style><link rel="stylesheet" href="thematic-learning.css"><link rel="stylesheet" href="learning-question-v1.css"><link rel="stylesheet" href="school-soft-cards.css"><body><script>let aktifOgrenciAdi="Ada";var apiURL="https://school.test/api",genelEnerjiKalan=25,yo={altin:10};localStorage.setItem("ing_token","fixture");window.OC={basla(){this.aktif={}},dogru(){},yanlis(){}};</script>'+['learning-core.js','verified-games.js','thematic-learning.js','school-curriculum.js','school-word-art.js','school-lesson.js','papi-flow.js'].map(f=>'<script src="'+f+'"></script>').join('')+'</body></html>'});const f=path.resolve('ingilizce','.'+u.pathname);return f.startsWith(path.resolve('ingilizce')+path.sep)&&fs.existsSync(f)?route.fulfill({path:f}):route.fulfill({status:404,body:''});});
 await page.goto('https://school.test/');
 const out='/tmp/school-shared-qa';fs.mkdirSync(out,{recursive:true});
 for(const size of [{width:320,height:568},{width:360,height:640},{width:390,height:844},{width:768,height:1024},{width:1440,height:900},{width:844,height:390}]){
  await page.setViewportSize(size);
  const parrots=new Set();for(const bank of banks)for(const step of [0,2,3,4,5,6,7,8,9,10,11]){
   words=bank;tasks=SCHOOL.build(words,words,220151);answers=Object.fromEntries(Array.from({length:step},(_,i)=>[i,{complete:true,correct:true,firstCorrect:true,misses:0}]));events=[];
   await page.evaluate(async words=>{localStorage.removeItem('dm_school_shared_v1:Ada:220151');await dmSchoolLesson.start({D:{no:220151,sinif:2,unite:1,kelimeler:words},b:0,d:0,pool:words,onFinish:s=>window.finished=s});},words);await page.locator('.ml-entry-start').click();await page.waitForTimeout(100);
   if(bank===banks[0]&&step>=2&&step<=11)parrots.add(await page.locator('[data-ml-character=school-parrot]').getAttribute('src'));
   if(step===8){for(const button of await page.locator('[data-token]').all())await button.click();}
   const m=await page.locator('#dmStoryLesson').evaluate(root=>{const stage=root.querySelector('.ml-stage'),r=stage.getBoundingClientRect();return {scroll:root.scrollHeight-root.clientHeight,fallback:root.classList.contains('ml-scroll-fallback'),bottom:r.bottom,combo:root.querySelector('[data-ml-combo]').textContent,buttons:[...root.querySelectorAll('.ml-task button,.ml-actions button')].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,x:r.x,y:r.y,right:r.right,bottom:r.bottom,overflow:b.scrollHeight-b.clientHeight,hit:b.disabled||b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};})};});
   assert(m.scroll<=3&&!m.fallback&&m.bottom<=size.height+2,JSON.stringify({size,step,m}));assert(m.combo.includes('/ 5'));
   for(const b of m.buttons)assert(b.x>=-1&&b.y>=0&&b.right<=size.width+1&&b.bottom<=size.height+2&&b.overflow<=3&&b.hit,JSON.stringify({size,step,b}));
   if(step===0){if(size.width===390&&bank===banks[0])await page.screenshot({path:path.join(out,'school-teach-approved.png')});assert.equal(await page.locator('[data-learn]').count(),4);await page.locator('.ml-actions .ml-primary').click();await page.waitForSelector('[data-answer]');assert.deepEqual(events.filter(e=>e.islem==='verifiedGameAnswer').map(e=>e.slot),[0,1]);}
   if(size.width===390&&bank===banks[0])await page.screenshot({path:path.join(out,'school-'+step+'.png')});
   if(step===5){await page.locator('[data-left="0"]').click();await page.locator('[data-right="1"]').click();await page.waitForFunction(()=>document.querySelector('[data-ml-combo]').textContent.trim().startsWith('0'));await page.waitForTimeout(70);assert(events.some(e=>e.islem==='verifiedGameAnswer'&&e.answer?.mistake));await page.locator('[data-left="0"]').click();await page.locator('[data-right="0"]').click();await page.locator('[data-left="1"]').click();await page.waitForTimeout(250);for(const side of ['left','right']){const color=await page.locator('[data-'+side+'="0"]').evaluate(e=>({background:getComputedStyle(e).backgroundColor,opacity:getComputedStyle(e).opacity,disabled:e.disabled}));assert.deepEqual(color,{background:'rgb(214, 244, 223)',opacity:'1',disabled:true});}}
   await page.evaluate(()=>dmThematicLearning.close(true));
  }
  assert.equal(parrots.size,10,'each question uses a different parrot');console.log('PASS school forms, grouped teaching and one viewport',size);
 }
 // A committed answer with a lost HTTP response resumes at the persisted next question.
 words=banks[0];tasks=SCHOOL.build(words,words,220151);answers={0:{complete:true,correct:true,firstCorrect:true,misses:0},1:{complete:true,correct:true,firstCorrect:true,misses:0}};events=[];failOnce=true;
 await page.evaluate(async words=>{localStorage.removeItem('dm_school_shared_v1:Ada:220151');await dmSchoolLesson.start({D:{no:220151,sinif:2,unite:1,kelimeler:words},b:0,d:0,pool:words,onFinish:s=>window.finished=s});},words);await page.locator('.ml-entry-start').click();await page.locator('[data-answer="'+tasks[2].options.indexOf(tasks[2].answer)+'"]').click();await page.waitForFunction(()=>document.querySelector('.ml-progress span')?.textContent==='2 / 10 soru');await page.evaluate(()=>dmThematicLearning.close(true));assert.equal(answers[2].complete,true);console.log('PASS school network reconciliation after committed answer');
 // Real complete journey through the adapter, including review and existing result callback.
 words=banks[0];tasks=SCHOOL.build(words,words,220151);answers={};events=[];await page.setViewportSize({width:390,height:844});
 await page.evaluate(async words=>{localStorage.removeItem('dm_school_shared_v1:Ada:220151');await dmSchoolLesson.start({D:{no:220151,sinif:2,unite:1,kelimeler:words},b:0,d:0,pool:words,onFinish:s=>window.finished=s});},words);await page.locator('.ml-entry-start').click();await page.locator('.ml-actions .ml-primary').click();
 for(let i=2;i<12;i++){const t=tasks[i];await page.waitForFunction(i=>document.querySelector('.ml-progress span')?.textContent===(i-1)+' / 10 soru',i);
  if(t.kind==='choice')await page.locator('[data-answer="'+t.options.indexOf(t.answer)+'"]').click();
  if(t.kind==='match')for(let j=0;j<t.pairs.length;j++){await page.locator('[data-left="'+j+'"]').click();await page.locator('[data-right="'+j+'"]').click();}
  if(t.kind==='order'){for(let j=0;j<t.tokens.length;j++)await page.locator('[data-token="'+j+'"]').click();await page.locator('[data-check]').click();}
  if(t.kind==='letters'){const used=[];for(const pos of t.missing){const j=t.tokens.findIndex((ch,j)=>ch===t.en[pos]&&!used.includes(j));used.push(j);await page.locator('[data-letter-token="'+j+'"]').click();}await page.locator('[data-letter-check]').click();}
  if(t.kind==='review'){for(let j=0;j<t.cards.length;j++){await page.waitForFunction(j=>document.querySelector('.ml-review-count')?.textContent==='Kart '+(j+1)+' / 4',j);await page.locator('[data-review-choice="'+t.cards[j].options.indexOf(t.cards[j].tr)+'"]').click();}}
  if(t.kind!=='review'){await page.waitForSelector('[data-next]');await page.locator('[data-next]').click();}
 }
 await page.waitForFunction(()=>!!window.finished);assert.equal(await page.evaluate(()=>finished.dogru),10);assert.equal(await page.locator('#dmStoryLesson').count(),0);assert.deepEqual(events.filter(e=>e.islem==='verifiedGameAnswer').map(e=>e.slot),Array.from({length:12},(_,i)=>i));assert.deepEqual(errors,[]);await browser.close();console.log('PASS complete school journey and result callback');
})().catch(e=>{console.error(e);process.exit(1)});
