const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const cryptoNode=require('node:crypto');
function fixture(kind,role='student',portal=false){
 const folder={learning:'thematic-learning',oral:'teacher-oral',race:'kelime-rallisi'}[kind];
 const c={crypto,TextEncoder,Request,Response,URLSearchParams,console,DATA:{chapters:[]},DMLearningCore:{}};vm.createContext(c);
 const source=fs.readFileSync('supabase/functions/'+folder+'/core.ts','utf8').replace(/^import[^\n]+\n/gm,'');
 const name={learning:'thematicHandler',oral:'oralHandler',race:'raceHandler'}[kind];
 vm.runInContext(stripTypeScriptTypes(source,{mode:'transform'}).replaceAll('export ','')+';globalThis.make='+name,c);
 const session={role,student_id:role==='student'?'pupil':null,teacher_id:role==='teacher'?'teacher':null,expires_at:'2099-01-01',token_hash:cryptoNode.createHash('sha256').update('token').digest('hex'),...(portal?{teacher_portal_access_id:'grant',teacher_portal_version:1}:{})};
 const pupil={id:'pupil',teacher_id:'teacher',role:'student',status:'approved',frozen_at:null};
 const teacher={id:'teacher',active:true,frozen_at:null,username:'teacher',is_admin:true};
 const owner={id:'owner',role:'student',status:'approved',frozen_at:null,email_verified_at:'2026-10-01'};
 const grant={id:'grant',teacher_id:'teacher',student_id:'owner',state:'approved',version:1};
 const tables={portal_sessions:[session],students:[pupil,owner],teachers:[teacher],teacher_portal_access:[grant]},calls=[];
 const db={select:async(table,params)=>{calls.push({table,params});return (tables[table]||[]).filter(row=>Object.entries(params).every(([key,value])=>!String(value).startsWith('eq.')||String(row[key])===String(value).slice(3)));},
  rpc:async name=>{calls.push({rpc:name});if(name==='dm_student_level')return 15;throw Error('Unexpected RPC: '+name);},insert(){throw Error('Unexpected write');},update(){throw Error('Unexpected write');}};
 const handler=c.make(db);
 return {session,pupil,teacher,owner,grant,calls,async request(action=kind==='learning'?'status':'setup'){
  const result=await handler(new Request('https://example.test/',{method:'POST',body:JSON.stringify({t:'token',action})}));return result.status;
 }};
}
test('frozen pupils and teachers cannot retain learning access through old session tokens',async()=>{
 for(const role of ['student','teacher']){const f=fixture('learning',role);f[role==='student'?'pupil':'teacher'].frozen_at='2026-10-26';assert.equal(await f.request(),403);assert(!f.calls.some(x=>x.rpc));}
});
test('frozen pupils and teachers cannot access race setup or practice',async()=>{
 for(const role of ['student','teacher']){const f=fixture('race',role);f[role==='student'?'pupil':'teacher'].frozen_at='2026-10-26';assert.equal(await f.request(),403);assert(!f.calls.some(x=>x.rpc));}
});
test('oral access rejects frozen teacher, revoked grant, stale grant version and another teacher grant',async()=>{
 const mutations=[f=>f.teacher.frozen_at='2026-10-26',f=>f.grant.state='revoked',f=>f.grant.version=2,f=>f.grant.teacher_id='another'];
 for(const change of mutations){const f=fixture('oral','teacher',true);change(f);assert.equal(await f.request(),403);assert(!f.calls.some(x=>x.rpc));}
 const active=fixture('oral','teacher',true);assert.equal(await active.request(),200);
});
test('classroom oral and race sessions recheck the teacher-linked account before any gameplay write',async()=>{
 for(const kind of ['oral','race'])for(const change of [f=>f.owner.frozen_at='2026-10-26',f=>f.owner.status='rejected',f=>f.owner.email_verified_at=null,f=>f.teacher.active=false]){
  const f=fixture(kind,kind==='oral'?'teacher':'student',true);change(f);assert.equal(await f.request(),403);assert(!f.calls.some(x=>x.rpc));
 }
 const active=fixture('race','student',true);assert.equal(await active.request(),200);
});
