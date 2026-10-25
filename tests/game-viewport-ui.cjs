'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const options={headless:true,args:['--no-sandbox','--disable-dev-shm-usage']};
 if(process.env.DIJI_CHROMIUM){options.executablePath=process.env.DIJI_CHROMIUM;if(process.env.DIJI_CHROMIUM_PACKAGE){const {default:binary}=await import(process.env.DIJI_CHROMIUM_PACKAGE);options.args=binary.args;}}
 const browser=await chromium.launch(options),out=process.env.DIJI_GAME_QA_OUT||'/tmp/diji-game-viewport';fs.mkdirSync(out,{recursive:true});
 const source=fs.readFileSync('ingilizce/index.html','utf8');
 const extract=(begin,end)=>source.slice(source.indexOf(begin),source.indexOf(end,source.indexOf(begin)));
 const body=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 const page=await browser.newPage();
 for(const size of [{width:360,height:640},{width:390,height:740},{width:768,height:1024},{width:1440,height:900}]){
 await page.setViewportSize(size);await page.unrouteAll();
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='fixture.test')return route.abort();if(u.pathname==='/ingilizce/qa')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body></body></html>'});const f=path.resolve('ingilizce',u.pathname.replace(/^\/ingilizce\//,''));if(!f.startsWith(path.resolve('ingilizce')+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return route.fulfill({status:404,body:''});return route.fulfill({path:f,...(f.endsWith('.css')?{contentType:'text/css; charset=utf-8'}:f.endsWith('.js')?{contentType:'text/javascript; charset=utf-8'}:{})});});
 await page.goto('https://fixture.test/ingilizce/qa');await page.setContent(body,{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{document.querySelectorAll('.game-modal-overlay').forEach(e=>{document.body.append(e);e.style.setProperty('display','none','important');});document.querySelectorAll('#dmDiscovery,#login-container,.kur-perde,.dm-first-character').forEach(e=>e.remove());document.querySelectorAll('[role=dialog]').forEach(e=>{if(!e.closest('.game-modal-overlay'))e.remove();});document.body.style.margin='0';const dock=document.createElement('nav');dock.id='tpTeacherDock';dock.style.cssText='display:grid;position:fixed;bottom:0;height:80px;z-index:2147483640';dock.textContent='Teacher dock';document.body.append(dock);document.documentElement.classList.add('dm-teacher-portal');});
 await page.addScriptTag({content:"window.OC={aktif:{bitti:false},sure:()=>0,puan:()=>0,dogru:()=>{},yanlis:()=>{}};window.boslukAktifKelimeler=[{en:'attend',tr:'katılmak'}];window.boslukOyunuBitir=()=>{};window.trenCevap=[];window.trenVagonlar=[];window.trenKilit=false;function trEl(id){return document.getElementById(id)}function trKonus(){};window.aktifOgrenciAdi='teacher';window.dmTeacherPortalMode=true;window.dmTeacherPortal={returnToGames(){}};window.closeCalls=[];"});
 for(const [id,name]of [['boslukOyunOverlay','boslukOyunKapat'],['yagmurOyunOverlay','yagmurOyunKapat'],['trenOyunOverlay','trenOyunKapat'],['hafizaOyunOverlay','hafizaOyunKapat'],['jpOyunOverlay','jpOyunKapat'],['kelimebulOyunOverlay','kelimebulOyunKapat'],['esOyunOverlay','esOyunKapat'],['kelimeYarismaOverlay','kelimeYarismasiKapat'],['asmacaOyunOverlay','asmacaOyunKapat']])await page.addScriptTag({content:`window.${name}=()=>{closeCalls.push('${id}');document.getElementById('${id}').style.setProperty('display','none','important')};`});
 await page.addScriptTag({content:extract('let boslukRound=null;','async function boslukOyunuBitir(')});
 await page.addScriptTag({content:extract('function trCiz() {','function trenIpucu() {')});
 for(const f of ['game-experience.js','faithful-eight-games.js','approved-game-boards.js','eight-game-fullscreen.js','game-viewport.js'])await page.addScriptTag({path:'ingilizce/'+f});
 const metrics=[];
 for(const [root,stage]of [['boslukOyunOverlay','boslukOyunEkrani'],['yagmurOyunOverlay','yagmurOyunEkrani'],['trenOyunOverlay','trenOyunEkrani']]){
  await page.evaluate(({root,stage})=>{const r=document.getElementById(root);r.style.setProperty('display','flex','important');r.querySelectorAll('[id$="Ekrani"]').forEach(e=>e.style.display=e.id===stage?'block':'none');
   if(root==='boslukOyunOverlay')boslukBulmacayiCiz();
   if(root==='yagmurOyunOverlay'){r.classList.add('dm-designed-playing');document.getElementById('yagmurAlan').innerHTML='<div class="yg-dusen-kelime" style="top:20%">accept</div>';document.getElementById('yagmurSecenekler').innerHTML=['Soruyu cevapla.','Irak','kabul etmek'].map(x=>'<button class="yg-secenek-btn">'+x+'</button>').join('');}
   if(root==='trenOyunOverlay'){r.classList.add('dm-designed-playing');document.getElementById('trenTabela').textContent='Neden sinemaya gitmiyoruz?';window.trenVagonlar=['Why',"don’t",'we','go','to','the','cinema','school','is','are'].map((k,i)=>({k,i,kullanildi:false}));trCiz();}
   const j=document.getElementById('jkBar');j?.remove();const bar=document.createElement('div');bar.id='jkBar';bar.innerHTML='<div class="jk-bar">'+['Zamanı dondur','Yarı yarıya','Ekstra can'].map(t=>'<button class="jk-btn"><span class="jk-daire">⭐</span>'+t+'</button>').join('')+'</div>';document.getElementById(stage).append(bar);window.dmEightGameFullscreen.sync();window.dmGameViewport.sync();
  },{root,stage});
  await page.waitForTimeout(120);
  const m=await page.evaluate(({root,stage})=>{const r=document.getElementById(root),s=document.getElementById(stage),bounds=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom}};return {root,bounds:bounds(r),stage:bounds(s),overflow:s.scrollHeight-s.clientHeight,dock:getComputedStyle(document.getElementById('tpTeacherDock')).display,buttons:[...r.querySelectorAll(root==='boslukOyunOverlay'?'.dm-letter-options button':root==='yagmurOyunOverlay'?'.yg-secenek-btn':'.tr-v:not(.bos)')].map(b=>({text:b.textContent,bounds:bounds(b),visible:getComputedStyle(b).visibility})),fall:root==='yagmurOyunOverlay'?bounds(document.getElementById('yagmurAlan')):null,question:root==='boslukOyunOverlay'?bounds(r.querySelector('.dm-letter-word>strong')):null,letters:root==='boslukOyunOverlay'?bounds(r.querySelector('.dm-letter-options')):null};},{root,stage});
  assert.equal(m.dock,'none',JSON.stringify(m));assert(Math.abs(m.bounds.height-size.height)<2);assert(m.overflow<=3,JSON.stringify(m));assert(m.buttons.length>0);for(const b of m.buttons){assert(b.text.trim());assert(b.bounds.height>=20);assert(b.bounds.bottom<=size.height+1,JSON.stringify(b));assert.equal(b.visible,'visible');}
  if(m.fall)assert(m.fall.height>m.stage.height*.35,JSON.stringify(m));if(m.question)assert(m.letters.y>m.question.bottom+30,JSON.stringify(m));
  if(root==='trenOyunOverlay'){await page.locator('#trenHavuz .tr-v').first().click();assert.equal(await page.locator('#trenHat .tr-v').count(),1);await page.locator('#trenHat .tr-v').click();assert.equal(await page.locator('#trenHat .tr-v').count(),0);}
  await page.screenshot({path:path.join(out,root+'-'+size.width+'.png')});metrics.push(m);
  await page.locator('#'+root+' > .dm-vp-exit').click();await page.waitForFunction(id=>getComputedStyle(document.getElementById(id)).display==='none',root);assert(await page.locator('#tpTeacherDock').isVisible());
 }
 if(size.width===360){
  for(const [root,stage,entry]of [['kelimeYarismaOverlay','kyOyunEkrani','kyGirisEkrani'],['jpOyunOverlay','jpBalonEkrani','jpGirisEkrani'],['boslukOyunOverlay','boslukOyunEkrani','boslukGirisEkrani'],['hafizaOyunOverlay','hafizaOyunEkrani','hafizaGirisEkrani'],['yagmurOyunOverlay','yagmurOyunEkrani','yagmurGirisEkrani'],['asmacaOyunOverlay','asmacaOyunEkrani','asmacaGirisEkrani'],['kelimebulOyunOverlay','kelimebulOyunEkrani','kelimebulGirisEkrani'],['esOyunOverlay','esOyunEkrani','esGirisEkrani'],['trenOyunOverlay','trenOyunEkrani','trenGirisEkrani']]){
   await page.evaluate(({root,stage})=>{const r=document.getElementById(root);r.querySelectorAll('[id$="Ekrani"]').forEach(e=>e.style.display=e.id===stage?'block':'none');r.style.setProperty('display','flex','important');dmGameViewport.sync();},{root,stage});
   await page.locator('#'+root+' > .dm-vp-back').click();await page.waitForFunction(({root,entry})=>getComputedStyle(document.getElementById(root)).display!=='none'&&getComputedStyle(document.getElementById(entry)).display!=='none',{root,entry});
   await page.locator('#'+root+' > .dm-vp-exit').click();await page.waitForFunction(id=>getComputedStyle(document.getElementById(id)).display==='none',root);
  }
  for(const [id,object,closeClass]of [['rallyGame','dmRally','rr-close'],['wordWheel','dmWordWheel','ww-close'],['papiCards','dmPapiCards','pc-close'],['meteorGame','dmMeteor','mt-exit'],['mvOverlay','dmMola','mv-close'],['kgOverlay','dmTopicGames','kg-close']]){
   await page.evaluate(({id,object,closeClass})=>{const r=document.createElement('section');r.id=id;r.style.cssText='display:flex;position:fixed;inset:0;background:white';r.innerHTML='<button class="'+closeClass+'">Native close</button>';window[object]={close:()=>r.remove()};document.body.append(r);dmGameViewport.sync();},{id,object,closeClass});
   await page.locator('#'+id+' > .dm-vp-exit').click();assert.equal(await page.locator('#'+id).count(),0);
  }
  console.log('PASS native back/setup and exit paths for 9 classic games and 6 dynamic game surfaces');
 }
 console.log('PASS',size,metrics.map(m=>({root:m.root,stage:Math.round(m.stage.height),fall:m.fall&&Math.round(m.fall.height),overflow:m.overflow}))); 
 }
 const cleanup=setTimeout(()=>process.exit(0),3000);await browser.close();clearTimeout(cleanup);
})().catch(e=>{console.error(e);process.exit(1)});
