const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root='ingilizce/teacher-portal-boot.js';
const section=fs.readFileSync(root,'utf8').split('// BEGIN TEACHER GRADE 7 BANK')[1].split('// END TEACHER GRADE 7 BANK')[0];
const original=[{sinif:2,unite:1,ingilizce:'hello',turkce:'merhaba'},{sinif:7,unite:1,ingilizce:'old',unit_name:'School Life & Education'},{sinif:8,unite:10,ingilizce:'test'}];
function teacher(){const ctx={dmTeacherPortalMode:true,masterKelimeHavuzu:original};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(section,ctx);return ctx;}
test('teacher view exposes all ten grade 7 units, correct titles and full rounds, preserves other grades and raw cache',()=>{
 const w=teacher(),bank=w.masterKelimeHavuzu,rows=bank.filter(x=>x.sinif===7);
 assert.equal(rows.length,490);assert.equal(bank.filter(x=>x.sinif!==7).length,2);assert.equal(original.length,3);assert.equal(original[1].ingilizce,'old');
 assert.deepEqual(Array.from(new Set(rows.map(x=>x.unite))),[1,2,3,4,5,6,7,8,9,10]);
 assert.equal(rows.find(x=>x.unite===1).unit_name,'Appearance and Personality');assert.equal(rows.find(x=>x.unite===10).unit_name,'Planets');
 for(let n=1;n<=10;n++){const a=rows.filter(x=>x.unite===n);assert(a.length>=24);assert(a.filter(x=>x.ingilizce.split(/\s+/).length>=3&&x.ingilizce.split(/\s+/).length<=9).length>=12);assert(new Set(a.map(x=>x.ingilizce.toLowerCase())).size===a.length);}
 assert(!rows.some(x=>x.ingilizce==='old'));assert.equal(w.masterKelimeHavuzu,bank);
 const refreshed=[{sinif:6,unite:1,ingilizce:'new'},{sinif:7,unite:1,ingilizce:'wrong'}];w.masterKelimeHavuzu=refreshed;
 assert.equal(w.masterKelimeHavuzu.filter(x=>x.sinif===7).length,490);assert.equal(w.masterKelimeHavuzu[0].ingilizce,'new');assert.equal(refreshed[1].ingilizce,'wrong');
 w.dmTeacherPortalMode=false;assert.equal(w.masterKelimeHavuzu,refreshed);
});
test('empty initial bank still triggers the ordinary loader; overlay appears on load',()=>{const w=teacher();w.masterKelimeHavuzu=[];assert.equal(w.masterKelimeHavuzu.length,0);w.masterKelimeHavuzu=original;assert.equal(w.masterKelimeHavuzu.length,492);});
test('only authenticated classroom grade 7 requests use the separate server bank',()=>{
 for(const p of ['word-wheel-api.ts','meteor-api.ts','papi-cards-api.ts','index.ts']){const c=fs.readFileSync('supabase/functions/diji-api/'+p,'utf8');assert(c.includes("a?.teacher_portal_access_id&&cls===7?'teacher_grade7_word_bank':'word_bank'"),p);}
 const c=fs.readFileSync('supabase/functions/diji-api/verified-games.mjs','utf8');assert(c.includes("a.teacher_portal_access_id&&classNo===7&&game!=='ba'&&game!=='kp'?'teacher_grade7_word_bank':'word_bank'"));
});

