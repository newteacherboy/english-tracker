(function(){'use strict';
 const $=id=>document.getElementById(id),p=new URLSearchParams(location.search),cl=Number(p.get('sinif')),unit=Number(p.get('unite')),level=Number(p.get('seviye'));
 let words=[],mode=level%3===2?'sec':level%3===0?'yaz':'kart',index=0,revealed=false,answered=false,correct=0,wrong=0;
 const started=Date.now(),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 try{if(parent===window)throw Error();words=parent.masterKelimeHavuzu.filter(w=>Number(w.sinif)===cl&&Number(w.unite)===unit&&w.ingilizce&&w.turkce).map(w=>({en:String(w.ingilizce),tr:String(w.turkce)}));}catch(e){$('card').textContent='Bu etkinliği Diji-Medu içindeki kelime kartlarından açabilirsin.';return;}
 words=words.filter((w,i,a)=>a.findIndex(v=>v.en===w.en)===i);if(!words.length){$('card').textContent='Bu sınıf ve ünite için henüz kelime eklenmemiş.';return;}
 const allowed=()=>!parent.dmGuestPlatform||parent.dmGuestPlatform.alive();
 function speak(){if(!allowed())return;if(!('speechSynthesis'in window)){$('status').textContent='Bu cihazda sesli okuma desteklenmiyor. Kartın yazılı hâlini inceleyebilirsin.';return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(words[index].en);u.lang='en-GB';u.rate=.85;speechSynthesis.speak(u);}
 function next(){if(!allowed())return;index=(index+1)%words.length;revealed=false;answered=false;$('status').textContent='';draw();}
 function answer(ok){if(answered||!allowed())return;answered=true;ok?correct++:wrong++;$('status').textContent=ok?'Harika! Doğru anlamı buldun.':'Bir daha incele: '+words[index].en+' = '+words[index].tr;draw();}
 function draw(){if(!allowed())return;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));const w=words[index];
  let body='<small>'+(index+1)+' / '+words.length+'</small>';
  if(mode==='kart')body+='<h2>'+esc(w.en)+'</h2><p>'+(revealed?esc(w.tr):'Anlamını düşün, sonra kartı çevir.')+'</p><button data-flip>Kartı çevir</button>';
  if(mode==='sec'){let answers=[w.tr,...words.filter(v=>v.tr!==w.tr).map(v=>v.tr)];answers=[...new Set(answers)].slice(0,4);answers.sort(()=>Math.random()-.5);body+='<h2>'+esc(w.en)+'</h2><div class="choices">'+answers.map(a=>'<button data-answer="'+esc(a)+'" '+(answered?'disabled':'')+'>'+esc(a)+'</button>').join('')+'</div>';}
  if(mode==='yaz')body+='<h2>'+esc(w.tr)+'</h2><p>İngilizcesini yaz.</p><input id="answer" aria-label="İngilizce cevap" autocomplete="off" autocapitalize="none" spellcheck="false" '+(answered?'disabled':'')+'><div class="actions"><button data-check '+(answered?'disabled':'')+'>Kontrol et</button></div>';
  body+='<div class="actions"><button data-speak>🔊 Dinle</button><button data-next>Sonraki kelime →</button></div>';$('card').innerHTML=body;
  $('card').querySelector('[data-flip]')?.addEventListener('click',()=>{revealed=!revealed;draw();});$('card').querySelector('[data-speak]').onclick=speak;$('card').querySelector('[data-next]').onclick=next;
  $('card').querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>answer(b.dataset.answer===w.tr));const check=()=>{const typed=$('answer').value.trim();if(!typed){$('status').textContent='Önce cevabını yaz.';return;}answer(typed.toLowerCase()===w.en.toLowerCase());};$('card').querySelector('[data-check]')?.addEventListener('click',check);$('answer')?.addEventListener('keydown',e=>{if(e.key==='Enter')check();});
 }
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;revealed=false;answered=false;$('status').textContent='';draw();});
 const timer=setInterval(()=>{if(!allowed()){clearInterval(timer);window.speechSynthesis?.cancel();$('card').textContent='10 dakikalık denemen tamamlandı. Diji-Medu üyeliğiyle devam edebilirsin.';document.querySelectorAll('button').forEach(b=>b.disabled=true);return;}$('meta').textContent=cl+'. sınıf · '+unit+'. ünite · '+Math.floor((Date.now()-started)/1000)+' saniye · '+correct+' doğru / '+wrong+' yanlış';},1000);
 addEventListener('pagehide',()=>{clearInterval(timer);window.speechSynthesis?.cancel();});draw();
})();
