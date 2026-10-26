'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const DATA=require('../ingilizce/thematic-curriculum.json'),V8=require('../ingilizce/thematic-v8-candidate.js');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}),page=await browser.newPage(),out=process.env.DIJI_LEARNING_QA_OUT||'/tmp/thematic-mint-qa';fs.mkdirSync(out,{recursive:true});
 let cursor=0,version=0,combo=0,selected=DATA.chapters[0],calls=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname==='/functions/v1/thematic-learning'){
  const b=JSON.parse(route.request().postData()||'{}');calls.push(b);if(b.action==='comboReset')combo=0;if(b.action==='advance'){assert.equal(b.cursor,cursor);assert.equal(b.version,version);cursor++;version++;if(cursor>4)combo++;}
  return route.fulfill({json:{ok:true,chapter:selected.id,deckVersion:8,cursor,version,accepted:true,finished:false,comboGain:combo===5?1:0,wallet:{energy:25,energyMax:25,gold:0,combo},progress:[],inherited:0}});
 }
 if(u.hostname!=='learning.test')return route.abort();if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:system-ui}</style><link rel="stylesheet" href="thematic-learning.css"><link rel="stylesheet" href="learning-question-v1.css"></head><body><button id="outside">Parkur</button><script>var aktifOgrenciAdi="Ada",apiURL="https://learning.test/functions/v1/diji-api";localStorage.setItem("ing_token","qa");</script><script src="learning-core.js"></script><script src="thematic-v8-candidate.js"></script><script src="thematic-learning.js"></script></body></html>'});const f=path.resolve('ingilizce','.'+u.pathname);if(!f.startsWith(path.resolve('ingilizce')+path.sep)||!fs.existsSync(f))return route.fulfill({status:404,body:''});return route.fulfill({path:f});});
 await page.goto('https://learning.test/');
 const long=DATA.chapters.filter(c=>c.cefr==='B2').sort((a,b)=>Math.max(...b.cards.map(c=>c.en.length+c.tr.length))-Math.max(...a.cards.map(c=>c.en.length+c.tr.length)))[0];
 for(const size of [{width:320,height:568},{width:360,height:640},{width:390,height:844},{width:768,height:1024},{width:1440,height:900},{width:844,height:390}]){
  await page.setViewportSize(size);
  for(const chapter of [DATA.chapters[0],long])for(const step of [0,4,5,7,9,10,12,13]){
   selected=chapter;cursor=step;version=0;combo=step===4?5:0;
   await page.evaluate(async id=>{await dmThematicLearning.open(id,{intro:true});},selected.id);await page.locator('.ml-entry-start').click();await page.waitForTimeout(80);
   if(step===10){for(const button of await page.locator('[data-token]').all())await button.click();await page.waitForTimeout(80);}
   const m=await page.locator('#dmStoryLesson').evaluate(root=>{const stage=root.querySelector('.ml-stage'),r=stage.getBoundingClientRect(),hud=root.querySelector('[data-ml-combo]'),hr=hud.getBoundingClientRect();return {kind:root.dataset.taskKind,fit:root.dataset.fit,fallback:root.classList.contains('ml-scroll-fallback'),scroll:root.scrollHeight-root.clientHeight,stage:{bottom:r.bottom,height:r.height,scroll:stage.scrollHeight-stage.clientHeight},hud:{text:hud.textContent,width:hr.width,y:hr.y},buttons:[...root.querySelectorAll('.ml-task button,.ml-actions button')].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent.slice(0,40),x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,overflow:b.scrollHeight-b.clientHeight,hit:b.disabled||b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};})};});
   assert(!m.fallback&&m.scroll<=3,JSON.stringify({size,chapter:chapter.id,step,m}));assert(m.stage.bottom<=size.height+2,JSON.stringify({size,step,m}));assert(m.hud.width>10&&m.hud.y>=0);assert(m.hud.text.includes('/ 5'));
   for(const b of m.buttons){assert(b.x>=-1&&b.right<=size.width+1&&b.y>=0&&b.bottom<=size.height+2,JSON.stringify({size,chapter:chapter.id,step,b}));assert(b.hit,JSON.stringify({size,chapter:chapter.id,step,b}));assert(b.overflow<=3,JSON.stringify({size,chapter:chapter.id,step,b}));}
   if(step===0){await page.screenshot({path:path.join(out,'teach-'+size.width+'-'+chapter.id+'.png')});assert.equal(await page.locator('[data-learn]').count(),4);const before=calls.length;await page.locator('.ml-actions .ml-primary').click({timeout:4000});await page.waitForFunction(()=>document.querySelector('#dmStoryLesson').dataset.taskKind!=='teach');assert.deepEqual(calls.slice(before).filter(b=>b.action==='advance').map(b=>b.cursor),[0,1,2,3]);}
   if(size.width===390&&chapter===DATA.chapters[0])await page.screenshot({path:path.join(out,'type-'+step+'.png')});
  }
  console.log('PASS grouped teaching and all mechanics, A1 + long B2, visible combo and one viewport',size);
 }
 assert.deepEqual(errors,[]);const watchdog=setTimeout(()=>process.exit(0),3000);await browser.close();clearTimeout(watchdog);
})().catch(e=>{console.error(e);process.exit(1)});
