/* Kelime Golü. Soccer presentation of the validated word-choice protocol (ky).
   Solo deliberately uses the existing OC, energy, verified answers and reward
   ledger, rather than creating a second client-side economy. Classroom mode
   never calls OC, energy, rewards, or account/leaderboard endpoints. */
(()=>{'use strict';
const PROTOCOL='ky',TOTAL=12;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const en=w=>String(w.ingilizce||w.en||'').trim(),tr=w=>String(w.turkce||w.tr||'').trim();
const norm=v=>String(v).normalize('NFKC').toLocaleLowerCase('tr').replace(/\s+/g,' ').trim();
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function words(bank){const seen=new Set();return bank.filter(w=>{const k=en(w).toLowerCase();if(!k||!tr(w)||seen.has(k))return false;seen.add(k);return true;});}
function options(word,bank){const seen=new Set([norm(tr(word))]);const wrong=shuffle(bank).filter(w=>{const k=norm(tr(w));if(!k||seen.has(k))return false;seen.add(k);return true;}).slice(0,3).map(tr);if(wrong.length!==3)throw Error('Dört farklı anlam için başka bir ünite daha seç.');return shuffle([tr(word),...wrong]);}
function decks(bank){const a=shuffle(words(bank)).slice(0,TOTAL);return [a,a.slice(1).concat(a.slice(0,1))];}
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const practice=()=>!!window.dmTeacherPortalMode||who().toLowerCase()==='teacher'||typeof siniftaOynananOgrenci!=='undefined'&&!!siniftaOynananOgrenci;
const pupil=()=>typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci?String(siniftaOynananOgrenci):who();
let root=null,session=null,tick=null,origin=null,epoch=0,soundOn=true;
const timers=new Set();
function later(fn,ms){const ticket=epoch;const id=setTimeout(()=>{timers.delete(id);if(ticket===epoch&&root)fn();},ms);timers.add(id);}
function effect(good){if(soundOn)window.genelSesEfektiCal?.(good?'dogru':'yanlis');}
function cleanup(){epoch++;clearInterval(tick);tick=null;for(const id of timers)clearTimeout(id);timers.clear();}
function close(){const s=session;cleanup();root?.remove();root=null;session=null;if(s?.mode==='solo'&&s.runId&&window.OC?.aktif?.runId===s.runId&&!OC.aktif.bitti)OC.aktif.bitti=true;window.dmPlayNavigation?.sync?.();window.dmGameViewport?.sync?.();origin?.focus?.();}
function status(text){const el=root?.querySelector('[data-status]');if(el)el.textContent=text;}
function unitsFor(cls){return [...new Set((window.masterKelimeHavuzu||[]).filter(w=>Number(w.sinif)===cls).map(w=>Number(w.unite)).filter(n=>n>0))].sort((a,b)=>a-b);}
function locked(cls,unit){return session?.mode==='solo'?window.dmGameAccess?.reason?.(cls,unit)||'':'';}
function fillUnits(){const s=session;s.units=[];const box=root.querySelector('[data-units]');box.innerHTML=unitsFor(s.classNo).map(n=>`<label class="kg-unit"><input type="checkbox" value="${n}" ${locked(s.classNo,n)?'disabled':''}>${n}. Ünite</label>`).join('');const first=box.querySelector('input:not(:disabled)');if(first)first.checked=true;box.onchange=()=>{s.units=[...box.querySelectorAll('input:checked')].map(b=>Number(b.value));};box.onchange();}
function open(mode='solo'){
 if(mode==='solo'&&window.dmFeatureEnabled?.('oyun_kelime')===false)return;
 if(mode==='solo'&&!practice()&&window.dmProgression?.allowed?.('oyun_kelime')===false){window.dmProgression?.require?.('oyun_kelime');return;}
 close();origin=document.activeElement;const solo=mode==='solo';session={mode:solo?'solo':'duo',owner:who(),classNo:1,units:[],phase:'setup',players:[],starting:false};
 root=document.createElement('section');root.id='kelimeGolu';root.className='kg-overlay game-modal-overlay';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Kelime Golü');
 root.innerHTML=`<header class="kg-header"><button type="button" class="kg-back" data-back aria-label="Geri dön">‹</button><div><small>DİJİ MEDU · ${solo?'TEK KİŞİLİK':'KAPIŞMA'}</small><h2>Kelime <span>Golü</span> ⚽</h2></div><button type="button" data-sound aria-label="Sesi kapat" aria-pressed="true">🔊</button><button type="button" data-exit aria-label="Oyunu kapat">×</button></header><main class="kg-main"></main>`;
 document.body.append(root);root.querySelector('[data-exit]').onclick=close;root.querySelector('[data-back]').onclick=()=>session?.phase==='setup'?close():open(mode);root.querySelector('[data-sound]').onclick=e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'🔊':'🔇';e.currentTarget.setAttribute('aria-pressed',String(soundOn));e.currentTarget.setAttribute('aria-label',soundOn?'Sesi kapat':'Sesi aç');};
 root.querySelector('[data-sound]').textContent=soundOn?'🔊':'🔇';
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const list=[...root.querySelectorAll('button:not(:disabled),input:not(:disabled),select')].filter(x=>x.getClientRects().length);const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
 setup();
 if(!(window.masterKelimeHavuzu||[]).length&&typeof dijiKelimeHavuzunuYukle==='function'){const current=session;root.querySelector('[data-start]').disabled=true;status('Kelime havuzu yükleniyor…');Promise.resolve().then(()=>dijiKelimeHavuzunuYukle()).then(()=>{if(session!==current||current.phase!=='setup')return;setup();if(!(window.masterKelimeHavuzu||[]).length)status('Kelime havuzu yüklenemedi. Bağlantını kontrol edip oyunu yeniden aç.');}).catch(()=>{if(session===current){status('Kelime havuzu yüklenemedi. Oyunu yeniden açıp tekrar dene.');root.querySelector('[data-start]').disabled=false;}});}
 window.dmViewHistory?.track?.(root,{close});root.querySelector('[data-back]').focus();
}
function setup(){const s=session,solo=s.mode==='solo';const bank=window.masterKelimeHavuzu||[];const grades=[...new Set(bank.map(w=>Number(w.sinif)).filter(n=>n>=1&&n<=8))].sort((a,b)=>a-b);s.classNo=grades.filter(n=>!locked(n,0))[0]||1;
 root.querySelector('.kg-main').innerHTML=`<div class="kg-setup"><div class="kg-preview"><div>⚽</div><h3>Köşeni seç, golünü at!</h3><p>Topun üzerindeki İngilizce kelimeyi oku.<br>Doğru Türkçe anlamın olduğu köşeye dokun.</p></div><div class="kg-form"><h3>${solo?'Sahaya çıkmaya hazır mısın?':'İki oyuncu, aynı anda iki kale!'}</h3><p class="kg-rules">${solo?(practice()?'Öğretmen etkinliği · enerji ve hesap ödülü yok':'Diğer tek kişilik oyunlarla aynı enerji ve ödül kuralları · giriş 3 ⚡')+'<br>12 kelime · Doğru +100 · Yanlış −40 · Seri ve hız bonusu':'12’şer şut · Her şuta 15 saniye<br>Gol +10 · Yanlış −5 · Enerji ve joker harcanmaz'}</p>${solo?'':`<div class="kg-names"><label>Mavi oyuncu<input data-name="0" maxlength="24" value="1. Oyuncu"></label><label>Turuncu oyuncu<input data-name="1" maxlength="24" value="2. Oyuncu"></label></div>`}<label>Sınıf<select data-grade>${grades.map(n=>`<option value="${n}" ${locked(n,0)?'disabled':''}>${n}. Sınıf</option>`).join('')}</select></label><fieldset><legend>Üniteler</legend><div data-units class="kg-units"></div></fieldset><p data-status role="status"></p><button class="kg-primary" type="button" data-start>⚽ Maçı başlat</button></div></div>`;
 const grade=root.querySelector('[data-grade]');grade.value=String(s.classNo);grade.onchange=()=>{s.classNo=Number(grade.value);fillUnits();};fillUnits();root.querySelector('[data-start]').onclick=start;
}
async function start(){const s=session;if(!s||s.starting||s.phase!=='setup')return;
 if(!s.units.length)return status('En az bir ünite seç.');
 const bank=words((window.masterKelimeHavuzu||[]).filter(w=>Number(w.sinif)===s.classNo&&s.units.includes(Number(w.unite))));
 if(bank.length<4||new Set(bank.map(w=>norm(tr(w)))).size<4)return status('En az dört farklı kelime ve anlam içeren üniteler seç.');
 if(s.mode==='solo'&&s.units.some(u=>locked(s.classNo,u)))return status('Seçtiğin sınıf veya ünite henüz açık değil.');
 if(s.mode==='solo'&&!pupil())return status('Önce öğrenci hesabına giriş yap veya öğretmen modunu aç.');
 const button=root.querySelector('[data-start]');s.starting=true;button.disabled=true;status('Saha hazırlanıyor…');
 try{
  let selected;
  if(s.mode==='solo'){
   if(!practice()&&!window.dmOdevEnerjiMuaf?.()&&typeof window.genelEnerjiKalan==='number'&&window.genelEnerjiKalan<3){window.genelEnerjiBittiGoster?.();throw Error('Oynamak için 3 enerji gerekli.');}
   if(!window.OC||!window.dmVerifiedGames)throw Error('Oyun sistemi yükleniyor. Biraz sonra tekrar dene.');
   // Reuse the exact server-validated multiple-choice engine and its reward bucket.
   selected=OC.kelimeSec(PROTOCOL,bank,OC.SORU);
   const prior=window.dmSelectedIntro;window.dmSelectedIntro={key:PROTOCOL,classNo:s.classNo,units:s.units.slice()};
   try{OC.basla(PROTOCOL);}finally{window.dmSelectedIntro=prior;}
   s.runId=OC.aktif.runId;s.rewardScope={classNo:s.classNo,units:s.units.slice()};OC.aktif.rewardScope=s.rewardScope;
   if(!practice()){
    await window.dmVerifiedGames.start(PROTOCOL,s.runId,s.rewardScope,selected);
    if(session!==s||s.owner!==who())return;
    // Shared energy entry handles classroom exemptions and the existing free ticket.
    const energy=await window.genelEnerjiHarca(-3);
    if(energy&&(energy.ok===false||energy.status==='error'||Number(energy.eklenen)>-3))throw Error(energy.mesaj||'Enerji doğrulanamadı. Tekrar dene.');
   }
  }else selected=decks(bank);
  if(session!==s||s.owner!==who())return;
  s.bank=bank;s.started=Date.now();s.phase='play';
  const lists=s.mode==='solo'?[selected]:selected;
  s.players=lists.map((list,i)=>({name:s.mode==='solo'?pupil():root.querySelector(`[data-name="${i}"]`).value.trim()||`${i+1}. Oyuncu`,words:list,index:0,correct:0,wrong:0,score:0,locked:false,finished:false}));
  play();tick=setInterval(update,150);
 }catch(e){if(session===s){status(e.message);button.disabled=false;}}
 finally{if(session===s)s.starting=false;}
}
const ballMarkup=()=>`<svg viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="kgBallShade"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#f3f5fb"/><stop offset="1" stop-color="#9caec6"/></radialGradient></defs><circle cx="60" cy="60" r="58" fill="url(#kgBallShade)" stroke="#d4e0eb" stroke-width="2"/><g fill="#153d78" stroke="#617eac" stroke-width="1.5"><path d="m49 3 22 0 9 17-20 13-20-13zM4 39l16-6 9 21-10 23L3 71zM100 33l16 6 1 32-16 6-10-23zM29 94l24 8 2 15-28-9-13-13zM67 102l24-8 15 1-13 13-28 9z"/></g><path d="m40 20-20 13m60-13 20 13M19 77l10 17m72-17-10 17M53 102l14 0" stroke="#bcc9d9" stroke-width="2" fill="none"/></svg>`;
function play(){root.classList.toggle('kg-duo',session.mode==='duo');root.querySelector('.kg-main').innerHTML=`<div class="kg-pitches">${session.players.map((p,i)=>`<section class="kg-player" data-player="${i}"><div class="kg-player-head"><b>${esc(p.name)}</b><strong data-score>0 PUAN</strong><span data-progress></span><span data-clock></span></div><div class="kg-pitch"><div class="kg-goal-targets">${[0,1,2,3].map(n=>`<button type="button" class="kg-target kg-target-${n}" data-target="${n}"></button>`).join('')}</div><div class="kg-shot-glove" hidden>🧤</div><div class="kg-ball">${ballMarkup()}<b lang="en" data-word></b></div><div class="kg-feedback" role="status" aria-live="polite"></div></div><div class="kg-help">Doğru anlamın olduğu köşeye dokun!</div></section>`).join('')}</div>`;
 session.players.forEach((p,i)=>{root.querySelectorAll(`[data-player="${i}"] [data-target]`).forEach(b=>b.onclick=()=>shoot(i,Number(b.dataset.target)));question(i);});update();
}
function question(i){const s=session,p=s.players[i],panel=root.querySelector(`[data-player="${i}"]`);
 if(p.index>=p.words.length){p.finished=true;panel.querySelectorAll('[data-target]').forEach(b=>b.disabled=true);panel.querySelector('.kg-ball').hidden=true;panel.querySelector('.kg-feedback').textContent='🏁 Şutların tamamlandı!';if(s.players.every(x=>x.finished))finish();return;}
 p.options=options(p.words[p.index],s.bank);p.locked=false;p.deadline=Date.now()+15000;
 panel.querySelectorAll('[data-target]').forEach((b,n)=>{b.textContent=p.options[n];b.disabled=false;b.classList.remove('kg-correct','kg-wrong');});
 const ball=panel.querySelector('.kg-ball');ball.style.transform='';ball.classList.remove('kg-flying');ball.hidden=false;panel.querySelector('[data-word]').textContent=en(p.words[p.index]);panel.querySelector('.kg-feedback').textContent='';panel.querySelector('.kg-shot-glove').hidden=true;panel.querySelector('.kg-pitch').classList.remove('kg-goal');
 panel.querySelector('[data-progress]').textContent=`Şut ${p.index+1}/${p.words.length}`;
}
function shoot(i,n){const s=session,p=s?.players[i];if(!s||s.phase!=='play'||!p||p.locked||p.finished||s.owner!==who())return;
 p.locked=true;const word=p.words[p.index],answer=n===null?null:p.options[n],good=answer!==null&&norm(answer)===norm(tr(word));
 const panel=root.querySelector(`[data-player="${i}"]`),pitch=panel.querySelector('.kg-pitch'),ball=panel.querySelector('.kg-ball');
 panel.querySelectorAll('[data-target]').forEach(b=>b.disabled=true);
 if(s.mode==='solo'){window.dmVerifiedGames.record(word,answer,s.runId);if(good){OC.dogru(1);p.correct++;}else{OC.yanlis(false);p.wrong++;window.dmWrongWords?.add(word);}p.score=OC.puan();}
 else{p.score+=good?10:-5;good?p.correct++:p.wrong++;}
 if(n!==null){const target=panel.querySelector(`[data-target="${n}"]`),a=ball.getBoundingClientRect(),b=target.getBoundingClientRect();ball.classList.add('kg-flying');ball.style.transform=`translate(${b.left+b.width/2-a.left-a.width/2}px,${b.top+b.height/2-a.top-a.height/2}px) scale(.24) rotate(300deg)`;}
 later(()=>{
  if(session!==s)return;
  effect(good);pitch.classList.toggle('kg-goal',good);
  panel.querySelectorAll('[data-target]').forEach((b,j)=>{b.classList.toggle('kg-correct',norm(p.options[j])===norm(tr(word)));b.classList.toggle('kg-wrong',j===n&&!good);});
  if(!good&&n!==null){const glove=panel.querySelector('.kg-shot-glove');const t=panel.querySelector(`[data-target="${n}"]`),a=pitch.getBoundingClientRect(),b=t.getBoundingClientRect();glove.style.left=b.left+b.width/2-a.left+'px';glove.style.top=b.top+b.height/2-a.top+'px';glove.hidden=false;}
  panel.querySelector('[data-score]').textContent=p.score+' PUAN';
  panel.querySelector('.kg-feedback').textContent=good?(s.mode==='duo'?'GOOOL! +10':'GOOOL! ⚽'):(n===null?'Süre doldu! ':s.mode==='duo'?'Kurtarış! −5 · ':'Kurtarış! ')+en(word)+' = '+tr(word);
  later(()=>{p.index++;question(i);},good?750:1600);
 },550);
}
function update(){const s=session;if(!root||!s||s.phase!=='play')return;if(who()!==s.owner){close();return;}s.players.forEach((p,i)=>{if(p.finished)return;const el=root.querySelector(`[data-player="${i}"] [data-clock]`);el.textContent=s.mode==='solo'?`⏱ ${Math.floor((Date.now()-s.started)/1000)} sn`:`⏱ ${Math.max(0,Math.ceil((p.deadline-Date.now())/1000))} sn`;if(s.mode==='duo'&&!p.locked&&Date.now()>=p.deadline)shoot(i,null);});}
function finish(){const s=session;if(!s||s.phase!=='play')return;s.phase='result';clearInterval(tick);tick=null;
 if(s.mode==='solo'){
  const result=OC.sonlandir(PROTOCOL),p=s.players[0];
  window.genelSonucEkraniGoster({oyunAdi:'⚽ Kelime Golü',isim:p.name,...result,sureSaniye:result.sure,oyunKey:PROTOCOL,rewardScope:s.rewardScope,siralamaYok:practice()&&!window.dmTeacherPortalMode,devamFn:close,tekrarFn:()=>open('solo')});
  // The established word-choice leaderboard validates this same run and score.
  if(!practice()||window.dmTeacherPortalMode)saveScore(s,result).catch(()=>{});
 }else{
  const [a,b]=s.players,winner=a.score===b.score?'Berabere!':(a.score>b.score?a.name:b.name)+' kazandı!';
  root.querySelector('.kg-main').innerHTML=`<div class="kg-results"><div class="kg-trophy">🏆</div><h3>${esc(winner)}</h3><div class="kg-result-grid">${s.players.map(p=>`<article><h4>${esc(p.name)}</h4><strong>${p.score} puan</strong><p>${p.correct} gol · ${p.wrong} yanlış</p></article>`).join('')}</div><p>Enerji ve joker harcanmadı. Hesaplara XP veya altın yazılmaz.</p><button type="button" class="kg-primary" data-again>Rövanş ⚽</button><button type="button" data-done>Oyunlara dön</button></div>`;
  root.querySelector('[data-again]').onclick=()=>open('duo');root.querySelector('[data-done]').onclick=close;
 }
}
async function saveScore(s,result){
 const body={islem:'kelimeLiderlikKaydet',isim:s.owner,sinif:s.classNo+'. Sınıf',unite:s.units.join(',')+'. Ünite',runId:s.runId,puan:result.puan,dogru:result.dogru,yanlis:result.yanlis,suresaniye:result.sure,puanTemel:result.temelPuan,puanSurum:3};
 const r=await fetch(apiURL,{method:'POST',body:JSON.stringify(body)});const d=await r.json();if(!r.ok||d.status!=='success')return;
 if(who()!==s.owner)return;
 const list=await fetch(apiURL+'?islem=kelimeLiderlikTumunuGetir&sinif='+encodeURIComponent(body.sinif)+'&donem=hafta&puanSurum=3').then(x=>x.json());
 if(session===s&&who()===s.owner)window.genelSonucSiralamaCiz?.(Array.isArray(list)?list:list.liste||[],s.owner);
}
function mount(){const grid=document.querySelector('#tab-aktiviteler .az-grid2x2');if(!grid)return;
 for(const [id,mode] of [['kelimeGoluSolo','solo'],['kelimeGoluDuo','duo']])if(!document.getElementById(id)){const b=document.createElement('button');b.type='button';b.id=id;b.className='az-gcard';b.setAttribute('onclick',mode==='solo'?'kelimeGoluAc()':'kelimeGoluKapismaAc()');b.innerHTML='<span class="az-gcard-title">Kelime Golü</span>';grid.append(b);}
 window.dmGamesUI?.refresh?.();
}
window.kelimeGoluAc=()=>open('solo');window.kelimeGoluKapismaAc=()=>open('duo');
window.dmKelimeGolu={open,close};window.dmKelimeGoluCore=Object.freeze({words,options,decks,norm});
mount();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
})();
