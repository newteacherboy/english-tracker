const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('ingilizce/first-discovery-state.js','utf8');
function storage(initial={}){const m=new Map(Object.entries(initial));return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
function fixture(search='',stored={},session={},answer={}){
 const classes=new Set(),calls=[],raw=storage(stored),tab=storage(session);
 const window={localStorage:raw,sessionStorage:tab,fetch:async(u,o)=>{calls.push({u,o});return {ok:true,json:async()=>answer};}};
 vm.runInNewContext(source,{window,document:{documentElement:{classList:{add:c=>classes.add(c)}}},location:{search,hash:''},URLSearchParams,AbortController,setTimeout,clearTimeout,Error,Set});
 return {ctx:window.dmDiscoveryContext,classes,calls,raw,tab};
}
test('first visitor waits at welcome; member sessions bypass it without changing tokens',()=>{
 assert.equal(fixture().ctx.welcome,true);
 const f=fixture('',{ing_oturumAcik:'true',ing_token:'member-secret',ing_aktifOgrenci:'Ada'});
 assert.equal(f.ctx.member,true);assert.equal(f.ctx.welcome,false);assert.equal(f.raw.getItem('ing_token'),'member-secret');assert.equal(f.classes.size,0);
});
test('guest and OAuth callbacks bypass welcome and preserve teacher invite code',()=>{
 const f=fixture('?misafir=1&kesif=1&kod=ABC123');assert.equal(f.ctx.guest,true);assert.equal(f.ctx.welcome,false);assert(f.classes.has('dm-discovery-guest'));
 const o=fixture('?kesifKayit=google');assert.equal(o.ctx.oauth,true);assert.equal(o.ctx.welcome,false);
 for(const q of ['?giris=1','?kayit=1','?google_return=1','?misafir=1'])assert.equal(fixture(q).ctx.welcome,false);
 assert.equal(fixture('',{},{diji_google_pending:'1'}).ctx.welcome,false);
});
test('registration bridge never forwards guest tokens or real-member storage automatically',async()=>{
 const f=fixture('?misafir=1&kesif=1',{ing_token:'EXISTING_MEMBER'}, {},{status:'success'});
 await f.ctx.request({islem:'kayitOl',ogrenciAdi:'new_123'});
 const body=JSON.parse(f.calls[0].o.body);assert.equal(body.t,undefined);assert.equal(f.calls[0].o.headers.Authorization,undefined);assert.equal(f.raw.getItem('ing_token'),'EXISTING_MEMBER');
 await assert.rejects(f.ctx.request({islem:'aksesuarSatinAl'}));assert.equal(f.calls.length,1);
});
test('Google bearer is explicit; unlinked identity is returned for profile completion',async()=>{
 const f=fixture('?kesifKayit=google',{}, {},{ok:false,baglantiGerekli:true,mesaj:'Profilini tamamla'});
 const r=await f.ctx.request({islem:'googleGiris'},'verified-bearer');assert(r.baglantiGerekli);assert.equal(f.calls[0].o.headers.Authorization,'Bearer verified-bearer');
});
test('empty new-account state is accepted, account errors are surfaced without creating sessions',async()=>{
 assert.equal(await fixture('',{}, {},null).ctx.request({islem:'ekVeriGetir'}),null);
 const f=fixture('',{}, {},{status:'error',message:'Kullanıcı adı alınmış'});await assert.rejects(f.ctx.request({islem:'kayitOl'}),/Kullanıcı adı alınmış/);assert.equal(f.raw.getItem('ing_oturumAcik'),null);
});
test('all scripts including OAuth and guest wrappers parse',()=>{
 for(const name of ['first-discovery.js','first-discovery-state.js','guest-platform.js','google-login.js','onboarding-ui.js'])new vm.Script(fs.readFileSync('ingilizce/'+name,'utf8'));
});
test('saved member takes priority over an old discovery URL',()=>{
 const f=fixture('?misafir=1&kesif=1',{ing_oturumAcik:'true',ing_token:'member',ing_aktifOgrenci:'Ada'});
 assert.equal(f.ctx.member,true);assert.equal(f.ctx.guest,false);assert.equal(f.ctx.welcome,false);
});
test('discovery never creates a guest application session or replaces storage',()=>{
 const source=fs.readFileSync('ingilizce/guest-platform.js','utf8');
 for(const member of [false,true]){
  const raw=storage({ing_token:member?'member':''}),window={localStorage:raw,dmDiscoveryContext:{member,guest:!member}};
  vm.runInNewContext(source,{window,location:{search:'?misafir=1&kesif=1',replace:()=>assert.fail('unexpected redirect')},URLSearchParams});
  assert.equal(window.localStorage,raw);assert.equal(window.dmGuestMode,undefined);assert.equal(raw.getItem('ing_oturumAcik'),null);
 }
});
