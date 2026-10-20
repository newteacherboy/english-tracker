const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const launch=process.env.ROUTE_CHROME?{executablePath:process.env.ROUTE_CHROME,args:['--no-sandbox']}:{};
 const browser=await chromium.launch({headless:true,...launch}),page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=path.resolve(__dirname,'../ingilizce');
 await page.route('**/*',r=>{const url=new URL(r.request().url()),file=path.join(base,url.pathname);return fs.existsSync(file)&&fs.statSync(file).isFile()?r.fulfill({path:file}):r.fulfill({body:''});});
 await page.goto('https://route.test/fixture');
 const navigation=fs.readFileSync(base+'/index.html','utf8').match(/<div class="bottom-nav-mobile"[\s\S]*?<\/div>/)[0].replace('<button type="button" class="bn-item"','<button type="button" class="bn-item active"');
 const fullStyles=[...fs.readFileSync(base+'/index.html','utf8').matchAll(/<style\b[^>]*>[\s\S]*?<\/style>|<link\b[^>]*rel="stylesheet"[^>]*>/gi)].map(m=>m[0]).join('');
 await page.setContent(fullStyles+'<meta name="viewport" content="width=device-width,initial-scale=1">'+['bottom-nav','oyna-v2','member-polish','papi-wallet','learning-companion','parkur-purple','route-design-three'].map(x=>'<link rel="stylesheet" href="/'+x+'.css">').join('')+'<style>*{box-sizing:border-box}body{margin:0}#tab-dunya{position:fixed;inset:0 0 64px;background:#fff}#bottomNavMobile{position:fixed;bottom:0;height:64px;width:100%;background:white;display:flex;justify-content:space-around;align-items:center;font:10px system-ui;color:#72778d}.rt-wallet{display:none}</style><div id="tab-dunya"></div><nav id="bottomNavMobile">Parkur　 Arkadaşlar　 Oyunlar　 Ders Çalış　 Mağaza　 Profil</nav>');
 await page.locator('#bottomNavMobile').evaluate((el,html)=>el.outerHTML=html,navigation);
 await page.evaluate(()=>{
 document.body.className='dm-parkur-open';window.genelEnerjiKalan=30;window.yo={dmLearningPurpose:'school',altin:599,totalXp:10200};window.aktifOgrenciAdi='Fixture';localStorage.setItem('ing_token','fixture');window.apiURL='/api';window.launches=[];
 window.fetch=async()=>({ok:true,json:async()=>({day:new Date(Date.now()+10800000).toISOString().slice(0,10),review:{due:2},missions:{daily:{route:0,game:0,review:0},weekly:{route:2,game:3,days:1}}})});
 window.dmMemberUI={sheet(title,html,id){const el=document.createElement('div');el.id=id;el.className='rt-overlay';el.innerHTML='<section class="rt-dialog" role="dialog"><button class="close">×</button><h2>'+title+'</h2>'+html+'</section>';document.body.append(el);const close=()=>el.remove();el.querySelector('.close').onclick=close;return {el,close};}};
 window.dmMemberExperience={chooseRoute:()=>launches.push('switch')};window.dmProgression={status:()=>({chests:{a:'ready'}}),refresh:async()=>{},chests:()=>launches.push('chest')};
 window.dmSchoolJourney={open:()=>launches.push('all')};window.dmParkurDurakAdi=(b,d)=>['Hayvanlar Dünyası','Yaşam Alanları','Nesli Tükenen Hayvanlar','Koruma Yolları','Tekrar ve Test'][d%5];
 window.dmStoryPath={overview:async()=>({chapters:Array.from({length:7},(_,i)=>({id:i,title:(i+41)+'. Durak · '+['Küresel Sorunlar','Kültürel Farklılıklar','Bilim ve Toplum','Teknolojinin Geleceği','Sürdürülebilir Yaşam','Yeni Fikirler','Tekrar'][i],cefr:'B2',theme:i<2?'Dünya ve Kültür':'Bilim ve Teknoloji',done:i<2,current:i===2,available:i<=2}))}),open:id=>launches.push('chapter:'+id),openAll:()=>launches.push('all'),continueRoute:async()=>launches.push('continue')};
 });
 for(const name of ['route-missions','oyna-v2','learning-companion','papi-wallet'])await page.addScriptTag({content:fs.readFileSync(base+'/'+name+'.js','utf8')});
 for(const size of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:844,height:390}]){
 await page.setViewportSize(size);
 for(const route of ['school','independent']){
 await page.evaluate(route=>{yo.dmLearningPurpose=route;const steps=Array.from({length:7},(_,i)=>({b:2,d:i,no:i+31,label:'7. sınıf 4. ünite · '+(i+1)+'/7',done:i<2,available:i<=2}));document.getElementById('tab-dunya').innerHTML='<div class="bz-ic">'+dmParkurBaslik({energy:30,gold:599})+'<div id="dmParkurScroll">'+dmParkurSahne({steps,allSteps:steps,current:2})+'</div></div>';dmParkurMapMount(document.getElementById('dmParkurScroll'));document.querySelectorAll('.dm-adventure-node,.dm-map-continue').forEach(b=>b.onclick=()=>launches.push('school:'+b.dataset.b+':'+b.dataset.d));},route);
 await page.waitForSelector('.rt-v3-map');await page.waitForTimeout(50);
 assert.equal(await page.locator('.rt-node').count(),5);assert.equal(await page.locator('.rt-node.locked:disabled').count(),2);
 const metrics=await page.locator('.rt-v3-map').evaluate(el=>({background:getComputedStyle(el).backgroundImage,width:el.getBoundingClientRect().width,canvas:el.querySelector('.rt-v3-canvas').getBoundingClientRect().height,host:el.getBoundingClientRect().height,scroll:document.documentElement.scrollWidth}));
 const geometry=await page.locator('.rt-node.current').evaluate(b=>{const n=b.getBoundingClientRect(),s=b.closest('.rt-v3-stop').getBoundingClientRect(),a=document.querySelector('.rt-start'),c=getComputedStyle(a);return {dx:Math.abs(n.x-s.x),dy:Math.abs(n.y-s.y),position:c.position,maxWidth:c.maxWidth};});assert(geometry.dx<3&&geometry.dy<3,'native school transform must not displace tiles');assert.equal(geometry.position,'static');assert.equal(geometry.maxWidth,'none');assert.equal(metrics.background,'none');assert(metrics.scroll<=size.width+1);assert(metrics.width<=size.width);assert(metrics.canvas>metrics.host*(size.height<650?.60:.65),'map dominates available route area '+JSON.stringify({size,route,metrics}));
 await page.locator('.rt-start').scrollIntoViewIfNeeded();const cta=await page.locator('.rt-start').boundingBox();assert(cta.y+cta.height<=size.height-64+1,'continue stays above navigation');await page.locator('.rt-start').click();assert.equal(await page.evaluate(()=>launches.at(-1)),route==='school'?'school:2:2':'continue');
 await page.locator('[data-rt="chests"]').click();assert.equal(await page.evaluate(()=>launches.at(-1)),'chest');
 await page.locator('.rt-v3-all').click();assert.equal(await page.evaluate(()=>launches.at(-1)),'all');
 await page.locator('[data-rt="missions"]').click();await page.waitForSelector('#rtDialog');assert.equal(await page.locator('[data-mission-panel="daily"] .rt-task-list>button').count(),3);await page.locator('[data-mission-tab="weekly"]').click();assert(await page.locator('[data-mission-panel="weekly"]').isVisible());await page.locator('.rt-close').click();assert.equal(await page.locator('#rtDialog').count(),0);
 await page.locator('[data-rt="plan"]').click();await page.waitForSelector('#lcPlanSheet');assert(await page.locator('#lcPlanSheet .lc-plan-steps').isVisible());await page.locator('#lcPlanSheet .close').click();
 if(size.width===390){fs.mkdirSync('/tmp/route-design-three',{recursive:true});await page.screenshot({path:'/tmp/route-design-three/'+route+'.png'});}
 }
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{window.claims=[];window.dmEkonomi={odulIslem:async op=>{claims.push(op);return {ok:true,eklenen:30,xp:70};}};dmRouteMissions.set({daily:{route:1,game:1,review:3},weekly:{route:2,game:3,days:1}},'Fixture');});
 await page.locator('[data-rt="missions"]').click();await page.locator('[data-rt="claim-mission"][data-period="daily"]').click();await page.waitForSelector('#dmMissionReward');assert.equal(await page.evaluate(()=>claims.length),1);await page.locator('#dmMissionReward button').click();assert.equal(await page.locator('[data-mission-panel="daily"] [data-rt="claim-mission"]').count(),0);assert(await page.locator('[data-mission-panel="daily"] .rt-claim-done').isVisible());
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS both approved routes at five viewport sizes: native launches, locks, plan, missions, chest and reachable continuation');
})().catch(e=>{console.error(e);process.exit(1)});
