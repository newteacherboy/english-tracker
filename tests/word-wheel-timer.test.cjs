const {test}=require('node:test'),assert=require('node:assert/strict'),{fixture}=require('./helpers/word-wheel-fixture.cjs');
const begin={sinif:5,unite:1,mode:1};
async function game(extra={}){const f=fixture(),r=await f.handle('kelimeCarkiBaslat',{...begin,...extra});assert.equal(r.status,200);return {...f,runId:r.d.runId};}
test('server grants ten answer seconds; wheel animation is separate and capped',async()=>{
 for(const [revealDelayMs,extra] of [[0,0],[1250,1250],[999999,1250]]){const f=await game(),s=(await f.handle('kelimeCarkiCevir',{runId:f.runId,revealDelayMs})).d;assert.equal(s.pending.deadline-s.serverNow,10000+extra);f.advance(extra);const current=(await f.handle('kelimeCarkiDurum',{runId:f.runId})).d;assert.equal(current.pending.deadline-current.serverNow,10000);}
});
test('late correct answer loses the wheel value once; forged timeout before deadline is rejected',async()=>{
 const f=await game(),q={runId:f.runId,round:0},spin=(await f.handle('kelimeCarkiCevir',{...q,revealDelayMs:0})).d;
 assert.equal((await f.handle('kelimeCarkiCevap',{...q,timedOut:true})).status,409);assert.equal(f.sessions[0].state.players[0].score,0);
 f.advance(10000);const r=(await f.handle('kelimeCarkiCevap',{...q,answer:f.sessions[0].deck[0].tr})).d;assert.equal(r.players[0].score,-spin.pending.points);assert.equal(r.last.timedOut,true);assert.equal(r.last.correct,false);assert.equal(r.index,1);
 for(let i=0;i<3;i++){const duplicate=(await f.handle('kelimeCarkiCevap',{...q,timedOut:true})).d;assert.equal(duplicate.players[0].score,r.players[0].score);assert.equal(duplicate.players[0].wrong,1);}
});
test('refresh, repeated spin and status requests cannot reset the deadline',async()=>{
 const f=await game(),q={runId:f.runId,revealDelayMs:0},s=(await f.handle('kelimeCarkiCevir',q)).d;f.advance(4000);assert.equal((await f.handle('kelimeCarkiCevir',q)).d.pending.deadline,s.pending.deadline);assert.equal((await f.handle('kelimeCarkiDurum',q)).d.pending.deadline-f.now(),6000);f.advance(6000);const r=(await f.handle('kelimeCarkiDurum',q)).d;assert.equal(r.players[0].score,-s.pending.points);assert(r.last.timedOut);assert.equal((await f.handle('kelimeCarkiDurum',q)).d.players[0].wrong,1);
});
test('on-time answer scores correctly and cannot later expire',async()=>{
 const f=await game(),q={runId:f.runId,round:0},s=(await f.handle('kelimeCarkiCevir',{...q,revealDelayMs:0})).d;f.advance(9999);const r=(await f.handle('kelimeCarkiCevap',{...q,answer:f.sessions[0].deck[0].tr})).d;assert.equal(r.players[0].score,s.pending.points);f.advance(10000);assert.equal((await f.handle('kelimeCarkiDurum',q)).d.players[0].score,s.pending.points);
});
test('independent players expire separately, including simultaneous timeout requests',async()=>{
 const f=await game({mode:2,independent:true}),q={runId:f.runId,round:0,revealDelayMs:0};await f.handle('kelimeCarkiCevir',{...q,player:0});f.advance(3000);await f.handle('kelimeCarkiCevir',{...q,player:1});f.advance(7000);let r=(await f.handle('kelimeCarkiDurum',q)).d;assert.equal(r.players[0].wrong,1);assert.equal(r.players[1].wrong,0);assert.equal(r.players[1].pending.deadline-f.now(),3000);f.advance(3000);await Promise.all([0,1].map(player=>f.handle('kelimeCarkiCevap',{...q,player,timedOut:true})));r=(await f.handle('kelimeCarkiDurum',q)).d;assert(r.players.every(p=>p.wrong===1&&p.score<0));assert.equal(r.finished,true);
});
test('legacy pending questions receive one deadline without changing their wheel points',async()=>{
 const f=await game(),s=f.sessions[0];delete s.state.wheelPoints;s.state.pending={slot:7};let r=(await f.handle('kelimeCarkiDurum',{runId:f.runId})).d;assert.equal(r.pending.points,200);assert.equal(r.pending.deadline-f.now(),10000);f.advance(10000);r=(await f.handle('kelimeCarkiDurum',{runId:f.runId})).d;assert.equal(r.players[0].score,-200);assert.equal(r.players[0].wrong,1);
});
