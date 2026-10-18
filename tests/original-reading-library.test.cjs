const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const client=require('../ingilizce/learning-dialogues.js');
const server=require('../supabase/functions/diji-api/learning-dialogues.js');
test('original reading library covers five stories and five dialogues per A1-B2 level',()=>{
 assert.deepEqual(server,client);
 const ids=new Set;
 for(const level of ['A1','A2','B1','B2']){
  for(const type of ['story','dialogue']){
   const items=client.filter(x=>x.level===level&&(x.type||'dialogue')===type);
   assert.ok(items.length>=5,level+' '+type+' count '+items.length);
  }
 }
 for(const text of client){
  assert.ok(!ids.has(text.id),'Duplicate: '+text.id);ids.add(text.id);
  assert.ok(text.title&&text.scene&&text.icon&&text.lines.length>=4,text.id);
  assert.ok(text.lines.every(x=>Array.isArray(x)&&x.length===2&&x.every(Boolean)),text.id);
  assert.ok(text.words.length>=1&&text.words.every(x=>x.en&&x.tr),text.id);
  assert.equal(text.questions.length,3,text.id);
  for(const q of text.questions){
   assert.ok(['reading','listening','writing'].includes(q.skill),text.id);
   assert.ok(q.prompt&&q.answer&&q.explanation,text.id);
   if(q.options)assert.ok(q.options.length===3&&q.options.includes(q.answer),text.id);
   if(q.answers)assert.ok(q.answers.includes(q.answer),text.id);
  }
 }
 assert.equal(client.length,45);
});
test('reader UI distinguishes prose stories and groups by CEFR level',()=>{
 const src=fs.readFileSync('ingilizce/learning-companion.js','utf8');
 assert.match(src,/s\.type==='story'\?'Hikâye':'Diyalog'/);
 assert.match(src,/\['A1','A2','B1','B2'\]/);
 assert.match(src,/Hikâye metni/);
});
