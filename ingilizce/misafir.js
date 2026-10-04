(function(){'use strict';
 const $=id=>document.getElementById(id),api='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
 let device,deadline=0,started=false,expired=false,words=[],round=null;
 try{device=localStorage.getItem('dm_guest_device');if(!/^[a-f0-9-]{36}$/i.test(device||'')){device=crypto.randomUUID();localStorage.setItem('dm_guest_device',device);}}catch(e){device=crypto.randomUUID();}
 $('unit').innerHTML=Array.from({length:10},(_,i)=>`<option value="${i+1}">${i+1}. Ünite</option>`).join('');
 const shuffle=a=>a.slice().sort(()=>Math.random()-.5);
 const screen=id=>['welcome','lobby','game'].forEach(k=>$(k).hidden=k!==id);
 function finish(){if(expired)return;expired=true;round=null;document.querySelector('header').inert=true;document.querySelector('main').inert=true;try{speechSynthesis.cancel();}catch(e){}$('clock').textContent='Denemen tamamlandı';$('invitation').hidden=false;$('game').hidden=true;$('lobby').hidden=true;$('welcome').hidden=true;$('register').focus();}
 function alive(){if(expired)return false;if(started&&performance.now()>=deadline){finish();return false;}return true;}
 function timing(d){const left=Date.parse(d.expiresAt)-Date.parse(d.serverNow);deadline=Math.min(deadline||Infinity,performance.now()+Math.max(0,left));started=true;if(left<=0)finish();}
 async function request(op,extra={}){const res=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:op,device,...extra})});const d=await res.json();if(res.status===410){finish();return null;}if(!res.ok||!d.ok)throw Error(d.mesaj||'Bağlantı kurulamadı. Yeniden dene.');timing(d);return d;}
 async function enter(){if(!alive())return;$('begin').disabled=true;$('message').textContent='';try{if(!started)await request('misafirBaslat');if(!alive())return;const d=await request('misafirIcerik',{sinif:+$('grade').value,unite:+$('unit').value});if(!d||!alive())return;words=d.words;if(words.length<8)throw Error('Bu ünitede denemeye uygun 8 kelime henüz yok. Başka bir sınıf veya ünite seç.');$('selection').textContent=$('grade').value+'. Sınıf · '+$('unit').value+'. Ünite';screen('lobby');}catch(e){$('message').textContent=e.message;}finally{$('begin').disabled=false;}}
 $('begin').onclick=enter;$('change').onclick=()=>{if(alive())screen('welcome');};$('back').onclick=()=>{if(alive()){round=null;screen('lobby');}};
 const titles={lab:'🚂 Kelime Laboratuvarı',dikte:'🎧 Kulak Dedektifi',eksik:'🧩 Eksik Harf'};
 document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>{if(!alive())return;round={type:b.dataset.game,items:shuffle(words).slice(0,8),index:0,correct:0,wrong:0,base:0,combo:0,bonuses:{},start:performance.now()};screen('game');render();});
 function speak(word){try{const u=new SpeechSynthesisUtterance(word);u.lang='en-US';u.rate=.8;speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){$('feedback').textContent='Bu cihazda ses açılamadı. Eksik Harf veya Kelime Laboratuvarı’nı deneyebilirsin.';}}
 function score(){return DijiScoreRules.calculate({base:round.base,correct:round.correct,wrong:round.wrong,seconds:(performance.now()-round.start)/1000});}
 function render(){if(!alive()||!round)return;$('gameTitle').textContent=titles[round.type];$('feedback').textContent='';$('answers').replaceChildren();$('next').hidden=true;round.answered=false;
 if(round.index>=round.items.length){const s=score();$('prompt').textContent='Harika bir ilk keşif!';$('questionNumber').textContent='Tur tamamlandı';$('roundClock').textContent=s.sure.toFixed(1)+' saniye';$('feedback').textContent=`${s.dogru} doğru · ${s.yanlis} yanlış · ${s.puan} deneme puanı. Üye olduğunda ilerlemeni hesabında biriktirebilirsin!`;round=null;return;}
 const word=round.items[round.index];$('questionNumber').textContent=(round.index+1)+'/8 soru';
 if(round.type==='lab'){$('prompt').textContent=word.en;const choices=shuffle([word.tr,...shuffle([...new Set(words.filter(w=>w.tr!==word.tr).map(w=>w.tr))]).slice(0,3)]);for(const label of choices){const b=document.createElement('button');b.textContent=label;b.onclick=()=>answer(label===word.tr);$('answers').append(b);}}
 else{$('prompt').textContent=round.type==='dikte'?'Dinle, İngilizce kelimeyi yaz':word.tr+' → '+word.en[0]+'_'.repeat(Math.max(1,word.en.length-2))+word.en.at(-1);if(round.type==='dikte'){const b=document.createElement('button');b.textContent='🔊 Kelimeyi dinle';b.onclick=()=>{if(alive())speak(word.en);};$('answers').append(b);}
 const input=document.createElement('input');input.id='demoAnswer';input.placeholder='İngilizce kelimenin tamamını yaz';input.autocomplete='off';input.setAttribute('aria-label','İngilizce kelime');const b=document.createElement('button');b.textContent='Kontrol et';const submit=()=>answer(input.value.trim().toLowerCase()===word.en.toLowerCase());b.onclick=submit;input.onkeydown=e=>{if(e.key==='Enter')submit();};$('answers').append(input,b);input.focus();}
 }
 function answer(good){if(!alive()||!round||round.answered)return;round.answered=true;const w=round.items[round.index];if(good){round.correct++;round.base+=100;round.combo++;const bonus={3:50,5:50,8:100}[round.combo];if(bonus&&!round.bonuses[round.combo]){round.base+=bonus;round.bonuses[round.combo]=true;}}else{round.wrong++;round.combo=0;}$('answers').querySelectorAll('button,input').forEach(b=>b.disabled=true);$('feedback').textContent=good?'Doğru! Papi seninle gurur duyuyor ✨':'Birlikte öğreniyoruz! Doğrusu: '+w.en+' → '+w.tr;$('next').hidden=false;$('next').focus();}
 $('next').onclick=()=>{if(alive()&&round&&round.answered){round.index++;render();}};
 setInterval(()=>{if(!started||!alive())return;const left=Math.max(0,Math.ceil((deadline-performance.now())/1000));$('clock').textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0')+' deneme';if(round)$('roundClock').textContent=((performance.now()-round.start)/1000).toFixed(1)+' sn · '+score().puan+' puan';},250);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)alive();});
 // An existing browser preview resumes the original server deadline; refreshing never grants ten new minutes.
 try{if(localStorage.getItem('dm_guest_started')){request('misafirBaslat').catch(e=>{$('message').textContent=e.message;});}}catch(e){}
 const first=$('begin').onclick;$('begin').onclick=async()=>{try{localStorage.setItem('dm_guest_started','1');}catch(e){}await first();};
 window.dmGuestPreview={alive,finish};
})();
