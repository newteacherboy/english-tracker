const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../supabase/functions/diji-api/index.ts'),'utf8');
const block=source.slice(source.indexOf('  // Google Auth is an additional'),source.indexOf('  // [YAMA 7]'));
const stripped=block;
const run=new (Object.getPrototypeOf(async function(){}).constructor)('req','body','q','supabase','json','studentByNameGenel','verifyPassword','issueSession','denemeSay','denemeYaz','encName','temizMetin','likeKacir','hashPassword','crypto','sorumluEpostalar','kuyrugaEkle','mailKabugu','hk','const op=body.islem;\n'+stripped);
const valid={islem:'googleKayit',ogrenciAdi:'Yeni Öğrenci',telefon:'05551234567',email:'parent@example.test',sinif:'5',sube:'A',kvkkOnay:true};
function fixture(opts={}) {
 let inserts=0,sessions=0,notifications=[],payload;
 const student={id:'new-student',username:'Yeni Öğrenci',status:opts.status||'approved'};
 const db={auth:{getUser:async t=>({data:{user:t==='valid'?{id:'verified-google',identities:[{provider:opts.provider||'google'}]}:null}})},
 from(table){const b={select(){return this},eq(){return this},ilike(){return this},limit(){return this},update(){return this},
 async maybeSingle(){return {data:table==='student_google_accounts'?(opts.mapping?{student_id:'old-student'}:null):student}},
 then(resolve){resolve({data:table==='teachers'?(opts.teacher?[{id:'teacher',active:true}]:[]):null,error:null})}};return b},
 async rpc(name,args){inserts++;payload=args.p_payload;return {data:opts.rpcError?null:'new-student',error:opts.rpcError?{code:'23505'}:null}}};
 return {counts:()=>({inserts,sessions}),notifications,payload:()=>payload,call:async(body=valid,token='valid',method='POST')=>run(new Request('https://example.test',{method,headers:{authorization:'Bearer '+token}}),body,new URLSearchParams(),db,(data,status=200)=>({data,status}),async()=>opts.existing?student:null,async()=>false,async()=>{sessions++;return 'portal-token'},async()=>opts.rateLimit?20:0,async()=>{},x=>x,x=>String(x||'').slice(0,10),x=>x,async()=> 'secure-random-password-hash',require('node:crypto').webcrypto,async()=>['teacher@example.test'],async x=>notifications.push(x),(_,html)=>html,x=>String(x))};
}
test('verified Google creates active student and session, then informational notification',async()=>{const f=fixture(),r=await f.call();assert.equal(r.data.kayitOlustu,true);assert.equal(r.data.token,'portal-token');assert.equal(r.data.rol,'ogrenci');assert.deepEqual(f.counts(),{inserts:1,sessions:1});assert.equal(f.payload().phone,'05551234567');assert.equal(f.notifications.length,1);assert.doesNotMatch(f.notifications[0].subject,/onay/);assert.equal(f.payload().password_hash,'secure-random-password-hash')});
test('invalid token and non Google identity never register',async()=>{for(const [opts,token] of [[{},'forged'],[{provider:'email'},'valid']]){const f=fixture(opts);assert.equal((await f.call(valid,token)).status,401);assert.deepEqual(f.counts(),{inserts:0,sessions:0})}});
test('existing Google mapping or student is never recreated or overwritten',async()=>{for(const opts of [{mapping:true},{existing:true}]){const f=fixture(opts);assert.equal((await f.call()).status,409);assert.deepEqual(f.counts(),{inserts:0,sessions:0})}});
test('missing guardian declaration and invalid registration fields rejected',async()=>{for(const change of [{kvkkOnay:false},{telefon:'123'},{email:'bad'},{sinif:'9'},{sube:''},{ogrenciAdi:'<script>'}]){const f=fixture();assert.equal((await f.call({...valid,...change})).status,400);assert.deepEqual(f.counts(),{inserts:0,sessions:0})}});
test('rate limit and inactive teacher cannot create accounts',async()=>{let f=fixture({rateLimit:true});assert.equal((await f.call()).status,429);assert.deepEqual(f.counts(),{inserts:0,sessions:0});f=fixture();assert.equal((await f.call({...valid,ogretmenKodu:'UNKNOWN'})).status,400);assert.deepEqual(f.counts(),{inserts:0,sessions:0})});
test('transaction conflict and nonactive status never issue session',async()=>{for(const opts of [{rpcError:true},{status:'rejected'}]){const f=fixture(opts);assert.equal((await f.call()).data.ok,false);assert.equal(f.counts().sessions,0)}});
test('GET registration is forbidden',async()=>{const f=fixture();assert.equal((await f.call(valid,'valid','GET')).status,405);assert.deepEqual(f.counts(),{inserts:0,sessions:0})});
