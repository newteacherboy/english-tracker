'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()),p=u.pathname;
  if(u.hostname==='cdn.jsdelivr.net'&&p.includes('supabase'))return route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>({select:async()=>({data:[],error:null})})})};'});
  if(u.hostname.includes('supabase.co')){
   const b=JSON.parse(route.request().postData()||'{}'),op=b.islem||u.searchParams.get('islem')||'';requests.push(b);let data={ok:true};
   if(!op)data=[{ogrenci:'Önizleme',Sinif:1}];if(op==='ogretmenBilgim')data={kullanici:'TeacherOne',yonetici:false};if(op==='teacherPortalStudents')data={items:[]};
   if(op==='teacherPortalParticipant')data={ok:true,token:'guest-token',name:'Ali · Misafir aabbccdd'};
   if(op==='verifiedGameStart')data={ok:true,slots:b.words.map((w,slot)=>({...w,slot}))};
   if(op==='verifiedGameAnswer')data={ok:true,correct:true};
   if(op==='enerjiDegistir')data={ok:true,status:'success',rankingOnly:true,eklenen:0,enerjiKalan:25,enerjiMax:25};
   if(/LiderlikKaydet$/.test(op))data={ok:true,status:'success'};
   if(/Liderlik.*Getir$/.test(op))data=[];
   if(/^(verifiedGame|(?:dikte|cumle|harfBahcesi)LiderlikKaydet)/.test(op))assert.equal(b.t,'guest-token','games use the participant session');
   if(op==='seviyeDurumu')data={ok:true,level:40,units:[],done:[]};if(op==='ekVeriGetir')data={deger:'{}'};if(/KelimeleriGetir|KelimeHavuzuGetir/.test(op))data=[];return route.fulfill({json:data});
  }
  if(u.hostname==='diji.test'){
   const name=p.replace(/^\/ingilizce\//,'')||'index.html';
   const filename=path.join(__dirname,'../ingilizce',name);
   if(fs.existsSync(filename)&&fs.statSync(filename).isFile())return route.fulfill({path:filename});
  }
  return route.fulfill({contentType:'application/json',body:'[]'});
 });
 await page.addInitScript(()=>new MutationObserver(()=>document.querySelector('.kur-perde .kur-x')?.click()).observe(document,{childList:true,subtree:true}));
 await page.addInitScript(()=>{sessionStorage.setItem('dm_tp_session',JSON.stringify({teacherToken:'teacher-token',name:'TeacherOne',participant:{token:'preview-token',name:'Önizleme'},playAsSelf:false,route:'panel'}));});
 await page.goto('https://diji.test/ingilizce/?ogretmen=1',{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>!!window.dmFaithfulEightGames,{timeout:15000});
 assert.equal(await page.evaluate(()=>window.dmFaithfulEightGames.scenes.length),4);




 await page.evaluate(()=>{window.masterKelimeHavuzu=[...['apple','bread','orange','lemon','water','milk','rice','coffee','banana','sugar','onion','tomato'].map(ingilizce=>({ingilizce,turkce:'bir '+ingilizce,sinif:2,unite:1})),...['bird','dog','horse','rabbit','mouse','lion','tiger','fish','snake','duck','sheep','goat'].map(ingilizce=>({ingilizce,turkce:'iki '+ingilizce,sinif:2,unite:2})),{ingilizce:'I like apples',turkce:'Elma severim',sinif:2,unite:3},{ingilizce:'We play football',turkce:'Futbol oynarız',sinif:2,unite:3}];dikteAc();});
 await page.getByLabel('Sıralamada görünecek ad').fill('Ali');await page.getByRole('button',{name:'Bu öğrenciyle devam et',exact:true}).click();
 await page.waitForSelector('#dmGameIntro');assert.equal(await page.evaluate(()=>aktifOgrenciAdi),'Ali · Misafir aabbccdd');
 await page.locator('#dmIntroClasses [data-class="2"]').click();
 await page.locator('#dmIntroUnits .unite-chip').nth(0).click();await page.locator('#dmIntroUnits .unite-chip').nth(1).click();
 assert.equal(await page.locator('#dmIntroUnits [aria-pressed="true"]').count(),1);
 await page.screenshot({path:'/tmp/quiz-flow-units.png'});
 await page.locator('#dmGameIntro [data-start]').click();await page.waitForSelector('#yoModal.acik');
 assert(await page.evaluate(()=>dkt.liste.every(w=>Number(w.unite)===2)));assert.deepEqual(await page.evaluate(()=>OC.aktif.rewardScope.units),[2]);
 await page.evaluate(()=>{for(const w of dkt.liste){dmVerifiedGames.record(w,w.ingilizce);OC.dogru(1);}dkt.d=dkt.liste.length;dkt.i=dkt.liste.length;dikteSoru();});
 await page.waitForSelector('#genelSonucOverlay.acik');assert.equal(await page.locator('#yoModal.acik').count(),0);
 assert(await page.locator('#genelSonucOverlay #gsoDevamBtn').isVisible());await page.locator('#genelSonucOverlay #gsoDevamBtn').click();
 await page.waitForTimeout(350);
 console.log('GAME EXIT NAV DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>{
   const n=document.getElementById('bottomNavMobile');
   return {body:document.body.className,nav:n&&{display:getComputedStyle(n).display,visibility:getComputedStyle(n).visibility},blockers:[...document.querySelectorAll('.game-modal-overlay,#bzPerde,#dmStoryLesson,#mlThemeList,#meteorGame,#wordWheel,#papiCards,#rallyGame,#dmGameIntro,#seviyeHaritaOverlay,#yoModal.acik,.dm-garden-match,.kp-shell,.ba-shell,.kart-oyun-overlay,#dyOyunOverlay,#genelSonucOverlay,.bz-alt:has(.sp-start-card)')].filter(el=>el.getClientRects().length>0).map(el=>({id:el.id,classes:String(el.className).slice(0,120),inline:el.style.display,display:getComputedStyle(el).display})).slice(0,20)};
 })));
 console.log('PASS listening selected-unit scope, guest lexical identity, native completion and shared result');
 await page.evaluate(()=>{window.dmGameReopeningSetup=true;cumleAc();});await page.locator('#dmIntroClasses [data-class="2"]').click();await page.locator('#dmGameIntro [data-start]').click();await page.waitForSelector('#yoModal.acik');
 assert.equal(await page.locator('#dmIntroUnits .unite-chip').count(),1);assert.equal(await page.locator('#dmIntroUnits .unite-chip').first().textContent(),'3.Ü');assert.deepEqual(await page.evaluate(()=>OC.aktif.rewardScope.units),[3]);
 await page.evaluate(()=>{for(const c of cml.liste){dmVerifiedGames.record(c[0],c[0]);OC.dogru(1);}cml.d=cml.liste.length;cml.i=cml.liste.length;cumleSoru();});
 await page.waitForSelector('#genelSonucOverlay.acik');assert.equal(await page.locator('#yoModal.acik').count(),0);await page.locator('#genelSonucOverlay #gsoDevamBtn').click();
 console.log('PASS sentence completion surfaces results directly, valid class units and no teacher reward claim');
 await page.evaluate(async()=>{await dmLazyGames.ready();window.masterKelimeHavuzu=[{ingilizce:'dog',turkce:'köpek',sinif:2,unite:1},{ingilizce:'cat',turkce:'kedi',sinif:2,unite:1}];window.dmGameReopeningSetup=true;await harfBahcesiAc();});
 await page.locator('#hbClasses [data-class="2"]').click();await page.locator('#harfBahcesiOverlay [data-start]').click();await page.waitForSelector('#harfBahcesiOverlay.hb-playing');
 assert.match(await page.locator('.hb-meta').textContent(),/0\/2/);
 for(let i=0;i<2;i++){await page.locator('#harfBahcesiOverlay [data-skip]').click();await page.locator('#harfBahcesiOverlay [data-next]').click();}
 await page.waitForSelector('#genelSonucOverlay.acik');assert.equal(await page.locator('#harfBahcesiOverlay').count(),0);await page.locator('#genelSonucOverlay #gsoDevamBtn').click();
 console.log('PASS small garden pool, verified classroom allowance and automatic common result');
 await page.evaluate(()=>{window.dmGameReopeningSetup=true;esOyunAc();});await page.waitForSelector('#esOyunOverlay.dm-vp-root');await page.evaluate(()=>esOyunuBitir());await page.waitForSelector('#genelSonucOverlay.acik');
 assert.equal(await page.locator('#esBitisEkrani').isVisible(),false);assert.equal(await page.locator('#esOyunOverlay').isVisible(),false);await page.locator('#genelSonucOverlay #gsoDevamBtn').click();
 await page.waitForTimeout(100);assert(!requests.some(b=>b.islem==='seviyeOyunOdulu'),'classroom results never claim wallet rewards');
 assert(requests.some(b=>b.islem==='cumleLiderlikKaydet'));assert(requests.some(b=>b.islem==='dikteLiderlikKaydet'));assert(requests.some(b=>b.islem==='harfBahcesiLiderlikKaydet'));assert.deepEqual(errors,[]);
 console.log('PASS one shared result for matching game and participant-only verified rankings');
 const watchdog=setTimeout(()=>process.exit(0),3000);await browser.close();clearTimeout(watchdog);
})().catch(e=>{console.error(e);process.exit(1)});
