import {test} from 'node:test';import assert from 'node:assert/strict';
import {teacherPortalAPI,portalOperationAllowed,ownerTeacher} from '../supabase/functions/diji-api/teacher-portal.mjs';
const hash=async s=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))).toString('hex');
async function fixture(){const digest=await hash('server-secret|teacher-portal|123456'),calls=[];
 const tables={teacher_portal_access:[{id:'grant',student_id:'personal',teacher_id:'teacher-one',state:'approved',version:3,code_digest:digest}],teachers:[{id:'teacher-one',username:'TeacherOne',active:true}],students:[{id:'personal',username:'TeacherOne',email:'one@example.test',email_verified_at:'2026-10-24',status:'approved'},{id:'alice',username:'Alice',teacher_id:'teacher-one',status:'approved'},{id:'bob',username:'Bob',teacher_id:'teacher-two',status:'approved'}],teacher_portal_guests:[],extra_data:[]};
 const db={from(table){const filters=[];let changes;const result=single=>({data:single?(tables[table]||[]).find(x=>filters.every(f=>f(x)))||null:(tables[table]||[]).filter(x=>filters.every(f=>f(x)))});const q={select(){return this},update(values){changes=values;return this},upsert(values,options){
 const keys=options.onConflict.split(','),row=tables[table].find(x=>keys.every(k=>x[k]===values[k]));
 if(!row)tables[table].push({...values,...(table==='teacher_portal_access'?{id:'new-grant',state:'pending',version:1}:{})});else if(!options.ignoreDuplicates)Object.assign(row,values);
 return Promise.resolve({data:null,error:null});
 },or(){filters.push(x=>x.profile?.teacher_portal_guest!==true);return this},eq(k,v){filters.push(x=>x[k]===v);return this},is(k,v){filters.push(x=>(x[k]??null)===v);return this},gt(){return this},order(){return this},maybeSingle(){return Promise.resolve(result(true))},then(r,j){const rows=result(false);if(changes)for(const row of rows.data)Object.assign(row,changes);return Promise.resolve({...rows,error:null}).then(r,j)}};return q;},async rpc(name,args){calls.push({name,args});if(name==='dm_teacher_portal_guest'){const id='classroom-self';tables.students.push({id,username:args.guest_alias+' · Öğretmen Denemesi',teacher_id:'teacher-one',status:'approved',profile:{teacher_portal_guest:true}});return {data:id};}return {data:true};}};
 const api=teacherPortalAPI({db,json:(d,status=200)=>new Response(JSON.stringify(d),{status}),hash,hashPassword:async s=>'hash:'+s,verifyPassword:async()=>false,issueSession:async(...args)=>{calls.push({session:args});return 'signed-session'},mailShell:(_,html)=>html,escape:s=>s,queue:async m=>calls.push({mail:m}),codeKey:'server-secret'});
 const teacher={role:'teacher',teacher_id:'teacher-one',teacher_portal_access_id:'grant',teacher_portal_version:3};
 return {api,calls,tables,teacher,async run(op,b={},a=null){const r=await api.handle(op,b,a,'POST');return {status:r.status,data:await r.json()};}};
}
test('only authenticated exact teacher owner can manage approvals, including other administrators',async()=>{const f=await fixture();assert.equal(ownerTeacher({role:'student',ogretmenKullanici:'teacher',yonetici:true}),false);for(const a of [null,{role:'teacher',ogretmenKullanici:'OtherAdmin',yonetici:true},f.teacher])assert.equal((await f.run('teacherPortalDecide',{id:'grant',decision:'approved',ogretmenKullanici:'teacher'},a)).status,403);assert.equal(f.calls.length,0);});
test('login uses a keyed digest, rejects invalid/inactive/unverified identities and issues scoped session',async()=>{const f=await fixture();assert.equal((await f.run('teacherPortalLogin',{code:'123abc'})).status,400);assert.equal((await f.run('teacherPortalLogin',{code:'000000'})).status,401);const ok=await f.run('teacherPortalLogin',{code:'123456'});assert.equal(ok.data.token,'signed-session');assert.deepEqual(f.calls[0].session,['teacher',undefined,'teacher-one',{teacher_portal_access_id:'grant',teacher_portal_version:3}]);f.tables.students[0].email_verified_at=null;assert.equal((await f.run('teacherPortalLogin',{code:'123456'})).status,403);f.tables.students[0].email_verified_at='yes';f.tables.teachers[0].active=false;assert.equal((await f.run('teacherPortalLogin',{code:'123456'})).status,403);});
test('participant selection binds only the owned pupil and never trusts supplied actor, role or teacher ID',async()=>{const f=await fixture();const bad=await f.run('teacherPortalParticipant',{studentId:'bob',teacher_id:'teacher-two',role:'teacher'},f.teacher);assert.equal(bad.status,403);assert.equal(f.calls.length,0);const ok=await f.run('teacherPortalParticipant',{studentId:'alice',actor:'bob'},f.teacher);assert.equal(ok.data.name,'Alice');assert.equal(f.calls[0].session[1],'alice');assert.equal(f.calls[0].session[3].teacher_portal_access_id,'grant');});
test('code changes need the current secret and never return a plaintext code',async()=>{const f=await fixture();assert.equal((await f.run('teacherPortalChangeCode',{currentCode:'000000',code:'999999'},f.teacher)).status,403);assert.equal(f.calls.length,0);const ok=await f.run('teacherPortalChangeCode',{currentCode:'123456',code:'999999'},f.teacher);assert.equal(ok.status,200);assert.equal(f.calls[0].name,'dm_teacher_portal_code');assert.equal(f.calls[0].args.new_digest,await hash('server-secret|teacher-portal|999999'));assert.ok(!JSON.stringify(ok.data).includes('999999'));});
test('classroom participant operations cannot modify personal accounts, admin access, shops or parkur',()=>{for(const [op,b]of [['kisiselBilgiGuncelle',{}],['sifreGuncelle',{}],['teacherPortalDecide',{}],['buyuSeviyeTamamla',{}],['ekonomi',{is:'karakterAl'}],['ekVeriKaydet',{anahtar:'placement_start_v1'}]])assert.equal(portalOperationAllowed(op,b),false,op);for(const [op,b]of [['verifiedGameStart',{}],['seviyeOyunOdulu',{}],['enerjiDegistir',{}],['companionDialogueAnswer',{}],['dersKonuDetayGetir',{}],['ekVeriKaydet',{anahtar:'yo'}]])assert.equal(portalOperationAllowed(op,b),true,op);});
test('owner code uses a private salted digest and requires the active exact owner',async()=>{
 const f=await fixture(),g={id:'owner-grant',student_id:null,teacher_id:'owner',state:'approved',version:1};
 g.code_digest='owner:'+await hash(g.id+'|teacher-portal-owner|'+'87654321');f.tables.teacher_portal_access.push(g);
 const owner={id:'owner',username:'teacher',is_admin:true,active:true};f.tables.teachers.push(owner);
 assert.equal((await f.run('teacherPortalLogin',{code:'87654321'})).status,200);
 assert.equal(f.calls[0].session[2],'owner');assert.equal(f.calls[0].session[3].teacher_portal_access_id,'owner-grant');
 assert.equal((await f.run('teacherPortalLogin',{code:'87654320'})).status,401);
 owner.is_admin=false;assert.equal((await f.run('teacherPortalLogin',{code:'87654321'})).status,401);
 owner.is_admin=true;owner.frozen_at='2026-10-25';assert.equal((await f.run('teacherPortalLogin',{code:'87654321'})).status,401);
});
test('a null-linked grant never upgrades a regular teacher to owner',async()=>{
 const f=await fixture();f.tables.teacher_portal_access[0].student_id=null;
 assert.equal((await f.run('teacherPortalAppearance',{},f.teacher)).status,403);
});
test('short guest names return the exact three-letter guidance before any account is created',async()=>{
 for(const guestName of ['A','Al','  Al  ']){const f=await fixture(),r=await f.run('teacherPortalParticipant',{guestName},f.teacher);assert.equal(r.status,400);assert.equal(r.data.mesaj,'En az 3 harf girin.');assert.equal(f.calls.length,0);}
 const f=await fixture();await f.run('teacherPortalParticipant',{guestName:'Ali'},f.teacher);assert.equal(f.calls[0]?.name,'dm_teacher_portal_guest');
});

