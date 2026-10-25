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
  if(u.hostname.includes('supabase.co')){const b=JSON.parse(route.request().postData()||'{}'),op=b.islem||u.searchParams.get('islem')||'';let data={ok:true};if(!op)data=[{ogrenci:'Önizleme',Sinif:1}];if(op==='ogretmenBilgim')data={kullanici:'TeacherOne',yonetici:false};if(op==='teacherPortalParticipant')data={ok:true,token:'self-token',name:'TeacherOne · Öğretmen Denemesi',self:true,preview:true};if(['takipDavetListesi','oyunEslesmelerim'].includes(op)){assert.equal(b.t,'self-token','online game uses current participant, never teacher owner token');data={ok:true,serverNow:new Date().toISOString(),liste:op==='takipDavetListesi'?[{ad:'Alice',online:false}]:[]};}if(op==='papiKartSonucKaydet'){assert.equal(b.t,'teacher-token');assert.equal(b.toplam,2);assert.equal(b.biliyorum,1);assert.equal(b.tekrar,1);assert.equal(b.isim,'TeacherOne');data={ok:true,isim:b.isim,puan:50};}if(op==='papiKartSiralamaGetir'){assert.equal(b.t,'teacher-token');data={ok:true,liste:[]};}if(op==='teacherPortalStudents')data={items:[]};if(op==='seviyeDurumu')data={ok:true,level:40,units:[],done:[]};if(op==='ekVeriGetir')data={deger:'{}'};if(/KelimeleriGetir|KelimeHavuzuGetir/.test(op))data=[];return route.fulfill({json:data});}
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
 await page.evaluate(async()=>{window.dmWrongWords={add(){throw Error('Teacher cards must not write personal word review')}};window.dmGameAssignmentResult=()=>{throw Error('Teacher cards must not write personal homework')};window.masterKelimeHavuzu=[{sinif:2,unite:1,ingilizce:'apple',turkce:'elma'},{sinif:2,unite:1,ingilizce:'book',turkce:'kitap'}];await dmLazyGames.ready();await dmPapiCards.open();});await page.locator('#pcName').waitFor();await page.locator('.pc-view-ranking').click();await page.getByText('Henüz sonuç yok.',{exact:true}).waitFor();await page.locator('.pc-start').click();await page.locator('.pc-translate').click();await page.locator('.pc-again').click();for(let i=0;i<2;i++){await page.locator('.pc-translate').click();await page.locator('.pc-known').click();}await page.locator('.pc-save-status').filter({hasText:'Sonucun kaydedildi: TeacherOne'}).waitFor();assert.equal(await page.getByText('Bu işlem için kişisel hesabına geç.',{exact:true}).count(),0);await page.locator('#papiCards>.dm-vp-exit').click();assert.equal(await page.locator('#papiCards').count(),0);assert.deepEqual(errors,[]);console.log('PASS teacher cards: ranking, full deck with review, teacher-scoped result save, default teacher name and exit');await browser.close();return;
 
})().catch(e=>{console.error(e);process.exit(1)});
