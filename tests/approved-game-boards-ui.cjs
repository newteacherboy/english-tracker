const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.DIJI_CHROMIUM,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname==='cdn.jsdelivr.net'&&u.pathname.includes('supabase'))return route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>({select:async()=>({data:[],error:null})})})};'});if(u.hostname==='diji.test'){const name=u.pathname.replace(/^\/ingilizce\//,'')||'index.html',file=path.join(__dirname,'../ingilizce',name);if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});}return route.fulfill({contentType:'application/json',body:'[]'});});
 await page.addInitScript(()=>{window.audioNotes=[];window.AudioContext=class {currentTime=0;destination={};resume(){return Promise.resolve()}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this},disconnect(){}}}createOscillator(){const o={frequency:{value:0},connect(g){return g},start(){window.audioNotes.push(o.frequency.value)},stop(){},disconnect(){}};return o;}};});
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
    assert(await page.locator('#hafizaOyunEkrani .ab-jokers #jkBar').isVisible());const lastCard=await page.locator('#hafizaKartGrid').boundingBox(),jokerBar=await page.locator('#hafizaOyunEkrani .ab-jokers').boundingBox();assert(jokerBar.y>=lastCard.y+lastCard.height,'Jokers remain below the cards');assert(jokerBar.y+jokerBar.height<=size.height+1);assert.equal(await page.locator('#hafizaOyunEkrani details').count(),0);assert.equal(await page.locator('#hafizaKartGrid .hz-kart').count(),8);assert.match(await page.locator('#abMemoryTurn').textContent(),/1 \/ 3/);
    await page.evaluate(()=>{const a=hafizaKartlar.findIndex(k=>k.sabit&&k.pairId===0);const b=hafizaKartlar.findIndex(k=>!k.sabit&&k.pairId===hafizaKartlar[a].pairId);hafizaKartTikla(a);hafizaKartTikla(b);});
    assert.equal(await page.evaluate(()=>hafizaEslesenSayi),1);
    for(let turn=0;turn<3;turn++){await page.evaluate(turn=>{for(let id=turn*4;id<Math.min(turn*4+4,11);id++){const a=hafizaKartlar.findIndex(k=>k.sabit&&k.pairId===id);if(hafizaKartlar[a].eslesti)continue;const b=hafizaKartlar.findIndex(k=>!k.sabit&&k.pairId===id);hafizaKartTikla(a);hafizaKartTikla(b);}},turn);if(turn<2){assert.match(await page.locator('#abMemoryTurn').textContent(),new RegExp((turn+2)+' / 3'));assert.equal(await page.locator('#hafizaKartGrid .hz-kart').count(),8);}}
    assert.equal(await page.evaluate(()=>hafizaEslesenSayi),11);
    await page.evaluate(()=>{clearInterval(hafizaTimer);hafizaMuzikDurdur();});
   }else{
    assert.equal(await page.locator('.dm-letter-word').count(),3);
    await page.evaluate(()=>{window.audioNotes=[];const row=document.querySelector('.dm-letter-word'),slot=row.querySelector('.dm-letter-slots button:not(:disabled)');slot.click();[...row.querySelectorAll('.dm-letter-options button')].find(b=>b.textContent.length===1&&b.textContent!==slot.dataset.answer).click();});assert.deepEqual(await page.evaluate(()=>audioNotes),[220,155]);
    await page.evaluate(()=>{window.audioNotes=[];});
    const before=await page.locator('.dm-letter-slots button:not(:disabled)').count();
    await page.evaluate(()=>jkHarfAc()());assert.equal(await page.locator('.dm-letter-slots button:not(:disabled)').count(),before-1);assert.deepEqual(await page.evaluate(()=>audioNotes),[880]);
    assert(await page.evaluate(()=>!!jkDogruIngilizce()));
    await page.evaluate(()=>{let limit=100;while(document.querySelector('#boslukSatirlarContainer .dm-letter-slots button:not(:disabled)')&&limit--)document.querySelector('#boslukSatirlarContainer .dm-letter-slots button:not(:disabled)').dmReveal();});
    await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>boslukRound.index),3);assert(await page.evaluate(()=>audioNotes.includes(1047)),'Completed word has a distinct four-note success sound');
    await page.evaluate(()=>clearInterval(boslukTimerInterval));
   }
  }
 }
 console.log({errors});assert.deepEqual(errors,[]);await browser.close();console.log('PASS: 4+4+4 memory pairs, eight visible cards, all three rounds, letter reveal, next word batch and viewport fit at 360/390/768px.');
})().catch(e=>{console.error(e);process.exit(1)});
