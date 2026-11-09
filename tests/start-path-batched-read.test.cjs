// Regression: read-only, single-query start-path preload. Both Edge Function copies
// must preserve exactly the same result as the legacy three-key lookup.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {computeStartPath}=require('../supabase/functions/diji-api/start-path.mjs');
const path='../supabase/functions/diji-api/start-path-access.mjs';

function fixture(extraRows=[],extraError=null){
 const queries=[],writes=[];
 const db={from(name){
   const q={name,columns:null,filters:[],select(columns){this.columns=columns;return this;},
     eq(column,value){this.filters.push([column,value]);return this;},
     in(column,values){this.filters.push([column,values]);return Promise.resolve({data:extraRows,error:extraError});},
     maybeSingle(){return Promise.resolve({data:{class_no:6},error:null});},
     limit(){return Promise.resolve({data:[],error:null});},
     insert(){writes.push('insert');throw Error('No writes allowed');},
     update(){writes.push('update');throw Error('No writes allowed');},
     upsert(){writes.push('upsert');throw Error('No writes allowed');},
     delete(){writes.push('delete');throw Error('No writes allowed');}
   };queries.push(q);return q;
 }};
 return {db,queries,writes};
}
test('both Edge Functions keep the same loader',()=>{
 assert.equal(readFileSync('supabase/functions/diji-api/start-path-access.mjs','utf8'),readFileSync('supabase/functions/medupro-api/start-path-access.mjs','utf8'));
});
test('three immutable start keys are read in a single student-scoped request',async()=>{
 const {loadStartPath}=require(path);
 const profile={version:1,purpose:'school',educationStage:'middle',startChoice:'known',knownLevel:'A2'};
 const placement={version:'starting-point-20261018-v1',total:24,level:'B1',completedAt:'2026-11-01T12:00:00Z'};
 const choice={level:'A2'};
 const rows=[{key_name:'start_point_v1',value:choice},{key_name:'placement_start_v1',value:placement},{key_name:'learner_profile_v1',value:profile}];
 const f=fixture(rows),ctx={done:[],lessons:[],units:[]};
 const result=await loadStartPath(f.db,'student-example',ctx);
 assert.deepEqual(result,computeStartPath({profile,classNo:6,placement,choice,lessons:ctx.lessons,done:ctx.done,units:ctx.units,thematic:{played:[],complete:{A1:false,A2:false,B1:false,B2:false}}}));
 const extra=f.queries.filter(q=>q.name==='extra_data');
 assert.equal(extra.length,1);
 assert.equal(extra[0].columns,'key_name,value');
 assert.deepEqual(extra[0].filters,[['student_id','student-example'],['key_name',['learner_profile_v1','placement_start_v1','start_point_v1']]]);
 assert.deepEqual(f.writes,[]);
});
test('missing legacy optional rows remain undefined, with no mutations',async()=>{
 const {loadStartPath}=require(path);
 const f=fixture([]);
 const result=await loadStartPath(f.db,'student-example',{});
 assert.equal(result.legacy,true);
 assert.equal(f.queries.filter(q=>q.name==='extra_data').length,1);
 assert.deepEqual(f.writes,[]);
});
test('database errors reject the request; no partial/default profile is returned',async()=>{
 const {loadStartPath}=require(path);
 const f=fixture([],new Error('read failed'));
 await assert.rejects(loadStartPath(f.db,'student-example',{}),/read failed/);
 assert.deepEqual(f.writes,[]);
});
