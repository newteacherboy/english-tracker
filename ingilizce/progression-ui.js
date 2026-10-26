(function(){'use strict';
const C=window.DijiProgressionCatalog,R=window.DijiProgressRules;
let paintKey='',paintFrame=0,leagueData=[],actor='',status=null,busy=false,lastRefresh=0,refreshAgain=false,baseline=0,pending=null,jokerRun=null,jokerUses=0,wraps=new Map();
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const student=()=>!!who()&&who().toLowerCase()!=='teacher'&&!window.dmGuestMode;
const ready=()=>student()&&typeof yo!=='undefined'&&!!yo&&typeof yoHazirMi==='function'&&yoHazirMi();
const level=()=>ready()?R.progress(R.migrate(yo)).level:1;
const toast=m=>window.yoToast?.(m);
function allowed(code){if(window.dmTeacherPortalMode)return true;if(['parkur','ders','aktiviteler','akis','magaza','medupro'].includes(code))return true;if(code==='magaza'||code==='karakter'&&C.gates.karakter===1)return true;if(window.dmPapiTour?.preview())return true;if(!student())return true;if(!ready())return code==='gunluk_gorev'||code==='haftalik_hedef';if(code==='akis')return !!status?.feed;return level()>=(C.gates[code]||1);}
function need(code){return code==='akis'?'Ana parkurda 3. durağa ulaşınca açılır.':(C.gates[code]||1)+'. seviyede açılır.';}
const odevAcilisi=()=>Date.now()<(window.__odevAcilisBitis||0);
function requireFeature(code){if(allowed(code)||odevAcilisi())return true;toast('🔒 '+need(code));return false;}
function itemAllowed(o,quiet=false){const owns=ready()?new Set(yo.karakter?.sahip||[]):new Set(),has=(o.parca||[o]).every(x=>owns.has(x.atolye?x.kat+':'+x.itemId:'d:'+x.id));const ok=!student()||ready()&&(has||level()>=C.itemLevel(o));if(!ok&&!quiet)toast('🔒 Bu ürün '+C.itemLevel(o)+'. seviyede açılır.');return ok;}
async function api(op,data={}){const r=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:op,ogrenci:who(),t:localStorage.getItem('ing_token')||'',...data})});const d=await r.json();if(!r.ok||d.ok===false)throw Error(d.mesaj||d.message||'İşlem tamamlanamadı');return d;}
async function sync(){const owner=who();if(!ready())throw Error('Öğrenci verisi henüz yüklenmedi.');if(typeof window.dmMemberSaveReady==='function')await window.dmMemberSaveReady(owner);if(owner!==who()||!ready())throw Error('Hesap değişti. İşlemi yeniden aç.');R.migrate(yo);const d=await api('ekVeriKaydet',{anahtar:'yo',deger:JSON.stringify(yo)});if(d.status==='bekliyor')throw Error('Verilerin sunucudan yüklenemedi. Lütfen tekrar dene.');return d;}
async function refresh(force=false){if(busy){if(force)refreshAgain=true;return;}if(document.hidden&&!force||!ready()||!force&&Date.now()-lastRefresh<300000)return;busy=true;const owner=who();try{const d=await api('seviyeDurumu');if(owner===who()){status=d;if(d.yo)window.dmApplyRewardState?.(d.yo,owner);lastRefresh=Date.now();window.dmStudyUI?.refresh();document.dispatchEvent(new CustomEvent('dm:progression-status',{detail:{owner,startPath:d.startPath||null}}));if(d.level>=5){try{leagueData=(await api('seviyeLigListesi')).liste||[];}catch{}}paint();}}catch(e){}finally{busy=false;if(refreshAgain){refreshAgain=false;refresh(true);}}}
function install(){for(const [fn,code] of Object.entries(C.functions)){const old=window[fn];if(typeof old!=='function'||old===wraps.get(fn))continue;const wrapped=function(){if(!requireFeature(code))return;if(!window.dmTeacherPortalMode&&student()&&fn.endsWith('Baslat')&&code.startsWith('oyun_')&&typeof window.genelEnerjiKalan==='number'&&window.genelEnerjiKalan<3&&!window.dmOdevEnerjiMuaf?.()){window.DijiMeduPapiFeedback?.energy();return;}return old.apply(this,arguments);};Object.assign(wrapped,old);wraps.set(fn,wrapped);window[fn]=wrapped;}
 for(const fn of ['dcSeviyeSec']){const old=window[fn];if(typeof old==='function'&&old!==wraps.get(fn)){const w=function(kod){if(student()&&!window.dmTeacherPortalMode){const code=String(kod).toUpperCase(),idx=['A1','A2','B1','B2'].indexOf(code),n=[1,9,16,23][idx];if(idx>=0&&(odevAcilisi()||status?.studyAccess?.[code]!==false))return old.apply(this,arguments);if(idx>=0){toast('🔒 '+code+' konuları, '+(status?.startPath?.maxCefr||'önceki seviye')+' konularının tamamı bitince veya başlangıç testiyle açılır.');return;}if(idx<0||level()<n){toast('🔒 '+n+'. seviyede açılır.');return;}if(idx>0&&!status?.lessons?.[code]){toast('🔒 Önce '+['A1','A2','B1'][idx-1]+' derslerinin tamamını bitir.');refresh(true);return;}}return old.apply(this,arguments);};Object.assign(w,old);window[fn]=w;wraps.set(fn,w);}}
 const avatar=window.maAvatar;if(typeof avatar==='function'&&avatar!==wraps.get('maAvatar')&&!avatar.__dmSeviye){const w=function(o){const name=o?.id==='ben'?who():o?.ad||o?.id;const raw=typeof maSosyalListe!=='undefined'?maSosyalListe.find(x=>String(x.ogrenci).toLowerCase()===String(name).toLowerCase()):null;const n=String(name).toLowerCase()===who().toLowerCase()?level():raw?C.level(raw.totalXp||0):o?.playerLevel;const html=avatar.apply(this,arguments);if(typeof html==='string'&&html.includes('dm-mini-level'))return html;return Number.isInteger(n)?'<span class="dm-avatar-level">'+html+'<small class="dm-mini-level" aria-label="Seviye '+n+'">Sv. '+n+'</small></span>':html;};w.__dmSeviye=true;window.maAvatar=w;wraps.set('maAvatar',w);}
 const old=window.maSekmeSec;if(typeof old==='function'&&old!==wraps.get('maSekmeSec')){const w=function(s){if(['akis','kesfet','lig','vitrin'].includes(s)&&!requireFeature(s))return;return old.apply(this,arguments);};Object.assign(w,old);window.maSekmeSec=w;wraps.set('maSekmeSec',w);}
 for(const fn of ['maOlayGonder','maBildirimGonder']){const old=window[fn];if(typeof old==='function'&&old!==wraps.get(fn)){const w=function(target,tur){if(!requireFeature(tur==='takip'?'takip':'tebrik'))return;return old.apply(this,arguments);};Object.assign(w,old);window[fn]=w;wraps.set(fn,w);}}
 const use=window.jokerKullan;if(typeof use==='function'&&use!==wraps.get('jokerKullan')){const w=function(){if(!requireFeature('joker'))return;if(typeof jk!=='undefined'&&jokerRun!==jk){jokerRun=jk;jokerUses=0;}const used=jokerUses,q=C.quota(level());const kind=arguments[0],had=typeof jk!=='undefined'&&jk.kullanilan?.has(kind),stock=yo.jokerEnv?.[kind]||0;const succeeded=()=>typeof jk!=='undefined'&&jk.kullanilan?.has(kind)&&(!had||(yo.jokerEnv?.[kind]||0)<stock);if(student()&&used>=q){if(used!==3||level()<30||!(yo.dmExtraJoker>0)){toast('🃏 Bu oyundaki joker hakkın doldu.');return;}const before=used,result=use.apply(this,arguments);if(succeeded()){jokerUses++;yo.dmExtraJoker--;window.yoKaydet?.();}return result;}const result=use.apply(this,arguments);if(succeeded())jokerUses++;return result;};Object.assign(w,use);window.jokerKullan=w;wraps.set('jokerKullan',w);}
}
function mark(el,code){const locked=!allowed(code);el.classList.toggle('dm-level-locked',locked);if(locked){el.dataset.dmLevelLock=code;el.setAttribute('aria-disabled','true');el.title=need(code);}else if(el.dataset.dmLevelLock){delete el.dataset.dmLevelLock;el.removeAttribute('aria-disabled');el.removeAttribute('title');}}
function paint(){if(!student())return;document.querySelectorAll('.dm-avatar-level .dm-avatar-level').forEach(x=>{x.querySelectorAll(':scope > .dm-mini-level').forEach(b=>b.remove());x.replaceWith(...x.childNodes);});for(const f of C.features)for(const selector of f.selectors)document.querySelectorAll(selector).forEach(e=>mark(e,f.code));
 document.querySelectorAll('[onclick]').forEach(e=>{const match=(e.getAttribute('onclick')||'').match(/\b([A-Za-z_$][\w$]*)\s*\(/);if(match&&C.functions[match[1]])mark(e,C.functions[match[1]]);});
 document.querySelectorAll('[data-dm-goals]').forEach(e=>{const code=e.dataset.dmGoals==='daily'?'gunluk_gorev':'haftalik_hedef';mark(e,code);e.querySelectorAll('button').forEach(b=>mark(b,code));});
 document.querySelectorAll('[data-social]').forEach(e=>{const code={message:'hazir_mesaj',duel:'duello',gift:'enerji_hediye'}[e.dataset.social];if(code)mark(e,code);});
 document.querySelectorAll('[data-k="koleksiyon"],[data-k="karakterler"],#bcKoleksiyon').forEach(e=>mark(e,'koleksiyon'));
 document.querySelectorAll('.ka-cins,#kaKaristir').forEach(e=>mark(e,'karakter'));
 document.querySelectorAll('#dlSekmeler [data-s]').forEach(e=>{e.classList.remove('dm-level-locked');delete e.dataset.dmCategoryLevel;e.removeAttribute('aria-disabled');});
 const store=document.getElementById('dlSekmeler');if(store&&level()>=30&&!document.getElementById('dmExtraJokerBuy')){const b=document.createElement('button');b.id='dmExtraJokerBuy';b.textContent='🃏 4. joker hakkı · 1200 altın';b.onclick=extraJoker;store.append(b);}
 document.querySelectorAll('.so-hedef button').forEach(e=>mark(e,'haftalik_hedef'));
 document.querySelectorAll('#soPanel [id*="Gorev"],#yoGorevler').forEach(e=>mark(e,'gunluk_gorev'));
 document.querySelectorAll('[data-jm],.jm-oyun-al').forEach(e=>mark(e,'joker_magaza'));
 document.querySelectorAll('#yoDikteKart').forEach(e=>mark(e,'oyun_dikte'));
 document.querySelectorAll('#yoCumleKart').forEach(e=>mark(e,'oyun_cumle'));
 document.querySelectorAll('#dmUcusteKart,#dmRotaKart').forEach(e=>mark(e,'iki_kisilik'));
 document.querySelectorAll('#bottomNavMobile [data-ekran]').forEach(e=>{const code={'tab-derscalis':'ders','tab-aktiviteler':'aktiviteler','tab-meduakis':'akis','tab-magaza':'magaza'}[e.dataset.ekran];if(code)mark(e,code);});
 document.querySelectorAll('#bzJkAl').forEach(e=>mark(e,'joker_magaza'));
 document.querySelectorAll('[data-dm-league-level]').forEach(e=>e.classList.toggle('dm-level-locked',level()<Number(e.dataset.dmLeagueLevel)));
 document.querySelectorAll('#jkBar button').forEach(e=>{if(level()<15)mark(e,'joker');});
}
document.addEventListener('click',e=>{if(window.dmTeacherPortalMode||!student())return;const b=e.target.closest('[data-dm-level-lock],[data-dm-category-level],[data-dm-league-level],[data-s],[data-nav],[data-social]');if(!b)return;if(b.dataset.dmLeagueLevel&&level()<Number(b.dataset.dmLeagueLevel)){e.preventDefault();e.stopImmediatePropagation();toast('🔒 Bu lig '+b.dataset.dmLeagueLevel+'. seviyede açılır.');return;}if(b.dataset.dmCategoryLevel&&level()<Number(b.dataset.dmCategoryLevel)){e.preventDefault();e.stopImmediatePropagation();toast('🔒 Bu kategori '+b.dataset.dmCategoryLevel+'. seviyede açılır.');return;}const code=b.dataset.dmLevelLock||({meduakis:'akis',ders:'ders',aktiviteler:'aktiviteler',magaza:'magaza'}[b.dataset.nav])||(['akis','kesfet','lig','vitrin'].includes(b.dataset.s)?b.dataset.s:null);if(code&&!allowed(code)){e.preventDefault();e.stopImmediatePropagation();requireFeature(code);}},true);
function sprite(l){const stage=l<=5?'baby':l<=14?'reader':l<=29?'explorer':'master';return '<div class="dm-papi-stage '+stage+'"><i role="img" aria-label="Papi papağan"></i><span class="dm-papi-prop">'+C.levels[l-1].prop+'</span></div>';}
async function extraJoker(){if(!requireFeature('iki_kisilik'))return;try{await sync();const d=await api('seviyeEkJokerAl');Object.assign(yo,d.yo);toast('🃏 Bir oyun için 4. joker hakkı çantanda!');}catch(e){toast(e.message);}}
function badges(l){return C.levels.slice(0,l).filter(x=>x.benefits.some(b=>b.includes('rozeti')));}
function panel(){if(!ready()){toast('Seviye bilgilerin yükleniyor. Birazdan tekrar dene.');return;}document.getElementById('dmProgressOverlay')?.remove();const p=R.progress(R.migrate(yo)),info=C.levels[p.level-1],el=document.createElement('div');el.id='dmProgressOverlay';el.className='dm-progress-overlay';el.innerHTML='<section class="dm-progress-sheet" role="dialog" aria-modal="true" aria-labelledby="dmProgressTitle"><button class="dm-progress-close" aria-label="Kapat">×</button>'+sprite(p.level)+'<h2 id="dmProgressTitle">'+info.name+'</h2><p class="dm-progress-caption-v2">Kalıcı seviyen öğrenme yolculuğunu gösterir. XP biriktirdikçe yeni özellikler açılır.</p><b>Seviye '+p.level+' · '+p.xp.toLocaleString('tr-TR')+' XP</b><div class="dm-progress-numbers"><span><b>'+p.xp.toLocaleString('tr-TR')+'</b>Toplam kazanılan XP</span><span><b>'+(p.next===null?'✓':p.remaining)+'</b>Sonraki seviyeye kalan XP</span></div><div class="dm-progress-track"><i style="width:'+p.ratio*100+'%"></i></div><p>'+(p.next===null?'Yolculuğun zirvesindesin!':p.remaining+' XP sonra '+(p.level+1)+'. seviye')+'</p><div class="dm-next-unlocks">'+(p.next===null?'🏆 Efsane Papağan':['Bir sonraki seviyede açılacaklar'].concat(C.levels[p.level].benefits).map(x=>'<p>🔓 '+x+'</p>').join(''))+'</div><details class="dm-earned-badges"><summary>🪶 Kazandığın seviye rozetleri</summary><small>Tüyler, ulaştığın özel seviyelerin hatıra rozetleridir. Harcanmaz ve XP yerine geçmez.</small>'+badges(p.level).map(x=>'<p>'+x.prop+' '+x.name+'</p>').join('')+'</details><p class="dm-mystery">'+(p.next===null?'':Array.from({length:Math.min(4,39-p.level)},()=>'<span>🔒 ?</span>').join(''))+'</p><p class="dm-mystery-caption">Daha sonraki seviyelerin sürprizleri şimdilik gizli.</p><button class="dm-progress-go">Sandıklarım</button></section>';document.body.append(el);const prior=document.activeElement;const close=()=>{el.remove();prior?.focus?.();};el.querySelector('.dm-progress-close').onclick=close;el.querySelector('.dm-progress-go').onclick=()=>{close();chests();};dialogKeys(el,close);el.querySelector('button').focus();}
function dialogKeys(el,close){el.addEventListener('keydown',e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const b=[...el.querySelectorAll('button:not([hidden]):not(:disabled)')],i=b.indexOf(document.activeElement);e.preventDefault();b[(i+(e.shiftKey?-1:1)+b.length)%b.length].focus();}});}
/* Native WebAudio notes: never call TTS, never download narration or run a soundtrack.
   Prime on a real interaction for iOS; auto celebration remains gracefully silent
   when the browser forbids playback. Respect both app-level mute preferences. */
