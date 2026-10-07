const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function theme(){const listeners={},window={};vm.runInNewContext(fs.readFileSync('ingilizce/parkur-theme.js','utf8'),{window,document:{getElementById:()=>null,querySelectorAll:()=>[],body:{classList:{contains:()=>false,toggle(){}}},addEventListener:(name,fn)=>listeners[name]=fn},setInterval(){},MutationObserver:class{observe(){}}});return {window,listeners};}
test('all four curricula form one scene with one castle label and unique node targets',()=>{
 const {window}=theme();const steps=[];[16,20,16,16].forEach((n,b)=>{for(let d=0;d<n;d++)steps.push({b,d,label:'class unit',short:'class',done:b===0&&d<10,available:b===0&&d===10});});
 const result=window.dmParkurSahne({steps,current:10,complete:10});assert.equal((result.match(/<section /g)||[]).length,1);assert.equal((result.match(/dm-unified-palace-label/g)||[]).length,1);assert.equal((result.match(/data-route-index=/g)||[]).length,68);assert.equal((result.match(/ current/g)||[]).length,1);assert(!/undefined|NaN/.test(result));
 const targets=[...result.matchAll(/data-b="(\d+)" data-d="(\d+)"/g)].map(m=>m[1]+':'+m[2]);assert.equal(new Set(targets).size,68);assert(targets.includes('0:15'));assert(targets.includes('1:19'));assert(targets.includes('3:15'));
});
test('header restores profile action alongside wallet and uses real avatar synchronization',()=>{
 const {window,listeners}=theme();assert.match(window.dmParkurBaslik({energy:30,max:30,gold:20}),/dm-adventure-profile/);let opened=false;window.profilAc=()=>opened=true;listeners.click({target:{closest:()=>({dataset:{dmWallet:'profile'}})}});assert.equal(opened,true);
});
test('map removes section menus and dispatches real section/unit pairs',()=>{
 const html=fs.readFileSync('ingilizce/index.html','utf8'),start=html.indexOf('  function harita(b) {'),end=html.indexOf('  /* ================= 3) DURAK',start),source=html.slice(start,end);
 assert(!source.includes('dm-map-controls'));assert(!source.includes('dm-adventure-full-map'));assert(source.includes('durakKarti(+t.dataset.b,+t.dataset.d)'));assert(source.includes('sc.scrollTop=Math.max'));assert.match(html,/function koridor\(\) \{ harita\(aktifBolum\(\)\); \}/);
});
