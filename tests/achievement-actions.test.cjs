const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('ingilizce/notice-sharing.js','utf8');
const helper=source.slice(source.indexOf('function attachAchievementActions('),source.indexOf('function celebrateCharacter('));
async function fixture(native=true){
 let shared=null,downloaded=0,revoked=0,cleanup;
 function element(){return {children:[],setAttribute(){},append(...nodes){this.children.push(...nodes)},click(){downloaded++},remove(){}}}
 const card={isConnected:true,children:[],querySelector(){return null},append(...nodes){this.children.push(...nodes)}};
 const c={document:{createElement:element,body:element()},navigator:{userAgent:'Chrome',canShare:()=>native,share:async data=>{shared=data}},MutationObserver:class{constructor(f){cleanup=f}observe(){}disconnect(){}},URL:{createObjectURL:()=> 'blob:achievement',revokeObjectURL(){revoked++}},File:class{constructor(blobs,name,opt){this.name=name;this.type=opt.type}},render:async()=>({blob:{}}),defaultTheme:()=>1,filename:()=> 'dijimedu-rozet.png',open(){},console};
 vm.runInNewContext(helper,c);c.attachAchievementActions(card,{kind:'badge',name:'7 Gün Seri'});await new Promise(r=>setImmediate(r));
 return {card,share:card.children[0].children[0],save:card.children[0].children[1],get shared(){return shared},get downloaded(){return downloaded},get revoked(){return revoked},cleanup};
}
test('achievement dialog offers prepared PNG sharing and download directly',async()=>{const f=await fixture();assert.equal(f.share.textContent,'Arkadaşlarınla paylaş');assert.equal(f.save.textContent,'Fotoğrafı indir');assert.equal(f.share.disabled,false);f.share.onclick();await new Promise(r=>setImmediate(r));assert.equal(f.shared.files[0].name,'dijimedu-rozet.png');f.save.onclick();assert.equal(f.downloaded,1);f.card.isConnected=false;f.cleanup();assert.equal(f.revoked,1)});
test('unsupported native sharing falls back to an actual PNG download',async()=>{const f=await fixture(false);f.share.onclick();assert.equal(f.downloaded,1);assert.equal(f.shared,null)});
