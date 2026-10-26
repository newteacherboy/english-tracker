const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const DATA=require('../ingilizce/thematic-curriculum.json'),V8=require('../ingilizce/thematic-v8-candidate.js'),SCHOOL=require('../ingilizce/school-curriculum.js');
(async()=>{const browser=await chromium.launch({headless:true});fs.mkdirSync('/tmp/route-papi-flight',{recursive:true});try{
 for(const kind of ['learning','school'])for(const [width,height]of [[320,568],[390,844],[768,1024]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
  const words=[{en:'book',tr:'kitap'},{en:'good morning',tr:'günaydın'},{en:'classroom',tr:'derslik'},{en:'Friday',tr:'Cuma'}];
  const tasks=kind==='learning'?V8.build(DATA.chapters[0],null):SCHOOL.build(words,words,220151),start=kind==='learning'?4:2;let cursor=start,version=start,correct=0;
  const state=()=>({ok:true,chapter:kind==='learning'?1000:220151,deckVersion:kind==='learning'?8:9,cursor,version,accepted:true,finished:false,comboGain:correct===5?1:0,wallet:{energy:20+(correct===5?1:0),energyMax:25,gold:0,combo:correct},progress:[]});
  const advance=b=>{requests.push(b);if(b.action==='advance'){assert.equal(b.cursor,cursor);const g=(kind==='learning'?V8:SCHOOL).grade(tasks[cursor],b.answer);assert(g.correct);cursor++;version++;correct++;}return state();};
  await page.exposeFunction('schoolRequest',(action,payload)=>advance({action,...payload}));
  await page.route('https://route.test/**',async r=>{
   const u=new URL(r.request().url());if(u.pathname.endsWith('/thematic-learning'))return r.fulfill({json:advance(r.request().postDataJSON())});
   if(u.pathname==='/')return r.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@layer dmNoticeSurface,bilgiIslands;body{margin:0;font-family:system-ui}</style>'+['thematic-learning.css','learning-question-v1.css','school-soft-cards.css','route-practice-flight.css'].map(x=>'<link rel="stylesheet" href="'+x+'">').join('')+'<body><script>window.aktifOgrenciAdi="Ada";window.apiURL="https://route.test/functions/v1/diji-api";localStorage.setItem("ing_token","one");window.tones=[];window.vibrations=[];window.DMRouteQuestions={celebrate(){throw Error("old combo must not overlap")}};Object.defineProperty(navigator,"vibrate",{value:x=>vibrations.push(x)});window.SpeechSynthesisUtterance=function(text){this.text=text};speechSynthesis.cancel=()=>{};speechSynthesis.speak=u=>setTimeout(()=>u.onend?.(),80);window.AudioContext=class{constructor(){this.state="running";this.currentTime=0;this.destination={}}createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},start(){tones.push(1)},stop(){},disconnect(){}}}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}};</script>'+['learning-core.js','thematic-v8-candidate.js','route-practice-flight.js','thematic-learning.js'].map(x=>'<script src="'+x+'"></script>').join('')+'</body></html>'});
   const file=path.resolve('ingilizce','.'+u.pathname);return file.startsWith(path.resolve('ingilizce')+path.sep)&&fs.existsSync(file)?r.fulfill({path:file}):r.fulfill({status:404,body:''});
  });
  await page.goto('https://route.test/');
  async function open(){if(kind==='learning')await page.evaluate(()=>dmThematicLearning.open(1000,{intro:true}));else await page.evaluate(({words,tasks,session})=>dmThematicLearning.openSchool({chapter:{id:220151,routeNumber:1,cefr:'2. Sınıf',theme:'1. Ünite',title:'Okul Yolum',cards:words,examples:[],schoolTasks:tasks},session,request:schoolRequest}),{words,tasks,session:state()});await page.locator('.ml-entry-start').click();}
  await open();
  for(let i=0;i<5;i++){
   const task=tasks[start+i];if(task.kind==='choice')await page.locator('[data-answer="'+task.options.indexOf(task.answer)+'"]').click();else if(task.kind==='match')for(let j=0;j<task.pairs.length;j++){await page.locator('[data-left="'+j+'"]').click();await page.locator('[data-right="'+j+'"]').click();}else throw Error('unsupported fixture task');
   await page.waitForSelector('[data-next]');if(i<4){assert.equal(await page.locator('.dm-route-flight-combo').count(),0);await page.locator('[data-next]').click();}
  }
  await page.waitForSelector('.dm-route-flight-combo');assert.equal(correct,5);assert.match(await page.locator('[data-ml-energy]').textContent(),/^21/);
  const full=await page.locator('.dm-route-flight-combo').boundingBox();assert.equal(full.width,width);assert.equal(full.height,height);
  await page.waitForFunction(()=>document.querySelector('.dm-route-flight-energy')?.style.opacity==='1');await page.waitForTimeout(400);
  const badge=await page.locator('.dm-route-flight-energy').boundingBox(),caption=await page.locator('.dm-route-flight-energy-caption').boundingBox(),title=await page.locator('.dm-route-flight-copy').boundingBox();assert(badge.x>=0&&badge.x+badge.width<=width+1);assert(title.y+title.height<badge.y);assert(badge.y+badge.height<caption.y);assert.match(await page.locator('.dm-route-flight-energy').textContent(),/\+1ENERJİ/);
  assert.equal(await page.evaluate(()=>tones.length),8);assert.equal(await page.evaluate(()=>vibrations.length),1);
  const hasArt=await page.locator('.dm-route-flight-canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((x,i)=>i%4===3&&x>0));assert(hasArt);
  await page.screenshot({path:`/tmp/route-papi-flight/${kind}-${width}-combo.png`});const requestCount=requests.length;
  await page.waitForFunction(()=>!document.getElementById('dmRoutePracticeFlight'));assert.equal(requests.length,requestCount,'presentation must not write energy or answers');assert.equal(correct,5);
  await page.evaluate(()=>dmThematicLearning.close(true));await open();assert.equal(await page.locator('.dm-route-flight-combo').count(),0,'same acknowledged reward cannot replay');assert.deepEqual(errors,[]);await page.close();console.log('PASS combo',kind,width,height);
 }
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
