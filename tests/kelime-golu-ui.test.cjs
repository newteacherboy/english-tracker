const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
function fixture(){
 const dom=new JSDOM('<section id="tab-aktiviteler"><div class="az-grid2x2"></div></section>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,events=[],pending=new Map();let id=0;
 w.eval("var aktifOgrenciAdi='student',siniftaOynananOgrenci='',apiURL='/api';");w.genelEnerjiKalan=25;
 w.masterKelimeHavuzu=[1,2].flatMap(sinif=>[1,2].flatMap(unite=>['apple','pear','cat','dog'].map((en,i)=>({sinif,unite,ingilizce:en+sinif+unite,turkce:['elma','armut','kedi','köpek'][i]+sinif+unite}))));
 w.setTimeout=fn=>{pending.set(++id,fn);return id;};w.clearTimeout=i=>pending.delete(i);w.setInterval=()=>1;w.clearInterval=()=>{};
 w.dmGameAccess={reason:()=>''};w.dmProgression={allowed:()=>true};
 w.genelEnerjiHarca=async n=>{events.push(['energy',n]);return {ok:true,eklenen:-3};};
 w.dmVerifiedGames={start:async(...a)=>events.push(['verified',...a]),record:(...a)=>events.push(['answer',...a])};
 w.OC={SORU:12,kelimeSec:(key,bank)=>bank.slice(0,12),basla(key){events.push(['core',key]);this.aktif={runId:'test-run-1234567890',oyun:key,dogru:0,yanlis:0};},dogru(){this.aktif.dogru++;},yanlis(){this.aktif.yanlis++;},puan(){return this.aktif.dogru*100;},sonlandir(){this.aktif.bitti=true;return {...this.aktif,sure:12,puan:100,puanSurum:3};}};
 w.genelSonucEkraniGoster=o=>events.push(['result',o]);w.fetch=async()=>({ok:true,json:async()=>({status:'success',liste:[]})});
 w.eval(fs.readFileSync('ingilizce/kelime-golu.js','utf8'));
 const flush=()=>{while(pending.size){const tasks=[...pending.values()];pending.clear();for(const fn of tasks)fn();}};
 const settle=()=>new Promise(r=>setImmediate(r));
 const answer=player=>{const panel=w.document.querySelector(`[data-player="${player}"]`),word=w.masterKelimeHavuzu.find(x=>x.ingilizce===panel.querySelector('[data-word]').textContent);return [...panel.querySelectorAll('[data-target]')].find(b=>b.textContent===word.turkce);};
 return {dom,w,events,flush,settle,answer};
}
test('solo uses only chosen class/units, charges one standard entry and records one answer per shot',async()=>{
 const f=fixture(),{w,events}=f;w.kelimeGoluAc();const grade=w.document.querySelector('[data-grade]');grade.value='2';grade.dispatchEvent(new w.Event('change'));const box=w.document.querySelector('[data-units]');box.querySelector('input[value="1"]').checked=false;box.querySelector('input[value="2"]').checked=true;box.dispatchEvent(new w.Event('change'));
 w.document.querySelector('[data-start]').click();await f.settle();const start=events.find(x=>x[0]==='verified');assert.equal(start[3].classNo,2);assert.deepEqual(Array.from(start[3].units),[2]);assert.ok(start[4].every(x=>x.sinif===2&&x.unite===2));assert.deepEqual(events.filter(x=>x[0]==='energy'),[['energy',-3]]);
 for(let i=0;i<4;i++){const answer=f.answer(0);answer.click();answer.click();f.flush();}await f.settle();assert.equal(events.filter(x=>x[0]==='answer').length,4);const result=events.find(x=>x[0]==='result')[1];assert.equal(result.dogru,4);assert.equal(result.oyunAdi,'⚽ Kelime Golü');assert.equal(result.rewardScope.classNo,2);w.close();
});
test('classroom simultaneous shots never touch energy, verified sessions, OC or account rewards',async()=>{
 const f=fixture(),{w,events}=f;w.kelimeGoluKapismaAc();w.document.querySelector('[data-start]').click();await f.settle();assert.equal(w.document.querySelectorAll('[data-player]').length,2);assert.notEqual(w.document.querySelector('[data-player="0"] [data-word]').textContent,w.document.querySelector('[data-player="1"] [data-word]').textContent);
 f.answer(0).click();f.answer(1).click();f.flush();assert.equal(w.document.querySelector('[data-player="0"] [data-score]').textContent,'10 PUAN');assert.equal(w.document.querySelector('[data-player="1"] [data-score]').textContent,'10 PUAN');assert.deepEqual(events,[]);w.close();
});
test('insufficient energy leaves solo at setup without starting or charging a run',async()=>{
 const f=fixture(),{w,events}=f;w.genelEnerjiKalan=2;w.kelimeGoluAc();w.document.querySelector('[data-start]').click();await f.settle();assert.match(w.document.querySelector('[data-status]').textContent,/3 enerji/);assert.equal(w.document.querySelector('[data-start]').disabled,false);assert.deepEqual(events,[]);w.close();
});
test('exit cancels delayed shot callbacks and removes the playing surface',async()=>{
 const f=fixture(),{w}=f;w.kelimeGoluKapismaAc();w.document.querySelector('[data-start]').click();await f.settle();f.answer(0).click();w.document.querySelector('[data-exit]').click();f.flush();assert.equal(w.document.getElementById('kelimeGolu'),null);w.close();
});
