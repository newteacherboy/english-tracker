const {test,afterEach}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const DATA=require('../ingilizce/thematic-curriculum.json'),CORE=require('../ingilizce/learning-core.js'),V8=require('../ingilizce/thematic-v8-candidate.js');
const windows=[];afterEach(()=>{for(const w of windows.splice(0))w.close();});
const flush=()=>new Promise(r=>setImmediate(r));
async function fixture(start=0,hook){
 const dom=new JSDOM('<button id="outside">Parkur</button>',{url:'https://learning.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,calls=[];let cursor=start,version=0;
 windows.push(w);w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.matchMedia=()=>({matches:false});w.DMLearningCore=CORE;w.DMThematicV8Candidate=V8;w.apiURL='https://learning.test/functions/v1/diji-api';w.aktifOgrenciAdi='Ada';w.localStorage.setItem('ing_token','fixture');w.speechSynthesis={cancel(){},speak(){}};
 w.fetch=async(url,opt)=>{
  if(!opt?.body)return {ok:true,json:async()=>DATA};const b=JSON.parse(opt.body);calls.push(b);
  if(hook)await hook(b,()=>{cursor++;version++;});
  if(b.action==='advance'){assert.equal(b.cursor,cursor);assert.equal(b.version,version);assert.equal(b.answer,true);cursor++;version++;}
  return {ok:true,json:async()=>({ok:true,chapter:DATA.chapters[0].id,deckVersion:8,cursor,version,accepted:true,finished:false,wallet:{energy:25,energyMax:25,gold:0,combo:0}})};
 };
 w.eval(fs.readFileSync('ingilizce/thematic-learning.js','utf8'));await w.dmThematicLearning.open(DATA.chapters[0].id,{intro:true});const startButton=w.document.querySelector('.ml-entry-start');if(!startButton){const message=w.document.body.textContent;w.close();throw Error(message);}startButton.click();
 return {w,calls,cursor:()=>cursor};
}
async function settle(f){for(let i=0;i<15&&f.w.document.getElementById('dmStoryLesson')?.dataset.taskKind==='teach';i++)await flush();}
test('all new expressions share one page and one click acknowledges teaching only before the original question',async()=>{
 const f=await fixture(),w=f.w,chapter=DATA.chapters[0];assert.deepEqual([...w.document.querySelectorAll('[data-learn] b')].map(b=>b.textContent),chapter.cards.map(c=>c.en));assert.match(w.document.querySelector('.ml-actions button').textContent,/10 soruya başla/);
 const untouched=JSON.stringify(V8.build(chapter,null).slice(4));w.document.querySelector('.ml-actions button').click();await settle(f);
 assert.deepEqual(f.calls.filter(b=>b.action==='advance').map(b=>b.cursor),[0,1,2,3]);assert.equal(f.cursor(),4);assert.equal(w.document.getElementById('dmStoryLesson').dataset.taskKind,V8.build(chapter,null)[4].kind);assert.equal(JSON.stringify(V8.build(chapter,null).slice(4)),untouched);w.close();
});
test('resuming halfway through teaching still shows every expression and only acknowledges remaining stages',async()=>{
 const f=await fixture(2);assert.equal(f.w.document.querySelectorAll('[data-learn]').length,3);f.w.document.querySelector('.ml-actions button').click();await settle(f);assert.deepEqual(f.calls.filter(b=>b.action==='advance').map(b=>b.cursor),[2,3]);assert.equal(f.cursor(),4);f.w.close();
});
test('double click cannot duplicate teaching advances',async()=>{
 let release;const pending=new Promise(r=>release=r),f=await fixture(0,b=>b.action==='advance'&&b.cursor===0?pending:undefined);const button=f.w.document.querySelector('.ml-actions button');button.click();button.click();assert(button.disabled);release();await settle(f);assert.deepEqual(f.calls.filter(b=>b.action==='advance').map(b=>b.cursor),[0,1,2,3]);f.w.close();
});
test('an interrupted batch reconciles the persisted cursor and safely resumes without answering a question',async()=>{
 let fail=true;const f=await fixture(0,(b,save)=>{if(b.action==='advance'&&b.cursor===1&&fail){fail=false;save();throw Error('connection lost after commit');}});f.w.document.querySelector('.ml-actions button').click();for(let i=0;i<8;i++)await flush();assert.equal(f.cursor(),2);assert.equal(f.w.document.getElementById('dmStoryLesson').dataset.taskKind,'teach');f.w.document.querySelector('.ml-actions button').click();await settle(f);assert.deepEqual(f.calls.filter(b=>b.action==='advance').map(b=>b.cursor),[0,1,2,3]);assert.equal(f.cursor(),4);f.w.close();
});
test('closing during teaching leaves subsequent acknowledgements and the next question untouched',async()=>{
 let release;const pending=new Promise(r=>release=r),f=await fixture(0,b=>b.action==='advance'?pending:undefined);f.w.document.querySelector('.ml-actions button').click();f.w.dmThematicLearning.close(true);release();await flush();assert.equal(f.calls.filter(b=>b.action==='advance').length,1);assert(!f.w.document.getElementById('dmStoryLesson'));f.w.close();
});
