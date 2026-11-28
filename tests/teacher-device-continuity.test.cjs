const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const boot=fs.readFileSync('ingilizce/teacher-portal-boot.js','utf8'),saved=fs.readFileSync('ingilizce/saved-sessions.js','utf8');
const storage=(values={})=>{const s={getItem:k=>Object.hasOwn(s,k)?s[k]:null,setItem:(k,v)=>s[k]=String(v),removeItem:k=>delete s[k]};Object.entries(s).forEach(([k,v])=>Object.defineProperty(s,k,{value:v,enumerable:false}));for(const [k,v]of Object.entries(values))s.setItem(k,v);return s;};
const portal={teacherToken:'owner-token',name:'teacher',participant:{token:'preview-token',name:'Önizleme'},route:'panel'};
function page(native=storage(),session=storage(),search='',reply={status:200,ok:true,data:{ok:true,rol:'ogretmen',ogrenci:'teacher'}}){
 const events={},calls=[],location={search,pathname:'/ingilizce/',href:'https://app.test/ingilizce/'+search,hash:'',assign:u=>calls.push(['assign',u]),replace:u=>calls.push(['replace',u]),reload:()=>calls.push(['reload'])};
 const w={localStorage:native,sessionStorage:session,location,addEventListener:(n,f)=>(events[n]||=[]).push(f)};const ctx={window:w,sessionStorage:session,localStorage:native,location,URL,URLSearchParams,Object,Date,JSON,AbortController,console,history:{replaceState(_a,_b,url){location.search=new URL(url,'https://app.test').search;}},document:{readyState:'loading',createElement:()=>({setAttribute(){}}),documentElement:{classList:{add(){}}},addEventListener:(n,f)=>(events[n]||=[]).push(f)},apiURL:'https://app.test/api',fetch:async(_u,opt)=>{const body=JSON.parse(opt.body);calls.push(['request',body]);const response=typeof reply==='function'?reply(body):reply;return {status:response.status,ok:response.ok,json:async()=>response.data};},setTimeout:()=>1,setInterval:()=>1,clearTimeout(){}};w.fetch=ctx.fetch;vm.createContext(ctx);vm.runInContext(boot,ctx);ctx.localStorage=w.localStorage;return {w,ctx,native,session,location,calls,events,installSaved(){vm.runInContext(saved,ctx);}};
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
 const native=storage(),first=page(native);first.w.dmTeacherDevice.remember(portal);
 for(const query of ['?hesap=1','?giris=1','?kayit=1','?kesifKayit=google','?ogretmenGiris=1']){
  const opened=page(native,storage(),query);
  assert.equal(opened.w.dmTeacherPortalMode,undefined,query);
  assert.equal(opened.location.search,query);
 }
 const expired=page(native,storage(),'',{status:401,ok:false,data:{ok:false}});await new Promise(r=>setImmediate(r));assert.equal(expired.w.dmTeacherDevice.list().length,0);assert(expired.calls.some(c=>c[0]==='replace'&&c[1]==='./?baslangic=1'));
});
test('a rejected explicit teacher session returns to teacher sign-in',async()=>{
 const session=storage({dm_tp_session:JSON.stringify(portal)});
 const expired=page(storage(),session,'?ogretmen=1',{status:401,ok:false,data:{ok:false}});
 await new Promise(r=>setImmediate(r));
 assert.deepEqual(expired.calls.at(-1),['replace','./?ogretmenGiris=1']);
});
test('selecting a saved code teacher validates its own token and keeps personal storage unchanged',async()=>{
 const native=storage({ing_token:'personal-token',ing_aktifOgrenci:'Ada'}),opened=page(native,storage(),'?hesap=1');opened.w.dmTeacherDevice.remember(portal,false);opened.installSaved();await opened.w.dmSavedSessions.activate(opened.w.dmSavedSessions.list().find(x=>x.role==='ogretmen-kod'));assert.equal(native.getItem('ing_token'),'personal-token');assert.equal(JSON.parse(opened.session.getItem('dm_tp_session')).teacherToken,'owner-token');assert.deepEqual(opened.calls.at(-1),['assign','./?ogretmen=1']);
});
test('network errors never erase the remembered teacher session',async()=>{
 const native=storage();page(native).w.dmTeacherDevice.remember(portal);const opened=page(native,storage(),'',{status:503,ok:false,data:{ok:false}});await new Promise(r=>setImmediate(r));assert.equal(opened.w.dmTeacherDevice.list().length,1);assert(!opened.calls.some(c=>c[0]==='replace'));
});
test('personal-account return is a switch and retains the teacher for the account picker',()=>{
 const native=storage({ing_token:'personal-token'});page(native).w.dmTeacherDevice.remember(portal);const opened=page(native);opened.w.dmTeacherPortalPersonal();assert.equal(opened.w.dmTeacherDevice.list().length,1);assert.equal(opened.session.getItem('dm_tp_session'),null);assert.equal(page(native).w.dmTeacherPortalMode,undefined);assert.equal(native.getItem('ing_token'),'personal-token');
});

