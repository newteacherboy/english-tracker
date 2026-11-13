require('./_index-source.cjs');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const source=path.resolve(__dirname,'../ingilizce');
const fixtureName='Fixture';
const people=['Fixture','Elif','Ege','Zeynep','Cemre','Deniz'].map((ogrenci,i)=>({ogrenci,sinif:'6',Sinif:'6',durum:'approved',karakter:{cins:i%2?'k':'e',s:{}},totalXp:12000,genelOrtalama:70,rozetListesi:[{emoji:'⭐',rozetAdi:'Yıldız',gerekliPuan:0}],lig:{hafta:'fixture',xp:[938,3034,1162,1140,951][i]}}));
const league=people.map((p,i)=>({name:p.ogrenci,class:'6',league:'yerel',rank:[5,1,2,3,4][i],xp:p.lig.xp}));
const lesson='A2 · Present perfect vs past simple (basic) — Present perfect ders konusunu tamamladı!';
const feed=['Elif','Ege','Zeynep','Cemre','Fixture'].map((ogr,i)=>({k:'event'+i,ogr,ad:ogr,t:Date.now()-i*60000,metin:[
 'Haftalık görevini tamamladı! 75 altın kazandı.',
 'Okul Yolum 7. sınıf parkurunu bitirdi, 8. sınıfa geçti!',
 'Süper Lig seviyesine yükseldi!',
 'Okul Yolum 6. sınıfta 15 durağı tamamladı! Yeni rozet yolunda!',
 'Günün 3 görevini tamamladı ve ödülünü aldı!'
 ][i],ikon:'🏆',tur:'arti',b:i,tb:0}));
