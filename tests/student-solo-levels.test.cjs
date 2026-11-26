const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const core=()=>import('../supabase/functions/diji-api/solo-levels.mjs');
const read=p=>fs.readFileSync(p,'utf8');
const manifest=JSON.parse(read('ingilizce/data/public-catalog/manifest.json'));
const rows=JSON.parse(read('ingilizce/data/public-catalog/'+manifest.words.file));
test('every game has 12 unique words per level, starts at class 1 and visits every class then A1–B2',async()=>{
 const c=await core();for(const game of c.soloGames){const stages=c.catalog(game,rows);assert.equal(stages[0].label,'1. Sınıf',game);assert.deepEqual([...new Set(stages.map(s=>s.label))],['1. Sınıf','2. Sınıf','3. Sınıf','4. Sınıf','5. Sınıf','6. Sınıf','7. Sınıf','8. Sınıf','A1 · Başlangıç','A2 · Temel','B1 · Orta','B2 · İleri'],game);for(const s of stages){assert.equal(s.words.length,12);assert.equal(new Set(s.words.map(w=>w.en.toLowerCase())).size,12);assert(s.words.every(w=>c.eligible(game,w)));}}
});
test('8 correct fails, 9 correct passes, and 9/10/11/12 have distinct decreasing rewards',async()=>{
 const {outcome}=await core();const percents=[];for(let correct=8;correct<=12;correct++){const r={deck:Array.from({length:12},()=>({soloLevel:1})),answers:Object.fromEntries(Array.from({length:12},(_,i)=>[i,{complete:true,firstCorrect:i<correct}]))};const o=outcome(r);assert.equal(o.passed,correct>=9);assert.equal(o.correct,correct);percents.push(o.percent);}assert.deepEqual(percents,[20,35,60,80,100]);assert.throws(()=>outcome({deck:[{}],answers:{}}));
});
function database({next=1,correct=9,complete=true}={}){let value={next},writes=0;const deck=Array.from({length:12},()=>({soloLevel:1})),answers=Object.fromEntries(deck.map((_,i)=>[i,{complete:complete||i<11,correct:true,firstCorrect:i<correct}]));return {get next(){return value.next},get writes(){return writes},from(table){return {select(){return this},eq(){return this},order(){return this},range:async(from,to)=>({data:rows.slice(from,to+1).map(w=>({english:w.ingilizce,turkish:w.turkce,class_no:w.sinif,unit_no:w.unite}))}),maybeSingle:async()=>table==='extra_data'?{data:{value,updated_at:'v1'}}:{data:{game:'dikte',deck,answers}},update(row){value=row.value;writes++;this.select=async()=>({data:[{key_name:'saved'}]});return this},insert(row){return this.update(row)}}}};}
test('level completion persists once, replay does not skip a level, failed/incomplete runs cannot unlock',async()=>{
 const c=await core();for(const correct of [8,9,12]){const db=database({correct}),api=c.soloLevelsAPI(db,(data,status=200)=>({data,status})),a={role:'student',student_id:'s1'};const r=await api.handle('soloLevelComplete',{game:'dikte',runId:'run'},a,'POST');assert.equal(r.data.passed,correct>=9);assert.equal(db.next,correct>=9?2:1);await api.handle('soloLevelComplete',{game:'dikte',runId:'run'},a,'POST');assert.equal(db.next,correct>=9?2:1);assert.equal(db.writes,correct>=9?1:0);}
 const db=database({complete:false}),r=await c.soloLevelsAPI(db,(data,status=200)=>({data,status})).handle('soloLevelComplete',{game:'dikte',runId:'r'},{role:'student',student_id:'s'},'POST');assert.equal(r.data.ok,false);assert.equal(db.writes,0);
});
test('a student sees a saved level with no selectors; a teacher uses native entry; account changes cancel late responses',async()=>{
 const dom=new JSDOM('<body></body>',{url:'https://test.invalid',runScripts:'outside-only'}),w=dom.window;w.aktifOgrenciAdi='learner';w.apiURL='/api';w.fetch=async()=>Response.json({ok:true,number:4,classNo:1,units:[1],words:[],label:'1. Sınıf',totalLevels:100});w.setTimeout=()=>0;w.eval(read('ingilizce/solo-levels.js'));let calls=0;await w.dmSoloLevels.open('ky',()=>calls++);assert.equal(w.document.querySelectorAll('#dmSoloLevelIntro select,#dmSoloLevelIntro [data-class]').length,0);assert.match(w.document.querySelector('[data-stage]').textContent,/Seviye 4/);w.document.querySelector('[data-start]').click();await new Promise(r=>setImmediate(r));assert.equal(calls,1);assert.equal(w.dmSoloLevels.scope('ky').soloLevel,4);
 w.dmTeacherPortalMode=true;assert.equal(w.dmSoloLevels.needs('ky'),false);await w.dmSoloLevels.open('ky',()=>calls++);assert.equal(calls,2);w.dmTeacherPortalMode=false;let resolve;w.fetch=()=>new Promise(r=>resolve=r);const pending=w.dmSoloLevels.open('ky',()=>calls++);w.aktifOgrenciAdi='another';resolve(Response.json({ok:true,number:1}));await pending;assert.equal(w.document.querySelector('[data-start]').disabled,true);w.close();
});
test('email rejects hogmail, gtmail, disposable and nonexistent domains; common and organizational providers work',async()=>{
 const {validateRegistrationEmail:check}=await import('../supabase/functions/diji-api/registration-email.mjs');let queries=0;const mx=async()=>{queries++;return Response.json({Status:0,Answer:[{type:15,data:'10 mail.school.edu.tr.'}]});};for(const e of ['a@hogmail.com','a@gtmail.com','a@gmail.con','a@mailinator.com','bad'])assert.equal((await check(e,mx)).ok,false,e);for(const e of ['a@gmail.com','a@hotmail.com','a@outlook.com'])assert.equal((await check(e,mx)).ok,true,e);assert.equal(queries,0);assert.equal((await check('a@school.edu.tr',mx)).ok,true);assert.equal((await check('b@school.edu.tr',mx)).ok,true);assert.equal(queries,1,'MX cached by domain');assert.equal((await check('a@nonexistent-school.example',async()=>Response.json({Status:3}))).ok,false);assert.equal((await check('a@null-mx.example',async()=>Response.json({Status:0,Answer:[{type:15,data:'0 .'}]}))).ok,false);assert.equal((await check('a@timeout.example',async()=>{throw Error('timeout')})).temporary,true);
});
test('code breaker has exactly eight options, one tap records once and progresses on a wrong answer',()=>{
 const src=read('ingilizce/app-js/i01-raporlarimac.js'),dom=new JSDOM('<div id="kelimebulOyunOverlay"><div id="kbKelimeInfo"></div><div id="kbPuanInfo"></div><div id="kbIpucu"></div><div><input id="kbTahminInput"></div><div id="kbSatirlar"></div></div>',{runScripts:'outside-only'}),w=dom.window,timers=[],records=[];w.kelimebulKelimeler=[{en:'cat',tr:'kedi'},{en:'dog',tr:'köpek'}];w.kelimebulAktifIndex=0;w.kelimebulKombo=0;w.kelimebulDogruSayi=0;w.kelimebulYanlisSayi=0;w.masterKelimeHavuzu=Array.from({length:20},(_,i)=>({en:'word'+i,tr:'anlam'+i}));w.OC={aktif:{runId:'r'},puan:()=>0,dogru(){},yanlis(){}};w.dmVerifiedGames={record:(...a)=>records.push(a)};w.guvenliMetin=s=>s;w.genelSesEfektiCal=()=>{};w.setTimeout=f=>timers.push(f);w.eval(src.slice(src.indexOf('                function kelimebulSonrakiKelime() {'),src.indexOf('                async function kelimebulOyunuBitir() {')));w.kelimebulSonrakiKelime();const buttons=[...w.document.querySelectorAll('[data-code-choice]')];assert.equal(buttons.length,8);const wrong=buttons.find(b=>b.textContent!=='cat');wrong.click();wrong.click();assert.equal(records.length,1);assert.equal(w.kelimebulYanlisSayi,1);timers.shift()();assert.equal(w.kelimebulAktifIndex,1);w.close();
});
test('listening has two choices, no text input, and records either answer only once with feedback sound',()=>{
 const src=read('ingilizce/app-js/i03-veriler.js'),dom=new JSDOM('<div id="yoModal" class="acik"><div id="content"></div></div>',{runScripts:'outside-only'}),w=dom.window,records=[],sounds=[],timers=[];w.dkt={liste:[{en:'cat',tr:'kedi'}],i:0,d:0,y:0};w.masterKelimeHavuzu=[{en:'cat',tr:'kedi'},{en:'dog',tr:'köpek'}];w.yoKaristir=a=>a;w.yoGuvenliMetin=s=>s;w.yoGovde=h=>w.document.getElementById('content').innerHTML=h;w.dmVerifiedGames={record:(...a)=>records.push(a)};w.OC={dogru(){},yanlis(){}};w.zkEkle=()=>{};w.yoSes=s=>sounds.push(s);w.setTimeout=f=>timers.push(f);w.eval(src.slice(src.indexOf('        function dikteSoru() {'),src.indexOf('        function dikteBitir() {')));w.dikteSoru();assert.equal(w.document.querySelectorAll('#yoDikteChoices button').length,2);assert.equal(w.document.querySelectorAll('input').length,0);assert(w.document.getElementById('yoDikteChoices').hidden);w.dikteDinle();w.dikteKontrol(1);w.dikteKontrol(1);assert.equal(records.length,1);assert.deepEqual(sounds,['yanlis']);assert.equal(w.dkt.y,1);w.close();
});


