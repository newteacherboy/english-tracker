const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
const rows=Array.from({length:12},(_,i)=>({ingilizce:'word'+i,turkce:'anlam'+i,sinif:5,unite:1}));
function setup({teacher=false,startError=false,delayed=false}={}){
 const dom=new JSDOM('<div id="tab-aktiviteler"><div class="az-grid2x2"></div></div>',{url:'https://test.invalid',runScripts:'outside-only'}),w=dom.window,starts=[],answers=[],results=[],timers=[];let resolveStart;
 w.aktifOgrenciAdi=teacher?'teacher':'test';w.siniftaOynananOgrenci='';w.masterKelimeHavuzu=rows;w.apiURL='/api';w.dmGameAccess={reason:()=>'',rule:()=>({cls:5})};w.dmProgression={require:()=>true,paint:()=>{}};w.dmFeatureEnabled=()=>true;w.oyunHavuzGetir=(c,u)=>rows.filter(x=>x.sinif===c&&u.includes(x.unite));w.dmGameScope=k=>w.dmSoloArcade?.scope(k);w.genelSonucEkraniGoster=o=>results.push(o);
 w.setInterval=fn=>{timers.push(fn);return timers.length;};w.clearInterval=()=>{};w.setTimeout=fn=>{timers.push(fn);return timers.length;};w.clearTimeout=()=>{};
 w.fetch=async()=>({ok:true,json:async()=>({status:'success'})});
 w.eval(read('ingilizce/score-rules.js'));let oc=read('ingilizce/index.html').split('window.OC = (function () {')[1].split('</script>')[0];w.eval('window.OC = (function () {'+oc);
 w.dmVerifiedGames={start:async(key,id,scope,words)=>{starts.push({key,id,scope,words});if(delayed)return new Promise(r=>resolveStart=r);if(startError&&starts.length===1)throw Error('Bağlantı kesildi');return {enerjiKalan:22,enerjiMax:25};},record:(word,answer,id)=>answers.push({word,answer,id})};
 w.eval(read('ingilizce/solo-arcade.js'));return {dom,w,starts,answers,results,timers,resolve:()=>resolveStart?.({enerjiKalan:22})};
}
const settle=()=>new Promise(r=>setImmediate(r));
test('Word Bank options remain in scope, unique and include the target even for short banks',()=>{
 const t=setup();try{const c=t.w.dmSoloArcadeCore,bank=[...rows,{...rows[0]}, {ingilizce:'',turkce:'missing'}];assert.equal(c.pool(bank).length,12);for(const key of ['canavar','kule']){const out=Array.from(c.options(rows[0],rows.slice(0,2),key));assert.equal(out.length,2);assert.ok(out.includes(key==='canavar'?'word0':'anlam0'));}const out=Array.from(c.options(rows[0],[rows[0],{...rows[1],turkce:'anlam0'},rows[2]],'kule'));assert.equal(new Set(out).size,out.length);}finally{t.dom.window.close();}
});
test('single start uses selected scope; fast duplicate taps do not start twice',async()=>{
 const t=setup();try{t.w.canavarAvcisiAc();const b=t.w.document.querySelector('[data-start]');b.click();b.click();await settle();assert.equal(t.starts.length,1);assert.equal(t.starts[0].scope.classNo,5);assert.deepEqual(Array.from(t.starts[0].scope.units),[1]);assert.equal(t.starts[0].words.length,12);assert.equal(t.w.OC.aktif.rewardScope.classNo,5);}finally{t.dom.window.close();}
});
test('uncertain start retries the same run and deck without another identity',async()=>{
 const t=setup({startError:true});try{t.w.canavarAvcisiAc();t.w.document.querySelector('[data-start]').click();await settle();assert.match(t.w.document.querySelector('[data-status]').textContent,/Bağlantı/);t.w.document.querySelector('[data-start]').click();await settle();assert.equal(t.starts.length,2);assert.equal(t.starts[0].id,t.starts[1].id);assert.equal(t.starts[0].words,t.starts[1].words);}finally{t.dom.window.close();}
});
test('closing a pending start cannot reopen the game when the request resolves',async()=>{
 const t=setup({delayed:true});try{t.w.dengesizKuleAc();t.w.document.querySelector('[data-start]').click();t.w.dmSoloArcade.close();t.resolve();await settle();assert.equal(t.w.document.getElementById('soloArcadeOverlay'),null);}finally{t.dom.window.close();}
});
test('one answer per question, wrong answer waits for Continue, pause blocks answers',async()=>{
 const t=setup();try{t.w.canavarAvcisiAc();t.w.document.querySelector('[data-start]').click();await settle();t.w.document.querySelector('[data-pause]').click();t.w.document.querySelector('[data-answer]').click();assert.equal(t.answers.length,0);t.w.document.querySelector('[data-resume]').click();const word=t.starts[0].words[0];const wrong=[...t.w.document.querySelectorAll('[data-answer]')].find(b=>b.textContent!==word.ingilizce);wrong.click();wrong.click();assert.equal(t.answers.length,1);assert.equal(t.w.OC.aktif.yanlis,1);assert.equal(t.w.document.querySelector('[data-next]').hidden,false);t.w.document.querySelector('[data-next]').click();assert.match(t.w.document.querySelector('.sa-hud').textContent,/2\/12/);}finally{t.dom.window.close();}
});
test('tower collapse accounts for remaining questions and reaches the shared result once',async()=>{
 const t=setup({teacher:true});try{t.w.dengesizKuleAc();t.w.document.querySelector('[data-start]').click();await settle();for(let i=0;i<4;i++){const word=t.starts[0].words[i];[...t.w.document.querySelectorAll('[data-answer]')].find(b=>b.textContent!==word.turkce).click();t.w.document.querySelector('[data-next]').click();}await settle();assert.equal(t.answers.length,12);assert.equal(t.results.length,1);assert.equal(t.results[0].yanlis,12);assert.equal(t.results[0].oyunKey,'kule');assert.equal(t.results[0].siralamaYok,true);assert.equal(t.w.document.getElementById('soloArcadeOverlay'),null);}finally{t.dom.window.close();}
});
test('server grades both games as single-attempt answers and shares exact unlock gates',async()=>{
 const core=await import('../supabase/functions/diji-api/verified-games.mjs');for(const game of ['canavar','kule']){const task=core.compile(game,[{en:'apple',tr:'elma'}])[0];assert.equal(core.grade(task,'wrong',game).complete,true);assert.equal(core.grade(task,game==='canavar'?'apple':'elma',game).correct,true);assert.equal(core.grade(task,true,game).valid,false);}const t=setup();try{t.w.eval(read('ingilizce/progression-catalog.js'));assert.equal(t.w.DijiProgressionCatalog.gates.oyun_canavar,20);assert.equal(t.w.DijiProgressionCatalog.gates.oyun_kule,35);assert.equal(read('ingilizce/progression-catalog.js'),read('supabase/functions/diji-api/progression-catalog.js'));}finally{t.dom.window.close();}
});
