const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const script=fs.readFileSync('ingilizce/oyna-v2.js','utf8');
function fixture(){const nodes=new Map(),c={yo:{dmLearningPurpose:'school',altin:25,lig:{xp:12}},aktifOgrenciAdi:'alice',innerHeight:844,document:{getElementById:id=>nodes.get(id)||null,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},window:null};c.window=c;c.addEventListener=()=>{};c.dmGunGorevleri=()=>({liste:[{id:'a',ilerleme:0},{id:'b',ilerleme:2},{id:'c',ilerleme:1}]});c.dmGorevHavuz=[{id:'a',ad:'Bölüm tamamla',hedef:1,olay:'parkur'},{id:'b',ad:'Kelime öğren',hedef:5,olay:'ders'},{id:'c',ad:'Tekrar yap',hedef:1,olay:'oyun'}];c.saved=0;c.opened=0;c.yoKaydet=()=>c.saved++;c.yoHemenKaydet=async()=>{};c.dunyaAc=async()=>c.opened++;vm.createContext(c);vm.runInContext(fs.readFileSync('ingilizce/route-missions.js','utf8'),c);vm.runInContext(script,c);return c;}
const steps=[{b:0,d:0,label:'1. sınıf 1. ünite · 1/3',available:true,done:false},{b:0,d:1,label:'1. sınıf 1. ünite · 2/3',available:false,done:false}];
test('school starts at grade 1 without a selector, locks future lessons and preserves native launch data',()=>{const c=fixture(),h=c.dmParkurSahne({steps,current:0});assert.match(h,/1\. Sınıf/);assert(!h.includes('<select'));assert.match(h,/dm-map-continue[^]*data-b="0" data-d="0"/);assert.match(h,/rt-node locked[^]*disabled/);assert.match(h,/data-rt="missions"/);assert.match(h,/data-rt="plan"/);assert.equal((h.match(/data-rt="task"/g)||[]).length,0);});
test('route selection persists using existing account state without altering either route progress or wallet',async()=>{const c=fixture();c.yo.baYildiz={210101:3};c.yo.storyProgress=[0,1];await c.dmLearningRoute.set('independent');assert.equal(c.yo.dmLearningPurpose,'independent');assert.equal(c.saved,1);assert.equal(c.opened,1);assert.equal(c.yo.altin,25);assert.deepEqual(c.yo.storyProgress,[0,1]);assert.equal(c.yo.baYildiz[210101],3);assert.match(c.dmParkurBaslik({energy:5,gold:25}),/Öğrenme Yolum/);assert(!c.dmParkurSahne({steps,current:0}).includes('dm-map-continue'));});
test('onboarding preview does not save selection before finishing',async()=>{const c=fixture();await c.dmLearningRoute.preview('independent');assert.equal(c.saved,0);assert.equal(c.yo.dmLearningPurpose,'school');assert.equal(c.dmLearningRoute.purpose(),'independent');});
test('late learning overview is discarded after account changes',async()=>{const c=fixture();c.yo.dmLearningPurpose='independent';let resolve; c.dmStoryPath={overview:()=>new Promise(r=>resolve=r)};const area={outerHTML:''},root={isConnected:true,querySelectorAll:()=>[],querySelector:()=>area,insertAdjacentHTML:()=>{throw Error('late response painted');}};c.dmParkurMapMount({dataset:{rtBound:'1'},querySelector:()=>root});c.aktifOgrenciAdi='bob';resolve({title:'Test',cefr:'A1',chapters:[{id:0,current:true,available:true}]});await new Promise(r=>setImmediate(r));assert.equal(area.outerHTML,'');});
test('learning route reads canonical chapters and marks the current lesson',async()=>{const c=fixture();c.yo.dmLearningPurpose='independent';c.dmStoryPath={overview:async()=>({title:'Selamlaşma',cefr:'A1',chapters:[{id:0,title:'Merhaba',cefr:'A1',done:true,available:true},{id:1,title:'Selamlaşma',cefr:'A1',current:true,available:true},{id:2,title:'Aile',cefr:'A1',available:false}]})};const area={outerHTML:''},root={isConnected:true,html:'',querySelectorAll:()=>[],querySelector:()=>area,insertAdjacentHTML(_,h){this.html+=h;}};c.dmParkurMapMount({dataset:{rtBound:'1'},querySelector:()=>root});await new Promise(r=>setImmediate(r));assert.match(root.html,/Selamlaşma/);assert.match(root.html,/data-chapter="1"[^]*aria-current="step"/);assert.match(root.html,/data-rt="continue"/);});
test('failed route save restores selection and does not open another route',async()=>{const c=fixture();c.yoHemenKaydet=async()=>{throw Error('offline');};assert.equal(await c.dmLearningRoute.set('independent'),false);assert.equal(c.yo.dmLearningPurpose,'school');assert.equal(c.opened,0);});
test('route picker opens saved route without reloading and legacy chest polling grants nothing',()=>{const html=fs.readFileSync('ingilizce/index.html','utf8'),picker=fs.readFileSync('ingilizce/member-experience.js','utf8');assert(!picker.includes('location.reload()'));const poll=html.split('function kontrolEt() {')[1].split('setInterval(kontrolEt')[0];assert(!poll.includes('sandikTorenAc('));assert(poll.includes('yoHazirMi'));const save=html.split('async function hemenKaydet(bekle) {')[1].split('window.yoHemenKaydet')[0];assert(save.includes("d.status !== 'success'"));assert(!save.includes('Promise.race'));});