(async()=>{
  let launch={args:['--no-sandbox']};
  if(process.env.FRIENDS_BROWSER_PATH)launch={executablePath:process.env.FRIENDS_BROWSER_PATH,args:['--no-sandbox','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],env:{...process.env,LD_LIBRARY_PATH:path.dirname(process.env.FRIENDS_BROWSER_PATH)}};
  if(process.env.FRIENDS_CHROMIUM){const pkg=require(process.env.FRIENDS_CHROMIUM),c=pkg.default||pkg;launch={executablePath:await c.executablePath(),args:c.args,headless:true};}
  const browser=await chromium.launch(launch),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],writes=[];
  page.setDefaultTimeout(8000);
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  await page.route('**/*',async r=>{
    const u=new URL(r.request().url());let body={};try{body=r.request().postDataJSON()||{};}catch{}
    const op=body.islem||u.searchParams.get('islem');
    if(op){let d={ok:true};
      if(op==='seviyeDurumu')d={ok:true,level:30,feed:true,lessons:{},chests:{}};
      else if(op==='seviyeLigListesi')d={ok:true,liste:league};
      else if(op==='sosyalOgrencilerGetir')d=people;
      else if(op==='kullaniciBilgiKarti')d={ok:true,name:body.kullanici,level:18,streak:12,league:'super',character:{cins:'k',s:{}}};
      else if(op==='aksesuarKatalog')d={ok:true,liste:[]};
      else if(op==='akisTumu')d={liste:feed};
      else if(op==='akisOlaylariGetir')d={takip:['Elif','Ege','Zeynep','Cemre'],begeni:[],tebrik:[]};
      else if(op==='aktifDurum'||op==='takipDavetListesi')d={ok:true,serverNow:new Date().toISOString(),liste:['Elif','Ege','Zeynep','Cemre'].map(ad=>({ad,online:ad!=='Zeynep',seenAt:new Date().toISOString()}))};
      else if(op==='duellolarim')d={ok:true,liste:[{id:'duel-1',gonderen:'Ege',alici:fixtureName,oyun:'Kelime_Liderlik',durum:'bekliyor'}]};
      else if(op==='sosyalDurum')d={ok:true,blocked:false,mine:false};
      else if(op==='safetyStatus')d={ok:true,socialAllowed:true,noticeSeen:true};
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
  await page.goto('https://friends.test/ingilizce/?giris=1',{waitUntil:'load'});
  await page.evaluate(()=>{
    aktifOgrenciAdi='Fixture';globalDataCache=[{ogrenci:'Fixture',Sinif:'6',Durum:'approved'}];
    yo=yoVarsayilan();yo.totalXp=60000;yo.karakter={cins:'e',s:{}};yo.dmPapiIntro={disabled:true,shown:2,automatic:true,rolloutSeen:true};yo.turlar=['ana','v2:ana','papi:v3'];localStorage.setItem('ing_girisSerisiSayisi','5');yo.lig={hafta:yoHaftaKodu(),xp:938};yo.dmParkurMigration={version:1};yoIsim='Fixture';
    localStorage.setItem('ing_token','fixture-token');window.yoHazirMi=()=>true;window.yoSunucuyaGonder=()=>{};
    window.dmPapiNotices={blocked:()=>true,defer:()=>true};
    window.reportedToasts=[];window.yoToast=m=>reportedToasts.push(m);
    window.dmFeatureEnabled=()=>true;
    window.genelEnerjiKalan=30;window.dmPreviewFixtures=true;
    document.getElementById('panel-alani').style.display='block';
    document.getElementById('login-container').style.display='none';
  });
  await page.evaluate(()=>dmProgression.refresh(true));
  await page.evaluate(()=>meduAkisAc());await page.waitForSelector('.fr-leader-1');
  fs.mkdirSync('/tmp/friends-dropdown-qa',{recursive:true});
  assert.equal(await page.locator('.fr-tile-people').count(),0,'old wide row removed');
  const toggle=page.locator('.fr-people-toggle');
  await toggle.waitFor();await page.waitForSelector('#zlBtn');
  const [a,b]=await Promise.all([toggle.boundingBox(),page.locator('#zlBtn').boundingBox()]);assert(a.x+a.width<=b.x,'friends icon left of bell');assert(a.width>=44&&a.height>=44);
  await page.screenshot({path:'/tmp/friends-dropdown-qa/closed.png'});
  for(const width of [320,390,768])for(const theme of ['day','night']){
    await page.setViewportSize({width,height:844});await page.evaluate(theme=>document.documentElement.dataset.dmTheme=theme,theme);
    await toggle.click();await page.waitForSelector('#frPeopleDropdown');
    assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('.fr-people-row').count(),4);
    assert.equal(await page.locator('.fr-people-count').textContent(),'4');
    const box=await page.locator('#frPeopleDropdown').boundingBox(),anchor=await toggle.boundingBox();
    assert(box.x>=0&&box.x+box.width<=width&&box.y>=anchor.y+anchor.height&&box.y+box.height<=844,'dropdown fits viewport and opens below anchor');
    assert(await page.locator('.fr-people-state.is-online').count()>0);
    await page.locator('.fr-people-search input').fill('zey');assert.equal(await page.locator('.fr-people-row').count(),1);assert.match(await page.locator('.fr-people-row').textContent(),/Zeynep/);
    await page.locator('.fr-people-search input').fill('no-match');assert.equal(await page.locator('.fr-people-row').count(),0);assert(await page.locator('.fr-people-empty').isVisible());
    await page.locator('.fr-people-search input').fill('');
    await page.screenshot({path:`/tmp/friends-dropdown-qa/${width}-${theme}.png`});
    await toggle.click();assert.equal(await page.locator('#frPeopleDropdown').count(),0,'icon toggles closed');
    await toggle.click();await page.keyboard.press('Escape');assert.equal(await page.locator('#frPeopleDropdown').count(),0);assert(await toggle.evaluate(e=>document.activeElement===e));
    await toggle.click();await page.locator('.fr-people-shade').click({position:{x:5,y:500}});assert.equal(await page.locator('#frPeopleDropdown').count(),0,'outside closes');
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.dataset.dmTheme='day');
  await toggle.click();await page.locator('.fr-people-add').click();assert.equal(await page.locator('#frPeopleTitle').textContent(),'Arkadaş ekle');
  await page.locator('.fr-people-search input').fill('Deniz');assert.equal(await page.locator('.fr-people-row').count(),1);await page.locator('.fr-people-add').click();assert.equal(await page.locator('.fr-people-row').count(),4);
  // Profile uses the current user card; the list closes before opening it.
  await page.locator('.fr-people-row[data-person="Elif"]').click();await page.waitForSelector('#dmUserCard .uc-character svg');assert.equal(await page.locator('#frPeopleDropdown').count(),0);assert.equal(await page.locator('#dmUserCard h2').textContent(),'Elif');await page.keyboard.press('Escape');
  await toggle.click();await page.evaluate(()=>document.getElementById('tab-meduakis').classList.remove('active'));await page.waitForFunction(()=>!document.querySelector('#frPeopleDropdown'));
  await page.evaluate(()=>{document.getElementById('tab-meduakis').classList.add('active');meduAkisAc()});await toggle.click();
  await page.evaluate(()=>{aktifOgrenciAdi='Other';document.dispatchEvent(new Event('dm:login'))});await page.waitForFunction(()=>!document.querySelector('#frPeopleDropdown'));
  assert.deepEqual(errors.filter(x=>!x.includes('Chart')&&!x.includes('pdf')),[]);
  console.log('PASS header position, no old row, anchored bounds at 320/390/768 px day/night, search, empty, add, profile, toggle, Escape, outside, navigation and account switch');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
