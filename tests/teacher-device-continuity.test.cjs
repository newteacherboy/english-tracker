const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const boot=fs.readFileSync('ingilizce/teacher-portal-boot.js','utf8'),saved=fs.readFileSync('ingilizce/saved-sessions.js','utf8');
const storage=(values={})=>{const s={getItem:k=>Object.hasOwn(s,k)?s[k]:null,setItem:(k,v)=>s[k]=String(v),removeItem:k=>delete s[k]};Object.entries(s).forEach(([k,v])=>Object.defineProperty(s,k,{value:v,enumerable:false}));for(const [k,v]of Object.entries(values))s.setItem(k,v);return s;};
const portal={teacherToken:'owner-token',name:'teacher',participant:{token:'preview-token',name:'Önizleme'},route:'panel'};
function page(native=storage(),session=storage(),search='',reply={status:200,ok:true,data:{ok:true,rol:'ogretmen',ogrenci:'teacher'}}){
 const events={},calls=[],location={search,pathname:'/ingilizce/',href:'https://app.test/ingilizce/'+search,hash:'',assign:u=>calls.push(['assign',u]),replace:u=>calls.push(['replace',u]),reload:()=>calls.push(['reload'])};
 const w={localStorage:native,sessionStorage:session,location,addEventListener:(n,f)=>(events[n]||=[]).push(f)};const ctx={window:w,sessionStorage:session,localStorage:native,location,URL,URLSearchParams,Object,Date,JSON,AbortController,console,history:{replaceState(_a,_b,url){location.search=new URL(url,'https://app.test').search;}},document:{documentElement:{classList:{add(){}}},addEventListener:(n,f)=>(events[n]||=[]).push(f)},apiURL:'https://app.test/api',fetch:async(_u,opt)=>{calls.push(['request',JSON.parse(opt.body)]);return {status:reply.status,ok:reply.ok,json:async()=>reply.data};},setTimeout:()=>1,clearTimeout(){}};w.fetch=ctx.fetch;vm.createContext(ctx);vm.runInContext(boot,ctx);ctx.localStorage=w.localStorage;return {w,ctx,native,session,location,calls,events,installSaved(){vm.runInContext(saved,ctx);}};
}
test('reopening after the teacher was last used restores the code session and route without touching personal data',()=>{
 const native=storage({ing_token:'personal-token',ing_aktifOgrenci:'Ada'}),first=page(native);first.w.dmTeacherDevice.remember(portal);
 const reopened=page(native,storage());assert.equal(reopened.w.dmTeacherPortalMode,true);assert.equal(reopened.location.search,'?ogretmen=1');assert.equal(JSON.parse(reopened.session.getItem('dm_tp_session')).route,'panel');assert.equal(reopened.w.localStorage.getItem('ing_token'),'preview-token');assert.equal(native.getItem('ing_token'),'personal-token');assert.equal(reopened.w.genelEnerjiKalan,25);
});
test('the account picker merges code teachers and personal accounts, using the code identity as current',()=>{
 const native=storage({ing_token:'personal-token',ing_aktifOgrenci:'Ada',dm_saved_sessions_v1:JSON.stringify([{name:'Ada',token:'personal-token',role:'ogrenci'}])});page(native).w.dmTeacherDevice.remember(portal);const opened=page(native);opened.installSaved();assert.equal(opened.w.dmSavedSessions.current().role,'ogretmen-kod');assert.deepEqual(Array.from(opened.w.dmSavedSessions.list(),x=>x.name),['Ada','teacher']);assert.equal(native.getItem('ing_token'),'personal-token');
});
test('switching to a personal account preserves remembered teachers and hands off only after validation',async()=>{
 const native=storage({ing_token:'old-personal',ing_aktifOgrenci:'Ada'});page(native).w.dmTeacherDevice.remember(portal);const opened=page(native,storage(),'',{status:200,ok:true,data:{ok:true,rol:'ogrenci',ogrenci:'Bora'}});opened.installSaved();await opened.w.dmSavedSessions.activate({name:'Bora',token:'bora-token',role:'ogrenci'});assert.equal(native.getItem('ing_token'),'old-personal');assert.equal(JSON.parse(opened.session.getItem('dm_session_handoff_v1')).token,'bora-token');assert.equal(opened.w.dmTeacherDevice.list().length,1);assert.deepEqual(opened.calls.at(-1),['assign','./?hesap=1']);const next=page(native,storage());assert.equal(next.w.dmTeacherPortalMode,undefined);
});
test('logout removes the current code session and does not resume it on the next startup',()=>{
 const native=storage({ing_token:'personal-token'}),first=page(native);first.w.dmTeacherDevice.remember(portal);const opened=page(native);opened.w.dmTeacherPortalExit();assert.equal(opened.w.dmTeacherDevice.list().length,0);assert.equal(opened.session.getItem('dm_tp_session'),null);assert.equal(native.getItem('ing_token'),'personal-token');assert.equal(page(native).w.dmTeacherPortalMode,undefined);
});
test('explicit personal/login entry bypasses auto-resume and a server-expired teacher token is removed',async()=>{
 const native=storage(),first=page(native);first.w.dmTeacherDevice.remember(portal);assert.equal(page(native,storage(),'?hesap=1').w.dmTeacherPortalMode,undefined);
 const expired=page(native,storage(),'',{status:401,ok:false,data:{ok:false}});await new Promise(r=>setImmediate(r));assert.equal(expired.w.dmTeacherDevice.list().length,0);assert(expired.calls.some(c=>c[0]==='replace'&&c[1]==='./?ogretmenGiris=1'));
});
test('selecting a saved code teacher validates its own token and keeps personal storage unchanged',async()=>{
 const native=storage({ing_token:'personal-token',ing_aktifOgrenci:'Ada'}),opened=page(native,storage(),'?hesap=1');opened.w.dmTeacherDevice.remember(portal,false);opened.installSaved();await opened.w.dmSavedSessions.activate(opened.w.dmSavedSessions.list().find(x=>x.role==='ogretmen-kod'));assert.equal(native.getItem('ing_token'),'personal-token');assert.equal(JSON.parse(opened.session.getItem('dm_tp_session')).teacherToken,'owner-token');assert.deepEqual(opened.calls.at(-1),['assign','./?ogretmen=1']);
});
test('network errors never erase the remembered teacher session',async()=>{
 const native=storage();page(native).w.dmTeacherDevice.remember(portal);const opened=page(native,storage(),'',{status:503,ok:false,data:{ok:false}});await new Promise(r=>setImmediate(r));assert.equal(opened.w.dmTeacherDevice.list().length,1);assert(!opened.calls.some(c=>c[0]==='replace'));
});
