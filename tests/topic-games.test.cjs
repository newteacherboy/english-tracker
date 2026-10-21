const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../ingilizce/konu-oyunlari-a1.js'),snapshot=require('./topic-games-topics.json');
const core=()=>import('../ingilizce/topic-games-core.mjs');
test('43 exact active DB keys, no pronunciation, category counts and mirrored files',()=>{
 assert.equal(C.length,43);assert.equal(new Set(C.map(t=>t.key)).size,43);
 assert.deepEqual(C.map(t=>t.key).sort(),snapshot.map(r=>[r.level,r.category,r.topic_name].join('|')).sort());
 for(const [type,n] of Object.entries({vocab:12,grammar:22,comm:9}))assert.equal(C.filter(t=>t.type===type).length,n);
 assert(C.every(t=>t.key.startsWith('A1|')&&!t.key.includes('|pron|')));
 for(const f of ['konu-oyunlari-a1.js','topic-games-core.mjs'])assert.equal(fs.readFileSync('ingilizce/'+f,'utf8'),fs.readFileSync('supabase/functions/diji-api/'+f,'utf8'));
});
for(const t of C)test('content schema and unique prompts: '+t.key,()=>{
 assert.equal(t.games.length,2);assert(t.games.every(g=>t.titles[g]));
 if(t.type==='vocab'){assert(t.items.length>=14);assert.equal(new Set(t.items.map(x=>x.en)).size,t.items.length);assert.equal(new Set(t.items.map(x=>x.color||x.icon)).size,t.items.length);for(const x of t.items)assert(x.en&&x.tr&&(x.icon||/^#[A-F\d]{6}$/i.test(x.color)));}
 if(t.type==='grammar'){assert(t.options.length>=2&&t.options.length<=4);assert(t.items.length>=16);assert.equal(new Set(t.items.map(x=>x.before+'|'+x.after+'|'+x.tr)).size,t.items.length);for(const x of t.items){assert(t.options.includes(x.answer));assert(t.rules[x.answer]);assert(x.tr);}}
 if(t.type==='comm'){assert.equal(t.chat.turns.length,8);assert(t.situations.length>=10);for(const [list,size] of [[t.chat.turns,2],[t.situations,3]]){assert.equal(new Set(list.map(x=>x.say||x.tr)).size,list.length);for(const x of list){assert(x.right&&x.tr&&x.rightTr);assert.equal(x.wrong.length,size);assert(!x.wrong.includes(x.right));assert.equal(new Set([x.right,...x.wrong]).size,size+1);}}}
});
test('all 86 decks have unique prompts, valid distinct choices, genre counts, 50/50 truth, fixed chat order',async()=>{
 const {buildQuestions,answerKey,validPicks}=await core();for(const t of C)for(const g of t.games)for(let repeat=0;repeat<6;repeat++){
  const qs=buildQuestions(t,g),n=['kova','balon','dy'].includes(g)?10:8;assert.equal(qs.length,n);
  assert.equal(new Set(qs.map(q=>g==='sohbet'?q.say:q.en+'|'+q.sceneTr)).size,n,t.key+':'+g);
  for(const q of qs){assert(q.options.some(o=>o.id===q.correct));assert.equal(new Set(q.options.map(o=>o.id)).size,q.options.length);}
  assert(validPicks(answerKey(qs),qs.map(q=>q.correct)));assert(!validPicks(answerKey(qs),qs.map(q=>'forged')));
  if(g==='sohbet')assert.deepEqual(qs.map(q=>q.say),t.chat.turns.map(x=>x.say));
  if(g==='dy')assert.equal(qs.filter(q=>q.correct==='true').length,5);
  if(g==='cark'){assert.equal(qs[0].slices.length,8);assert.equal(new Set(qs.map(q=>q.slice)).size,8);}
 }
});
async function fixture(){
 const {buildQuestions,answerKey,validPicks}=await core(),runs=[],receipts=[],tables=[],calls=[];
 const db={from(table){tables.push(table);let where=[],action='',payload,head=false;const b={select(s,opt){head=opt?.head;return b},eq(k,v){where.push(r=>r[k]===v);return b},gt(k,v){where.push(r=>r[k]>v);return b},gte(k,v){where.push(r=>r[k]>=v);return b},lt(k,v){where.push(r=>r[k]<v);return b},lte(k,v){where.push(r=>r[k]<=v);return b},insert(p){action='insert';payload=p;return b},delete(){action='delete';return b},maybeSingle(){return exec(true)},then(y,n){return exec().then(y,n)}};
  async function exec(single=false){const list=table==='lesson_topics'?snapshot.map(r=>({...r,active:true})):table==='dm_topic_game_runs'?runs:receipts;let match=list.filter(r=>where.every(f=>f(r)));if(action==='insert'){list.push(payload);match=[payload];}if(action==='delete')for(const r of match)list.splice(list.indexOf(r),1);return {data:head?null:single?match[0]||null:match,count:match.length,error:null};}return b;},rpc:async(fn,args)=>{calls.push({fn,args});return {data:{ok:true,xp:70}}}};
 const scope={DijiTopicGamesA1:C,buildQuestions,answerKey,validPicks,crypto,Intl,Date,Math};scope.globalThis=scope;vm.createContext(scope);
 const src=require('node:module').stripTypeScriptTypes(fs.readFileSync('supabase/functions/diji-api/topic-games-api.ts','utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace('export function','function');
 vm.runInContext(src+';globalThis.make=topicGamesAPI;',scope);const api=scope.make(db,(d,status=200)=>({d,status}));
 return {runs,receipts,tables,calls,handle:(op,b,a={role:'student',student_id:'trusted'},method='POST')=>api.handle(op,b,new URLSearchParams(),a,method)};
}
test('start validates DB membership, game, method and only authenticated student runs write',async()=>{
 const f=await fixture(),t=C.find(t=>t.type==='vocab');const b={topicKey:t.key,game:'kova',student_id:'forged'};
 assert.equal((await f.handle('konuOyunBaslat',b,undefined,'GET')).status,405);
 assert.equal((await f.handle('konuOyunBaslat',{...b,game:'sohbet'})).status,400);
 assert.equal((await f.handle('konuOyunBaslat',{...b,topicKey:'A2|vocab|forged'})).status,400);
 assert.equal((await f.handle('konuOyunBaslat',{...b,t:'expired'},null)).status,401);
 for(const a of [null,{role:'teacher',teacher_id:'teacher'}]){const d=await f.handle('konuOyunBaslat',b,a);assert.equal(d.d.runId,null);assert.equal(d.d.practice,true);}assert.equal(f.runs.length,0);
 const d=await f.handle('konuOyunBaslat',b);assert.equal(d.d.sorular.length,10);assert.equal(f.runs.length,1);assert.equal(f.runs[0].student_id,'trusted');assert.equal(f.runs[0].answer_key.length,10);assert.equal(d.d.bugunXpHakki,3);
 assert(!f.tables.some(t=>['game_scores','feed_events'].includes(t)));
});
test('finish accepts only allowed picks of an owned run; score and actor inputs are ignored',async()=>{
 const f=await fixture(),t=C.find(t=>t.type==='grammar'),s=(await f.handle('konuOyunBaslat',{topicKey:t.key,game:'balon'})).d;
 assert.equal((await f.handle('konuOyunBitir',{runId:s.runId,picks:s.sorular.map(q=>q.correct)},{role:'student',student_id:'other'})).status,409);
 assert.equal((await f.handle('konuOyunBitir',{runId:s.runId,picks:['forged']})).status,400);
 assert.equal((await f.handle('konuOyunBitir',{runId:s.runId,picks:s.sorular.map(q=>'forged')})).status,400);
 const r=await f.handle('konuOyunBitir',{runId:s.runId,picks:s.sorular.map(q=>q.correct),xp:900,actor:'forged',dogru:999});assert.equal(r.d.xp,70);assert.equal(f.calls.length,1);assert.equal(f.calls[0].args.actor,'trusted');assert.deepEqual(Object.keys(f.calls[0].args).sort(),['actor','picks','run_key']);
});
test('two game API endpoints use perimeter budgets; no score, feed or assignment client calls',()=>{
 const client=fs.readFileSync('ingilizce/konu-oyunlari.js','utf8'),api=fs.readFileSync('supabase/functions/diji-api/topic-games-api.ts','utf8'),index=fs.readFileSync('supabase/functions/diji-api/index.ts','utf8');
 for(const s of [client,api])assert(!/game_scores|feed_events|LiderlikKaydet|dmGameAssignmentResult/.test(s));
 assert(index.includes("rate('ip:'+op"));assert(index.includes("rate('account:'+op"));assert(client.includes('dmApplyRewardState'));
 assert(!fs.readFileSync('ingilizce/index.html','utf8').includes('src="konu-oyunlari-a1.js'));
});

// Reviewed against English agreement/number and the displayed Turkish cue, not
// against the same answer key used by the question builder.
const meaningTopics=new Set([1,5,8,10,13,14,15,17,19,20,21]);
function auditedGrammarAnswer(t,x,i){
 const b=x.before.toLowerCase(),a=x.after.toLowerCase(),tr=x.tr.toLocaleLowerCase('tr');
 const be=()=>b==='i'?'am':/^(you|we|they|the cats|my books|my friends|leo and mia)$/.test(b)?'are':'is';
 switch(t.sortNo){
  case 1:return b[0];
  case 2:case 12:return be();
  case 3:return /^(i|you|we|they|my friends|the children)$/.test(b)?'have got':'has got';
  case 4:return /^(am|like|can)\b/.test(a)?'I':/^(sister|name|dad|bag)\b/.test(a)?'my':/\bis$/.test(b)?'mine':'me';
  case 5:return ['my','his','her','our'][i%4];
  case 6:return /^[aeiou]/.test(a)?'an':'a';
  case 7:{const pair=x.options;assert.deepEqual(pair,/^cat/.test(x.answer)?['cat','cats']:['box','boxes']);return /\b(one|a)$|^(this|that)$/.test(b)?pair[0]:pair[1];}
  case 8:{const near=/\bhere\b|next to me|in my hands?/.test(a),plural=a.startsWith('are ');return plural?(near?'these':'those'):(near?'this':'that');}
  case 9:return /^an? /.test(a)?'is':'are';
  case 10:return tr.includes('içinde')?'in':tr.includes('üstünde')?'on':tr.includes('altında')?'under':'behind';
  case 11:{if(!b){assert.deepEqual(x.options,['do','does']);return /^(she|he|sam|your sister)\b/.test(a)?'does':'do';}assert.deepEqual(x.options,['play','plays']);return /^(she|he|ali|elif)$/.test(b)?'plays':'play';}
  case 13:return tr.includes('bil')?'can':"can't";
  case 14:return tr.includes('aç')?'open':tr.includes('kapat')?'close':tr.includes('otur')?'sit down':'stand up';
  case 15:return tr.includes('ne zaman')?'when':tr.includes('nerede')?'where':tr.includes('kim')?'who':'what';
  case 16:return /^(water|milk|rice|bread|juice|cheese|sugar|soup)\b/.test(a)?'much':'many';
  case 17:return tr.includes('hiç')?'any':'some';
  case 18:assert(x.joinBefore);return "'s";
  case 19:return tr.includes('her zaman')?'always':tr.includes('genellikle')?'usually':tr.includes('bazen')?'sometimes':'never';
  case 20:return /\bve\b/.test(tr)?'and':/\bama\b/.test(tr)?'but':'or';
  case 21:{const two=/\biki\b/.test(tr),ordinal=b.endsWith('the');return ordinal?(two?'second':'first'):(two?'two':'one');}
  case 22:return b.startsWith('do ')?'do':b.startsWith('is ')?'is':b.endsWith('yes, i')?'am':'are';
  default:throw Error('Unreviewed grammar topic '+t.key);
 }
}
for(const t of C.filter(t=>t.type==='grammar'))for(const [i,x] of t.items.entries())test('grammar review '+t.sortNo+'.'+(i+1)+': '+x.before+' ___ '+x.after,()=>{
 const options=x.options||t.options;assert.equal(new Set(options).size,options.length);assert(options.length>=2&&options.length<=4);
 const expected=auditedGrammarAnswer(t,x,i);assert.equal(x.answer,expected);assert.equal(options.filter(o=>o===expected).length,1);
 assert.equal(x.meaningRequired,meaningTopics.has(t.sortNo));assert(x.tr.trim());
});
test('personal information has no professions or ambiguous age icon; singular possessive contains no plural ownership',()=>{
 const t=C.find(t=>t.type==='vocab'&&t.sortNo===1);assert.equal(t.items.length,14);assert(t.items.every(x=>!['teacher','doctor','cook','farmer','artist','singer','pilot','scientist','firefighter','astronaut','age'].includes(x.en)));
 for(const word of ['boy','girl','man','woman','baby','name','birthday','address','phone number','email','country','city','street'])assert(t.items.some(x=>x.en===word));
 const p=C.find(t=>t.type==='grammar'&&t.sortNo===18);assert.deepEqual(p.options,["'s",'s','is']);assert(p.items.every(x=>x.answer==="'s"&&x.joinBefore&&!x.tr.includes('ların')&&!x.tr.includes('lerin')));
});
test('item choices control both balloon and truth-card generation and word colors stay fixed',async()=>{
 const {buildQuestions,sentence}=await core();const p=C.find(t=>t.type==='grammar'&&t.sortNo===7),colors=new Map();
 for(let k=0;k<20;k++){for(const q of buildQuestions(p,'balon')){const item=p.items.find(x=>x.before===q.before&&x.after===q.after&&x.tr===q.tr);assert.deepEqual(q.options.map(o=>o.id).sort(),item.options.slice().sort());for(const o of q.options){if(colors.has(o.id))assert.equal(o.palette,colors.get(o.id));colors.set(o.id,o.palette);}}for(const q of buildQuestions(p,'dy')){const item=p.items.find(x=>x.before===q.before&&x.after===q.after&&x.tr===q.tr);assert(item.options.includes(q.shown));}}
 const s=C.find(t=>t.type==='grammar'&&t.sortNo===18);for(const item of s.items){assert(sentence(item,item.answer).includes(item.before+"'s"));assert(!/\s+'s/.test(sentence(item,item.answer)));}
});
