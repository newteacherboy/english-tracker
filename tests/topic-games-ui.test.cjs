const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const C=require('../ingilizce/konu-oyunlari-a1.js'),topics=require('./topic-games-topics.json');
const {chromium}=require(process.env.TOPIC_PLAYWRIGHT_PATH||'playwright');
const html=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="activity-ui.css"><link rel="stylesheet" href="konu-oyunlari.css"><style>body{margin:0;font-family:Arial,sans-serif}.dc-focus-card{padding:10px}button{font-family:inherit}</style><script>var aktifOgrenciAdi='QA';var apiURL='/api';var dcTumKonularCache=null;window.dmMeduPro={api:async()=>({liste:[]})};window.speechSynthesis={cancel(){},speak(){}};localStorage.setItem('ing_token','fixture');</script><script defer src="konu-oyunlari.js"></script><script defer src="activity-ui.js"></script><div id="tab-aktiviteler" class="active"><div class="dc-focus-card"><div class="az-grid2x2"><button class="az-gcard" onclick="kelimeYarismasiAc()">Kelime</button></div></div></div>`;
test('360px real browser: tab keyboard, locked levels, all six games, guest result, quota, exits and account change',{timeout:90000},async()=>{
 const {buildQuestions}=await import('../ingilizce/topic-games-core.mjs');let latest,student=true,calls=[],browser,server;
 const runs=new Map();
 server=http.createServer(async(req,res)=>{try{if(req.url.split('?')[0]==='/api'){let body='';for await(const c of req)body+=c;const b=JSON.parse(body);calls.push(b);let d;
  if(b.islem==='dersKonulariGetir')d=topics.map(r=>({seviye:r.level,kategori:r.category,konuAdi:r.topic_name,siraNo:r.sort_no}));
  if(b.islem==='konuOyunBaslat'){latest=buildQuestions(C.find(t=>t.key===b.topicKey),b.game);const id=student?crypto.randomUUID():null;if(id)runs.set(id,latest);d={ok:true,runId:id,sorular:latest,bugunXpHakki:student?3:0,practice:!student};}
  if(b.islem==='konuOyunBitir'){const q=runs.get(b.runId);assert(q);const right=b.picks.filter((p,i)=>p===q[i].correct).length;d={ok:true,dogru:right,toplam:q.length,yuzde:Math.round(right/q.length*100),xp:right/q.length>=.8?70:0,xpHakkiKaldi:2,sebep:'awarded',yo:{totalXp:70}};runs.delete(b.runId);}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(d));return;}
  const file=req.url==='/'?null:path.join(process.cwd(),'ingilizce',decodeURIComponent(req.url.split('?')[0]));res.setHeader('Content-Type',file?.endsWith('.css')?'text/css':file?'text/javascript':'text/html');res.end(file?fs.readFileSync(file):html);
 }catch(e){res.statusCode=500;res.end(String(e));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{browser=await chromium.launch({headless:true,executablePath:process.env.TOPIC_CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:360,height:740},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const real=window.setTimeout;window.setTimeout=(fn,ms,...args)=>real(fn,ms>=700&&ms<=3000?8:ms,...args);window.dmApplyRewardState=(v,owner)=>window.applied={v,owner};});
 await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.locator('#ggKonuTab').click();await page.locator('.kg-list button').first().waitFor();
 assert.equal(await page.locator('.kg-list button').count(),43);assert.equal(await page.locator('#ggKonuTab').getAttribute('aria-selected'),'true');
 await page.locator('#ggKonuTab').press('ArrowRight');assert.equal(await page.locator('#ggBreakTab').getAttribute('aria-selected'),'true');await page.locator('#ggKonuTab').click();
 await page.locator('[data-level=A2]').click();assert.match(await page.locator('.kg-note').textContent(),/yakında geliyor/);
 assert.equal(await page.locator('[data-topic*="|pron|"]').count(),0);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=360));
 for(const g of ['kova','cark','balon','dy','sohbet','durum']){
  const t=C.find(t=>t.games.includes(g)&&((g==='kova'||g==='cark')?t.sortNo===4:true));
  await page.locator('[data-topic]').evaluateAll((nodes,key)=>nodes.find(b=>b.dataset.topic===key).click(),t.key);await page.locator('[data-game='+g+']').click();await page.locator('[data-pick]').first().waitFor({state:'attached'});
  const deck=latest;if(['balon','dy'].includes(g)){const cue=page.locator('.kg-meaning');assert(await cue.isVisible());assert.equal(await cue.locator('strong').textContent(),deck[0].tr);assert(await cue.evaluate(el=>!!(el.compareDocumentPosition(el.parentElement.querySelector('h2'))&Node.DOCUMENT_POSITION_FOLLOWING)));assert.equal(await cue.locator('strong').evaluate(el=>getComputedStyle(el).fontWeight),'800');}assert.equal(await page.locator('#kgOverlay').getAttribute('aria-modal'),'true');
  const layout=await page.locator('#kgOverlay').evaluate(el=>({wide:el.scrollWidth>el.clientWidth,tall:el.scrollHeight>el.clientHeight}));assert(!layout.wide&&!layout.tall,JSON.stringify({g,layout}));if(process.env.TOPIC_SCREENSHOT_DIR){fs.mkdirSync(process.env.TOPIC_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.TOPIC_SCREENSHOT_DIR,g+'.png')});}
  for(let i=0;i<deck.length;i++){
   await page.waitForFunction(n=>document.querySelector('.kg-hud b')?.textContent.startsWith('Soru '+n+' /'),i+1);
   if(g==='cark')await page.locator('[data-spin]').click();
   const pick=deck[i].options.findIndex(o=>o.id===deck[i].correct);await page.locator('[data-pick="'+pick+'"]').click();
  }
  await page.locator('.kg-result').waitFor();assert.match(await page.locator('.kg-prize').textContent(),/70 XP kazandın/);assert.equal(await page.locator('.kg-result h2').textContent(),'%100');
  assert.deepEqual(await page.evaluate(()=>window.applied),{v:{totalXp:70},owner:'QA'});
  await page.locator('[data-back]').click();assert.match(await page.locator('[data-game='+g+']').textContent(),/Bugün 2 XP hakkın kaldı/);await page.locator('[data-close]').click();await page.locator('#kgOverlay').waitFor({state:'detached'});
 }
 assert.equal(calls.filter(x=>x.islem==='konuOyunBaslat').length,6);assert.equal(calls.filter(x=>x.islem==='konuOyunBitir').length,6);
 student=false;await page.evaluate(()=>window.dmGuestMode=true);const t=C.find(t=>t.type==='vocab');await page.locator('[data-topic]').evaluateAll((nodes,key)=>nodes.find(b=>b.dataset.topic===key).click(),t.key);await page.locator('[data-game=kova]').click();await page.locator('[data-pick]').first().waitFor();const guestDeck=latest;
 for(let i=0;i<guestDeck.length;i++){await page.waitForFunction(n=>document.querySelector('.kg-hud b')?.textContent.startsWith('Soru '+n+' /'),i+1);await page.locator('[data-pick="'+guestDeck[i].options.findIndex(o=>o.id===guestDeck[i].correct)+'"]').click();}
 await page.locator('.kg-result').waitFor();assert.match(await page.locator('.kg-prize').textContent(),/XP kazanmak için giriş yap/);assert.equal(calls.filter(x=>x.islem==='konuOyunBitir').length,6);
 await page.locator('[data-again]').click();await page.locator('[data-pick]').first().waitFor();await page.evaluate(()=>aktifOgrenciAdi='Other');await page.locator('#kgOverlay').waitFor({state:'detached'});assert.equal(calls.filter(x=>x.islem==='konuOyunBitir').length,6);
 student=true;await page.evaluate(()=>{aktifOgrenciAdi='QA';window.dmGuestMode=false;});
 for(const number of [7,18]){const t=C.find(t=>t.type==='grammar'&&t.sortNo===number);await page.locator('[data-topic]').evaluateAll((nodes,key)=>nodes.find(b=>b.dataset.topic===key).click(),t.key);await page.locator('[data-game=balon]').click();await page.locator('[data-pick]').first().waitFor();const deck=latest;
  for(let i=0;i<deck.length;i++){await page.waitForFunction(n=>document.querySelector('.kg-hud b')?.textContent.startsWith('Soru '+n+' /'),i+1);const q=deck[i];assert.equal(await page.locator('.kg-meaning strong').textContent(),q.tr);assert.equal(await page.locator('[data-pick]').count(),number===7?2:3);const selected=q.options.findIndex(o=>o.id===q.correct);
   const text=await page.locator('[data-pick="'+selected+'"]').evaluate(el=>{el.click();return document.querySelector('.kg-sentence').textContent;});if(number===18){assert(text.includes(q.before+"'s"));assert(!/\s+'s/.test(text));}
  }await page.locator('.kg-result').waitFor();await page.locator('[data-topics]').click();await page.locator('#kgOverlay').waitFor({state:'detached'});
 }
 assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