let levelSoundContext=null;
function levelSoundAllowed(){
 try{return !document.hidden&&window.dmSoundEnabled!==false&&window.dmSesAcik!==false&&localStorage.getItem('dm_sound_muted')!=='1'&&localStorage.getItem('sesKapali')!=='1';}
 catch{return !document.hidden&&window.dmSoundEnabled!==false&&window.dmSesAcik!==false;}
}
function primeLevelSound(){
 if(!levelSoundAllowed())return;
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 try{
  if(!levelSoundContext)levelSoundContext=new Audio();
  if(levelSoundContext.state==='suspended')void levelSoundContext.resume().catch(()=>{});
 }catch{} // browser restrictions must not block progression
}
document.addEventListener('pointerdown',primeLevelSound,true);
document.addEventListener('keydown',primeLevelSound,true);
function levelSound(kind){
 if(!levelSoundAllowed())return false;
 primeLevelSound();
 const audio=levelSoundContext;if(!audio||audio.state!=='running')return false;
 const fly=kind==='fly';
 // Bright but brief nonverbal flight: a soft rising whoosh under a five-note chime.
 // Browsers may decline autoplay; never force audio or bypass mute controls.
 const notes=fly?[392,523.25,659.25,783.99,1046.5]:
  kind==='number'?[523.25,783.99,1046.5]:
  [659.25,880];
 const gap=fly?.11:kind==='number'?.087:.055;
 const volume=fly?.075:kind==='unlock'?.026:.036;
 try{
  const now=audio.currentTime;
  if(fly){
   const swoosh=audio.createOscillator(),envelope=audio.createGain();
   swoosh.type='triangle';
   swoosh.frequency.setValueAtTime(170,now);
   swoosh.frequency.exponentialRampToValueAtTime?.(610,now+.5);
   envelope.gain.setValueAtTime(.0001,now);
   envelope.gain.exponentialRampToValueAtTime(.046,now+.07);
   envelope.gain.exponentialRampToValueAtTime(.0001,now+.53);
   swoosh.connect(envelope);envelope.connect(audio.destination);
   swoosh.start(now);swoosh.stop(now+.55);
   swoosh.onended=()=>{try{swoosh.disconnect();envelope.disconnect();}catch{}};
  }
  notes.forEach((hz,i)=>{
   const osc=audio.createOscillator(),gain=audio.createGain(),t=now+i*gap;
   osc.type=fly?'triangle':'sine';
   osc.frequency.setValueAtTime(hz,t);
   gain.gain.setValueAtTime(.0001,t);
   gain.gain.exponentialRampToValueAtTime(volume,t+.02);
   gain.gain.exponentialRampToValueAtTime(.0001,t+(fly?.24:.15));
   osc.connect(gain);gain.connect(audio.destination);
   osc.start(t);osc.stop(t+(fly?.26:.17));
   osc.onended=()=>{try{osc.disconnect();gain.disconnect();}catch{}};
  });
  return true;
 }catch{return false;} // audio must never block reward flow
}
function celebrate(from,to){
 if(document.getElementById('dmLevelUp')||!C.levels[to-1])return;
 const previous=Math.max(1,Math.min(from,to-1)),info=C.levels[to-1],el=document.createElement('div');
 const unlocked=C.levels.slice(Math.max(0,from),to).flatMap(x=>(x.benefits||[]).map(benefit=>({level:x.level,name:x.name,prop:x.prop,benefit})));
 el.id='dmLevelUp';el.className='dm-level-up dm-flight-celebration';
 el.innerHTML='<section class="dm-flight-layout" role="dialog" aria-modal="true" aria-labelledby="dmLevelUpTitle"><div class="dm-flight-stars" aria-hidden="true">✦　✧　✦　✧　✦</div><button type="button" class="dm-level-skip" aria-label="Kutlamayı geç">Geç</button><h2 id="dmLevelUpTitle" class="dm-flight-sr-only">Seviye '+to+'</h2><button type="button" class="dm-papi-reveal" aria-label="Papi’ye dokun, açılan özellikleri sırayla gör"><span class="dm-flight-papi" role="img" aria-label="Uçarak gelen Papi papağan"></span></button><div class="dm-flight-number" aria-label="Seviye '+to+'"><span class="dm-flight-old" aria-hidden="true">'+previous+'</span><span class="dm-flight-new" aria-hidden="true">'+to+'</span></div><span class="dm-flight-label">SEVİYE</span><h3 class="dm-flight-name">'+info.name+'</h3><p class="dm-reveal-hint">Yeni özelliklerin açılıyor</p><div class="dm-unlock-cards" role="list" aria-label="Yeni açılan özellikler" hidden></div><button type="button" class="dm-level-continue" hidden>Yolculuğa devam et</button></section>';
 const prior=document.activeElement,timers=[],reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const later=(fn,ms)=>{timers.push(setTimeout(()=>{if(el.isConnected)fn();},ms));};
 document.body.append(el);
 const cards=el.querySelector('.dm-unlock-cards'),continueButton=el.querySelector('.dm-level-continue');
 let started=false;
 const finish=()=>{continueButton.hidden=false;el.classList.add('dm-unlocks-finished');};
 const reveal=(byUser=false)=>{
  if(started||!el.isConnected)return;
  started=true;
  cards.innerHTML=unlocked.map(x=>'<article role="listitem" hidden><span>'+x.prop+'</span><div><b>'+x.benefit+'</b><p>'+x.level+'. seviye · '+x.name+'</p></div></article>').join('');
  cards.hidden=false;el.querySelector('.dm-reveal-hint').hidden=true;el.classList.add('revealed');
  if(!unlocked.length){finish();return;}
  const rows=[...cards.querySelectorAll('article')];
  if(reduced){
   rows.forEach(row=>row.hidden=false);
   levelSound('unlock');finish();
   if(byUser)continueButton.focus();
   return;
  }
  rows.forEach((row,i)=>later(()=>{
   row.hidden=false;row.classList.add('dm-unlock-entry');
   // Keep the newest item visible inside the bounded mobile card list.
   cards.scrollTop=Math.max(0,row.offsetTop-cards.offsetTop-cards.clientHeight+row.clientHeight+12);
   levelSound('unlock');
   if(i===rows.length-1)finish();
  },200+i*430));
 };
 const close=()=>{
  timers.forEach(clearTimeout);
  el.remove();prior?.focus?.();
 };
 let flightSoundPlayed=false;
 el.querySelector('.dm-papi-reveal').onclick=()=>{
  // iOS/WebKit may require a user gesture. Retry only if arrival was silent.
  if(!flightSoundPlayed)flightSoundPlayed=levelSound('fly');
  reveal(true);
 };
 continueButton.onclick=close;
 el.querySelector('.dm-level-skip').onclick=close;
 dialogKeys(el,close);
 el.querySelector('.dm-papi-reveal').focus();
 flightSoundPlayed=levelSound('fly');
 if(reduced){reveal(false);}
 else{
  later(()=>levelSound('number'),1100);
  later(()=>reveal(false),2450);
 }
}
function chestReward(gold){
 document.getElementById('dmChestReward')?.remove();
 const el=document.createElement('div');el.id='dmChestReward';el.className='dm-progress-overlay dm-chest-reward';
 el.innerHTML='<section class="dm-progress-sheet" role="dialog" aria-modal="true" aria-labelledby="dmChestRewardTitle"><div class="dm-chest-rays" aria-hidden="true">✦ ✨ ✦</div><div class="dm-chest-prize" aria-hidden="true">🧰</div><h2 id="dmChestRewardTitle">Sandığın açıldı!</h2><p class="dm-chest-gold"></p><p>Ödülün hesabına eklendi.</p><button class="dm-level-continue">Harika!</button></section>';
 el.querySelector('.dm-chest-gold').textContent='+'+Number(gold||0).toLocaleString('tr-TR')+' altın';
 const prior=document.activeElement,close=()=>{el.remove();prior?.focus?.();};el.querySelector('button').onclick=close;dialogKeys(el,close);document.body.append(el);el.querySelector('button').focus();
 setTimeout(()=>{if(el.isConnected){el.classList.add('is-open');el.querySelector('.dm-chest-prize').textContent='🪙';}},400);
}
async function chests(){await window.dmActiveTime?.flush?.();const timeChests=window.dmActiveTime?.unclaimed?.()||[];if(!timeChests.length&&!requireFeature('sandik'))return;await refresh(true);const el=document.createElement('div');el.className='dm-progress-overlay';el.id='dmChestPanel';el.innerHTML='<section class="dm-progress-sheet" role="dialog" aria-modal="true" aria-labelledby="dmChestTitle"><button class="dm-progress-close" aria-label="Kapat">×</button><header class="mp-chest-hero"><img src="route-assets/bilgi-icons/chest.webp" alt=""><div><h2 id="dmChestTitle">Hazine Sandıklarım</h2><p>İlerle, keşfet, hazineni aç!</p></div></header><p class="mp-chest-note">Her sandık bir kez açılır. Seviyen ve parkur ilerlemen birlikte değerlendirilir.</p>'+C.chests.map(c=>{const state=status?.chests?.[c.id];return '<article class="dm-chest-row mp-chest-'+c.id+'" data-state="'+(state||'locked')+'"><img class="mp-chest-art" src="route-assets/bilgi-icons/chest.webp" alt=""><div><b>'+c.name+'</b><span class="mp-chest-gold"><i class="ap-resource ap-gold" aria-hidden="true"></i>'+c.gold+' Altın</span><small>Seviye '+c.level+' · '+({bronze:'Ana parkurda ilk 3 durak',silver:'Ana parkurun yarısı',gold:'İlk 2 parkur tamam',crystal:'İlk 3 parkur tamam',legend:'Tüm parkurlar tamam'}[c.id])+'</small></div><button data-chest="'+c.id+'" '+(state==='ready'?'':'disabled')+'>'+(state==='claimed'?'Alındı':state==='ready'?'Aç':'Kilitli')+'</button></article>';}).join('')+'<div data-time-chest-list></div></section>';document.body.append(el);const close=()=>el.remove();const renderTime=()=>{const box=el.querySelector('[data-time-chest-list]');if(!box)return;box.replaceChildren();const ids=window.dmActiveTime?.unclaimed?.()||[];if(ids.length){const h=document.createElement('h3');h.textContent='Aktif süre sandıkları';box.append(h);}for(const index of ids){const row=document.createElement('article');row.className='dm-chest-row';const label=document.createElement('b');label.textContent='🎁 '+index+'. süre sandığı · 100 aktif dakika';const b=document.createElement('button');b.textContent='Aç';b.onclick=()=>window.dmActiveTime.openChest(index);row.append(label,b);box.append(row);}};renderTime();const updateTime=()=>{if(!el.isConnected){document.removeEventListener('dm:time',updateTime);return;}renderTime();};document.addEventListener('dm:time',updateTime);el.querySelector('.dm-progress-close').onclick=close;dialogKeys(el,close);el.querySelectorAll('[data-chest]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await sync();const d=await api('seviyeSandikAc',{sandik:b.dataset.chest});if(d.yo){Object.assign(yo,d.yo);window.yoKaydet?.();window.yoGoster?.();}chestReward(d.gold);status=null;lastRefresh=0;await refresh(true);b.textContent='Alındı';b.closest('.dm-chest-row').dataset.state='claimed';}catch(e){toast(e.message);b.disabled=false;}});el.querySelector('button').focus();}
window.maLigSiralama=function(){const liste=leagueData.map(o=>({ad:o.name,sinif:String(o.class||''),puan:0,xp:o.xp,sira:o.rank,kod:o.league,benMi:o.name.toLowerCase()===who().toLowerCase()}));return {liste,harita:Object.fromEntries(liste.map(x=>[x.ad.toLowerCase(),x]))};};
document.addEventListener('dm:starting-placement-complete',()=>refresh(true));
window.dmProgression={paint,allowed,require:requireFeature,level,itemAllowed,refresh,chests,status:()=>status,parkur:()=>true,quota:()=>C.quota(level()),sync,buyExtraJoker:extraJoker,previewAnimation:()=>celebrate(Math.max(0,level()-1),level())};
window.dolapSandikAc=window.bcSandikAc=window.sandikTorenAc=chests;
/* Uygulamanın kendiliğinden açtığı Medu Akış: kilitliyse uyarı göstermeden Parkur'da kal */
document.addEventListener('dm:starting-placement-complete',()=>refresh(true));
window.dmOtomatikAkisAc=function(parkuraDon){if(!student()||allowed('akis'))return window.meduAkisAc?.();if(!status)refresh(true);if(parkuraDon)window.dunyaAc?.();};
const progressOpen=()=>{const b=document.getElementById('dmLevelBadge');if(b)b.onclick=panel;window.dmProgressPanel=Object.assign(window.dmProgressPanel||{},{open:panel});};
const originalFetch=window.fetch;window.fetch=async function(url,opt){const owner=who(),r=await originalFetch.apply(this,arguments);if(opt?.body&&typeof opt.body==='string'&&opt.body.includes('"dersTestSonucKaydet"')&&r.ok){r.clone().json().then(d=>{if(owner!==who())return;if(d.eklenenEnerji>0){window.headerEnerjiGoster?.(d.enerjiKalan,d.enerjiMax);toast('📘 İlk başarılı ders: +'+d.eklenenEnerji+' enerji');}refresh(true);}).catch(()=>{});}return r;};
setInterval(()=>{if(document.hidden)return;install();progressOpen();const name=ready()?who():'';if(name!==actor){leagueData=[];document.getElementById('dmLevelUp')?.remove();document.getElementById('dmChestPanel')?.remove();actor=name;status=null;lastRefresh=0;baseline=name?level():0;pending=null;}const key=[name,level(),status?.feed,JSON.stringify(status?.lessons||{}),!!window.dmPapiTour?.preview()].join('|');if(key!==paintKey){paintKey=key;queuePaint();}if(!name)return;refresh();const now=level();if([5,10,14].includes(now)){const k='dm_store_hint:'+actor+':'+now;if(!localStorage.getItem(k)){localStorage.setItem(k,'1');toast('🪙 Altınların birikiyor! Mağazadaki başlangıç ürünlerini şimdi keşfedebilirsin.');}}if(now>baseline){pending={from:pending?.from??baseline,to:now};baseline=now;}if(pending&&!window.dmPapiNotices?.blocked()&&!document.hidden&&!document.getElementById('dmLevelUp')&&!Array.from(document.querySelectorAll('#genelSonucOverlay,#dmGoalAnnouncement,#dmWeeklyPanel')).some(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden')){const p=pending;pending=null;celebrate(p.from,p.to);}},1000);
function queuePaint(){if(paintFrame)return;paintFrame=requestAnimationFrame(()=>{paintFrame=0;install();paint();progressOpen();});}
// Newly mounted controls need a gate once, not a full-document scan every 700 ms.
if(typeof MutationObserver==='function')new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('button,[onclick],[data-dm-goals],[data-social]')||n.querySelector?.('button,[onclick],[data-dm-goals],[data-social]')))))queuePaint();}).observe(document.getElementById('panel-alani')||document.body,{childList:true,subtree:true});
for(const event of ['dm:login','dm:state','visibilitychange'])document.addEventListener(event,()=>{paintKey='';if(!document.hidden)queuePaint();});
install();paint();progressOpen();
})();
