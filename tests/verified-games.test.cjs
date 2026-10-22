const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const load=()=>import('../supabase/functions/diji-api/verified-games.mjs');
const words=[{en:'bus',tr:'otobüs'},{en:'car',tr:'araba'},{en:'I have a car.',tr:'Bir arabam var.'},{en:'bike',tr:'bisiklet'}];
test('all 13 classic games grade actual answers, never a boolean or submitted score',async()=>{
 const core=await load();for(const game of core.games){if(game==='ba')continue;const task=core.compile(game,words)[0];
 assert.equal(core.grade(task,true,game).valid,false,game+' cannot submit true');
 assert.equal(core.grade(task,'WRONG',game).correct,false,game);
 assert.equal(core.grade(task,['hafiza','eslestirme','yagmur'].includes(game)?words[0].tr:words[0].en,game).correct,true,game);
 }
});
test('main path compiles all 12 fixed mechanics and grades choice, order, missing word and matching',async()=>{
 const c=await load(),deck=c.compile('ba',words);assert.equal(deck.length,12);
 for(const [i,t] of deck.entries()){const answer=t.kind==='teach'?true:t.kind==='eslestir'?words:t.expected;assert.equal(c.grade(t,answer,'ba').correct,true,'slot '+i);}
 const match=deck[4];assert.equal(c.grade(match,[...words.slice(1),words[1]],'ba').correct,false);
 assert.equal(c.grade(deck[1],true,'ba').valid,false);
 assert.equal(c.grade(deck[2],'unrelated | '+deck[2].en,'ba').correct,true);
});
test('letter positions and hangman guesses are checked against the stored word',async()=>{
 const c=await load(),t=c.compile('bosluk',words)[0];
 assert.equal(c.grade(t,{letter:'b',index:0},'bosluk').correct,true);
 assert.equal(c.grade(t,{letter:'u',index:0},'bosluk').correct,false);
 assert.equal(c.grade(t,{letter:'u'},'asmaca').correct,true);
 assert.equal(c.grade(t,{letter:'x'},'asmaca').correct,false);
 assert.equal(c.grade(t,{letter:'b',index:0},'bosluk').complete,false);
 assert.equal(c.grade(t,null,'bosluk').complete,true);
});
test('frontend flushes exact answer evidence before claims and retains event IDs on a retry',async()=>{
 const calls=[],storage=new Map();let fail=true;
 const ctx={console,Response,structuredClone,crypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},aktifOgrenciAdi:'learner',apiURL:'/api',masterKelimeHavuzu:words.map(w=>({ingilizce:w.en,turkce:w.tr,sinif:2,unite:1})),
 fetch:async(url,opt)=>{const b=JSON.parse(opt.body);calls.push(b);if(b.islem==='verifiedGameStart')return Response.json({ok:true,slots:words.map((w,slot)=>({en:w.en,slot}))});
 if(b.islem==='verifiedGameAnswer'){if(fail){fail=false;return Response.json({ok:false,mesaj:'retry'},{status:503});}return Response.json({ok:true,correct:true});}return Response.json({ok:true});},
 OC:{kelimeSec:(game,pool)=>pool,basla(game){this.aktif={oyun:game,runId:'verified-run-123456',rewardScope:{classNo:2,units:[1]}}},aktif:null}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('ingilizce/verified-games.js','utf8'),ctx);
 ctx.OC.kelimeSec('ky',ctx.masterKelimeHavuzu);ctx.OC.basla('ky');ctx.dmVerifiedGames.record(words[0].en,words[0].tr);
 await new Promise(r=>setTimeout(r,10));await ctx.fetch('/api',{method:'POST',body:JSON.stringify({islem:'seviyeOyunOdulu',runId:ctx.OC.aktif.runId})});
 const answers=calls.filter(x=>x.islem==='verifiedGameAnswer');assert.equal(answers.length,2);assert.equal(answers[0].eventId,answers[1].eventId);assert.equal(answers[1].answer,words[0].tr);assert.equal(calls.at(-1).islem,'seviyeOyunOdulu');assert.equal(storage.size,0,'acknowledged evidence is removed');
});
test('server entry validates every submitted word against active scoped bank rows',async()=>{
 const c=await load(),db={rpc:async()=>({data:{level:40,units:[],done:[]}}),from(){return{select(){return this},eq(){return this},in(){return this},limit:async()=>({data:words.map(w=>({english:w.en,turkish:w.tr}))})}}};
 globalThis.DijiProgressionCatalog={gates:{oyun_kelime:1}};
 const api=c.verifiedGamesAPI(db,(data,status=200)=>({data,status}));
 const r=await api.handle('verifiedGameStart',{runId:'verified-run-123456',game:'ky',classNo:2,units:[1],words:[words[0],words[1],words[2],{en:'invented',tr:'fake'}]},{role:'student',student_id:'sid'},'POST');assert.equal(r.status,400);
});
test('after reload, unacknowledged evidence resumes with the same event ID before an award',async()=>{
 const calls=[],storage=new Map([['dm_verified_events:learner:resume-run-123456',JSON.stringify({owner:'learner',createdAt:Date.now(),events:[{eventId:'resume-event-123456',target:'apple',answer:'elma'}]})]]);
 const ctx={console,Response,structuredClone,crypto,aktifOgrenciAdi:'learner',apiURL:'/api',localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},fetch:async(u,opt)=>{const b=JSON.parse(opt.body);calls.push(b);return Response.json(b.islem==='verifiedGameStatus'?{ok:true,game:'ky',slots:[{en:'apple',slot:0}]}:{ok:true});}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('ingilizce/verified-games.js','utf8'),ctx);
 await ctx.fetch('/api',{method:'POST',body:JSON.stringify({islem:'seviyeOyunOdulu',runId:'resume-run-123456'})});
 assert.deepEqual(calls.map(x=>x.islem),['verifiedGameStatus','verifiedGameAnswer','seviyeOyunOdulu']);assert.equal(calls[1].eventId,'resume-event-123456');assert.equal(storage.size,0);
});
test('speaking answered by choosing (assisted) advances but is not counted correct',async()=>{
 const core=await load();const task=core.compile('ba',words).find(t=>t.kind==='soyle');
 assert.deepEqual(core.grade(task,task.expected,'ba'),{valid:true,complete:true,correct:true});
 const assisted=core.grade(task,'~yardim~'+task.expected,'ba');assert.equal(assisted.valid,true);assert.equal(assisted.complete,true);assert.equal(assisted.correct,false);assert.equal(assisted.assisted,true);
 assert.equal(core.grade({...task,kind:'hatirla'},'~yardim~'+task.expected,'ba').correct,false);
});
