const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const DATA=require('../ingilizce/thematic-curriculum.json'),CORE=require('../ingilizce/learning-core.js'),V8=require('../ingilizce/thematic-v8-candidate.js'),SCHOOL=require('../ingilizce/school-curriculum.js');
for(const kind of ['learning','school'])test(kind+': only a new server-confirmed combo reward opens one flight',async()=>{
 const dom=new JSDOM('<body></body>',{url:'https://route.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;let cursor=kind==='learning'?4:2,version=cursor,count=0,mode='ok',flights=[],fallbacks=0;
 const words=[{en:'book',tr:'kitap'},{en:'good morning',tr:'günaydın'},{en:'classroom',tr:'derslik'},{en:'Friday',tr:'Cuma'}],tasks=kind==='learning'?V8.build(DATA.chapters[0],null):SCHOOL.build(words,words,220151);
 try{
 w.DMLearningCore=CORE;w.DMThematicV8Candidate=V8;w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.matchMedia=()=>({matches:false});w.apiURL='https://route.test/functions/v1/diji-api';w.aktifOgrenciAdi='Ada';w.localStorage.setItem('ing_token','one');w.dmRoutePracticeFlight={prepare(){},cancel(){},playCombo:o=>{flights.push(o);return Promise.resolve(true);}};w.DMRouteQuestions={celebrate(){fallbacks++;}};
 const response=()=>({ok:true,chapter:kind==='learning'?1000:220151,deckVersion:kind==='learning'?8:9,cursor,version,accepted:mode!=='rejected',stale:mode==='stale',alreadyCompleted:mode==='duplicate',replay:mode==='replay',comboGain:count?1:0,wallet:{energy:23,energyMax:25,gold:0,combo:5}});
 const request=async(action)=>{if(action==='advance'){cursor++;if(mode!=='same-version')version++;count++;}return response();};
 w.fetch=async(url,opt)=>({ok:true,json:async()=>opt?.body?request(JSON.parse(opt.body).action):DATA});w.eval(fs.readFileSync('ingilizce/thematic-learning.js','utf8'));
 async function open(){if(kind==='learning')await w.dmThematicLearning.open(1000,{intro:true});else await w.dmThematicLearning.openSchool({chapter:{id:220151,routeNumber:1,cefr:'2. Sınıf',theme:'1. Ünite',title:'Okul Yolum',cards:words,examples:[],schoolTasks:tasks},session:response(),request});w.document.querySelector('.ml-entry-start').click();}
 // Open/status and stale/duplicate/replay/rejected acknowledgements must not announce a reward.
 for(const flag of ['stale','duplicate','replay','rejected']){count=0;cursor=kind==='learning'?4:2;mode=flag;await open();w.document.querySelector('[data-answer]').click();for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));assert.equal(flights.length,0,flag);w.dmThematicLearning.close(true);}
 count=0;cursor=kind==='learning'?4:2;mode='ok';await open();w.document.querySelector('[data-answer]').click();for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));assert.equal(flights.length,1);assert.equal(flights[0].gain,1);assert.equal(flights[0].isCurrent(),true);assert.equal(fallbacks,0);
 // The identical reward version can reappear in a resumed response; it is not replayed.
 w.dmThematicLearning.close(true);assert.equal(flights[0].isCurrent(),false);await open();await new Promise(r=>setImmediate(r));assert.equal(flights.length,1);
 w.aktifOgrenciAdi='Bora';assert.equal(flights[0].isCurrent(),false);
 }finally{w.close();}
});
