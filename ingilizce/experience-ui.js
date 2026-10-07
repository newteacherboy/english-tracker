(function(){
 'use strict';
 const $=id=>document.getElementById(id),visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
 const enabled=k=>window.dmFeatureEnabled?.(k)!==false;
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
 const PLAY='#bzAlan,#baOyunEkrani,#kpKelimeOyunEkrani,#kmPanel .km-sec,#seviyeDisLinkOverlay';
 const playing=()=>[...document.querySelectorAll(PLAY)].some(visible);
 let audio,master,notes=[],noteTimer,musicOn=read('dm_parkur_music')!=='off',gesture=false,bar=0;
 function stop(){clearInterval(noteTimer);noteTimer=null;notes.forEach(n=>{try{n.stop();}catch{}});notes=[];if(audio?.state==='running')audio.suspend().catch(()=>{});}
 function tone(freq,at,length,gain=.018){const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(gain,at+.08);g.gain.exponentialRampToValueAtTime(.0001,at+length);o.connect(g);g.connect(master);o.start(at);o.stop(at+length+.05);notes.push(o);o.onended=()=>{o.disconnect();g.disconnect();notes=notes.filter(n=>n!==o);};}
 function measure(){if(!audio||audio.state!=='running')return;const chords=[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]],c=chords[bar%4],start=audio.currentTime+.05;for(let i=0;i<4;i++){tone(c[i%3]*(i===3?2:1),start+i*.72,.65);if(i===0)tone(c[0]/2,start,2.4,.012);}bar++;}
 async function start(){if(!musicOn||!gesture||document.hidden||!playing()||noteTimer)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(!master){master=audio.createGain();master.gain.value=.38;master.connect(audio.destination);}await audio.resume();if(!musicOn||document.hidden||!playing())return stop();measure();noteTimer=setInterval(measure,2880);}catch{}}
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
 /* Contextual announcements: only active foreground time, never during questions/forms. */
 window.dmNudgeSystemActive=true;
 const destinations={ders:()=>window.dersCalisTamEkranAc?.(),aktiviteler:()=>window.aktivitelerTamEkranAc?.(),magaza:()=>window.magazaAc?.(),dolap:()=>window.dolapAc?.(),akis:()=>window.meduAkisAc?.(),sana:()=>window.sanaOzelTamEkranAc?.(),parkur:()=>window.dunyaAc?.()};
 const MESSAGE_GROUPS={
  ders:[['Bir küçük tekrar, büyük bir adım!','Kaldığın konuyu tamamlayarak öğrenmeni pekiştir.'],['Bugün hangi adayı keşfedelim?','Dil bilgisi, kelime, iletişim ve telaffuz seni bekliyor.'],['Dinle, söyle, hatırla!','Örnek cümleleri dinleyip sesli tekrar etmeyi dene.'],['Yanlışlar yol gösterir','Zorlandığın konuya geri dönmek de ilerlemektir.'],['Bir konuyu yeniden keşfet','İlk öğrenme ve uygun günlük tekrar ödülleri farklıdır.']],
  aktiviteler:[['Oyunla tekrar zamanı!','Öğrendiğin kelimeleri farklı bir oyunda kullan.'],['Hafızanı çalıştıralım mı?','Bir kısa oyunla bildiklerini pekiştir.'],['Dinleme kasını güçlendir','Kulak Dedektifi ve cümle oyunlarını incele.'],['Bugün farklı bir oyun dene','Her oyunda başka bir becerini geliştirebilirsin.'],['Bir arkadaşınla öğren','İki kişilik oyunlarda davet gönderebilirsin.']],
  magaza:[['Papi’ye yeni bir tarz!','Biriktirdiğin altınlarla mağazadaki aksesuarları incele.'],['Ödülünü kendi zevkine göre seç','Kıyafet ve aksesuar seçeneklerinin fiyatlarını mağazada gör.'],['Altınlarınla bir koleksiyon kur','Öğrenirken kazandıklarını sevdiğin bir aksesuar için biriktirebilirsin.'],['Küçük bir renk değişikliği?','Yeni bir görünüm için mağazaya göz at.'],['Hedefin bir aksesuar olsun','Beğendiğin ürünü seç; altınlarını onun için biriktir.']],
  dolap:[['Bugün hangi tarzı seçelim?','Sahip olduğun kıyafet ve aksesuarları dolabında görebilirsin.'],['Papi’nin dolabına göz at','Satın aldığın parçalarla yeni bir görünüm oluştur.'],['Koleksiyonunu keşfet','Sahip olduğun aksesuarlar senin tarzını yansıtsın.']],
  akis:[['Bir arkadaşını tebrik et','Birlikte öğrenmek daha keyifli olabilir.'],['Başarılarını paylaş','Medu Akış’ta ilerlemeni ve arkadaşlarının çalışmalarını gör.'],['Bugün nasıl ilerledin?','Akış ve lig ekranında kendi yolculuğunu takip et.'],['Rekabet kadar öğrenmek de değerli','Kendi önceki performansını geçmek güzel bir hedef.']],
  sana:[['Kendi gelişimini keşfet','Sana Özel bölümünde hedef ve ilerlemene göz at.'],['Kısa bir hedef belirle','Bugün tek bir konu bitirmek bile güzel bir başlangıç.'],['Zor kelimelerin kolaylaşabilir','Düzenli kısa tekrarlarla kendine yardımcı ol.'],['Kendinle yarış','Dünkü kendine göre küçük bir ilerleme hedefle.']],
  parkur:[['Yeni bir durak seni bekliyor','Kaldığın yerden devam etmek ister misin?'],['Her doğru bir adım','Hızlanmak zorunda değilsin; dikkatle ilerle.'],['Sandığa giden yol öğrenmekten geçer','Parkurdaki tamamlanma hedeflerine göz at.'],['Küçük molalar iyi gelir','İstersen ara ver; ilerlemen kaldığın yerde seni bekler.']]
 };
 const flags={ders:'ders',aktiviteler:'aktiviteler',magaza:'magaza',dolap:'dolap',akis:'akis',sana:'sana_ozel',parkur:'parkur'};
 const messages=Object.entries(MESSAGE_GROUPS).flatMap(([target,rows])=>rows.map(([title,text],i)=>({id:target+i,target,title,text,flag:target==='aktiviteler'&&i===4?'iki_kisilik':target==='parkur'&&i===2?'sandik':flags[target]})));
 function energy(){const e=$('headerEnerjiNum')||$('kpEnerjiSatiri');const m=e?.textContent.match(/(\d+)\s*\/\s*(\d+)/);return m?Number(m[1]):null;}
 const busy=()=>playing()||[...document.querySelectorAll('.game-modal-overlay,.dm-perde,.rubric-modal,.rubric-overlay,.modal-overlay,[role="dialog"],.pomodoro-overlay,.seviye-harita-overlay,.km-perde,.t2-perde,.kur-perde,.kr-perde,.od-perde,.tv-kart,.sa-perde,.gso-perde,#dmWeeklyPanel')].some(visible)||!!document.querySelector('input:focus,textarea:focus,select:focus')||window.turAcik;
 let session='',activeMs=0,count=0,next=210000,lastPulse=performance.now(),idleAt=Date.now(),shown=null,closedCount=0;
 const seen=new Set();document.addEventListener('pointerdown',()=>{idleAt=Date.now();},{passive:true});document.addEventListener('keydown',()=>{idleAt=Date.now();},{passive:true});
 function choose(){let pool=messages.filter(m=>enabled(m.flag)&&!seen.has(m.id));const en=energy();if(en!==null&&en<=8&&enabled('ders')&&!seen.has('energy'))return {id:'energy',target:'ders',flag:'ders',title:'Enerjin azalıyor, öğrenmen devam etsin!',text:'Konu çalışarak tekrar yapabilir ve uygun tamamlamalarda enerji kazanabilirsin.'};const context=visible($('tab-derscalis'))?'ders':visible($('tab-aktiviteler'))?'aktiviteler':visible($('tab-meduakis'))?'akis':'parkur';const local=pool.filter(m=>m.target===context);if(count%2===0&&local.length)pool=local;return pool[Math.floor(Math.random()*pool.length)];}
 function show(message){if(shown||!message)return;seen.add(message.id);count++;const p=document.createElement('div');p.className='dm-nudge-overlay';p.id='dmNudge';p.innerHTML='<section class="dm-nudge-card" role="dialog" aria-modal="true" aria-labelledby="dmNudgeTitle"><button class="dm-nudge-x" aria-label="Duyuruyu kapat">×</button><span class="dm-nudge-time">7 sn</span><img class="dm-nudge-parrot" src="papi-'+(message.target==='magaza'||message.target==='dolap'?'reward':'welcome')+'-v2.png" alt="Papi"><h2 id="dmNudgeTitle"></h2><p class="dm-nudge-text"></p><button class="dm-nudge-go"></button><button class="dm-nudge-skip">Oyuna devam et</button><small>7 saniye sonra kapanır</small><div class="dm-nudge-progress"><i></i></div></section>';p.querySelector('h2').textContent=message.title;p.querySelector('.dm-nudge-text').textContent=message.text;const go=p.querySelector('.dm-nudge-go');go.textContent={ders:'Ders Çalış’a git',aktiviteler:'Oyunları keşfet',magaza:'Mağazaya göz at',dolap:'Dolabımı aç',akis:'Medu Akış’a git',sana:'Gelişimime göz at',parkur:'Parkura dön'}[message.target];document.body.append(p);const prior=document.activeElement;shown={p,deadline:Date.now()+7000};stop();
  let timer=setInterval(()=>{const left=Math.max(0,Math.ceil((shown?.deadline-Date.now())/1000));p.querySelector('.dm-nudge-time').textContent=left+' sn';if(!left)close(false);},200);
  function close(skip){if(!p.isConnected)return;clearInterval(timer);p.remove();shown=null;if(skip)closedCount++;if(closedCount>=2)count=3;prior?.focus?.();start();}
  p.querySelector('.dm-nudge-x').onclick=()=>close(true);p.querySelector('.dm-nudge-skip').onclick=()=>close(true);go.onclick=()=>{close(false);if(enabled(message.flag))destinations[message.target]?.();};p.addEventListener('keydown',e=>{if(e.key==='Escape')close(true);if(e.key==='Tab'){const bs=[...p.querySelectorAll('button')],i=bs.indexOf(document.activeElement);e.preventDefault();bs[(i+(e.shiftKey?-1:1)+bs.length)%bs.length].focus();}});p.querySelector('.dm-nudge-x').focus();
 }
 setInterval(()=>{const now=performance.now(),delta=Math.min(5000,now-lastPulse);lastPulse=now;if(!logged()){if(session){session='';activeMs=0;count=0;seen.clear();}return;}if(session!==who()){session=who();activeMs=0;count=0;closedCount=0;next=210000;seen.clear();}if(!document.hidden&&Date.now()-idleAt<90000)activeMs+=delta;if(!shown&&count<3&&activeMs>=next&&!document.hidden&&enabled('duyurular')&&!busy()){const m=choose();if(m){show(m);next=activeMs+330000;}}},3000);
 /* Paid offers stay dormant until a real, separately authorized payment entry point exists. */
 window.dmNudgeSystem={messageCount:messages.length,showPreview:show,isBusy:busy};
 // Future commercial copy, intentionally not part of the active student rotation.
 window.dmFutureOfferCopy={energy:{title:'Ek enerji seçeneklerini incele',text:'Ücretsiz konu çalışması ve normal yenilenme devam eder. Ücretli seçenekler açıldığında fiyat ve veli onayı satın alma ekranında gösterilir.'},gold:{title:'Koleksiyonun için altın seçenekleri',text:'Altınla kıyafet ve aksesuar alabilirsin. Ücretli altın XP veya lig puanı kazandırmaz.'}};
 setInterval(()=>{study();musicPaint();if(master&&audio)master.gain.setTargetAtTime(window.speechSynthesis?.speaking ? .02 : .38,audio.currentTime,.1);if(!playing()||document.hidden||shown)stop();else start();},1000);
 window.dmStudyDecorate=study;
 study();musicPaint();
})();
