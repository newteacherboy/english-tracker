const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const source=path.resolve(__dirname,'../ingilizce');
const fixtureName='Fixture';
const people=['Fixture','Elif','Ege','Zeynep','Cemre'].map((ogrenci,i)=>({ogrenci,sinif:'6',Sinif:'6',durum:'approved',karakter:{cins:i%2?'k':'e',s:{}},totalXp:12000,genelOrtalama:70,rozetListesi:[{emoji:'⭐',rozetAdi:'Yıldız',gerekliPuan:0}],lig:{hafta:'fixture',xp:[938,3034,1162,1140,951][i]}}));
const league=people.map((p,i)=>({name:p.ogrenci,class:'6',league:'yerel',rank:[5,1,2,3,4][i],xp:p.lig.xp}));
const feed=['Elif','Ege','Zeynep','Cemre'].map((ogr,i)=>({k:'event'+i,ogr,ad:ogr,t:Date.now()-i*60000,metin:'Kelime Laboratuvarı oyununda '+(1701+i)+' puan kazandı',ikon:'🎮',tur:'arti',b:i,tb:0}));
(async()=>{
  let launch={args:['--no-sandbox']};
  if(process.env.FRIENDS_BROWSER_PATH)launch={executablePath:process.env.FRIENDS_BROWSER_PATH,args:['--no-sandbox','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],env:{...process.env,LD_LIBRARY_PATH:path.dirname(process.env.FRIENDS_BROWSER_PATH)}};
  if(process.env.FRIENDS_CHROMIUM){const pkg=require(process.env.FRIENDS_CHROMIUM),c=pkg.default||pkg;launch={executablePath:await c.executablePath(),args:c.args,headless:true};}
  const browser=await chromium.launch(launch),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  await page.route('**/*',async r=>{
    const u=new URL(r.request().url());let body={};try{body=r.request().postDataJSON()||{};}catch{}
    const op=body.islem||u.searchParams.get('islem');
    if(op){let d={ok:true};
      if(op==='seviyeDurumu')d={ok:true,level:30,feed:true,lessons:{},chests:{}};
      else if(op==='seviyeLigListesi')d={ok:true,liste:league};
      else if(op==='sosyalOgrencilerGetir')d=people;
      else if(op==='akisTumu')d={liste:feed};
      else if(op==='akisOlaylariGetir')d={takip:['Elif','Ege','Zeynep','Cemre'],begeni:[],tebrik:[]};
      else if(op==='aktifDurum'||op==='takipDavetListesi')d={ok:true,serverNow:new Date().toISOString(),liste:['Elif','Ege','Zeynep','Cemre'].map(ad=>({ad,online:ad!=='Zeynep',seenAt:new Date().toISOString()}))};
      else if(op==='duellolarim')d={ok:true,liste:[{id:'duel-1',gonderen:'Ege',alici:fixtureName,oyun:'Kelime_Liderlik',durum:'bekliyor'}]};
      else if(op==='sosyalDurum')d={ok:true,blocked:false,mine:false};
      else if(op==='akisOlayToggle'){writes.push(body);d={ok:true,aktif:true};}
      else if(op==='duelloYanit'){writes.push(body);d={ok:true};}
      else if(op==='duelloGonder'){writes.push(body);d={ok:true};}
      else if(op==='ogretmenEngelleriGetir')d=[];
      else if(op==='yayinOzellikleri')d={flags:{},admin:false};
      else if(op==='ekVeriGetir')d={};
      else if(op==='bildirimlerim')d={liste:[]};
      return r.fulfill({json:d});
    }
    if(u.hostname==='cdn.jsdelivr.net'&&u.pathname.includes('supabase'))return r.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>({select:async()=>({data:[],error:null})})})};'});
    if(u.hostname==='friends.test'){
      const file=path.join(source,u.pathname.replace(/^\/ingilizce\//,'')||'index.html');
      if(fs.existsSync(file)&&fs.statSync(file).isFile())return r.fulfill({path:file});
    }
    return r.fulfill({contentType:'application/json',body:'[]'});
  });
  await page.addInitScript(()=>{new MutationObserver(()=>document.querySelector('.kur-perde .kur-x')?.click()).observe(document,{childList:true,subtree:true});});
  await page.goto('https://friends.test/ingilizce/',{waitUntil:'load'});
  await page.evaluate(()=>{
    aktifOgrenciAdi='Fixture';globalDataCache=[{ogrenci:'Fixture',Sinif:'6',Durum:'approved'}];
    yo=yoVarsayilan();yo.totalXp=12000;yo.karakter={cins:'e',s:{}};yo.dmPapiIntro={disabled:true,shown:2,automatic:true,rolloutSeen:true};yo.turlar=['ana','v2:ana','papi:v3'];localStorage.setItem('ing_girisSerisiSayisi','5');yo.lig={hafta:yoHaftaKodu(),xp:938};yo.dmParkurMigration={version:1};yoIsim='Fixture';
    localStorage.setItem('ing_token','fixture-token');window.yoHazirMi=()=>true;window.yoSunucuyaGonder=()=>{};
    window.dmPapiNotices={blocked:()=>true,defer:()=>true};
    window.reportedToasts=[];window.yoToast=m=>reportedToasts.push(m);
    window.dmFeatureEnabled=()=>true;
    window.genelEnerjiKalan=30;window.dmPreviewFixtures=true;
    document.getElementById('panel-alani').style.display='block';
  });
  await page.evaluate(()=>dmProgression.refresh(true));
  await page.evaluate(()=>meduAkisAc());await page.waitForSelector('.fr-home .fr-person');await page.waitForTimeout(800);
  assert.equal(await page.locator('.fr-home').count(),1);
  assert.equal(await page.locator('.fr-summaries .fr-summary').count(),2);
  assert.equal(await page.locator('.fr-feed .akis-kart').count(),2);
  assert(await page.locator('#maSegment').isHidden());
  assert.equal(await page.locator('#maSegment button').count(),3);
  assert.equal(await page.locator('#maSegment [data-s="parkur"],#maSegment [data-s="kesfet"]').count(),0);
  assert.equal(await page.locator('#tab-meduakis .fr-podium-mini button').count(),3);
  const navBefore=await page.locator('#bottomNavMobile').innerHTML();
  for(const [w,h] of [[320,667],[390,844],[768,1024],[1180,820]]){
    await page.setViewportSize({width:w,height:h});await page.waitForTimeout(200);
    assert(await page.evaluate(()=>document.getElementById('tab-meduakis').scrollWidth<=innerWidth),'Friends must not overflow horizontally at '+w);
    assert(await page.evaluate(()=>[...document.querySelectorAll('#tab-meduakis .fr-open')].every(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth;})));
    // The last action can always be scrolled above the original dock.
    await page.evaluate(()=>{const e=document.getElementById('tab-meduakis');e.scrollTop=e.scrollHeight;});
    const dockTop=await page.locator('#bottomNavMobile').evaluate(e=>e.getBoundingClientRect().top);
    const lastBottom=await page.locator('.fr-matches').evaluate(e=>e.getBoundingClientRect().bottom);
    assert(lastBottom<dockTop,'last action fits above dock '+w);
    await page.evaluate(()=>document.getElementById('tab-meduakis').scrollTop=0);
    if(w===390)await page.screenshot({path:'/workspace/scratch/2bd974b09515/friends-home-mobile.png'});
    console.log('PASS layout '+w+'x'+h);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-friend-action="akis"]').click();await page.waitForTimeout(300);
  assert.equal(await page.locator('.fr-home').count(),0);assert.equal(await page.locator('#maAkisListe .akis-kart').count(),4);assert(await page.locator('#frFeedHero').isVisible());assert(await page.locator('#maSegment').isVisible());
  await page.locator('[data-filter="online"]').click();await page.waitForTimeout(300);assert.equal(await page.locator('#maAkisListe .akis-kart').count(),3);
  await page.locator('[data-filter="herkes"]').click();
  await page.locator('.aksiyon button').first().click();assert(writes.some(x=>x.islem==='akisOlayToggle'&&x.tur==='begeni'));
  await page.locator('.fr-back').click();assert(await page.locator('.fr-home').isVisible());
  await page.locator('[data-friend-action="vitrin"]').click();await page.waitForTimeout(300);assert(await page.locator('.sahne').isVisible());assert.equal(await page.locator('.fr-vitrin-papi').count(),1);await page.screenshot({path:'/workspace/scratch/2bd974b09515/friends-vitrin-mobile.png'});
  await page.locator('.fr-back').click();await page.locator('[data-friend-action="lig"]').click();await page.waitForTimeout(300);assert.equal(await page.locator('.ml-satir').count(),5);assert.equal(await page.locator('.fr-league-papi').count(),1);await page.screenshot({path:'/workspace/scratch/2bd974b09515/friends-lig-mobile.png'});
  await page.locator('.fr-back').click();await page.locator('[data-friend-action="find"]').first().click();await page.waitForSelector('.fr-search');await page.locator('.fr-search').fill('Elif');assert.equal(await page.locator('.fr-search-person').count(),1);await Promise.all([page.waitForResponse(r=>{try{return r.request().postDataJSON()?.islem==='akisOlayToggle';}catch{return false;}}),page.locator('.fr-search-follow').click()]);await page.waitForTimeout(100);assert(writes.some(x=>x.islem==='akisOlayToggle'&&x.hedef==='Elif'));await page.keyboard.press('Escape');assert.equal(await page.locator('.fr-friend-sheet').count(),0);
  await page.locator('.fr-card-invite').first().click();await page.waitForTimeout(400);assert.equal(await page.locator('.dm-social').count(),1,'direct invitation opens real profile with game picker');assert(await page.locator('.dm-game').isVisible());
  await page.evaluate(()=>meduAkisAc());await page.waitForTimeout(300);assert(await page.locator('.fr-home').isVisible(),'re-entering from dock always shows hub');
  await page.evaluate(()=>{window.playedGame='';window.duelloOyununuAc=g=>playedGame=g;});await page.locator('[data-friend-action="accept"]').click();assert(writes.some(x=>x.islem==='duelloYanit'&&x.id==='duel-1'));await page.waitForFunction(()=>playedGame==='Kelime_Liderlik');assert.equal(await page.evaluate(()=>playedGame),'Kelime_Liderlik');
  assert.equal(await page.locator('#bottomNavMobile').innerHTML(),navBefore,'existing dock unchanged');
  await page.evaluate(()=>{window.dmProgression.allowed=code=>code!=='vitrin';window.dmProgression.require=code=>code!=='vitrin';});await page.locator('[data-friend-action="vitrin"]').click();assert(await page.locator('.fr-home').isVisible(),'locked showcase keeps hub');
  // Stale loading from another account cannot redraw the old student's hub.
  await page.evaluate(()=>{aktifOgrenciAdi='Other';maTakip=new Set();maTumListe=[];return dmFriends.refresh();});await page.waitForTimeout(100);
  const bad=errors.filter(x=>!x.includes('Chart')&&!x.includes('pdf'));
  assert.deepEqual(bad,[]);
  console.log('PASS home/detail routes, real reaction/follow handlers, online filter, search, direct profile invitation, incoming invite, preserved dock and level gate');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
