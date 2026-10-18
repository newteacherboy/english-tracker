const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('ingilizce/hesap-sil.js','utf8');
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
for(const [page,action,confirmation] of [['hesap-sil.html','delete','HESABIMI SİL'],['hesap-dondur.html','freeze','HESABIMI DONDUR'],['hesap-ac.html','restore','HESABIMI AÇ']]){
 test(page+' Google callback reaches confirmation without application password and sends only its own action',async()=>{
  const dom=new JSDOM(fs.readFileSync('ingilizce/'+page,'utf8'),{url:'https://app.dijimedu.com/ingilizce/'+page+'?oauth=google',runScripts:'outside-only'}),w=dom.window,calls=[];
  w.sessionStorage.setItem('dm_account_action_pending',action);
  w.AbortController=AbortController;
  w.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'verified-oauth'}}}),signOut:async()=>({})}})};
  w.fetch=async(url,opt)=>{if(url.includes('/settings'))return {json:async()=>({external:{google:true,apple:false}})};const body=JSON.parse(opt.body);calls.push({body,headers:opt.headers});return {json:async()=>body.operation==='prepare_oauth'?{ok:true,ticket:'t'.repeat(73),username:'GoogleStudent',role:'student',action}:{ok:true,message:'Tamamlandı'}};};
  w.eval(source);await flush();assert.equal(w.document.getElementById('confirmForm').hidden,false);assert.equal(w.document.getElementById('password').value,'');assert.equal(calls[0].body.password,undefined);assert.equal(calls[0].headers.Authorization,'Bearer verified-oauth');
  w.document.getElementById('consent').checked=true;w.document.getElementById('confirmation').value=confirmation;
  w.document.getElementById('confirmForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await flush();
  assert.equal(calls[1].body.operation,action==='delete'?'confirm':'confirm_action');assert.equal(calls[1].body.action,action);assert.equal(w.document.getElementById('result').textContent,'Tamamlandı');w.close();
 });
}
test('account settings includes separate freeze, reopen and permanent deletion links',()=>{const dom=new JSDOM('<body><button id="settings">Ayarlar</button></body>',{url:'https://app.dijimedu.com/ingilizce/',runScripts:'outside-only'});dom.window.eval(fs.readFileSync('ingilizce/account-settings.js','utf8'));dom.window.dmHesapAyarlariAc();for(const page of ['hesap-dondur.html','hesap-ac.html','hesap-sil.html'])assert(dom.window.document.querySelector('a[href="'+page+'"]'));dom.window.close();});

test('fresh account-action OAuth returns are routed before portal login; expired markers do not redirect',()=>{
 const vm=require('node:vm'),html=fs.readFileSync('ingilizce/index.html','utf8'),script=html.match(/<script id="dm-account-oauth-return">([^]*?)<\/script>/)[1];
 for(const [age,expected] of [[1000,true],[700000,false]]){
  const values={dm_account_action_pending:'freeze',dm_account_action_started:String(Date.now()-age),dm_account_action_provider:'google'},targets=[];
  vm.runInNewContext(script,{URLSearchParams,Date,sessionStorage:{getItem:k=>values[k]},location:{search:'',hash:'#access_token=synthetic',replace:p=>targets.push(p)}});
  assert.equal(targets.length,expected?1:0);if(expected)assert.equal(targets[0],'hesap-dondur.html?oauth=google#access_token=synthetic');
 }
});
