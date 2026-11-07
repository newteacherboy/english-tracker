const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
function handler(kind){
 const db={select(){throw Error('Body validation must precede DB access');},from(){throw Error('Body validation must precede DB access');},rpc(){throw Error('Body validation must precede RPC');}};
 if(kind==='papi-chat')return require('../supabase/functions/papi-chat/handler.ts').papiChatHandler({db,env:()=>'',fetch:()=>{throw Error('No provider calls');}});
 const file='supabase/functions/'+kind+'/core.ts',names={'thematic-learning':'thematicHandler','teacher-oral':'oralHandler','kelime-rallisi':'raceHandler'};
 const c={crypto,TextEncoder,Request,Response,URLSearchParams,console,DATA:{chapters:[]},DMLearningCore:{}};vm.createContext(c);
 const source=fs.readFileSync(file,'utf8').replace(/^import[^\n]+\n/gm,'');
 vm.runInContext(stripTypeScriptTypes(source,{mode:'transform'}).replaceAll('export ','')+';globalThis.make='+names[kind],c);
 return c.make(db);
}
for(const kind of ['thematic-learning','teacher-oral','kelime-rallisi','papi-chat']){
 test(kind+' stops an oversized stream before it is completely buffered',async()=>{
  const h=handler(kind);let pulled=0,cancelled=false;
  const stream=new ReadableStream({pull(controller){pulled++;controller.enqueue(new Uint8Array(3000));if(pulled===20)controller.close();},cancel(){cancelled=true;}});
  const r=await h(new Request('https://example.test/',{method:'POST',body:stream,duplex:'half'}));
  assert.equal(r.status,413);assert(cancelled);assert(pulled<20,'do not read the entire malicious body');
 });
 test(kind+' counts UTF-8 bytes and rejects malformed/non-object payloads',async()=>{
  const h=handler(kind);
  const unicode=JSON.stringify({action:'status',pad:'ş'.repeat(5000)});
  assert.equal((await h(new Request('https://example.test/',{method:'POST',body:unicode}))).status,413);
  for(const body of ['null','[]','true','1','"text"','{broken',''])assert.equal((await h(new Request('https://example.test/',{method:'POST',body}))).status,400,body);
  assert.equal((await h(new Request('https://example.test/',{method:'POST',headers:{'Content-Length':'999999'},body:'{}'}))).status,413);
 });
}
