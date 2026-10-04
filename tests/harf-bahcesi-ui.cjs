const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const browser=await chromium.launch({...(process.env.DIJI_CHROMIUM?{executablePath:process.env.DIJI_CHROMIUM,args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage','--disable-gpu','--single-process']}:{}),headless:true});
 const words=['cat','dog','school','window','teacher','book','pencil','apple'].map((en,i)=>({en,tr:'İpucu '+i,sinif:3,unite:1}));
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [360,390,768]){
 await page.setViewportSize({width,height:844});
 await page.route('**/*',r=>r.abort());await page.setContent('<div id="tab-aktiviteler"><div class="az-grid2x2"></div></div>');
 await page.addStyleTag({path:__dirname+'/../ingilizce/harf-bahcesi.css'});
 await page.evaluate(words=>{window.crypto.randomUUID=()=> '12345678-1234-4234-8234-123456789012';window.aktifOgrenciAdi='QA';window.siniftaOynananOgrenci='';window.apiURL='https://example.test/api';window.genelEnerjiKalan=30;window.masterKelimeHavuzu=words;window.saved=[];window.results=[];window.energyCalls=0;window.genelOyunGirisEngelliMi=()=>false;window.dmFeatureEnabled=()=>true;window.oyunHavuzGetir=(c,u)=>masterKelimeHavuzu.filter(w=>w.sinif===c&&u.includes(w.unite));window.genericSinifGuncelle=(c,id,f)=>{document.getElementById(id).innerHTML='<button class="unite-chip selected">1.Ü</button>';f([1]);};window.sinifGridKisitlamaUygula=(id,set,update)=>{set(3);update(3);};window.fetch=async(url,o)=>{const b=o?JSON.parse(o.body):{};if(b.islem==='enerjiDegistir'){energyCalls++;return {ok:true,json:async()=>({ok:true,status:'success',eklenen:-3,enerjiKalan:27,enerjiMax:30})};}if(b.islem==='harfBahcesiLiderlikKaydet'){saved.push(b);return {ok:true,json:async()=>({status:'success'})};}return {ok:true,json:async()=>[]};};window.genelSonucEkraniGoster=o=>results.push(o);window.genelSonucSiralamaCiz=()=>{};},words);
 const html=fs.readFileSync(__dirname+'/../ingilizce/index.html','utf8').replace(/<!--[\s\S]*?-->/g,'');const core=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).find(s=>s.includes('window.OC = (function ()'));
 await page.addScriptTag({content:core});await page.addScriptTag({path:__dirname+'/../ingilizce/harf-bahcesi.js'});
 await page.locator('#hbActivityCard').click();await page.locator('[data-start]').click();await page.waitForSelector('.hb-grid');
 assert.equal(await page.evaluate(()=>energyCalls),1);assert(await page.evaluate(()=>document.querySelector('.hb-card').scrollWidth<=document.querySelector('.hb-card').clientWidth+1));
 for(let round=0;round<4;round++){
  for(let j=0;j<2;j++){
   const hint=await page.locator('.hb-hints span').nth(j).textContent(),word=words.find(w=>w.tr===hint).en;
   const path=await page.evaluate(word=>{const letters=[...document.querySelectorAll('[data-cell]')].map(b=>b.textContent.toLowerCase());function dfs(a){if(a.length===word.length)return a;for(let i=0;i<24;i++){if(a.includes(i)||letters[i]!==word[a.length])continue;const p=a.at(-1);if(p!==undefined&&(Math.abs(p%6-i%6)>1||Math.abs(Math.floor(p/6)-Math.floor(i/6))>1))continue;const r=dfs([...a,i]);if(r)return r;}return null;}return dfs([]);},word);assert(path);
   for(const i of path)await page.locator(`[data-cell="${i}"]`).click();await page.locator('[data-check]').click();
  }
  if(width===390&&round===0)await page.screenshot({path:require('node:path').join(process.env.DIJI_QA_OUTPUT||'/tmp','harf-bahcesi-qa.png')});
  await page.locator('[data-next]').click();
 }
 await page.waitForSelector('[data-result]');assert.equal(await page.evaluate(()=>saved.length),1);const saved=await page.evaluate(()=>window.saved[0]);assert.equal(saved.puan,1000);assert.equal(saved.dogru,8);assert.equal(saved.yanlis,0);assert(saved.runId);await page.locator('[data-result]').click();assert.equal(await page.evaluate(()=>results.length),1);assert.equal(await page.locator('#harfBahcesiOverlay').count(),0);assert.deepEqual(errors,[]);
 // Wrong guess, backtracking, nonadjacent cells, passing and a recoverable save failure.
 await page.evaluate(()=>{window.failSave=true;const old=window.fetch;window.fetch=async(u,o)=>{const b=o?JSON.parse(o.body):{};if(b.islem==='harfBahcesiLiderlikKaydet'&&failSave){failSave=false;saved.push(b);return {ok:false,json:async()=>({status:'error',message:'QA network failure'})};}return old(u,o);};});
 await page.locator('#hbActivityCard').click();await page.locator('[data-start]').click();await page.waitForSelector('.hb-grid');
 await page.locator('[data-cell="0"]').click();await page.locator('[data-cell="23"]').click();assert.equal(await page.locator('.hb-picked').count(),1);
 await page.locator('[data-check]').click();assert.match(await page.locator('.hb-status').textContent(),/Yeniden dene/);
 for(let r=0;r<4;r++){await page.locator('[data-skip]').click();await page.locator('[data-skip]').click();await page.locator('[data-next]').click();}
 await page.waitForSelector('[data-retry-save]');assert(await page.locator('[data-result]').isDisabled());assert.equal(await page.evaluate(()=>results.length),1);
 const id=await page.evaluate(()=>saved.at(-1).runId);await page.locator('[data-retry-save]').click();await page.waitForSelector('[data-result]:not([disabled])');assert.equal(await page.evaluate(()=>saved.at(-1).runId),id);await page.locator('[data-result]').click();assert.equal(await page.evaluate(()=>results.length),2);
 // Empty bank and insufficient energy must never charge or start.
 await page.evaluate(()=>masterKelimeHavuzu=[]);await page.locator('#hbActivityCard').click();await page.locator('[data-start]').click();assert(await page.locator('.hb-status').textContent());assert.equal(await page.evaluate(()=>energyCalls),2);await page.locator('[data-close]').click();
 await page.evaluate(words=>{masterKelimeHavuzu=words;genelEnerjiKalan=2;},words);await page.locator('#hbActivityCard').click();await page.locator('[data-start]').click();assert.match(await page.locator('.hb-status').textContent(),/3 enerji/);assert.equal(await page.evaluate(()=>energyCalls),2);await page.locator('[data-close]').click();
 }
 await browser.close();console.log('PASS: 360/390/768px, eight words, real 1000-point core, energy single charge, saved result, empty bank, insufficient energy, wrong guess, passing, save failure/retry and no page errors');
})().catch(e=>{console.error(e);process.exit(1);});
