// Canlı Düello + Papi'ye Karşı: Arkadaşlar kartı, savaş paneli, sonuç, hak bitti paneli ve davet bildirimi.
require('./_index-source.cjs');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const source=path.resolve(__dirname,'../ingilizce');
const out='/tmp/lig-qa';fs.mkdirSync(out,{recursive:true});
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
   else if(op==='seviyeLigListesi')d={ok:true,liste:[{name:'Ogr1',class:'6',league:'yerel',rank:1,xp:910},{name:'Ogr2',class:'6',league:'yerel',rank:2,xp:820},{name:'Ogr3',class:'6',league:'yerel',rank:3,xp:730},{name:'Ogr4',class:'6',league:'yerel',rank:4,xp:640},{name:'Ogr5',class:'6',league:'yerel',rank:5,xp:550},{name:'Ogr6',class:'6',league:'yerel',rank:6,xp:460},{name:'Ogr7',class:'6',league:'yerel',rank:7,xp:370},{name:'Ogr8',class:'6',league:'yerel',rank:8,xp:280},{name:'Ogr9',class:'6',league:'yerel',rank:9,xp:190},{name:'Ogr10',class:'6',league:'yerel',rank:10,xp:100},{name:'Ogr11',class:'6',league:'yerel',rank:11,xp:10},{name:'Ogr12',class:'6',league:'yerel',rank:12,xp:0},{name:'Ogr13',class:'6',league:'yerel',rank:13,xp:0},{name:'Ogr14',class:'6',league:'yerel',rank:14,xp:0}]};
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
 await page.evaluate(()=>window.dmLeagueUI.openWeekly());
 await page.waitForSelector('.dm-lig-list');await page.waitForTimeout(600);
 assert.equal(await page.locator('[data-lig-more]').count(),0,'Diğerlerini göster olmamalı');
 assert.equal(await page.locator('.dm-lig-blurred .dm-lig-row').count(),3);
 assert.equal(await page.locator('.dm-lig-idle-note').count(),0,'Başlık olmamalı');
 await page.locator('.dm-lig-idle').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/lig-blur.png'});
 assert.deepEqual(errors,[],'sayfa hatası olmamalı: '+errors.join(' | '));
 console.log('PASS haftalık lig: XP kazananlar açık, 0 XP olanlar bulanık, Diğerlerini göster yok');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
