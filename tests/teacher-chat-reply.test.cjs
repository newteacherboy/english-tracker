const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('ingilizce/index.html','utf8');
const fn=source.slice(source.indexOf('async function ogretmenCevapGonder() {'),source.indexOf('function ogretmenMenuOkunmamisGuncelle'));
function fixture(fetch){
 const nodes={ogretmenCevapInput:{value:'Yanıt & Türkçe?'},ogretmenCevapButton:{disabled:false},ogretmenCevapDurum:{textContent:''}};
 const calls=[];let refreshes=0;
 const ctx={document:{getElementById:id=>nodes[id]},ogretmenAktifSohbetOgrenci:'Öğrenci',apiURL:'https://api.test',AbortSignal,console:{error(){}},fetch:async(...args)=>{calls.push(args);return fetch(...args)},ogretmenSohbetMesajlariYenile:async()=>{refreshes++}};
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 return {ctx,nodes,calls,send:()=>ctx.ogretmenCevapGonder(),refreshes:()=>refreshes};
}
test('reply uses POST JSON and only clears the draft after server confirmation',async()=>{
 let finish;const f=fixture(()=>new Promise(r=>finish=r));const sent=f.send();
 assert.equal(f.calls[0][1].method,'POST');
 assert.deepEqual(JSON.parse(f.calls[0][1].body),{islem:'ogretmenCevapGonder',ogrenci:'Öğrenci',mesaj:'Yanıt & Türkçe?'});
 assert.equal(f.nodes.ogretmenCevapInput.value,'Yanıt & Türkçe?');
 assert.equal(f.nodes.ogretmenCevapButton.disabled,true);
 await f.send();assert.equal(f.calls.length,1);
 finish({ok:true,json:async()=>({ok:true,status:'success'})});await sent;
 assert.equal(f.nodes.ogretmenCevapInput.value,'');assert.equal(f.refreshes(),1);
 assert.equal(f.nodes.ogretmenCevapDurum.textContent,'Mesaj gönderildi.');assert.equal(f.nodes.ogretmenCevapButton.disabled,false);
});
test('HTTP, API and network failures preserve the draft and allow retry',async()=>{
 for(const result of [{ok:false,json:async()=>({mesaj:'POST gerekli.'})},{ok:true,json:async()=>({ok:false,mesaj:'Oturum gerekli.'})},null]){
  const f=fixture(async()=>{if(!result)throw Error('Offline');return result});await f.send();
  assert.equal(f.nodes.ogretmenCevapInput.value,'Yanıt & Türkçe?');assert.equal(f.refreshes(),0);
  assert.match(f.nodes.ogretmenCevapDurum.textContent,/Gönderim doğrulanamadı/);assert.equal(f.nodes.ogretmenCevapButton.disabled,false);
 }
});
test('in-flight reply never clears a new draft or updates a different conversation',async()=>{
 for(const switchThread of [false,true]){
  let finish;const f=fixture(()=>new Promise(r=>finish=r));const sent=f.send();f.nodes.ogretmenCevapInput.value='Yeni taslak';
  if(switchThread)f.ctx.ogretmenAktifSohbetOgrenci='Başka öğrenci';
  finish({ok:true,json:async()=>({ok:true,status:'success'})});await sent;
  assert.equal(f.nodes.ogretmenCevapInput.value,'Yeni taslak');assert.equal(f.refreshes(),switchThread?0:1);
 }
});
