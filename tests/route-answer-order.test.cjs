const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const CORE=require('../ingilizce/learning-core.js'),SCHOOL=require('../ingilizce/school-curriculum.js'),DATA=require('../ingilizce/thematic-curriculum.json');
function random(seed=1987){let n=seed;return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};}
test('presentation is independent per question, covers every answer position and is stable on redraw',()=>{
 const order=CORE.presentation(random()),values=Object.freeze(['correct','a','b','c']),seen=new Set(),counts=[0,0,0,0];
 for(let i=0;i<400;i++){const indices=order('question:'+i,values);assert.deepEqual([...indices].sort(),[0,1,2,3]);seen.add(indices.join());counts[indices.indexOf(0)]++;assert.deepEqual(order('question:'+i,values),indices);indices.reverse();assert.notDeepEqual(order('question:'+i,values),indices);}
 assert.equal(seen.size,24);assert(counts.every(n=>n>60&&n<140));assert.deepEqual(values,['correct','a','b','c']);
});
test('final review has no fixed alternating/parity pattern; new attempts receive independent layouts',()=>{
 const rng=random(1776),patterns=new Set();
 for(let attempt=0;attempt<128;attempt++){const order=CORE.presentation(rng);patterns.add(Array.from({length:4},(_,i)=>order('review:'+i,['right','wrong']).indexOf(0)).join(''));}
 assert.equal(patterns.size,16);assert(patterns.has('0000')&&patterns.has('1111')&&patterns.has('0101'));
});
test('changed options replace a cached layout and repeated letter tokens retain their canonical indices',()=>{
 const order=CORE.presentation(random());assert.deepEqual([...order('same',['a','b'])].sort(),[0,1]);assert.deepEqual([...order('same',['a','b','c'])].sort(),[0,1,2]);assert.deepEqual([...order('letters',['o','o','b','k'])].sort(),[0,1,2,3]);assert.deepEqual(order('empty',[]),[]);assert.deepEqual(order('one',['a']),[0]);
});
test('all learning chapters and school question kinds retain their authoritative grading after display shuffling',()=>{
 const order=CORE.presentation(random()),school=SCHOOL.build([{en:'book',tr:'kitap'},{en:'good morning',tr:'günaydın'},{en:'classroom',tr:'derslik'},{en:'Friday',tr:'Cuma'}]);
 for(const [group,deck,grade] of [...DATA.chapters.map(c=>[c.id,CORE.deck(c,DATA.chapters.find(x=>x.id===c.previousId)),CORE.grade]),['school',school,SCHOOL.grade]])for(const [slot,t] of deck.entries()){
  const before=JSON.stringify(t);if(t.kind==='choice'){const shown=order(group+':'+slot,t.options).map(i=>t.options[i]);assert(grade(t,shown.find(x=>x===t.answer)).correct);const wrong=shown.find(x=>x!==t.answer);if(wrong)assert.equal(grade(t,wrong).correct,false);}
  if(t.kind==='review'){const answers=t.cards.map((c,i)=>order(group+':'+slot+':'+i,c.options).map(j=>c.options[j]).find(x=>x===c.tr));assert(grade(t,answers).correct);}
  assert.equal(JSON.stringify(t),before);
 }
 assert.equal(fs.readFileSync('ingilizce/learning-core.js','utf8'),fs.readFileSync('supabase/functions/thematic-learning/learning-core.js','utf8'));
});
