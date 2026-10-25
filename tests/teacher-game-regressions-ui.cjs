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
  if(u.hostname.includes('supabase.co')){const b=JSON.parse(route.request().postData()||'{}'),op=b.islem||u.searchParams.get('islem')||'';let data={ok:true};if(!op)data=[{ogrenci:'Önizleme',Sinif:1}];if(op==='ogretmenBilgim')data={kullanici:'TeacherOne',yonetici:false};if(op==='teacherPortalParticipant')data={ok:true,token:'self-token',name:'TeacherOne · Öğretmen Denemesi',self:true,preview:true};if(['takipDavetListesi','oyunEslesmelerim'].includes(op)){assert.equal(b.t,'self-token','online game uses current participant, never teacher owner token');data={ok:true,serverNow:new Date().toISOString(),liste:op==='takipDavetListesi'?[{ad:'Alice',online:false}]:[]};}if(op==='teacherPortalStudents')data={items:[]};if(op==='seviyeDurumu')data={ok:true,level:40,units:[],done:[]};if(op==='ekVeriGetir')data={deger:'{}'};if(/KelimeleriGetir|KelimeHavuzuGetir/.test(op))data=[];return route.fulfill({json:data});}
  if(u.hostname==='diji.test'){
   const name=p.replace(/^\/ingilizce\//,'')||'index.html';
   const filename=path.join(__dirname,'../ingilizce',name);
   if(fs.existsSync(filename)&&fs.statSync(filename).isFile())return route.fulfill({path:filename});
  }
  return route.fulfill({contentType:'application/json',body:'[]'});
 });
 await page.addInitScript(()=>new MutationObserver(()=>document.querySelector('.kur-perde .kur-x')?.click()).observe(document,{childList:true,subtree:true}));
 await page.addInitScript(()=>{sessionStorage.setItem('dm_tp_session',JSON.stringify({teacherToken:'teacher-token',name:'TeacherOne',participant:{token:'preview-token',name:'Önizleme'},route:'panel'}));});
 await page.goto('https://diji.test/ingilizce/?ogretmen=1',{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>!!window.dmFaithfulEightGames,{timeout:15000});
 assert.equal(await page.evaluate(()=>window.dmFaithfulEightGames.scenes.length),4);



 await page.waitForSelector('#tpDashboard.is-visible');
 for(const size of [{width:360,height:640},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]){
  await page.setViewportSize(size);await page.waitForTimeout(250);
  const boxes=await page.locator('#tpDashboard .tp-real-tools>button:not([hidden])').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect(),t=b.querySelector('strong')?.getBoundingClientRect();return {text:b.textContent,box:r.toJSON(),title:t?.toJSON(),color:getComputedStyle(b).color,overflow:b.scrollHeight-b.clientHeight};}));
  assert(boxes.length>0);assert(await page.locator('#tpDashboard .tp-real-tools>button[hidden]').evaluateAll(bs=>bs.every(b=>getComputedStyle(b).display==='none')));for(const b of boxes){assert(b.box.height>=35,JSON.stringify(b));assert(b.overflow<=2,JSON.stringify(b));if(b.title){assert(b.title.top>=b.box.top&&b.title.bottom<=b.box.bottom,JSON.stringify(b));}assert(b.box.bottom<=size.height-70,JSON.stringify(b));}
  console.log('PASS teacher card text contained',size,boxes.length);
 }
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('#dmDiscovery').count(),0,'teacher never enters learner discovery or its inert focus trap');
 await page.evaluate(async()=>{await dunyaAc();});
 assert.equal(await page.getByText('Parkur yüklenemedi',{exact:true}).count(),0,'teacher boot never starts learner route loading');
  assert.equal(await page.evaluate(()=>dmTeacherPortal.beforeGame('test')),true);assert.equal(await page.evaluate(()=>localStorage.getItem('ing_token')),'self-token');assert.equal(await page.getByRole('heading',{name:'Bu oyunu kim oynayacak?'}).count(),0);
 for(const game of ['ucus','rota']){await page.evaluate(async game=>{window.dmClassroomOnlineOwner='Stale pupil';await dmInviteAc(game);},game);await page.getByText('Alice',{exact:true}).waitFor();assert.equal(await page.getByText('Öğrenci oturumu gerekli.',{exact:true}).count(),0);assert.equal(await page.evaluate(()=>dmClassroomOnlineOwner),null);await page.locator('.dm-perde .dm-x').click();}await page.evaluate(()=>dmArenaAc());await page.getByText('Henüz karşılaşman yok. İlk davetini gönder! 🦜',{exact:true}).waitFor();await page.locator('.dm-perde .dm-x').click();
 async function playing(){await page.evaluate(async()=>{window.dmGameReopeningSetup=true;try{await trenOyunAc();}finally{window.dmGameReopeningSetup=false;}document.getElementById('trenGirisEkrani').style.display='none';document.getElementById('trenOyunEkrani').style.display='block';dmGameViewport.sync();});await page.waitForTimeout(100);}
 for(let i=0;i<2;i++){
  await playing();await page.locator('#trenOyunOverlay>.dm-vp-back').click();
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('trenGirisEkrani')).display!=='none');
  await page.locator('#trenOyunOverlay>.dm-vp-exit').click();await page.waitForFunction(()=>getComputedStyle(document.getElementById('trenOyunOverlay')).display==='none');
  await playing();await page.locator('#trenOyunOverlay>.dm-vp-exit').click();await page.waitForFunction(()=>getComputedStyle(document.getElementById('trenOyunOverlay')).display==='none');
 }
 assert.equal(await page.evaluate(()=>document.body.classList.contains('dm-game-viewport')),false);
 assert(await page.locator('#tpTeacherDock').isVisible());
 assert.deepEqual(errors,[]);
 console.log('PASS native train back/X after repeated openings, teacher startup and no learner error page');
 const watchdog=setTimeout(()=>process.exit(0),3000);await browser.close();clearTimeout(watchdog);
})().catch(e=>{console.error(e);process.exit(1)});
