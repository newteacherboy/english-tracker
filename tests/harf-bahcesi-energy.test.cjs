const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');
const ts=fs.readFileSync(__dirname+'/../supabase/functions/diji-api/index.ts','utf8');
const wrapped=stripTypeScriptTypes('async function extracted(){'+ts.slice(ts.indexOf('  if (op === "enerjiDegistir")'),ts.lastIndexOf('  if (op === "enerjiGonder")'))+'}',{mode:'transform'});
const block=wrapped.slice(wrapped.indexOf('{')+1,wrapped.lastIndexOf('}'));
const run=new(Object.getPrototypeOf(async function(){}).constructor)('op','body','a','supabase','requireStudent','hedefOgrenci','enerjiYenile','release','json','bulunamadi','num','bool','ENERJI_TAVAN','dolumBilgi',block);
async function fixture({energy=20,prior=false,race=false}={}){
 const changes=[],inserts=[];const student={id:'actor',energy,energy_max:30};
 const db={from(table){let isUpdate=false;return {select(){return this},eq(){return this},limit(){return Promise.resolve({data:prior?[{id:'earlier'}]:[],error:null})},update(p){isUpdate=true;changes.push(p);return this},async insert(row){inserts.push(row);return {error:null}},then(resolve){resolve({data:isUpdate&&!race?[{id:'actor'}]:[],error:null})}}}};
 const result=await run('enerjiDegistir',{oyun:'harfbahcesi',runId:'12345678-1234-4234-8234-123456789012',ogrenci:'Other',fark:-25,sebep:'oyun'},{role:'student',student_id:'actor'},db,async()=>null,async()=>student,async s=>s,{on:async()=>true},(d,status=200)=>({d,status}),()=>({status:404}),v=>Number(v)||0,Boolean,30,()=>({}));
 return {result,changes,inserts};
}
test('low energy never causes partial debit',async()=>{const f=await fixture({energy:2});assert.equal(f.result.status,409);assert.equal(f.changes.length,0);assert.equal(f.inserts.length,0);});
test('energy cost is exactly three even if caller supplies a different amount',async()=>{const f=await fixture();assert.equal(f.result.d.eklenen,-3);assert.equal(f.changes[0].energy,17);assert.equal(f.inserts[0].change_amount,-3);assert.match(f.inserts[0].reason,/^harfbahcesi:/);});
test('retry of charged run performs no further debit',async()=>{const f=await fixture({prior:true});assert.equal(f.result.d.eklenen,-3);assert.equal(f.changes.length,0);assert.equal(f.inserts.length,0);});
test('competing balance change fails without recording a successful charge',async()=>{const f=await fixture({race:true});assert.equal(f.result.status,409);assert.equal(f.inserts.length,0);});
