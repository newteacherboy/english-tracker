const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.DIJI_CHROMIUM,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<style>body{margin:0}#bottomNavMobile{display:flex;position:fixed;bottom:0;height:60px}.surface{position:fixed;inset:0;background:#eff}button{min-height:40px}</style><nav id="bottomNavMobile">Ana menü</nav>');
 await page.addStyleTag({content:fs.readFileSync(path.join(__dirname,'../ingilizce/play-navigation.css'),'utf8')});
 await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../ingilizce/play-navigation.js'),'utf8')});
 for(const [id,cls,button] of [
  ['hafizaOyunOverlay','game-modal-overlay','<button class="game-close-btn">✕</button>'],
  ['esOyunOverlay','game-modal-overlay','<button class="game-close-btn">✕</button>'],
  ['trenOyunOverlay','game-modal-overlay','<button class="game-close-btn">✕</button>'],
  ['bzPerde','','<button id="bzCik">✕</button>'],
  ['dmStoryLesson','ml-lesson','<header class="ml-header"><button data-back>‹</button></header>'],
  ['meteorGame','','<button class="mt-exit">Kapat</button>'],
  ['wordWheel','','<button class="ww-close">✕</button>'],
  ['papiCards','','<button class="pc-close">✕</button>'],
  ['yoModal','acik','<button class="yo-kapat">✕</button>'],
  ['harfBahcesiOverlay','game-modal-overlay','<section class="hb-card"><header><button data-close>×</button></header></section>'],
  ['onlineMatch','dm-garden-match','<button class="dm-x">×</button>'],
  ['oldWordMode','kp-shell','<button class="kp-close-x">×</button>'],
  ['oldAdventure','ba-shell','<button class="ba-close">×</button>']
 ]){
  await page.evaluate(({id,cls,button})=>{const root=document.createElement('section');root.id=id;root.className='surface '+cls;root.innerHTML=button;root.querySelector('button').onclick=()=>{window.nativeExits=(window.nativeExits||0)+1;root.remove()};document.body.append(root);}, {id,cls,button});
  await page.waitForFunction(()=>document.body.classList.contains('dm-play-session'));
  assert.equal(await page.locator('#bottomNavMobile').isVisible(),false,id);
  const back=page.locator('#'+id+' .dm-session-back');assert.equal(await back.count(),1,id);const r=await back.boundingBox();assert(r.x<=12&&r.y<=12,id);assert.equal(await back.textContent(),'‹');await back.click();
  await page.waitForFunction(()=>!document.body.classList.contains('dm-play-session'));assert(await page.locator('#bottomNavMobile').isVisible(),id);
 }
 // Closing a nested activity must not bring the menu over the remaining parent session.
 await page.evaluate(()=>{for(const id of ['outer','inner']){const r=document.createElement('section');r.id=id;r.className='surface game-modal-overlay';r.innerHTML='<button class="game-close-btn">×</button>';r.querySelector('button').onclick=()=>r.remove();document.body.append(r);}});
 await page.waitForFunction(()=>document.querySelectorAll('.dm-session-back').length===2);await page.locator('#inner .dm-session-back').click();assert.equal(await page.locator('#bottomNavMobile').isVisible(),false);await page.locator('#outer .dm-session-back').click();await page.waitForFunction(()=>!document.body.classList.contains('dm-play-session'));assert(await page.locator('#bottomNavMobile').isVisible());
 assert.equal(await page.evaluate(()=>window.nativeExits),13);
 for(const id of ['rallyGame','dmStoryLesson']){await page.evaluate(id=>{const r=document.createElement('section');r.id=id;r.className='surface'+(id==='dmStoryLesson'?' ml-lesson':'');r.textContent='Yükleniyor';document.body.append(r);const api={close:()=>r.remove()};if(id==='rallyGame')window.dmRally=api;else window.dmThematicLearning=api;},id);await page.waitForSelector('#'+id+' .dm-session-back');assert.equal(await page.locator('#bottomNavMobile').isVisible(),false);await page.locator('#'+id+' .dm-session-back').click();await page.waitForFunction(()=>!document.body.classList.contains('dm-play-session'));}
 await page.evaluate(()=>{const r=document.createElement('section');r.id='genelSonucOverlay';r.className='surface';r.innerHTML='<button id="gsoDevamBtn" disabled>DEVAM ET</button>';r.querySelector('button').onclick=()=>r.remove();document.body.append(r);});await page.waitForSelector('#genelSonucOverlay .dm-session-back');assert(await page.locator('#genelSonucOverlay .dm-session-back').isDisabled());await page.evaluate(()=>document.getElementById('gsoDevamBtn').disabled=false);await page.waitForFunction(()=>!document.querySelector('#genelSonucOverlay .dm-session-back').disabled);await page.locator('#genelSonucOverlay .dm-session-back').click();await page.waitForFunction(()=>!document.body.classList.contains('dm-play-session'));assert(await page.locator('#bottomNavMobile').isVisible());assert.deepEqual(errors,[]);await browser.close();console.log('PASS: 13 native game/route exits, rally/loading fallbacks, result lock, top-left placement, menu restoration and nested sessions.');
})().catch(e=>{console.error(e);process.exit(1)});
