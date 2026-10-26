'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()),p=u.pathname;
  if(u.hostname==='cdn.jsdelivr.net'&&p.includes('supabase'))return route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>({select:async()=>({data:[],error:null})})})};'});
  if(u.hostname==='diji.test'){
   const name=p.replace(/^\/ingilizce\//,'')||'index.html';
   const filename=path.join(__dirname,'../ingilizce',name);
   if(fs.existsSync(filename)&&fs.statSync(filename).isFile())return route.fulfill({path:filename});
  }
  return route.fulfill({contentType:'application/json',body:'[]'});
 });
 await page.addInitScript(()=>new MutationObserver(()=>document.querySelector('.kur-perde .kur-x')?.click()).observe(document,{childList:true,subtree:true}));
 await page.goto('https://diji.test/ingilizce/',{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>!!window.dmFaithfulEightGames,{timeout:15000});
 assert.equal(await page.evaluate(()=>window.dmFaithfulEightGames.scenes.length),4);
 const games=[
  ['jpOyunOverlay','jpBalonEkrani','carnival'],
  ['yagmurOyunOverlay','yagmurOyunEkrani','storm'],
  ['kelimebulOyunOverlay','kelimebulOyunEkrani','lock'],
  ['esOyunOverlay','esOyunEkrani','garden'],
  ['trenOyunOverlay','trenOyunEkrani','station']
 ];
 fs.mkdirSync('/tmp/faithful-game-screens',{recursive:true});
 for(const size of [{width:360,height:640},{width:390,height:844},{width:768,height:1024}]){
  await page.setViewportSize(size);
  for(const [rootId,playId,scene] of games){
   await page.evaluate(([r,p])=>{
    document.querySelectorAll('.game-modal-overlay').forEach(x=>x.style.display='none');
    const root=document.getElementById(r);document.body.appendChild(root);
    root.style.setProperty('display','flex','important');root.style.setProperty('z-index','2147483000','important');
    for(const ch of root.querySelectorAll('[id$="GirisEkrani"],[id$="BitisEkrani"],[id$="OyunEkrani"]'))ch.style.display='none';
    document.getElementById(p).style.display='block';
    root.classList.add('dm-designed-playing');
    if(r==='trenOyunOverlay')document.getElementById('trenTabela').textContent='Arkadaşlarımızla birlikte tren istasyonunda güzel fotoğraflar çekiyoruz.';
    window.dmGameViewport?.sync();
   },[rootId,playId]);
   const metrics=await page.locator('#'+rootId+' .game-modal-content').evaluate(el=>{
    const root=el.closest('.game-modal-overlay');
    const board=root.querySelector('[id$="OyunEkrani"]:not([style*="none"]),#jpBalonEkrani');
    const sign=root.querySelector('#trenTabela');
    return {background:getComputedStyle(el).backgroundImage,width:el.getBoundingClientRect().width,
      scroll:el.scrollWidth,client:el.clientWidth,
      rootClass:root.className,rootDisplay:getComputedStyle(root).display,playDisplay:getComputedStyle(document.getElementById(root.id.replace('Overlay','')+'Ekrani')||board||root).display,cssLoaded:[...document.styleSheets].some(st=>st.href?.includes('faithful-eight-games.css')),matches:el.matches('#jpOyunOverlay.dm-designed-playing .game-modal-content'),styleRules:[...document.styleSheets].filter(st=>st.href?.includes('faithful-eight-games.css')).flatMap(st=>[...st.cssRules]).filter(q=>q.selectorText?.includes('#jpOyunOverlay.dm-designed-playing')).slice(0,4).map(q=>({sel:q.selectorText,background:q.style?.background})),parentClass:el.parentElement?.className,heading:!!board?.querySelector('.fg-hero'),
      sign:sign?{height:sign.getBoundingClientRect().height,wrap:getComputedStyle(sign).whiteSpace,color:getComputedStyle(sign).color}:null};
   });
   if(rootId==='trenOyunOverlay')assert(metrics.background.includes('station.svg'),'train keeps its approved station illustration');
   else assert(metrics.background.includes('game-scenes/'+scene+'.svg'),JSON.stringify({rootId,size,metrics}));
   assert(metrics.width<=size.width+2,JSON.stringify({rootId,size,metrics}));
   assert(metrics.scroll<=metrics.client+4,JSON.stringify({rootId,size,metrics}));
   if(rootId!=='jpOyunOverlay')assert(metrics.heading,rootId+' missing decorated hero');
   if(rootId==='trenOyunOverlay')assert(metrics.sign.height>70&&metrics.sign.wrap==='normal','full train question must wrap');
   if(size.width===390)await page.screenshot({path:'/tmp/faithful-game-screens/'+rootId+'.png'});
  }
 }
 // The listening/sentence layouts must use their actual dynamic quiz DOM.
 await page.evaluate(()=>{
  document.querySelectorAll('.game-modal-overlay').forEach(x=>x.style.display='none');
  window.OC.basla('dikte');const modal=document.getElementById('yoModal');modal.dataset.dmSelectedGame='dikte';modal.classList.add('acik');
  document.getElementById('yoGovde').innerHTML='<div class="yo-ust-bilgi">Kelime 1/12</div><div class="yo-dikte-dinle"><button type="button">🔊</button></div><input id="yoDikteInput">';
 });
 await page.waitForSelector('#yoModal .fg-listening-banner',{state:'attached',timeout:5000});
 assert(await page.locator('#yoModal .fg-listening-banner img').count()===1);
 await page.evaluate(()=>{
  window.OC.basla('cumle');const modal=document.getElementById('yoModal');modal.dataset.dmSelectedGame='cumle';
  document.getElementById('yoGovde').innerHTML='<div class="yo-soru"><small>Bu cümleyi İngilizce kur</small><b>Kalede fotoğraflar çekeriz.</b></div><div class="yo-cevap-alan"></div><div class="yo-havuz"><button class="yo-chip">castle</button></div>';
 });
 await page.waitForSelector('#yoModal .fg-sentence-banner',{state:'attached',timeout:5000});
 assert.equal(await page.locator('#yoModal .yo-soru img').count(),0);
 assert.deepEqual(errors,[],'No browser JS errors');
 await browser.close();
 console.log('PASS: eight approved game appearances, responsive 360/390/768 layouts and native listening/sentence stage rendering');
})().catch(e=>{console.error(e);process.exit(1)});
