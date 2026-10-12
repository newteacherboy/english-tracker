/* Diji-Medu Parkur v2: independent progress, never modifies existing economy/parkur records. */
(()=>{'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'').trim();
const pool=()=>Array.isArray(window.masterKelimeHavuzu)?window.masterKelimeHavuzu:[];
const en=w=>String(w.en??w.ingilizce??w.english??w.word??'').trim(),tr=w=>String(w.tr??w.turkce??w.turkcesi??w.meaning??'').trim();
const grade=w=>Number(w.sinif??w.class_level??w.grade),unit=w=>Number(w.unite??w.unit);
const key=()=> 'dm-new-parkur-v2:'+who().toLocaleLowerCase('tr');
const load=()=>{try{return JSON.parse(localStorage.getItem(key())||'{}')}catch{return {}}};
const save=x=>{try{localStorage.setItem(key(),JSON.stringify(x))}catch{}};
let selected=null,question=0,answered=false,score=0,entries=[],busy=false;
function chapters(){
 const groups=new Map();for(const w of pool()){const g=grade(w),u=unit(w),e=en(w),t=tr(w);if(!(g>=1&&g<=8&&u>=1&&e&&t))continue;const k=g+'-'+u;if(!groups.has(k))groups.set(k,{g,u,words:[],seen:new Set()});const v=groups.get(k),id=e.toLocaleLowerCase('tr');if(!v.seen.has(id)){v.words.push({en:e,tr:t});v.seen.add(id);}}
 return [...groups.values()].sort((a,b)=>a.g-b.g||a.u-b.u).flatMap(v=>Array.from({length:Math.ceil(v.words.length/3)},(_,i)=>({id:v.g+'-'+v.u+'-'+i,g:v.g,u:v.u,part:i+1,parts:Math.ceil(v.words.length/3),words:v.words.slice(i*3,(i+1)*3)})));
}
function title(s){const names=['İlk Adımlar','Kelime Bahçesi','Keşif Yolu','Bilgi Köprüsü','Renkli Macera','Yeni Ufuklar','Başarı Yolu','Papi ile Öğren'];return names[(s.u-1)%names.length];}
const state=()=>{const steps=chapters(),done=load().done||{},first=steps.findIndex(x=>!done[x.id]);return {steps,done,index:first<0?steps.length:first};};
function wallet(){const y=typeof yo!=='undefined'?yo:{};const xp=Number(y?.lig?.xp??y?.xp??0),gold=Number(y?.altin??0),energy=typeof genelEnerjiKalan!=='undefined'?genelEnerjiKalan:'–';return '<div class="dmp-wallet"><span>⚡ '+esc(energy)+'</span><span>⭐ '+esc(xp)+'</span><span>🪙 '+esc(gold)+'</span></div>';}
function header(s){return '<header class="dmp-head"><img src="route-assets/papi-school.png" alt="Papi" onerror="this.style.display=\'none\'">'+wallet()+'</header><div class="dmp-heading"><small>'+s.g+'. Sınıf • '+s.u+'. Ünite</small><h2>'+title(s)+'</h2><span>Seviye '+s.part+' / '+s.parts+' · 9 soru</span></div>';}
function home(){
 const host=$('#dmNewParkur');if(!host)return;const {steps,done,index}=state(),current=steps[Math.min(index,steps.length-1)];
 if(!steps.length){host.innerHTML='<header class="dmp-head"><b>🦜 Parkur</b></header><div class="dmp-empty">Kelime havuzu hazırlanıyor. Bağlantı tamamlanınca sınıf ve ünite seviyeleri burada açılacak.</div>';return;}
 const earlier=Math.max(0,index-1),visible=steps.slice(earlier,earlier+Math.max(4,Math.min(8,steps.length-earlier)));
 host.innerHTML=header(current)+'<div class="dmp-map"><div class="dmp-trail"></div>'+visible.map((s,i)=>{const completed=!!done[s.id],unlocked=steps.indexOf(s)<=index,active=!completed&&unlocked;return '<div class="dmp-stop '+(completed?'is-done':active?'is-active':'is-locked')+'" style="--side:'+(i%2===0?'24%':'76%')+'"><button type="button" data-level="'+esc(s.id)+'" '+(!unlocked?'disabled':'')+' aria-label="'+esc(s.g+'. sınıf '+s.u+'. ünite seviye '+s.part)+'">'+(completed?'✓':active?'▶':'🔒')+'</button><div class="dmp-stop-label"><b>'+esc(s.g+'. Sınıf · '+s.u+'. Ünite')+'</b><span>'+esc(title(s))+' · '+s.part+'/'+s.parts+'</span></div></div>'}).join('')+'</div><p class="dmp-hint">Her seviyede 3 kelime, her kelime için 3 farklı soru.</p>';
 host.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>start(b.dataset.level));
}
function shuffle(x){return [...x].sort(()=>Math.random()-.5)}
function generate(s){const words=Array.from({length:3},(_,i)=>s.words[i%s.words.length]);return words.flatMap(w=>[{w,type:'en-tr'},{w,type:'tr-en'},{w,type:'write'}]);}
function choices(right,others){return shuffle([right,...shuffle([...new Set(others.filter(x=>x!==right))]).slice(0,3)]);}
function start(id){const {steps,done,index}=state(),idx=steps.findIndex(x=>x.id===id);if(idx<0||idx>index)return;selected=steps[idx];question=0;score=0;answered=false;entries=generate(selected);drawQuestion();}
function drawQuestion(){const host=$('#dmNewParkur');if(!host||!selected)return;const q=entries[question];if(!q){finish();return;}answered=false;
 const all=chapters().filter(x=>x.g===selected.g).flatMap(x=>x.words),t=q.type,right=t==='en-tr'?q.w.tr:q.w.en;
 const variants=t==='en-tr'?all.map(w=>w.tr):all.map(w=>w.en);
 const label=t==='en-tr'?'Bu kelimenin Türkçesi nedir?':t==='tr-en'?'İngilizce karşılığını seç:':'İngilizce kelimeyi yaz:';
 host.innerHTML='<div class="dmp-quiz"><div class="dmp-quiz-top"><button type="button" data-back>← Parkur</button><b>'+(question+1)+' / 9</b></div><div class="dmp-progress"><span style="width:'+((question+1)/9*100)+'%"></span></div><div class="dmp-question"><small>'+esc(label)+'</small><h2>'+esc(t==='en-tr'?q.w.en:q.w.tr)+'</h2></div><div class="dmp-answers">'+(t==='write'?'<input data-write autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="İngilizce kelime" aria-label="Cevabın"><button class="dmp-check" data-submit>Kontrol et</button>':choices(right,variants).map(v=>'<button data-answer="'+esc(v)+'">'+esc(v)+'</button>').join(''))+'</div><div class="dmp-feedback" role="status"></div><button class="dmp-next" hidden>Devam et →</button></div>';
 host.querySelector('[data-back]').onclick=()=>{selected=null;home();};
 host.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>answer(b.dataset.answer));
 host.querySelector('[data-submit]')?.addEventListener('click',()=>answer(host.querySelector('[data-write]').value));
 host.querySelector('[data-write]')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();answer(e.target.value)}});
 host.querySelector('.dmp-next').onclick=()=>{question++;drawQuestion();};
}
function answer(value){if(answered)return;const q=entries[question],correct=q.type==='en-tr'?q.w.tr:q.w.en;const norm=x=>String(x).trim().toLocaleLowerCase('tr');const ok=norm(value)===norm(correct);answered=true;if(ok)score++;const host=$('#dmNewParkur');host.querySelectorAll('[data-answer],[data-submit],[data-write]').forEach(b=>{b.disabled=true;if(b.dataset.answer)b.classList.add(norm(b.dataset.answer)===norm(correct)?'right':norm(b.dataset.answer)===norm(value)?'wrong':'');});host.querySelector('.dmp-feedback').textContent=ok?'✅ Harika, doğru cevap!':'Doğru cevap: '+correct;const next=host.querySelector('.dmp-next');next.hidden=false;next.textContent=question===8?'Sonucu gör →':'Devam et →';}
function finish(){const host=$('#dmNewParkur'),s=selected;if(!host||!s)return;const passed=score>=6;const history=load();if(passed){history.done={...(history.done||{}),[s.id]:true};save(history)}host.innerHTML='<div class="dmp-finish"><div class="dmp-medal">'+(passed?'🏆':'🦜')+'</div><h2>'+(passed?'Seviyeyi tamamladın!':'Bir kez daha deneyelim!')+'</h2><p>9 sorudan '+score+' doğru</p><small>'+(passed?'Sonraki seviye açıldı.':'Geçmek için en az 6 doğru cevap gerekiyor.')+'</small><button data-home>Parkura dön</button></div>';host.querySelector('[data-home]').onclick=()=>{selected=null;home()};}
window.dmNewParkurOpen=function(){const host=$('#dmNewParkur');if(!host)return false;document.querySelectorAll('#panel-alani [id^="tab-"]').forEach(x=>{x.classList.remove('active');});document.querySelectorAll('#bottomNavMobile [data-ekran]').forEach(b=>b.classList.toggle('active',b.dataset.ekran==='tab-dunya'));document.body.classList.add('dm-new-parkur-open');host.hidden=false;host.classList.add('active');home();return true;};
window.dmNewParkurClose=function(){const host=$('#dmNewParkur');if(host){host.hidden=true;host.classList.remove('active');}document.body.classList.remove('dm-new-parkur-open');selected=null;};
function boot(){if($('#dmNewParkur'))return;const panel=document.getElementById('panel-alani');if(!panel)return;const host=document.createElement('section');host.id='dmNewParkur';host.hidden=true;host.setAttribute('aria-label','Parkur');panel.append(host);}
boot();document.addEventListener('dm:login',()=>{boot();if($('#dmNewParkur')?.classList.contains('active'))home()});
document.addEventListener('dm:state',()=>{if($('#dmNewParkur')?.classList.contains('active')&&!selected)home()});
window.dmNewParkur={chapters,open:window.dmNewParkurOpen,home};})();