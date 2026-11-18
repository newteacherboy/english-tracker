// [18 Kas 2026] Yönetici "Çevrimiçi" bölümü: kart yalnız doğrulanmış yöneticide, tek yoklama yayını, liste ve Yenile bekleme süresi.
const {chromium}=require('playwright');const fs=require('fs');const assert=require('assert');
(async()=>{
 const b=await chromium.launch();const page=await b.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://app.dijimedu.com/t',r=>r.fulfill({contentType:'text/html',body:'<main id="tpDashboard"><div class="tp-real-tools"></div></main>'}));await page.goto('https://app.dijimedu.com/t');
 await page.evaluate(()=>{
  sessionStorage.setItem('dm_tp_session',JSON.stringify({teacherToken:'ADM'}));
  window.dmTeacherPortalMode=true;window.dmTeacherVerifiedAdmin=true;window.dmTeacherVerifiedAdminToken='ADM';
  window.__calls=[];window.__sent=[];
  window.supabaseClient={
   rpc:async(n,a)=>{__calls.push(a.p_op);if(a.p_op==='open')return{data:{ok:true,roll:'11111111-1111-1111-1111-111111111111'}};
     return{data:{ok:true,online:[{name:'ayse',class:6,screen:'Düello',duel:true},{name:'ali',class:5,screen:'Arkadaşlar',duel:false},{name:'mert',class:null,screen:'',duel:false}]}};},
   channel:()=>({httpSend:async(e,p)=>{__sent.push([e,p]);return{success:true};}})
  };
 });
 await page.addScriptTag({content:fs.readFileSync('ingilizce/admin-online.js','utf8')});
 await page.evaluate(()=>window.dispatchEvent(new Event('dm:teacher-admin-role-verified')));
 await page.click('[data-dmo]');
 await page.waitForFunction(()=>document.querySelector('[data-count]')?.textContent==='3',null,{timeout:6000});
 await page.waitForFunction(()=>/Son yoklama/.test(document.querySelector('[data-sub]').textContent),null,{timeout:6000});
 const sent=await page.evaluate(()=>__sent);assert.deepEqual(sent,[['who',{roll:'11111111-1111-1111-1111-111111111111'}]]);
 const txt=await page.textContent('.dmo-list');assert.match(txt,/ayse/);assert.match(txt,/Düelloda/);assert.match(txt,/Arkadaşlar/);assert.match(txt,/Uygulamada/);
 assert.match(await page.textContent('[data-refresh]'),/Yenile \(\d+\)/);
 await page.screenshot({path:'/tmp/admin-online.png'});
 assert.deepEqual(errors,[]);console.log('PASS admin online', await page.evaluate(()=>__calls));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
