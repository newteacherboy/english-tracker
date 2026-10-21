const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const C=require('../ingilizce/konu-oyunlari-a2.js'),A=require('../ingilizce/konu-oyunlari-a1.js'),keys=require('./topic-games-a2-topics.json');
test('A2: exact 43 DB keys, 86 games, 12/22/9 categories, no pronunciation and exact server copies',()=>{
 assert.equal(C.length,43);assert.equal(C.flatMap(t=>t.games).length,86);assert.deepEqual(C.map(t=>t.key).sort(),keys.map(k=>[k.level,k.category,k.topic_name].join('|')).sort());
 for(const [c,n] of Object.entries({vocab:12,grammar:22,comm:9}))assert.equal(C.filter(t=>t.type===c).length,n);
 for(const f of ['konu-oyunlari-a1.js','konu-oyunlari-a2.js','topic-games-core.mjs'])assert.equal(fs.readFileSync('ingilizce/'+f,'utf8'),fs.readFileSync('supabase/functions/diji-api/'+f,'utf8'));
 assert(C.every(t=>t.key.startsWith('A2|')&&!t.key.includes('|pron|')));
});
for(const t of C)test('A2 schema, review and unique prompts: '+t.key,()=>{
 assert.equal(t.games.length,2);
 if(t.type==='vocab'){assert(t.items.length>=14);assert.equal(new Set(t.items.map(x=>x.en)).size,t.items.length);assert.equal(new Set(t.items.map(x=>x.icon)).size,t.items.length);assert(t.items.every(x=>x.en&&x.tr&&x.icon&&x.contextOk));}
 if(t.type==='grammar'){assert(t.items.length>=16);assert.equal(new Set(t.items.map(x=>x.before+'|'+x.after)).size,t.items.length);for(const x of t.items){assert(x.contextOk);assert(x.options.includes(x.answer));assert.equal(new Set(x.options).size,x.options.length);assert(x.options.length>=2&&x.options.length<=4);assert(t.rules[x.answer]);assert(x.falseSentence);assert(x.tr);assert(!x.falseSentence.includes('___'));}}
 if(t.type==='comm'){assert.equal(t.chat.turns.length,8);assert(t.situations.length>=10);for(const xs of [t.chat.turns,t.situations]){assert.equal(new Set(xs.map(x=>x.say||x.tr)).size,xs.length);for(const x of xs){assert(x.contextOk);assert(x.tr&&x.rightTr&&x.right);assert(!x.wrong.includes(x.right));assert.equal(new Set([x.right,...x.wrong]).size,x.wrong.length+1);}}}
});
test('English-only review markers cover ALL A1/A2 items and false cards use grammatical corruption',async()=>{
 const {buildQuestions,sentence}=await import('../ingilizce/topic-games-core.mjs');
 for(const t of [...A,...C]){for(const x of t.items||[...t.chat.turns,...t.situations])assert(x.contextOk,t.key);for(const game of t.games){const qs=buildQuestions(t,game,()=>.6);assert.equal(qs.length,['kova','balon','dy'].includes(game)?10:8);for(const q of qs){assert(q.options.some(o=>o.id===q.correct));assert.equal(new Set(q.options.map(o=>o.id)).size,q.options.length);}if(game==='dy'){assert.equal(qs.filter(q=>q.correct==='false').length,5);for(const q of qs.filter(q=>q.correct==='false')){const x=t.items.find(x=>sentence(x,x.answer)===q.en);assert(x);if(x.falseSentence)assert.equal(q.sentence,x.falseSentence);assert.notEqual(q.sentence,q.en);}}}}
});
test('A2 lazy load only; dark styles absent; account-scoped sound preference and global mute respected',()=>{
 const s=fs.readFileSync('ingilizce/konu-oyunlari.js','utf8'),css=fs.readFileSync('ingilizce/konu-oyunlari.css','utf8'),html=fs.readFileSync('ingilizce/index.html','utf8');assert(!/prefers-color-scheme|data-theme=dark|body\.dark/.test(css));assert(!html.includes('src="konu-oyunlari-a2.js'));assert(s.includes("'dm-topic-sound:'+who().toLowerCase()"));assert(s.includes('window.dmSoundEnabled!==false'));assert(s.includes("effect(good?'right':'wrong')"));assert(s.includes("effect(d.yuzde>=80?'win':'finish')"));assert(s.includes('},350)'));
});
test('A2 API rejects locked learners, permits open learners/teacher/trusted demo and fails closed on lookup error',async()=>{
 const {buildQuestions,answerKey,validPicks}=await import('../ingilizce/topic-games-core.mjs'),{studyAccess}=await import('../supabase/functions/diji-api/start-path.mjs');let max='A1',lookups=0,broken=false;
 const db={rpc:async()=>({data:{},error:broken?Error('db'):null}),from(table){let match={},payload;const q={select(){return q},eq(k,v){match[k]=v;return q},gt(){return q},gte(){return q},lt(){return q},lte(){return q},delete(){return q},insert(p){payload=p;return q},async maybeSingle(){return {data:table==='lesson_topics'?{topic_name:match.topic_name}:null,error:null}},then(a,b){return Promise.resolve({data:payload,count:0,error:null}).then(a,b)}};return q;}};
 const scope={DijiTopicGamesB1:require('../ingilizce/konu-oyunlari-b1.js'),DijiTopicGamesA1:A,DijiTopicGamesA2:C,buildQuestions,answerKey,validPicks,studyAccess,loadStartPath:async()=>{lookups++;return {maxCefr:max}},isDemo:a=>a?.role==='student'&&a.student_id==='dcde2026-1015-4000-8000-000000000001',crypto,Intl,Date,Math};scope.globalThis=scope;vm.createContext(scope);
 const code=require('node:module').stripTypeScriptTypes(fs.readFileSync('supabase/functions/diji-api/topic-games-api.ts','utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace('export function','function');vm.runInContext(code+';globalThis.make=topicGamesAPI',scope);
 const api=scope.make(db,(d,status=200)=>({d,status})),b={topicKey:C.find(t=>t.type==='grammar').key,game:'balon'},call=a=>api.handle('konuOyunBaslat',b,new URLSearchParams(),a,'POST');
 let r=await call({role:'student',student_id:'real',studyAccess:{A2:true}});assert.equal(r.status,403);assert.equal(r.d.mesaj,'Bu seviye henüz açık değil.');max='A2';assert.equal((await call({role:'student',student_id:'real'})).status,200);
 max='A1';const before=lookups;assert.equal((await call({role:'teacher'})).status,200);assert.equal((await call({role:'student',student_id:'dcde2026-1015-4000-8000-000000000001'})).status,200);assert.equal(lookups,before);assert.equal((await call(null)).status,403);broken=true;assert.equal((await call({role:'student',student_id:'real'})).status,503);
});
