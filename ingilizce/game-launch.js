/* [11 Kas 2026] Oyun açılış ekranı · Arcade tasarımı (kullanıcı onayı: D1 + D2).
   Premium oyunlar hariç, sınıf/ünite seçimli 9 oyuna uygulanır.
   Okul Yolum → sınıf + renkli ünite düğmeleri. Öğrenme Yolum → A1–B2 seviye kartları;
   sorular seviyenin kelime havuzundan gelir (B1/B2 şimdilik A1+A2 havuzu). Papi: giriş animasyonundaki Papi. */
(function(){
 'use strict';
 if(window.dmGameLaunch)return;
 const GAMES=[
  ['ky','kelimeYarismaOverlay','Kelime Laboratuvarı',true],
  ['jp','jpOyunOverlay','Risk Balonları',true],
  ['bosluk','boslukOyunOverlay','Eksik Harf',true],
  ['hafiza','hafizaOyunOverlay','Hafıza Sandığı',true],
  ['yagmur','yagmurOyunOverlay','Hız Fırtınası',true],
  ['asmaca','asmacaOyunOverlay','Harf Avı',true],
  ['kelimebul','kelimebulOyunOverlay','Şifre Kırıcı',true],
  ['es','esOyunOverlay','Eş Bul',true],
  ['tren','trenOyunOverlay','Kelime Treni',false]   /* cümle oyunu: seviye havuzu yok, hep sınıf/ünite */
 ];
 const LEVELS=[['A1','Başlangıç',2],['A2','Temel',3],['B1','Orta',4],['B2','İleri',5]]; /* sınıf karşılığı soru sayısını belirler: 15–30 soru */
 const SVG=`<svg class="gl-papi-svg" viewBox="0 0 400 440" aria-hidden="true"><defs><radialGradient id="glpib" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="#5FE3D5"/><stop offset=".55" stop-color="#22BFB2"/><stop offset="1" stop-color="#128E8F"/></radialGradient><linearGradient id="glpiw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1DAFA6"/><stop offset=".7" stop-color="#1688A3"/><stop offset="1" stop-color="#6A47E8"/></linearGradient><linearGradient id="glpic" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5B33D6"/><stop offset="1" stop-color="#A47CFF"/></linearGradient><linearGradient id="glpik" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC14D"/><stop offset="1" stop-color="#FF8A1C"/></linearGradient><radialGradient id="glpig" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#D4FFF6"/><stop offset="1" stop-color="#8FE8DA"/></radialGradient><clipPath id="glpiL"><ellipse cx="168" cy="186" rx="25" ry="28"/></clipPath><clipPath id="glpiR"><ellipse cx="232" cy="186" rx="25" ry="28"/></clipPath></defs><ellipse class="p-shadow" cx="200" cy="372" rx="78" ry="11" fill="#1B1F3B" opacity=".12"/><g class="p-root"><g class="p-tilt"><g stroke="#FF9F1C" stroke-width="8" stroke-linecap="round" fill="none"><path d="M176 345 l-10 19 M176 345 l0 21 M176 345 l10 19"/><path d="M224 345 l-10 19 M224 345 l0 21 M224 345 l10 19"/></g><path d="M232 318 C 262 330, 282 352, 286 372 C 266 368, 246 352, 228 334 Z" fill="#6A47E8"/><path d="M222 324 C 246 342, 258 364, 258 384 C 240 374, 226 356, 214 336 Z" fill="#1688A3"/><g class="p-body"><g class="p-crest"><g class="p-crestIn"><path d="M186 124 C 168 104, 156 84, 154 64 C 172 72, 190 94, 198 120 Z" fill="#6236D9"/><path d="M214 120 C 226 98, 240 84, 254 76 C 250 96, 236 114, 220 126 Z" fill="#6236D9"/><path d="M190 124 C 182 92, 190 58, 206 38 C 216 64, 216 98, 210 124 Z" fill="url(#glpic)"/><path d="M203 52 C 198 72, 198 92, 201 110" stroke="#C9B3FF" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/></g></g><path d="M200 110 C 264 110, 294 150, 294 210 L 292 272 C 290 322, 254 348, 200 348 C 146 348, 110 322, 108 272 L 106 210 C 106 150, 136 110, 200 110 Z" fill="url(#glpib)"/><path d="M200 236 C 242 236, 264 268, 260 302 C 256 332, 232 344, 200 344 C 168 344, 144 332, 140 302 C 136 268, 158 236, 200 236 Z" fill="url(#glpig)"/><path d="M172 276 q10 8 20 0 M208 276 q10 8 20 0 M188 300 q12 9 24 0 M164 304 q8 7 16 0 M220 304 q8 7 16 0" stroke="#5FCFC0" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/><ellipse cx="200" cy="190" rx="82" ry="50" fill="#C9FFF4" opacity=".55"/><path d="M146 140 C 160 126, 178 120, 194 120" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".45"/><g class="p-eyeOpen"><ellipse cx="168" cy="186" rx="25" ry="28" fill="#fff"/><g class="p-pupil"><circle cx="171" cy="190" r="13" fill="#1B1F3B"/><circle cx="176" cy="184" r="4.8" fill="#fff"/><circle cx="166" cy="196" r="2" fill="#fff"/></g><g clip-path="url(#glpiL)"><rect class="p-lid" x="140" y="100" width="56" height="58" fill="#1FB3A6"/></g></g><g class="p-eyeOpen"><ellipse cx="232" cy="186" rx="25" ry="28" fill="#fff"/><g class="p-pupil"><circle cx="235" cy="190" r="13" fill="#1B1F3B"/><circle cx="240" cy="184" r="4.8" fill="#fff"/><circle cx="230" cy="196" r="2" fill="#fff"/></g><g clip-path="url(#glpiR)"><rect class="p-lid" x="204" y="100" width="56" height="58" fill="#1FB3A6"/></g></g><g class="p-eyeHappy" stroke="#1B1F3B" stroke-width="7" stroke-linecap="round" fill="none"><path d="M148 196 Q168 170 188 196"/><path d="M212 196 Q232 170 252 196"/></g><g class="p-eyeClosed" stroke="#1B1F3B" stroke-width="6" stroke-linecap="round" fill="none"><path d="M148 190 Q168 204 188 190"/><path d="M212 190 Q232 204 252 190"/></g><path class="p-brow p-browL" d="M146 152 Q166 141 186 149" stroke="#6236D9" stroke-width="8" stroke-linecap="round" fill="none"/><path class="p-brow p-browR" d="M214 149 Q234 141 254 152" stroke="#6236D9" stroke-width="8" stroke-linecap="round" fill="none"/><ellipse class="p-cheek" cx="138" cy="224" rx="13" ry="8" fill="#FF7AA8" opacity=".45"/><ellipse class="p-cheek" cx="262" cy="224" rx="13" ry="8" fill="#FF7AA8" opacity=".45"/><ellipse class="p-mouth" cx="200" cy="234" rx="13" ry="9" fill="#7A2340"/><path class="p-jaw" d="M185 226 C 190 248, 210 248, 215 226 C 208 232, 192 232, 185 226 Z" fill="#E0730A"/><path d="M181 207 C 188 197, 212 197, 219 207 C 227 220, 220 240, 204 250 C 199 253, 195 249, 197 243 C 192 232, 183 221, 181 207 Z" fill="url(#glpik)"/><path d="M190 206 C 196 202, 206 202, 210 206" stroke="#FFE2A8" stroke-width="4" stroke-linecap="round" fill="none"/><g class="p-glasses"><rect x="128" y="168" width="144" height="10" fill="#111"/><path d="M138 178 h56 v18 h-8 v8 h-40 v-8 h-8 Z" fill="#111"/><path d="M206 178 h56 v18 h-8 v8 h-40 v-8 h-8 Z" fill="#111"/><g fill="#fff"><rect x="148" y="182" width="8" height="8"/><rect x="156" y="190" width="8" height="8"/><rect x="216" y="182" width="8" height="8"/><rect x="224" y="190" width="8" height="8"/></g></g></g><g class="p-wingL"><path d="M122 210 C 90 214, 76 252, 82 288 C 86 306, 106 306, 114 292 C 122 272, 128 240, 122 210 Z" fill="url(#glpiw)"/><path d="M100 250 q8 10 18 8 M94 272 q8 9 18 6" stroke="#0F7A86" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/></g><g class="p-wingR"><path d="M278 210 C 310 214, 324 252, 318 288 C 314 306, 294 306, 286 292 C 278 272, 272 240, 278 210 Z" fill="url(#glpiw)"/><path d="M300 250 q-8 10 -18 8 M306 272 q-8 9 -18 6" stroke="#0F7A86" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/></g></g></g><g class="p-fx p-sparkles" fill="#FFC93C"><path d="M70 120 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6 Z"/><path style="animation-delay:.25s" d="M330 100 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5 Z"/><path style="animation-delay:.5s" fill="#A47CFF" d="M346 250 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z"/><path style="animation-delay:.4s" fill="#A47CFF" d="M54 260 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z"/></g><g class="p-fx p-exclaim"><text x="300" y="110" font-family="Nunito,system-ui,sans-serif" font-weight="900" font-size="58" fill="#FF6B4A">!</text></g><path class="p-fx p-tear" d="M150 214 C 150 214, 140 228, 140 234 a10 10 0 0 0 20 0 C 160 228, 150 214, 150 214 Z" fill="#7FD3FF"/><path class="p-fx p-heart" d="M330 170 c-8 -12 -26 -6 -24 8 c2 10 14 18 24 26 c10 -8 22 -16 24 -26 c2 -14 -16 -20 -24 -8 Z" fill="#FF5C8A"/><g class="p-fx p-question" font-family="Nunito,system-ui,sans-serif" font-weight="900" fill="#7C4DFF"><text x="292" y="110" font-size="46">?</text><text x="322" y="78" font-size="30">?</text></g><g class="p-fx p-zzz" font-family="Nunito,system-ui,sans-serif" font-weight="900" fill="#5A31CC"><text x="270" y="120" font-size="30">Z</text><text x="270" y="120" font-size="24">z</text><text x="270" y="120" font-size="20">z</text></g><g class="p-fx p-confetti"><rect x="80" y="40" width="10" height="16" rx="2" fill="#FFC93C"/><rect x="140" y="20" width="10" height="16" rx="2" fill="#7C4DFF" style="animation-delay:.3s"/><rect x="250" y="30" width="10" height="16" rx="2" fill="#FF5C8A" style="animation-delay:.6s"/><rect x="320" y="50" width="10" height="16" rx="2" fill="#2EC4B6" style="animation-delay:.15s"/><rect x="200" y="10" width="10" height="16" rx="2" fill="#FF9F1C" style="animation-delay:.9s"/><rect x="40" y="90" width="10" height="16" rx="2" fill="#2EC4B6" style="animation-delay:1.1s"/><rect x="350" y="110" width="10" height="16" rx="2" fill="#FFC93C" style="animation-delay:.45s"/></g></svg>`;
 const STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>';
 const PLAY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
 const CHECK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';
 const yoObj=()=>typeof yo!=='undefined'&&yo?yo:null;
 function learningPath(){
  if(window.dmTeacherPortalMode)return false;
  if(typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci)return false;
  try{const p=window.dmLearningRoute?.purpose;const v=typeof p==='function'?p():p;if(v)return v==='independent';}catch(e){}
  const needs=window.dmProgression?.status?.()?.startPath?.learningRoute==='needs-test';
  return yoObj()?.dmLearningPurpose==='independent'&&!needs;
 }
 function myLevel(){
  const sp=window.dmProgression?.status?.()?.startPath||{};
  const v=String(sp.startCefr||sp.testLevel||'A1').toUpperCase().slice(0,2);
  return LEVELS.some(l=>l[0]===v)?v:'A1';
 }
 /* ---- seviye havuzu ---- */
 const loading={};
 function loadTopic(code){
  const key='DijiTopicGames'+code;
  if(Array.isArray(window[key]))return Promise.resolve(window[key]);
  if(loading[code])return loading[code];
  return loading[code]=new Promise(res=>{
   const s=document.createElement('script');s.src='konu-oyunlari-'+code.toLowerCase()+'.js?v=20261111-gl';s.async=true;
   s.onload=()=>res(window[key]||[]);s.onerror=()=>{delete loading[code];res([]);};document.head.append(s);
  });
 }
 async function levelWords(code,grade){
  const sources=code==='A1'?['A1']:code==='A2'?['A2']:['A1','A2'];  /* B1/B2: şimdilik A1+A2 */
  const out=[],seen=new Set();
  for(const c of sources){
   for(const topic of await loadTopic(c)){
    if(topic?.type!=='vocab')continue;
    for(const it of topic.items||[]){
     const en=String(it.en||'').trim(),tr=String(it.tr||'').trim();
     if(!en||!tr||seen.has(en.toLowerCase()))continue;seen.add(en.toLowerCase());
     out.push({ingilizce:en,turkce:tr,en,tr,icon:it.icon||'',sinif:grade,unite:1,unit_name:code+' kelimeleri',seviye:code,dmLevelPool:true});
    }
   }
  }
  return out;
 }
 let swapped=null; /* {original, words, prefix} */
 function restorePool(){
  if(!swapped)return;
  if(window.masterKelimeHavuzu===swapped.words)window.masterKelimeHavuzu=swapped.original;
  swapped=null;
 }
 function unitTitle(grade,unit){
  const pool=swapped?swapped.original:window.masterKelimeHavuzu;
  for(const w of pool||[])if(Number(w.sinif)===grade&&Number(w.unite)===unit){const t=String(w.unit_name||w.unit_title||'').trim();if(t)return t;}
  return '';
 }
 /* ---- arayüz ---- */
 const state={};
 function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
 function heroFor(prefix,title,learn){
  const hero=el('div','gl-hero');
  hero.innerHTML='<div class="gl-stars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>'+
   '<div class="gl-papi" role="img" aria-label="Papi"><span class="gl-glow" aria-hidden="true"></span>'+SVG+'</div>'+
   '<h2 class="gl-title"></h2><span class="gl-path"></span>'+
   '<div class="gl-rules"><span>Doğru <b>+100</b></span><span>Yanlış <b>−40</b></span><span>Tur <b>−3 XP</b></span></div>';
  hero.querySelector('.gl-title').textContent=title;
  return hero;
 }
 function levelsFor(prefix){
  const box=el('div','gl-levels');box.setAttribute('role','group');box.setAttribute('aria-label','Seviye seç');
  const mine=myLevel();
  for(const [code,name] of LEVELS){
   const b=el('button','gl-level gl-level-'+code.toLowerCase());b.type='button';b.dataset.level=code;
   b.innerHTML=(code===mine?'<span class="gl-mine">Senin seviyen</span>':'')+'<b>'+code+'</b><span>'+name+'</span>';
   b.setAttribute('aria-pressed','false');
   b.onclick=()=>pickLevel(prefix,code);
   box.append(b);
  }
  const note=el('p','gl-note','Sorular seçtiğin seviyenin kelime havuzundan gelir.');
  const wrap=el('div','gl-level-wrap');wrap.append(box,note);return wrap;
 }
 async function pickLevel(prefix,code){
  const entry=document.getElementById(prefix+'GirisEkrani');if(!entry)return;
  const s=state[prefix];s.level=code;
  entry.querySelectorAll('.gl-level').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.level===code)));
  const play=entry.querySelector(':scope > .btn-giris, .btn-giris');if(play)play.disabled=true;
  const grade=(LEVELS.find(l=>l[0]===code)||LEVELS[0])[2];
  const words=await levelWords(code,grade);
  if(s.level!==code)return;
  if(play)play.disabled=false;
  if(words.length<3){window.yoToast?.('Bu seviyenin kelimeleri yüklenemedi. İnterneti kontrol edip tekrar dene.');return;}
  restorePool();
  swapped={original:window.masterKelimeHavuzu,words,prefix};
  window.masterKelimeHavuzu=words;
  /* Oyunun kendi sınıf düğmesine basılır: üniteler havuzdan yeniden kurulur, tek "ünite" seçili gelir. */
  const btn=[...document.querySelectorAll('#'+prefix+'SinifGrid .sinif-btn')].find(b=>Number((b.dataset.glGrade||b.textContent).match(/\d+/)?.[0])===grade);
  btn?.click();
 }
 function decorate(prefix,rootId,title,levelOk){
  const entry=document.getElementById(prefix+'GirisEkrani'),root=document.getElementById(rootId);
  if(!entry||!root)return;
  const learn=levelOk&&learningPath();
  let s=state[prefix];
  if(!s){
   s=state[prefix]={};
   root.classList.add('gl-root');entry.classList.add('gl-entry');
   entry.prepend(heroFor(prefix,title));
   const grid=document.getElementById(prefix+'SinifGrid'),units=document.getElementById(prefix+'UniteBox');
   grid?.parentElement?.classList.add('gl-sec','gl-grade-sec');
   units?.parentElement?.classList.add('gl-sec','gl-unit-sec');
   grid?.querySelectorAll('.sinif-btn').forEach(b=>{const n=(b.textContent.match(/\d+/)||[''])[0];if(!n)return;b.dataset.glGrade=n;b.setAttribute('aria-label',n+'. Sınıf');b.textContent=n;});
   const play=entry.querySelector('.btn-giris');
   if(play){play.classList.add('gl-play');s.playHtml=play.innerHTML;}
   if(levelOk){const lv=levelsFor(prefix);(units?.parentElement||entry.querySelector('.gl-hero')).after(lv);}
  }
  if(s.learn!==learn){
   s.learn=learn;
   entry.classList.toggle('gl-learn',learn);
   entry.querySelector('.gl-path').textContent=learn?'ÖĞRENME YOLUM · SEVİYENİ SEÇ':'OKUL YOLUM · SINIF VE ÜNİTE';
   const play=entry.querySelector('.gl-play');if(play)play.innerHTML=PLAY+'<span>OYNA</span>';
  }
  const open=entry.style.display!=='none'&&root.getClientRects().length>0;
  if(open&&learn&&!s.level){s.level='…';pickLevel(prefix,myLevel());}
  if(!root.getClientRects().length&&swapped?.prefix===prefix){restorePool();s.level=null;entry.querySelectorAll('.gl-level').forEach(b=>b.setAttribute('aria-pressed','false'));}
  /* Okul yolunda ünite düğmelerine onay işareti ve renk sırası */
  const grade=Number(document.querySelector('#'+prefix+'SinifGrid .sinif-btn.active')?.dataset.glGrade)||0;
  entry.querySelectorAll('.unite-chip').forEach((c,i)=>{
   if(c.dataset.glTone!==String(i%4))c.dataset.glTone=String(i%4);
   const on=String(c.classList.contains('selected'));if(c.getAttribute('aria-pressed')!==on)c.setAttribute('aria-pressed',on);
   if(!c.dataset.unitNumber){const n=Number((c.textContent.match(/\d+/)||[])[0]);if(n){for(const node of [...c.childNodes]){if(node.nodeType===3&&node.textContent.trim()){const sp=document.createElement('span');node.before(sp);sp.append(node);}}c.dataset.unitNumber=String(n);const t=unitTitle(grade,n);c.dataset.unitTitle=t||(n+'. Ünite');c.setAttribute('aria-label',n+'. Ünite'+(t?' · '+t:''));}}
  });
  const mine=myLevel();
  entry.querySelectorAll('.gl-level').forEach(b=>{const has=!!b.querySelector('.gl-mine');if((b.dataset.level===mine)!==has){if(has)b.querySelector('.gl-mine').remove();else b.insertAdjacentHTML('afterbegin','<span class="gl-mine">Senin seviyen</span>');}});
 }
 /* ---- Kulak Dedektifi / Cümle Ustası (#dmGameIntro) ve Harf Bahçesi: aynı hb-card yapısı ---- */
 const INTRO={dikte:'Kulak Dedektifi',cumle:'Cümle Ustası'};
 const HB=[
  {id:'dmGameIntro',key:ov=>{const t=ov.querySelector('#dmIntroTitle')?.textContent||'';return Object.keys(INTRO).find(k=>INTRO[k]===t)||'';},title:k=>INTRO[k],levels:k=>k==='dikte',classes:'#dmIntroClasses',units:'#dmIntroUnits',after:'[data-units]',keep:()=>document.getElementById('yoModal')?.classList.contains('acik')},
  {id:'harfBahcesiOverlay',key:()=>'harf',title:()=>'Harf Bahçesi',levels:()=>true,classes:'#hbClasses',units:'#hbUnits',after:'#hbUnits',keep:()=>false}
 ];
 const hbState={};
 function wrapUnitChip(c,grade){
  if(c.dataset.unitNumber)return;
  const n=Number(c.dataset.unit||c.querySelector('input')?.value||(c.textContent.match(/\d+/)||[])[0]);if(!n)return;
  for(const node of [...c.childNodes]){if(node.nodeType===3&&node.textContent.trim()){const sp=document.createElement('span');node.before(sp);sp.append(node);}}
  c.dataset.unitNumber=String(n);const t=unitTitle(grade,n);c.dataset.unitTitle=t||(n+'. Ünite');c.setAttribute('aria-label',n+'. Ünite'+(t?' · '+t:''));
 }
 function decorateHb(cfg){
  const ov=document.getElementById(cfg.id),pre='hb-'+cfg.id;
  if(!ov){if(hbState[cfg.id]&&swapped?.prefix===pre&&!cfg.keep())restorePool();if(swapped?.prefix!==pre)delete hbState[cfg.id];return;}
  const key=cfg.key(ov);if(!key)return;
  const body=ov.querySelector('.hb-body');if(!body)return;
  const levelOk=cfg.levels(key),learn=levelOk&&learningPath();
  if(!ov.querySelector(cfg.classes)){return;} /* oyun ekranı açık: kurulum değil */
  if(body.dataset.gl!=='1'){
   body.dataset.gl='1';const st=hbState[cfg.id]={level:null};
   ov.classList.add('gl-intro');body.classList.add('gl-entry');
   body.prepend(heroFor(pre,cfg.title(key)));
   const heads=[...body.querySelectorAll(':scope>h3')];
   heads[0]?.classList.add('gl-grade-sec');heads[1]?.classList.add('gl-unit-sec');
   ov.querySelector(cfg.classes)?.classList.add('gl-grade-sec','sinif-secim-grid');
   ov.querySelector(cfg.after)?.classList.add('gl-unit-sec');
   ov.querySelectorAll(cfg.classes+' .sinif-btn').forEach(b=>{const n=b.dataset.class||(b.textContent.match(/\d+/)||[''])[0];if(!n)return;b.dataset.glGrade=n;b.setAttribute('aria-label',n+'. Sınıf');b.textContent=n;});
   const play=ov.querySelector('[data-start]');if(play){play.classList.add('gl-play');play.innerHTML=PLAY+'<span>OYNA</span>';}
   if(levelOk){
    const lv=levelsFor(pre);ov.querySelector(cfg.after)?.after(lv);
    lv.querySelectorAll('.gl-level').forEach(b=>{b.onclick=()=>pickHbLevel(cfg,ov,b.dataset.level);});
   }
   ov.querySelector('.gl-path').textContent=learn?'ÖĞRENME YOLUM · SEVİYENİ SEÇ':'OKUL YOLUM · SINIF VE ÜNİTE';
   body.classList.toggle('gl-learn',learn);
   if(learn)pickHbLevel(cfg,ov,myLevel());
  }
  const grade=Number(ov.querySelector(cfg.classes+' .sinif-btn.active')?.dataset.glGrade)||0;
  ov.querySelectorAll(cfg.units+' .unite-chip').forEach((c,i)=>{if(c.dataset.glTone!==String(i%4))c.dataset.glTone=String(i%4);wrapUnitChip(c,grade);});
  const mine=myLevel();
  body.querySelectorAll('.gl-level').forEach(b=>{const has=!!b.querySelector('.gl-mine');if((b.dataset.level===mine)!==has){if(has)b.querySelector('.gl-mine').remove();else b.insertAdjacentHTML('afterbegin','<span class="gl-mine">Senin seviyen</span>');}});
 }
 async function pickHbLevel(cfg,ov,code){
  const st=hbState[cfg.id];if(!st)return;st.level=code;
  ov.querySelectorAll('.gl-level').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.level===code)));
  const play=ov.querySelector('[data-start]');if(play)play.disabled=true;
  const grade=(LEVELS.find(l=>l[0]===code)||LEVELS[0])[2];
  const words=await levelWords(code,grade);
  if(!document.body.contains(ov)||hbState[cfg.id]?.level!==code)return;
  if(words.length<3){if(play)play.disabled=false;window.yoToast?.('Bu seviyenin kelimeleri yüklenemedi. İnterneti kontrol edip tekrar dene.');return;}
  restorePool();swapped={original:window.masterKelimeHavuzu,words,prefix:'hb-'+cfg.id};window.masterKelimeHavuzu=words;
  ov.querySelector(cfg.classes+' .sinif-btn[data-gl-grade="'+grade+'"]')?.click();
  if(play)play.disabled=false;
 }
 /* ---- Kendi kurulum ekranı olan oyunlar: Arcade kaplaması (okul yolu: sınıf + ünite) ----
    Meteor, Kelime Çarkı ve Kelime Rallisi kelimeleri sunucudan sınıf/üniteye göre seçer;
    Papi Kartları ve Kelime Gölü havuzu kurulumda sabitler. Bu oyunlarda seviye kipi yok. */
 const SKIN=[
  {root:'meteorGame',host:'.mt-setup',title:'Meteor Düellosu',grade:'#mtGrade',unit:'#mtUnit',play:'.mt-start',hide:'.mt-setup>img,.mt-setup>h2'},
  {root:'wordWheel',host:'.ww-body',need:'.ww-setup',title:'Kelime Çarkı',grade:'#wwGrade',unit:'#wwUnit',play:'.ww-main',hide:'.ww-body>.ww-papi,.ww-body>p:not([class])'},
  {root:'papiCards',host:'.pc-body',need:'.pc-setup',title:'Papi Kartları',grade:'#pcGrade',unit:'#pcUnit',play:'.pc-setup>.pc-start',hide:'.pc-body>.pc-setup-papi,.pc-body>.pc-sub'},
  {root:'kelimeGolu',host:'.kg-setup',title:'Kelime Gölü',grade:'[data-grade]',units:'[data-units]',unitItem:'.kg-unit',play:'[data-start]',hide:'.kg-preview'},
  {root:'rallyGame',host:'.rr-panel',need:'[data-class]',title:'Kelime Rallisi',grade:'[data-class]',units:'.rr-units',unitItem:'[data-unit]',play:'[data-start]',hide:'.rr-panel>.rr-setup-art,.rr-panel>h1,.rr-panel>h1+p'},
  {root:null,find:()=>document.querySelector('.dm-sr-setup')?.closest('.dm-sr-overlay'),host:'.dm-sr-setup',title:'Cümle Yarışı',grade:'[data-class]',units:'[data-units]',unitItem:'.dm-sr-unit',play:'[data-start]',hide:'.dm-sr-hero',sentences:true}
 ];
 function fire(sel){sel.dispatchEvent(new Event('change',{bubbles:true}));}
 function gradeMirror(host,sel){
  let box=host.querySelector('.gl-grade-mirror');
  const opts=[...sel.options].filter(o=>/\d/.test(o.value));
  const sig=opts.map(o=>o.value+(o.disabled?'x':'')).join(',');
  if(!box){box=el('div','gl-grade-mirror gl-grade-sec sinif-secim-grid');box.setAttribute('role','group');box.setAttribute('aria-label','Sınıf seç');const lab=sel.closest('label')||sel;lab.classList.add('gl-hidden');lab.before(box);}
  if(box.dataset.sig!==sig){
   box.dataset.sig=sig;box.style.setProperty('--gl-cols',String(Math.max(1,Math.min(8,opts.length))));
   box.replaceChildren(...opts.map(o=>{const b=el('button','sinif-btn',o.value);b.type='button';b.dataset.glGrade=o.value;b.disabled=o.disabled;b.setAttribute('aria-label',o.value+'. Sınıf');b.onclick=()=>{if(sel.value===o.value)return;sel.value=o.value;fire(sel);schedule();};return b;}));
  }
  box.querySelectorAll('.sinif-btn').forEach(b=>{const on=b.dataset.glGrade===sel.value;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
 }
 function unitMirror(host,sel,grade){
  let box=host.querySelector('.gl-unit-mirror');
  const opts=[...sel.options].filter(o=>/\d/.test(o.value));
  const sig=grade+':'+opts.map(o=>o.value).join(',');
  if(!box){box=el('div','gl-unit-mirror gl-unit-sec unite-secim-box');box.setAttribute('role','group');box.setAttribute('aria-label','Ünite seç');const lab=sel.closest('label')||sel;lab.classList.add('gl-hidden');lab.before(box);}
  if(box.dataset.sig!==sig){
   box.dataset.sig=sig;
   box.replaceChildren(...opts.map((o,i)=>{const b=el('button','unite-chip','<span>'+o.value+'. Ünite</span>');b.type='button';b.dataset.glTone=String(i%4);wrapUnitChip(b,grade);b.dataset.unitNumber=o.value;b.onclick=()=>{sel.value=o.value;fire(sel);schedule();};return b;}));
  }
  box.querySelectorAll('.unite-chip').forEach(b=>{const on=b.dataset.unitNumber===sel.value;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
 }
 function decorateSkin(cfg){
  const root=cfg.root?document.getElementById(cfg.root):cfg.find();if(!root)return;
  const host=root.querySelector(cfg.host);if(!host||(cfg.need&&!host.querySelector(cfg.need)))return;
  if(host.dataset.gl!=='1'){
   host.dataset.gl='1';root.classList.add('gl-skin');host.classList.add('gl-entry');
   const hero=heroFor('skin',cfg.title);hero.querySelector('.gl-rules')?.remove();hero.querySelector('.gl-path').textContent='SINIFINI VE ÜNİTENİ SEÇ';host.prepend(hero);
   if(cfg.hide)host.querySelectorAll(cfg.hide).forEach(x=>x.classList.add('gl-hidden'));
   const play=host.querySelector(cfg.play);if(play)play.classList.add('gl-play');
   if(cfg.units)host.querySelector(cfg.units)?.classList.add('unite-secim-box','gl-unit-sec');
   if(!host.dataset.glListen){host.dataset.glListen='1';host.addEventListener('change',schedule,true);host.addEventListener('click',()=>setTimeout(schedule,0),true);}
  }
  const gsel=host.querySelector(cfg.grade);
  if(gsel?.tagName==='SELECT')gradeMirror(host,gsel);
  const grade=Number(gsel?.value)||0;
  if(cfg.unit){const usel=host.querySelector(cfg.unit);if(usel)unitMirror(host,usel,grade);}
  if(cfg.units){
   host.querySelectorAll(cfg.units+' '+cfg.unitItem).forEach((c,i)=>{
    c.classList.add('unite-chip');if(c.dataset.glTone!==String(i%4))c.dataset.glTone=String(i%4);
    if(!cfg.sentences)wrapUnitChip(c,grade);
    const on=c.querySelector('input')?c.querySelector('input').checked:(c.getAttribute('aria-pressed')==='true'||c.classList.contains('selected'));
    c.classList.toggle('selected',on);
   });
  }
 }
 function run(){for(const g of GAMES)decorate(...g);for(const c of HB)decorateHb(c);for(const c of SKIN)decorateSkin(c);}
 let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;run();});};
 function start(){
  run();
  for(const [prefix,rootId] of GAMES){
   const entry=document.getElementById(prefix+'GirisEkrani'),root=document.getElementById(rootId);
   if(entry)new MutationObserver(schedule).observe(entry,{attributes:true,attributeFilter:['style','class'],childList:true,subtree:true});
   if(root)new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['style','class']});
  }
  new MutationObserver(schedule).observe(document.body,{childList:true});
  /* kendi kurulumu olan oyunlar ekranı innerHTML ile yeniden çizer */
  const GL_ROOTS='#meteorGame,#wordWheel,#papiCards,#kelimeGolu,#rallyGame,.dm-sr-overlay,#harfBahcesiOverlay,#dmGameIntro';
  new MutationObserver(muts=>{if(!document.querySelector(GL_ROOTS))return;for(const m of muts){const t=m.target;if(t.nodeType===1&&t.closest?.(GL_ROOTS)&&!t.closest('.gl-hero')){schedule();return;}}}).observe(document.body,{childList:true,subtree:true});
  const yoModal=document.getElementById('yoModal');if(yoModal)new MutationObserver(schedule).observe(yoModal,{attributes:true,attributeFilter:['class']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.dmGameLaunch={version:'20261111',restorePool,learningPath,myLevel};
})();
