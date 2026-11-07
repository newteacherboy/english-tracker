const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require(process.env.PAPI_JSDOM||'jsdom');
function fixture(){const dom=new JSDOM('<button id="origin">Origin</button><div id="tab-aktiviteler"><div class="az-grid2x2"></div></div>',{url:'https://papi.test/',runScripts:'outside-only'}),w=dom.window,calls=[];w.masterKelimeHavuzu=[{sinif:5,unite:1,ingilizce:'apple',turkce:'elma'},{sinif:5,unite:1,ingilizce:'book',turkce:'kitap'},{sinif:5,unite:1,ingilizce:'bird',turkce:'kuş'}];w.Math.random=()=>.999;w.apiURL='https://papi.test/api';w.speechSynthesis={cancel(){},speak(){},getVoices(){return []}};w.SpeechSynthesisUtterance=class{};let fail=false;w.fetch=async(u,o)=>{const b=JSON.parse(o.body);calls.push(b);if(fail)throw Error('Bağlantı yok');return {ok:true,json:async()=>b.islem==='papiKartSonucKaydet'?{ok:true,isim:b.isim||'İsimsiz öğrenci'}:{ok:true,liste:[{isim:'<img src=x onerror=alert(1)>',puan:67}]}};};w.eval(fs.readFileSync('ingilizce/papi-cards.js','utf8'));const click=s=>w.document.querySelector(s).click(),start=()=>{const unit=w.document.querySelector('#pcUnit');unit.value='1';unit.dispatchEvent(new w.Event('change'));w.document.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));},flush=()=>new Promise(resolve=>setImmediate(resolve));return {w,calls,click,start,flush,setFail:v=>fail=v,dom};}
test('each card counts once, one save, ranking escapes aliases',async()=>{const f=fixture();f.click('#papiCardsActivity');await f.flush();f.w.document.querySelector('#pcName').value='Student Alias';f.start();assert(f.w.document.querySelector('.pc-actions').hidden);f.click('.pc-show');assert.equal(f.w.document.querySelector('.pc-meaning').textContent,'elma');f.click('.pc-again');for(let i=0;i<2;i++){f.click('.pc-show');f.click('.pc-known');}await f.flush();const p=f.calls.find(c=>c.islem==='papiKartSonucKaydet');assert.equal(p.biliyorum,2);assert.equal(p.tekrar,1);assert.equal(p.isim,'Student Alias');assert.equal(f.calls.filter(c=>c.islem==='papiKartSonucKaydet').length,1);assert.equal(f.w.document.querySelector('.pc-ranking img'),null);assert(f.w.document.querySelector('.pc-sub').textContent.includes('67'));f.click('.pc-repeat');assert(f.w.document.querySelector('.pc-actions').hidden);f.click('.pc-close');assert.equal(f.w.document.getElementById('papiCards'),null);f.dom.window.close();});
test('failed result shows honest status and retry keeps same run identifier',async()=>{const f=fixture();f.click('#papiCardsActivity');await f.flush();f.start();f.setFail(true);for(let i=0;i<3;i++){f.click('.pc-show');f.click('.pc-known');}await f.flush();assert(!f.w.document.querySelector('.pc-save').hidden);assert(f.w.document.querySelector('.pc-save-status').textContent.includes('Kaydedilemedi'));const id=f.calls[0].runId;f.setFail(false);f.click('.pc-save');await f.flush();assert.equal(f.calls[1].runId,id);assert(f.w.document.querySelector('.pc-save-status').textContent.includes('kaydedildi'));f.dom.window.close();});

test('all unit words appear once per first pass; replay and reopening change the first card even with identical random draws',async()=>{const f=fixture();f.w.masterKelimeHavuzu.push({sinif:5,unite:2,ingilizce:'otherunit',turkce:'diğer ünite'},{sinif:6,unite:1,ingilizce:'otherclass',turkce:'diğer sınıf'},{sinif:5,unite:1,ingilizce:'apple',turkce:'elma'});f.click('#papiCardsActivity');await f.flush();f.start();function deck(){const all=[];for(let i=0;i<3;i++){all.push(f.w.document.querySelector('.pc-word strong').textContent);f.click('.pc-show');f.click('.pc-known');}return all;}const a=deck();await f.flush();f.click('.pc-repeat');const b=deck();await f.flush();assert.deepEqual([...a].sort(),['apple','bird','book']);assert.deepEqual([...b].sort(),[...a].sort());assert.notEqual(a[0],b[0]);f.click('.pc-close');f.click('#papiCardsActivity');await f.flush();f.start();const c=deck();await f.flush();assert.deepEqual([...c].sort(),[...a].sort());assert.notEqual(b[0],c[0]);assert(f.calls.filter(x=>x.islem==='papiKartSonucKaydet').every(x=>x.toplam===3));f.dom.window.close();});

test('Göster reveals the translation and ratings, then the next card hides them',async()=>{
 const f=fixture(),spoken=[];
 f.w.speechSynthesis.speak=u=>spoken.push(u.text);
 f.w.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 const get=selector=>f.w.document.querySelector(selector);
 f.click('#papiCardsActivity');await f.flush();f.start();
 assert.equal(get('.pc-word strong').textContent,'apple');assert.deepEqual(spoken,[]);
 f.click('.pc-speaker');assert.deepEqual(spoken,['apple']);
 f.click('.pc-known');assert.equal(get('.pc-word strong').textContent,'apple');
 assert.equal(get('.pc-meaning').textContent,'');
 assert(get('.pc-actions').hidden);
 f.click('.pc-show');assert.equal(get('.pc-meaning').textContent,'elma');
 assert(!get('.pc-actions').hidden);
 f.click('.pc-again');assert.equal(get('.pc-word strong').textContent,'book');
 assert(get('.pc-actions').hidden);
 f.click('.pc-show');f.click('.pc-known');
 assert.equal(get('.pc-word strong').textContent,'bird');
 f.w.document.getElementById('papiCards').dmGameFrameActions.back();
 assert.equal(get('#pcUnit').value,'1');
 f.w.document.getElementById('papiCards').dmGameFrameActions.back();
 assert.equal(get('#papiCards'),null);
 f.dom.window.close();
});

test('12 distinct cards per round, prioritizing words absent from the previous round',async()=>{
 const f=fixture();
 for(let i=0;i<21;i++)f.w.masterKelimeHavuzu.push({sinif:5,unite:1,ingilizce:'word '+i,turkce:'kelime '+i});
 f.click('#papiCardsActivity');await f.flush();f.start();
 function round(){
  const seen=new Set();
  for(let i=0;i<12;i++){
   seen.add(f.w.document.querySelector('.pc-word strong').textContent);
   f.click('.pc-show');f.click(i<9?'.pc-known':'.pc-again');
  }
  assert.equal(seen.size,12);
  assert.match(f.w.document.querySelector('.pc-sub').textContent,/75 \/ 100/);
  return seen;
 }
 const first=round();await f.flush();f.click('.pc-repeat');const next=round();await f.flush();
 assert([...next].every(word=>!first.has(word)));
 assert.deepEqual(f.calls.filter(c=>c.islem==='papiKartSonucKaydet').map(c=>[c.turBoyutu,c.toplam,c.biliyorum,c.tekrar]),[[12,12,9,3],[12,12,9,3]]);
 f.dom.window.close();
});
