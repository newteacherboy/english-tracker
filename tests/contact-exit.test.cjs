const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM,VirtualConsole}=require('jsdom');
const source=f=>fs.readFileSync('ingilizce/'+f,'utf8'),flush=()=>new Promise(r=>setImmediate(r));
const profile={ok:true,kullaniciAdi:'Ada',adSoyad:'Ada',telefon:'',email:'',sinif:5,learnerProfile:{purpose:'school',educationStage:'middle',ageBand:'under13',goal:'school'}};
function setup(responder){
 const dom=new JSDOM('<button id="outside">Parkur</button>',{url:'https://diji.test/ingilizce/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()}),w=dom.window,calls=[],forgot=[];
 w.localStorage.setItem('ing_token','ada-token');w.localStorage.setItem('ing_aktifOgrenci','Ada');w.localStorage.setItem('ing_oturumAcik','true');w.localStorage.setItem('ing_yo_Ada','preserve-progress');w.localStorage.setItem('other-account','preserve-other-account');
 w.dmSavedSessions={forget:t=>forgot.push(t)};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async(_url,options)=>{const b=JSON.parse(options.body);calls.push(b);return {json:async()=>await (responder?.(b)||b.islem==='kisiselBilgilerim'&&profile||{ok:true})};};
 w.eval(source('kisisel-bilgiler.js'));w.eval(source('contact-policy.js'));
 function freeze(){w.document.dispatchEvent(new w.CustomEvent('dm:contact-block',{detail:{ok:true,eksik:true,donuk:true}}));}
 return {w,dom,calls,forgot,freeze};
}
test('expired contact deadline keeps completion required but provides a real logout beside Save',async()=>{
 const f=setup();f.freeze();await flush();const {w}=f;
 assert(w.dmContactFrozen);assert(w.document.getElementById('outside').inert);assert(w.document.querySelector('.kb-x').hidden);
 assert(w.document.querySelector('.kb-actions #kbKaydet'));assert(w.document.querySelector('.kb-actions .kb-cikis'));
 w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert(w.document.querySelector('.kb-perde'),'Escape cannot bypass mandatory completion');
 w.document.querySelector('.kb-actions .kb-cikis').click();assert.equal(w.localStorage.getItem('ing_token'),null);assert.deepEqual(f.forgot,['ada-token']);assert(!w.document.querySelector('.kb-perde,#cpBlock'));assert(!w.document.getElementById('outside').inert);assert(!w.dmContactFrozen);
 assert.equal(w.localStorage.getItem('ing_yo_Ada'),'preserve-progress');assert.equal(w.localStorage.getItem('other-account'),'preserve-other-account');assert(f.calls.some(b=>b.islem==='cikis'&&b.t==='ada-token'));assert(!f.calls.some(b=>b.islem==='kisiselBilgiGuncelle'));w.close();
});
test('logout is usable while initial profile loading hangs and late data cannot reopen the sheet',async()=>{
 let resolve;const pending=new Promise(r=>resolve=r),f=setup(b=>b.islem==='kisiselBilgilerim'?pending:null);f.freeze();assert(f.w.document.querySelector('.kb-yukleniyor'));f.w.document.querySelector('.kb-cikis').click();assert.equal(f.w.localStorage.getItem('ing_token'),null);resolve(profile);await flush();assert(!f.w.document.querySelector('.kb-perde'));f.w.close();
});
test('load errors retain both Retry and Logout without requiring contact information',async()=>{
 const f=setup(b=>b.islem==='kisiselBilgilerim'?{ok:false,mesaj:'Bağlantı yok'}:null);f.freeze();await flush();assert.match(f.w.document.querySelector('.kb-yukleniyor').textContent,/Bağlantı yok/);assert.match(f.w.document.querySelector('.kb-kaydet').textContent,/Tekrar dene/);f.w.document.querySelector('.kb-cikis').click();assert.equal(f.w.localStorage.getItem('ing_token'),null);f.w.close();
});
test('an invalid form never removes the completion gate and still permits logout',async()=>{
 const f=setup();f.freeze();await flush();f.w.document.getElementById('kbKaydet').click();assert.match(f.w.document.getElementById('kbMesaj').textContent,/E-posta/);assert(f.w.dmContactFrozen);assert(!f.calls.some(b=>b.islem==='kisiselBilgiGuncelle'));f.w.document.querySelector('.kb-actions .kb-cikis').click();assert.equal(f.w.localStorage.getItem('ing_token'),null);f.w.close();
});
test('logout stays enabled during saving; a late save never updates another session or emits completion',async()=>{
 let resolve,completed=0;const pending=new Promise(r=>resolve=r),f=setup(b=>b.islem==='kisiselBilgiGuncelle'?pending:null);f.freeze();await flush();f.w.document.addEventListener('dm:kisisel-bilgiler',()=>completed++);f.w.document.getElementById('kbMail').value='parent@example.test';f.w.document.getElementById('kbKaydet').click();assert(f.w.document.getElementById('kbKaydet').disabled);assert(!f.w.document.querySelector('.kb-actions .kb-cikis').disabled);f.w.document.querySelector('.kb-actions .kb-cikis').click();resolve({...profile,email:'parent@example.test'});await flush();assert.equal(completed,0);assert.equal(f.w.localStorage.getItem('ing_token'),null);assert(!f.w.document.querySelector('.kb-perde'));f.w.close();
});
test('blocking fallback screen also permits logout if personal-information UI cannot open',()=>{
 const f=setup();f.w.kisiselBilgilerAc=undefined;f.freeze();f.w.document.getElementById('cpLogout').click();assert.equal(f.w.localStorage.getItem('ing_token'),null);assert(!f.w.document.getElementById('outside').inert);f.w.close();
});
test('a stale sheet cannot log out a newly selected account; optional personal information still closes normally',async()=>{
 const f=setup();await f.w.kisiselBilgilerAc();f.w.localStorage.setItem('ing_token','new-token');f.w.document.querySelector('.kb-actions .kb-cikis').click();assert.equal(f.w.localStorage.getItem('ing_token'),'new-token');assert.equal(f.forgot.length,0);assert(!f.w.document.querySelector('.kb-perde'));await f.w.kisiselBilgilerAc();f.w.document.querySelector('.kb-x').click();assert(!f.w.document.querySelector('.kb-perde'));assert.equal(f.w.localStorage.getItem('ing_token'),'new-token');f.w.close();
});
