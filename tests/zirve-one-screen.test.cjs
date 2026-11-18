'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('ingilizce/zirve-kampanya.js','utf8');
function fixture(){
 const end=source.indexOf('\ncaptureTeacherInvite();\ncaptureInvite();');
 assert(end>0);
 const mk=()=>({style:{setProperty(){}},classList:{contains(){return false},add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},querySelector(){return mk()},remove(){},isConnected:true});
 const window={addEventListener(){},removeEventListener(){}};
 const document={addEventListener(){},createElement:mk,body:{append(){}},documentElement:mk(),querySelector:()=>null};
 const frames=[];
 const scope={window,document,localStorage:{getItem:()=> 'token',setItem(){}},sessionStorage:{getItem:()=>JSON.stringify({teacherToken:'token'})},requestAnimationFrame:fn=>{frames.push(fn);return frames.length},cancelAnimationFrame(){},getComputedStyle:()=>({paddingTop:'50px',paddingBottom:'20px'})};
 vm.runInNewContext(source.slice(0,end)+'\nwindow.testApi={studentGoals,compactGoal,fitHub,openStudentHub,openTeacherHub,setStatus:fn=>{status=fn},getLayer:()=>layer};})();',scope);
 return {api:window.testApi,frames};
}
const campaign={phase:'soon',daysToStart:2,startsOn:'2026-11-20',endsOn:'2026-12-10'};
test('student hub has only two task cards and working control bindings',async()=>{
 const {api}=fixture();
 api.setStatus(async()=>({ok:true,visible:true,role:'student',campaign,me:{xp:1200,today:900},invite:{verified:2,pending:1,code:'ABC123'},cap:3500}));
 await api.openStudentHub();
 const el=api.getLayer(),h=el.innerHTML;
 assert.match(h,/2 \/ 5/);assert.match(h,/900 \/ 3\.500/);
 assert.match(h,/3 doğrulanmış davet kaldı/);assert.match(h,/1 davet doğrulama bekliyor/);
 assert.match(h,/\?davet=ABC123/);for(const action of ['copy-invite','send-invite','invite','teacher','rules','rank'])assert(h.includes('data-zk="'+action+'"'));
 assert.equal((h.match(/zk-compact-goal/g)||[]).length,2);
 assert(!h.includes('zk-rank-goals'));assert(el.className.includes('zk-one-screen'));
 assert.match(api.compactGoal('test',5,5),/✓ 5 \/ 5/);
});
test('teacher has original stats, real goals and actions on one hub',async()=>{
 const {api}=fixture();
 api.setStatus(async()=>({ok:true,visible:true,role:'teacher',campaign,teacher:{students:2,need:8,avg:100,eligible:false,code:'TE123'}}));
 await api.openTeacherHub();
 const el=api.getLayer(),h=el.innerHTML;
 assert.match(h,/2 \/ 10/);assert.match(h,/8 öğrenci/);assert.match(h,/Öğrenci başı ort\. XP/);
 for(const attr of ['data-add','data-rank','data-rules','zk-teacher-info'])assert(h.includes(attr));
 assert(el.className.includes('zk-teacher-hub zk-one-screen'));
});
test('fit scales down only when necessary and keeps access on very short screens',()=>{
 const {api,frames}=fixture();let scale,fitted;
 const wrap={offsetHeight:700,style:{setProperty:(k,v)=>{scale=Number(v)}}};
 const el={clientHeight:750,isConnected:true,querySelector:()=>wrap,classList:{toggle:(k,v)=>{fitted=v}}};
 api.fitHub(el);frames.shift()();assert.equal(fitted,true);assert(scale<1&&scale>.85);
 el.zkFitDispose();
 el.clientHeight=500;api.fitHub(el);frames.shift()();assert.equal(fitted,false);assert.equal(scale,1);el.zkFitDispose();
});
