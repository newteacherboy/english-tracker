/* [11 Kas 2026] Canlı Papi giriş animasyonu ("Papi 3D Giriş").
   Yönetici panelinden "Seçtiğim özel tasarım → Papi 3D Giriş" seçilince açılış ekranında oynar.
   Derin turkuaz zemin, Papi fırlar ve "Pa-pi!" der, 3D Diji Medu yazısı harf harf düşer, Papi sevinir.
   Ses Web Audio ile üretilir; cihaz otomatik sesi engellerse ilk dokunuşta çalar. */
(function(){
 'use strict';
 if(typeof window==='undefined'||window.dmPapiIntro)return;
 const IDS=['splashEkrani','dmBootSplash'];
 /* Oturum yükleme katmanı uygulama içinde sonradan açılır: animasyon baştan oynamasın, Papi son hâlinde beklesin. */
 const STATIC_IDS=['oturumYuklemeOverlay'];
 const SVG=`<svg class="pi-svg" viewBox="0 0 400 440" aria-hidden="true"><defs><radialGradient id="pib" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="#5FE3D5"/><stop offset=".55" stop-color="#22BFB2"/><stop offset="1" stop-color="#128E8F"/></radialGradient><linearGradient id="piw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1DAFA6"/><stop offset=".7" stop-color="#1688A3"/><stop offset="1" stop-color="#6A47E8"/></linearGradient><linearGradient id="pic" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5B33D6"/><stop offset="1" stop-color="#A47CFF"/></linearGradient><linearGradient id="pik" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC14D"/><stop offset="1" stop-color="#FF8A1C"/></linearGradient><radialGradient id="pig" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#D4FFF6"/><stop offset="1" stop-color="#8FE8DA"/></radialGradient><clipPath id="piL"><ellipse cx="168" cy="186" rx="25" ry="28"/></clipPath><clipPath id="piR"><ellipse cx="232" cy="186" rx="25" ry="28"/></clipPath></defs><ellipse class="p-shadow" cx="200" cy="372" rx="78" ry="11" fill="#1B1F3B" opacity=".12"/><g class="p-root"><g class="p-tilt"><g stroke="#FF9F1C" stroke-width="8" stroke-linecap="round" fill="none"><path d="M176 345 l-10 19 M176 345 l0 21 M176 345 l10 19"/><path d="M224 345 l-10 19 M224 345 l0 21 M224 345 l10 19"/></g><path d="M232 318 C 262 330, 282 352, 286 372 C 266 368, 246 352, 228 334 Z" fill="#6A47E8"/><path d="M222 324 C 246 342, 258 364, 258 384 C 240 374, 226 356, 214 336 Z" fill="#1688A3"/><g class="p-body"><g class="p-crest"><g class="p-crestIn"><path d="M186 124 C 168 104, 156 84, 154 64 C 172 72, 190 94, 198 120 Z" fill="#6236D9"/><path d="M214 120 C 226 98, 240 84, 254 76 C 250 96, 236 114, 220 126 Z" fill="#6236D9"/><path d="M190 124 C 182 92, 190 58, 206 38 C 216 64, 216 98, 210 124 Z" fill="url(#pic)"/><path d="M203 52 C 198 72, 198 92, 201 110" stroke="#C9B3FF" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/></g></g><path d="M200 110 C 264 110, 294 150, 294 210 L 292 272 C 290 322, 254 348, 200 348 C 146 348, 110 322, 108 272 L 106 210 C 106 150, 136 110, 200 110 Z" fill="url(#pib)"/><path d="M200 236 C 242 236, 264 268, 260 302 C 256 332, 232 344, 200 344 C 168 344, 144 332, 140 302 C 136 268, 158 236, 200 236 Z" fill="url(#pig)"/><path d="M172 276 q10 8 20 0 M208 276 q10 8 20 0 M188 300 q12 9 24 0 M164 304 q8 7 16 0 M220 304 q8 7 16 0" stroke="#5FCFC0" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/><ellipse cx="200" cy="190" rx="82" ry="50" fill="#C9FFF4" opacity=".55"/><path d="M146 140 C 160 126, 178 120, 194 120" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".45"/><g class="p-eyeOpen"><ellipse cx="168" cy="186" rx="25" ry="28" fill="#fff"/><g class="p-pupil"><circle cx="171" cy="190" r="13" fill="#1B1F3B"/><circle cx="176" cy="184" r="4.8" fill="#fff"/><circle cx="166" cy="196" r="2" fill="#fff"/></g><g clip-path="url(#piL)"><rect class="p-lid" x="140" y="100" width="56" height="58" fill="#1FB3A6"/></g></g><g class="p-eyeOpen"><ellipse cx="232" cy="186" rx="25" ry="28" fill="#fff"/><g class="p-pupil"><circle cx="235" cy="190" r="13" fill="#1B1F3B"/><circle cx="240" cy="184" r="4.8" fill="#fff"/><circle cx="230" cy="196" r="2" fill="#fff"/></g><g clip-path="url(#piR)"><rect class="p-lid" x="204" y="100" width="56" height="58" fill="#1FB3A6"/></g></g><g class="p-eyeHappy" stroke="#1B1F3B" stroke-width="7" stroke-linecap="round" fill="none"><path d="M148 196 Q168 170 188 196"/><path d="M212 196 Q232 170 252 196"/></g><g class="p-eyeClosed" stroke="#1B1F3B" stroke-width="6" stroke-linecap="round" fill="none"><path d="M148 190 Q168 204 188 190"/><path d="M212 190 Q232 204 252 190"/></g><path class="p-brow p-browL" d="M146 152 Q166 141 186 149" stroke="#6236D9" stroke-width="8" stroke-linecap="round" fill="none"/><path class="p-brow p-browR" d="M214 149 Q234 141 254 152" stroke="#6236D9" stroke-width="8" stroke-linecap="round" fill="none"/><ellipse class="p-cheek" cx="138" cy="224" rx="13" ry="8" fill="#FF7AA8" opacity=".45"/><ellipse class="p-cheek" cx="262" cy="224" rx="13" ry="8" fill="#FF7AA8" opacity=".45"/><ellipse class="p-mouth" cx="200" cy="234" rx="13" ry="9" fill="#7A2340"/><path class="p-jaw" d="M185 226 C 190 248, 210 248, 215 226 C 208 232, 192 232, 185 226 Z" fill="#E0730A"/><path d="M181 207 C 188 197, 212 197, 219 207 C 227 220, 220 240, 204 250 C 199 253, 195 249, 197 243 C 192 232, 183 221, 181 207 Z" fill="url(#pik)"/><path d="M190 206 C 196 202, 206 202, 210 206" stroke="#FFE2A8" stroke-width="4" stroke-linecap="round" fill="none"/><g class="p-glasses"><rect x="128" y="168" width="144" height="10" fill="#111"/><path d="M138 178 h56 v18 h-8 v8 h-40 v-8 h-8 Z" fill="#111"/><path d="M206 178 h56 v18 h-8 v8 h-40 v-8 h-8 Z" fill="#111"/><g fill="#fff"><rect x="148" y="182" width="8" height="8"/><rect x="156" y="190" width="8" height="8"/><rect x="216" y="182" width="8" height="8"/><rect x="224" y="190" width="8" height="8"/></g></g></g><g class="p-wingL"><path d="M122 210 C 90 214, 76 252, 82 288 C 86 306, 106 306, 114 292 C 122 272, 128 240, 122 210 Z" fill="url(#piw)"/><path d="M100 250 q8 10 18 8 M94 272 q8 9 18 6" stroke="#0F7A86" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/></g><g class="p-wingR"><path d="M278 210 C 310 214, 324 252, 318 288 C 314 306, 294 306, 286 292 C 278 272, 272 240, 278 210 Z" fill="url(#piw)"/><path d="M300 250 q-8 10 -18 8 M306 272 q-8 9 -18 6" stroke="#0F7A86" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/></g></g></g><g class="p-fx p-sparkles" fill="#FFC93C"><path d="M70 120 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6 Z"/><path style="animation-delay:.25s" d="M330 100 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5 Z"/><path style="animation-delay:.5s" fill="#A47CFF" d="M346 250 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z"/><path style="animation-delay:.4s" fill="#A47CFF" d="M54 260 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z"/></g><g class="p-fx p-exclaim"><text x="300" y="110" font-family="Nunito,system-ui,sans-serif" font-weight="900" font-size="58" fill="#FF6B4A">!</text></g><path class="p-fx p-tear" d="M150 214 C 150 214, 140 228, 140 234 a10 10 0 0 0 20 0 C 160 228, 150 214, 150 214 Z" fill="#7FD3FF"/><path class="p-fx p-heart" d="M330 170 c-8 -12 -26 -6 -24 8 c2 10 14 18 24 26 c10 -8 22 -16 24 -26 c2 -14 -16 -20 -24 -8 Z" fill="#FF5C8A"/><g class="p-fx p-question" font-family="Nunito,system-ui,sans-serif" font-weight="900" fill="#7C4DFF"><text x="292" y="110" font-size="46">?</text><text x="322" y="78" font-size="30">?</text></g><g class="p-fx p-zzz" font-family="Nunito,system-ui,sans-serif" font-weight="900" fill="#5A31CC"><text x="270" y="120" font-size="30">Z</text><text x="270" y="120" font-size="24">z</text><text x="270" y="120" font-size="20">z</text></g><g class="p-fx p-confetti"><rect x="80" y="40" width="10" height="16" rx="2" fill="#FFC93C"/><rect x="140" y="20" width="10" height="16" rx="2" fill="#7C4DFF" style="animation-delay:.3s"/><rect x="250" y="30" width="10" height="16" rx="2" fill="#FF5C8A" style="animation-delay:.6s"/><rect x="320" y="50" width="10" height="16" rx="2" fill="#2EC4B6" style="animation-delay:.15s"/><rect x="200" y="10" width="10" height="16" rx="2" fill="#FF9F1C" style="animation-delay:.9s"/><rect x="40" y="90" width="10" height="16" rx="2" fill="#2EC4B6" style="animation-delay:1.1s"/><rect x="350" y="110" width="10" height="16" rx="2" fill="#FFC93C" style="animation-delay:.45s"/></g></svg>`;
 const CSS=`
/* A tiny offline runner inside the existing opening screen. */
.pi-papi[role="button"]{pointer-events:auto;cursor:pointer;touch-action:manipulation}
.pi-papi[role="button"]:focus-visible,.pi-runway:focus-visible{outline:2px solid #a6fff0;outline-offset:5px;border-radius:16px}
.pi-runway[hidden],.pi-play-hint[hidden],.pi-enter[hidden],#dmBootRetry[hidden]{display:none!important}
.pi-play-hint{font:500 12px/1.4 system-ui,sans-serif;color:#b3dfdc;margin:8px 0 0;text-align:center}
.pi-wait-controls{display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:24px;pointer-events:auto}
.pi-wait-status:empty{display:none}
.pi-wait-status{font:500 14px/1.4 system-ui,sans-serif;color:#c0e7e3;text-align:center;margin:0}
html.dm-papi-intro #dmBootSplash #dmBootRetry,.pi-enter{position:static;margin:0;padding:11px 22px;min-height:44px;border:1px solid #b0f7ed;border-radius:13px;background:transparent;color:#d4fff7;font:600 14px system-ui,sans-serif;cursor:pointer;pointer-events:auto}
.pi-enter{background:#b0f7ed;color:#0a5560}
.pi-playing .pi-stage{width:min(88vw,420px);transform:translateY(-2vh)}
.pi-runway{position:relative;width:100%;height:170px;pointer-events:auto;touch-action:manipulation;cursor:pointer;overflow:hidden;color:#b0f7ed;user-select:none;-webkit-user-select:none}
.pi-ground{position:absolute;left:0;right:0;bottom:9px;height:1.5px;background:currentColor}
.pi-score{position:absolute;right:5px;top:5px;font:500 15px/1 monospace;letter-spacing:2px}
.pi-playing .pi-papi{position:absolute;left:16px;bottom:-10px;width:100px;aspect-ratio:400/440;pointer-events:none;will-change:transform}
.pi-playing .pi-glow{display:none}
.pi-playing .pi-svg *{animation:none!important}
.pi-playing .pi-svg .p-root,.pi-playing .pi-svg .p-shadow,.pi-playing .pi-svg .p-body,.pi-playing .pi-svg .p-crest,.pi-playing .pi-svg .p-crestIn{transform:none!important}
.pi-playing .pi-svg .p-eyeOpen{opacity:1!important}
.pi-playing .pi-svg .p-lid,.pi-playing .pi-svg .p-eyeHappy,.pi-playing .pi-svg .p-eyeClosed,.pi-playing .pi-svg .p-fx,.pi-playing .pi-svg .p-glasses{opacity:0!important}
.pi-obstacle{position:absolute;left:0;bottom:10px;width:18px;height:26px;box-sizing:border-box;border:2px solid currentColor;border-radius:3px 3px 0 0;will-change:transform}
.pi-obstacle:after{content:'';position:absolute;left:5px;top:4px;height:7px;border-left:2px solid currentColor}
.pi-game-over .pi-papi{filter:brightness(.85)}
.pi-playing .pi-word{font-size:min(13vw,52px);margin-top:25px}
@media(max-height:500px){.pi-playing .pi-stage{transform:none}.pi-playing .pi-runway{height:120px}.pi-playing .pi-word{font-size:32px;margin-top:12px}.pi-playing .pi-wait-controls{margin-top:12px;gap:8px}.pi-playing .pi-play-hint{margin-top:4px}}

html.dm-papi-intro :is(#splashEkrani,#dmBootSplash,#oturumYuklemeOverlay){background:#0A5560!important;overflow:hidden!important;isolation:isolate}
html.dm-papi-intro :is(#splashEkrani,#dmBootSplash,#oturumYuklemeOverlay)>:not(.pi-wrap):not(#dmBootRetry){opacity:0!important;pointer-events:none!important}
html.dm-papi-intro .dm-republic-footer{display:none!important}
/* Açılışta oturum yükleme katmanı da açılır ve normalde üstte durur: animasyon bitene kadar açılış ekranı en üstte kalsın */
html.dm-papi-intro:not(.dm-papi-booted) #dmBootSplash{z-index:2147483646!important}
.pi-wrap{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;pointer-events:none;font-family:ui-rounded,"SF Pro Rounded",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
.pi-stage{display:flex;flex-direction:column;align-items:center;transform:translateY(-4vh)}
.pi-papi{position:relative;width:min(64vw,290px);aspect-ratio:400/440}
.pi-glow{position:absolute;inset:6% 4% 2%;border-radius:50%;background:radial-gradient(closest-side,rgba(126,255,232,.28),rgba(126,255,232,0));opacity:0;animation:piGlow .5s ease-out 1.1s forwards}
.pi-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.pi-svg *{transform-box:fill-box}
.pi-svg .p-root,.pi-svg .p-body,.pi-svg .p-crest,.pi-svg .p-crestIn{transform-origin:50% 100%}
.pi-svg .p-wingL{transform-origin:100% 0%}.pi-svg .p-wingR{transform-origin:0% 0%}
.pi-svg .p-shadow,.pi-svg .p-pupil{transform-origin:50% 50%}
.pi-svg .p-mouth{transform-origin:50% 0%;transform:scaleY(0)}
.pi-svg .p-eyeClosed,.pi-svg .p-glasses,.pi-svg .p-fx{opacity:0}
.pi-svg .p-eyeHappy{opacity:0}
.pi-svg *{animation-fill-mode:both;animation-timing-function:ease-in-out}
.pi-svg .p-root{animation:piPop 3.4s both}
.pi-svg .p-shadow{animation:piShadow 3.4s both}
.pi-svg .p-crestIn{animation:piCrest 3.4s both}
.pi-svg .p-crest{animation:piSway 3s ease-in-out 3.4s infinite}
.pi-svg .p-body{animation:piBreathe 3.2s ease-in-out 3.4s infinite}
.pi-svg .p-pupil{animation:piLook 3.4s both}
.pi-svg .p-eyeOpen{animation:piEyeOpen 3.4s both}
.pi-svg .p-eyeHappy{animation:piEyeHappy 3.4s both}
.pi-svg .p-lid{animation:piBlink 3.4s both}
.pi-svg .p-wingL{animation:piWingL 3.4s both}
.pi-svg .p-wingR{animation:piWingR 3.4s both}
.pi-svg .p-jaw{animation:piJaw 3.4s both}
.pi-svg .p-mouth{animation:piMouth 3.4s both}
.pi-svg .p-cheek{animation:piCheek 3.4s both}
.pi-svg .p-sparkles{animation:piSpark 3.4s both}
.pi-svg .p-sparkles path{animation:piSparkPop .8s ease-out 2.2s 3 both}
.pi-word{display:flex;align-items:center;gap:.18em;margin-top:2.4vh;font-size:min(15vw,58px);font-weight:800;line-height:1;white-space:nowrap;font-family:"Baloo 2",ui-rounded,"SF Pro Rounded",system-ui,sans-serif}
/* [12 Kas 2026] Marka yazısı · "Mor etiket": Diji mor etiketin içinde, Medu beyaz (kullanıcı seçti) */
.pi-word .pi-tag{display:inline-flex;padding:.12em .28em .02em;border-radius:.38em;background:#6D3FD0;box-shadow:0 .1em 0 #45238F;transform-origin:50% 60%;animation:piTag .5s cubic-bezier(.34,1.56,.64,1) .92s both}
.pi-word .pi-plain{text-shadow:0 .09em 0 #063B43}
@keyframes piTag{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}
.pi-static *{animation-delay:-3.4s!important}
.pi-static .pi-svg .p-crest,.pi-static .pi-svg .p-body{animation-delay:0s!important}
.pi-word i{font-style:normal;display:inline-block;opacity:0;animation:piLtr .55s cubic-bezier(.34,1.56,.64,1) both}
@keyframes piPop{0%{transform:scale(0) rotate(-25deg)}14%{transform:scale(1.14,1.08) rotate(6deg)}20%{transform:scale(.96) rotate(-2deg)}25%{transform:scale(1) rotate(0)}64%{transform:translateY(0)}70%{transform:translateY(-34px) scale(.96,1.05)}76%{transform:translateY(0) scale(1.06,.94)}81%{transform:translateY(-14px)}86%,100%{transform:translateY(0) scale(1)}}
@keyframes piShadow{0%{transform:scale(0);opacity:0}14%,64%{transform:scale(1);opacity:.25}70%{transform:scale(.7)}76%{transform:scale(1.05)}81%{transform:scale(.85)}86%,100%{transform:scale(1);opacity:.25}}
@keyframes piCrest{0%,14%{transform:scale(1,.6)}21%{transform:scale(1,1.35)}27%{transform:scale(1,.9)}32%,64%{transform:scale(1,1)}70%{transform:scale(1.12,1.3)}86%,100%{transform:scale(1.05,1.1)}}
@keyframes piSway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes piBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.015,1.03)}}
@keyframes piLook{0%,34%{transform:translate(0,0)}38%,45%{transform:translate(-7px,2px)}49%,56%{transform:translate(7px,2px)}60%,100%{transform:translate(0,0)}}
@keyframes piEyeOpen{0%,64%{opacity:1}66%,100%{opacity:0}}
@keyframes piEyeHappy{0%,64%{opacity:0}66%,100%{opacity:1}}
@keyframes piBlink{0%,29%{transform:translateY(0)}31%{transform:translateY(58px)}33%,100%{transform:translateY(0)}}
@keyframes piWingL{0%,64%{transform:rotate(0)}70%{transform:rotate(55deg)}76%{transform:rotate(15deg)}81%{transform:rotate(45deg)}88%,100%{transform:rotate(20deg)}}
@keyframes piWingR{0%,64%{transform:rotate(0)}70%{transform:rotate(-55deg)}76%{transform:rotate(-15deg)}81%{transform:rotate(-45deg)}88%,100%{transform:rotate(-20deg)}}
@keyframes piJaw{0%,9%{transform:translateY(0)}11%{transform:translateY(8px)}14%{transform:translateY(2px)}17%{transform:translateY(9px)}22%,64%{transform:translateY(0)}70%,100%{transform:translateY(8px)}}
@keyframes piMouth{0%,9%{transform:scaleY(0)}11%{transform:scaleY(1)}14%{transform:scaleY(.2)}17%{transform:scaleY(1.2)}22%,64%{transform:scaleY(0)}70%,100%{transform:scaleY(1.1)}}
@keyframes piCheek{0%,64%{opacity:.45}70%,100%{opacity:.8}}
@keyframes piSpark{0%,65%{opacity:0}68%,100%{opacity:1}}
@keyframes piSparkPop{0%{transform:scale(0) rotate(0)}50%{transform:scale(1.2) rotate(45deg)}100%{transform:scale(0) rotate(90deg)}}
@keyframes piLtr{0%{opacity:0;transform:translateY(-70px) rotate(-12deg)}60%{opacity:1;transform:translateY(6px) rotate(4deg) scale(1.05,.92)}100%{opacity:1;transform:none}}
@keyframes piGlow{to{opacity:1}}
@media (prefers-reduced-motion:reduce){.pi-wrap *{animation-duration:.01s!important;animation-delay:0s!important;animation-iteration-count:1!important}}
`;
 function letters(word,color,start){return word.split('').map((ch,k)=>'<i style="color:'+color+';animation-delay:'+(1+(start+k)*0.08).toFixed(2)+'s">'+ch+'</i>').join('');}
 const MARKUP='<div class="pi-wrap" aria-hidden="true"><div class="pi-stage"><div class="pi-papi"><div class="pi-glow"></div>'+SVG+'</div><div class="pi-word"><span class="pi-tag">'+letters('Diji','#FFFFFF',0)+'</span><span class="pi-plain">'+letters('Medu','#FFFFFF',4)+'</span></div></div></div>';
 let active=false,observer=null,soundDone=false,ac=null;
 function css(){if(document.getElementById('dmPapiIntroCss'))return;const s=document.createElement('style');s.id='dmPapiIntroCss';s.textContent=CSS;(document.head||document.documentElement).appendChild(s);}
 /* ---- ses: "Pa-pi!" çağrısı ve sevinç cıvıltısı ---- */
 function ctx(){try{if(!ac){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;ac=new AC();}if(ac.state==='suspended')ac.resume().catch(()=>{});return ac;}catch(_){return null;}}
 function chirp(c,at,f0,f1,dur,vol){const t=c.currentTime+at,o=c.createOscillator(),g=c.createGain(),bp=c.createBiquadFilter(),l=c.createOscillator(),lg=c.createGain();
  o.type='sawtooth';bp.type='bandpass';bp.frequency.value=2300;bp.Q.value=3.5;
  o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur*.7);o.frequency.exponentialRampToValueAtTime(f1*.9,t+dur);
  l.frequency.value=38;lg.gain.value=f0*.06;l.connect(lg);lg.connect(o.frequency);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(bp);bp.connect(g);g.connect(c.destination);o.start(t);l.start(t);o.stop(t+dur+.05);l.stop(t+dur+.05);}
 function play(offset){
  if(soundDone)return;const c=ctx();if(!c||c.state!=='running')return false;soundDone=true;
  const call=Math.max(0,.33-offset),trill=Math.max(0,2.3-offset);
  if(offset<.6){chirp(c,call,620,900,.17,.45);chirp(c,call+.2,980,1550,.24,.5);}
  if(offset<2.6)[0,.11,.22,.33].forEach((d,i)=>chirp(c,trill+d,1100+i*120,1700+i*150,.09,.35));
  return true;
 }
 let startedAt=0;
 function trySound(){
  const c=ctx();if(!c)return;
  const go=()=>{if(!active)return;play((performance.now()-startedAt)/1000);};
  if(c.state==='running'){go();return;}
  c.resume().then(go).catch(()=>{});
  /* Otomatik ses engellenirse ilk dokunuşta */
  const once=()=>{window.removeEventListener('pointerdown',once,true);ctx();setTimeout(go,30);};
  window.addEventListener('pointerdown',once,true);
 }
 /* The waiting game uses the very same Papi SVG. No network, game API or rewards. */
 let waitGame=null;
 function mountWaitGame(el){
  if(el.id!=='dmBootSplash'||waitGame)return;
  const wrap=el.querySelector('.pi-wrap'),stage=wrap.querySelector('.pi-stage'),papi=stage.querySelector('.pi-papi');
  wrap.removeAttribute('aria-hidden');
  papi.setAttribute('role','button');papi.setAttribute('tabindex','0');papi.setAttribute('aria-label','Beklerken Papi ile oyna');
  const runway=document.createElement('div');runway.className='pi-runway';runway.hidden=true;
  runway.innerHTML='<span class="pi-score" aria-label="Skor">00000</span><span class="pi-ground" aria-hidden="true"></span><span class="pi-obstacle" aria-hidden="true"></span>';
  stage.insertBefore(runway,papi);
  const hint=document.createElement('p');hint.className='pi-play-hint';hint.hidden=true;hint.textContent='Beklerken Papi’ye dokun';stage.insertBefore(hint,stage.querySelector('.pi-word'));
  const controls=document.createElement('div');controls.className='pi-wait-controls';controls.innerHTML='<p class="pi-wait-status" role="status"></p><button type="button" class="pi-enter" hidden>Uygulamaya Geç</button>';
  stage.appendChild(controls);
  const retry=el.querySelector('#dmBootRetry');if(retry)controls.appendChild(retry);
  const status=controls.querySelector('.pi-wait-status'),enter=controls.querySelector('.pi-enter'),obstacle=runway.querySelector('.pi-obstacle'),scoreEl=runway.querySelector('.pi-score');
  let playing=false,ready=false,released=false,destroyed=false,over=false,frame=0,last=0,y=0,vy=0,x=420,distance=0,best=0,width=360,obstacleHeight=26,callback=null;
  try{best=Number(localStorage.getItem('dm_papi_wait_best'))||0;}catch(_){}
  function message(){if(!playing){status.textContent=navigator.onLine===false?'İnternet bağlantısı bekleniyor…':'';if(navigator.onLine===false&&retry){retry.hidden=false;hint.hidden=false;}return;}status.textContent=ready?'Hazırız! Uygulamaya geçebilirsin.':navigator.onLine===false?'İnternet bağlantısı bekleniyor…':'Uygulama hazırlanıyor…';}
  function measure(){width=runway.clientWidth||Math.min(innerWidth*.88,420);}
  function paint(){papi.style.transform='translateY('+(-y).toFixed(2)+'px)';obstacle.style.transform='translateX('+x.toFixed(2)+'px)';obstacle.style.height=obstacleHeight+'px';scoreEl.textContent=String(Math.floor(distance/12)).padStart(5,'0');}
  function saveBest(){const score=Math.floor(distance/12);if(score>best){best=score;try{localStorage.setItem('dm_papi_wait_best',String(best));}catch(_){}}scoreEl.title='En iyi: '+best;}
  function tick(now){
   frame=0;if(destroyed)return;if(!el.isConnected){destroy();return;}
   if(document.hidden){last=0;return;}
   const dt=last?Math.min((now-last)/1000,.032):0;last=now;
   if(!over){
    const speed=Math.min(300,180+distance/350);distance+=speed*dt;x-=speed*dt;vy-=1100*dt;y=Math.max(0,y+vy*dt);if(y===0)vy=0;
    // Collision bounds follow Papi's body/feet, excluding the large SVG margins/crest.
    if(x<82&&x+18>45&&y<obstacleHeight-5){over=true;saveBest();hint.textContent='Bir daha oynamak için dokun';hint.hidden=false;runway.classList.add('pi-game-over');}
    if(x < -25){x=width+100+Math.random()*110;obstacleHeight=22+Math.floor(Math.random()*13);}
    paint();
   }
   if(!over)frame=requestAnimationFrame(tick);
  }
  function schedule(){if(!frame&&!document.hidden&&!over&&!destroyed){last=0;frame=requestAnimationFrame(tick);}}
  function jump(){if(!playing||destroyed)return;if(over){over=false;distance=0;x=width+80;y=0;vy=0;runway.classList.remove('pi-game-over');hint.textContent='Zıplamak için dokun';}if(y===0)vy=440;schedule();}
  function start(){if(destroyed)return;if(playing)return;playing=true;wrap.classList.add('pi-playing');runway.hidden=false;runway.appendChild(papi);papi.removeAttribute('role');papi.removeAttribute('tabindex');papi.removeAttribute('aria-label');runway.setAttribute('role','button');runway.setAttribute('tabindex','0');runway.setAttribute('aria-label','Zıplamak için dokun. Boşluk veya yukarı ok tuşuyla da oynayabilirsin.');hint.hidden=false;hint.textContent='Zıplamak için dokun';if(retry)retry.hidden=false;measure();x=width+100;message();paint();jump();runway.focus({preventScroll:true});}
  function pointer(e){if(playing){e.preventDefault();jump();}}
  function key(e){if(!playing||!['Space','ArrowUp','Enter'].includes(e.code)||e.repeat||e.target.closest?.('.pi-wait-controls'))return;e.preventDefault();jump();}
  function initialKey(e){if(!playing&&['Enter','Space'].includes(e.code)){e.preventDefault();start();}}
  function visibility(){if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}else if(playing)schedule();}
  function destroy(){if(destroyed)return;destroyed=true;saveBest();clearTimeout(hintTimer);if(frame)cancelAnimationFrame(frame);frame=0;window.removeEventListener('keydown',key);window.removeEventListener('resize',measure);window.removeEventListener('online',message);window.removeEventListener('offline',message);window.removeEventListener('pagehide',destroy);document.removeEventListener('visibilitychange',visibility);papi.removeEventListener('click',start);papi.removeEventListener('keydown',initialKey);runway.removeEventListener('pointerdown',pointer);callback=null;if(waitGame?.destroy===destroy)waitGame=null;}
  const hintTimer=setTimeout(()=>{if(!destroyed&&!playing)hint.hidden=false;},7000);
  papi.addEventListener('click',start);papi.addEventListener('keydown',initialKey);runway.addEventListener('pointerdown',pointer);window.addEventListener('keydown',key);window.addEventListener('resize',measure);window.addEventListener('online',message);window.addEventListener('offline',message);window.addEventListener('pagehide',destroy);document.addEventListener('visibilitychange',visibility);
  enter.onclick=()=>{if(!ready||released)return;released=true;const go=callback;destroy();go?.();};
  message();
  waitGame={destroy,hold(go){if(destroyed||!playing||released)return false;callback=go;ready=true;enter.hidden=false;if(retry)retry.hidden=true;message();return true;}};
 }

 function mountInto(el){
  if(!el||el.querySelector('.pi-wrap'))return;
  el.insertAdjacentHTML('beforeend',MARKUP);
  if(STATIC_IDS.includes(el.id)){el.querySelector('.pi-wrap').classList.add('pi-static');return;}
  mountWaitGame(el);
  if(!startedAt){startedAt=performance.now();trySound();}
 }
 function setMeta(c){try{const m=document.querySelector('meta[name="theme-color"]');if(m){if(!m.dataset.dmOrig)m.dataset.dmOrig=m.content;m.content=c;}}catch(_){}}
 /* Açılış bitince turkuaz zemin uygulamanın arkasında kalmasın */
 document.addEventListener('dm:boot-ready',()=>{waitGame?.destroy();document.documentElement.classList.add('dm-papi-booted');document.documentElement.classList.remove('dm-papi-intro-bg');try{const m=document.querySelector('meta[name="theme-color"]');if(m&&m.dataset.dmOrig)m.content=m.dataset.dmOrig;}catch(_){}});
 function scan(){IDS.concat(STATIC_IDS).forEach(id=>mountInto(document.getElementById(id)));}
 function enable(){
  if(active)return;active=true;css();
  document.documentElement.classList.add('dm-papi-intro','dm-papi-intro-bg');
  setMeta('#0A5560');
  scan();
  if(typeof MutationObserver==='function'&&!observer){observer=new MutationObserver(scan);observer.observe(document.documentElement,{childList:true,subtree:true});
   const stop=()=>{observer&&observer.disconnect();observer=null;scan();};
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stop,{once:true});else stop();}
 }
 function disable(){
  if(!active)return;active=false;waitGame?.destroy();
  document.documentElement.classList.remove('dm-papi-intro','dm-papi-intro-bg');
  document.querySelectorAll('.pi-wrap').forEach(n=>n.remove());
  observer&&observer.disconnect();observer=null;
 }
 /* Açılış ekranı kapanmadan önce animasyonun bitmesi için kalan süre (ms) */
 function remainingMs(){if(!active)return 0;if(!startedAt)return 3400;return Math.max(0,3400-(performance.now()-startedAt));}
 let characterSequence=0;
 function characterMarkup(){const suffix='chat'+(++characterSequence);return SVG.replace('class="pi-svg"','class="dm-papi-character-svg"').replace(/id="(pi[a-zA-Z])"/g,'id="$1'+suffix+'"').replace(/url\(#(pi[a-zA-Z])\)/g,'url(#$1'+suffix+')');}
 window.dmPapiIntro={characterMarkup,enable,disable,holdBoot:go=>waitGame?.hold(go)||false,isActive:()=>active,remainingMs,minMs:3400};
})();
