(function(){
 'use strict';
 const $=id=>document.getElementById(id),visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
 const safeStore=(k,v)=>{try{localStorage.setItem(k,v);}catch{}};
 const read=k=>{try{return localStorage.getItem(k);}catch{return null;}};
 const who=()=>{try{return typeof aktifOgrenciAdi!=='undefined'?aktifOgrenciAdi:read('ing_aktifOgrenci')||'';}catch{return '';}};
 const logged=()=>visible($('panel-alani'))&&!!who();
 const wrap=(name,fn)=>{const old=window[name];if(typeof old!=='function')return;window[name]=function(...args){return fn.call(this,old,args);};};
 /* One presentation-only check per successful answer; no score/reward changes. */
 let lastTick=0,tickTimer;
 function correct(){
  if(Date.now()-lastTick<260||document.hidden)return;lastTick=Date.now();
  let e=$('dmCorrectTick');if(!e){e=document.createElement('div');e.id='dmCorrectTick';e.className='dm-correct-tick';e.setAttribute('role','status');e.setAttribute('aria-label','Doğru cevap');e.innerHTML='<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="35"/><path d="M23 40l12 12 23-25"/></svg>';document.body.append(e);}
  e.classList.remove('show');void e.offsetWidth;e.classList.add('show');clearTimeout(tickTimer);tickTimer=setTimeout(()=>e.remove(),780);
 }
 window.dmCorrectAnswer=correct;
 wrap('genelSesEfektiCal',function(old,a){if(a[0]==='dogru')correct();return old.apply(this,a);});
 wrap('hafizaSesCal',function(old,a){if(a[0]===true)correct();return old.apply(this,a);});
 if(window.OC){const old=OC.dogru;OC.dogru=function(...a){const before=OC.puan();const r=old.apply(this,a);if(OC.puan()>before)correct();return r;};}
 wrap('dyCevapVer',function(old,a){const before=typeof dyDogruSayisi!=='undefined'?dyDogruSayisi:0;const r=old.apply(this,a);if(typeof dyDogruSayisi!=='undefined'&&dyDogruSayisi>before)correct();return r;});
 wrap('dcQuizCevapVer',function(old,a){const before=typeof dcQuizDogruSayisi!=='undefined'?dcQuizDogruSayisi:0;const r=old.apply(this,a);if(typeof dcQuizDogruSayisi!=='undefined'&&dcQuizDogruSayisi>before)correct();return r;});
 /* Original melody generated with Web Audio, no remote media or new dependencies. */
 const PLAY='#bzAlan,#baOyunEkrani,#kpKelimeOyunEkrani,#kmPanel .km-sec,#seviyeDisLinkOverlay,#dmStoryLesson .ds-task,.game-modal-overlay [id$="OyunEkrani"],#wordWheel,#papiCards,#harfBahcesiOverlay .hb-grid';
 const playing=()=>[...document.querySelectorAll(PLAY)].some(visible);
 let audio,master,notes=[],noteTimer,musicOn=read('dm_parkur_music')!=='off',gesture=false,bar=0;
 function stop(){clearInterval(noteTimer);noteTimer=null;notes.forEach(n=>{try{n.stop();}catch{}});notes=[];if(audio?.state==='running')audio.suspend().catch(()=>{});}
 function tone(freq,at,length,gain=.018){const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(gain,at+.08);g.gain.exponentialRampToValueAtTime(.0001,at+length);o.connect(g);g.connect(master);o.start(at);o.stop(at+length+.05);notes.push(o);o.onended=()=>{o.disconnect();g.disconnect();notes=notes.filter(n=>n!==o);};}
 function measure(){if(!audio||audio.state!=='running')return;const chords=[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]],c=chords[bar%4],start=audio.currentTime+.05;for(let i=0;i<8;i++){tone(c[i%3]*(i===3?2:1),start+i*.24,.20);if(i===0)tone(c[0]/2,start,.40,.025);}bar++;}
 async function start(){if(!musicOn||!gesture||document.hidden||!playing()||noteTimer)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(!master){master=audio.createGain();master.gain.value=.38;master.connect(audio.destination);}await audio.resume();if(!musicOn||document.hidden||!playing())return stop();measure();noteTimer=setInterval(measure,1920);}catch{}}
 for(const prefix of ['kelime','ky','jp','bosluk','hafiza','yagmur','asmaca','kelimebul','es','tren']){const fn=prefix+'MuzikBaslat';if(typeof window[fn]==='function')window[fn]=()=>{};window[prefix+'MuzikDurdur']?.();}
 const musicButton=document.createElement('button');musicButton.id='dmMusicToggle';musicButton.type='button';musicButton.className='dm-music-toggle';document.body.append(musicButton);
 function musicPaint(){musicButton.textContent=musicOn?'♫ Müzik açık':'♫ Müzik kapalı';musicButton.setAttribute('aria-pressed',String(musicOn));musicButton.setAttribute('aria-label',musicOn?'Parkur müziğini kapat':'Parkur müziğini aç');musicButton.hidden=!playing();}
 musicButton.onclick=()=>{gesture=true;musicOn=!musicOn;safeStore('dm_parkur_music',musicOn?'on':'off');musicPaint();if(musicOn)start();else stop();};
 function unlock(){gesture=true;if(musicOn&&logged()){try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(!master){master=audio.createGain();master.gain.value=.38;master.connect(audio.destination);}audio.resume().catch(()=>{});}catch{}}start();}
 document.addEventListener('pointerdown',unlock,{passive:true});
 document.addEventListener('keydown',unlock,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start();});
 /* The existing island buttons keep their original click handlers and data. */
 function study(){
  const map=$('maHarita');if(map){
   if(!map.querySelector('.dm-study-hero')){const h=document.createElement('header');h.className='dm-study-hero';h.innerHTML='<div><h2>Ders Çalış</h2><p>Her küçük adım,<br>yeni bir keşif.</p></div><img src="papi-welcome-v2.png" alt="Öğrenme arkadaşın Papi"><span class="dm-study-mode">Öğrenme Haritası</span>';map.prepend(h);const old=map.querySelector('.ma-tabela');if(old)old.hidden=true;}
   map.querySelectorAll('.ma-ada').forEach((b,i)=>{if(b.querySelector('.dm-island-art'))return;const art=document.createElement('span');art.className='dm-island-art';art.setAttribute('aria-hidden','true');art.style.backgroundPosition=(i%2)*100+'% '+Math.floor(i/2)*100+'%';b.querySelector('svg')?.replaceWith(art);b.style.setProperty('--island-color',['#e4f9ef','#f0e5ff','#fff0df','#e5f4ff'][i]);});
   if(!map.querySelector('.dm-study-resume')){const b=document.createElement('button');b.type='button';b.className='dm-study-resume';b.textContent='🗺️ Kaldığın yerden devam et →';b.onclick=()=>{const candidates=[...map.querySelectorAll('.ma-ada')],target=candidates.find(x=>!x.getAttribute('aria-label')?.includes('yüzde 100'))||candidates[0];target?.click();};map.querySelector('.ma-alt')?.before(b);}
  }
  document.querySelectorAll('#tab-meduakis .akis-ust').forEach(row=>{const n=row.querySelector(':scope > span:not(.av) > b');if(!n)return;const badge=row.querySelector('[data-online-person]');if(badge&&!n.contains(badge))n.append(badge);n.parentElement.classList.add('dm-feed-name');});
 }
 /* Automatic recommendation popups retired; study and music remain user-controlled. */
 setInterval(()=>{if(!logged()){stop();musicButton.hidden=true;return;}study();musicPaint();if(master&&audio)master.gain.setTargetAtTime(window.speechSynthesis?.speaking ? .02 : .38,audio.currentTime,.1);if(!playing()||document.hidden)stop();else start();},1000);
 window.dmStudyDecorate=study;
 study();musicPaint();
})();
