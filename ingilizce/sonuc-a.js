/* [12 Kas 2026] Sonuç ekranı · tasarım A düzeni (görünüm: sonuc-a.css).
   XP / ALTIN (game-feedback.js #dmRewardCards) ve DOĞRULUK kutucuğunu tek sıraya alır, yıldızları ve
   süre satırını ekler, iyi sonuçta konfeti yağdırır. Papi'nin duygusu game-feedback.js (DMPapi.resultMood) ile sonuca göre gelir.
   Ödül, puan, sıralama ve buton davranışları değişmez. */
(()=>{
 'use strict';
 if(window.dmSonucA)return;
 let last={};
 const $=s=>document.querySelector(s);
 function pct(){const t=$('#gsoDogruluk')?.textContent||'';const n=parseInt(t.replace(/\D/g,''),10);return Number.isFinite(n)?n:null;}
 function starCount(p){const y=Number(last.parkurYildiz);if(Number.isInteger(y)&&y>=0&&y<=3)return y;if(p==null)return 0;return p>=90?3:p>=60?2:p>0?1:0;}
 function arrange(){
  const ov=$('#genelSonucOverlay'),kart=ov?.querySelector('.gso-kart');if(!kart)return;
  const alt=kart.querySelector('.gso-alt'),maskot=kart.querySelector('.gso-maskot');
  let row=kart.querySelector(':scope>.sa-row');
  if(!row){row=document.createElement('div');row.className='sa-row';(alt||maskot)?.after(row);}
  const xp=document.getElementById('dmRewardCards');
  if(xp&&xp.parentElement!==row)row.prepend(xp);
  const acc=document.getElementById('gsoDogruluk')?.closest('.gso-istat-kart');
  if(acc&&acc.parentElement!==row)row.append(acc);
  if(acc&&row.lastElementChild!==acc)row.append(acc);
  let meta=kart.querySelector(':scope>.sa-meta');
  if(!meta){meta=document.createElement('p');meta.className='sa-meta';}
  if(meta.previousElementSibling!==row)row.after(meta);
  const sure=$('#gsoSure')?.textContent?.trim(),puan=$('#gsoPuan')?.textContent?.trim();
  const d=Number(last.dogru),y=Number(last.yanlis),tot=d+y;
  const bits=[];if(sure&&sure!=='—'&&sure!=='0:00')bits.push('⏱ '+sure);if(tot>0)bits.push('✓ '+d+'/'+tot+' doğru');if(puan&&puan!=='0')bits.push(puan+' puan');
  const txt=bits.join(' · ');if(meta.textContent!==txt)meta.textContent=txt;meta.hidden=!txt;
  let stars=kart.querySelector(':scope>.sa-stars');
  if(!stars){stars=document.createElement('div');stars.className='sa-stars';stars.setAttribute('role','img');}
  if(maskot&&stars.previousElementSibling!==maskot)maskot.after(stars);
  const p=pct(),n=starCount(p),key=String(n);
  if(stars.dataset.n!==key){stars.dataset.n=key;stars.setAttribute('aria-label',n+' yıldız');stars.innerHTML=[0,1,2].map(i=>'<i class="'+(i<n?'':'off')+'">⭐</i>').join('');}
  const low=last.parkurGecti===false||(p!=null&&p<60);
  ov.classList.toggle('sa-low',low);
  let conf=kart.querySelector(':scope>.sa-confetti');
  if(!low&&p!=null&&p>=80){
   if(!conf){conf=document.createElement('div');conf.className='sa-confetti';conf.setAttribute('aria-hidden','true');const cols=['#FFC531','#FF5C8A','#2DB66B','#2F86EB','#7B4DFF','#FF9F1C'];conf.innerHTML=Array.from({length:16},(_,i)=>'<i style="left:'+((i*37)%100)+'%;background:'+cols[i%6]+';animation-duration:'+(2.6+(i%4)*.45)+'s;animation-delay:-'+((i*.41)%3).toFixed(2)+'s"></i>').join('');kart.prepend(conf);}
  }else conf?.remove();
 }
 let q=0;const schedule=()=>{if(!q)q=requestAnimationFrame(()=>{q=0;try{arrange();}catch{}});};
 function wrap(){
  const fn=window.genelSonucEkraniGoster;if(typeof fn!=='function'||fn.dmSonucA)return;
  const w=function(o){last=o||{};const r=fn.apply(this,arguments);schedule();setTimeout(schedule,60);return r;};
  w.dmSonucA=true;window.genelSonucEkraniGoster=w;
 }
 function start(){
  wrap();setTimeout(wrap,0);setTimeout(wrap,1500);
  const kart=$('#genelSonucOverlay .gso-kart');
  if(kart)new MutationObserver(schedule).observe(kart,{childList:true});
  ['gsoDogruluk','gsoSure','gsoPuan'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(schedule).observe(el,{childList:true,characterData:true,subtree:true});});
 }
 if(document.readyState==='complete')start();else addEventListener('load',start,{once:true});
 window.dmSonucA={arrange,showSaved(o){last=o||{};window.dmShowSavedResult(o);arrange();schedule();}};
})();
