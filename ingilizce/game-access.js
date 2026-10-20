/* Oyun sınıf / ünite kilitleri (onay: 20 Eki 2026).
   - Okul Yolum: öğrencinin parkurda bulunduğu sınıf ve o üniteye kadar olan üniteler,
     ayrıca alttaki tüm sınıfların tüm üniteleri açıktır. Üstü kilitlidir.
   - Öğrenme Yolu (dil seviyesi): 1–7. sınıfların tüm üniteleri açıktır; 8. sınıf için
     Öğrenme Yolu'nun A1 bölümü bitmiş olmalıdır.
   - Öğretmen (teacher) ve demo hesabı (dijimedu_demo) için kilit yoktur.
   - Kilitli bir sınıfa / üniteye dokununca altında minik bir açıklama görünür. */
(()=>{'use strict';
const C=n=>Math.floor((Number(n)-200000)/10000),U=n=>Math.floor(Number(n)%10000/100);
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'').trim();
const classroom=()=>typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci?String(siniftaOynananOgrenci).trim():'';
const free=()=>{const n=who().toLowerCase();return !n||n==='teacher'||n==='dijimedu_demo';};
const cache=()=>{try{return typeof globalDataCache!=='undefined'&&Array.isArray(globalDataCache)?globalDataCache:[];}catch(_){return [];}};
const ownClass=name=>{const u=cache().find(x=>String(x.ogrenci||'').trim().toLowerCase()===String(name||'').trim().toLowerCase());const n=Number(u?.Sinif);return Number.isInteger(n)&&n>=1&&n<=8?n:0;};
const route=()=>{try{const p=window.dmLearningRoute?.purpose?.();if(p)return p;}catch(_){}return typeof yo!=='undefined'&&yo?.dmLearningPurpose==='independent'?'independent':'school';};
let a1={owner:'',done:null,busy:false};

function learningA1(){
 const owner=who();
 if(a1.owner!==owner)a1={owner,done:null,busy:false};
 if(a1.done===null&&!a1.busy&&window.dmStoryPath?.overview){
  a1.busy=true;
  Promise.resolve(window.dmStoryPath.overview()).then(o=>{
   if(a1.owner!==owner)return;
   const list=(o?.chapters||[]).filter(c=>String(c.cefr||'').toUpperCase()==='A1');
   a1.done=list.length>0&&list.every(c=>c.done);
  }).catch(()=>{if(a1.owner===owner)a1.done=false;}).finally(()=>{a1.busy=false;refresh();});
 }
 return a1.done===true;
}

function rule(){
 const pupil=classroom();
 if(pupil)return {mode:'classroom',cls:ownClass(pupil)||8};
 if(free())return null;
 if(route()==='independent')return {mode:'learning',a1:learningA1()};
 const st=window.dmProgression?.status?.(),sp=st?.startPath;
 if(!st||!sp){const own=ownClass(who());return own?{mode:'school',cls:own,unit:999,loading:true}:null;}
 const start=Math.min(8,Math.max(1,Number(sp.startGrade)||ownClass(who())||1));
 const done=new Set((st.done||[]).map(Number)),stops=[...new Set((st.units||[]).flat().map(Number))].filter(n=>n>=200000&&C(n)>=1&&C(n)<=8).sort((a,b)=>a-b);
 if(!stops.length)return {mode:'school',cls:start,unit:999};
 let pos=stops.find(n=>C(n)>=start&&!done.has(n))||0;
 const furthest=Math.max(0,...[...done].filter(n=>n>=200000&&C(n)>=start&&C(n)<=8));
 if(furthest>pos)pos=furthest;
 if(!pos)return {mode:'school',cls:start,unit:1};
 return {mode:'school',cls:C(pos),unit:U(pos)};
}

/* '' = açık, aksi halde kısa Türkçe açıklama. */
function reason(classNo,unitNo){
 const r=rule(),c=Number(classNo),u=Number(unitNo)||0;
 if(!r||!Number.isInteger(c)||c<1)return '';
 if(r.mode==='classroom')return c>r.cls?'🔒 '+c+'. sınıf bu öğrencinin sınıfının ('+r.cls+'. sınıf) üstünde.':'';
 if(r.mode==='learning')return c>=8&&!r.a1?'🔒 8. sınıf, Öğrenme Yolu’nda A1 parkurunu bitirince açılır.':'';
 if(c>r.cls)return '🔒 '+c+'. sınıf, parkurda '+c+'. sınıfa gelince açılır. Şu an '+r.cls+'. sınıftasın.';
 if(c===r.cls&&u>r.unit)return '🔒 '+u+'. ünite, parkurda bu üniteye gelince açılır. Şu an '+r.unit+'. ünitedesin.';
 return '';
}

/* --- Minik açıklama --- */
let tip=null,tipTimer=0;
function showTip(el,text){
 if(!text)return;
 if(!tip){tip=document.createElement('div');tip.className='dm-lock-tip';tip.setAttribute('role','status');tip.setAttribute('aria-live','polite');document.body.append(tip);}
 tip.textContent=text;tip.hidden=false;
 const r=el.getBoundingClientRect(),w=Math.min(260,innerWidth-16);
 tip.style.width=w+'px';
 tip.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';
 const below=r.bottom+6,above=r.top-6;
 tip.style.top=(below+44<innerHeight?below:Math.max(8,above-44))+'px';
 clearTimeout(tipTimer);tipTimer=setTimeout(()=>{if(tip)tip.hidden=true;},2800);
}
function mark(el,why){
 el.classList.toggle('dm-game-locked',!!why);
 if(why){if(el.dataset.dmLock!==why){el.dataset.dmLock=why;el.setAttribute('aria-disabled','true');el.title=why.replace('🔒 ','');el.dataset.dmLockTitle='1';}}
 else if(el.dataset.dmLock!==undefined){delete el.dataset.dmLock;el.removeAttribute('aria-disabled');if(el.dataset.dmLockTitle){el.removeAttribute('title');delete el.dataset.dmLockTitle;}}
}
document.addEventListener('click',e=>{
 const el=e.target.closest?.('.dm-game-locked');if(!el)return;
 e.preventDefault();e.stopImmediatePropagation();showTip(el,el.dataset.dmLock||'🔒 Kilitli');
},true);
['pointerdown','touchstart'].forEach(t=>document.addEventListener(t,e=>{if(e.target.closest?.('.dm-game-locked'))e.stopImmediatePropagation();},true));

/* --- Sınıf düğmeleri (eski oyunlar, Harf Bahçesi, Kulak Dedektifi, Cümle Ustası) --- */
const gridCalls=new Map();
const btnClass=(b,i)=>Number(b.dataset.class)||Number(String(b.textContent).match(/\d+/)?.[0])||i+1;
function applyGrid(gridId,setFn,updateFn,keepSelection){
 const grid=document.getElementById(gridId);if(!grid)return;
 const buttons=[...grid.querySelectorAll('.sinif-btn')];let pick=0,active=0;
 buttons.forEach((b,i)=>{const c=btnClass(b,i),why=reason(c);b.disabled=false;b.style.opacity='';b.style.cursor='';mark(b,why);if(!why)pick=Math.max(pick,c);if(b.classList.contains('active')&&!why)active=c;});
 if(keepSelection&&active)return;
 const chosen=pick||btnClass(buttons[0]||{dataset:{}},0);
 buttons.forEach((b,i)=>b.classList.toggle('active',btnClass(b,i)===chosen));
 try{setFn?.(chosen);}catch(_){}
 try{updateFn?.(chosen);}catch(_){}
}
window.sinifGridKisitlamaUygula=function(gridId,setFn,updateFn){gridCalls.set(gridId,[setFn,updateFn]);applyGrid(gridId,setFn,updateFn,false);};

/* --- Ünite çipleri --- */
const chipUnit=(chip,i)=>Number(String(chip.textContent).match(/\d+/)?.[0])||i+1;
function lockChips(box,classNo,sync){
 if(!box)return;box.dataset.dmClass=classNo;
 let changed=false;
 box.querySelectorAll('.unite-chip').forEach((chip,i)=>{const why=reason(classNo,chipUnit(chip,i));mark(chip,why);if(why&&chip.classList.contains('selected')){chip.classList.remove('selected');changed=true;}});
 if(changed&&!box.querySelector('.unite-chip.selected')){const first=box.querySelector('.unite-chip:not(.dm-game-locked)');first?.classList.add('selected');}
 if(changed)try{sync?.();}catch(_){}
}
const selectedUnits=box=>[...box.querySelectorAll('.unite-chip')].map((c,i)=>c.classList.contains('selected')?chipUnit(c,i):0).filter(Boolean);
function wrap(name,boxOf,syncOf){
 const original=window[name];if(typeof original!=='function'||original.dmAccessWrapped)return;
 const wrapped=function(sinif,...rest){const result=original.apply(this,[sinif,...rest]);try{const box=document.getElementById(boxOf(rest));lockChips(box,Number(sinif),()=>syncOf(rest,box));}catch(_){}return result;};
 wrapped.dmAccessWrapped=true;window[name]=wrapped;
}
function install(){
 wrap('genericSinifGuncelle',r=>r[0],(r,box)=>r[1]?.(selectedUnits(box)));
 wrap('kySinifGuncelle',()=>'kyUniteBox',()=>window.kyUniteSecimleriniGuncelle?.());
 wrap('jpSinifGuncelle',()=>'jpUniteBox',()=>window.jpUniteSecimleriniGuncelle?.());
 wrap('boslukSinifGuncelle',()=>'boslukUniteBox',()=>window.boslukUniteSecimGuncelle?.());
}

/* --- Açılır listeli oyunlar (Göktaşı, Papi Kartları, Kelime Çarkı) ve Kelime Rallisi --- */
const selectPairs=[['#mtGrade','#mtUnit'],['#pcGrade','#pcUnit'],['#wwGrade','#wwUnit']];
function note(select,text){
 const host=select.closest('label')||select;let el=host.nextElementSibling;
 if(!el?.classList.contains('dm-lock-note')){if(!text)return;el=document.createElement('small');el.className='dm-lock-note';host.after(el);}
 if(el.textContent!==text)el.textContent=text;if(el.hidden!==!text)el.hidden=!text;
}
function lockOptions(select,whyOf){
 let firstReason='',best=null,current=select.selectedOptions?.[0]||null;
 for(const o of select.options){
  const why=whyOf(Number(o.value));o.disabled=!!why;
  const label=o.textContent.replace(/ 🔒$/,''),text=why?label+' 🔒':label;if(o.textContent!==text)o.textContent=text;
  if(why&&!firstReason)firstReason=why;if(!why)best=o;
 }
 note(select,firstReason?'🔒 işaretliler kilitli · '+firstReason.replace('🔒 ',''):'');
 if(current?.disabled&&best&&select.value!==best.value){select.value=best.value;select.dispatchEvent(new Event('change',{bubbles:true}));return true;}
 return false;
}
function scan(){
 for(const [g,u] of selectPairs){
  const grade=document.querySelector(g);if(!grade||!grade.options.length)continue;
  if(lockOptions(grade,c=>reason(c)))continue;
  const unit=document.querySelector(u);if(unit&&unit.options.length)lockOptions(unit,n=>reason(grade.value,n));
 }
 const rally=document.querySelector('#rallyGame select[data-class]');
 if(rally){lockOptions(rally,c=>reason(c));
  document.querySelectorAll('#rallyGame .rr-units [data-unit]').forEach(b=>mark(b,reason(rally.value,Number(b.dataset.unit))));}
 document.querySelectorAll('.unite-secim-box[data-dm-class]').forEach(box=>lockChips(box,Number(box.dataset.dmClass)));
}
function refresh(){
 for(const [id,[setFn,updateFn]] of gridCalls){const grid=document.getElementById(id);if(grid?.isConnected&&grid.getClientRects().length)applyGrid(id,setFn,updateFn,true);}
 scan();
}
let frame=0;const later=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;scan();});};
new MutationObserver(m=>{if(m.some(x=>x.addedNodes.length))later();}).observe(document.body,{childList:true,subtree:true});
for(const ev of ['dm:progression-status','dm:login','dm:state','dm:learning-progress'])document.addEventListener(ev,()=>{if(ev==='dm:login')a1={owner:'',done:null,busy:false};refresh();});
install();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
const style=document.createElement('style');style.textContent='.dm-game-locked{opacity:.42!important;filter:grayscale(.6);cursor:not-allowed!important;position:relative}.dm-game-locked::after{content:"🔒";font-size:.7em;margin-left:3px}.dm-lock-tip{position:fixed;z-index:2147483646;padding:6px 10px;border-radius:10px;background:#1f2a44;color:#fff;font:700 11.5px/1.35 Nunito,system-ui,sans-serif;box-shadow:0 6px 18px #0004;pointer-events:none;text-align:center}.dm-lock-note{display:block;margin:3px 0 0;font-size:11px;font-weight:700;line-height:1.3;color:#7c5a12;text-align:left}';document.head.append(style);
window.dmGameAccess={rule,reason,refresh};
})();
