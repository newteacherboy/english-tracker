import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlacements} from '../src/ad-placements.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({teacher=false,prepare=true}={}) {
 const handlers=new Map(),store=new Map([['ing_token','test-token']]);let shown=0,closed=0,prepared=0;
 const classes={contains:()=>false,toggle(){}};
 const win={dmAndroidStudentName:()=>teacher?'teacher':'student',dmAndroidIsTeacher:()=>teacher,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},sessionStorage:{getItem:()=>null},document:{hidden:false,head:{append(){}},body:{classList:classes},documentElement:{matches:()=>false,style:{setProperty(){}},classList:classes},createElement:()=>({}),querySelectorAll:()=>[],addEventListener(){}},MutationObserver:class{observe(){}},requestAnimationFrame:fn=>fn(),addEventListener(){},genelSonucEkraniGoster(){},genelSonucKapat(){closed++;}};
 const admob={addListener:async(name,fn)=>{handlers.set(name,fn);return{remove:async()=>handlers.delete(name)};},prepareInterstitial:async()=>{prepared++;if(!prepare)throw Error('no fill');},showInterstitial:async()=>{shown++;handlers.get('shown')?.();handlers.get('closed')?.();},removeBanner:async()=>{},showBanner:async()=>{}};
 const service=createPlacements({admob,ads:{busy:false,ensureInitialized:async()=>{}},win,interstitialEvents:{Showed:'shown',Dismissed:'closed',FailedToShow:'failed'},bannerEvents:{SizeChanged:'size',FailedToLoad:'bannerfail'}});
 service.start();
 return{win,service,get shown(){return shown},get closed(){return closed},get prepared(){return prepared}};
}
test('third finished solo game shows a ready interstitial before invoking its original exit once',async()=>{
 const f=fixture();
 for(let i=1;i<=3;i++){
  f.win.genelSonucEkraniGoster({runId:String(i),oyunKey:'ky',dogru:10,yanlis:2});await tick();
  f.win.genelSonucKapat('devam');await tick();
 }
 assert.equal(f.shown,1);assert.equal(f.closed,3);
 f.win.genelSonucKapat('devam');await tick();assert.equal(f.shown,1);
});
test('unavailable interstitial never blocks the game exit',async()=>{
 const f=fixture({prepare:false});
 for(let i=1;i<=3;i++){f.win.genelSonucEkraniGoster({runId:String(i),oyunKey:'ky',dogru:10});await tick();f.win.genelSonucKapat('devam');}
 assert.equal(f.shown,0);assert.equal(f.closed,3);assert.equal(f.prepared,1);
});
test('teacher result screens exit normally without requesting advertisements',async()=>{
 const f=fixture({teacher:true});
 for(let i=1;i<=5;i++){f.win.genelSonucEkraniGoster({runId:String(i),oyunKey:'ky',dogru:10});f.win.genelSonucKapat('devam');}
 await tick();assert.equal(f.shown,0);assert.equal(f.prepared,0);assert.equal(f.closed,5);
});
