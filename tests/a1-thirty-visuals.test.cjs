const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'ingilizce/thematic-learning.js'),'utf8'),curriculum=JSON.parse(fs.readFileSync(path.join(root,'ingilizce/thematic-curriculum.json'),'utf8')),manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/media-rights-manifest.json'),'utf8'));
const words=[{"filename":"hello","term":"Hello!","id":1000},{"filename":"good-morning","term":"Good morning!","id":1000},{"filename":"good-evening","term":"Good evening!","id":1000},{"filename":"please","term":"Please.","id":1010},{"filename":"thank-you","term":"Thank you.","id":1010},{"filename":"goodbye","term":"Goodbye!","id":1010},{"filename":"mother","term":"mother","id":1024},{"filename":"father","term":"father","id":1024},{"filename":"sister","term":"sister","id":1024},{"filename":"friend","term":"friend","id":1026},{"filename":"neighbour","term":"neighbour","id":1026},{"filename":"classmate","term":"classmate","id":1026},{"filename":"hand","term":"hand","id":1036},{"filename":"arm","term":"arm","id":1036},{"filename":"leg","term":"leg","id":1036},{"filename":"eye","term":"eye","id":1038},{"filename":"ear","term":"ear","id":1038},{"filename":"nose","term":"nose","id":1038},{"filename":"happy","term":"happy","id":1040},{"filename":"sad","term":"sad","id":1040},{"filename":"excited","term":"excited","id":1040},{"filename":"hungry","term":"hungry","id":1042},{"filename":"thirsty","term":"thirsty","id":1042},{"filename":"full","term":"full","id":1042},{"filename":"in","term":"in","id":1054},{"filename":"on","term":"on","id":1054},{"filename":"under","term":"under","id":1054},{"filename":"wake-up","term":"wake up","id":1104},{"filename":"have-breakfast","term":"have breakfast","id":1104},{"filename":"go-to-bed","term":"go to bed","id":1104}];
test('visual code parses and presents graded options without grading changes',()=>{
 new vm.Script(source);assert.match(source,/function visualizeGradedChoice/);assert.match(source,/task=visualizeGradedChoice\(tasks\[session.cursor\],chapter\)/);
 const code=source.slice(source.indexOf('function visualizeGradedChoice('),source.indexOf('function art(card,'));
 assert.doesNotMatch(code,/\b(fetch|api|supabase)\s*\(/i);assert.match(code,/return \{\.\.\.task,images:mapped\}/);
});
test('all thirty illustrations correspond to A1 curriculum lesson cards and manifest',()=>{
 assert.equal(words.length,30);assert.equal(new Set(words.map(w=>w.term)).size,30);
 assert.equal(new Set(words.map(w=>w.id)).size,10);
 for(const w of words){const lesson=curriculum.chapters.find(c=>c.id===w.id);
 assert.equal(lesson.cefr,'A1');assert.ok(lesson.cards.some(c=>c.en===w.term),w.term);
 const file='ingilizce/learning-assets/visual-pilot/a1-'+w.filename+'.svg';
 const bytes=fs.readFileSync(path.join(root,file));assert.ok(bytes.length<12000);
 const record=manifest.assets.find(x=>x.path===file);assert.ok(record,w.term);
 assert.equal(record.sha256,crypto.createHash('sha256').update(bytes).digest('hex'),w.term);
 assert.ok(source.includes("'"+w.term.toLowerCase()+"':'a1-"+w.filename+"'"),w.term);
 }
});
test('each new visual topic provides three distinct selectable illustrations',()=>{
 for(const id of new Set(words.map(w=>w.id)))assert.equal(words.filter(w=>w.id===id).length,3);
});