test('teacher Parkur shortcut handoffs the teacher-linked personal account instead of last device user',async()=>{
 const native=storage({ing_token:'other-personal-token',ing_aktifOgrenci:'Ada'});
 const first=page(native);first.w.dmTeacherDevice.remember(portal);
 const opened=page(native);
 opened.ctx.document.querySelector=()=>null;
 opened.ctx.alert=message=>{throw Error('Unexpected alert: '+message)};
 opened.ctx.fetch=async(_url,opt)=>{
  const request=JSON.parse(opt.body);
  assert.equal(request.islem,'teacherPortalPersonalSession');
  assert.equal(request.t,'owner-token');
  return {ok:true,status:200,json:async()=>({ok:true,token:'teacher-own-student-token',name:'TeacherOne',role:'ogrenci'})};
 };
 await opened.w.dmTeacherPortalParkur();
 assert.deepEqual(opened.calls.at(-1),['assign','./']);
 assert.equal(opened.session.getItem('dm_tp_session'),null);
 assert.equal(native.getItem('ing_token'),'other-personal-token','old device session is unchanged until next startup');
 const handoff=JSON.parse(opened.session.getItem('dm_session_handoff_v1'));
 assert.equal(handoff.token,'teacher-own-student-token');
 assert.equal(handoff.name,'TeacherOne');
 assert.equal(handoff.previous,'other-personal-token');
 assert.equal(opened.w.dmTeacherDevice.list().length,1);
});
test('teacher Parkur shortcut never opens another personal account when server rejects it',async()=>{
 const native=storage({ing_token:'other-personal-token',ing_aktifOgrenci:'Ada'});
 const first=page(native);first.w.dmTeacherDevice.remember(portal);
 const opened=page(native);
 opened.ctx.document.querySelector=()=>null;
 let error='';
 opened.ctx.alert=message=>{error=message};
 opened.ctx.fetch=async(_url,opt)=>({ok:false,status:403,json:async()=>({ok:false,mesaj:'Kişisel hesap bulunamadı.'})});
 await opened.w.dmTeacherPortalParkur();
 assert.equal(error,'Kişisel hesap bulunamadı.');
 assert.equal(opened.session.getItem('dm_tp_session')!==null,true);
 assert.equal(opened.session.getItem('dm_session_handoff_v1'),null);
 assert.equal(native.getItem('ing_token'),'other-personal-token');
 assert(!opened.calls.some(c=>c[0]==='assign'&&c[1]==='./'));
});

test('native restart at the persisted teacher URL rehydrates local teacher session before redirecting',()=>{
 const native=storage({ing_token:'personal-token',ing_aktifOgrenci:'Ada'}),first=page(native);
 first.w.dmTeacherDevice.remember(portal);
 const opened=page(native,storage(),'?ogretmen=1');
 assert.equal(opened.w.dmTeacherPortalMode,true);
 assert.equal(opened.location.search,'?ogretmen=1');
 assert.equal(JSON.parse(opened.session.getItem('dm_tp_session')).teacherToken,'owner-token');
 assert(!opened.calls.some(c=>c[0]==='replace'),'must not request the teacher code again');
 assert.equal(native.getItem('ing_token'),'personal-token');
});
test('stale native teacher route with no usable saved session returns to account selection',()=>{
 const native=storage({ing_token:'personal-token',dm_last_account_v1:JSON.stringify({kind:'teacher',token:'missing'})});
 const opened=page(native,storage(),'?ogretmen=1');
 assert.equal(opened.w.dmTeacherPortalMode,undefined);
 assert.deepEqual(opened.calls.at(-1),['replace','./?hesap=1']);
 assert.equal(native.getItem('ing_token'),'personal-token');
});
test('expired resumed teacher uses account picker instead of another teacher-code request',async()=>{
 const native=storage({ing_token:'personal-token'}),first=page(native);
 first.w.dmTeacherDevice.remember(portal);
 const opened=page(native,storage(),'',{status:401,ok:false,data:{ok:false}});
 await new Promise(r=>setImmediate(r));
 assert(opened.calls.some(c=>c[0]==='replace'&&c[1]==='./?hesap=1'));
 assert.equal(opened.w.dmTeacherDevice.list().length,0);
});
test('explicit teacher deep link still asks for code if no teacher session was selected',()=>{
 const opened=page(storage(),storage(),'?ogretmen=1');
 assert.deepEqual(opened.calls.at(-1),['replace','./?ogretmenGiris=1']);
});

test('a previously signed-in teacher whose branch is pending resumes only the linked personal account',async()=>{
 const native=storage({ing_token:'other-device-personal',ing_aktifOgrenci:'Other'});page(native).w.dmTeacherDevice.remember(portal);
 const reopened=page(native,storage(),'',body=>body.islem==='teacherPortalBranchResume'?{status:200,ok:true,data:{ok:true,personal:true,token:'linked-personal-token',name:'TeacherPersonal',role:'ogrenci',branchStatus:'pending'}}:{status:401,ok:false,data:{ok:false}});
 await new Promise(r=>setImmediate(r));
 const handoff=JSON.parse(reopened.session.getItem('dm_session_handoff_v1'));
 assert.equal(handoff.token,'linked-personal-token');assert.equal(handoff.previous,'other-device-personal');
 assert.equal(reopened.w.dmTeacherDevice.list().length,0);assert.equal(reopened.session.getItem('dm_tp_session'),null);
 assert.deepEqual(reopened.calls.at(-1),['replace','./']);
});