test('guest participants from every teacher stay outside member selectors and cannot be selected as pupils',async()=>{
 const f=await fixture();f.tables.students.push({id:'guest',username:'Ali · Misafir a1b2c3d4',profile:{teacher_portal_guest:true},teacher_id:'teacher-one',status:'approved',role:'student'});f.tables.students[1].role='student';
 const list=await f.run('teacherPortalStudents',{},f.teacher);assert(!list.data.items.some(s=>s.id==='guest'));assert(list.data.items.some(s=>s.id==='alice'));
 const denied=await f.run('teacherPortalParticipant',{studentId:'guest'},f.teacher);assert.equal(denied.status,403);assert.equal(f.calls.length,0);
});

test('self play uses the authenticated teacher name and a hidden classroom identity, never a supplied pupil',async()=>{const f=await fixture();const r=await f.run('teacherPortalParticipant',{self:true,studentId:'bob',guestName:'Forged teacher'},f.teacher);assert.equal(r.status,200);assert.equal(r.data.self,true);assert.equal(r.data.displayName,'TeacherOne');assert.equal(r.data.preview,true);const guest=f.calls.find(x=>x.name==='dm_teacher_portal_guest');assert.equal(guest.args.guest_alias,'TeacherOne');assert.equal(guest.args.is_preview,true);assert.equal(f.calls.find(x=>x.session).session[1],'classroom-self');assert.equal((await f.run('teacherPortalParticipant',{self:true})).status,403);});

