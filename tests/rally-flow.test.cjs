const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
async function fixture(){
 const dom=new JSDOM('<!doctype html><body><div id="tab-aktiviteler"><div class="az-grid2x2"></div></div></body>',{url:'https://rally.test/',runScripts:'dangerously',pretendToBeVisual:true});
 const w=dom.window;w.aktifOgrenciAdi='Ada';w.apiURL='https://rally.test/functions/v1/diji-api';w.structuredClone=structuredClone;w.ResizeObserver=class{observe(){}disconnect(){}};
 const noop=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(target,key)=>target[key]||noop,set:(target,key,value)=>(target[key]=value,true)});
 let time=0,callbacks=new Map(),id=0,run,answers=0,starts=0;
 w.requestAnimationFrame=fn=>{callbacks.set(++id,fn);return id};w.cancelAnimationFrame=id=>callbacks.delete(id);
 const q=i=>i<12?{word:'word '+i,direction:'en-tr',options:['Elma','Armut']}:null;
 const view=()=>structuredClone({...run,question:run.finished?null:q(run.state.index),nextQuestion:run.finished?null:q(run.state.index+1)});
 w.fetch=async(url,opt)=>{const b=JSON.parse(opt.body);let d;
 if(b.action==='setup')d={ok:true,classNo:1,units:[{id:1}],level:{unlocked:1,max:160},access:{plan:'free',remaining:1,limit:1,period:'day'}};
 else if(b.action==='start'){starts++;run={ok:true,runId:b.runId,totalQuestions:12,classNo:1,units:[1],finished:false,state:{index:0,score:0,hearts:2,correct:0,wrong:0,combo:0,bestCombo:0,answers:[]}};d=view()}
 else if(b.action==='answer'){assert.equal(b.round,run.state.index,'one answer per authoritative checkpoint');answers++;run.state.index++;run.state.correct++;run.state.score+=120;run.state.last={correct:true,delta:120};if(run.state.index===12){run.finished=true;run.reward={xp:100,gold:20}}d=view()}
 else throw Error(b.action);
 return {ok:true,json:async()=>d};};
 w.eval(fs.readFileSync('ingilizce/kelime-rallisi.js','utf8'));w.ralliOyunAc();
 const flush=()=>new Promise(r=>setImmediate(r));await flush();
 const step=async(ms)=>{for(let passed=0;passed<ms;passed+=50){time+=50;const jobs=[...callbacks.values()];callbacks.clear();jobs.forEach(fn=>fn(time));await flush();}};
 return {dom,w,step,flush,get starts(){return starts},get answers(){return answers}};
}
test('automatic curriculum, two visible gate rows, and continuous checkpoint motion through all 12 words',async()=>{
 const f=await fixture(),{w}=f,d=w.document;
 try{
 assert.equal(d.querySelectorAll('[data-class],[data-unit],[data-units-open]').length,0);
 assert.equal(d.querySelector('#rallyGame').dataset.musicPaused,'true');
 d.querySelector('[data-start]').click();await f.flush();await f.step(3550);
 assert.equal(w.dmRallyCore.snapshot().phase,'drive');
 assert.equal(d.querySelector('#rallyGame').dataset.musicPaused,'false');
 assert.equal(d.querySelectorAll('.rr-preview-gate:not([hidden])').length,2);
 let previous=w.dmRallyCore.snapshot().distance;
 for(let i=0;i<150&&f.answers<12;i++){
  await f.step(250);const s=w.dmRallyCore.snapshot();assert(s.distance>previous,'track keeps moving');previous=s.distance;
  if(f.answers<12)assert.equal(s.phase,'drive','no feedback, countdown, or saving stop between normal responses');
 }
 assert.equal(f.answers,12);assert.equal(f.starts,1);await f.step(1200);assert.equal(w.dmRallyCore.snapshot().phase,'result');
 assert.equal(d.querySelector('#rallyGame').dataset.musicPaused,'true');
 }finally{w.dmRally.close();f.dom.window.close()}
});
test('pause freezes the track and resumes the same gate without charging another run',async()=>{
 const f=await fixture(),{w}=f,d=w.document;
 try{d.querySelector('[data-start]').click();await f.flush();await f.step(3550);await f.step(700);d.querySelector('.rr-pause').click();const before=w.dmRallyCore.snapshot();await f.step(3000);assert.equal(w.dmRallyCore.snapshot().distance,before.distance);assert.equal(d.querySelector('#rallyGame').dataset.musicPaused,'true');d.querySelector('[data-continue]').click();await f.step(500);assert(w.dmRallyCore.snapshot().distance>before.distance);assert.equal(f.starts,1)}finally{w.dmRally.close();f.dom.window.close()}
});
