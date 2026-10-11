const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const client=require('../ingilizce/story-exercises.js');
const code=fs.readFileSync('supabase/functions/diji-api/story-v2.ts','utf8');
const ctx={};vm.createContext(ctx);
vm.runInContext(stripTypeScriptTypes(code,{mode:'transform'}).replaceAll('export ','')+'\nglobalThis.api={storyV2Steps,storyV2Grade};',ctx);
const server=ctx.api,view={window:{}};vm.createContext(view);
vm.runInContext(fs.readFileSync('ingilizce/story-curriculum.js','utf8'),view);
for(const chapter of view.window.DMStoryCurriculum){
 const a=client.build(chapter),b=server.storyV2Steps(chapter);
 assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),chapter.title+' client/server deck divergence');
 for(const t of a){
  if(t.kind==='match'){assert(server.storyV2Grade(t,t.pairs).correct);assert(!server.storyV2Grade(t,[]).valid);}
  else{const answer=t.kind==='complete'||t.kind==='choose'||t.kind==='translate'?t.answer:t.en;assert(server.storyV2Grade(t,answer).correct,chapter.title+' correct answer rejected');assert(!server.storyV2Grade(t,'totally wrong answer').correct);}
 }
}
console.log('PASS all 40 chapters client/server parity and authoritative grading');