test('first route selection waits for server profile readiness before changing local state',async()=>{
 const c=fixture();let finish;let checks=0;
 c.dmMemberSaveReady=()=>{checks++;return new Promise(resolve=>{finish=resolve;});};
 const first=c.dmLearningRoute.set('independent');
 await Promise.resolve();
 assert.equal(c.yo.dmLearningPurpose,'school','first tap must not change a profile before its server version loads');
 assert.equal(c.saved,0,'do not schedule a save during initial loading');
 assert.equal(checks,1);
 finish(true);
 assert.equal(await first,true);
 assert.equal(c.yo.dmLearningPurpose,'independent');
 assert.equal(c.saved,1);
 assert.equal(c.opened,1);
});
test('failed initial server load does not change parkur or show a false success',async()=>{
 const c=fixture();c.dmMemberSaveReady=async()=>{throw Error('Server is offline');};
 assert.equal(await c.dmLearningRoute.set('independent'),false);
 assert.equal(c.yo.dmLearningPurpose,'school');
 assert.equal(c.saved,0);
 assert.equal(c.opened,0);
});
test('changing accounts while the initial load is pending cannot switch the new account route',async()=>{
 const c=fixture();let finish;c.dmMemberSaveReady=()=>new Promise(r=>finish=r);
 const operation=c.dmLearningRoute.set('independent');
 await Promise.resolve();c.aktifOgrenciAdi='bob';finish(true);
 assert.equal(await operation,false);
 assert.equal(c.yo.dmLearningPurpose,'school');
 assert.equal(c.saved,0);
});

test('school map displays class-local stop numbers instead of encoded reward identities, including mixed units',()=>{const c=fixture();const rows=[{b:3,d:45,no:270451,label:'7. sınıf 4. ünite · 1/2',done:true,available:true},{b:3,d:46,no:270452,label:'7. sınıf Karışık üniteler · 1/2',available:true}];const html=c.dmParkurSahne({steps:rows,allSteps:rows,current:1});assert.match(html,/7\. Sınıf/);assert.match(html,/rt-tile-number">2<\/b>/);assert(!html.includes('270452'));assert.match(html,/Karışık/);});

function gated(status){const c=fixture();c.setTimeout=setTimeout;c.clearTimeout=clearTimeout;const listeners={},dialogs=[];c.document.addEventListener=(n,f)=>{(listeners[n]=listeners[n]||[]).push(f);};c.document.removeEventListener=()=>{};c.document.body={append(){}};c.document.activeElement=null;c.CustomEvent=class{constructor(n,o){this.type=n;this.detail=o?.detail;}};c.document.dispatchEvent=e=>{(listeners[e.type]||[]).splice(0).forEach(f=>f(e));};c.document.createElement=()=>{const el={id:'',className:'',innerHTML:'',dataset:{},style:{},setAttribute(){},append(){},remove(){},addEventListener(){},querySelector:()=>({onclick:null,focus(){},addEventListener(){}}),querySelectorAll:()=>[]};dialogs.push(el);return el;};let s=status;c.dmStartPlacement={open:o=>{c.placementOpened=o;return {};}};c.dmProgression={status:()=>s,refresh:()=>{s=status||{startPath:{learningRoute:'needs-test'}};c.document.dispatchEvent(new c.CustomEvent('dm:progression-status',{}));}};return {c,dialogs};}
test('class learners without the test are asked for it and stay on the school route',async()=>{const {c,dialogs}=gated({startPath:{learningRoute:'needs-test'}});assert.equal(await c.dmLearningRoute.set('independent'),false);assert.equal(c.yo.dmLearningPurpose,'school');assert.equal(c.saved,0);assert.equal(c.placementOpened?.source,'learning-route','the test screen opens directly');assert.equal(c.dmLearningRoute.purpose(),'school');});
test('the gate waits for the start path when it has not arrived yet',async()=>{const {c}=gated(null);assert.equal(await c.dmLearningRoute.set('independent'),false,'status arrives as needs-test');assert.equal(c.yo.dmLearningPurpose,'school');});
test('learners with the test or existing progress switch normally; a stale independent choice shows school while the test is needed',async()=>{let {c}=gated({startPath:{learningRoute:'open'}});assert.equal(await c.dmLearningRoute.set('independent'),true);assert.equal(c.yo.dmLearningPurpose,'independent');({c}=gated({startPath:{learningRoute:'needs-test'}}));c.yo.dmLearningPurpose='independent';assert.equal(c.dmLearningRoute.purpose(),'school');});
