const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('ingilizce/thematic-learning.js','utf8');
const DATA=require('../ingilizce/thematic-curriculum.json');
function route(selected,completed=[]){
 const done=new Set(completed),ctx={data:DATA,selectedStart:selected,done:id=>done.has(id),levelOpen:()=>true,levelNext:code=>DATA.chapters.find(c=>c.cefr===code&&!done.has(c.id)),levelNextCached:code=>DATA.chapters.find(c=>c.cefr===code&&!done.has(c.id))?.id,LEVELS:['A1','A2','B1','B2'],access:{startCefr:'A1'}};
 vm.createContext(ctx);const start=source.indexOf('const indexOfChapter='),end=source.indexOf('function speech(',start);
 vm.runInContext(source.slice(start,end)+';globalThis.inspectRoute={next,unlockedChapter};',ctx);
 return {ctx,done,api:ctx.inspectRoute};
}
test('continue resumes from the account choice, skipping only completed chapters after it',()=>{
 const selected=DATA.chapters[200],f=route(selected.id);
 assert.equal(f.api.next().id,selected.id);assert.equal(f.api.unlockedChapter(selected),true);
 assert.equal(f.api.unlockedChapter(DATA.chapters[202]),false);
 f.done.add(selected.id);assert.equal(f.api.next().id,DATA.chapters[201].id);
 assert.equal(f.api.unlockedChapter(DATA.chapters[201]),true);
 assert.equal(f.api.unlockedChapter(DATA.chapters[0]),false);
});
test('continuation crosses a CEFR boundary instead of returning to an earlier unfinished level',()=>{
 const index=DATA.chapters.findIndex(c=>c.cefr==='B1')-1,selected=DATA.chapters[index];
 const f=route(selected.id,[selected.id]);
 assert.equal(f.api.next().id,DATA.chapters[index+1].id);
 assert.equal(f.api.unlockedChapter(DATA.chapters[index+1]),true);
 f.ctx.selectedStart=DATA.chapters[7].id;assert.equal(f.api.next().id,DATA.chapters[7].id);
});
test('start choice is confirmed by the server before opening and failures never open a chapter',async()=>{
 const code=source.slice(source.indexOf('async function startHere('),source.indexOf('\nconst API='));
 for(const fail of [false,true]){
  const calls=[],ctx={data:DATA,identity:()=> 'own-account',curriculum:async()=>{},status:async force=>calls.push(force?'fresh-status':'status'),api:async(action,payload)=>{calls.push([action,payload.chapter]);if(fail)throw Error('offline');},loadedAt:123,document:{dispatchEvent:()=>calls.push('event')},CustomEvent:class{},open:async id=>{calls.push(['open',id]);return true;}};
  vm.createContext(ctx);vm.runInContext(code+';globalThis.choose=startHere;',ctx);
  if(fail){await assert.rejects(ctx.choose(DATA.chapters[300].id),/offline/);assert.equal(calls.some(x=>Array.isArray(x)&&x[0]==='open'),false);}
  else{assert.equal(await ctx.choose(DATA.chapters[300].id),true);assert.deepEqual(JSON.parse(JSON.stringify(calls)),['status',['startHere',DATA.chapters[300].id],'fresh-status','event',['open',DATA.chapters[300].id]]);}
 }
});
