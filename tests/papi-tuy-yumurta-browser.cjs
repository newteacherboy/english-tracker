// [17 Kas 2026] Papi'nin Kanadı + parkurda Sürpriz Yumurta: gerçek tarayıcıda akış ve yerleşim kontrolü.
require('./_index-source.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const out='/tmp/papi-tuy-qa';
(async()=>{const root=path.resolve('ingilizce'),html=fs.readFileSync('ingilizce/index.html','utf8');
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});fs.mkdirSync(out,{recursive:true});
 try{for(const [width,height] of [[320,568],[390,844],[430,932],[844,390]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://tuy.test/**',r=>{const u=new URL(r.request().url());if(u.pathname==='/')return r.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><meta charset="utf-8"><body></body>'});const f=path.resolve(root,'.'+u.pathname);return f.startsWith(root+path.sep)&&fs.existsSync(f)&&fs.statSync(f).isFile()?r.fulfill({path:f,...(f.endsWith('.js')?{contentType:'application/javascript; charset=utf-8'}:{})}):r.fulfill({body:''});});
  await page.goto('https://tuy.test/');
  const links=['bilgi-islands.css','papi-wallet.css','daily-gift.css','papi-tuy.css','papi-yumurta.css'].map(h=>'<link rel="stylesheet" href="'+h+'">').join('');
  await page.setContent('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+links+'<style>body{margin:0;background:#E4F1FD;font-family:Nunito,system-ui}#tab-dunya{position:relative;height:100vh;overflow:auto}.rt-medal-world{position:relative;height:1200px}.rt-medal-header{padding:12px}.rt-medal-unit{background:#2F80ED;color:#fff;border-radius:22px;padding:16px;font:900 22px Nunito}</style><div id="panel-alani"><section id="tab-dunya" class="active dc-fullscreen-overlay"><section class="bi-scene rt-medal-route"><header class="rt-medal-header"><div class="rt-medal-unit">Okul Yolum</div></header><div class="rt-medal-scroll"><div class="rt-medal-world"><button type="button" class="rt-medal-egg" data-rt="egg" style="top:300px" aria-label="Sürpriz yumurta"><span class="rt-egg-art"></span><span class="rt-egg-label">Yumurtam</span></button></div></div></section></section></div>');
  await page.evaluate(()=>{
   window.aktifOgrenciAdi='Ada';window.apiURL='https://x.test/functions/v1/diji-api';localStorage.setItem('ing_token','tok');
   window.yo={altin:500,totalXp:1000,dondurucu:0};window.genelEnerjiKalan=12;window.dmActiveTime={summary:()=>({stars:3,seconds:60})};window.dmProgression={level:()=>5};
   window.headerEnerjiGoster=(n)=>{window.genelEnerjiKalan=n;};window.dmApplyRewardState=(v)=>{Object.assign(window.yo,v);};
   const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   window.srv={calls:[],tuy:{ok:true,day,feathers:3,level:2,need:7,reward:10,todayDone:true,justEarned:true,wingDone:false,shieldUsed:0,lost:0,atRisk:0,days:[day],eklenen:0,bekleyenEnerji:0,enerjiKalan:12,enerjiMax:25},
    egg:{ok:true,progress:2,need:3,ready:false,kind:'gumus',number:3,hatched:2,reward:{gold:40,energy:3},enerjiKalan:12,enerjiMax:25}};
   window.fetch=async(url,o)=>{const b=JSON.parse(o.body);srv.calls.push(b.action);
    if(b.action==='tuy')return{ok:true,json:async()=>srv.tuy};
    if(b.action==='yumurta')return{ok:true,json:async()=>srv.egg};
    if(b.action==='yumurta_cat'){const d={...srv.egg,progress:0,ready:false,kind:'benekli',number:4,hatched:3,opened:{kind:'gumus',gold:40,energy:3,eklenen:3},altin:540,yo:{altin:540},enerjiKalan:15,enerjiMax:25};srv.egg={...d,opened:null,yo:null};return{ok:true,json:async()=>d};}
    return{ok:false,json:async()=>({ok:false})};};
  });
  // oyna-v2.js'teki harita tıklama yönlendirmesinin aynısı
  await page.evaluate(()=>document.querySelector('#tab-dunya').addEventListener('click',e=>{const b=e.target.closest('[data-rt]');if(b?.dataset.rt==='egg')window.DijiPapiEgg?.tap?.(b);}));
  for(const s of ['papi-mascot.js','papi-wallet.js','papi-tuy.js','papi-yumurta.js'])await page.addScriptTag({url:'/'+s});
  // 1) Bugünün tüyü geldi: kanat paneli kendiliğinden açılır, 3 dolu tüy ve canlı Papi.
  await page.evaluate(()=>DijiDailyGift.check());
  await page.waitForSelector('.dm-tuy-sheet .dm-tuy-fan');
  assert.match(await page.locator('#dmTuyTitle').textContent(),/Papi’nin Kanadı/);
  assert.equal(await page.locator('.dm-tuy-fan g[transform^="rotate"] path[fill="#fff"]').count(),4,'4 boş tüy yuvası');
  assert.equal(await page.locator('.dm-tuy-new').count(),1,'yeni tüy animasyonlu');
  assert.equal(await page.locator('.dm-tuy-papi svg.dmp').count(),1,'canlı 3D Papi');
  assert.match(await page.locator('.dm-tuy-next').textContent(),/4 tüy daha/);
  const sheet=await page.locator('.dm-tuy-sheet').boundingBox();assert(sheet.x>=0&&sheet.x+sheet.width<=width+1&&sheet.y>=0,JSON.stringify(sheet));
  await page.waitForTimeout(1900);await page.screenshot({path:`${out}/kanat-${width}.png`});
  await page.locator('.dm-tuy-sheet [data-tuy-close].dm-tuy-primary').click();
  const btn=page.locator('[data-dm-daily-streak]');assert.equal(await btn.locator('[data-daily-count]').textContent(),'3/7');
  // 2) 7. tüy: kanat doldu kutlaması, Topla enerjiyi üst çubuğa yazar.
  await page.evaluate(()=>{srv.tuy={...srv.tuy,feathers:7,level:3,wingDone:true,justEarned:true,eklenen:10,enerjiKalan:22};});
  await page.evaluate(()=>DijiDailyGift.check({force:true}));
  await page.waitForSelector('.dm-tuy-wing');assert.match(await page.locator('.dm-tuy-prize').textContent(),/\+10 enerji/);
  assert.equal(await page.locator('.dm-tuy-wing .dm-tuy-fan path[fill="#fff"]').count(),0,'7 tüy dolu');
  await page.waitForTimeout(1300);await page.screenshot({path:`${out}/kanat-doldu-${width}.png`});
  await page.locator('[data-tuy-collect]').click();assert.equal(await page.evaluate(()=>genelEnerjiKalan),22);assert.equal(await page.locator('.dm-tuy-layer').count(),0);assert.equal(await btn.locator('[data-daily-count]').textContent(),'0/7','yeni kanat 0 tüyle başlar');
  // 3) Yumurta 2/3: dokununca bilgi balonu, çatlamaz.
  await page.evaluate(()=>DijiPapiEgg.check({force:true}));
  await page.waitForFunction(()=>document.querySelector('.rt-egg-label')?.textContent==='2/3 durak');
  await page.locator('.rt-medal-egg').click();await page.waitForSelector('.rt-egg-bubble');assert.match(await page.locator('.rt-egg-bubble').textContent(),/1 durak daha/);
  assert.equal(await page.evaluate(()=>srv.calls.filter(c=>c==='yumurta_cat').length),0);
  await page.screenshot({path:`${out}/yumurta-${width}.png`});
  // 4) 3. durak: yumurta görünürken kendiliğinden parkurda çatlar, ödül bir kez alınır.
  await page.evaluate(()=>{srv.egg={...srv.egg,progress:3,ready:true};});
  await page.evaluate(()=>DijiPapiEgg.check({force:true}));
  await page.waitForSelector('.egg-stage .egg-stage-papi svg.dmp',{timeout:4000});await page.waitForTimeout(700);await page.screenshot({path:`${out}/catlama-gaga-${width}.png`});
  await page.waitForSelector('.egg-stage-prizes span',{timeout:5000});await page.waitForTimeout(700);await page.screenshot({path:`${out}/catlama-${width}.png`});
  assert.match(await page.locator('.egg-stage-prizes').textContent(),/\+40.*\+3/);
  await page.click('.egg-stage-ok');await page.waitForFunction(()=>!document.querySelector('.egg-stage'),null,{timeout:8000});
  assert.equal(await page.evaluate(()=>srv.calls.filter(c=>c==='yumurta_cat').length),1);
  assert.equal(await page.evaluate(()=>yo.altin),540);assert.equal(await page.evaluate(()=>genelEnerjiKalan),15);
  assert.equal(await page.locator('.rt-egg-label').textContent(),'0/3 durak');
  assert.deepEqual(errors,[]);await page.close();
 }console.log('PASS papi kanadı + yumurta: panel, kanat kutlaması, yumurta balonu, parkurda çatlama, tek ödül');}
 finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