test('each student game has its own Papi hero and back reopens the saved level screen',async()=>{
 const dom=new JSDOM('<body></body>',{url:'https://test.invalid',runScripts:'outside-only'}),w=dom.window;
 w.aktifOgrenciAdi='learner';w.apiURL='/api';w.setTimeout=()=>0;
 w.fetch=async()=>Response.json({ok:true,number:3,classNo:1,units:[1],words:[],label:'1. Sınıf',totalLevels:320});
 w.eval(read('ingilizce/solo-levels.js'));
 for(const starter of ['kelimeYarismasiBaslat','jeopardyOyunuBaslat','boslukOyunuBaslat','hafizaOyunuBaslat','yagmurOyunuBaslat','kelimebulOyunuBaslat','esOyunuBaslat','trenOyunuBaslat'])w[starter]=()=>{};
 const keys=['ky','bosluk','hafiza','yagmur','eslestirme','fener'];
 const names=new Set();
 for(const game of keys){
  let calls=0;await w.dmSoloLevels.open(game,()=>calls++);
  const root=w.document.getElementById('dmSoloLevelIntro');
  assert.equal(root.dataset.game,game);
  assert(root.querySelector('.dm-solo-papi'),game);
  assert(root.querySelector('.dm-solo-game-title'),game);
  assert(root.querySelector('.dm-solo-start'),game);
  assert.equal(root.querySelectorAll('select,[data-grade],[data-unit]').length,0,game);
  names.add(root.querySelector('.dm-solo-game-title').textContent);
  root.querySelector('[data-start]').click();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls,1,game);
  assert.equal(w.dmSoloLevels.isCurrentGame(game),true,game);
  await w.dmSoloLevels.backToIntro(game);
  assert(w.document.getElementById('dmSoloLevelIntro'),game);
  assert.equal(w.dmSoloLevels.isCurrentGame(game),false,game);
 }
 assert.equal(names.size,keys.length);
 w.close();
});