test('Wheel and Meteor use grade 7 units 9/10 in one- and two-player classroom games without changing learner queries',async()=>{
 const {stripTypeScriptTypes}=require('node:module');
 const rows=teacher().masterKelimeHavuzu.filter(x=>x.sinif===7).map(x=>({class_no:7,unit_no:x.unite,english:x.ingilizce,turkish:x.turkce,active:true}));
 for(const [file,fn,op,sessionTable] of [['word-wheel-api.ts','wordWheelAPI','kelimeCarkiBaslat','papi_wheel_sessions'],['meteor-api.ts','meteorAPI','meteorBaslat','papi_meteor_sessions']]){
  const reads=[],sessions=[];
  const db={from(table){let filters={},payload;const q={select(){return q},eq(k,v){filters[k]=v;return q},limit(){reads.push(table);const data=table==='teacher_grade7_word_bank'?rows.filter(r=>Object.entries(filters).every(([k,v])=>r[k]===v)):[];return Promise.resolve({data,error:null})},insert(p){payload=p;return q},single(){assert.equal(table,sessionTable);const r={id:crypto.randomUUID(),status:'playing',version:0,...payload};sessions.push(r);return Promise.resolve({data:r,error:null});}};return q;}};
  const ctx={crypto,Math,Date,Set,Map,JSON,selectWordBankRound:async(db,owner,cls,unit,words,size)=>words.slice(0,size)};vm.createContext(ctx);
  const src=stripTypeScriptTypes(fs.readFileSync('supabase/functions/diji-api/'+file,'utf8'),{mode:'transform'}).replaceAll('export ','').replace(/import[^;]+;/g,'');
  vm.runInContext(src+';globalThis.create='+fn+';',ctx);
  const api=ctx.create(db,(d,status=200)=>({d,status}));const a={role:'student',student_id:'classroom-actor',teacher_portal_access_id:'verified-teacher-grant'};
  for(const unit of [9,10])for(const mode of [1,2]){let result=await api.handle(op,{sinif:7,unite:unit,mode,independent:mode===2},new URLSearchParams(),a,'POST');assert.equal(result.status,200);assert.equal(sessions.at(-1).deck.length,mode===2?24:12);const allowed=new Set(rows.filter(r=>r.unit_no===unit).map(r=>r.english));assert(sessions.at(-1).deck.every(w=>allowed.has(w.en||w.key)));assert.equal(reads.at(-1),'teacher_grade7_word_bank');}
  const student=await api.handle(op,{sinif:7,unite:10,mode:1},new URLSearchParams(),{role:'student',student_id:'personal'},'POST');assert.notEqual(student.status,200);assert.equal(reads.at(-1),'word_bank');
  await api.handle(op,{sinif:6,unite:1,mode:1},new URLSearchParams(),a,'POST');assert.equal(reads.at(-1),'word_bank');
 }
});

test('classic classroom verification accepts the exact new unit questions and remains ranking-only',async()=>{
 const rows=teacher().masterKelimeHavuzu.filter(x=>x.sinif===7).map(x=>({class_no:7,unit_no:x.unite,english:x.ingilizce,turkish:x.turkce,active:true}));
 const reads=[],calls=[];const db={from(table){reads.push(table);let predicates=[];const q={select(){return q},eq(k,v){predicates.push(r=>r[k]===v);return q},in(k,v){predicates.push(r=>v.includes(r[k]));return q},limit(){return Promise.resolve({data:table==='teacher_grade7_word_bank'?rows.filter(r=>predicates.every(f=>f(r))):[],error:null});}};return q},rpc:async(name,body)=>{calls.push({name,body});return {data:name==='dm_progress_context'?{level:1}:{rankingOnly:true},error:null};}};
 const ctx={Set,Map,Math,Date,JSON,DijiProgressionCatalog:{gates:new Proxy({},{get:()=>1})}};vm.createContext(ctx);
 const src=fs.readFileSync('supabase/functions/diji-api/verified-games.mjs','utf8').replaceAll('export ','').replace(/import[^;]+;/g,'');
 vm.runInContext(src+';globalThis.create=verifiedGamesAPI;',ctx);
 const api=ctx.create(db,(d,status=200)=>({d,status})),a={role:'student',student_id:'classroom',teacher_portal_access_id:'verified'};
 for(const game of ['ky','jp','hafiza','yagmur','eslestirme','tren','cumle','dikte','kelimebul','harfbahcesi','bosluk','canavar','kule','fener']){
  const unit=10;let eligible=rows.filter(r=>r.unit_no===unit);
  if(['tren','cumle'].includes(game))eligible=eligible.filter(r=>r.english.split(/\s+/).length>=3&&r.english.split(/\s+/).length<=9);
  if(game==='dikte')eligible=eligible.filter(r=>/^[a-zA-Z]{3,10}$/.test(r.english));
  if(game==='kelimebul')eligible=eligible.filter(r=>/^[a-zA-Z]{3,9}$/.test(r.english));
  if(game==='harfbahcesi')eligible=eligible.filter(r=>/^[a-zA-Z]{2,12}$/.test(r.english));
  if(game==='bosluk')eligible=eligible.filter(r=>r.english.length>=3&&!r.english.includes(' ')&&!r.english.includes("'"));
  const words=eligible.slice(0,12).map(r=>({en:r.english,tr:r.turkish}));const body={runId:'classroom-grade7-test-'+game,game,classNo:7,units:[unit],words};
  const result=await api.handle('verifiedGameStart',body,a,'POST');assert.equal(result.status,200,game+' '+JSON.stringify(result.d));assert.equal(calls.at(-1).name,'dm_teacher_verified_start');assert.equal(reads.at(-1),'teacher_grade7_word_bank');
 }
});
