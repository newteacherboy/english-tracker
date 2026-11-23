const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const code=fs.readFileSync('ingilizce/parent-center.js','utf8');
const flush=()=>new Promise(r=>setTimeout(r,10));
function fixture(student=false,questionType="choice",poolCount=1){
 const dom=new JSDOM('<main id="parentApp"></main>',{url:'https://app.test/veli-paneli.html'+(student?'?ogrenci=1':''),runScripts:'outside-only'});
 const w=dom.window,calls=[],sounds=[];w.dmAnswerAudio={play:(...args)=>sounds.push(args)};
 w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.localStorage.setItem('dm_parent_session_v1','parent-token');
 w.localStorage.setItem('ing_token','student-token');
 const id='11111111-1111-4111-8111-111111111111';
 const parent={name:'Veli',email:'test@example.invalid',verified:true,settings:{}};
 const child={id,full_name:'Test Çocuk',plan:'free'};
 const practice={id:'22222222-2222-4222-8222-222222222222',kind:'test',cursor:0,total:5,correct:0,answers:[],settings:{},createdAt:new Date().toISOString(),question:{type:questionType,en:'apple',tr:'elma',options:['apple','book']}};
 const dashboard={student:{name:'Test Çocuk',streak:2,classNo:5},plan:'free',activity:{'2026-11-23':1},goal:{days:4,minutes:10},notices:[],words:[{en:'apple',tr:'elma'}],summary:'Bir etkinlik tamamlandı.',history:[practice],usage:{tests:0,games:0},totalStops:1};
 w.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);calls.push(body);
  if(body.islem==='parentGoal')dashboard.goal={days:body.days,minutes:body.minutes};
  const result=body.islem==='parentStart'?{ok:true,practice:{...practice,kind:body.kind,feature:body.feature,settings:{...body.settings,words:dashboard.words},question:{...practice.question,type:body.settings.types[0]}}}:body.islem==='parentMe'?{ok:true,parent,children:[child]}:body.islem==='parentStudentPractice'?{ok:true,practices:[practice]}:body.islem==='parentResume'||body.islem==='parentStudentResume'?{ok:true,practice}:body.islem==='parentPool'?{ok:true,words:Array.from({length:poolCount},()=>({en:'apple'}))}:body.islem==='parentAnswer'||body.islem==='parentStudentAnswer'?{ok:true,practice:{...practice,cursor:1,correct:1,answers:[{en:'apple',tr:'elma',correct:true}]}}:{ok:true,...dashboard};
  return {ok:true,json:async()=>result};
 };
 w.eval(code);return {w,calls,sounds};
}
test('parent workspace changes tabs, configures a test and persists a single answer',async()=>{
 const {w,calls}=fixture();try{
  await flush();assert.equal(w.document.querySelectorAll('.pc-nav button').length,4);
  w.document.querySelector('[data-tab="practice"]').click();await flush();
  w.document.querySelector('[data-action="setup"]').click();await flush();
  assert(w.document.querySelector('[name="types"][value="image"]'));
  w.document.querySelector('[data-action="pool"]').click();await flush();
  assert.match(w.document.getElementById('pcPool').textContent,/1 kelime/);
  w.document.querySelector('[data-tab="growth"]').click();await flush();
  w.document.querySelector('[data-action="history"]').click();await flush();
  w.document.querySelector('[data-action="resume"]').click();await flush();
  w.document.querySelector('[data-action="answer-choice"]').click();await flush();
  w.document.querySelector('[data-action="check"]').click();await flush();
  assert.equal(calls.filter(c=>c.islem==='parentAnswer').length,1);
  assert.match(w.document.body.textContent,/Doğru cevap/);
  assert.equal(w.localStorage.getItem('ing_token'),'student-token');
 }finally{w.close();}
});
test('student home practice uses the student token and resumes the same server practice',async()=>{
 const {w,calls}=fixture(true);try{
  await flush();assert.equal(calls[0].islem,'parentStudentPractice');assert.equal(calls[0].t,'student-token');
  w.document.querySelector('[data-action="resume"]').click();await flush();
  assert.equal(calls.at(-1).islem,'parentStudentResume');
  assert.match(w.document.body.textContent,/Soru 1 \/ 5/);
 }finally{w.close();}
});

