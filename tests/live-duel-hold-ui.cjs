// [18 Kas 2026] Canlı düello: hakkı olmayan rakip reklam izlerken davet eden bekler; reklam bitince "Şimdi Başla".
require('./_index-source.cjs');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const source=path.resolve(__dirname,'../ingilizce');
const out='/tmp/live-duel-hold-qa';fs.mkdirSync(out,{recursive:true});
const questions=[
 {t:'meaning',p:'giraffe',o:['zürafa','fırın','çatal','sakin'],a:0,lim:10},
 {t:'reverse',p:'sözlük',o:['oven','dictionary','desert','usual'],a:1,lim:10},
 {t:'blank',ask:'blank',p:'___ I pay in cash?',o:['bird','can','wide','tour'],a:1,lim:12},
 {t:'tf',p:'shop = mağaza',o:['Doğru','Yanlış'],a:0,lim:6},
 {t:'pair',p:'Hangisi doğru eşleşme?',o:['afternoon = konuşmak','cook = yemek pişirmek','talk = fotoğraf','photo = öğleden sonra'],a:1,lim:10},
 {t:'meaning',p:'oven',o:['fırın','çöl','geniş','gezi'],a:0,lim:10},
 {t:'reverse',p:'şemsiye',o:['plate','fork','umbrella','shirt'],a:2,lim:10},
 {t:'tf',p:'quiet = gümüş',o:['Doğru','Yanlış'],a:1,lim:6},
 {t:'blank',ask:'blank',p:'We are going to ___ the island.',o:['explore','teeth','silver','path'],a:0,lim:12},
 {t:'final',ask:'blank',p:'___ camera is mine.',o:['saturday','this','insect','member'],a:1,lim:12}
];
const papi=questions.map((q,i)=>({c:i%2?q.a:(q.a+1)%q.o.length,ms:1500}));
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']}),errors=[],rpcCalls=[];
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.setDefaultTimeout(9000);
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 let acceptMode='hold',pollMode='hold',adMode='ok',holdOps=[];
 await page.route('**/*',async r=>{
  const u=new URL(r.request().url());let body={};try{body=r.request().postDataJSON()||{};}catch{}
  if(u.pathname.startsWith('/rest/v1/rpc/dm_duel_')){
   const op=u.pathname.split('/').pop();rpcCalls.push(op);let d={ok:true};
   if(op==='dm_duel_status')d={ok:true,me:'Fixture',level:24,plan:'free',unlimited:false,social:true,live:{used:1,limit:1,remaining:0},papi:{used:0,limit:2,remaining:2}};
   else if(op==='dm_duel_live_accept')d=acceptMode==='hold'?{ok:false,paywall:true,kind:'live',hold:true,duel:'d-inv',host:'Ece',holdLeftMs:20000,message:'Bugünkü ücretsiz Canlı Düello hakkını kullandın.'}
     :{ok:true,id:'d-inv',kind:'live',status:'matched',side:'guest',vsPapi:false,opponent:'Ece',opponentLevel:22,questions};
   else if(op==='dm_duel_live_hold'){holdOps.push(body.p_op);d=body.p_op==='watch'?{ok:true,holdLeftMs:45000}:{ok:true,released:true};}
   else if(op==='dm_duel_ad')d=body.p_op==='prepare'?{ok:true,offerId:'offer-1'}:{ok:true,claimed:true,live:{remaining:1}};
   else if(op==='dm_duel_live_search')d={ok:true,id:'d-live',kind:'live',status:'searching',side:'host',broadcast:true,level:24};
   else if(op==='dm_duel_live_poll')d=pollMode==='hold'?{ok:true,id:'d-live',status:'searching',hold:{name:'Deniz',ad:true,leftMs:45000}}
     :{ok:true,id:'d-live',kind:'live',status:'matched',side:'host',vsPapi:false,opponent:'Deniz',opponentLevel:12,questions};
   else if(op==='dm_duel_finish')d={ok:true,status:'finished',outcome:'lose',me:{hp:0,xp:0,gold:0,correct:0,damage:0,ms:0,total:10},them:{hp:100,xp:300,gold:50},yo:null};
   else if(op==='dm_duel_live_cancel')d={ok:true,cancelled:true};
   return r.fulfill({json:d});
  }
 const op=body.islem||u.searchParams.get('islem');
  if(op){let d={ok:true};
   if(op==='seviyeDurumu')d={ok:true,level:30,feed:true,lessons:{},chests:{}};
   else if(op==='seviyeLigListesi')d={ok:true,liste:[{name:'Fixture',class:'6',league:'yerel',rank:1,xp:900},{name:'Ece',class:'6',league:'yerel',rank:2,xp:800},{name:'Can',class:'6',league:'yerel',rank:3,xp:700}]};
   else if(op==='duellolarim')d={ok:true,liste:[{id:'duel-1',gonderen:'Ege',alici:'Fixture',oyun:'Kelime_Liderlik',durum:'bekliyor'}]};
   else if(op==='aktifDurum'||op==='takipDavetListesi')d={ok:true,serverNow:new Date().toISOString(),liste:[]};
   else if(op==='yayinOzellikleri')d={flags:{},admin:false};
   else if(op==='ekVeriGetir')d={};
   else if(op==='bildirimlerim')d={liste:[]};
   else if(op==='safetyStatus')d={ok:true,socialAllowed:true,noticeSeen:true};
   return r.fulfill({json:d});
  }
  if(u.hostname==='duel.test'){
   const file=path.join(source,u.pathname.replace(/^\/ingilizce\//,'')||'index.html');
   if(fs.existsSync(file)&&fs.statSync(file).isFile())return r.fulfill({path:file});
  }
  return r.fulfill({contentType:'application/json',body:'[]'});
 });
 await page.addInitScript(()=>{new MutationObserver(()=>document.querySelector('.kur-perde .kur-x')?.click()).observe(document,{childList:true,subtree:true});});
 await page.goto('https://duel.test/ingilizce/?giris=1',{waitUntil:'load'});
 // Canlı davetler websocket ister: CSP wss:// adresine izin vermeli (17 Kas'ta engellenmişti).
 assert.match(await page.getAttribute('meta[http-equiv="Content-Security-Policy"]','content'),/connect-src[^;]*wss:\/\/nxfqlutulxqzqgwewssd\.supabase\.co/);
 await page.evaluate(()=>{
  aktifOgrenciAdi='Fixture';globalDataCache=[{ogrenci:'Fixture',Sinif:'6',Durum:'approved'}];
  yo=yoVarsayilan();yo.totalXp=60000;yo.karakter={cins:'e',s:{}};yo.dmPapiIntro={disabled:true,shown:2,automatic:true,rolloutSeen:true};yo.turlar=['ana','v2:ana','papi:v3'];yo.lig={hafta:yoHaftaKodu(),xp:900};yo.dmParkurMigration={version:1};yoIsim='Fixture';
  localStorage.setItem('ing_token','fixture-token-123456789012345');window.yoHazirMi=()=>true;window.yoSunucuyaGonder=()=>{};
  window.dmPapiNotices={blocked:()=>true,defer:()=>true};window.reportedToasts=[];window.yoToast=m=>reportedToasts.push(m);
  window.dmFeatureEnabled=()=>true;window.genelEnerjiKalan=30;window.dmPreviewFixtures=true;
  // Realtime kanal taklidi: gönderilenleri kaydet, gelen olayları test tetikler.
  window.__sent=[];window.__handlers={};
  window.supabaseClient={channel:(name)=>{const ch={name,on(type,f,h){(window.__handlers[name+':'+f.event]=h);return ch;},subscribe(cb){cb?.('SUBSCRIBED');return ch;},send(m){window.__sent.push({name,...m});return Promise.resolve('ok');}};return ch;},removeChannel(){}};
  document.getElementById('panel-alani').style.display='block';document.getElementById('login-container').style.display='none';
 });
 await page.evaluate(()=>dmProgression.refresh(true));
 await page.evaluate(()=>meduAkisAc());
 await page.waitForSelector('.fr-duel-card');
 assert.equal(await page.locator('text=/çevrimiçi/i').count(),0,'çevrimiçi sayısı görünmemeli');


 await page.evaluate(()=>{window.dmAndroidAds={show:async()=>window.__adResult||{completed:true}};});

 // 1) Davet gelir, hak yok: kabul et -> panel "Ece seni bekliyor"
 await page.waitForFunction(()=>!!window.__handlers['dm-duel-lobby:seek'],null,{timeout:9000});
 await page.evaluate(()=>window.__handlers['dm-duel-lobby:seek']?.({payload:{id:'d-inv',name:'Ece',level:22,at:Date.now()}}));
 await page.waitForSelector('.ld-invite.ld-in');
 await page.click('.ld-invite-yes');
 await page.waitForSelector('.ld-sheet [data-chip]');await page.waitForTimeout(350);
 assert.match(await page.textContent('.ld-hold-chip'),/Ece seni bekliyor/);
 await page.screenshot({path:out+'/1-guest-paywall-hold.png'});
 // Reklam izle -> rakibe "reklam izliyor" yayını -> "Hakkın geldi"
 await page.click('.ld-sheet [data-ad]');
 await page.waitForSelector('.ld-sheet.ld-ready');await page.waitForTimeout(300);
 assert(holdOps.includes('watch'),'watch çağrılmalı');
 const hold=await page.evaluate(()=>window.__sent.find(m=>m.event==='hold'));
 assert.equal(hold.payload.id,'d-inv');assert.equal(hold.payload.ad,true);assert.equal(hold.payload.leftMs,45000);
 assert.match(await page.textContent('.ld-sheet'),/Hakkın geldi/);assert.match(await page.textContent('.ld-sheet [data-go]'),/Şimdi Başla/);
 await page.screenshot({path:out+'/2-guest-ready.png'});
 acceptMode='ok';
 await page.click('.ld-sheet [data-go]');
 await page.waitForSelector('.ld-vs');assert.match(await page.textContent('.ld-vs'),/Ece/);
 await page.waitForSelector('.ld-battle',{timeout:6000});
 await page.click('[data-quit]');await page.waitForSelector('.ld-confirm');await page.click('.ld-confirm [data-leave]');
 await page.waitForSelector('.ld-result',{timeout:12000});await page.click('.ld-result [data-close]');
 await page.evaluate(()=>{window.__sent.length=0;});

 // 2) Reklam yarıda kalırsa ayırma bırakılır
 acceptMode='hold';holdOps=[];
 await page.evaluate(()=>{window.__adResult={completed:false};});
 const st=await page.evaluate(()=>{try{return !!window.dmLiveDuel}catch{return false}});assert(st);
 await page.evaluate(()=>{window.dmLiveDuel.paywall('live','Bugünkü ücretsiz Canlı Düello hakkını kullandın.',null,{duel:'d-inv2',host:'Ece',leftMs:20000});});
 await page.waitForSelector('.ld-sheet [data-chip]');
 await page.click('.ld-sheet [data-ad]');
 await page.waitForFunction(()=>/Reklamı tamamladığında/.test(document.querySelector('.ld-sheet-note')?.textContent||''));
 assert.deepEqual(holdOps,['watch','release']);
 assert(await page.evaluate(()=>window.__sent.some(m=>m.event==='hold'&&m.payload.end&&m.payload.reason==='ad')),'rakibe vazgeçti bildirimi');
 assert.equal(await page.locator('.ld-sheet [data-chip]').count(),0);
 await page.click('.ld-sheet [data-close]');

 // 3) Davet eden taraf: "Deniz kabul etti, reklam izliyor" kartı -> eşleşince düello başlar
 await page.evaluate(()=>{window.dmLiveDuel.startLive();});
 await page.waitForSelector('.ld-hold-card',{timeout:6000});await page.waitForTimeout(400);
 assert.match(await page.textContent('.ld-hold-card'),/Deniz kabul etti!/);
 assert.match(await page.textContent('.ld-hold-card'),/reklam izliyor/);
 assert.match(await page.textContent('.ld-search h2'),/Deniz reklam izliyor/);
 assert.match(await page.textContent('.ld-count'),/0:4[0-5]/);
 await page.screenshot({path:out+'/3-host-waiting.png'});
 pollMode='matched';
 await page.waitForSelector('.ld-vs',{timeout:9000});assert.match(await page.textContent('.ld-vs'),/Deniz/);
 assert.match(await page.textContent('.ld-vs .ld-kicker'),/RAKİP BULUNDU/);

 assert.deepEqual(errors,[],'sayfa hatası olmamalı: '+errors.join(' | '));
 console.log('PASS reklam bekleme: davet kabul (hak yok) -> bekliyor çipi, reklam -> rakibe yayın -> Hakkın geldi -> Şimdi Başla; reklam yarıda -> bırakma; davet eden bekleme kartı -> eşleşme. RPC:',[...new Set(rpcCalls)].join(','));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
