const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../ingilizce/route-questions.js'),'utf8');
const data=new Map(),localStorage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
const load=()=>{const context=vm.createContext({localStorage});vm.runInContext(source,context);return context.DMRouteQuestions.matchingWords;};
const en=w=>w.en,tr=w=>w.tr,shuffle=a=>a.slice().reverse();let pick=load();
const target={en:'apple',tr:'elma'},pool=[target,...Array.from({length:9},(_,i)=>({en:'word '+i,tr:'kelime '+i}))];
const batches=Array.from({length:3},()=>Array.from(pick(target,pool,en,tr,shuffle,'student-a')));
assert(batches.every(b=>b.length===4&&b[0]===target));assert.equal(new Set(batches.flatMap(b=>b.slice(1).map(en))).size,9);
// History survives a new page and cycles through the oldest batch first.
pick=load();assert.deepEqual(Array.from(pick(target,pool,en,tr,shuffle,'student-a')).slice(1).map(en),batches[0].slice(1).map(en));
assert.deepEqual(Array.from(pick(target,pool,en,tr,shuffle,'student-b')).slice(1).map(en),batches[0].slice(1).map(en));
const ambiguous=[target,{en:' APPLE! ',tr:'başka'},{en:'fruit',tr:'Elma!'},{en:'book',tr:'kitap'},{en:'BOOK.',tr:'defter'},{en:'notebook',tr:'kitap'},{en:'water',tr:'su'},{en:'',tr:'boş'}];
const words=Array.from(pick(target,ambiguous,en,tr,shuffle,'student-c'));
const norm=x=>x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
assert.equal(new Set(words.map(w=>norm(en(w)))).size,words.length);assert.equal(new Set(words.map(w=>norm(tr(w)))).size,words.length);
assert.equal(words.length,4);assert.equal(pick(target,[target],en,tr,shuffle,'small').length,1);
const blocked=vm.createContext({localStorage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}});vm.runInContext(source,blocked);assert.equal(blocked.DMRouteQuestions.matchingWords(target,pool,en,tr,shuffle,'blocked').length,4);
console.log('PASS rotating extras across stops, history reload, learner isolation, unique English/Turkish pairs, small pool, blocked storage');