test('child picker offers add student and account settings expose the existing account switch handoff',async()=>{
 const {w}=fixture();try{await flush();w.document.querySelector('[data-action="children"]').click();await flush();assert(w.document.querySelector('[data-action="link"]'));w.document.querySelector('[data-action="back"]').click();await flush();w.document.querySelector('[data-tab="family"]').click();await flush();w.document.querySelector('[data-action="account"]').click();await flush();assert(w.document.querySelector('[data-action="switch-account"]'));}finally{w.close();}
});
test('matching question shows the missing Turkish prompt and hides unrelated navigation',async()=>{
 const {w}=fixture(false,'match');try{await flush();w.document.querySelector('[data-tab="practice"]').click();await flush();w.document.querySelector('[data-action="history"]').click();await flush();w.document.querySelector('[data-action="resume"]').click();await flush();assert.equal(w.document.querySelector('.pc-question-prompt').textContent,'elma');assert(!w.document.querySelector('.pc-nav'));assert(w.document.querySelector('[data-action="check"]').disabled);}finally{w.close();}
});
test('zero visual pool prevents starting and offers a clear usable text fallback',async()=>{
 const {w}=fixture(false,'choice',0);try{await flush();w.document.querySelector('[data-tab="practice"]').click();await flush();w.document.querySelector('[data-action="setup"]').click();await flush();const image=w.document.querySelector('[name="types"][value="image"]');image.checked=true;w.document.querySelector('[data-action="pool"]').click();await flush();assert(w.document.querySelector('[data-start]').disabled);assert(w.document.querySelector('[data-action="text-test"]'));assert(!w.document.getElementById('pcPool').textContent.includes('Soru sayısını azalt'));}finally{w.close();}
});

test('parent handoff opens the existing account picker without adding a duplicate switching system',async()=>{
 const dom=new JSDOM('<div id="login-container"><form id="loginForm"><input id="ogrenci"><input id="sifre"><button id="girisBtn">Giriş</button><p id="mesaj"></p></form></div>',{url:'https://app.test/ingilizce/',runScripts:'outside-only'}),w=dom.window;
 try{let login=0;w.sessionStorage.setItem('dm_open_account_picker','1');w.dmFirstDiscovery={openLogin:()=>login++};w.dmSavedSessions={remember(){},list:()=>[],current:()=>null};w.eval(fs.readFileSync('ingilizce/account-switch.js','utf8'));await flush();assert.equal(login,1);assert(w.document.getElementById('dmSwitchDialog'));assert.equal(w.sessionStorage.getItem('dm_open_account_picker'),null);assert(w.document.getElementById('dmSwitchAdd'));}finally{w.close();}
});

test('a confirmed answer stays on the original Parkur board and produces one feedback sound',async()=>{
 const {w,sounds}=fixture();try{await flush();w.document.querySelector('[data-tab="practice"]').click();await flush();w.document.querySelector('[data-action="history"]').click();await flush();w.document.querySelector('[data-action="resume"]').click();await flush();const board=w.document.getElementById('bzAlan');w.document.querySelector('[data-action="answer-choice"]').click();await flush();w.document.querySelector('[data-action="check"]').click();await flush();assert.equal(w.document.getElementById('bzAlan'),board);assert(w.document.querySelector('.bz-sec.dogru'));assert(w.document.querySelector('#pcFeedback strong').textContent.includes('Doğru'));assert(w.document.querySelector('[data-action="next-question"]'));assert.equal(sounds.length,1);assert.equal(sounds[0][0],true);}finally{w.close();}
});
test('flashcards rate with sound, finish without looping, and scope the short test to the studied words',async()=>{
 const {w,calls,sounds}=fixture();try{await flush();w.document.querySelector('[data-tab="practice"]').click();await flush();w.document.querySelector('[data-action="cards"]').click();await flush();assert(w.document.querySelector('.rq-speaker-disc'));assert(w.document.querySelector('[data-action="card-prev"]').disabled);w.document.querySelector('[data-action="card-rate"][data-good="1"]').click();await flush();assert.equal(sounds[0][0],true);w.document.querySelector('[data-action="card-next"]').click();await flush();assert(w.document.querySelector('[data-action="cards-test"]'));w.document.querySelector('[data-action="cards-test"]').click();await flush();w.document.querySelector('[data-action="pool"]').click();await flush();const request=calls.at(-1);assert.equal(request.settings.count,1);assert.deepEqual(request.settings.wordKeys,['apple|elma']);}finally{w.close();}
});
test('weekly schedule changes days without creating or charging another personalized plan',async()=>{
 const {w,calls}=fixture();try{await flush();w.document.querySelector('[data-tab="practice"]').click();await flush();w.document.querySelector('[data-action="weekly"]').click();await flush();assert.equal(w.document.querySelectorAll('.pc-program-grid button').length,4);const form=w.document.querySelector('[data-form="program-days"]');form.elements.days.value='6';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await flush();await flush();assert.equal(w.document.querySelectorAll('.pc-program-grid button').length,6);assert.equal(calls.filter(c=>c.islem==='parentStart').length,1);assert(calls.some(c=>c.islem==='parentGoal'&&c.days===6));}finally{w.close();}
});
