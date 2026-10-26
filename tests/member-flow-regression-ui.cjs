'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const root=path.resolve('ingilizce'),html=fs.readFileSync(root+'/index.html','utf8');
 const inline=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
 const css=[...html.matchAll(/<link[^>]+href="([^"?]+\.css)(?:\?[^\"]*)?"/g)].map(m=>m[1]).filter(f=>fs.existsSync(path.join(root,f)));
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://member.test/**',r=>{const u=new URL(r.request().url());if(u.pathname==='/api')return r.fulfill({json:{ok:true,awards:[]}});const f=path.join(root,u.pathname);return fs.existsSync(f)&&fs.statSync(f).isFile()?r.fulfill({path:f}):r.fulfill({body:'',contentType:'text/html'});});
 await page.goto('https://member.test/fixture');
 await page.setContent('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+inline+'</style>'+css.map(f=>'<link rel="stylesheet" href="/'+f+'">').join('')+'<div id="panel-alani" style="display:block"><div id="tab-dunya" class="active"></div></div><div id="login-container"><form id="loginForm"><input id="ogrenci"><input id="sifre"><button id="girisBtn">Giriş</button><div id="mesaj"></div></form></div>');
 await page.evaluate(()=>{window.aktifOgrenciAdi='Ece';window.apiURL='https://member.test/api';localStorage.setItem('ing_token','current-session');window.yo={dmLearningPurpose:'independent'};window.dmProgression={refresh:async()=>{},status:()=>null};window.DijiProgressRules={progress:()=>({level:1,ratio:0}),migrate:y=>y};window.genelEnerjiKalan=30;window.overviewCalls=0;window.info={chapters:Array.from({length:30},(_,i)=>({id:i,title:(i+1)+'. Durak · Merhaba',cefr:'A1',theme:'Tanışma',current:i===0,available:i===0,done:false}))};window.dmStoryPath={overview:async()=>{if(++overviewCalls===1)return new Promise(r=>window.releaseFirst=r);return info;}};});
 await page.addScriptTag({path:root+'/oyna-v2.js'});
 await page.evaluate(()=>{const host=document.getElementById('tab-dunya');host.innerHTML='<div id="dmParkurScroll">'+dmParkurSahne({steps:[],allSteps:[]})+'</div>';dmParkurMapMount(document.getElementById('dmParkurScroll'));document.dispatchEvent(new Event('dm:login'));});
 await page.waitForSelector('.rt-node.current');assert.equal(await page.evaluate(()=>overviewCalls),2,'login invalidation must restart the pending map paint');
 await page.evaluate(()=>releaseFirst(info));assert.equal(await page.locator('.rt-v3-map').count(),1);
 await page.addScriptTag({path:root+'/account-switch.js'});
 await page.evaluate(()=>{window.saved=0;window.registration=0;window.dmSavedSessions={remember:()=>saved++,current:()=>({token:'current-session'}),list:()=>[]};window.dmFirstDiscovery={openRegistration:()=>registration++};dmHesapDegistirAc();});
 await page.locator('#dmSwitchAdd').click();assert(await page.locator('#dmSwitchSignup').isVisible());
 const heading=await page.locator('#dmSwitchTitle').evaluate(e=>getComputedStyle(e).webkitTextFillColor);assert.notEqual(heading,'rgb(255, 255, 255)');
 await page.locator('#dmSwitchSignup').click();assert.equal(await page.evaluate(()=>registration),1);assert.equal(await page.evaluate(()=>localStorage.getItem('ing_token')),'current-session');assert.equal(await page.locator('#login-container #loginForm').count(),1);
 await page.addScriptTag({path:root+'/route-graduation.js'});await page.evaluate(()=>dmGraduations.openLibrary());await page.waitForSelector('.dg-library-empty');
 assert.equal(await page.locator('.dg-library h2').textContent(),'Karnelerim');assert.notEqual(await page.locator('.dg-library h2').evaluate(e=>getComputedStyle(e).webkitTextFillColor),'rgb(255, 255, 255)');
 fs.mkdirSync('/tmp/diji-member-ui',{recursive:true});await page.screenshot({path:'/tmp/diji-member-ui/karnelerim.png'});await page.locator('.dg-library [data-close]').click();
 const text='Hâlâ e-posta onayını yapamayan hesaplar için;\n1- Sağ alttaki PROFİL sekmesine tıklayın.\n2- Açılan menüde PROFİLİM butonuna tıklayın.\n3- Görselli rehberi açın ve adımları uygulayın.';
 for(const width of [320,390,768])for(const theme of [1,2,3]){
  await page.setViewportSize({width,height:844});await page.evaluate(({theme,text})=>{document.getElementById('duyuruOverlay')?.remove();const el=document.createElement('div');el.id='duyuruOverlay';el.className='duy3-overlay dm-notice-theme-'+theme;el.style.display='flex';el.innerHTML='<section class="duy3-card dm-notice-card"><button class="duy3-close">×</button><div class="duy3-medal"><img src="/papi-loading.webp"></div><span class="duy3-tag">DUYURU</span><h3 class="duy3-title">E-POSTA ONAYI GÖRSELLERLE ANLATILDI!</h3><div class="duy3-msg"></div><button class="duy3-btn">Anladım, Kapat</button></section>';el.querySelector('.duy3-msg').textContent=text;document.body.append(el);},{theme,text});
  const boxes=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect();return {art:r('.duy3-medal').bottom,title:r('.duy3-title').top,message:r('.duy3-msg').top,titleBottom:r('.duy3-title').bottom,card:document.querySelector('.duy3-card').scrollWidth,width:document.querySelector('.duy3-card').clientWidth};});assert(boxes.art<=boxes.title);assert(boxes.titleBottom<=boxes.message);assert(boxes.card<=boxes.width+1);
  const fill=await page.locator('.duy3-msg').evaluate(e=>getComputedStyle(e).webkitTextFillColor);assert.equal(fill,theme===2?'rgb(255, 242, 203)':'rgb(36, 70, 89)','announcement text must contrast with its theme');
  if(width===390&&theme===3)await page.screenshot({path:'/tmp/diji-member-ui/duyuru.png'});
 }
 await page.evaluate(()=>{document.getElementById('duyuruOverlay').remove();const el=document.createElement('div');el.id='dmDiscovery';el.innerHTML='<footer class="fd-actions"><button class="fd-link" data-action="success">Şimdi uygulamaya devam et</button></footer>';document.body.append(el);});
 const finalAction=await page.locator('[data-action="success"]').evaluate(e=>{const s=getComputedStyle(e);return {image:s.backgroundImage,color:s.color,minHeight:parseFloat(s.minHeight)};});
 assert(finalAction.image.includes('gradient'),'final continue button uses a high-contrast primary gradient');
 assert.equal(finalAction.color,'rgb(255, 255, 255)');
 assert(finalAction.minHeight>=56,'final continue button has a touch-friendly hit area');
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS login map race, account signup/session preservation, report library and three readable notice themes at mobile/tablet widths');
})().catch(e=>{console.error(e);process.exit(1);});
