const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'ingilizce/thematic-learning.js'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(root,'ingilizce/thematic-curriculum.json'),'utf8'));
const pilot=JSON.parse(fs.readFileSync(path.join(root,'content/visual-learning-a1-pilot.json'),'utf8'));

test('visual pilot is syntactically valid and uses local assets with no extra API call',()=>{
 new vm.Script(source,{filename:'thematic-learning.js'});
 assert.match(source,/function mountPilotExercise\(area,lesson,cards\)/);
 assert.match(source,/mountPilotExercise\(area,chapter,cards\)/);
 assert.match(source,/const pilotAtlas=Object\.freeze/);
 assert.match(source,/const pilotEmoji=Object\.freeze/);
 const fragment=source.slice(source.indexOf('function mountPilotExercise('),source.indexOf('function art(card,'));
 assert.doesNotMatch(fragment,/\bfetch\s*\(|\bapi\s*\(|supabase/i);
 assert.match(fragment,/lesson\.part!==1/);
 assert.match(fragment,/data-pilot-feedback aria-live="polite"/);
 assert.match(fragment,/button\.disabled=true/);
});
test('20 initial illustrated terms exist, image assets resolved in static pilot code',()=>{
 assert.equal(pilot.words.length,20);
 const words=pilot.words.map(c=>c.en);
 assert.equal(new Set(words).size,20);
 for(const word of words){
  const pattern=new RegExp('(?:^|[,\\s])'+word+'\\s*:', 'm');
  assert.match(source,pattern,'Missing visual mapping: '+word);
 }
});
test('existing curriculum and grading remain unchanged by pilot',()=>{
 assert.equal(data.chapters.length,412);
 assert.equal(data.themes.length,46);
 const words=['apple','banana','bread','milk','cat','dog','bird','fish','book','pencil','bag','chair','car','bicycle','bus','tree'];
 for(const word of words){
  const found=data.chapters.some(c=>c.cards.some(x=>x.en===word&&x.image&&x.image.type==='sprite'));
  assert.ok(found,word+' has a reviewed sprite in the original curriculum');
 }
 assert.ok(data.chapters.some(c=>c.topicTitle==='Taşıtlar'));
 assert.ok(data.chapters.some(c=>c.topicTitle==='Hava Durumu'));
 assert.ok(data.chapters.some(c=>c.cards.some(x=>x.en==='house')));
 assert.ok(data.chapters.some(c=>c.cards.some(x=>x.en==='school')));
});
