const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const stop=(c,u,p=51)=>200000+c*10000+u*100+p;
function load({name='ali',purpose='school',status=null,cache=[],pupil='',overview=null}={}){
 const listeners={},ctx={aktifOgrenciAdi:name,siniftaOynananOgrenci:pupil,globalDataCache:cache,yo:{dmLearningPurpose:purpose},innerWidth:400,innerHeight:800,
  requestAnimationFrame:f=>0,setTimeout,clearTimeout,Promise,Event:class{constructor(t){this.type=t}},
  MutationObserver:class{observe(){}},
  document:{readyState:'complete',body:{append(){}},head:{append(){}},createElement:()=>({style:{},setAttribute(){},append(){}}),addEventListener:(t,f)=>listeners[t]=f,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]}};
 ctx.window=ctx;ctx.dmLearningRoute={purpose:()=>purpose};ctx.dmProgression={status:()=>status};
 if(overview)ctx.dmStoryPath={overview:async()=>overview};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../ingilizce/game-access.js','utf8'),ctx);
 return ctx.dmGameAccess;
}
const units=[[stop(1,1),stop(1,2)],[stop(5,1),stop(5,2),stop(5,3)],[stop(6,1),stop(6,2),stop(6,3),stop(6,4)]];
test('school route: own class up to current parkur unit, every lower class open, higher classes locked',()=>{
 const g=load({status:{startPath:{startGrade:6},done:[stop(6,1),stop(6,2)],units}});
 assert.deepEqual({...g.rule()},{mode:'school',cls:6,unit:3});
 for(const c of [1,2,3,4,5])for(const u of [1,5,10])assert.equal(g.reason(c,u),'');
 assert.equal(g.reason(6,3),'');assert.equal(g.reason(6,1),'');
 assert.match(g.reason(6,4),/ünite/);assert.match(g.reason(7),/sınıf/);assert.match(g.reason(8,1),/8\. sınıf/);
});
test('school route keeps the furthest reached point open',()=>{
 const g=load({status:{startPath:{startGrade:5},done:[stop(5,1),stop(5,2),stop(5,3),stop(6,1)],units}});
 assert.deepEqual({...g.rule()},{mode:'school',cls:6,unit:2});assert.equal(g.reason(5,9),'');assert.equal(g.reason(6,2),'');assert.match(g.reason(6,3),/ünite/);
});
test('learning route opens grades 1-7; grade 8 needs the A1 learning route',async()=>{
 const g=load({purpose:'independent',overview:{chapters:[{cefr:'A1',done:true},{cefr:'A1',done:false},{cefr:'A2',done:false}]}});
 assert.equal(g.reason(7,12),'');assert.match(g.reason(8,1),/A1/);
 await new Promise(r=>setTimeout(r,10));assert.match(g.reason(8,1),/A1/);
 const h=load({purpose:'independent',overview:{chapters:[{cefr:'A1',done:true},{cefr:'A2',done:false}]}});
 h.reason(8,1);await new Promise(r=>setTimeout(r,10));assert.equal(h.reason(8,1),'');
});
test('teacher and demo accounts have no game locks',()=>{
 for(const name of ['teacher','dijimedu_demo','DijiMedu_Demo']){const g=load({name,status:{startPath:{startGrade:1},done:[],units}});assert.equal(g.rule(),null);assert.equal(g.reason(8,10),'');}
});
test('classroom play uses the selected pupil class',()=>{
 const g=load({name:'teacher',pupil:'Ayşe',cache:[{ogrenci:'Ayşe',Sinif:4}]});
 assert.equal(g.reason(4,9),'');assert.match(g.reason(5,1),/4\. sınıf/);
});
