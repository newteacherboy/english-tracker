const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');
const src=fs.readFileSync(__dirname+'/../supabase/functions/diji-api/index.ts','utf8'),Async=Object.getPrototypeOf(async function(){}).constructor;
const block=src.slice(src.indexOf('  if (op === "kayitOl")'),src.indexOf('  if (op === "sifreDegistir")')).replace('ogretmen: any','ogretmen').replace('(payload as any)','payload');
const helpers=fs.readFileSync('supabase/functions/diji-api/learner-profile.mjs','utf8').replace(/export /g,'');
const run=new Async('body','supabase','json','studentByName','denemeSay','denemeYaz','likeKacir','hashPassword','num','temizMetin','onboarding','encName','yeniOgrenciYoneticiBildirimi','issueSession','const op="kayitOl";const OGRENCI_SIFRE_MIN=6;const sadeHarf=v=>String(v||"").toLocaleLowerCase("tr").replace(/[çğıöşüâîû]/g,c=>({"ç":"c","ğ":"g","ı":"i","ö":"o","ş":"s","ü":"u","â":"a","î":"i","û":"u"})[c]).replace(/[^a-z]/g,"");'+helpers+block);
function fixture(fail=false){const mails=[],writes=[],upserts=[];const db={from(t){return {select(){return this},ilike(){return this},eq(){return this},limit:async()=>({data:[]}),insert(p){writes.push(p);return this},upsert(p){upserts.push(p);return Promise.resolve({data:p,error:null})},single:async()=>({data:fail?null:{id:'new',username:'Yeni Öğrenci',email:'parent@example.test'},error:fail?{}:null})}}};return {mails,writes,upserts,call:b=>run(b,db,(data,status=200)=>({data,status}),async()=>null,async()=>0,async()=>{},s=>s,async()=> 'hash',Number,s=>s,{welcome:async s=>mails.push(s)},s=>String(s).toLocaleLowerCase('tr'),async()=>{},async()=> 'student-session-token')};}
const valid={ogrenciAdi:'yildiz_12',adSoyad:'Yeni Öğrenci',sifre:'secret',telefon:'05551234567',email:'parent@example.test',sinif:3,sube:'A',kvkkOnay:true,kvkkOnayTarihi:'2026-10-04T00:00:00Z'};
test('optional school is stored with the same student identity; absent school remains null',async()=>{const f=fixture();await f.call({...valid,okul:'  Atatürk   Ortaokulu  '});assert.equal(f.writes[0].school,'Atatürk Ortaokulu');assert.equal(f.writes[0].username,valid.ogrenciAdi);const g=fixture();await g.call(valid);assert.equal(g.writes[0].school,null);});
test('password signup opens immediately while keeping independent email verification',async()=>{const f=fixture(),r=await f.call(valid);assert.equal(r.data.status,'success');assert.equal(f.writes[0].status,'approved');assert.equal(f.writes[0].email_verification_required,true);assert.equal(f.writes[0].email_verified_at,null);assert.equal(f.mails.length,1);assert.equal(f.mails[0].email,valid.email);assert.equal(r.data.token,'student-session-token')});
test('failed account creation and missing declaration send no welcome',async()=>{for(const [f,b] of [[fixture(true),valid],[fixture(),{...valid,kvkkOnayTarihi:''}]]){assert.equal((await f.call(b)).data.status,'error');assert.equal(f.mails.length,0)}});
const queue=stripTypeScriptTypes(src.slice(src.indexOf('async function kuyrukSatiriGonder'),src.indexOf('/* Bekleyen e-postaları')),{mode:'transform'});
function sender(slot){const updates=[],calls=[];const db={rpc:async()=>({data:slot}),from(t){return {update(p){updates.push({t,p});return this},eq(){return this},is(){return this}}}};const fn=new Async('supabase','epostaGonder',queue+'return await kuyrukSatiriGonder(1,{student_id:"new",kind:"dogrulama",to_email:"parent@example.test"});');return {updates,calls,run:()=>fn(db,async()=>{calls.push(1);return {ok:true}})};}
test('daily quota defers without sending or exhausting retries',async()=>{const s=sender(false);assert.equal((await s.run()).ok,false);assert.equal(s.calls.length,0);assert(s.updates[0].p.send_after);assert.equal(s.updates[0].p.attempts,undefined)});
test('successful delayed welcome grants 24 hours from send time',async()=>{const s=sender(true);assert.equal((await s.run()).ok,true);assert.equal(s.calls.length,1);assert.equal(s.updates[0].t,'dm_email_verifications');assert(Date.parse(s.updates[0].p.expires_at)>Date.now()+86390000);assert(s.updates[1].p.sent_at)});

test('independent adult learner registers without fabricated classroom data',async()=>{
 const f=fixture();
 const r=await f.call({...valid,ogrenimTuru:'independent',sinif:undefined,sube:undefined,okul:''});
 assert.equal(r.data.status,'success');
 assert.equal(f.writes[0].class_no,null);
 assert.equal(f.writes[0].branch,null);
 assert.equal(f.writes[0].school,null);
});
test('school accounts still require grade and section and independent accounts reject teacher linking',async()=>{
 const school=fixture(),bad=await school.call({...valid,sinif:undefined,sube:undefined});
 assert.equal(bad.data.status,'error');assert.equal(school.writes.length,0);
 const independent=fixture(),linked=await independent.call({...valid,ogrenimTuru:'independent',ogretmenKodu:'INVALID'});
 assert.equal(linked.data.status,'error');assert.equal(independent.writes.length,0);
});
test('adult independent and university signups do not need school, class, branch or phone; high school uses 9–12; school stage is required',async()=>{{const f=fixture(),r=await f.call({...valid,telefon:'',sinif:null,sube:'',okul:'',learnerProfile:{version:1,purpose:'school',educationStage:'',ageBand:'adult',goal:'daily',startChoice:'test',knownLevel:'A1'}});assert.notEqual(r.data.status,'success');assert.equal(f.writes.length,0);}for(const [purpose,educationStage,grade]of [['school','high',null],['independent','',null],['school','university',null],['school','high',11]]){const f=fixture(),r=await f.call({...valid,telefon:'',sinif:grade,sube:'',okul:'',learnerProfile:{version:1,purpose,educationStage,ageBand:'adult',goal:'daily',startChoice:'test',knownLevel:'A1'}});assert.equal(r.data.status,'success',JSON.stringify(r));assert.equal(f.writes[0].class_no,grade);assert.equal(f.writes[0].phone,null);}const f=fixture(),r=await f.call({...valid,sinif:4,learnerProfile:{purpose:'school',educationStage:'high',ageBand:'teen'}});assert.equal(r.status,400);assert.equal(f.writes.length,0);});

test('progress e-mail consent is optional: recorded only when the unticked box is checked',async()=>{
 const f=fixture(),r=await f.call({...valid,ilerlemeMailOnay:true});assert.equal(r.data.status,'success');
 const c=f.upserts.filter(u=>u.key_name==='progress_mail_consent_v1');assert.equal(c.length,1);assert.equal(c[0].student_id,'new');assert.equal(c[0].value.email,'parent@example.test');assert.equal(c[0].value.source,'registration_checkbox');
 for(const v of [undefined,false,'true']){const g=fixture(),s=await g.call({...valid,ilerlemeMailOnay:v});assert.equal(s.data.status,'success','registration never depends on the checkbox');assert.equal(g.upserts.filter(u=>u.key_name==='progress_mail_consent_v1').length,0);}
});
