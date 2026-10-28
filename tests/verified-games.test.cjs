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
 // [Kota 28 Eki 2026] Cevaplar paket hâlinde gider; başarısız paket aynı olay kimlikleriyle yeniden gönderilir.
 const calls=[],storage=new Map();let fail=true;
 const ctx={console,Response,structuredClone,crypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},aktifOgrenciAdi:'learner',apiURL:'/api',masterKelimeHavuzu:words.map(w=>({ingilizce:w.en,turkce:w.tr,sinif:2,unite:1})),
 fetch:async(url,opt)=>{const b=JSON.parse(opt.body);calls.push(b);if(b.islem==='verifiedGameStart')return Response.json({ok:true,slots:words.map((w,slot)=>({en:w.en,slot}))});
 if(b.islem==='verifiedGameAnswers'){if(fail){fail=false;return Response.json({ok:false,mesaj:'retry'},{status:503});}return Response.json({ok:true,results:b.answers.map(()=>({correct:true})),processed:b.answers.length});}return Response.json({ok:true});},
 OC:{kelimeSec:(game,pool)=>pool,basla(game){this.aktif={oyun:game,runId:'verified-run-123456',rewardScope:{classNo:2,units:[1]}}},aktif:null}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('ingilizce/verified-games.js','utf8'),ctx);
 ctx.OC.kelimeSec('ky',ctx.masterKelimeHavuzu);ctx.OC.basla('ky');ctx.dmVerifiedGames.record(words[0].en,words[0].tr);
 await new Promise(r=>setTimeout(r,10));
 assert.equal(calls.filter(x=>x.islem==='verifiedGameAnswers').length,0,'tek cevap hemen gönderilmez');
 const first=await ctx.fetch('/api',{method:'POST',body:JSON.stringify({islem:'seviyeOyunOdulu',runId:ctx.OC.aktif.runId})});
 assert.equal(first.status,503,'kanıt gönderilemezse ödül isteği çıkmaz; ödül silinmeden sonra tekrar denenir');
 assert.equal(calls.some(x=>x.islem==='seviyeOyunOdulu'),false);
 await ctx.fetch('/api',{method:'POST',body:JSON.stringify({islem:'seviyeOyunOdulu',runId:ctx.OC.aktif.runId})});
 const packs=calls.filter(x=>x.islem==='verifiedGameAnswers');assert.equal(packs.length,2);
 assert.equal(packs[0].answers[0].eventId,packs[1].answers[0].eventId);assert.equal(packs[1].answers[0].answer,words[0].tr);
 assert.equal(calls.at(-1).islem,'seviyeOyunOdulu');assert.equal(storage.size,0,'acknowledged evidence is removed');
});
test('answers go out in one pack when the game ends, not one request per answer',async()=>{
 const calls=[],storage=new Map();
 const ctx={console,Response,structuredClone,crypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},aktifOgrenciAdi:'learner',apiURL:'/api',masterKelimeHavuzu:words.map(w=>({ingilizce:w.en,turkce:w.tr,sinif:2,unite:1})),
 fetch:async(url,opt)=>{const b=JSON.parse(opt.body);calls.push(b);if(b.islem==='verifiedGameStart')return Response.json({ok:true,slots:words.map((w,slot)=>({en:w.en,slot}))});
 if(b.islem==='verifiedGameAnswers')return Response.json({ok:true,results:b.answers.map(()=>({correct:true})),processed:b.answers.length});return Response.json({ok:true});},
 OC:{kelimeSec:(game,pool)=>pool,basla(game){this.aktif={oyun:game,runId:'verified-run-654321',rewardScope:{classNo:2,units:[1]}}},aktif:null}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('ingilizce/verified-games.js','utf8'),ctx);
 ctx.OC.kelimeSec('ky',ctx.masterKelimeHavuzu);ctx.OC.basla('ky');
 const n=Math.min(words.length,9);for(let i=0;i<n;i++){ctx.dmVerifiedGames.record(words[i].en,words[i].tr);await new Promise(r=>setTimeout(r,5));}
 await ctx.fetch('/api',{method:'POST',body:JSON.stringify({islem:'seviyeOyunOdulu',runId:'verified-run-654321'})});
 const packs=calls.filter(x=>x.islem==='verifiedGameAnswers');
 assert.equal(packs.reduce((t,p)=>t+p.answers.length,0),n,'her cevap tam bir kez gönderilir');
 assert.equal(packs.length,1,'tek paket');
 assert.equal(calls.some(x=>x.islem==='verifiedGameAnswer'),false,'tek tek cevap isteği yok');
 assert.equal(new Set(packs.flatMap(p=>p.answers.map(a=>a.eventId))).size,n,'olay kimlikleri tekrarlanmaz');
 assert.equal(calls.at(-1).islem,'seviyeOyunOdulu');assert.equal(storage.size,0);
});
test('energy shortage stops the pack, keeps the rest queued and reports energyEmpty',async()=>{
 const calls=[],storage=new Map();let empty=true;
 const ctx={console,Response,structuredClone,crypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},aktifOgrenciAdi:'learner',apiURL:'/api',genelEnerjiKalan:3,masterKelimeHavuzu:words.map(w=>({ingilizce:w.en,turkce:w.tr,sinif:2,unite:1})),
 fetch:async(url,opt)=>{const b=JSON.parse(opt.body);calls.push(b);if(b.islem==='verifiedGameStart')return Response.json({ok:true,slots:words.map((w,slot)=>({en:w.en,slot}))});
 if(b.islem==='verifiedGameAnswers'){if(empty){empty=false;return Response.json({ok:false,mesaj:'Enerji yetersiz',energyEmpty:true,results:[{correct:true}],processed:1},{status:409});}return Response.json({ok:true,results:b.answers.map(()=>({correct:true,energy:{energy:4,max:25}})),processed:b.answers.length});}return Response.json({ok:true});},
 OC:{kelimeSec:(game,pool)=>pool,basla(game){this.aktif={oyun:game,runId:'verified-run-777777',rewardScope:{classNo:2,units:[1]}}},aktif:null}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('ingilizce/verified-games.js','utf8'),ctx);
 ctx.OC.kelimeSec('ky',ctx.masterKelimeHavuzu);ctx.OC.basla('ky');
 for(let i=0;i<3;i++)ctx.dmVerifiedGames.record(words[i].en,words[i].tr);
 await new Promise(r=>setTimeout(r,10));
 await assert.rejects(ctx.dmVerifiedGames.flush('verified-run-777777'),e=>e.energyEmpty===true);
 assert.equal(ctx.genelEnerjiKalan,0);assert.equal(ctx.dmVerifiedGames.pendingCount('verified-run-777777'),2,'işlenmeyen 2 cevap kuyrukta kalır');
 await ctx.dmVerifiedGames.flush('verified-run-777777');
 const packs=calls.filter(x=>x.islem==='verifiedGameAnswers');assert.equal(packs[1].answers.length,2);assert.equal(packs[1].answers[0].eventId,packs[0].answers[1].eventId);
 assert.equal(ctx.genelEnerjiKalan,4,'sunucunun enerji değeri uygulanır');assert.equal(storage.size,0);
});
test('an answer recorded before the session starts is not lost',async()=>{
 const calls=[],storage=new Map();
 const ctx={console,Response,structuredClone,crypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},aktifOgrenciAdi:'learner',apiURL:'/api',
 fetch:async(url,opt)=>{const b=JSON.parse(opt.body);calls.push(b);if(b.islem==='verifiedGameStart')return Response.json({ok:true,slots:[{en:'apple',slot:0},{en:'pear',slot:1}],answers:{}});
 if(b.islem==='verifiedGameAnswers')return Response.json({ok:true,results:b.answers.map(()=>({correct:true})),processed:b.answers.length});return Response.json({ok:true,answers:{}});}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('ingilizce/verified-games.js','utf8'),ctx);
 ctx.dmVerifiedGames.record(0,'first-answer','early-run-1234567');
 await ctx.dmVerifiedGames.start('ky','early-run-1234567',{classNo:2,units:[1]},[{en:'apple',tr:'elma'},{en:'pear',tr:'armut'}]);
 await ctx.dmVerifiedGames.flush('early-run-1234567');
 const sent=calls.filter(x=>x.islem==='verifiedGameAnswers').flatMap(p=>p.answers);
 assert.equal(sent.length,1);assert.equal(sent[0].answer,'first-answer');assert.equal(sent[0].slot,0);
});
test('server entry validates every submitted word against active scoped bank rows',async()=>{
 const c=await load(),db={rpc:async()=>({data:{level:40,units:[],done:[]}}),from(){return{select(){return this},eq(){return this},in(){return this},limit:async()=>({data:words.map(w=>({english:w.en,turkish:w.tr}))})}}};
 globalThis.DijiProgressionCatalog={gates:{oyun_kelime:1}};
 const api=c.verifiedGamesAPI(db,(data,status=200)=>({data,status}));
 const r=await api.handle('verifiedGameStart',{runId:'verified-run-123456',game:'ky',classNo:2,units:[1],words:[words[0],words[1],words[2],{en:'invented',tr:'fake'}]},{role:'student',student_id:'sid'},'POST');assert.equal(r.status,400);
});
test('after reload, unacknowledged evidence resumes with the same event ID before an award',async()=>{
 const calls=[],storage=new Map([['dm_verified_events:learner:resume-run-123456',JSON.stringify({owner:'learner',createdAt:Date.now(),events:[{eventId:'resume-event-123456',target:'apple',answer:'elma'}]})]]);
 const ctx={console,Response,structuredClone,crypto,aktifOgrenciAdi:'learner',apiURL:'/api',localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},fetch:async(u,opt)=>{const b=JSON.parse(opt.body);calls.push(b);return Response.json(b.islem==='verifiedGameStatus'?{ok:true,game:'ky',slots:[{en:'apple',slot:0}]}:b.islem==='verifiedGameAnswers'?{ok:true,results:b.answers.map(()=>({correct:true})),processed:b.answers.length}:{ok:true});}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('ingilizce/verified-games.js','utf8'),ctx);
 await ctx.fetch('/api',{method:'POST',body:JSON.stringify({islem:'seviyeOyunOdulu',runId:'resume-run-123456'})});
 assert.deepEqual(calls.map(x=>x.islem),['verifiedGameStatus','verifiedGameAnswers','seviyeOyunOdulu']);assert.equal(calls[1].answers[0].eventId,'resume-event-123456');assert.equal(storage.size,0);
});
test('speaking answered by choosing (assisted) advances but is not counted correct',async()=>{
 const core=await load();const task=core.compile('ba',words).find(t=>t.kind==='soyle');
 assert.deepEqual(core.grade(task,task.expected,'ba'),{valid:true,complete:true,correct:true});
 const assisted=core.grade(task,'~yardim~'+task.expected,'ba');assert.equal(assisted.valid,true);assert.equal(assisted.complete,true);assert.equal(assisted.correct,false);assert.equal(assisted.assisted,true);
 assert.equal(core.grade({...task,kind:'hatirla'},'~yardim~'+task.expected,'ba').correct,false);
});
test('server batch grades each answer in order, stops at the first failure and returns what was recorded',async()=>{
 const c=await load(),deck=c.compile('ky',words),calls=[];let failAt=-1;
 const db={rpc:async(name,args)=>{calls.push(args);if(calls.length-1===failAt)return {error:{message:'Enerji yetersiz'}};return {data:{correct:args.is_correct,complete:args.is_complete}};},
  from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:{game:'ky',class_no:2,units:[1],stop_no:0,deck,answers:{},expires_at:new Date(Date.now()+3600e3).toISOString()}})}}};
 const api=c.verifiedGamesAPI(db,(data,status=200)=>({data,status})),a={role:'student',student_id:'sid'};
 const answers=[0,1,2].map(slot=>({slot,eventId:'evt-'+slot+'-123456789012',answer:deck[slot].en==='bus'?'otobüs':'WRONG'}));
 let r=await api.handle('verifiedGameAnswers',{runId:'batch-run-1234567',answers},a,'POST');
 assert.equal(r.status,200);assert.equal(r.data.processed,3);assert.deepEqual(calls.map(x=>x.slot_no),[0,1,2]);
 assert.equal(calls[0].is_correct,c.grade(deck[0],answers[0].answer,'ky').correct,'sunucu kendi anahtarıyla puanlar');
 calls.length=0;failAt=1;r=await api.handle('verifiedGameAnswers',{runId:'batch-run-1234567',answers},a,'POST');
 assert.equal(r.status,409);assert.equal(r.data.energyEmpty,true);assert.equal(r.data.processed,1);assert.equal(calls.length,2,'hatadan sonra durur');
 r=await api.handle('verifiedGameAnswers',{runId:'batch-run-1234567',answers:[{slot:99,eventId:'evt-x-123456789012',answer:'x'}]},a,'POST');assert.equal(r.status,400);
 r=await api.handle('verifiedGameAnswers',{runId:'batch-run-1234567',answers:[]},a,'POST');assert.equal(r.status,400);
 r=await api.handle('verifiedGameAnswers',{runId:'batch-run-1234567',answers},{role:'teacher'},'POST');assert.equal(r.status,401,'yalnız öğrenci');
});
test('answers ride inside the reward claim when the server supports it (no separate answer pack)',async()=>{
 // [Kota 29 Eki 2026] Ödül isteği gönderilmemiş cevapları taşır.
 const calls=[],storage=new Map();let failClaim=true;
 const ctx={console,Response,structuredClone,crypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},aktifOgrenciAdi:'learner',apiURL:'/api',masterKelimeHavuzu:words.map(w=>({ingilizce:w.en,turkce:w.tr,sinif:2,unite:1})),
 fetch:async(url,opt)=>{const b=JSON.parse(opt.body);calls.push(b);if(b.islem==='verifiedGameStart')return Response.json({ok:true,answersInClaim:true,slots:words.map((w,slot)=>({en:w.en,slot}))});
 if(b.islem==='seviyeOyunOdulu'){if(failClaim){failClaim=false;throw TypeError('network');}return Response.json({ok:true,xp:10,answersAck:b.verifiedAnswers?.length||0});}return Response.json({ok:true});},
 OC:{kelimeSec:(game,pool)=>pool,basla(game){this.aktif={oyun:game,runId:'claim-run-1234567',rewardScope:{classNo:2,units:[1]}}},aktif:null}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('ingilizce/verified-games.js','utf8'),ctx);
 ctx.OC.kelimeSec('ky',ctx.masterKelimeHavuzu);ctx.OC.basla('ky');
 for(let i=0;i<3;i++)ctx.dmVerifiedGames.record(words[i].en,words[i].tr);
 await new Promise(r=>setTimeout(r,10));
 const first=await ctx.fetch('/api',{method:'POST',body:JSON.stringify({islem:'seviyeOyunOdulu',runId:'claim-run-1234567'})});
 assert.equal(first.status,503,'ağ hatasında ödül silinmez, sonra denenir');assert.equal(ctx.dmVerifiedGames.pendingCount('claim-run-1234567'),3);
 const r=await ctx.fetch('/api',{method:'POST',body:JSON.stringify({islem:'seviyeOyunOdulu',runId:'claim-run-1234567'})});
 assert.equal((await r.json()).xp,10);
 const claims=calls.filter(x=>x.islem==='seviyeOyunOdulu');
 assert.equal(calls.some(x=>/^verifiedGameAnswers?$/.test(x.islem)),false,'ayrı cevap isteği yok');
 assert.equal(claims[1].verifiedAnswers.length,3);assert.equal(claims[0].verifiedAnswers[0].eventId,claims[1].verifiedAnswers[0].eventId,'aynı olay kimlikleri');
 assert.equal(ctx.dmVerifiedGames.pendingCount('claim-run-1234567'),0);assert.equal(storage.size,0);
});
test('a rejected answer inside the claim keeps the rest queued and the reward is retried later',async()=>{
 const calls=[],storage=new Map();
 const ctx={console,Response,structuredClone,crypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},aktifOgrenciAdi:'learner',apiURL:'/api',genelEnerjiKalan:2,masterKelimeHavuzu:words.map(w=>({ingilizce:w.en,turkce:w.tr,sinif:2,unite:1})),
 fetch:async(url,opt)=>{const b=JSON.parse(opt.body);calls.push(b);if(b.islem==='verifiedGameStart')return Response.json({ok:true,answersInClaim:true,slots:words.map((w,slot)=>({en:w.en,slot}))});
 if(b.islem==='seviyeOyunOdulu')return Response.json({ok:false,mesaj:'Enerji yetersiz',energyEmpty:true,answersInClaim:true,results:[{}],processed:1},{status:409});return Response.json({ok:true});},
 OC:{kelimeSec:(game,pool)=>pool,basla(game){this.aktif={oyun:game,runId:'claim-run-7654321',rewardScope:{classNo:2,units:[1]}}},aktif:null}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('ingilizce/verified-games.js','utf8'),ctx);
 ctx.OC.kelimeSec('ky',ctx.masterKelimeHavuzu);ctx.OC.basla('ky');
 for(let i=0;i<3;i++)ctx.dmVerifiedGames.record(words[i].en,words[i].tr);
 await new Promise(r=>setTimeout(r,10));
 const r=await ctx.fetch('/api',{method:'POST',body:JSON.stringify({islem:'seviyeOyunOdulu',runId:'claim-run-7654321'})});
 assert.equal(r.status,503,'enerji eksiğinde ödül silinmez');assert.equal(ctx.genelEnerjiKalan,0);
 assert.equal(ctx.dmVerifiedGames.pendingCount('claim-run-7654321'),2);
});
test('server records answers sent with the reward claim, then lets the claim continue',async()=>{
 const c=await load(),deck=c.compile('ky',words),calls=[];let failAt=-1;
 const db={rpc:async(name,args)=>{calls.push(args);if(calls.length-1===failAt)return {error:{message:'Enerji yetersiz'}};return {data:{correct:args.is_correct}};},
  from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:{game:'ky',deck,expires_at:new Date(Date.now()+3600e3).toISOString()}})}}};
 const api=c.verifiedGamesAPI(db,(data,status=200)=>({data,status})),a={role:'student',student_id:'sid'};
 const verifiedAnswers=[0,1].map(slot=>({slot,eventId:'evt-'+slot+'-123456789012',answer:'x'}));
 let body={runId:'claim-run-1234567',verifiedAnswers};
 assert.equal(await api.handle('seviyeOyunOdulu',body,a,'POST'),null,'ödül işlenmeye devam eder');
 assert.equal(body.__answersAck,2);assert.equal(body.verifiedAnswers,undefined);assert.equal(calls.length,2);
 calls.length=0;failAt=1;body={runId:'claim-run-1234567',verifiedAnswers};
 const r=await api.handle('seviyeOyunOdulu',body,a,'POST');
 assert.equal(r.status,409);assert.equal(r.data.answersInClaim,true);assert.equal(r.data.energyEmpty,true);assert.equal(r.data.processed,1);
 assert.equal(await api.handle('seviyeOyunOdulu',{runId:'claim-run-1234567'},a,'POST'),null,'cevapsız ödül isteğine dokunmaz');
});
test('the next stop prepared with the reward starts without a separate start request',async()=>{
 const calls=[],storage=new Map();
 const ctx={console,Response,structuredClone,crypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},aktifOgrenciAdi:'learner',apiURL:'/api',
 fetch:async(url,opt)=>{const b=JSON.parse(opt.body);calls.push(b);return Response.json({ok:true,answersInClaim:true,slots:[],tasks:[],words:[]});}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('ingilizce/verified-games.js','utf8'),ctx);
 const next={ok:true,answersInClaim:true,runId:'next-run-1234567890',stopNo:220152,tasks:[{kind:'teach'}],words:[{en:'a',tr:'b'}],slots:[{slot:0}],answers:{}};
 ctx.dmVerifiedGames.prefetch('learner',next);
 assert.equal(ctx.dmVerifiedGames.nextRun(220152),'next-run-1234567890');assert.equal(ctx.dmVerifiedGames.nextRun(220153),null);
 const d=await ctx.dmVerifiedGames.start('ba','next-run-1234567890',{classNo:2,units:[1],stopNo:220152,schoolVersion:9},[]);
 assert.equal(d.tasks.length,1);assert.equal(calls.length,0,'başlatma isteği yok');
 assert.equal(ctx.dmVerifiedGames.nextRun(220152),null,'bir kez kullanılır');
 ctx.aktifOgrenciAdi='other';ctx.dmVerifiedGames.prefetch('learner',next);assert.equal(ctx.dmVerifiedGames.nextRun(220152),null,'başka hesaba verilmez');
 ctx.aktifOgrenciAdi='learner';ctx.dmVerifiedGames.record(0,true,'next-run-1234567890');
 await ctx.fetch('/api',{method:'POST',body:JSON.stringify({islem:'seviyeOyunOdulu',runId:'next-run-1234567890'})});
 assert.equal(calls.at(-1).verifiedAnswers.length,1,'hazır oturumda da cevaplar ödülle gider');
});
