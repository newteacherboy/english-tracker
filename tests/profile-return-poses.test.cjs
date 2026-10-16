const fs=require('node:fs'),assert=require('node:assert/strict'),{test}=require('node:test'),{JSDOM}=require(process.env.DIJI_JSDOM||'jsdom');
const read=n=>fs.readFileSync('ingilizce/'+n,'utf8'),html=read('index.html');
const pause=()=>new Promise(r=>setTimeout(r,35));
test('profile → progress → profile → X/Escape/backdrop preserves the main destination',async()=>{
 const parsed=new JSDOM(html),nav=parsed.window.document.getElementById('bottomNavMobile').outerHTML;parsed.window.close();
 for(const primary of ['tab-dunya','tab-aktiviteler','tab-magaza'])for(const exit of ['x','escape','backdrop']){
  const dom=new JSDOM('<body><div id="legacy">Şu anda duyuru yok.</div>'+['tab-dunya','tab-aktiviteler','tab-magaza'].map(id=>'<div id="'+id+'" class="dc-fullscreen-overlay '+(id===primary?'active':'')+'"></div>').join('')+nav+'</body>',{url:'https://fixture.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
  w.eval("var aktifOgrenciAdi='Ada',yo={karakter:{s:{},sahip:[]}},apiURL='/api';");w.dcTumTamEkranlariKapat=()=>d.querySelectorAll('.dc-fullscreen-overlay').forEach(el=>el.classList.remove('active'));w.dcBottomNavSenkronize=()=>{};
  w.setInterval=()=>0;w.fetch=async()=>({ok:false,json:async()=>({})});w.eval(read('bottom-nav.js'));w.eval(read('profile-sections.js'));
  d.querySelector('[data-ekran="tab-profile-menu"]').click();d.querySelector('[data-profile="progress"]').click();assert(d.getElementById('tab-ilerlemem').classList.contains('active'));d.querySelector('.dm-profile-back').click();await pause();assert(d.getElementById(primary).classList.contains('active'));
  const menu=d.getElementById('rtProfileBackdrop');assert(menu);
  if(exit==='x')menu.querySelector('.rt-close').click();else if(exit==='backdrop')menu.click();else menu.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert(!d.getElementById('rtProfileBackdrop'));assert(d.getElementById(primary).classList.contains('active'),primary+' '+exit);assert.equal(d.querySelectorAll('.dc-fullscreen-overlay.active').length,1);dom.window.close();
 }
});
test('10 unique native arm gestures; 2 free, 8 five-level locks and increasing prices',()=>{
 const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window;w.eval(read('character-poses.js'));const poses=w.dmCharacterPoses.list;assert.equal(poses.length,10);assert.equal(poses.filter(p=>!p.f).length,2);assert.deepEqual(Array.from(poses.filter(p=>p.f),p=>p.level),[5,10,15,20,25,30,35,40]);
 const arms=new Set();for(const p of poses){const svg=w.dmCharacterPoses.arms({durus:p.id},'#123456','#f1c7a5','#654321');assert.equal((svg.match(/data-pose-arm=/g)||[]).length,2);assert(svg.includes('#123456'));assert(svg.includes('#654321'));arms.add(svg.replaceAll(p.id,''));}assert.equal(arms.size,10);assert(!w.dmCharacterPoses.arms({durus:'dik'},'a','b'));
 const catalog=require('../ingilizce/progression-catalog.js'),items=JSON.parse(fs.readFileSync('supabase/functions/diji-api/progression-shop.json'));let last=0;
 for(const p of poses){const item=items.find(x=>x.id==='a|durus|'+p.id);assert(item);assert.equal(catalog.itemLevel(item),p.level);assert.equal(catalog.price(item),p.f);if(p.f){assert(p.f>last);last=p.f;}}
 dom.window.close();
});
