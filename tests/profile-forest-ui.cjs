const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/tmp/diji-browser/chromium',args:['--no-sandbox','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],env:{...process.env,LD_LIBRARY_PATH:'/tmp/diji-browser/lib'}});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='nxfqlutulxqzqgwewssd.supabase.co'){let b;try{b=route.request().postDataJSON();}catch{};const answer=op=>op==='yayinOzellikleri'?{flags:{},admin:false}:op==='seviyeDurumu'?{ok:true,level:5,feed:true,lessons:{A1:true}}:op==='seviyeLigListesi'?{ok:true,liste:[]}:[];return route.fulfill({json:b?.islem==='okumaGrubu'?{ok:true,results:b.istekler.map(x=>({status:200,body:JSON.stringify(answer(x.islem))}))}:answer(b?.islem||u.searchParams.get('islem'))});}
  if(u.hostname==='cdn.jsdelivr.net'&&u.pathname.includes('chart.js')){const chart=process.env.DIJI_CHART_JS||'/tmp/diji-chart.js';return fs.existsSync(chart)?route.fulfill({path:chart,contentType:'application/javascript'}):route.fulfill({response:await route.fetch()});}
  if(u.hostname==='cdn.jsdelivr.net'&&u.pathname.includes('supabase'))return route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})}'});
  if(u.hostname==='forest.test'){const f=path.join(__dirname,'../ingilizce',u.pathname.replace(/^\/ingilizce\//,'')||'index.html');if(fs.existsSync(f)&&fs.statSync(f).isFile())return route.fulfill({path:f});}
  return route.fulfill({json:[]});
 });
 await page.addInitScript(()=>new MutationObserver(()=>document.querySelector('.kur-perde .kur-x')?.click()).observe(document,{childList:true,subtree:true}));
 await page.goto('https://forest.test/ingilizce/');await page.waitForTimeout(800);
 await page.evaluate(()=>{
  aktifOgrenciAdi='Kaşif';globalDataCache=[{ogrenci:'Kaşif',Sinif:'3',Durum:'approved'}];yo=yoVarsayilan();yo.karakter={cins:'e',s:{},sahip:[]};yo.dmParkurMigration={version:1};yo.svtDavet=2;window.yoSunucudanAl=async()=>{};yo.totalXp=400;yoIsim='Kaşif';window.yoHazirMi=()=>true;window.yoSunucuyaGonder=()=>{};
  document.getElementById('login-container').style.display='none';document.getElementById('panel-alani').style.display='block';
  document.getElementById('ogrenciAdiText').textContent='Orman Kaşifi';document.getElementById('headerEnerjiNum').textContent='30/30';document.getElementById('headerEnerjiBar').style.width='100%';
  document.getElementById('valGenelPuan').textContent='42';document.getElementById('valEtkinlikBasarisi').textContent='18';document.getElementById('valSonDeneme').textContent='75';document.getElementById('valPerformansEmoji').textContent='🌱 Gelişiyor';
  window.forestOriginalNodes=['gelisimGrafik','kriterGrafik','denemeGrafik','sureGosterge','headerEnerjiNum'].map(id=>document.getElementById(id));
  grafikliCiz([{tarih:'2026-09-01',genel:20},{tarih:'2026-09-15',genel:35},{tarih:'2026-10-01',genel:42}],{okumaOrt:60,yazmaOrt:40,vocabOrt:70,konusmaOrt:35,grammarOrt:50},[{tarih:'2026-09-01',deneme:50},{tarih:'2026-10-01',deneme:75}]);
  rozetleriIsle(Array.from({length:8},(_,i)=>({rozetAdi:['Minik Adım','Kalem Ustası','Neşeli Harf','Pırıl Yıldız','Gülen Çiçek','Uçan Arı','Minik Kalp','Roket Kaşif'][i],gerekliPuan:(i+1)*10,emoji:'⭐'})),42);
  yoArayuzKur();
 });
 await page.waitForTimeout(5000);await page.evaluate(()=>{document.querySelector('.kr-perde')?.remove();profilAc();});await page.waitForTimeout(300);
 await page.screenshot({path:'/tmp/diji-forest-top.png'});assert(await page.locator('#dmForestGrowth').isVisible());assert.equal(await page.locator('#rozetlerGridKonteyner .badge-card:visible').count(),4);
 await page.locator('#dmForestBadgeToggle').click();assert.equal(await page.locator('#rozetlerGridKonteyner .badge-card:visible').count(),8);await page.locator('#dmForestBadgeToggle').click();
 const values=await page.evaluate(()=>['gelisimGrafik','kriterGrafik','denemeGrafik'].map(id=>Chart.getChart(id).data.datasets[0].data));assert.deepEqual(values,[[20,35,42],[60,40,70,35,50],[50,75]]);
 await page.locator('.dm-forest-detail').first().locator('summary').click();assert(await page.locator('#kriterGrafik').isVisible());
 await page.locator('.dm-forest-detail').last().locator('summary').click();assert(await page.locator('#denemeGrafik').isVisible());
 for(const width of [360,390,768]){
  await page.setViewportSize({width,height:844});await page.waitForTimeout(120);
  const size=await page.locator('#tab-profil').evaluate(e=>({client:e.clientWidth,scroll:e.scrollWidth}));assert(size.scroll<=size.client+1,`profile overflow at ${width}`);
  const boxes=await page.evaluate(()=>['userAvatarLetter','dmLevelBadge','headerEnerjiBadge','ybArac'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}));assert(boxes[1].y>=boxes[0].y+boxes[0].h,'level cannot overlap avatar');
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#tab-profil').evaluate(e=>e.scrollTop=0);await page.screenshot({path:'/tmp/diji-forest-top.png'});
 await page.locator('#dmForestGrowth').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/diji-forest-charts.png'});
 await page.locator('#dmForestActions [onclick="dmHesapAyarlariAc()"]').click();assert(await page.locator('.dm-account-overlay').isVisible());await page.evaluate(()=>document.querySelector('.dm-account-overlay')?.remove());
 await page.evaluate(()=>dcTumTamEkranlariKapat());assert.equal(await page.locator('#dmForestGrowth').count(),0);assert.equal(await page.locator('#panel-alani > .user-header-bar').count(),1);assert.equal(await page.locator('#rozetlerBolumu #denemeGrafik').count(),1);assert.equal(await page.locator('#profilAlan .user-actions').count(),0);
 await page.evaluate(()=>profilAc());await page.evaluate(()=>{document.getElementById('headerEnerjiNum').textContent='29/30';document.getElementById('sureGosterge').textContent='00:05:10';yo.totalXp=700;});await page.waitForTimeout(800);
 assert.equal(await page.locator('#headerEnerjiNum').textContent(),'29/30');assert.equal(await page.locator('#sureGosterge').textContent(),'00:05:10');await page.waitForFunction(()=>document.getElementById('dmLevelBadge').textContent.includes('Sv. '+DijiProgressRules.progress(yo.totalXp).level));
 assert(await page.evaluate(()=>forestOriginalNodes.every(n=>document.getElementById(n.id)===n)));
 await page.evaluate(()=>grafikliCiz([],{},[]));assert(await page.locator('#gelisimGrafik').isHidden());assert(await page.locator('#gelisimGrafikKutusu .dm-chart-empty').isVisible());assert(await page.locator('#denemeGrafik').isHidden());
 await page.evaluate(()=>dcTumTamEkranlariKapat());assert(await page.locator('#gelisimGrafik').evaluate(e=>!e.hidden),'empty state must not leak outside profile');
 assert.deepEqual(errors.filter(e=>!e.includes('pdf')),[]);await browser.close();console.log('PASS forest profile real charts, preserved nodes/data, badges, account modal, empty states, reopen/live level and 360/390/768 layouts');
})().catch(e=>{console.error(e);process.exit(1)});
