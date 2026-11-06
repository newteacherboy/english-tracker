const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const source=path.resolve(__dirname,'../ingilizce');
const fixtureName='Fixture';
const people=['Fixture','Elif','Ege','Zeynep','Cemre'].map((ogrenci,i)=>({ogrenci,sinif:'6',Sinif:'6',durum:'approved',karakter:{cins:i%2?'k':'e',s:{}},totalXp:12000,genelOrtalama:70,rozetListesi:[{emoji:'⭐',rozetAdi:'Yıldız',gerekliPuan:0}],lig:{hafta:'fixture',xp:[938,3034,1162,1140,951][i]}}));
const league=people.map((p,i)=>({name:p.ogrenci,class:'6',league:'yerel',rank:[5,1,2,3,4][i],xp:p.lig.xp}));
const lesson='A2 · Present perfect vs past simple (basic) — Present perfect ders konusunu tamamladı!';
const feed=['Elif','Ege','Zeynep','Cemre','Fixture'].map((ogr,i)=>({k:'event'+i,ogr,ad:ogr,t:Date.now()-i*60000,metin:i===1?lesson:i===2?'Süper Lig seviyesine yükseldi!':'Kelime Laboratuvarı oyununda '+(1701+i)+' puan kazandı',ikon:'🎮',tur:'arti',b:i,tb:0}));
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
    yo=yoVarsayilan();yo.totalXp=12000;yo.karakter={cins:'e',s:{}};yo.dmPapiIntro={disabled:true,shown:2,automatic:true,rolloutSeen:true};yo.turlar=['ana','v2:ana','papi:v3'];localStorage.setItem('ing_girisSerisiSayisi','5');yo.lig={hafta:yoHaftaKodu(),xp:938};yo.dmParkurMigration={version:1};yoIsim='Fixture';
    localStorage.setItem('ing_token','fixture-token');window.yoHazirMi=()=>true;window.yoSunucuyaGonder=()=>{};
    window.dmPapiNotices={blocked:()=>true,defer:()=>true};
    window.reportedToasts=[];window.yoToast=m=>reportedToasts.push(m);
    window.dmFeatureEnabled=()=>true;
    window.genelEnerjiKalan=30;window.dmPreviewFixtures=true;
    document.getElementById('panel-alani').style.display='block';
    document.getElementById('login-container').style.display='none';
  });
  await page.evaluate(()=>dmProgression.refresh(true));
  const chromeBefore=await page.evaluate(()=>['viewport','theme-color'].map(name=>document.querySelector('meta[name="'+name+'"]').content));
  await page.evaluate(()=>meduAkisAc());await page.waitForSelector('.fr-home .fr-event');await page.waitForTimeout(800);
  assert.equal(await page.locator('.fr-home').count(),1);
  await page.waitForSelector('.fr-leader-3');
  assert.deepEqual(await page.locator('.fr-leader strong').allTextContents(),['Ege','Elif','Zeynep']);
  assert.deepEqual(await page.locator('.fr-leader-cup b').allTextContents(),['2','1','3']);
  const steps=await page.locator('.fr-podium-step').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top));
  assert(steps[1]<steps[0]&&steps[1]<steps[2],'the center winner has the highest step');
  assert.equal(await page.locator('.fr-leader-1 .fr-podium-crown').count(),1);
  assert.match(await page.locator('.fr-league-self').innerText(),/Sen · 5\. sıra · 938 XP/);
  assert.equal((await page.locator('.fr-feed h3').innerText()).trim(),'Medu Akış');
  assert.equal((await page.locator('.fr-all-feed').innerText()).trim(),'Tüm akışı gör');
  assert.equal(await page.locator('.fr-summaries .fr-tile').count(),1);
  assert.equal(await page.locator('.fr-feed .fr-event').count(),2);
  assert(await page.locator('#maSegment').isHidden());
  assert.equal(await page.locator('#maSegment button').count(),3);
  assert.equal(await page.locator('#maSegment [data-s="parkur"],#maSegment [data-s="kesfet"]').count(),0);
  assert.equal(await page.locator('.fr-compact input[type=search], .fr-compact [onclick*=maBegen]').count(),0);
  assert.deepEqual(await page.locator('.fr-event-person small').allTextContents(),['1.701 puan aldı.','A2 dersini bitirdi.']);
  assert.equal(await page.locator('.fr-event-person small').nth(1).getAttribute('title'),lesson);
  assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),'#e3f3ff');
  assert.doesNotMatch(await page.locator('meta[name="viewport"]').getAttribute('content'),/viewport-fit=cover/,'Friends keeps the same viewport mode as the other tabs');
  assert.equal(await page.locator('.fr-event-person .fr-avatar').evaluateAll(avatars=>new Set(avatars.map(avatar=>getComputedStyle(avatar).borderColor)).size),2);
  await page.evaluate(()=>{navigator.share=async payload=>{window.sharedInvite=payload.url;};});
  await page.locator('.fr-invite-cta').click();
  assert.equal(await page.evaluate(()=>window.sharedInvite),'https://app.dijimedu.com/ingilizce/');
  await page.waitForSelector('.fr-wallet-host .dm-unified-wallet');
  assert.deepEqual(await page.locator('.fr-wallet-host [data-pw]').evaluateAll(nodes=>nodes.map(node=>node.dataset.pw)),['energy','gold','xp','time']);
  assert.equal(await page.locator('.fr-wallet-host [data-pw="energy"] b').textContent(),'30');
  const theme=page.locator('.fr-wallet-host .dm-theme-toggle');
  await theme.click();
  assert.equal(await page.locator('html').getAttribute('data-dm-theme'),'night');
  assert.equal(await theme.getAttribute('aria-pressed'),'true');
  await page.screenshot({path:'/tmp/friends-home-night.png'});
  await theme.click();
  assert.equal(await page.locator('html').getAttribute('data-dm-theme'),'day');
  const navBefore=await page.locator('#bottomNavMobile').innerHTML();
  for(const [w,h,safe] of [[320,568,0],[320,667,34],[390,844,34],[768,1024,0],[1180,820,0]]){
    await page.setViewportSize({width:w,height:h});
    await page.evaluate(safe=>{
      document.body.style.setProperty('--bi-safe-bottom',safe+'px');
      document.documentElement.style.setProperty('--fr-safe-top',safe?'44px':'0px');
    },safe);
    await page.waitForTimeout(200);
    assert(await page.evaluate(()=>document.getElementById('tab-meduakis').scrollWidth<=innerWidth),'Friends must not overflow horizontally at '+w);
    await page.locator('.fr-all-feed').scrollIntoViewIfNeeded();
    const layout=await page.evaluate(()=>{
      const tab=document.getElementById('tab-meduakis');
      const dock=document.getElementById('bottomNavMobile').getBoundingClientRect();
      const button=document.querySelector('.fr-all-feed').getBoundingClientRect();
      const events=[...tab.querySelectorAll('.fr-event')];
      const rows=events.map(e=>e.getBoundingClientRect());
      const rowsFit=events.every((e,i)=>[...e.children].every(child=>{
        const r=child.getBoundingClientRect();return r.top>=rows[i].top-1&&r.bottom<=rows[i].bottom+1;
      }));
      const hit=document.elementFromPoint(button.left+button.width/2,button.top+button.height/2);
      const last=rows.at(-1);
      tab.scrollTop=10000;
      return {gap:dock.top-button.bottom,dockInset:innerHeight-dock.bottom,scroll:tab.scrollTop,rows:rows.length,last:last.bottom,buttonTop:button.top,rowsFit,hit:!!hit?.closest('.fr-all-feed')};
    });
    assert.equal(layout.scroll,0,'home does not scroll '+w);
    assert.equal(layout.rows,2);
    assert(layout.gap>=-1,'full feed button is immediately above the dock '+JSON.stringify(layout));
    assert(Math.abs(layout.dockInset)<=1,'dock is anchored to the bottom '+JSON.stringify(layout));
    const dockPositions=await page.evaluate(()=>{
      const dock=document.getElementById('bottomNavMobile');
      const items=[...dock.querySelectorAll('.bn-item')];
      const current=items.find(item=>item.classList.contains('active'));
      const positions=items.filter(item=>item.dataset.ekran!=='tab-dunya').map(item=>{
        current?.classList.remove('active');item.classList.add('active');
        const position=[item.dataset.ekran,innerHeight-dock.getBoundingClientRect().bottom,getComputedStyle(dock).paddingBottom];
        item.classList.remove('active');return position;
      });
      current?.classList.add('active');return positions;
    });
    assert(dockPositions.every(([,gap,padding])=>Math.abs(gap)<=1&&padding===safe+4+'px'),JSON.stringify(dockPositions));
    assert(layout.rowsFit&&layout.hit,'rows fit and the full feed button is tappable '+JSON.stringify(layout));
    assert(layout.last<=layout.buttonTop,'both activities fit above the button '+w);
    assert(await page.locator('.fr-event-person small').evaluateAll(lines=>lines.every(line=>line.scrollWidth<=line.clientWidth)),'summaries fit the card width at '+w);
    if(w===390)await page.screenshot({path:'/tmp/friends-home-mobile.png'});
    console.log('PASS layout '+w+'x'+h);
  }
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('#maAkisListe .fr-event').count(),2);
  assert.equal(await page.locator('.club-hero').count(),0);
  await page.locator('.fr-all-feed').click();
  await page.waitForSelector('.fr-club-view .club-hero');
  assert.equal(await page.locator('#maAkisListe .akis-kart').count(),5);
  assert.match(await page.locator('#maAkisListe').innerText(),/Present perfect vs past simple/);
  assert.deepEqual(await page.evaluate(()=>['viewport','theme-color'].map(name=>document.querySelector('meta[name="'+name+'"]').content)),chromeBefore);
  await page.locator('.club-back').click();
  await page.waitForSelector('.fr-home-view .fr-summaries');
  assert.equal(await page.locator('#maAkisListe .fr-event').count(),2);
  await page.locator('.fr-all-feed').click();
  await page.waitForSelector('.fr-club-view .club-hero');
  await page.locator('[data-filter="online"]').click();await page.waitForTimeout(300);assert.equal(await page.locator('#maAkisListe .akis-kart').count(),3);
  await page.locator('[data-filter="herkes"]').click();
  await page.locator('.aksiyon button').first().click();assert(writes.some(x=>x.islem==='akisOlayToggle'&&x.tur==='tebrik'));
  const congrats=page.locator('.aksiyon .fr-congrats').first();
  assert.equal((await congrats.innerText()).trim(),'');
  assert.equal(await congrats.getAttribute('aria-label'),'Tebrik edildi');
  assert.equal(await congrats.getAttribute('aria-pressed'),'true');
  assert(await page.locator('.ma-parca').count()>0,'congratulating releases confetti');
  await page.locator('.club-back').click();await page.locator('.fr-showcase-link').click();await page.waitForTimeout(300);assert(await page.locator('.sahne').isVisible());assert.equal(await page.locator('.fr-vitrin-papi').count(),1);await page.screenshot({path:'/tmp/friends-vitrin-mobile.png'});
  await page.locator('.fr-back').click();await page.locator('[data-friend-action="lig"]').click();await page.waitForSelector('.dm-lig-row');assert.equal(await page.locator('.dm-lig-place,.dm-lig-row').evaluateAll(rows=>new Set(rows.map(row=>row.dataset.ligPerson)).size),5);await page.screenshot({path:'/tmp/friends-lig-mobile.png'});
  await page.locator('[data-lig-back]').click();await page.locator('[data-friend-action="people"]').click();
  await page.waitForSelector('.fr-friend-sheet');assert.equal(await page.locator('.fr-search-person').count(),4);
  assert.equal(await page.locator('.fr-friend-sheet input').count(),0);await page.keyboard.press('Escape');
  await page.locator('.fr-all-feed').click();await page.waitForSelector('.fr-club-view');
  await page.locator('.fr-card-invite').first().click();await page.waitForTimeout(400);assert.equal(await page.locator('.dm-social').count(),1,'direct invitation opens real profile with game picker');assert(await page.locator('.dm-game').isVisible());
  await page.evaluate(()=>meduAkisAc());await page.waitForTimeout(300);assert(await page.locator('.fr-home').isVisible(),'re-entering from dock always shows hub');
  await page.evaluate(()=>{window.playedGame='';window.duelloOyununuAc=g=>playedGame=g;});await page.locator('.fr-duel-tile').click();await page.locator('[data-friend-action="accept"]').click();assert(writes.some(x=>x.islem==='duelloYanit'&&x.id==='duel-1'));await page.waitForFunction(()=>playedGame==='Kelime_Liderlik');assert.equal(await page.evaluate(()=>playedGame),'Kelime_Liderlik');
  assert.equal(await page.locator('#bottomNavMobile').innerHTML(),navBefore,'existing dock unchanged');
  await page.evaluate(()=>{window.dmProgression.allowed=code=>code!=='vitrin';window.dmProgression.require=code=>code!=='vitrin';});await page.locator('[data-friend-action="vitrin"]').click();assert(await page.locator('.fr-home').isVisible(),'locked showcase keeps hub');
  // Stale loading from another account cannot redraw the old student's hub.
  await page.evaluate(()=>{aktifOgrenciAdi='Other';maTakip=new Set();maTumListe=[];return dmFriends.refresh();});await page.waitForTimeout(100);
  const bad=errors.filter(x=>!x.includes('Chart')&&!x.includes('pdf'));
  assert.deepEqual(bad,[]);
  console.log('PASS home/detail routes, real congratulations, online filter, friend list, direct profile invitation, incoming invite, preserved dock and level gate');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
