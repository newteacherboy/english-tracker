// Canlı Düello + Papi'ye Karşı: Arkadaşlar kartı, savaş paneli, sonuç, hak bitti paneli ve davet bildirimi.
require('./_index-source.cjs');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const source=path.resolve(__dirname,'../ingilizce');
const out='/tmp/live-duel-qa';fs.mkdirSync(out,{recursive:true});
const questions=[
 {t:'meaning',p:'giraffe',o:['zürafa','fırın','çatal','sakin'],a:0,lim:10},
 {t:'reverse',p:'sözlük',o:['oven','dictionary','desert','usual'],a:1,lim:10},
 {t:'blank',ask:'blank',p:'___ I pay in cash?',o:['bird','can','wide','tour'],a:1,lim:12},
 {t:'tf',p:'shop = mağaza',o:['Doğru','Yanlış'],a:0,lim:6},
 {t:'pair',p:'Hangisi doğru eşleşme?',o:['afternoon = konuşmak','cook = yemek pişirmek','talk = fotoğraf','photo = öğleden sonra'],a:1,lim:10},
 {t:'final',ask:'blank',p:'___ camera is mine.',o:['saturday','this','insect','member'],a:1,lim:12}
];
const papi=questions.map((q,i)=>({c:i%2?q.a:(q.a+1)%q.o.length,ms:1500}));
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']}),errors=[],rpcCalls=[];
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.setDefaultTimeout(9000);
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 let papiMode='ok',pollCount=0;
 await page.route('**/*',async r=>{
  const u=new URL(r.request().url());let body={};try{body=r.request().postDataJSON()||{};}catch{}
  if(u.pathname.startsWith('/rest/v1/rpc/dm_duel_')){
   const op=u.pathname.split('/').pop();rpcCalls.push(op);let d={ok:true};
   if(op==='dm_duel_status')d={ok:true,me:'Fixture',level:24,plan:'free',unlimited:false,social:true,live:{used:0,limit:1,remaining:1},papi:{used:0,limit:2,remaining:2}};
   else if(op==='dm_duel_papi_start')d=papiMode==='paywall'?{ok:false,paywall:true,kind:'papi',message:'Bugünkü 2 ücretsiz Papi düellonu kullandın.'}:{ok:true,id:'d-papi',kind:'papi',status:'matched',side:'host',vsPapi:true,opponent:'Papi',questions,papi};
   else if(op==='dm_duel_live_search')d={ok:true,id:'d-live',kind:'live',status:'searching',side:'host',broadcast:true,level:24};
   else if(op==='dm_duel_live_poll'){pollCount++;d=pollCount<2?{ok:true,id:'d-live',status:'searching'}:{ok:true,id:'d-live',kind:'live',status:'matched',side:'host',vsPapi:true,opponent:'Papi',questions,papi};}
   else if(op==='dm_duel_live_accept')d={ok:true,id:'d-inv',kind:'live',status:'matched',side:'guest',vsPapi:false,opponent:'Ece',opponentLevel:22,questions};
   else if(op==='dm_duel_finish')d={ok:true,status:'finished',outcome:'win',me:{hp:46,xp:300,gold:50,correct:6,damage:132,ms:9000},them:{hp:0,xp:0,gold:0},yo:null};
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
 await page.waitForSelector('.fr-dz-free');
 assert.match(await page.textContent('.fr-dz-free'),/1 ücretsiz hak/);
 assert.equal(await page.locator('text=/çevrimiçi/i').count(),0,'çevrimiçi sayısı görünmemeli');
 const card=await page.$('.fr-duel-card');
 await card.screenshot({path:out+'/card-390.png'});
 await page.screenshot({path:out+'/friends-390.png'});
 await page.setViewportSize({width:360,height:780});await page.waitForTimeout(200);
 await (await page.$('.fr-duel-card')).screenshot({path:out+'/card-360.png'});
 const box=await (await page.$('.fr-duel-card')).boundingBox();assert(box.width<=360,'kart taşmamalı');
 await page.setViewportSize({width:390,height:844});

 // Papi'ye Karşı: VS → savaş → sonuç
 await page.click('[data-friend-action="papi-duel"]');
 await page.waitForSelector('.ld-vs');await page.screenshot({path:out+'/vs.png'});
 await page.waitForSelector('.ld-battle',{timeout:6000});
 await page.waitForTimeout(400);await page.screenshot({path:out+'/battle-q1.png'});
 for(let i=0;i<6;i++){
  await page.waitForFunction(n=>document.querySelector('[data-round]')?.textContent==='Tur '+n+'/6'&&document.querySelector('.ld-opt-btn:not(:disabled)'),i+1);
  if(i===3||i===5){await page.waitForTimeout(150);await page.screenshot({path:out+'/battle-q'+(i+1)+'.png'});}
  await page.click('.ld-opt-btn[data-i="'+questions[i].a+'"]');
  if(i===0){await page.waitForTimeout(250);await page.screenshot({path:out+'/battle-hit.png'});}
 }
 await page.waitForSelector('.ld-result',{timeout:12000});
 await page.waitForTimeout(500);await page.screenshot({path:out+'/result.png'});
 assert.match(await page.textContent('.ld-title'),/ZAFER/);
 assert.match(await page.textContent('.ld-reward'),/\+300 XP/);
 const finishBody=await page.evaluate(()=>1);
 await page.click('.ld-result [data-close]');
 assert.equal(await page.locator('.ld-layer').count(),0);

 // Hak bitti paneli
 papiMode='paywall';
 await page.click('[data-friend-action="papi-duel"]');
 await page.waitForSelector('.ld-sheet');await page.waitForTimeout(350);await page.screenshot({path:out+'/paywall.png'});
 assert.match(await page.textContent('.ld-sheet'),/Reklam izle/);assert.match(await page.textContent('.ld-sheet'),/Premium Pro/);
 await page.click('.ld-sheet [data-close]');

 // Canlı Düello: arama → davet yayını → 15 sn sonra Papi
 await page.click('[data-friend-action="live-duel"]');
 await page.waitForSelector('.ld-search');await page.waitForTimeout(300);await page.screenshot({path:out+'/search.png'});
 await page.waitForFunction(()=>window.__sent.some(m=>m.event==='seek'));
 const seek=await page.evaluate(()=>window.__sent.find(m=>m.event==='seek'));
 assert.equal(seek.payload.id,'d-live');assert.equal(seek.payload.name,'Fixture');
 await page.waitForSelector('.ld-vs',{timeout:12000});
 assert.match(await page.textContent('.ld-vs .ld-kicker'),/PAPİ SENİNLE KAPIŞIYOR/);
 assert(await page.evaluate(()=>window.__sent.some(m=>m.event==='taken')));
 await page.screenshot({path:out+'/vs-papi-fallback.png'});
 await page.waitForSelector('.ld-battle',{timeout:6000});
 await page.click('[data-quit]');await page.waitForSelector('.ld-confirm');await page.screenshot({path:out+'/quit-confirm.png'});
 await page.click('.ld-confirm [data-leave]');
 await page.waitForSelector('.ld-result',{timeout:12000});await page.click('.ld-result [data-close]');

 // Gelen davet bildirimi (başka oyuncu)
 await page.evaluate(()=>window.__handlers['dm-duel-lobby:seek']?.({payload:{id:'d-inv',name:'Ece',level:22,at:Date.now()}}));
 await page.waitForSelector('.ld-invite.ld-in');await page.waitForTimeout(350);await page.screenshot({path:out+'/invite.png'});
 await page.click('.ld-invite-yes');
 await page.waitForSelector('.ld-vs');assert.match(await page.textContent('.ld-vs'),/Ece/);
 await page.waitForSelector('.ld-battle',{timeout:6000});
 await page.click('.ld-opt-btn[data-i="0"]');
 await page.waitForFunction(()=>window.__sent.some(m=>m.name==='dm-duel-d-inv'&&m.event==='ans'));
 // Rakipten cevap gelince canım azalır
 await page.evaluate(()=>window.__handlers['dm-duel-d-inv:ans']?.({payload:{side:'host',i:0,ok:true,ms:2000}}));
 await page.waitForFunction(()=>/8\d can/.test(document.querySelector('[data-myn]')?.textContent||''));
 await page.screenshot({path:out+'/battle-live.png'});

 assert.deepEqual(errors,[],'sayfa hatası olmamalı: '+errors.join(' | '));
 console.log('PASS kart (390/360), Papi düellosu, sonuç, hak bitti paneli, canlı arama + Papi geçişi, çıkış onayı, davet bildirimi ve anlık hasar. RPC:',[...new Set(rpcCalls)].join(','));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
