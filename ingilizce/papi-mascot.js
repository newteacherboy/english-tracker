/* [11 Kas 2026] Canlı Papi maskotu (SVG + CSS, resim dosyası yok).
   Kullanım:
     DMPapi.html('merhaba')                -> SVG metni (innerHTML içine konur)
     DMPapi.react(svgOrHost, 'sevinc', 2600) -> duygu değiştirir; ms>0 ise sonra `sonra` duygusuna döner
     DMPapi.resultMood({dogru, yanlis, gecti, yildiz}) -> sonuca uygun duygu adı
   Duygular: idle, mutlu, merhaba, sevinc, cosku, saskin, uzgun, teselli, dusunme, uyku, havali, alkis */
(function () {
  if (window.DMPapi) return;
  const MOODS = ['idle','mutlu','merhaba','sevinc','cosku','saskin','uzgun','teselli','dusunme','uyku','havali','alkis'];
  let seq = 0;

  const CSS = `
.dmp{display:block;width:100%;height:100%;overflow:visible}
.dm-papi-host{display:block;pointer-events:auto!important;-webkit-tap-highlight-color:transparent}
.dm-papi-host .dmp{cursor:pointer}
.dm-papi-res{display:block;width:140px;height:150px;margin:0 auto 6px;font-size:0;line-height:0;object-fit:initial}
#dmStoryLesson .ml-result-mascot .ml-result-papi{width:118px;height:128px;margin:auto}
#dmStoryLesson[data-fit="1"] .ml-result-mascot .ml-result-papi{width:92px;height:100px}
#dmStoryLesson[data-fit="2"] .ml-result-mascot .ml-result-papi{width:68px;height:74px}
.dmp *{transform-box:fill-box}
.dmp .p-root{transform-origin:50% 100%}
.dmp .p-tilt{transform-origin:50% 100%;transition:transform .45s cubic-bezier(.34,1.56,.64,1)}
.dmp .p-body{transform-origin:50% 100%;animation:dmpBreathe 3.2s ease-in-out infinite}
.dmp .p-crest{transform-origin:50% 100%;animation:dmpSway 3s ease-in-out infinite}
.dmp .p-crestIn{transform-origin:50% 100%;transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
.dmp .p-wingL{transform-origin:100% 0%;transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
.dmp .p-wingR{transform-origin:0% 0%;transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
.dmp .p-brow{transform-origin:50% 50%;transition:transform .3s}
.dmp .p-eyeOpen{transform-origin:50% 50%;transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .15s}
.dmp .p-pupil{transform-origin:50% 50%;transform:translate(calc(var(--lx,0)*1px),calc(var(--ly,0)*1px));transition:transform .3s}
.dmp .p-lid{transform:translateY(0);transition:transform .12s}
.dmp .p-eyeHappy,.dmp .p-eyeClosed{opacity:0;transition:opacity .15s}
.dmp .p-jaw{transition:transform .2s}
.dmp .p-mouth{transform-origin:50% 0%;transform:scaleY(0);transition:transform .2s}
.dmp .p-shadow{transform-origin:50% 50%}
.dmp .p-cheek{transition:opacity .3s}
.dmp .p-fx{opacity:0}
.dmp .p-glasses{transform:translateY(-170px);opacity:0;transition:transform .55s cubic-bezier(.34,1.4,.64,1),opacity .2s}
.dmp.blink .p-lid{transform:translateY(58px)!important}
@keyframes dmpBreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.015,1.03)}}
@keyframes dmpSway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes dmpHop{0%,100%{transform:translateY(0) scale(1.03,.97)}50%{transform:translateY(-16px) scale(.98,1.03)}}
@keyframes dmpShadowHop{0%,100%{transform:scale(1)}50%{transform:scale(.82)}}
@keyframes dmpJump{0%{transform:translateY(0) scale(1.08,.9)}35%{transform:translateY(-62px) scale(.94,1.07)}65%{transform:translateY(0) scale(1.1,.88)}80%,100%{transform:translateY(0) scale(1)}}
@keyframes dmpShadowJ{0%,100%{transform:scale(1.05)}35%{transform:scale(.6)}65%{transform:scale(1.08)}}
@keyframes dmpFlapL{from{transform:rotate(15deg)}to{transform:rotate(75deg)}}
@keyframes dmpFlapR{from{transform:rotate(-15deg)}to{transform:rotate(-75deg)}}
@keyframes dmpPop{0%{transform:scale(0) rotate(0)}50%{transform:scale(1.2) rotate(45deg)}100%{transform:scale(0) rotate(90deg)}}
@keyframes dmpStartle{0%{transform:translateY(0)}30%{transform:translateY(-24px) scale(.96,1.06)}60%{transform:translateY(0) scale(1.05,.95)}100%{transform:none}}
@keyframes dmpPopIn{from{transform:scale(0)}to{transform:scale(1)}}
@keyframes dmpTear{0%{transform:translateY(0) scale(.4);opacity:0}20%{opacity:1;transform:translateY(0) scale(1)}100%{transform:translateY(60px) scale(.8);opacity:0}}
@keyframes dmpWave{from{transform:rotate(-100deg)}to{transform:rotate(-125deg)}}
@keyframes dmpHello{from{transform:rotate(-95deg)}to{transform:rotate(-130deg)}}
@keyframes dmpFloat{0%{transform:translateY(10px) scale(.6);opacity:0}30%{opacity:1;transform:translateY(0) scale(1)}100%{transform:translateY(-40px) scale(1);opacity:0}}
@keyframes dmpBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes dmpZz{0%{transform:translate(0,10px) scale(.5);opacity:0}30%{opacity:1}100%{transform:translate(18px,-40px) scale(1.1);opacity:0}}
@keyframes dmpNod{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg) translateY(3px)}}
@keyframes dmpClapL{from{transform:rotate(-25deg)}to{transform:rotate(-74deg)}}
@keyframes dmpClapR{from{transform:rotate(25deg)}to{transform:rotate(74deg)}}
@keyframes dmpFall{0%{transform:translateY(-30px) rotate(0)}100%{transform:translateY(120px) rotate(320deg);opacity:0}}
/* MERHABA (başlangıç ekranları) */
.dmp.m-merhaba .p-tilt{transform:rotate(-4deg)}
.dmp.m-merhaba .p-wingR{animation:dmpHello .55s ease-in-out 8 alternate}
/* MUTLU (tepkiden sonra sakin, gülümseyen hal) */
.dmp.m-mutlu .p-eyeOpen{opacity:0}.dmp.m-mutlu .p-eyeHappy{opacity:1}
.dmp.m-mutlu .p-cheek{opacity:.7}
.dmp.m-mutlu .p-crestIn{transform:scale(1.05,1.1)}
.dmp.m-mutlu .p-jaw{transform:translateY(4px)}.dmp.m-mutlu .p-mouth{transform:scaleY(.6)}
.dmp.m-merhaba .p-jaw{transform:translateY(5px)}.dmp.m-merhaba .p-mouth{transform:scaleY(.8)}
.dmp.m-merhaba .p-crestIn{transform:scale(1.06,1.12)}
.dmp.m-merhaba .p-cheek{opacity:.7}
/* SEVİNÇ */
.dmp.m-sevinc .p-root{animation:dmpHop .5s ease-in-out infinite}
.dmp.m-sevinc .p-crestIn{transform:scale(1.12,1.2)}
.dmp.m-sevinc .p-crest{animation:dmpSway .35s ease-in-out infinite}
.dmp.m-sevinc .p-eyeOpen{opacity:0}.dmp.m-sevinc .p-eyeHappy{opacity:1}
.dmp.m-sevinc .p-wingL{transform:rotate(25deg)}.dmp.m-sevinc .p-wingR{transform:rotate(-25deg)}
.dmp.m-sevinc .p-jaw{transform:translateY(7px)}.dmp.m-sevinc .p-mouth{transform:scaleY(1)}
.dmp.m-sevinc .p-cheek{opacity:.75}
.dmp.m-sevinc .p-shadow{animation:dmpShadowHop .5s ease-in-out infinite}
/* COŞKU */
.dmp.m-cosku .p-root{animation:dmpJump .8s cubic-bezier(.3,0,.4,1) infinite}
.dmp.m-cosku .p-shadow{animation:dmpShadowJ .8s cubic-bezier(.3,0,.4,1) infinite}
.dmp.m-cosku .p-crestIn{transform:scale(1.15,1.3)}
.dmp.m-cosku .p-crest{animation:dmpSway .2s ease-in-out infinite}
.dmp.m-cosku .p-eyeOpen{opacity:0}.dmp.m-cosku .p-eyeHappy{opacity:1}
.dmp.m-cosku .p-wingL{animation:dmpFlapL .16s ease-in-out infinite alternate}
.dmp.m-cosku .p-wingR{animation:dmpFlapR .16s ease-in-out infinite alternate}
.dmp.m-cosku .p-jaw{transform:translateY(9px)}.dmp.m-cosku .p-mouth{transform:scaleY(1.2)}
.dmp.m-cosku .p-cheek{opacity:.8}
.dmp.m-cosku .p-sparkles{opacity:1}.dmp.m-cosku .p-sparkles path{animation:dmpPop .8s ease-out infinite}
/* ŞAŞKIN */
.dmp.m-saskin .p-root{animation:dmpStartle .45s ease-out}
.dmp.m-saskin .p-eyeOpen{transform:scale(1.18)}
.dmp.m-saskin .p-pupil{transform:scale(.62)}
.dmp.m-saskin .p-crest{animation:none}
.dmp.m-saskin .p-crestIn{transform:scale(.95,1.35)}
.dmp.m-saskin .p-jaw{transform:translateY(11px)}.dmp.m-saskin .p-mouth{transform:scaleY(1.5)}
.dmp.m-saskin .p-brow{transform:translateY(-10px)}
.dmp.m-saskin .p-wingL{transform:rotate(55deg)}.dmp.m-saskin .p-wingR{transform:rotate(-55deg)}
.dmp.m-saskin .p-exclaim{opacity:1;animation:dmpPopIn .4s cubic-bezier(.34,1.56,.64,1)}
/* ÜZGÜN */
.dmp.m-uzgun .p-root{transform:scale(1.03,.95);transition:transform .4s}
.dmp.m-uzgun .p-crest{animation:dmpSway 5s ease-in-out infinite}
.dmp.m-uzgun .p-crestIn{transform:scale(1.05,.55)}
.dmp.m-uzgun .p-browL{transform:rotate(-16deg) translateY(4px)}
.dmp.m-uzgun .p-browR{transform:rotate(16deg) translateY(4px)}
.dmp.m-uzgun .p-lid{transform:translateY(24px)}
.dmp.m-uzgun .p-pupil{transform:translate(0,7px)}
.dmp.m-uzgun .p-wingL{transform:rotate(-8deg)}.dmp.m-uzgun .p-wingR{transform:rotate(8deg)}
.dmp.m-uzgun .p-tear{opacity:1;animation:dmpTear 1.4s ease-in infinite}
.dmp.m-uzgun .p-cheek{opacity:0}
/* TESELLİ */
.dmp.m-teselli .p-tilt{transform:rotate(-7deg)}
.dmp.m-teselli .p-eyeOpen{opacity:0}.dmp.m-teselli .p-eyeHappy{opacity:1}
.dmp.m-teselli .p-wingR{animation:dmpWave .5s ease-in-out infinite alternate}
.dmp.m-teselli .p-wingL{transform:rotate(-10deg)}
.dmp.m-teselli .p-cheek{opacity:.8}
.dmp.m-teselli .p-heart{opacity:1;animation:dmpFloat 1.6s ease-out infinite}
.dmp.m-teselli .p-jaw{transform:translateY(4px)}.dmp.m-teselli .p-mouth{transform:scaleY(.6)}
/* DÜŞÜNME */
.dmp.m-dusunme .p-tilt{transform:rotate(4deg)}
.dmp.m-dusunme .p-pupil{transform:translate(7px,-10px)}
.dmp.m-dusunme .p-lid{transform:translateY(10px)}
.dmp.m-dusunme .p-browR{transform:translateY(-9px) rotate(-8deg)}
.dmp.m-dusunme .p-browL{transform:translateY(3px) rotate(6deg)}
.dmp.m-dusunme .p-wingL{transform:rotate(-80deg)}
.dmp.m-dusunme .p-crest{animation:dmpSway 1.6s ease-in-out infinite}
.dmp.m-dusunme .p-crestIn{transform:rotate(12deg) scale(1,.9)}
.dmp.m-dusunme .p-question{opacity:1}.dmp.m-dusunme .p-question text{animation:dmpBob 1.2s ease-in-out infinite}
.dmp.m-dusunme .p-question text:nth-child(2){animation-delay:.3s}
/* UYKU */
.dmp.m-uyku .p-tilt{transform:rotate(7deg) translateY(6px)}
.dmp.m-uyku .p-eyeOpen{opacity:0}.dmp.m-uyku .p-eyeClosed{opacity:1}
.dmp.m-uyku .p-body{animation:dmpBreathe 4.5s ease-in-out infinite}
.dmp.m-uyku .p-crest{animation:none}
.dmp.m-uyku .p-crestIn{transform:rotate(28deg) scale(1,.6)}
.dmp.m-uyku .p-wingL{transform:rotate(-6deg)}.dmp.m-uyku .p-wingR{transform:rotate(6deg)}
.dmp.m-uyku .p-zzz{opacity:1}
.dmp.m-uyku .p-zzz text{animation:dmpZz 2.4s ease-out infinite;opacity:0}
.dmp.m-uyku .p-zzz text:nth-child(2){animation-delay:.8s}.dmp.m-uyku .p-zzz text:nth-child(3){animation-delay:1.6s}
/* HAVALI */
.dmp.m-havali .p-glasses{transform:translateY(0);opacity:1}
.dmp.m-havali .p-tilt{animation:dmpNod .6s ease-in-out infinite}
.dmp.m-havali .p-crestIn{transform:rotate(-14deg) scale(1.05,1.1)}
.dmp.m-havali .p-wingL{transform:rotate(-30deg)}.dmp.m-havali .p-wingR{transform:rotate(-115deg)}
.dmp.m-havali .p-jaw{transform:translateY(3px)}
/* ALKIŞ */
.dmp.m-alkis .p-root{animation:dmpHop .36s ease-in-out infinite}
.dmp.m-alkis .p-shadow{animation:dmpShadowHop .36s ease-in-out infinite}
.dmp.m-alkis .p-eyeOpen{opacity:0}.dmp.m-alkis .p-eyeHappy{opacity:1}
.dmp.m-alkis .p-wingL{animation:dmpClapL .18s ease-in-out infinite alternate}
.dmp.m-alkis .p-wingR{animation:dmpClapR .18s ease-in-out infinite alternate}
.dmp.m-alkis .p-jaw{transform:translateY(9px)}.dmp.m-alkis .p-mouth{transform:scaleY(1.2)}
.dmp.m-alkis .p-cheek{opacity:.8}
.dmp.m-alkis .p-crestIn{transform:scale(1.1,1.2)}
.dmp.m-alkis .p-confetti{opacity:1}.dmp.m-alkis .p-confetti rect{animation:dmpFall 1.4s linear infinite}
@media (prefers-reduced-motion:reduce){.dmp,.dmp *{animation:none!important;transition:none!important}}
`;

  function injectCss() {
    if (document.getElementById('dmPapiCss')) return;
    const s = document.createElement('style'); s.id = 'dmPapiCss'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function html(mood, label, opts) {
    injectCss();
    const m = MOODS.includes(mood) ? mood : 'idle';
    const u = 'dmp' + (++seq);
    const alt = String(label || 'Papi').replace(/[<>&"]/g, '');
    if (opts && opts.steps) setTimeout(() => { const el = document.querySelector('svg.dmp[data-dmp-id="' + u + '"]'); if (el) sequence(el, opts.steps, opts.then || 'idle'); }, 0);
    else if (opts && opts.ms > 0) setTimeout(() => { const el = document.querySelector('svg.dmp[data-dmp-id="' + u + '"]'); if (el && el.classList.contains('m-' + m)) setMood(el, opts.then || 'idle'); }, opts.ms);
    return `<svg class="dmp m-${m}" data-dmp="1" data-dmp-id="${u}"${opts && opts.tap ? ' data-dmp-tap="1" data-dmp-base="' + ((opts.ms > 0 && opts.then) || m) + '"' : ''} viewBox="0 0 400 440" role="img" aria-label="${alt}">
<defs>
<radialGradient id="${u}b" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="#5FE3D5"/><stop offset=".55" stop-color="#22BFB2"/><stop offset="1" stop-color="#128E8F"/></radialGradient>
<linearGradient id="${u}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1DAFA6"/><stop offset=".7" stop-color="#1688A3"/><stop offset="1" stop-color="#6A47E8"/></linearGradient>
<linearGradient id="${u}c" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5B33D6"/><stop offset="1" stop-color="#A47CFF"/></linearGradient>
<linearGradient id="${u}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC14D"/><stop offset="1" stop-color="#FF8A1C"/></linearGradient>
<radialGradient id="${u}g" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#D4FFF6"/><stop offset="1" stop-color="#8FE8DA"/></radialGradient>
<clipPath id="${u}L"><ellipse cx="168" cy="186" rx="25" ry="28"/></clipPath>
<clipPath id="${u}R"><ellipse cx="232" cy="186" rx="25" ry="28"/></clipPath>
</defs>
<ellipse class="p-shadow" cx="200" cy="372" rx="78" ry="11" fill="#1B1F3B" opacity=".12"/>
<g class="p-root"><g class="p-tilt">
<g stroke="#FF9F1C" stroke-width="8" stroke-linecap="round" fill="none"><path d="M176 345 l-10 19 M176 345 l0 21 M176 345 l10 19"/><path d="M224 345 l-10 19 M224 345 l0 21 M224 345 l10 19"/></g>
<path d="M232 318 C 262 330, 282 352, 286 372 C 266 368, 246 352, 228 334 Z" fill="#6A47E8"/>
<path d="M222 324 C 246 342, 258 364, 258 384 C 240 374, 226 356, 214 336 Z" fill="#1688A3"/>
<g class="p-body">
<g class="p-crest"><g class="p-crestIn">
<path d="M186 124 C 168 104, 156 84, 154 64 C 172 72, 190 94, 198 120 Z" fill="#6236D9"/>
<path d="M214 120 C 226 98, 240 84, 254 76 C 250 96, 236 114, 220 126 Z" fill="#6236D9"/>
<path d="M190 124 C 182 92, 190 58, 206 38 C 216 64, 216 98, 210 124 Z" fill="url(#${u}c)"/>
<path d="M203 52 C 198 72, 198 92, 201 110" stroke="#C9B3FF" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/>
</g></g>
<path d="M200 110 C 264 110, 294 150, 294 210 L 292 272 C 290 322, 254 348, 200 348 C 146 348, 110 322, 108 272 L 106 210 C 106 150, 136 110, 200 110 Z" fill="url(#${u}b)"/>
<path d="M200 236 C 242 236, 264 268, 260 302 C 256 332, 232 344, 200 344 C 168 344, 144 332, 140 302 C 136 268, 158 236, 200 236 Z" fill="url(#${u}g)"/>
<path d="M172 276 q10 8 20 0 M208 276 q10 8 20 0 M188 300 q12 9 24 0 M164 304 q8 7 16 0 M220 304 q8 7 16 0" stroke="#5FCFC0" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
<ellipse cx="200" cy="190" rx="82" ry="50" fill="#C9FFF4" opacity=".55"/>
<path d="M146 140 C 160 126, 178 120, 194 120" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".45"/>
<g class="p-eyeOpen"><ellipse cx="168" cy="186" rx="25" ry="28" fill="#fff"/><g class="p-pupil"><circle cx="171" cy="190" r="13" fill="#1B1F3B"/><circle cx="176" cy="184" r="4.8" fill="#fff"/><circle cx="166" cy="196" r="2" fill="#fff"/></g><g clip-path="url(#${u}L)"><rect class="p-lid" x="140" y="100" width="56" height="58" fill="#1FB3A6"/></g></g>
<g class="p-eyeOpen"><ellipse cx="232" cy="186" rx="25" ry="28" fill="#fff"/><g class="p-pupil"><circle cx="235" cy="190" r="13" fill="#1B1F3B"/><circle cx="240" cy="184" r="4.8" fill="#fff"/><circle cx="230" cy="196" r="2" fill="#fff"/></g><g clip-path="url(#${u}R)"><rect class="p-lid" x="204" y="100" width="56" height="58" fill="#1FB3A6"/></g></g>
<g class="p-eyeHappy" stroke="#1B1F3B" stroke-width="7" stroke-linecap="round" fill="none"><path d="M148 196 Q168 170 188 196"/><path d="M212 196 Q232 170 252 196"/></g>
<g class="p-eyeClosed" stroke="#1B1F3B" stroke-width="6" stroke-linecap="round" fill="none"><path d="M148 190 Q168 204 188 190"/><path d="M212 190 Q232 204 252 190"/></g>
<path class="p-brow p-browL" d="M146 152 Q166 141 186 149" stroke="#6236D9" stroke-width="8" stroke-linecap="round" fill="none"/>
<path class="p-brow p-browR" d="M214 149 Q234 141 254 152" stroke="#6236D9" stroke-width="8" stroke-linecap="round" fill="none"/>
<ellipse class="p-cheek" cx="138" cy="224" rx="13" ry="8" fill="#FF7AA8" opacity=".45"/>
<ellipse class="p-cheek" cx="262" cy="224" rx="13" ry="8" fill="#FF7AA8" opacity=".45"/>
<ellipse class="p-mouth" cx="200" cy="234" rx="13" ry="9" fill="#7A2340"/>
<path class="p-jaw" d="M185 226 C 190 248, 210 248, 215 226 C 208 232, 192 232, 185 226 Z" fill="#E0730A"/>
<path d="M181 207 C 188 197, 212 197, 219 207 C 227 220, 220 240, 204 250 C 199 253, 195 249, 197 243 C 192 232, 183 221, 181 207 Z" fill="url(#${u}k)"/>
<path d="M190 206 C 196 202, 206 202, 210 206" stroke="#FFE2A8" stroke-width="4" stroke-linecap="round" fill="none"/>
<g class="p-glasses"><rect x="128" y="168" width="144" height="10" fill="#111"/><path d="M138 178 h56 v18 h-8 v8 h-40 v-8 h-8 Z" fill="#111"/><path d="M206 178 h56 v18 h-8 v8 h-40 v-8 h-8 Z" fill="#111"/><g fill="#fff"><rect x="148" y="182" width="8" height="8"/><rect x="156" y="190" width="8" height="8"/><rect x="216" y="182" width="8" height="8"/><rect x="224" y="190" width="8" height="8"/></g></g>
</g>
<g class="p-wingL"><path d="M122 210 C 90 214, 76 252, 82 288 C 86 306, 106 306, 114 292 C 122 272, 128 240, 122 210 Z" fill="url(#${u}w)"/><path d="M100 250 q8 10 18 8 M94 272 q8 9 18 6" stroke="#0F7A86" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/></g>
<g class="p-wingR"><path d="M278 210 C 310 214, 324 252, 318 288 C 314 306, 294 306, 286 292 C 278 272, 272 240, 278 210 Z" fill="url(#${u}w)"/><path d="M300 250 q-8 10 -18 8 M306 272 q-8 9 -18 6" stroke="#0F7A86" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/></g>
</g></g>
<g class="p-fx p-sparkles" fill="#FFC93C"><path d="M70 120 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6 Z"/><path style="animation-delay:.25s" d="M330 100 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5 Z"/><path style="animation-delay:.5s" fill="#A47CFF" d="M346 250 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z"/><path style="animation-delay:.4s" fill="#A47CFF" d="M54 260 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z"/></g>
<g class="p-fx p-exclaim"><text x="300" y="110" font-family="Nunito,system-ui,sans-serif" font-weight="900" font-size="58" fill="#FF6B4A">!</text></g>
<path class="p-fx p-tear" d="M150 214 C 150 214, 140 228, 140 234 a10 10 0 0 0 20 0 C 160 228, 150 214, 150 214 Z" fill="#7FD3FF"/>
<path class="p-fx p-heart" d="M330 170 c-8 -12 -26 -6 -24 8 c2 10 14 18 24 26 c10 -8 22 -16 24 -26 c2 -14 -16 -20 -24 -8 Z" fill="#FF5C8A"/>
<g class="p-fx p-question" font-family="Nunito,system-ui,sans-serif" font-weight="900" fill="#7C4DFF"><text x="292" y="110" font-size="46">?</text><text x="322" y="78" font-size="30">?</text></g>
<g class="p-fx p-zzz" font-family="Nunito,system-ui,sans-serif" font-weight="900" fill="#5A31CC"><text x="270" y="120" font-size="30">Z</text><text x="270" y="120" font-size="24">z</text><text x="270" y="120" font-size="20">z</text></g>
<g class="p-fx p-confetti"><rect x="80" y="40" width="10" height="16" rx="2" fill="#FFC93C"/><rect x="140" y="20" width="10" height="16" rx="2" fill="#7C4DFF" style="animation-delay:.3s"/><rect x="250" y="30" width="10" height="16" rx="2" fill="#FF5C8A" style="animation-delay:.6s"/><rect x="320" y="50" width="10" height="16" rx="2" fill="#2EC4B6" style="animation-delay:.15s"/><rect x="200" y="10" width="10" height="16" rx="2" fill="#FF9F1C" style="animation-delay:.9s"/><rect x="40" y="90" width="10" height="16" rx="2" fill="#2EC4B6" style="animation-delay:1.1s"/><rect x="350" y="110" width="10" height="16" rx="2" fill="#FFC93C" style="animation-delay:.45s"/></g>
</svg>`;
  }

  function svgOf(el) { return el && (el.matches && el.matches('svg.dmp') ? el : el.querySelector && el.querySelector('svg.dmp')); }
  function setMood(el, mood) {
    const s = svgOf(el); if (!s) return;
    MOODS.forEach(m => s.classList.remove('m-' + m));
    s.classList.add('m-' + (MOODS.includes(mood) ? mood : 'idle'));
    s.style.setProperty('--lx', 0); s.style.setProperty('--ly', 0);
  }
  /* react(el, mood, ms, after): ms>0 ise süre sonunda `after` (varsayılan: idle) duygusuna döner */
  function react(el, mood, ms, after) {
    const s = svgOf(el); if (!s) return;
    clearTimeout(s._dmpT); setMood(s, mood);
    if (ms > 0) s._dmpT = setTimeout(() => setMood(s, after || 'idle'), ms);
  }
  /* sequence(el, [['uzgun',1200],['teselli',2000]], 'idle') */
  function sequence(el, steps, after) {
    const s = svgOf(el); if (!s) return;
    clearTimeout(s._dmpT); let i = 0;
    const next = () => { if (i >= steps.length) { setMood(s, after || 'idle'); return; } const [m, ms] = steps[i++]; setMood(s, m); if (ms > 0) s._dmpT = setTimeout(next, ms); };
    next();
  }
  /* Sonuca göre duygu: geçemediyse teselli, başarı oranına göre coşku / sevinç / alkış */
  function resultMood(o) {
    o = o || {};
    if (o.gecti === false) return 'teselli';
    const d = Number(o.dogru) || 0, y = Number(o.yanlis) || 0, t = d + y;
    if (Number.isFinite(o.yildiz) && o.yildiz > 0) return o.yildiz >= 3 ? 'cosku' : o.yildiz === 2 ? 'sevinc' : 'alkis';
    if (!t) return 'alkis';
    const r = d / t;
    return r >= .9 ? 'cosku' : r >= .7 ? 'sevinc' : r >= .4 ? 'alkis' : 'teselli';
  }

  /* Ortak canlılık: görünür Papi'ler göz kırpar ve boştayken etrafa bakar */
  const BLINK = ['m-idle', 'm-mutlu', 'm-merhaba', 'm-saskin', 'm-dusunme', 'm-uzgun'];
  function visible(s) { const r = s.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight; }
  (function blinkLoop() {
    setTimeout(() => {
      try { document.querySelectorAll('svg.dmp').forEach(s => {
        if (!visible(s) || !BLINK.some(c => s.classList.contains(c)) || Math.random() < .3) return;
        s.classList.add('blink'); setTimeout(() => s.classList.remove('blink'), 140);
      }); } catch (e) {}
      blinkLoop();
    }, 2200 + Math.random() * 2600);
  })();
  (function lookLoop() {
    setTimeout(() => {
      try { document.querySelectorAll('svg.dmp.m-idle,svg.dmp.m-merhaba').forEach(s => {
        if (!visible(s)) return;
        const c = Math.random() < .35;
        s.style.setProperty('--lx', c ? 0 : ((Math.random() * 2 - 1) * 7).toFixed(1));
        s.style.setProperty('--ly', c ? 0 : ((Math.random() * 2 - 1) * 5).toFixed(1));
      }); } catch (e) {}
      lookLoop();
    }, 1600 + Math.random() * 1800);
  })();

  /* Papi'ye dokununca kısa tepki verir */
  document.addEventListener('click', e => {
    const s = e.target && e.target.closest && e.target.closest('svg.dmp[data-dmp-tap]'); if (!s) return;
    const back = MOODS.find(m => s.classList.contains('m-' + m)) || 'idle';
    if (s._dmpTap) return; s._dmpTap = 1;
    react(s, ['sevinc', 'saskin', 'alkis'][Math.floor(Math.random() * 3)], 1400, s.dataset.dmpBase || back);
    setTimeout(() => { s._dmpTap = 0; }, 1500);
  }, true);

  /* Sonuç ekranları için hazır kutu: tag('sevinc', 'ek-sinif') -> <span>…</span>
     Tepki ~3,5 sn sürer, sonra gülümseyen hale geçer; teselli önce kısa bir üzüntüyle başlar. */
  function tag(mood, cls, opts) {
    const m = MOODS.includes(mood) ? mood : 'sevinc';
    const o = Object.assign({ tap: true, then: 'mutlu' }, opts || {});
    if (m === 'teselli' && !o.steps) o.steps = [['uzgun', 1300], ['teselli', 3200]];
    else if (!o.steps && o.ms === undefined) o.ms = 3600;
    return '<span class="dm-papi-host dm-papi-res' + (cls ? ' ' + cls : '') + '">' + html(o.steps ? o.steps[0][0] : m, 'Papi', o) + '</span>';
  }

  window.DMPapi = { html, tag, react, sequence, setMood, resultMood, MOODS };
})();
