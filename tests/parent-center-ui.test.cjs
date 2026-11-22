const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const code=fs.readFileSync('ingilizce/parent-center.js','utf8');
const flush=()=>new Promise(r=>setTimeout(r,10));
function fixture(student=false){
 const dom=new JSDOM('<main id="parentApp"></main>',{url:'https://app.test/veli-paneli.html'+(student?'?ogrenci=1':''),runScripts:'outside-only'});
 const w=dom.window,calls=[];
 w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.localStorage.setItem('dm_parent_session_v1','parent-token');
 w.localStorage.setItem('ing_token','student-token');
 const id='11111111-1111-4111-8111-111111111111';
 const parent={name:'Veli',email:'test@example.invalid',verified:true,settings:{}};
 const child={id,full_name:'Test Çocuk',plan:'free'};
 const practice={id:'22222222-2222-4222-8222-222222222222',kind:'test',cursor:0,total:5,correct:0,answers:[],settings:{},createdAt:new Date().toISOString(),question:{type:'choice',en:'apple',tr:'elma',options:['apple','book']}};
 const dashboard={student:{name:'Test Çocuk',streak:2,classNo:5},plan:'free',activity:{'2026-11-23':1},goal:{days:4,minutes:10},notices:[],words:[{en:'apple',tr:'elma'}],summary:'Bir etkinlik tamamlandı.',history:[practice],usage:{tests:0,games:0},totalStops:1};
 w.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);calls.push(body);
  const result=body.islem==='parentMe'?{ok:true,parent,children:[child]}:body.islem==='parentStudentPractice'?{ok:true,practices:[practice]}:body.islem==='parentResume'||body.islem==='parentStudentResume'?{ok:true,practice}:body.islem==='parentPool'?{ok:true,words:[{en:'apple'}]}:body.islem==='parentAnswer'||body.islem==='parentStudentAnswer'?{ok:true,practice:{...practice,cursor:1,correct:1,answers:[{en:'apple',tr:'elma',correct:true}]}}:{ok:true,...dashboard};
  return {ok:true,json:async()=>result};
 };
 w.eval(code);return {w,calls};
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
