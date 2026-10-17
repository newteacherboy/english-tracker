const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.DIJI_CHROMIUM,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 await page.route('**/*',async route=>{const u=new URL(route.request().url());/* Isolate unrelated pre-existing email-guide syntax error from board QA. */if(u.pathname.endsWith('/email-guide.js'))return route.fulfill({contentType:'application/javascript',body:''});if(u.hostname==='cdn.jsdelivr.net'&&u.pathname.includes('supabase'))return route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>({select:async()=>({data:[],error:null})})})};'});if(u.hostname==='diji.test'){const name=u.pathname.replace(/^\/ingilizce\//,'')||'index.html',file=path.join(__dirname,'../ingilizce',name);if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});}return route.fulfill({contentType:'application/json',body:'[]'});});
 await page.goto('https://diji.test/ingilizce/',{waitUntil:'load'});await page.addStyleTag({content:'body > :not(.dm-approved-board){display:none!important}'});
 await page.evaluate(()=>{document.querySelectorAll('.kur-perde,#authOverlay,#dmWelcome,#dmBootSplash').forEach(e=>e.remove());aktifOgrenciAdi='teacher';window.genelOyunGirisEngelliMi=()=>false;window.genelEnerjiKalan=30;window.genelEnerjiHarca=()=>{};window.masterKelimeHavuzu=['drawing','excellent','award','school','teacher','book','pencil','apple','garden','friend','water','football'].map((en,i)=>({ingilizce:en,turkce:['çizim','mükemmel','ödül','okul','öğretmen','kitap','kalem','elma','bahçe','arkadaş','su','futbol'][i],sinif:3,unite:1}));window.genelKomboGoster=()=>{};window.genelSesEfektiCal=()=>{};window.hafizaSesCal=()=>{};window.genelSonucEkraniGoster=()=>{};});
 for(const size of [{width:390,height:844},{width:360,height:640},{width:768,height:1024}]){
  await page.setViewportSize(size);
  for(const key of ['hafiza','bosluk']){
   await page.evaluate(key=>{
    document.querySelectorAll('.game-modal-overlay').forEach(x=>x.style.display='none');
    const root=document.getElementById(key+'OyunOverlay');document.body.append(root);root.style.setProperty('display','flex','important');root.style.zIndex=2147483000;
    document.getElementById(key+'GirisEkrani').style.display='none';document.getElementById(key+'BitisEkrani').style.display='none';document.getElementById(key+'IsimInput').value='QA';
    if(key==='hafiza'){hafizaAktifSinif=3;hafizaSecilenUniteler=[1];hafizaOyunuBaslat();}else{boslukAktifSinif=3;boslukSecilenUniteler=[1];boslukOyunuBaslat();}
   },key);
   await page.waitForTimeout(300);
   const metrics=await page.locator('#'+key+'OyunOverlay .game-modal-content').evaluate(e=>({width:e.clientWidth,scrollWidth:e.scrollWidth,height:e.clientHeight,scrollHeight:e.scrollHeight,rect:e.getBoundingClientRect().toJSON()}));
   assert(metrics.scrollWidth<=metrics.width+1,JSON.stringify({key,size,metrics}));assert(metrics.scrollHeight<=metrics.height+1,JSON.stringify({key,size,metrics}));
   const controls=page.locator(key==='hafiza'?'#hafizaKartGrid .hz-kart':'#boslukSatirlarContainer .dm-letter-options button');
   for(const el of await controls.all()){const b=await el.boundingBox();assert(b&&b.x>=0&&b.x+b.width<=size.width+1&&b.y+b.height<=size.height+1,JSON.stringify({key,size,b}));}
   if(size.width===390)await page.screenshot({path:'/tmp/approved-'+key+'.png'});
   if(key==='hafiza'){
    assert.equal(await page.locator('#hafizaKartGrid .hz-kart').count(),24);
    await page.evaluate(()=>{const a=hafizaKartlar.findIndex(k=>k.sabit);const b=hafizaKartlar.findIndex(k=>!k.sabit&&k.pairId===hafizaKartlar[a].pairId);hafizaKartTikla(a);hafizaKartTikla(b);});
    assert.equal(await page.evaluate(()=>hafizaEslesenSayi),1);
    await page.evaluate(()=>{clearInterval(hafizaTimer);hafizaMuzikDurdur();});
   }else{
    assert.equal(await page.locator('.dm-letter-word').count(),3);
    const before=await page.locator('.dm-letter-slots button:not(:disabled)').count();
    await page.evaluate(()=>jkHarfAc()());assert.equal(await page.locator('.dm-letter-slots button:not(:disabled)').count(),before-1);
    assert(await page.evaluate(()=>!!jkDogruIngilizce()));
    await page.evaluate(()=>{let limit=100;while(document.querySelector('#boslukSatirlarContainer .dm-letter-slots button:not(:disabled)')&&limit--)document.querySelector('#boslukSatirlarContainer .dm-letter-slots button:not(:disabled)').dmReveal();});
    await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>boslukRound.index),3);
    await page.evaluate(()=>clearInterval(boslukTimerInterval));
   }
  }
 }
 console.log({errors});assert.deepEqual(errors,[]);await browser.close();console.log('PASS: 24 live memory cards, matching, letter reveal, next three-word batch and viewport fit at 360/390/768px.');
})().catch(e=>{console.error(e);process.exit(1)});
