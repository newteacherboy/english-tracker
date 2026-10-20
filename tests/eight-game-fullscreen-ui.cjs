'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()),p=u.pathname;
  if(u.hostname==='cdn.jsdelivr.net'&&p.includes('supabase'))
   return route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>({select:async()=>({data:[],error:null})})})};'});
  if(u.hostname==='diji.test'){
   const filename=path.join(__dirname,'../ingilizce',p.replace(/^\/ingilizce\//,'')||'index.html');
   if(fs.existsSync(filename)&&fs.statSync(filename).isFile())return route.fulfill({path:filename});
  }
  return route.fulfill({contentType:'application/json',body:'[]'});
 });
 await page.addInitScript(()=>new MutationObserver(()=>document.querySelector('.kur-perde .kur-x')?.click()).observe(document,{childList:true,subtree:true}));
 await page.goto('https://diji.test/ingilizce/',{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>!!window.dmEightGameFullscreen,{timeout:15000});
 const games=[
  ['jpOyunOverlay','jpBalonEkrani'],['jpOyunOverlay','jpSoruEkrani'],
  ['yagmurOyunOverlay','yagmurOyunEkrani'],['kelimebulOyunOverlay','kelimebulOyunEkrani'],
  ['esOyunOverlay','esOyunEkrani'],['trenOyunOverlay','trenOyunEkrani']
 ];
 // Load representative content through the LIVE game nodes to measure layout,
 // not through a rendered screenshot over inactive controls.
 const prep=([rootId,stageId])=>{
  document.querySelectorAll('.game-modal-overlay').forEach(x=>x.style.setProperty('display','none','important'));
  const root=document.getElementById(rootId),stage=document.getElementById(stageId);
  document.body.append(root);
  root.style.setProperty('display','flex','important');
  root.classList.add('dm-designed-playing');
  for(const id of ['jpGirisEkrani','jpBitisEkrani','jpBalonEkrani','jpSoruEkrani',
    'yagmurGirisEkrani','yagmurBitisEkrani','yagmurOyunEkrani',
    'kelimebulGirisEkrani','kelimebulBitisEkrani','kelimebulOyunEkrani',
    'esGirisEkrani','esBitisEkrani','esOyunEkrani',
    'trenGirisEkrani','trenBitisEkrani','trenOyunEkrani']){
   const element=root.querySelector('#'+id);if(element)element.style.display='none';
  }
  stage.style.display='block';
  if(stageId==='jpBalonEkrani'){
   document.getElementById('jpBalonlarGrid').innerHTML=
     Array.from({length:12},(_,i)=>'<button class="dm-risk-balloon"><span class="dm-balloon-body"><b>'+(i+1)+'</b></span></button>').join('');
  }
  if(stageId==='yagmurOyunEkrani'){
   document.getElementById('yagmurAlan').innerHTML='<div class="yg-dusen-kelime" style="position:relative;top:15%">Butterfly</div>';
   document.getElementById('yagmurSecenekler').innerHTML=
    ['Uzun ve ayrıntılı Türkçe açıklaması','Kelebek','Yalnızca birkaç kelimelik açıklama']
     .map((s,i)=>'<button class="yg-secenek-btn" data-test-answer="'+i+'">'+s+'</button>').join('');
  }
  if(stageId==='esOyunEkrani'){
   for(const id of ['esSol','esSag'])document.getElementById(id).innerHTML='<div class="es-sutun-baslik">İngilizce / Türkçe</div>'+
    Array.from({length:4},(_,i)=>'<button class="es-k '+(id==='esSol'?'en':'tr')+'">Uzunca kelime '+i+'</button>').join('');
  }
  if(stageId==='trenOyunEkrani'){
   document.getElementById('trenTabela').textContent='Bugün arkadaşlarımızla tren istasyonunda güzel fotoğraflar çekiyoruz.';
   document.getElementById('trenHavuz').innerHTML=Array.from({length:12},(_,i)=>'<button class="tr-v">word'+i+'</button>').join('');
   document.getElementById('trenHat').innerHTML='<span class="tr-lok">🚂</span><button class="tr-v">My</button><button class="tr-v">friend</button>';
  }
  if(stageId==='kelimebulOyunEkrani')document.getElementById('kbSatirlar').innerHTML=
   Array.from({length:4},()=>'<div class="kb-row-v2">'+Array.from({length:7},()=>'<div class="kb-box-v2">A</div>').join('')+'</div>').join('');
  window.dmEightGameFullscreen.sync();
 };
 fs.mkdirSync('/tmp/eight-game-fullscreen',{recursive:true});
 for(const v of [{width:360,height:640},{width:390,height:844},{width:430,height:932},{width:768,height:1024}]){
  await page.setViewportSize(v);
  for(const game of games){
   await page.evaluate(prep,game);
   await page.waitForFunction(id=>document.getElementById(id)?.classList.contains('fg-fs-active'),game[0],{timeout:3000});
   const m=await page.evaluate(([rootId,stageId])=>{
    const root=document.getElementById(rootId),stage=document.getElementById(stageId),
     card=root.querySelector('.game-modal-content'),back=root.querySelector(':scope > .fg-fs-back'),
     close=root.querySelector('.game-close-btn');
    const r=el=>{const x=el?.getBoundingClientRect();return x?{top:x.top,left:x.left,right:x.right,bottom:x.bottom,width:x.width,height:x.height}:null};
    return {active:root.classList.contains('fg-fs-active'),
     viewport:{w:innerWidth,h:innerHeight},root:r(root),card:r(card),stage:r(stage),
     scroll:{cardHeight:card.scrollHeight,cardClient:card.clientHeight,stageHeight:stage.scrollHeight,stageClient:stage.clientHeight},
     back:r(back),close:r(close),closeText:close?.textContent,
     bodyLocked:document.body.classList.contains('fg-game-locked'),
     answers:[...document.querySelectorAll('#yagmurSecenekler .yg-secenek-btn')].map(b=>{
      const span=b.querySelector('.fg-choice-text');
      return {text:b.textContent,expected:b.dataset.testAnswer,label:b.dataset.fgChoice,
       badge:getComputedStyle(b,'::before').content,btn:r(b),answer:r(span),
       spanWhiteSpace:span?getComputedStyle(span).whiteSpace:''};
     })};
   },game);
   assert(m.bodyLocked&&m.active,'not fullscreen '+JSON.stringify({v,game,m}));
   assert(Math.abs(m.card.height-v.height)<3&&Math.abs(m.card.width-v.width)<3,'viewport '+JSON.stringify({v,game,m}));
   assert(m.scroll.cardHeight<=m.scroll.cardClient+4&&m.scroll.stageHeight<=m.scroll.stageClient+8,
     'requires scrolling '+JSON.stringify({v,game,m}));
   assert(m.back&&m.close&&m.back.left<m.close.left&&m.closeText==='×',
     'back and X placement '+JSON.stringify({v,game,m}));
   if(game[0]==='yagmurOyunOverlay'){
    assert.equal(m.answers.length,3);
    for(let i=0;i<3;i++){
     const x=m.answers[i];
     assert.equal(x.label,'ABC'[i]);
     assert(x.answer.left-x.btn.left>=29,'answer overlapped badge '+JSON.stringify({v,x}));
     assert(x.answer.right<=x.btn.right+2,'answer extends past choice '+JSON.stringify({v,x}));
     assert(x.spanWhiteSpace==='normal','choice needs wrapping');
     assert(x.text&&!x.text.startsWith('ABC'[i]),'label must NOT modify server answer '+x.text);
    }
   }
   if(v.width===390)await page.screenshot({path:'/tmp/eight-game-fullscreen/'+game.join('-')+'.png'});
  }
 }
 // Dynamic Harf Bahçesi overlay: verify full-height board and separate back/X.
 await page.setViewportSize({width:360,height:640});
 const hb=await page.evaluate(()=>{
  const root=document.createElement('div');root.id='harfBahcesiOverlay';root.className='hb-overlay hb-playing';
  root.innerHTML='<section class="hb-card"><header><h2>Harf Bahçesi</h2><button data-close>‹</button></header><div class="hb-body"><div class="hb-meta"><b>0 / 12</b><b>100 puan</b><b>42 saniye</b></div><progress max="12"></progress><div class="hb-hints"><div><span>Kelebek</span><b>•••••••</b></div></div><div class="hb-grid">'+Array.from({length:24},(_,i)=>'<button data-cell="'+i+'">A</button>').join('')+'</div><div class="hb-selection">Kelimeler</div><div class="hb-actions"><button>Temizle</button><button>Kelimeyi bul</button><button>Pas geç</button></div><p class="hb-status">Bitişik harfleri bul.</p></div></section>';
  document.body.append(root);window.dmEightGameFullscreen.sync();
  return {active:root.classList.contains('fg-fs-active'),height:root.querySelector('.hb-card').getBoundingClientRect().height,
   back:!!root.querySelector('.fg-fs-back'),close:root.querySelector('[data-close]').textContent,
   sc:root.querySelector('.hb-body').scrollHeight,ch:root.querySelector('.hb-body').clientHeight};
 });
 assert(hb.active&&hb.back&&hb.close==='×'&&Math.abs(hb.height-640)<3&&hb.sc<=hb.ch+8,'garden '+JSON.stringify(hb));
 // Both dynamic language games reuse the same screen, without a duplicate energy charge.
 await page.evaluate(()=>{
  window.OC.basla('dikte');const yo=document.getElementById('yoModal');
  yo.classList.add('acik');yo.dataset.dmSelectedGame='dikte';
  document.getElementById('yoGovde').innerHTML='<div class="yo-ust-bilgi">Kelime 1/12</div><div class="yo-ilerleme"></div><div class="yo-dikte-dinle"><button>🔊</button></div><input id="yoDikteInput"><button class="yo-btn">Kontrol</button>';
  window.dmEightGameFullscreen.sync();
 });
 const yo=await page.evaluate(()=>{
  const root=document.getElementById('yoModal'),card=root.querySelector('.yo-kart');
  return {active:root.classList.contains('fg-fs-active'),w:card.getBoundingClientRect().width,
   h:card.getBoundingClientRect().height,back:!!root.querySelector('.fg-fs-back'),
   close:root.querySelector('.yo-kapat').textContent,
   scroll:card.scrollHeight,client:card.clientHeight};
 });
 assert(yo.active&&yo.back&&yo.close==='×'&&Math.abs(yo.w-360)<3&&Math.abs(yo.h-640)<3&&yo.scroll<=yo.client+4,'listening '+JSON.stringify(yo));
 await page.evaluate(()=>{
  window.OC.basla('cumle');const yo=document.getElementById('yoModal');yo.dataset.dmSelectedGame='cumle';
  document.getElementById('yoGovde').innerHTML='<div class="yo-ust-bilgi">Cümle 1/12</div><div class="yo-ilerleme"></div><div class="yo-soru"><small>İngilizceyi kur</small><b>Kitabı sıranın üzerine koy.</b></div><div class="yo-cevap-alan"><button class="yo-chip">Put</button></div><div class="yo-havuz">'+Array.from({length:10},(_,i)=>'<button class="yo-chip">word'+i+'</button>').join('')+'</div><button class="yo-btn">Kontrol et</button>';
  window.dmEightGameFullscreen.sync();
 });
 const cs=await page.evaluate(()=>{
  const root=document.getElementById('yoModal'),body=document.getElementById('yoGovde');return {active:root.classList.contains('fg-fs-active'),h:body.clientHeight,scroll:body.scrollHeight};
 });
 assert(cs.active&&cs.scroll<=cs.h+8,'sentence '+JSON.stringify(cs));
 const serious=errors.filter(x=>!/ResizeObserver loop limit/.test(x));
 assert.deepEqual(serious,[],'No unexpected browser JS errors');
 await browser.close();
 console.log('PASS: all eight fullscreen mini games, 360/390/430/768 screens, Hız Fırtınası labels, independent back/X, keyboard-safe answer strings');
})().catch(e=>{console.error(e);process.exit(1)});
