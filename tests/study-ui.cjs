const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const source=path.resolve(__dirname,'../ingilizce');
const artifacts=process.env.STUDY_ARTIFACT_DIR||path.join(require('os').tmpdir(),'dijimedu-study-preview');fs.mkdirSync(artifacts,{recursive:true});
const fixtureName='Fixture';
const topics=[{seviye:'A1',kategori:'comm',konuAdi:'Selamlaşma',siraNo:1,durum:'tamamlandi'},{seviye:'A1',kategori:'vocab',konuAdi:'Ben ve Ailem',siraNo:1,durum:'tamamlandi'},{seviye:'A1',kategori:'grammar',konuAdi:'Günlük Rutinler',siraNo:1,durum:'yeni'},{seviye:'A1',kategori:'grammar',konuAdi:'Saatler',siraNo:2,durum:'yeni'},{seviye:'A1',kategori:'pron',konuAdi:'Sesleri Tanı',siraNo:1,durum:'basarisiz'}];
const detail={anlatimHTML:'<h3>Simple Present</h3><p>Alışkanlıklarımızı anlatırken kullanırız.</p><blockquote><b>I / You / We / They + fiil</b></blockquote><p>I <b>wake up</b> at seven.</p><blockquote><b>He / She / It + fiil + s</b></blockquote><p>She goes to school.</p>',kelimeSozlugu:JSON.stringify({'wake up':{tr:'uyanmak'},goes:{tr:'gider'}}),ornekler:JSON.stringify([{en:'I wake up at seven.',tr:'Saat yedide uyanırım.'},{en:'She goes to school.',tr:'O, okula gider.'},{en:'We have breakfast.',tr:'Kahvaltı yaparız.'},{en:'I brush my teeth.',tr:'Dişlerimi fırçalarım.'}]),testJSON:JSON.stringify([{soru:'She ___ to school every day.',secenekler:['go','goes','going','went'],dogru:1,aciklama:'He / She / It ile fiile -s eklenir.'},{tip:'siralama',soru:'Cümleyi kur',parcalar:['I','wake','up'],cevap:'I wake up',aciklama:'Harika!'}])};
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
      if(op==='dersKonulariGetir')d=topics;
      else if(op==='dersKonuDetayGetir')d=detail;
      else if(op==='dersTestSonucKaydet'){writes.push(body);d={ok:true};}
      else if(op==='seviyeDurumu')d={ok:true,level:30,feed:true,lessons:{},chests:{}};
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

  await page.evaluate(()=>{window.dmGuestMode=false;dersCalisTamEkranAc();});
  await page.waitForTimeout(500);
  const navBefore=await page.locator('#bottomNavMobile').innerHTML();
  await page.evaluate(()=>dcSeviyeSec('A1','Başlangıç'));
  await page.waitForSelector('.su-topic');
  assert.equal(await page.locator('.su-topic').count(),5);
  await page.locator('[data-su="filter"][data-value="done"]').click();assert.equal(await page.locator('.su-topic').count(),2);
  await page.locator('[data-su="filter"][data-value="all"]').click();
  await page.locator('[data-su-focus="search"]').fill('Saat');assert.equal(await page.locator('.su-topic').count(),1);await page.locator('[data-su-focus="search"]').fill('');
  for(const [w,h] of [[320,667],[390,844],[768,1024],[1180,820]]){
    await page.setViewportSize({width:w,height:h});await page.waitForTimeout(150);
    assert(await page.locator('#tab-derscalis').evaluate(e=>e.scrollWidth<=innerWidth),'Topic list overflow '+w);
    assert(await page.locator('.su-resume').isVisible());console.log('PASS topics layout '+w+'x'+h);
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(artifacts,'study-topics-mobile.png')});
  await page.locator('[data-topic="A1|grammar|Günlük Rutinler"]').last().click();
  await page.waitForSelector('#suLessonHero');await page.waitForTimeout(300);
  assert(await page.locator('#dcAnlatimIcerik').isVisible());
  await page.locator('[data-tab="ornek"]').click({force:true});assert(await page.locator('#dcTab-anlatim').isVisible(),'reading gate preserved');
  await page.locator('.dc-word').first().click();assert(await page.locator('#dcHoverBalon').isVisible());assert((await page.locator('#dcHoverBalon').innerText()).includes('uyanmak'));await page.keyboard.press('Escape');
  await page.screenshot({path:path.join(artifacts,'study-anlatim-mobile.png')});
  // Advance the existing reading timer rather than bypass the confirmation handler.
  await page.evaluate(()=>{dcAnlatimBaslangicZamani=Date.now()-31000;});await page.waitForTimeout(400);
  await page.locator('#dcOkudumBtn').click();assert(await page.locator('#dcTab-ornek').isVisible());
  assert(await page.locator('#suExampleNext').isDisabled());
  await page.evaluate(()=>{window.speechLog=[];window.speechSynthesis.speak=u=>speechLog.push({rate:u.rate,lang:u.lang,text:u.text});});
  await page.locator('.su-slow').first().click();assert(Math.abs(await page.evaluate(()=>speechLog.at(-1).rate)-.45)<.001);
  for(let i=1;i<4;i++)await page.locator('#dcExPlay'+i).click();
  assert(await page.locator('#suExampleNext').isEnabled());assert.equal(await page.locator('.su-listened').count(),4);
  await page.waitForTimeout(250);await page.evaluate(()=>document.getElementById('tab-derscalis').scrollTop=0);await page.screenshot({path:path.join(artifacts,'study-ornek-mobile.png')});
  await page.evaluate(()=>dcGeriGit());await page.locator('[data-topic="A1|grammar|Günlük Rutinler"]').last().click();await page.waitForTimeout(300);assert(await page.locator('#dcTab-ornek').isVisible(),'same-content resume restores stage');assert.equal(await page.locator('.su-listened').count(),4,'resume restores listening');
  await page.locator('#suExampleNext').click();
  assert.equal(await page.locator('.dc-quiz-q:visible').count(),1);assert(await page.locator('#suQuizNext').isDisabled());
  await page.locator('.dc-quiz-q:visible .dc-quiz-opt').filter({hasText:/^goes$/}).click();assert(await page.locator('#suQuizNext').isEnabled());assert(await page.locator('.su-feedback-title').isVisible());
  await page.waitForTimeout(1200);await page.screenshot({path:path.join(artifacts,'study-test-mobile.png')});
  await page.locator('#suQuizNext').click();assert((await page.locator('#suQuizProgress').innerText()).includes('2 / 2'));
  for(const word of ['I','wake','up'])await page.locator('.dc-quiz-q:visible .dt-kelime').filter({hasText:new RegExp('^'+word+'$')}).click();

  assert(await page.locator('#suQuizNext').isEnabled());
  await page.evaluate(()=>{window.genelSonucEkraniGoster=d=>{window.studyResult=d;};});
  await page.locator('#suQuizNext').click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>dcAktifKonuTamamlanmisMi),true);assert(await page.evaluate(()=>studyResult.dogru===2));
  assert(writes.some(x=>x.islem==='dersTestSonucKaydet'&&x.konuAdi==='Günlük Rutinler'));
  if(await page.locator('.dv-macera-sonra').count())await page.locator('.dv-macera-sonra').click();
  await page.evaluate(()=>dcTestSonrasiKonuListesineDon());assert(await page.locator('#suTopics').isVisible());
  assert.equal(await page.locator('#bottomNavMobile').innerHTML(),navBefore,'bottom nav unchanged');
  // Wrong answers keep the existing restart rule and cannot advance.
  await page.locator('[data-topic="A1|grammar|Saatler"]').last().click();await page.waitForTimeout(250);
  await page.evaluate(()=>{dcAnlatimOnaylandiMi=true;dcOrnekDinlenenSet=new Set([0,1,2,3]);dcSekmeSec('test',document.querySelector('[data-tab="test"]'));});
  await page.locator('.dc-quiz-q:visible .dc-quiz-opt').filter({hasText:/^went$/}).click();assert(await page.locator('#suQuizNext').isDisabled());await page.waitForTimeout(2100);assert((await page.locator('#suQuizProgress').innerText()).includes('1 / 2'));
  for(const [w,h] of [[320,667],[390,844],[768,1024],[1180,820]]){
    await page.setViewportSize({width:w,height:h});assert(await page.locator('#tab-derscalis').evaluate(e=>e.scrollWidth<=innerWidth),'Detail overflow '+w);
    await page.evaluate(()=>{const e=document.getElementById('tab-derscalis');e.scrollTop=e.scrollHeight;});
    const b=await page.locator('#suQuizNext').boundingBox(),dock=await page.locator('#bottomNavMobile').boundingBox();assert(b.y+b.height<=dock.y+1,'Footer above dock '+w);console.log('PASS detail layout '+w+'x'+h);
  }
  assert.deepEqual(errors.filter(x=>!x.includes('Chart')&&!x.includes('pdf')),[]);
  console.log('PASS study filters/search, real topic loading, reading/listening gates, slow voice, dictionary, single-question test, ordering, completion, wrong-answer restart and preserved dock');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
