import test from 'node:test';
import assert from 'node:assert/strict';
import { papiRecognitionClass } from '../src/speech.js';
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  let listener, last, removed=0; const aborted=[];
  const plugin={addListener:async(_,fn)=>{listener=fn;return {remove:async()=>{removed++}}},start:async args=>{last=args},abort:async args=>aborted.push(args.session)};
  const Recognition=papiRecognitionClass(plugin);
  return {Recognition,send:(kind,value,session=last.session)=>listener({kind,value,session}),last:()=>last,removed:()=>removed,aborted};
}
test('native Papi produces interim text then exactly one final event',async()=>{
  const f=fixture(),r=new f.Recognition(),results=[];let ended=0,ready=0;
  r.onstart=()=>ready++;r.onresult=e=>results.push([e.results[0][0].transcript,e.results[0].isFinal]);r.onend=()=>ended++;
  r.start();await tick();f.send('ready');f.send('partial','hello');f.send('final','hello there');f.send('final','duplicate');
  assert.equal(ready,1);assert.deepEqual(results,[['hello',false],['hello there',true]]);assert.equal(ended,1);assert.equal(f.removed(),1);
});
test('cancel and restart reject stale native callbacks',async()=>{
  const f=fixture(),a=new f.Recognition();a.start();await tick();const old=f.last().session;a.abort();
  const b=new f.Recognition();let results=0;b.onresult=()=>results++;b.start();await tick();
  f.send('final','old',old);assert.equal(results,0);f.send('final','new');assert.equal(results,1);assert(f.aborted.includes(old));
});
test('abort before listener preparation never starts native recording',async()=>{
  const f=fixture(),r=new f.Recognition();r.start();r.abort();await tick();assert.equal(f.last(),undefined);assert.equal(f.removed(),1);
});
