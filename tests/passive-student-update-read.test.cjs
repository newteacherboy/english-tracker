const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const source=fs.readFileSync('supabase/functions/diji-api/index.ts','utf8');
const from=source.indexOf('  if (op === "sonGirisGuncelle") {');
const to=source.indexOf('\n  // ============================================================ PARKUR',from);
assert(from!==-1&&to>from,'passive student update routes found');
const block=source.slice(from,to);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const handle=new AsyncFunction('op','a','body','q','requireStudent','hedefOgrenci','supabase','json','val','num',block+'\nreturn null;');
const json=(data,status=200)=>({data,status});
function harness({teacher=false,denied=null,teacherResult={id:'target'}}={}){
 const trace={select:0,update:[],eq:[],lookup:0};
 const db={from(table){assert.equal(table,'students');return {
   select(){trace.select++;throw Error('SELECT unnecessary for student update')},
   update(values){trace.update.push(values);return {eq(field,id){trace.eq.push({field,id});return Promise.resolve({error:null})}}}
 }}};
 const a=teacher?{role:'teacher',teacher_id:'t1'}:{role:'student',student_id:'owner'};
 const requireStudent=async()=>denied;
 const hedefOgrenci=async()=>{trace.lookup++;return teacherResult;};
 const val=(body,q,key)=>body[key];
 const num=Number;
 const request=(op,body={})=>handle(op,a,body,new URLSearchParams(),requireStudent,hedefOgrenci,db,json,val,num);
 return {trace,request};
}
test('student last login uses authenticated identity, no SELECT',async()=>{
 const f=harness(),response=await f.request('sonGirisGuncelle',{ogrenci:'owner'});
 assert.equal(response.data.status,'success');
 assert.equal(f.trace.select,0);assert.equal(f.trace.lookup,0);
 assert.deepEqual(f.trace.eq,[{field:'id',id:'owner'}]);
 assert.equal(typeof f.trace.update[0].last_login_at,'string');
});
test('student class save does not query full student row',async()=>{
 const f=harness(),response=await f.request('sinifSec',{ogrenci:'owner',sinif:6});
 assert.equal(response.data.status,'success');
 assert.equal(f.trace.lookup,0);assert.equal(f.trace.select,0);
 assert.deepEqual(f.trace.update,[{selected_class:6}]);
 assert.deepEqual(f.trace.eq,[{field:'id',id:'owner'}]);
});
test('teacher operation retains scoped student lookup',async()=>{
 const f=harness({teacher:true});
 await f.request('sonGirisGuncelle',{ogrenci:'pupil'});
 assert.equal(f.trace.lookup,1);
 assert.deepEqual(f.trace.eq,[{field:'id',id:'target'}]);
});
test('teacher missing target does not update any student',async()=>{
 const f=harness({teacher:true,teacherResult:null});
 await f.request('sinifSec',{ogrenci:'missing',sinif:4});
 assert.equal(f.trace.update.length,0);
 assert.equal(f.trace.lookup,1);
});
test('access denied short-circuits both writes',async()=>{
 const denied={status:403};
 const f=harness({denied});
 assert.strictEqual(await f.request('sinifSec',{ogrenci:'other',sinif:7}),denied);
 assert.strictEqual(await f.request('sonGirisGuncelle',{ogrenci:'other'}),denied);
 assert.equal(f.trace.update.length,0);
});
