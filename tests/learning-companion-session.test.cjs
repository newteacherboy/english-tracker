const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function harness(){
  const source=fs.readFileSync(require('node:path').join(__dirname,'../ingilizce/learning-companion.js'),'utf8');
  const start=source.indexOf("let completionInFlight='';");
  const end=source.indexOf("document.addEventListener('dm:learning-progress'",start);
  assert.ok(start>=0&&end>start,'completion handler exists');
  let current='account-A',calls=0,refreshes=0,resolve;
  const gate=()=>new Promise(r=>{resolve=r});
  let pending=gate();
  const context={student:()=>true,identity:()=>current,today:()=> '2026-10-19',
    api:async()=>{calls++;await pending;},load:async()=>{refreshes++;},
    routePending:true};
  vm.runInNewContext(source.slice(start,end)+';globalThis.complete=lessonDone',context);
  return {context,change:id=>{current=id},resolve:()=>resolve(),newGate:()=>{pending=gate()},get calls(){return calls},get refreshes(){return refreshes}};
}

test('multiple completion events in one session do not start duplicate requests',async()=>{
 const h=harness();
 const a=h.context.complete(),b=h.context.complete();
 assert.equal(h.calls,1);h.resolve();await Promise.all([a,b]);
 assert.equal(h.refreshes,1);
});
test('a late response must not refresh a different signed-in account',async()=>{
 const h=harness();const a=h.context.complete();
 h.change('account-B');h.resolve();await a;
 assert.equal(h.refreshes,0);
});

function nextHarness({completed=['cafe'],all=false,late=false}={}){
 const source=fs.readFileSync(require('node:path').join(__dirname,'../ingilizce/learning-companion.js'),'utf8'),start=source.indexOf('async function nextDialogue('),end=source.indexOf('function applyCompanionReward',start);
 let current='a',finish,opened=[],libraries=0;const ctx={student:()=>true,identity:()=>current,bank:[{id:'cafe',type:'dialogue'},{id:'a-story',type:'story'},{id:'weather',type:'dialogue'}],load:()=>late?new Promise(r=>finish=r):Promise.resolve({dialogueIds:all?['cafe','weather']:completed}),openStory:id=>opened.push(id),dialogues:()=>libraries++,window:{yoToast(){}}};
 vm.runInNewContext(source.slice(start,end)+';globalThis.next=nextDialogue',ctx);
 return {ctx,opened,get libraries(){return libraries},change:()=>current='b',finish:()=>finish({dialogueIds:[]})};
}
test('plan dialogue shortcut skips completed dialogues and story content',async()=>{const h=nextHarness();await h.ctx.next();assert.deepEqual(h.opened,['weather']);assert.equal(h.libraries,0);});
test('completed dialogue bank opens the library instead of silently replaying a rewarded item',async()=>{const h=nextHarness({all:true});await h.ctx.next();assert.equal(h.opened.length,0);assert.equal(h.libraries,1);});
test('next dialogue does not open for a different account after a delayed summary',async()=>{const h=nextHarness({late:true});const pending=h.ctx.next();h.change();h.finish();await pending;assert.equal(h.opened.length,0);});
