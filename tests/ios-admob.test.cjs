const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const {createRequire}=require('node:module');
const req=createRequire(require('node:path').join(__dirname,'ios-admob/package.json'));
const {PGlite}=req('@electric-sql/pglite');
const {JSDOM}=req('jsdom');
const source=fs.readFileSync('ingilizce/odullu-reklam.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20261030155841_ios_admob_rewards.sql','utf8');

test('web and iOS 1.0: absolutely no DOM, storage or network side effects',()=>{
 for(const Capacitor of [undefined,{isNativePlatform:()=>false,isPluginAvailable:()=>true},{isNativePlatform:()=>true,isPluginAvailable:()=>false}]){
  let touches=0;const context={window:{Capacitor}};
  for(const key of ['document','localStorage','fetch'])Object.defineProperty(context,key,{get(){touches++;throw Error(key);}});
  vm.runInNewContext(source,context);assert.equal(touches,0);assert.equal(context.window.DijiReklam,undefined);
 }
});

test('real SQL: energy cap, daily limits, 30 seconds, idempotency, Istanbul day, RLS',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table students(id uuid primary key,username text,status text,role text,frozen_at timestamptz,profile jsonb,energy int,gold numeric);
 create table extra_data(student_id uuid,key_name text,value jsonb,updated_at timestamptz,primary key(student_id,key_name));
 create table energy_transactions(student_id uuid,change_amount int,balance_after int,reason text);
 create table dm_progress_items(id text,minimum_level int,price int,owned_keys jsonb,style jsonb);
 grant all on all tables in schema public to service_role;`);
 await db.exec(migration);
 const id=randomUUID();
 await db.query(`insert into students values($1,'pupil','approved','student',null,'{}',23,0);`,[id]);
 await db.query(`insert into extra_data values($1,'yo','{"altin":0}',now())`,[id]);
 const call=async(kind,request=randomUUID(),product=null)=> (await db.query(`select dm_ios_ad_reward($1,true,$2,$3,$4) as r`,[id,kind,request,product])).rows[0].r;
 const age=()=>db.query(`update dm_ios_ads.rewards set created_at=now()-interval '31 seconds' where student_id=$1`,[id]);
 const key=randomUUID(),r=await call('enerji',key);
 assert.equal(r.eklenen,2);assert.equal(r.enerjiKalan,25);assert.equal(r.kalan.enerji,4);
 assert.equal((await call('enerji',key)).duplicate,true);
 await assert.rejects(call('altin'),/30 saniye/);
 await age();
 const g=await call('altin');assert.equal(g.altin,100);assert.equal(g.kalan.altin,1);
 await age();await assert.rejects(call('altin'),/uygun değil/);
 const g2=await call('altin',randomUUID(),{tip:'enerji',id:'15',price:180});assert.equal(g2.altin,200);
 await age();await assert.rejects(call('altin',randomUUID(),{price:500}),/hakkın/);
 for(let n=1;n<5;n++){await age();await db.query('update students set energy=0 where id=$1',[id]);await call('enerji');}
 await age();await assert.rejects(call('enerji'),/hakkın/);
 const day=(await db.query(`select distinct reward_day=(now() at time zone 'Europe/Istanbul')::date as correct from dm_ios_ads.rewards`)).rows;
 assert.deepEqual(day,[{correct:true}]);
 await db.query(`update dm_ios_ads.rewards set reward_day=reward_day-1 where student_id=$1`,[id]);
 assert.equal((await call('enerji')).kalan.enerji,4);
 // Execute under actual unprivileged role; no direct claim or ledger write.
 await db.exec('set role authenticated');
 await assert.rejects(db.query('select dm_ios_ad_reward($1)',[id]),/permission denied/);
 await assert.rejects(db.query('select * from dm_ios_ads.rewards'),/permission denied/);
 await db.exec('reset role');
 await db.query(`update students set username='dijimedu_demo' where id=$1`,[id]);
 await assert.rejects(call('enerji'),/Öğrenci/);
 }finally{await db.close();}
});

function harness({name='student',teacher=false,reward=true,plugin=true}={}){
 const dom=new JSDOM('<html><head></head><body><div id="tab-aktiviteler" class="active"></div></body></html>',{url:'https://app.dijimedu.com/ingilizce/',runScripts:'outside-only'});
 const w=dom.window,events={},calls=[],notices=[];let shown=0;
 Object.defineProperty(w.document,'hidden',{value:false,configurable:true});
 w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{}];};
 w.aktifOgrenciAdi=name;w.yo={altin:0};w.dmTeacherPortalMode=teacher;w.apiURL='https://example.test';
 w.localStorage.setItem('ing_token','token');w.setInterval=()=>0;w.requestAnimationFrame=()=>0;
 w.DijiMeduPapiFeedback={notice:m=>notices.push(m)};
 w.headerEnerjiGoster=()=>{};w.dmApplyRewardState=()=>{};
 const A={
 addListener:async(e,f)=>{(events[e]??=new Set()).add(f);return {remove:async()=>events[e].delete(f)};},
 requestConsentInfo:async()=>({canRequestAds:true,status:'NOT_REQUIRED'}),
 initialize:async o=>calls.push(['init',o]),prepareRewardVideoAd:async o=>calls.push(['prepare',o]),
 showRewardVideoAd:async()=>{if(reward)events.onRewardedVideoAdReward?.forEach(f=>f());events.onRewardedVideoAdDismissed?.forEach(f=>f());},
 showBanner:async o=>calls.push(['banner',o]),removeBanner:async()=>calls.push(['removeBanner']),prepareInterstitial:async()=>{},
 showInterstitial:async()=>{shown++;events.interstitialAdShowed?.forEach(f=>f());events.interstitialAdDismissed?.forEach(f=>f());}
 };
 w.Capacitor={isNativePlatform:()=>true,isPluginAvailable:()=>plugin,getPlatform:()=> 'ios',Plugins:{AdMob:A}};
 w.fetch=async(u,o)=>{const b=JSON.parse(o.body);calls.push([b.islem,b]);return {ok:true,json:async()=>b.islem==='reklamHakki'?{ok:true,kalan:{enerji:5,altin:2},uygun:{enerji:true,altin:true}}:{ok:true,enerjiKalan:7,eklenen:7,yo:{altin:0}}};};
 w.AbortSignal.timeout=()=>undefined;
 w.eval(source);
 return {w,calls,notices,events,A,shown:()=>shown,close:()=>w.close()};
}
test('Rewarded is required; closing early gives no reward request; children flags and one initialize',async()=>{
 for(const reward of [true,false]){
  const h=harness({reward});try{
   await h.w.DijiReklam.odulluIzle('enerji');await h.w.DijiReklam.odulluIzle('enerji');
   assert.equal(h.calls.filter(c=>c[0]==='reklamOdulu').length,reward?2:0);
   assert.equal(h.calls.filter(c=>c[0]==='init').length,1);
   const cfg=h.calls.find(c=>c[0]==='init')[1];assert.equal(cfg.maxAdContentRating,'General');assert.equal(cfg.tagForChildDirectedTreatment,true);assert.equal(cfg.tagForUnderAgeOfConsent,true);
   assert(h.calls.filter(c=>c[0]==='prepare').every(c=>c[1].npa));
   assert(Object.values(h.events).every(s=>s.size===0||s===h.events.bannerAdSizeChanged||s===h.events.bannerAdFailedToLoad));
   if(!reward)assert(h.notices.includes('Ödül için videonun sonuna kadar izlemelisin.'));
  }finally{h.close();}
 }
});
test('teacher and demo never initialize, request rights or display ads',async()=>{
 for(const config of [{teacher:true},{name:'dijimedu_demo'},{name:'teacher'}]){
  const h=harness(config);try{await h.w.DijiReklam.odulluIzle('enerji');assert.equal(h.calls.length,0);assert.equal(h.w.document.querySelector('[data-ios-ad]'),null);}finally{h.close();}
 }
});
test('counter counts once on result close only; excludes opponents and parkur; three games, five minutes, four/session',async()=>{
 const h=harness();try{
  await new Promise(r=>setTimeout(r,20));
  const ad=h.w.DijiReklam;
  assert.equal(ad.sonucHazir({oyunKey:'ba',dogru:10}),null);
  ad.rakipliBasladi();assert.equal(ad.sonucHazir({oyunKey:'ky',dogru:10}),null);
  // Explicitly let the hub resync via visibility change.
  const solo=h.w.document.createElement('button');solo.dataset.ggCategory='solo';h.w.document.body.append(solo);solo.click();h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));await new Promise(r=>setTimeout(r,20));
  for(let i=0;i<3;i++){const result=ad.sonucHazir({oyunKey:'konu',dogru:5,runId:'run'+i});assert(result);result.at-=3000;await ad.sonucKapandi(result,true);await ad.sonucKapandi(result,true);}
  assert.equal(h.shown(),1);
  for(let i=3;i<6;i++){const result=ad.sonucHazir({oyunKey:'mola',dogru:1,runId:'run'+i});result.at-=3000;await ad.sonucKapandi(result,true);}
  assert.equal(h.shown(),1);
  const saved=JSON.parse(h.w.localStorage.getItem('dm_ios_ads:student'));assert.equal(saved.games,3);
  // Advance the JS clock for additional eligible result closures.
  const original=h.w.Date.now;let offset=0;h.w.Date.now=()=>original()+offset;
  for(let round=0;round<5;round++){offset+=300001;for(let n=0;n<3;n++){await new Promise(r=>setTimeout(r,5));const r=ad.sonucHazir({oyunKey:'dikte',dogru:1,runId:'later'+round+'-'+n});r.at-=3000;await ad.sonucKapandi(r,true);}}
  assert.equal(h.shown(),4);
 }finally{h.close();}
});

test('banner only on lists/store; hidden for dialogs/game/result, failure releases spacing',async()=>{
 const h=harness();try{
  await new Promise(r=>setTimeout(r,20));
  assert(h.calls.some(c=>c[0]==='banner'));
  const game=h.w.document.createElement('section');game.className='game-modal-overlay';h.w.document.body.append(game);
  h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));await new Promise(r=>setTimeout(r,20));
  assert(h.calls.some(c=>c[0]==='removeBanner'));assert(!h.w.document.documentElement.classList.contains('dm-ios-banner'));
  game.remove();h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));await new Promise(r=>setTimeout(r,20));
  h.events.bannerAdSizeChanged.forEach(f=>f({height:90}));assert.equal(h.w.document.documentElement.style.getPropertyValue('--dm-ios-ad-height'),'90px');
  h.events.bannerAdFailedToLoad.forEach(f=>f());await new Promise(r=>setTimeout(r,20));
  assert(!h.w.document.documentElement.classList.contains('dm-ios-banner'));
  h.w.document.getElementById('tab-aktiviteler').classList.remove('active');
  h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));await new Promise(r=>setTimeout(r,20));
  assert(!h.w.document.documentElement.classList.contains('dm-ios-banner'));
 }finally{h.close();}
});
test('Edge rejects teachers, demo, GET, invalid kind; resolves price independently of caller',async()=>{
 const {iosAdRewards}=await import('../supabase/functions/diji-api/ios-ad-rewards.mjs');
 let received;const handler=iosAdRewards({db:{rpc:async(n,p)=>{received=p;return {data:{ok:true}};}},json:(data,status=200)=>({data,status}),isDemo:a=>a.demo,jokers:{test:['x',1,30]},characters:{Papi:2},items:[],catalog:{itemGender:()=>''}});
 const student={role:'student',student_id:randomUUID()};
 for(const a of [{role:'teacher'},{...student,teacher_portal_access_id:'x'},{...student,demo:true}])assert.equal((await handler.handle('reklamHakki',{},a,'POST')).status,403);
 assert.equal((await handler.handle('reklamHakki',{},student,'GET')).status,405);
 assert.equal((await handler.handle('reklamOdulu',{tur:'xxx'},student,'POST')).status,400);
 await handler.handle('reklamHakki',{urun:{tip:'joker',id:'test',price:999999}},student,'POST');assert.equal(received.p_product.price,30);
 assert.equal((await handler.handle('reklamHakki',{urun:{tip:'joker',id:'missing',price:999999}},student,'POST')).status,400);
});
test('Google SKAdNetwork list is a unique plist array; no ATT key/call; plugin compatibility is pinned',()=>{
 const plist=fs.readFileSync('ios-app/izinler.sh','utf8');
 const list=JSON.parse(plist.match(/-replace SKAdNetworkItems -json '([\s\S]*?)' "\$PLIST"/)[1]);
 assert.equal(list.length,50);assert.equal(new Set(list.map(x=>x.SKAdNetworkIdentifier)).size,50);
 assert(list.every(x=>/^[a-z0-9]+\.skadnetwork$/.test(x.SKAdNetworkIdentifier)));
 assert(!plist.includes('NSUserTrackingUsageDescription'));assert(!source.includes('requestTrackingAuthorization'));
 assert(fs.readFileSync('ios-app/kur-ios.sh','utf8').includes('@capacitor-community/admob@8.3.0'));
});
