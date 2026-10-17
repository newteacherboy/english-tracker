const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const core=await import('../supabase/functions/diji-api/verified-games.mjs'),base=path.resolve(__dirname,'../ingilizce'),html=fs.readFileSync(base+'/index.html','utf8');
 const anchor=html.indexOf('/* ================= 4) OYUN:'),begin=html.lastIndexOf('<script>',anchor),end=html.indexOf('</script>',anchor);let engine=html.slice(begin+8,end),tail=engine.lastIndexOf('})();');
 engine=engine.slice(0,tail)+"window.vfixture={start:()=>oyunBaslat(0,0),draw:i=>{O.i=i;O._cevaplandi=false;O.pendingAnswer=null;soruCiz()},state:()=>O};"+engine.slice(tail);
 const words=[{en:'apple',tr:'elma'},{en:'banana',tr:'muz'},{en:'orange',tr:'portakal'},{en:'pear',tr:'armut'}].sort((a,b)=>a.en.localeCompare(b.en,'en')),deck=core.compile('ba',words),evidence=[];
 const browser=await chromium.launch({executablePath:process.env.DIJI_CHROMIUM,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const setup=`<div id="tab-dunya"></div><script>var aktifOgrenciAdi='QA',apiURL='/api',yo={totalXp:1000000,altin:100,karakter:{sahip:[]}},siniftaOynananOgrenci='';window.genelEnerjiKalan=30;window.genelEnerjiMax=30;window.masterKelimeHavuzu=${JSON.stringify(words.map(w=>({ingilizce:w.en,turkce:w.tr,sinif:1,unite:1})))};window.yoHazirMi=()=>true;window.yoKaydet=()=>{};window.genelOyunGirisEngelliMi=()=>false;window.headerEnerjiGoster=()=>{};window.yoToast=console.log;window.DijiProgressRules={progress:()=>({level:40})};window.OC={aktif:{},basla(){this.aktif={}},dogru(){},yanlis(){},puan(){return 0}};window.dmParkurSahne=()=>'';window.dmParkurBaslik=()=>'';window.dmParkurDurakAdi=()=>'';window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;window.dmSchoolJourney={theme:()=> 'day'};window.dmLearningRoute={purpose:()=> 'school'};window.schoolAudioCalls=[];window.dmListen=(word)=>{window.schoolAudioCalls.push(word)};<\/script><script src="route-questions.js"></script><script src="verified-games.js"></script><script>${engine}</script>`;
 await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.pathname==='/')return r.fulfill({contentType:'text/html',body:setup});if(u.pathname==='/api'){const b=r.request().postDataJSON();if(b.islem==='verifiedGameStart')return r.fulfill({json:{ok:true,words,slots:deck.map((s,slot)=>({slot,en:s.en,pairs:s.pairs}))}});if(b.islem==='verifiedGameAnswer'){const g=core.grade(deck[b.slot],b.answer,'ba');evidence.push({slot:b.slot,answer:b.answer,...g});return r.fulfill({json:{ok:true,...g}});}return r.fulfill({json:{ok:true,enerjiKalan:28}});}const file=path.join(base,u.pathname.slice(1));return fs.existsSync(file)?r.fulfill({path:file}):r.fulfill({json:{ok:true}});});
 await page.goto('https://fixture.test/');await page.evaluate(()=>vfixture.start());assert.equal(await page.locator('#bzPerde').count(),1,'main path starts');
 for(let i=0;i<12;i++){
  if(i)await page.evaluate(i=>vfixture.draw(i),i);
  const task=deck[i];
  if(task.kind==='teach'){
   assert.equal(await page.locator('#bzAlan .dm-school-word').count(),words.length,'all vocabulary words visible together');
   assert.equal(await page.locator('#bzAlan .dm-school-start-questions').count(),1,'single continue to verified questions');
   assert.equal(await page.evaluate(()=>window.schoolAudioCalls.length),0,'no automatic audio at teaching start');
   await page.locator('#bzAlan [data-rq-word="0"]').click();
   assert.equal(await page.evaluate(()=>window.schoolAudioCalls.length),1,'learner-controlled vocabulary listening');
   await page.locator('#bzAlan .dm-school-start-questions').click();
 }
  else if(task.kind==='eslestir'){for(const w of task.pairs){await page.locator('#bzMatchEn button').filter({hasText:new RegExp('^'+w.en+'$')}).click();await page.locator('#bzMatchTr button').filter({hasText:new RegExp('^'+w.tr+'$')}).click();}}
  else if(task.kind==='eksik'){await page.evaluate(en=>{for(const slot of document.querySelectorAll('#bzAlan [data-s]')){const letter=en[Number(slot.dataset.s)];const b=[...document.querySelectorAll('#bzAlan [data-h]:not(.bos)')].find(b=>b.textContent===letter);b.click();}document.getElementById('bzKontrol').click();},task.en);}
  else if(['wordOrder','patternOrder'].includes(task.kind)){const tokens=task.expected.includes(' ')?task.expected.split(/\s+/):[...task.expected];for(const token of tokens)await page.locator('.rq-token-pool button:enabled').filter({hasText:new RegExp('^'+token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')}).first().click();}
  else {if(task.kind==='soyle')await page.locator('.rq-microphone').click();await page.locator('#bzAlan .bz-sec').filter({hasText:new RegExp('^'+task.expected.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')}).first().click();}
  for(let tries=0;tries<100&&!evidence.some(e=>e.slot===i);tries++)await new Promise(ok=>setTimeout(ok,40));const actual=evidence.filter(e=>e.slot===i).at(-1);assert(actual?.valid&&actual.correct,'authoritative input for '+task.kind+': '+JSON.stringify(actual));console.log('PASS Parkur',i+1,task.kind);
 }
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS all 12 real Parkur controls against authoritative grader');
})().catch(e=>{console.error(e);process.exit(1)});
