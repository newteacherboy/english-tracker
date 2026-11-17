// Kayıtta seçilen amaç parkuru belirler; var olan rota ezilmez.
const test=require('node:test'),assert=require('assert/strict'),path=require('path');
function fakeDb(rows){const calls=[];const q=(table)=>{const st={table,filters:{}};const api={select(){return api;},eq(k,v){st.filters[k]=v;return api;},maybeSingle:async()=>({data:rows.yo?{value:rows.yo}:null,error:null}),
 update(v){st.op='update';st.value=v;return api;},insert(v){calls.push({op:'insert',value:v.value});rows.yo=v.value;return Promise.resolve({error:null});},then(res,rej){if(st.op==='update'){calls.push({op:'update',value:st.value.value});rows.yo=st.value.value;}return Promise.resolve({error:null}).then(res,rej);}};return api;};return {db:{from:q},calls,rows};}
test('okul / kendim için rotası kayıtta yazılır, seçilmiş rota korunur',async()=>{
 const {seedLearningRoute,normalizeLearnerProfile}=await import(path.resolve(__dirname,'../supabase/functions/diji-api/learner-profile.mjs'));
 let f=fakeDb({});await seedLearningRoute(f.db,'s1',{version:1,purpose:'school',educationStage:'high'});assert.equal(f.rows.yo.dmLearningPurpose,'school');
 f=fakeDb({});await seedLearningRoute(f.db,'s2',{version:1,purpose:'independent'});assert.equal(f.rows.yo.dmLearningPurpose,'independent');
 f=fakeDb({yo:{altin:5,guncelleme:10}});await seedLearningRoute(f.db,'s3',{version:1,purpose:'school',educationStage:'university'});assert.equal(f.rows.yo.dmLearningPurpose,'school');assert.equal(f.rows.yo.altin,5);
 f=fakeDb({yo:{dmLearningPurpose:'independent'}});await seedLearningRoute(f.db,'s4',{version:1,purpose:'school'});assert.equal(f.calls.length,0);
 // Eski kayıt formları (öğrenim türü + sınıf) da rota alır.
 f=fakeDb({});await seedLearningRoute(f.db,'s5',normalizeLearnerProfile(undefined,'6','school'));assert.equal(f.rows.yo.dmLearningPurpose,'school');
 f=fakeDb({});await seedLearningRoute(f.db,'s6',normalizeLearnerProfile(undefined,null,'independent'));assert.equal(f.rows.yo.dmLearningPurpose,'independent');
});
