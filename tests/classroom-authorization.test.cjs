const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');
test('classroom online context requires active teacher, owned pupil, and a game-only operation',async()=>{
 let active=true;const pupils=[{id:'a',username:'Alice',status:'approved',teacher_id:'t1',class_no:3},{id:'b',username:'Bob',status:'approved',teacher_id:'t2',class_no:3}];
 const tables={portal_sessions:[{id:'session',role:'teacher',teacher_id:'t1',expires_at:new Date(Date.now()+3600000).toISOString()}],students:pupils};
 const db={from(name){const filters=[];const q={select(){return this;},eq(k,v){if(k!=='token_hash')filters.push(x=>x[k]===v);return this;},ilike(k,v){filters.push(x=>String(x[k]).toLowerCase()===String(v).toLowerCase());return this;},limit(){return Promise.resolve({data:(tables[name]||[]).filter(x=>filters.every(f=>f(x)))});},maybeSingle(){const rows=name==='teachers'?[{id:'t1',active}]:tables[name]||[];return Promise.resolve({data:rows.filter(x=>filters.every(f=>f(x)))[0]||null});}};return q;}};
 const ctx={socialSafetyAPI:()=>({guard:async()=>null,filterStudents:async rows=>rows,filterNotifications:async rows=>rows}),crypto,TextEncoder,Date,Map,Set,URL,URLSearchParams,Request,Response,console,Deno:{env:{get:()=>'{"default":"test"}'},serve(){}},createClient:()=>db,progressionAPI:()=>({}),releaseAPI:()=>({}),contactPolicyAPI:()=>({})};vm.createContext(ctx);const code=stripTypeScriptTypes(fs.readFileSync('supabase/functions/medupro-api/index.ts','utf8'),{mode:'transform'}).replace(/^import .*;$/gm,'');vm.runInContext(code+'\nglobalThis.authorize=session;',ctx);
 const request=new Request('https://example.test'),q=new URLSearchParams();
 const call=b=>ctx.authorize(request,{t:'valid-teacher',...b},q);
 const authorized=await call({islem:'oyunEslesmeOlustur',classroomStudent:'Alice'});assert.equal(authorized.student_id,'a');assert.equal(authorized.classroomTeacher,'t1');
 assert.equal(await call({islem:'oyunEslesmeOlustur',classroomStudent:'Bob'}),null);
 assert.equal(await call({islem:'aksesuarHediye',classroomStudent:'Alice'}),null);
 assert.equal(await call({islem:'oyunEslesmeCevap'}),null);
 active=false;assert.equal(await call({islem:'oyunEslesmeOlustur',classroomStudent:'Alice'}),null);
});
