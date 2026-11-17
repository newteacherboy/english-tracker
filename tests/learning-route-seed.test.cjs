// Kayıtta seçilen amaç parkuru belirler; var olan rota ezilmez.
const test=require('node:test'),assert=require('assert/strict'),path=require('path');
function fakeDb(rows){const calls=[];const q=(table)=>{const st={table,filters:{}};const api={select(){return api;},eq(k,v){st.filters[k]=v;return api;},maybeSingle:async()=>({data:rows.yo?{value:rows.yo}:null,error:null}),
 update(v){st.op='update';st.value=v;return api;},insert(v){calls.push({op:'insert',value:v.value});rows.yo=v.value;return Promise.resolve({error:null});},then(res,rej){if(st.op==='update'){calls.push({op:'update',value:st.value.value});rows.yo=st.value.value;}return Promise.resolve({error:null}).then(res,rej);}};return api;};return {db:{from:q},calls,rows};}
test('okul / kendim için rotası kayıtta yazılır, seçilmiş rota korunur',async()=>{
 const {seedLearningRoute,normalizeLearnerProfile}=await import(path.resolve(__dirname,'../supabase/functions/diji-api/learner-profile.mjs'));
 let f=fakeDb({});await seedLearningRoute(f.db,'s1',{version:1,purpose:'school',educationStage:'high'});assert.equal(f.rows.yo.dmLearningPurpose,'independent');
 f=fakeDb({});await seedLearningRoute(f.db,'s1b',{version:1,purpose:'school',educationStage:'middle'});assert.equal(f.rows.yo.dmLearningPurpose,'school');
 f=fakeDb({});await seedLearningRoute(f.db,'s2',{version:1,purpose:'independent'});assert.equal(f.rows.yo.dmLearningPurpose,'independent');
 f=fakeDb({yo:{altin:5,guncelleme:10}});await seedLearningRoute(f.db,'s3',{version:1,purpose:'school',educationStage:'primary'});assert.equal(f.rows.yo.dmLearningPurpose,'school');assert.equal(f.rows.yo.altin,5);
 f=fakeDb({yo:{dmLearningPurpose:'independent'}});await seedLearningRoute(f.db,'s4',{version:1,purpose:'school'});assert.equal(f.calls.length,0);
 // Eski kayıt formları (öğrenim türü + sınıf) da rota alır.
 f=fakeDb({});await seedLearningRoute(f.db,'s5',normalizeLearnerProfile(undefined,'6','school'));assert.equal(f.rows.yo.dmLearningPurpose,'school');
 f=fakeDb({});await seedLearningRoute(f.db,'s6',normalizeLearnerProfile(undefined,null,'independent'));assert.equal(f.rows.yo.dmLearningPurpose,'independent');
});
test('lise/üniversite okul kaydında Okul Yolum tamamen açık',async()=>{
 const sp=await import(path.resolve(__dirname,'../supabase/functions/diji-api/start-path.mjs'));
 const profile=JSON.stringify({version:1,purpose:'school',educationStage:'high',startChoice:'new',goal:'daily'});
 const p=sp.computeStartPath({profile,classNo:10,placement:null,choice:null,lessons:{},done:[],units:[[1001,1002],[8001,8002]],thematic:{}});
 assert.equal(p.schoolOpen,true);assert.equal(p.learningRoute,'open');assert.equal(p.maxGrade,8);
 const ctx={units:[[101,102,103],[801,802,803]],done:[]};
 const stopOf=g=>Number(String(g));
 // Herhangi bir sınıfın ortasındaki durak bile açık
 const mid=ctx.units[1][2];assert.equal(sp.schoolStopProblem(p,ctx,mid),'');
 const mp=sp.computeStartPath({profile:JSON.stringify({version:1,purpose:'school',educationStage:'middle',startChoice:'new',goal:'daily'}),classNo:6,placement:null,choice:null,lessons:{},done:[],units:[],thematic:{}});
 assert.equal(mp.schoolOpen,false);assert.equal(mp.learningRoute,'needs-test');
});
