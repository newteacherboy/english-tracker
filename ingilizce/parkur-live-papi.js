/* [11 Kas 2026] Parkur v4 · canlı Papi.
   Giriş animasyonundaki ("Papi 3D Giriş", holiday-splashes/papi-intro.js) Papi maskotunu
   1) parkurun sağ şeridinde 5 durak boyunca farklı duygularla gezdirir,
   2) cüzdanın solundaki Papi görselinin yerine koyar,
   3) duraklar arasına yol çizer (bitirilen kısım sarı).
   Yalnızca görünüm: ilerleme, ödül ve tıklama davranışlarına dokunmaz. Görsel stil: parkur-v4.css */
(function(){
 'use strict';
 if(typeof window==='undefined'||window.dmLivePapi)return;
 const SVG=`<svg viewBox="0 0 400 440" aria-hidden="true"><defs><radialGradient id="pib" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="#5FE3D5"/><stop offset=".55" stop-color="#22BFB2"/><stop offset="1" stop-color="#128E8F"/></radialGradient><linearGradient id="piw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1DAFA6"/><stop offset=".7" stop-color="#1688A3"/><stop offset="1" stop-color="#6A47E8"/></linearGradient><linearGradient id="pic" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5B33D6"/><stop offset="1" stop-color="#A47CFF"/></linearGradient><linearGradient id="pik" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC14D"/><stop offset="1" stop-color="#FF8A1C"/></linearGradient><radialGradient id="pig" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#D4FFF6"/><stop offset="1" stop-color="#8FE8DA"/></radialGradient><clipPath id="piL"><ellipse cx="168" cy="186" rx="25" ry="28"/></clipPath><clipPath id="piR"><ellipse cx="232" cy="186" rx="25" ry="28"/></clipPath></defs><ellipse class="p-shadow" cx="200" cy="372" rx="78" ry="11" fill="#1B1F3B" opacity=".12"/><g class="p-root"><g class="p-tilt"><g stroke="#FF9F1C" stroke-width="8" stroke-linecap="round" fill="none"><path d="M176 345 l-10 19 M176 345 l0 21 M176 345 l10 19"/><path d="M224 345 l-10 19 M224 345 l0 21 M224 345 l10 19"/></g><path d="M232 318 C 262 330, 282 352, 286 372 C 266 368, 246 352, 228 334 Z" fill="#6A47E8"/><path d="M222 324 C 246 342, 258 364, 258 384 C 240 374, 226 356, 214 336 Z" fill="#1688A3"/><g class="p-body"><g class="p-crest"><g class="p-crestIn"><path d="M186 124 C 168 104, 156 84, 154 64 C 172 72, 190 94, 198 120 Z" fill="#6236D9"/><path d="M214 120 C 226 98, 240 84, 254 76 C 250 96, 236 114, 220 126 Z" fill="#6236D9"/><path d="M190 124 C 182 92, 190 58, 206 38 C 216 64, 216 98, 210 124 Z" fill="url(#pic)"/><path d="M203 52 C 198 72, 198 92, 201 110" stroke="#C9B3FF" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/></g></g><path d="M200 110 C 264 110, 294 150, 294 210 L 292 272 C 290 322, 254 348, 200 348 C 146 348, 110 322, 108 272 L 106 210 C 106 150, 136 110, 200 110 Z" fill="url(#pib)"/><path d="M200 236 C 242 236, 264 268, 260 302 C 256 332, 232 344, 200 344 C 168 344, 144 332, 140 302 C 136 268, 158 236, 200 236 Z" fill="url(#pig)"/><path d="M172 276 q10 8 20 0 M208 276 q10 8 20 0 M188 300 q12 9 24 0 M164 304 q8 7 16 0 M220 304 q8 7 16 0" stroke="#5FCFC0" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/><ellipse cx="200" cy="190" rx="82" ry="50" fill="#C9FFF4" opacity=".55"/><path d="M146 140 C 160 126, 178 120, 194 120" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".45"/><g class="p-eyeOpen"><ellipse cx="168" cy="186" rx="25" ry="28" fill="#fff"/><g class="p-pupil"><circle cx="171" cy="190" r="13" fill="#1B1F3B"/><circle cx="176" cy="184" r="4.8" fill="#fff"/><circle cx="166" cy="196" r="2" fill="#fff"/></g><g clip-path="url(#piL)"><rect class="p-lid" x="140" y="100" width="56" height="58" fill="#1FB3A6"/></g></g><g class="p-eyeOpen"><ellipse cx="232" cy="186" rx="25" ry="28" fill="#fff"/><g class="p-pupil"><circle cx="235" cy="190" r="13" fill="#1B1F3B"/><circle cx="240" cy="184" r="4.8" fill="#fff"/><circle cx="230" cy="196" r="2" fill="#fff"/></g><g clip-path="url(#piR)"><rect class="p-lid" x="204" y="100" width="56" height="58" fill="#1FB3A6"/></g></g><g class="p-eyeHappy" stroke="#1B1F3B" stroke-width="7" stroke-linecap="round" fill="none"><path d="M148 196 Q168 170 188 196"/><path d="M212 196 Q232 170 252 196"/></g><g class="p-eyeClosed" stroke="#1B1F3B" stroke-width="6" stroke-linecap="round" fill="none"><path d="M148 190 Q168 204 188 190"/><path d="M212 190 Q232 204 252 190"/></g><path class="p-brow p-browL" d="M146 152 Q166 141 186 149" stroke="#6236D9" stroke-width="8" stroke-linecap="round" fill="none"/><path class="p-brow p-browR" d="M214 149 Q234 141 254 152" stroke="#6236D9" stroke-width="8" stroke-linecap="round" fill="none"/><ellipse class="p-cheek" cx="138" cy="224" rx="13" ry="8" fill="#FF7AA8" opacity=".45"/><ellipse class="p-cheek" cx="262" cy="224" rx="13" ry="8" fill="#FF7AA8" opacity=".45"/><ellipse class="p-mouth" cx="200" cy="234" rx="13" ry="9" fill="#7A2340"/><path class="p-jaw" d="M185 226 C 190 248, 210 248, 215 226 C 208 232, 192 232, 185 226 Z" fill="#E0730A"/><path d="M181 207 C 188 197, 212 197, 219 207 C 227 220, 220 240, 204 250 C 199 253, 195 249, 197 243 C 192 232, 183 221, 181 207 Z" fill="url(#pik)"/><path d="M190 206 C 196 202, 206 202, 210 206" stroke="#FFE2A8" stroke-width="4" stroke-linecap="round" fill="none"/><g class="p-glasses"><rect x="128" y="168" width="144" height="10" fill="#111"/><path d="M138 178 h56 v18 h-8 v8 h-40 v-8 h-8 Z" fill="#111"/><path d="M206 178 h56 v18 h-8 v8 h-40 v-8 h-8 Z" fill="#111"/><g fill="#fff"><rect x="148" y="182" width="8" height="8"/><rect x="156" y="190" width="8" height="8"/><rect x="216" y="182" width="8" height="8"/><rect x="224" y="190" width="8" height="8"/></g></g></g><g class="p-wingL"><path d="M122 210 C 90 214, 76 252, 82 288 C 86 306, 106 306, 114 292 C 122 272, 128 240, 122 210 Z" fill="url(#piw)"/><path d="M100 250 q8 10 18 8 M94 272 q8 9 18 6" stroke="#0F7A86" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/></g><g class="p-wingR"><path d="M278 210 C 310 214, 324 252, 318 288 C 314 306, 294 306, 286 292 C 278 272, 272 240, 278 210 Z" fill="url(#piw)"/><path d="M300 250 q-8 10 -18 8 M306 272 q-8 9 -18 6" stroke="#0F7A86" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/></g></g></g><g class="p-fx p-sparkles" fill="#FFC93C"><path d="M70 120 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6 Z"/><path style="animation-delay:.25s" d="M330 100 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5 Z"/><path style="animation-delay:.5s" fill="#A47CFF" d="M346 250 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z"/><path style="animation-delay:.4s" fill="#A47CFF" d="M54 260 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z"/></g><g class="p-fx p-exclaim"><text x="300" y="110" font-family="Nunito,system-ui,sans-serif" font-weight="900" font-size="58" fill="#FF6B4A">!</text></g><path class="p-fx p-tear" d="M150 214 C 150 214, 140 228, 140 234 a10 10 0 0 0 20 0 C 160 228, 150 214, 150 214 Z" fill="#7FD3FF"/><path class="p-fx p-heart" d="M330 170 c-8 -12 -26 -6 -24 8 c2 10 14 18 24 26 c10 -8 22 -16 24 -26 c2 -14 -16 -20 -24 -8 Z" fill="#FF5C8A"/><g class="p-fx p-question" font-family="Nunito,system-ui,sans-serif" font-weight="900" fill="#7C4DFF"><text x="292" y="110" font-size="46">?</text><text x="322" y="78" font-size="30">?</text></g><g class="p-fx p-zzz" font-family="Nunito,system-ui,sans-serif" font-weight="900" fill="#5A31CC"><text x="262" y="132" font-size="40">Z</text><text x="300" y="98" font-size="30">z</text><text x="330" y="70" font-size="22">z</text></g><g class="p-fx p-confetti"><rect x="80" y="40" width="10" height="16" rx="2" fill="#FFC93C"/><rect x="140" y="20" width="10" height="16" rx="2" fill="#7C4DFF" style="animation-delay:.3s"/><rect x="250" y="30" width="10" height="16" rx="2" fill="#FF5C8A" style="animation-delay:.6s"/><rect x="320" y="50" width="10" height="16" rx="2" fill="#2EC4B6" style="animation-delay:.15s"/><rect x="200" y="10" width="10" height="16" rx="2" fill="#FF9F1C" style="animation-delay:.9s"/><rect x="40" y="90" width="10" height="16" rx="2" fill="#2EC4B6" style="animation-delay:1.1s"/><rect x="350" y="110" width="10" height="16" rx="2" fill="#FFC93C" style="animation-delay:.45s"/></g></svg>`;
 let uid=0;
 function papi(extra){
  const n='lp'+(++uid);
  return SVG.replace(/id="(pi[a-zA-Z])"/g,'id="$1'+n+'"').replace(/url\(#(pi[a-zA-Z])\)/g,'url(#$1'+n+')').replace('<svg ','<svg aria-hidden="true" focusable="false" '+(extra||'')+' ');
 }
 const NS='http://www.w3.org/2000/svg';
 /* 11 Kas 2026: duraklar arası yol çizgisi kaldırıldı (kullanıcı isteği). */
 function road(world){world.querySelector(':scope>.dm-v4-road')?.remove();return;}
 function roadOld(world){
  const rows=[...world.querySelectorAll('.rt-medal-row')];
  let svg=world.querySelector(':scope>.dm-v4-road');
  const w=world.clientWidth||1;
  const pts=rows.map(r=>({x:parseFloat(r.style.getPropertyValue('--stop-x'))/100*w,y:parseFloat(r.style.getPropertyValue('--stop-y')),cur:r.classList.contains('is-current')})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).sort((a,b)=>a.y-b.y);
  if(pts.length<2){svg?.remove();return;}
  /* Yol yalnızca ekrana çizilmiş duraklar kadar uzun: tüm dünya boyunda (on binlerce px) bir SVG iOS'ta kaydırmayı bozuyordu. */
  const top=Math.max(0,Math.floor(pts[0].y-20)),h=Math.ceil(pts.at(-1).y-top+20);
  const P=p=>p.x.toFixed(1)+' '+(p.y-top).toFixed(1);
  const seg=(a,b)=>{const m=(b.y-a.y)/2;return ' C '+a.x.toFixed(1)+' '+(a.y+m-top).toFixed(1)+', '+b.x.toFixed(1)+' '+(b.y-m-top).toFixed(1)+', '+P(b);};
  let all='M '+P(pts[0]),done='';
  const ci=pts.findIndex(p=>p.cur);
  for(let i=1;i<pts.length;i++){const s=seg(pts[i-1],pts[i]);all+=s;if(i<=ci)done+=s;}
  done=done?'M '+P(pts[0])+done:'M0 0';
  const key=w+'|'+top+'|'+h+'|'+all+'|'+done;
  if(svg&&svg.dataset.key===key)return;
  if(!svg){svg=document.createElementNS(NS,'svg');svg.setAttribute('class','dm-v4-road');svg.setAttribute('aria-hidden','true');svg.innerHTML='<path fill="none" stroke="var(--v4-road)" stroke-width="18" stroke-linecap="round"/><path fill="none" stroke="var(--v4-road-done)" stroke-width="18" stroke-linecap="round"/>';world.prepend(svg);}
  svg.dataset.key=key;
  svg.style.top=top+'px';svg.style.height=h+'px';svg.setAttribute('height',h);svg.setAttribute('viewBox','0 0 '+w+' '+h);
  const [p1,p2]=svg.querySelectorAll('path');p1.setAttribute('d',all);p2.setAttribute('d',done);
 }
 function walker(world){
  const cur=world.querySelector('.rt-medal-row.is-current');
  let lane=world.querySelector(':scope>.dm-lp-lane');
  if(!cur){lane?.remove();return;}
  const y=parseFloat(cur.style.getPropertyValue('--stop-y'));if(!Number.isFinite(y))return;
  if(!lane){lane=document.createElement('div');lane.className='dm-lp-lane';lane.innerHTML='<div class="dm-lp dm-lp-walker"><div class="dm-lp-hop" aria-hidden="true">'+papi()+'</div><div class="dm-lp-says"></div></div>';world.append(lane);
   const w=lane.querySelector('.dm-lp-walker');talk(w);w.addEventListener('animationiteration',e=>{if(e.target===w&&e.animationName==='dmLpWalk')talk(w);});}
  const t=Math.max(0,y-165)+'px';if(lane.style.top!==t)lane.style.top=t;
 }
 /* The existing walking Papi invites learners to AI chat. No random notices or plan badge. */
 function talk(walker){
  const box=walker.querySelector('.dm-lp-says');if(!box)return;
  box.innerHTML='<div class="dm-lp-say dm-lp-chat-invite"><span>Benimle canlı sohbet etmek ister misin?</span><button type="button" class="dm-lp-go" data-lp-chat style="--go:#087FFF;--go-edge:#155BC3"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 10 10 0 0 1-4-.8L3 21l1.8-5.5A8.5 8.5 0 1 1 21 11.5Z"/></svg>Başlat ›</button><i aria-hidden="true"></i></div>';
  box.onclick=e=>{if(e.target.closest('[data-lp-chat]')){if(window.dmPapiChat?.open)window.dmPapiChat.open();else window.yoToast?.('Sohbet hazırlanıyor. Birazdan tekrar dene.');}};
 }
 function wallet(){
  document.querySelectorAll('.dm-unified-wallet .dm-pw-papi:not(.dm-lp)').forEach(el=>{el.classList.add('dm-lp','dm-lp-mini');el.innerHTML=papi();});
 }
 let queued=false;
 function refresh(){
  queued=false;wallet();
  document.querySelectorAll('#tab-dunya .rt-medal-route .rt-medal-world').forEach(world=>{try{road(world);walker(world);}catch(_){}});
 }
 /* Kaydırma sürerken (özellikle iOS'taki ivmeli kaydırmada) kaydırılan içerikte hiçbir şeyi değiştirme:
    yol ve Papi şeridi ancak kaydırma 350 ms durduktan sonra güncellenir. */
 let lastScroll=0,idleTimer=0;
 addEventListener('scroll',e=>{if(e.target?.classList?.contains('rt-medal-scroll'))lastScroll=Date.now();},{capture:true,passive:true});
 function schedule(){
  if(queued)return;
  const wait=350-(Date.now()-lastScroll);
  if(wait>0){clearTimeout(idleTimer);idleTimer=setTimeout(schedule,wait+20);return;}
  queued=true;requestAnimationFrame(refresh);
 }
 function start(){
  const tab=document.getElementById('tab-dunya');
  if(tab)new MutationObserver(muts=>{for(const m of muts){if(m.type==='childList'&&[...m.addedNodes].some(n=>n.nodeType===1&&!n.closest?.('.dm-lp-lane,.dm-v4-road')&&!(n.classList&&(n.classList.contains('dm-lp-lane')||n.classList.contains('dm-v4-road'))))){schedule();return;}}}).observe(tab,{childList:true,subtree:true});
  addEventListener('resize',schedule,{passive:true});
  schedule();setTimeout(schedule,1500);
 }
 window.dmLivePapi={refresh:schedule,markup:papi};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
