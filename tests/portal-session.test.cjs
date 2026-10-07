const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('ingilizce/index.html','utf8');
const source=html.slice(html.indexOf('  /* Attach a token'),html.indexOf('  /* Sekme arka'));
const API='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
function setup(student='student',teacher=''){
  function storage(v){const m=new Map(v);return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
  const localStorage=storage([['ing_token',student]]),sessionStorage=storage(teacher?[['ing_ogr_token',teacher]]:[]),requests=[],alerts=[],events=[];
  let reloads=0;
  const window={fetch:(url,opt)=>new Promise(resolve=>requests.push({url,opt,resolve}))};
  const context={window,localStorage,sessionStorage,URL,Headers,location:{href:API,reload(){reloads++;}},alert:m=>alerts.push(m),document:{dispatchEvent:e=>events.push(e)},CustomEvent:class{constructor(type,data){this.type=type;this.detail=data.detail;}}};
  context.TOKEN=()=>localStorage.getItem('ing_token');context.OGRT=()=>sessionStorage.getItem('ing_ogr_token');
  vm.runInNewContext(source,context);
  async function respond(i,d){requests[i].resolve({clone:()=>({json:async()=>d})});await new Promise(resolve=>setImmediate(resolve));}
  return {window,localStorage,sessionStorage,requests,alerts,events,respond,get reloads(){return reloads;}};
}
test('late expiry from previous session cannot erase a newly signed-in session',async()=>{
  const s=setup('old');s.window.fetch(API,{method:'POST',body:'{"islem":"iletisimDurumu"}'});s.localStorage.setItem('ing_token','new');await s.respond(0,{hata:'oturum'});assert.equal(s.localStorage.getItem('ing_token'),'new');assert.equal(s.reloads,0);
});
test('expired teacher token is removed without logging out valid student',async()=>{
  const s=setup('student','old-teacher');s.window.fetch(API);await s.respond(0,{hata:'oturum'});assert.equal(s.sessionStorage.getItem('ing_ogr_token'),null);assert.equal(s.localStorage.getItem('ing_token'),'student');assert.equal(s.alerts.length,0);s.window.fetch(API);assert.equal(new URL(s.requests[1].url).searchParams.get('t'),'student');
});
test('explicit POST token controls which session an expiry belongs to',async()=>{
  const s=setup('student','teacher');s.window.fetch(API,{method:'POST',body:'{"t":"old-student"}'});await s.respond(0,{hata:'oturum'});assert.equal(s.localStorage.getItem('ing_token'),'student');assert.equal(s.sessionStorage.getItem('ing_ogr_token'),'teacher');
});
test('explicit GET token expiry cannot log out unrelated session',async()=>{
  const s=setup('new');s.window.fetch(API+'?t=old');await s.respond(0,{hata:'oturum'});assert.equal(s.localStorage.getItem('ing_token'),'new');assert.equal(s.reloads,0);
});
test('real expiry of current session clears it and notifies only once',async()=>{
  const s=setup();s.window.fetch(API);s.window.fetch(API);await s.respond(0,{hata:'oturum'});await s.respond(1,{hata:'oturum'});assert.equal(s.localStorage.getItem('ing_token'),null);assert.equal(s.alerts.length,1);assert.equal(s.reloads,1);
});
test('contact restriction from another session cannot freeze the current account',async()=>{
  const s=setup('new');s.window.fetch(API+'?t=old');await s.respond(0,{hata:'iletisim'});assert.equal(s.events.length,0);s.window.fetch(API);await s.respond(1,{hata:'iletisim'});assert.equal(s.events[0].type,'dm:contact-block');
});
test('valid teacher is outside the student contact policy, invalid session still rejected',()=>{
  const edge=fs.readFileSync('supabase/functions/diji-api/index.ts','utf8');
  const guards=edge.match(/if\(op==='iletisimDurumu' && !a\)[^]*?uyari:false\}\);/)[0];
  const run=a=>vm.runInNewContext('(function(){'+guards+'return "student";})()',{op:'iletisimDurumu',a,json:(body,status=200)=>({body,status})});
  assert.equal(run(null).status,401);assert.equal(run({role:'teacher'}).body.eksik,false);assert.equal(run({role:'teacher'}).status,200);assert.equal(run({role:'student'}),'student');
});
