const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const launch=process.env.ROUTE_CHROME?{executablePath:process.env.ROUTE_CHROME,args:['--no-sandbox']}:{};
 const browser=await chromium.launch({headless:true,...launch}),page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=path.resolve(__dirname,'../ingilizce');
 await page.route('**/*',r=>{const url=new URL(r.request().url()),file=path.join(base,url.pathname);return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({body:''});});
 await page.goto('https://route.test/fixture');
 const navigation=fs.readFileSync(base+'/index.html','utf8').match(/<div class="bottom-nav-mobile"[\s\S]*?<\/div>/)[0].replace('<button type="button" class="bn-item"','<button type="button" class="bn-item active"');
 const fullStyles=[...fs.readFileSync(base+'/index.html','utf8').matchAll(/<style\b[^>]*>[\s\S]*?<\/style>|<link\b[^>]*rel="stylesheet"[^>]*>/gi)].map(m=>m[0]).join('');
 await page.setContent(fullStyles+'<meta name="viewport" content="width=device-width,initial-scale=1">'+['bottom-nav','oyna-v2','member-polish','papi-wallet','learning-companion','parkur-purple','route-design-three'].map(x=>'<link rel="stylesheet" href="/'+x+'.css">').join('')+'<style>*{box-sizing:border-box}body{margin:0}#tab-dunya{display:block!important;position:fixed;inset:0 0 64px;background:#fff}#bottomNavMobile{position:fixed;bottom:0;height:64px;width:100%;background:white;display:flex;justify-content:space-around;align-items:center;font:10px system-ui;color:#72778d}.rt-wallet{display:none}</style><div id="tab-dunya" class="dc-fullscreen-overlay active"></div><nav id="bottomNavMobile">Parkur　 Arkadaşlar　 Oyunlar　 Ders Çalış　 Mağaza　 Profil</nav>');
 await page.locator('#bottomNavMobile').evaluate((el,html)=>el.outerHTML=html,navigation);
 await page.evaluate(()=>{
 document.body.className='dm-parkur-open';window.genelEnerjiKalan=30;window.yo={dmLearningPurpose:'school',altin:599,totalXp:10200};window.aktifOgrenciAdi='Fixture';localStorage.setItem('ing_token','fixture');window.apiURL='/api';window.launches=[];
 window.fetch=async()=>({ok:true,json:async()=>({day:new Date(Date.now()+10800000).toISOString().slice(0,10),review:{due:2},missions:{daily:{route:0,game:0,review:0},weekly:{route:2,game:3,days:1}}})});
 window.dmMemberUI={sheet(title,html,id){const el=document.createElement('div');el.id=id;el.className='rt-overlay';el.innerHTML='<section class="rt-dialog" role="dialog"><button class="close">×</button><h2>'+title+'</h2>'+html+'</section>';document.body.append(el);const close=()=>el.remove();el.querySelector('.close').onclick=close;return {el,close};}};
 window.dmMemberExperience={chooseRoute:()=>launches.push('switch')};window.dmProgression={status:()=>({chests:{a:'ready'}}),refresh:async()=>{},chests:()=>launches.push('chest')};
 window.dmSchoolJourney={open:()=>launches.push('all')};window.dmSchoolStopOpen=(b,d)=>launches.push('school:'+b+':'+d);window.dmParkurDurakAdi=(b,d)=>['Hayvanlar Dünyası','Yaşam Alanları','Nesli Tükenen Hayvanlar','Koruma Yolları','Tekrar ve Test'][d%5];
 window.dmStoryPath={overview:async()=>({chapters:Array.from({length:600},(_,i)=>({id:i,title:(i+1)+'. Durak · '+['Küresel Sorunlar','Kültürel Farklılıklar','Bilim ve Toplum','Teknolojinin Geleceği','Sürdürülebilir Yaşam','Yeni Fikirler','Tekrar'][i%7],cefr:i<200?'A1':i<400?'A2':'B1',theme:'Tema '+Math.floor(i/12),done:i<302,current:i===302,available:i<=302}))}),open:id=>launches.push('chapter:'+id),openAll:()=>launches.push('all'),continueRoute:async()=>launches.push('continue')};
 });
 for(const name of ['route-missions','oyna-v2','learning-companion','papi-wallet'])await page.addScriptTag({content:fs.readFileSync(base+'/'+name+'.js','utf8')});
 for(const size of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:844,height:390}]){
 await page.setViewportSize(size);
 for(const route of ['school','independent']){
 await page.evaluate(route=>{yo.dmLearningPurpose=route;const steps=Array.from({length:600},(_,i)=>({b:2,d:i,no:270451+i,label:(Math.floor(i/75)+1)+'. sınıf '+(Math.floor(i%75/10)+1)+'. ünite · '+(i%10+1)+'/10',done:i<302,available:i<=302}));document.getElementById('tab-dunya').innerHTML='<div class="bz-ic">'+dmParkurBaslik({energy:30,gold:599})+'<div id="dmParkurScroll">'+dmParkurSahne({steps,allSteps:steps,current:302})+'</div></div>';dmParkurMapMount(document.getElementById('dmParkurScroll'));document.querySelectorAll('.dm-adventure-node,.dm-map-continue').forEach(b=>b.onclick=()=>launches.push('school:'+b.dataset.b+':'+b.dataset.d));},route);
 await page.waitForSelector('.bi-scene');
 const scene=page.locator('.bi-scene');
 assert.equal(await scene.count(),1,'one current route scene');
 assert.equal(await page.locator('.bi-sky').count(),route==='independent'?1:0);
 assert.equal(await page.locator('.bi-stop').count(),4,'only four nearby stops mount for a 600-stop route');
 assert.equal(await page.locator('.bi-mascot').count(),1);
 assert.equal(await page.locator('.bi-stop.current .bi-node').count(),1);
 assert(await page.locator('.bi-stop.locked .bi-node').isDisabled());
 const fit=await scene.evaluate(el=>({width:el.getBoundingClientRect().width,scroll:document.documentElement.scrollWidth}));
 assert(fit.width<=size.width+1&&fit.scroll<=size.width+1,JSON.stringify({size,route,fit}));
 await page.locator('.bi-progress').click();assert.equal(await page.evaluate(()=>launches.at(-1)),'all','full route list remains available');
 await page.locator('.bi-continue').click();assert.equal(await page.evaluate(()=>launches.at(-1)),route==='school'?'school:2:302':'continue');
 await page.locator('.bi-stop.done .bi-node').first().click();assert.equal(await page.evaluate(()=>launches.at(-1)),route==='school'?'school:2:300':'chapter:300');
 assert.equal(await page.evaluate(()=>yo.altin),599,'browsing/reopening does not award gold');
 await page.locator('[data-rt="chests"]').click();assert.equal(await page.evaluate(()=>launches.at(-1)),'chest');
 await page.locator('[data-rt="missions"]').click();await page.waitForSelector('#rtDialog');assert.equal(await page.locator('[data-mission-panel="daily"] .mp-task-list>button').count(),3);await page.locator('[data-mission-tab="weekly"]').click();assert(await page.locator('[data-mission-panel="weekly"]').isVisible());await page.locator('.rt-close').click();assert.equal(await page.locator('#rtDialog').count(),0);
 await page.locator('[data-rt="plan"]').click();await page.waitForSelector('#lcPlanSheet');assert(await page.locator('#lcPlanSheet .lc-plan-steps').isVisible());await page.locator('#lcPlanSheet .close').click();
 if(size.width===390){fs.mkdirSync('/tmp/route-design-three',{recursive:true});await page.screenshot({path:'/tmp/route-design-three/'+route+'.png'});}
 }
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{window.claims=[];window.dmEkonomi={odulIslem:async op=>{claims.push(op);return {ok:true,eklenen:30,xp:70};}};dmRouteMissions.set({daily:{route:1,game:1,review:3},weekly:{route:2,game:3,days:1}},'Fixture');});
 await page.locator('[data-rt="missions"]').click();await page.locator('[data-rt="claim-mission"][data-period="daily"]').click();await page.waitForSelector('#dmMissionReward');assert.equal(await page.evaluate(()=>claims.length),1);await page.locator('#dmMissionReward button').click();assert.equal(await page.locator('[data-mission-panel="daily"] [data-rt="claim-mission"]').count(),0);assert.match(await page.locator('[data-mission-panel="daily"] .mp-reward [role="status"]').textContent(),/Ödül alındı/);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS current island and sky routes with 600 stops at five sizes: bounded DOM, full-list access, real stop/continue actions, plans, missions and rewards');
})().catch(e=>{console.error(e);process.exit(1)});
