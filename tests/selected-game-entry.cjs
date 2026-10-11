const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.DIJI_CHROMIUM,headless:true,args:['--no-sandbox','--no-zygote','--disable-dev-shm-usage','--disable-gpu','--single-process']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 await page.route('**/*',async route=>{const u=new URL(route.request().url());const body=route.request().postDataJSON?.();if(body?.islem==='yayinOzellikleri')return route.fulfill({contentType:'application/json',body:JSON.stringify({flags:{},admin:false})});if(body?.islem==='enerjiDegistir')return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,status:'success',enerjiKalan:27,enerjiMax:30,eklenen:-3})});if(u.hostname==='cdn.jsdelivr.net'&&u.pathname.includes('supabase'))return route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>({select:async()=>({data:[],error:null})})})};'});if(u.hostname==='diji.test'){const name=u.pathname.replace(/^\/ingilizce\//,'')||'index.html';const file=path.join(__dirname,'../ingilizce',name);if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});}return route.fulfill({contentType:'application/json',body:'[]'});});
 await page.addInitScript(()=>{new MutationObserver(()=>document.querySelector('.kur-perde .kur-x')?.click()).observe(document,{childList:true,subtree:true});});
 await page.goto('https://diji.test/ingilizce/',{waitUntil:'load'});
 await page.evaluate(()=>{aktifOgrenciAdi='QA';globalDataCache=[{ogrenci:'QA',Sinif:'3',Durum:'approved'}];window.masterKelimeHavuzu=['cat','dog','school','window','teacher','book','pencil','apple','garden','friend'].map(en=>({ingilizce:en,turkce:en+' anlamı',sinif:3,unite:1}));window.genelOyunGirisEngelliMi=()=>false;window.genelEnerjiKalan=30;yo=yoVarsayilan();yo.totalXp=1000000;yoIsim='QA';window.dmPapiFirstPractice={locked:()=>false,complete:()=>{}};});
 const entries=[['kelimeYarismasiAc','kyGirisEkrani','kelimeYarismaOverlay'],['jpOyunAc','jpGirisEkrani','jpOyunOverlay'],['boslukOyunAc','boslukGirisEkrani','boslukOyunOverlay'],['hafizaOyunAc','hafizaGirisEkrani','hafizaOyunOverlay'],['yagmurOyunAc','yagmurGirisEkrani','yagmurOyunOverlay'],['asmacaOyunAc','asmacaGirisEkrani','asmacaOyunOverlay'],['kelimebulOyunAc','kelimebulGirisEkrani','kelimebulOyunOverlay'],['esOyunAc','esGirisEkrani','esOyunOverlay'],['trenOyunAc','trenGirisEkrani','trenOyunOverlay']];
 for(const width of [360,390,768]){
  await page.setViewportSize({width,height:844});
  for(const [fn,id,modal] of entries){
   await page.evaluate(fn=>window[fn](),fn);await page.waitForSelector('#'+id+' .dm-entry-intro');assert(await page.locator('#'+id).isVisible(),id);
   const metrics=await page.locator('#'+id).evaluate(e=>{e=e.closest('.game-modal-content');return {background:getComputedStyle(e).backgroundColor,width:e.getBoundingClientRect().width,scroll:e.scrollWidth,client:e.clientWidth}});assert.equal(metrics.background,'rgb(252, 249, 255)',id);assert(metrics.width<=width,id);assert(metrics.scroll<=metrics.client+1,id);
   if(width===390&&fn==='kelimeYarismasiAc')await page.screenshot({path:'/tmp/game-entry-qa.png'});
   await page.evaluate(modal=>document.getElementById(modal).style.display='none',modal);
  }
  for(const fn of ['dikteAc','cumleAc']){await page.evaluate(fn=>window[fn](),fn);await page.waitForSelector('#dmGameIntro');assert.equal(await page.locator('#dmGameIntro .sinif-btn').count(),8);assert(await page.locator('#dmGameIntro [data-start]').evaluate(e=>typeof e.onclick==='function'));await page.locator('#dmIntroClasses [data-class="3"]').click();assert(await page.locator('#dmIntroClasses [data-class="3"]').evaluate(e=>e.classList.contains('active')));await page.locator('#dmGameIntro [data-close]').click();}
 }
 console.log({errors});assert.deepEqual(errors,[]);await browser.close();console.log('PASS: selected designs on nine real game entry panels, dictation/sentence intros, 360/390/768px and preserved selection/start handlers');
})().catch(e=>{console.error(e);process.exit(1)});
