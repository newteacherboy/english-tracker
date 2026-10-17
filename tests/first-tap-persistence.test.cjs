const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('ingilizce/index.html','utf8');
const start=html.indexOf('  const saveReadyTasks = new Map();'),end=html.indexOf("  window.addEventListener('online', () => { loadRetries.clear();",start);
assert(start>0&&end>start,'real production account-save gate must exist in index.html');
const helper=html.slice(start,end);
function fixture(){
 let owner='alice',preparations=0,loads=0;
 const accepted=new Set(),pending={};
 const window={dmPrepareMemberState:async()=>{preparations++;await new Promise(resolve=>{pending.prepare=resolve;});return true;},
  yoSunucudanAl:async()=>{loads++;accepted.add(owner.toLowerCase());return true;}};
 vm.runInNewContext(helper,{window,benimsendi:accepted,kucuk:s=>String(s).toLowerCase(),isimAl:()=>owner,setTimeout:fn=>{fn();return 0;}});
 return {window,accepted,pending,owner:o=>{owner=o;},stats:()=>({loads,preparations})};
}
test('first gender/route click shares the same pending server-load handshake',async()=>{
 const f=fixture();
 const gender=f.window.dmMemberSaveReady('alice'),route=f.window.dmMemberSaveReady('alice');
 assert.equal(f.stats().preparations,1,'only one account initialization even with two clicks');
 assert.equal(f.stats().loads,0,'no server mutation while loading');
 f.pending.prepare();
 assert.equal(await gender,true);
 assert.equal(await route,true);
 assert.equal(f.stats().loads,1,'the first click is enough to load the authoritative save baseline');
 assert.equal(await f.window.dmMemberSaveReady('alice'),true);
 assert.equal(f.stats().loads,1,'later clicks do not load the account again');
});
test('switching account while a save is waiting cannot authorize the old user',async()=>{
 const f=fixture(),task=f.window.dmMemberSaveReady('alice');
 f.owner('bob');f.pending.prepare();
 await assert.rejects(task,/Hesap değişti/);
 assert.equal(f.stats().loads,0);
});
test('initial loading failure is clear and does not fake save readiness',async()=>{
 let owner='alice',fetches=0;
 const accepted=new Set(),window={dmPrepareMemberState:async()=>false,yoSunucudanAl:async()=>{fetches++;return false;}};
 vm.runInNewContext(helper,{window,benimsendi:accepted,kucuk:s=>String(s).toLowerCase(),isimAl:()=>owner,setTimeout:fn=>{fn();return 0;}});
 await assert.rejects(window.dmMemberSaveReady('alice'),/sunucudan alınamadı/);
 assert.equal(fetches,4,'bounded retries in the same user action, no infinite spinner');
 assert.equal(accepted.size,0);
});
test('first character selection checks account readiness before mutating character data',()=>{
 const start=html.indexOf('  function cinsBagla(kap, sonra)'),end=html.indexOf('  function atolyeCiz()',start);
 const handler=html.slice(start,end);
 assert(start>0&&end>start);
 const preflight=handler.indexOf('await window.dmMemberSaveReady(owner)'),mutation=handler.indexOf('yo.karakter={cins:c');
 assert(preflight>0&&mutation>preflight,'gender should never change state before the initial load');
 assert(handler.includes('if(owner!==aktifOgrenciAdi)return'),'account ownership checked after wait');
});