test('teacher registration creates only a pending grant and a one-time code',async()=>{
 const f=await fixture(),actor={role:'student',student_id:'alice'},student=f.tables.students[1];
 student.phone='05551234567';student.school='Amasya · Merkez · Örnek Ortaokulu';
 assert.equal((await f.run('teacherPortalStatus',{offerOnly:true},actor)).data.teacherAccount,false);
 const code=await f.api.trackSignup('alice');
 assert.match(code,/^\d{6}$/);
 const pending=f.tables.teacher_portal_access.find(row=>row.student_id==='alice');
 assert.equal(pending.state,'pending');
 assert.equal(pending.code_digest,await hash('server-secret|teacher-portal|'+code));
 const after=await f.run('teacherPortalStatus',{offerOnly:true},actor);
 assert.equal(after.data.teacherAccount,true);assert.equal(after.data.codeReady,true);assert.equal(after.data.offer,false);
 assert.equal((await f.run('teacherPortalLogin',{code})).status,401,'pending code cannot log in');
 assert.equal((await f.run('teacherPortalEnter',{},actor)).status,403,'personal session cannot bypass owner approval');
 assert.equal(await f.api.trackSignup('alice'),null,'signup retry never leaks existing code');
 assert.equal(f.tables.teacher_portal_access.filter(row=>row.student_id==='alice').length,1);
});
test('approved account may enter using only its own verified personal session',async()=>{
 const f=await fixture();const personal={role:'student',student_id:'personal'};
 const entered=await f.run('teacherPortalEnter',{student_id:'alice'},personal);
 assert.equal(entered.status,200);assert.equal(entered.data.token,'signed-session');
 assert.equal(f.calls[0].session[3].teacher_portal_access_id,'grant');
 assert.equal((await f.run('teacherPortalEnter',{}, {role:'student',student_id:'bob'})).status,403);
 f.tables.students[0].email_verified_at=null;
 assert.equal((await f.run('teacherPortalEnter',{},personal)).status,403);
 f.tables.students[0].email_verified_at='2026-10-24';
 f.tables.teachers[0].active=false;
 assert.equal((await f.run('teacherPortalEnter',{},personal)).status,403);
});
test('an existing pending applicant can complete missing school details without a duplicate grant',async()=>{
 const f=await fixture(),actor={role:'student',student_id:'alice'},student=f.tables.students[1];
 student.school='Örnek Ortaokulu';student.phone='05551234567';
 f.tables.teacher_portal_access.push({student_id:'alice',state:'pending'});
 const offer=(await f.run('teacherPortalStatus',{offerOnly:true},actor)).data;
 assert.equal(offer.offer,true);
 assert.equal(offer.school.school,student.school);
 assert.equal((await f.run('teacherPortalApply',{confirm:true},actor)).status,400);
 assert.equal((await f.run('teacherPortalApply',{confirm:true,city:'Amasya',district:'Merkez'},actor)).data.state,'pending');
 assert.equal(student.school,'Amasya · Merkez · Örnek Ortaokulu');
 assert.equal(f.tables.teacher_portal_access.filter(row=>row.student_id==='alice').length,1);
});
