/* Word Bank arcade games. Scores, answer evidence and payouts use the shared engines. */
(()=>{'use strict';
const games={canavar:{title:'Canavar Avcısı',level:20,open:'canavarAvcisiAc',card:'monsterActivity',op:'canavar',hint:'Doğru kelimeyi taşıyan canavarı yakala!'},kule:{title:'Dengesiz Kule',level:35,open:'dengesizKuleAc',card:'towerActivity',op:'kule',hint:'Doğru cevabı seç, kuleyi sağlam tut!'}};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const en=w=>String(w.ingilizce??w.en??'').trim(),tr=w=>String(w.turkce??w.tr??'').trim();
const norm=v=>String(v??'').normalize('NFKC').toLocaleLowerCase('en').replace(/[’‘`]/g,"'").replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function pool(items){const seen=new Set();return items.filter(w=>{const k=en(w).toLowerCase();if(!k||!tr(w)||seen.has(k))return false;seen.add(k);return true;});}
function options(word,bank,key){const get=key==='kule'?tr:en,correct=get(word),seen=new Set([norm(correct)]),others=[];for(const w of shuffle(bank)){if(key==='canavar'&&en(w)!==en(word)&&norm(tr(w))===norm(tr(word)))continue;const v=get(w),n=norm(v);if(n&&!seen.has(n)){seen.add(n);others.push(v);}}return shuffle([correct,...others.slice(0,3)]);}
window.dmSoloArcadeCore=Object.freeze({pool,options,norm,games});
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const classroom=()=>typeof siniftaOynananOgrenci!=='undefined'&&!!siniftaOynananOgrenci;
const practice=()=>classroom()||who().toLowerCase()==='teacher';
const player=()=>classroom()?String(siniftaOynananOgrenci):who();
let root=null,s=null,clock=null,nextTimer=null,prior=null;
const alive=current=>s===current&&!!root?.isConnected&&current.owner===who();
function stopTimers(){clearInterval(clock);clearTimeout(nextTimer);clock=null;nextTimer=null;}
function close(){stopTimers();window.speechSynthesis?.cancel();const old=root;if(s&&s.phase==='play')OC.sonlandir(s.key);root=null;s=null;old?.remove();window.dmViewHistory?.leave(old);window.dmGameViewport?.sync();prior?.focus?.();}
const status=text=>{const e=root?.querySelector('[data-status]');if(e)e.textContent=text;};
function sound(kind){if(window.dmSoundEnabled===false||window.dmSesAcik===false)return;window.genelSesEfektiCal?.(kind);}
function monster(i){return `<span class="sa-monster sa-monster-${i}" aria-hidden="true"></span>`;}
function floor(i,offset=0){return `<img class="sa-floor" src="arcade-assets/floor.webp" alt="" style="--i:${i};--offset:${offset}px;--hue:${i%4*48}deg">`;}
function open(key){
 if(!games[key]||window.dmFeatureEnabled?.('oyun_'+key)===false||window.dmProgression?.require('oyun_'+key)===false)return;
 close();prior=document.activeElement;const parent=window.dmViewHistory?.capture();
 s={key,owner:who(),student:player(),classNo:1,units:[],phase:'setup',busy:false,index:0,streak:0,balance:100,floors:[],runId:null};
 root=document.createElement('section');root.id='soloArcadeOverlay';root.className='sa-overlay game-modal-overlay sa-'+key;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','saTitle');
 root.innerHTML=`<div class="sa-shell"><header class="sa-header"><button type="button" data-close aria-label="Oyundan çık">‹</button><h2 id="saTitle">${games[key].title}</h2><button type="button" data-pause aria-label="Oyunu duraklat" hidden>Ⅱ</button></header><div class="sa-body"></div></div>`;
 document.body.append(root);root.querySelector('[data-close]').onclick=close;root.querySelector('[data-pause]').onclick=togglePause;
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const a=[...root.querySelectorAll('button:not(:disabled),select')].filter(b=>b.getClientRects().length&&!b.closest('[hidden]'));if(!a.length)return;const i=a.indexOf(document.activeElement);e.preventDefault();a[(i+(e.shiftKey?-1:1)+a.length)%a.length].focus();}});
 window.dmViewHistory?.track(root,{parent,close});setup();root.querySelector('[data-close]').focus();window.dmGameViewport?.sync();
}
function setup(){
 const g=games[s.key],tower=s.key==='kule';
 root.querySelector('.sa-body').innerHTML=`<div class="sa-intro-art">${tower?`<div class="sa-demo-tower">${[0,1,2,3].map((i)=>floor(i,(i%2?8:-7))).join('')}</div>`:`<div class="sa-demo-monsters">${[0,1,2].map(monster).join('')}</div>`}<img class="sa-papi" src="papi-welcome-v2.png" alt="Papi"><span class="sa-unlock">${g.level}. seviyede açılır</span></div><div class="sa-setup-panel"><p class="sa-instruction">${g.hint}</p><label>Sınıf seç<select data-grade aria-label="Sınıf seç"></select></label><label>Ünite seç<select data-unit aria-label="Ünite seç"></select></label><p class="sa-bank-note">Seçili ünitenin kelimeleri · En fazla 12 soru</p><p data-status role="status"></p><button type="button" class="sa-start" data-start><span>▶ OYUNA BAŞLA</span><small>${practice()||window.dmTeacherPortalMode?'Sınıf oyunu · Enerji harcanmaz':'⚡ 3 Enerji'}</small></button></div>`;
 const select=root.querySelector('[data-grade]');
 for(let n=1;n<=8;n++){const o=document.createElement('option');o.value=n;o.textContent=n+'. Sınıf';const why=window.dmGameAccess?.reason(n);o.disabled=!!why;if(why)o.textContent+=' 🔒';select.append(o);}
 const active=window.dmGameAccess?.rule(),desired=active?.cls||Number((window.masterKelimeHavuzu||[])[0]?.sinif)||1;
 select.value=String([...select.options].find(o=>Number(o.value)===desired&&!o.disabled)?.value||[...select.options].find(o=>!o.disabled)?.value||1);
 select.onchange=chooseClass;root.querySelector('[data-unit]').onchange=e=>{s.units=[Number(e.target.value)];status('');};root.querySelector('[data-start]').onclick=start;chooseClass();
}
function chooseClass(){if(!s)return;s.classNo=Number(root.querySelector('[data-grade]').value);const units=[...new Set((window.masterKelimeHavuzu||[]).filter(w=>Number(w.sinif)===s.classNo).map(w=>Number(w.unite)).filter(n=>n>0))].sort((a,b)=>a-b),select=root.querySelector('[data-unit]');select.replaceChildren();for(const n of units){const o=document.createElement('option');o.value=n;o.textContent=n+'. Ünite';const why=window.dmGameAccess?.reason(s.classNo,n);o.disabled=!!why;if(why)o.textContent+=' 🔒';select.append(o);}const first=[...select.options].find(o=>!o.disabled);select.value=first?.value||'';s.units=first?[Number(first.value)]:[];status(first?'':'Bu sınıfın kelimeleri henüz yüklenmedi. Oyunları kapatıp yeniden açabilirsin.');}
async function start(){
 const current=s;if(!current||current.busy||current.phase!=='setup')return;
 if(window.dmProgression?.require('oyun_'+current.key)===false)return;
 if(!current.student)return status('Önce giriş yap veya sınıf oyununda öğrenci seç.');
 if(!current.units.length)return status('Bir ünite seç.');
 const why=window.dmGameAccess?.reason(current.classNo,current.units[0]);if(why)return status(why);
 const bank=pool(oyunHavuzGetir(current.classNo,current.units));if(bank.length<2)return status('Bu oyun için ünitede en az iki farklı kelime olmalı. Başka bir ünite seç.');
 current.busy=true;root.querySelectorAll('select,[data-start]').forEach(b=>b.disabled=true);status('Oyun hazırlanıyor…');
 try{
  if(!window.OC||!window.dmVerifiedGames)throw Error('Oyun sistemi yüklenemedi. Sayfayı yenile.');
  if(!current.runId){current.bank=bank;current.words=OC.kelimeSec(current.key,bank,12);OC.basla(current.key);current.runId=OC.aktif.runId;}
  const result=await window.dmVerifiedGames.start(current.key,current.runId,{classNo:current.classNo,units:current.units},current.words);
  if(!alive(current))return;
  if(typeof result?.enerjiKalan==='number'){window.genelEnerjiKalan=result.enerjiKalan;window.headerEnerjiGoster?.(result.enerjiKalan,result.enerjiMax||25);}
  current.phase='play';root.classList.add('sa-playing');root.querySelector('[data-pause]').hidden=false;question();clock=setInterval(tick,100);
 }catch(e){if(alive(current)){status(e.message);root.querySelector('[data-start]').disabled=false;/* Retrying an uncertain start preserves its ID and scope, preventing a second debit. */if(!current.runId)root.querySelectorAll('select').forEach(b=>b.disabled=false);if(/enerji/i.test(e.message))window.genelEnerjiBittiGoster?.();}}
 finally{if(alive(current))current.busy=false;}
}
function question(){
 if(!s||s.index>=s.words.length)return finish();s.locked=false;s.remaining=15000;s.lastTick=Date.now();s.choices=options(s.words[s.index],s.bank,s.key);
 const tower=s.key==='kule',word=s.words[s.index];
 const answers=s.choices.map((v,i)=>`<button type="button" class="${tower?'sa-answer':'sa-target'}" data-answer="${i}" ${tower?'':'style="--delay:'+i*.21+'s"'}>${tower?'<span>'+esc(v)+'</span>':'<span class="sa-monster sa-monster-'+i+'"><span class="sa-word">'+esc(v)+'</span></span>'}</button>`).join('');
 root.querySelector('.sa-body').innerHTML=`<div class="sa-hud"><span>${tower?'Kat':'Puan'}<b>${tower?s.floors.length:OC.puan()}</b></span><span>Soru<b>${s.index+1}/${s.words.length}</b></span><span>Süre<b data-time>15 sn</b></span></div><div class="sa-time-track"><i data-timebar></i></div>${tower?`<div class="sa-tower-scene"><div class="sa-crane"><i></i><span></span></div><div class="sa-stack" style="--lean:${(100-s.balance)/14}deg">${s.floors.slice(-5).map((x,i)=>floor(i,x)).join('')}${floor(Math.min(5,s.floors.length),0)}</div><img class="sa-flying-papi" src="papi-welcome-v2.png" alt=""><div class="sa-balance"><span>Denge</span><meter min="0" max="100" low="30" high="65" optimum="100" value="${s.balance}"></meter></div></div>`:''}<div class="sa-question"><button type="button" data-speak aria-label="İngilizce kelimeyi dinle">♫</button><h3>${tower?'“'+esc(en(word))+'” ne demek?':esc(tr(word))+' hangisi?'}</h3></div><div class="${tower?'sa-answers':'sa-targets'}">${answers}</div><footer class="sa-feedback"><p data-feedback role="status">${s.streak?`${s.streak} doğru üst üste!`:games[s.key].hint}</p><button type="button" data-next hidden>Devam et →</button></footer><div class="sa-pause" hidden><h3>Oyun duraklatıldı</h3><p>Hazır olduğunda devam edebilirsin.</p><button type="button" data-resume>▶ Devam et</button></div>`;
 root.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>answer(Number(b.dataset.answer)));root.querySelector('[data-next]').onclick=advance;root.querySelector('[data-resume]').onclick=togglePause;
 root.querySelector('[data-speak]').onclick=()=>{if(window.dmSoundEnabled===false)return;const u=new SpeechSynthesisUtterance(en(word));u.lang='en-US';u.rate=.85;window.speechSynthesis?.cancel();window.speechSynthesis?.speak(u);};
}
function tick(){if(!s)return;if(s.owner!==who())return close();const now=Date.now(),delta=now-s.lastTick;s.lastTick=now;if(s.phase!=='play'||s.paused||s.locked)return;s.remaining=Math.max(0,s.remaining-delta);const time=root.querySelector('[data-time]'),bar=root.querySelector('[data-timebar]');if(time)time.textContent=Math.ceil(s.remaining/1000)+' sn';if(bar)bar.style.width=s.remaining/150+'%';if(s.remaining===0)answer(-1);}
function togglePause(){if(!s||s.phase!=='play'||s.locked)return;s.paused=!s.paused;s.lastTick=Date.now();root.classList.toggle('sa-paused',s.paused);root.querySelector('.sa-pause').hidden=!s.paused;root.querySelector('[data-pause]').setAttribute('aria-label',s.paused?'Oyuna devam et':'Oyunu duraklat');}
function answer(index){
 if(!s||s.phase!=='play'||s.locked||s.paused)return;s.locked=true;const word=s.words[s.index],correct=s.key==='kule'?tr(word):en(word),choice=s.choices[index]??null,ok=choice!==null&&norm(choice)===norm(correct);
 window.dmVerifiedGames.record(word,choice,s.runId);root.querySelectorAll('[data-answer]').forEach(b=>{b.disabled=true;const value=s.choices[Number(b.dataset.answer)];b.classList.toggle('sa-correct',norm(value)===norm(correct));b.classList.toggle('sa-wrong',Number(b.dataset.answer)===index&&!ok);});
 if(ok){OC.dogru();s.streak++;s.balance=Math.min(100,s.balance+(s.streak%3===0?20:0));sound('dogru');if(s.key==='kule'){s.floors.push((100-s.balance)/5*(s.index%2?1:-1));root.querySelector('.sa-tower-scene').classList.add('sa-drop');}else root.querySelector('.sa-targets').classList.add('sa-hit');}
 else{OC.yanlis();s.streak=0;s.balance=Math.max(0,s.balance-25);sound('yanlis');if(!practice())window.dmWrongWords?.add(word);root.querySelector('.sa-tower-scene')?.classList.add('sa-wobble');}
 const text=root.querySelector('[data-feedback]');text.textContent=ok?(s.streak%3===0?(s.key==='kule'?'Harika seri! Kule dengelendi!':'Süper atış! Üç doğru üst üste!'):'Harika! '+en(word)+' = '+tr(word)):(index<0?'Süre doldu. ':'Doğru cevap: ')+en(word)+' = '+tr(word);text.classList.toggle('is-error',!ok);
 if(ok){const current=s;nextTimer=setTimeout(()=>{if(alive(current))advance();},1100);}else{root.querySelector('[data-next]').hidden=false;root.querySelector('[data-next]').focus({preventScroll:true});}
}
function advance(){if(!s||!s.locked)return;clearTimeout(nextTimer);s.index++;if(s.key==='kule'&&s.balance===0){for(let i=s.index;i<s.words.length;i++){window.dmVerifiedGames.record(s.words[i],null,s.runId);OC.yanlis();}s.index=s.words.length;}question();}
async function finish(){
 const current=s;if(!current||current.phase==='saving'||current.phase==='done')return;stopTimers();current.phase='saving';current.result=current.result||OC.sonlandir(current.key);root.querySelector('[data-pause]').hidden=true;
 const r=current.result;root.querySelector('.sa-body').innerHTML='<div class="sa-finish"><img src="papi-reward-v2.png" alt="Kutlayan Papi"><h3>Oyun tamamlandı!</h3><p data-status role="status">Sonucun kaydediliyor…</p><button type="button" data-retry hidden>Kaydı tekrar dene</button></div>';
 try{
  if(!practice()){const res=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:games[current.key].op+'LiderlikKaydet',isim:current.student,sinif:current.classNo+'. Sınıf',unite:current.units.join(','),runId:current.runId,puanSurum:3,puan:r.puan,puanTemel:r.temelPuan,dogru:r.dogru,yanlis:r.yanlis,suresaniye:r.sure})}),d=await res.json();if(!res.ok||d.status!=='success')throw Error(d.mesaj||d.message||'Sonuç kaydedilemedi.');}
  if(!alive(current))return;current.phase='done';const key=current.key,local=practice();close();
  genelSonucEkraniGoster({oyunAdi:games[key].title,oyunKey:key,runId:current.runId,puanSurum:3,rewardScope:{classNo:current.classNo,units:current.units},leaderboardSaved:true,isim:current.student,puan:r.puan,dogru:r.dogru,yanlis:r.yanlis,xp:r.xp,sureSaniye:r.sure,yildiz:r.yildiz,siralamaYok:local,devamFn:()=>{},tekrarFn:()=>open(key)});
  if(!local)fetch(apiURL+'?islem='+games[key].op+'LiderlikTumunuGetir&sinif='+current.classNo+'&donem=hafta').then(r=>r.json()).then(rows=>{if(who()===current.owner&&window.OC?.sonuc(key)?.runId===current.runId&&Array.isArray(rows))genelSonucSiralamaCiz(rows,current.student);}).catch(()=>{});
 }catch(e){if(alive(current)){current.phase='save-error';status(e.message);const b=root.querySelector('[data-retry]');b.hidden=false;b.onclick=finish;}}
}
function addCards(){const grid=document.querySelector('#tab-aktiviteler .az-grid2x2');if(!grid)return;for(const [key,g] of Object.entries(games)){if(document.getElementById(g.card))continue;const b=document.createElement('button');b.type='button';b.id=g.card;b.className='az-gcard';b.dataset.dmParty='solo';b.setAttribute('onclick',g.open+'()');b.innerHTML='<div class="az-gcard-title">'+g.title+'</div>';grid.append(b);}window.dmGamesUI?.refresh();window.dmProgression?.paint();}
for(const [key,g] of Object.entries(games))window[g.open]=()=>open(key);
window.dmSoloArcade={close,scope:key=>s?.key===key?{classNo:s.classNo,units:s.units.slice()}:null};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&s?.phase==='play'&&!s.locked&&!s.paused)togglePause();});document.addEventListener('dm:login',close);addCards();
})();
