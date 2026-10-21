/* Topic practice is intentionally ephemeral. No scores, feed, assignments, or local result history. */
(()=>{'use strict';
const version='20261021-konu-3',cats={grammar:['Dil Bilgisi','📘'],vocab:['Kelimeler','☀️'],comm:['İletişim','💬']};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const who=()=>String(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi||'');
const guest=()=>!!window.dmGuestMode||!who();
const practice=()=>guest()||who().toLowerCase()==='teacher';
const title=t=>t.key.split('|').slice(2).join('|').split(' — ').at(-1);
const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let catalog,core,loading,rows,category='all',root=null,owner='',topic,game,run,questions=[],picks=[],index=0,correct=0,streak=0,epoch=0,timer,watch,origin,navKey='',returnView,quota=new Map(),quotaDay='',activeRequest;
const desc={kova:'Kelimeyi oku, doğru görselin kovasına dokun.',cark:'Çarkı çevir, görselin İngilizcesini seç.',balon:'Cümleyi tamamlayan balonu patlat.',dy:'Cümle Türkçe anlamıyla eşleşiyor mu? Karar ver.',sohbet:'Bir arkadaşınla konuş, doğru cevabı seç.',durum:'Günlük durumlarda ne söyleyeceğini keşfet.'};
function quotaKey(t,g){const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());if(day!==quotaDay){quota.clear();quotaDay=day;}return who()+'|'+t.key+'|'+g;}
async function api(islem,data={}){
 if(typeof apiURL==='undefined')throw Error('Uygulama bağlantısı hazır değil.');
 const controller=new AbortController();activeRequest=controller;const timeout=setTimeout(()=>controller.abort(),20000);
 try{const token=guest()?'':who().toLowerCase()==='teacher'?(sessionStorage.getItem('ing_ogr_token')||localStorage.getItem('ing_token')||''):(localStorage.getItem('ing_token')||'');
 const response=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem,...data,t:token}),signal:controller.signal});const d=await response.json();
 if(!response.ok||d?.ok===false)throw Error(d?.mesaj||'Bağlantı tamamlanamadı.');return d;
 }catch(e){if(e.name==='AbortError')throw Error('Bağlantı gecikti. Lütfen yeniden başlat.');throw e;}finally{clearTimeout(timeout);if(activeRequest===controller)activeRequest=null;}
}
function load(){if(loading)return loading;loading=(async()=>{
 if(!window.DijiTopicGamesA1)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='konu-oyunlari-a1.js?v='+version;s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('Oyun içerikleri yüklenemedi.'));};document.head.append(s);});
 catalog=window.DijiTopicGamesA1;core=await import('./topic-games-core.mjs?v='+version);
 const cache=typeof dcTumKonularCache!=='undefined'?dcTumKonularCache:null;
 rows=Array.isArray(cache)&&cache.length?cache:await api('dersKonulariGetir');
 if(!Array.isArray(rows))throw Error('Konular yüklenemedi.');
 rows=rows.filter(r=>r.seviye==='A1'&&Object.hasOwn(cats,r.kategori)).sort((a,b)=>Object.keys(cats).indexOf(a.kategori)-Object.keys(cats).indexOf(b.kategori)||Number(a.siraNo)-Number(b.siraNo));
 })().catch(e=>{loading=null;throw e;});return loading;}
async function mount(host){
 let hub=host.querySelector('.kg-hub');if(!hub){hub=document.createElement('section');hub.className='kg-hub';hub.id='kgTopicPanel';hub.setAttribute('role','tabpanel');hub.setAttribute('aria-labelledby','ggKonuTab');host.querySelector('.az-grid2x2').before(hub);}
 hub.hidden=false;if(hub.dataset.loaded)return;
 hub.innerHTML='<p role="status">Konu oyunları yükleniyor…</p>';
 try{await load();if(!hub.isConnected)return;hub.dataset.loaded='1';drawList(hub);}catch(e){hub.innerHTML='<p role="alert">'+esc(e.message)+'</p><button type="button">Tekrar dene</button>';hub.querySelector('button').onclick=()=>mount(host);}
}
function drawList(hub){hub.innerHTML='<div class="kg-chips" aria-label="Dil seviyesi">'+['A1','A2','B1','B2'].map(l=>'<button type="button" data-level="'+l+'" aria-pressed="'+(l==='A1')+'">'+l+(l==='A1'?'':' 🔒 <small>Yakında</small>')+'</button>').join('')+'</div><p class="kg-note" role="status"></p><div class="kg-chips" aria-label="Kategori filtresi">'+[['all','Tümü'],['vocab','Kelimeler'],['grammar','Dil Bilgisi'],['comm','İletişim']].map(([k,v])=>'<button type="button" data-category="'+k+'" aria-pressed="'+(category===k)+'">'+'<span class="kg-filter-symbol" aria-hidden="true">'+({all:'▦',vocab:'Aa',grammar:'≡',comm:'☏'}[k])+'</span>'+v+'</button>').join('')+'</div><div class="kg-list">'+rows.filter(r=>category==='all'||r.kategori===category).map(r=>{const key=[r.seviye,r.kategori,r.konuAdi].join('|'),t=catalog.find(t=>t.key===key);return '<button type="button" data-topic="'+esc(key)+'" '+(!t?'aria-disabled="true"':'')+'><span aria-hidden="true">'+cats[r.kategori][1]+'</span><span><b>'+esc(r.konuAdi.split(' — ').at(-1))+'</b><small>'+cats[r.kategori][0]+' · '+(t?'2 oyun':'Yakında')+'</small></span><span aria-hidden="true">›</span></button>';}).join('')+'</div>';
 hub.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{hub.querySelector('.kg-note').textContent=b.dataset.level==='A1'?'A1 konuları herkese açık.':'Bu seviyenin oyunları yakında geliyor.';});
 hub.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;drawList(hub);hub.querySelector('[data-category="'+category+'"]').focus();});
 hub.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>{const t=catalog.find(t=>t.key===b.dataset.topic);if(t)openTopic(t);else hub.querySelector('.kg-note').textContent='Bu konunun oyunları yakında geliyor.';});
}
function speak(text){try{if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.87;u.onerror=()=>{};window.speechSynthesis.speak(u);}catch{}}
function stop(){clearTimeout(timer);try{window.speechSynthesis?.cancel();}catch{}}
function clearRoot(){epoch++;stop();activeRequest?.abort();clearInterval(watch);if(!root)return;window.dmViewHistory?.leave(root);root.remove();root=null;document.body.classList.remove('kg-active');window.dmPapiNotices?.resume?.();}
function close(fromPop=false){const key=navKey;clearRoot();navKey='';origin?.focus?.({preventScroll:true});if(!fromPop&&history.state?.dmTopic===key)history.back();}
function shell(label){if(root){window.dmViewHistory?.leave(root);root.remove();}root=document.createElement('section');root.id='kgOverlay';root.className='kg-overlay';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',label);
 root.innerHTML='<div class="kg-shell"><header><button type="button" data-back aria-label="Önceki ekrana dön">‹</button><strong>'+esc(label)+'</strong><button type="button" data-close aria-label="Konu oyununu kapat">×</button></header><div class="kg-content"></div></div>';
 root.querySelector('[data-close]').onclick=()=>close();root.querySelector('[data-back]').onclick=()=>{if(root.classList.contains('kg-sheet'))close();else showSheet();};
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();if(root.classList.contains('kg-sheet'))close();else showSheet();}if(e.key==='Tab'){const bs=[...root.querySelectorAll('button:not(:disabled)')].filter(x=>x.getClientRects().length);if(e.shiftKey&&document.activeElement===bs[0]){e.preventDefault();bs.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===bs.at(-1)){e.preventDefault();bs[0]?.focus();}}});
 document.body.append(root);document.body.classList.add('kg-active');window.dmPapiNotices?.pause?.();window.dmViewHistory?.track(root,{parent:returnView,close:()=>close(),back:()=>showSheet()});root.querySelector('[data-back]').focus();
 return root.querySelector('.kg-content');}
function openTopic(t){if(root)close(true);owner=who();topic=t;origin=document.activeElement;returnView=window.dmViewHistory?.capture();navKey=crypto.randomUUID();history.pushState({...history.state,dmTopic:navKey},'');showSheet();watch=setInterval(()=>{if(owner!==who())close();},500);}
function showSheet(){epoch++;stop();activeRequest?.abort();const box=shell(title(topic));root.classList.add('kg-sheet');box.innerHTML='<p>Konuyu oynayarak pekiştir.</p>'+topic.games.map(g=>{const left=quota.get(quotaKey(topic,g));return '<button type="button" class="kg-game-card" data-game="'+g+'"><b>'+esc(topic.titles[g])+'</b><span>'+esc(desc[g])+'</span><small>'+(practice()?(guest()?'XP kazanmak için giriş yap':'Öğretmen için alıştırma · XP yok'):left===undefined?'Günde en fazla 3 XP hakkı · kalan hak oyun açılırken kontrol edilir':'Bugün '+left+' XP hakkın kaldı')+'</small><strong>Oyna ›</strong></button>';}).join('')+'<p class="kg-prize">%80 ve üzeri → +70 XP</p>';
 box.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>start(b.dataset.game));}
async function start(g){stop();game=g;picks=[];index=0;correct=0;streak=0;run=null;questions=[];const token=++epoch;const box=shell(topic.titles[game]);box.innerHTML='<p role="status">Sorular hazırlanıyor…</p>';
 try{const d=await api('konuOyunBaslat',{topicKey:topic.key,game});if(token!==epoch||owner!==who()||!root)return;questions=d.sorular;run=d.runId;quota.set(quotaKey(topic,game),d.bugunXpHakki);play();}catch(e){if(token!==epoch||!root)return;box.innerHTML='<p role="alert">'+esc(e.message)+'</p><button type="button" data-retry>Tekrar dene</button>';box.querySelector('button').onclick=()=>start(game);}
}
function wheel(q){const slices=q.slices,N=slices.length,r=100,center=110;return '<div class="kg-wheel-wrap"><span class="kg-arrow" aria-hidden="true">▼</span><svg class="kg-wheel" viewBox="0 0 220 220" aria-label="Konu çarkı">'+slices.map((x,i)=>{const a=(i/N*360-90)*Math.PI/180,b=((i+1)/N*360-90)*Math.PI/180,mid=(a+b)/2;return '<path d="M110 110 L'+(center+r*Math.cos(a))+' '+(center+r*Math.sin(a))+' A100 100 0 0 1 '+(center+r*Math.cos(b))+' '+(center+r*Math.sin(b))+'Z" fill="'+(x.color||['#fae2ba','#dcf3db','#d7eaff','#f8d9e8'][i%4])+'" stroke="white" stroke-width="2"/>'+(!x.color?'<text x="'+(center+69*Math.cos(mid))+'" y="'+(center+69*Math.sin(mid)+6)+'" text-anchor="middle" font-size="25">'+esc(x.icon)+'</text>':'');}).join('')+'</svg></div><button type="button" class="kg-primary" data-spin>Çarkı çevir</button>';}
function kova(q){return '<p>Bu kelimeyi kovada bul</p><h2 class="kg-question-card" lang="en">'+esc(q.en)+'</h2>';}
function cark(q){return '<h2 data-wheel-question hidden>Bu hangisi?</h2>'+wheel(q);}
// Meaning-dependent questions retain an English/visual cue without revealing a Turkish translation.
function clue(q){
 const n=topic.sortNo,a=q.answer;let hint='';
 if(n===13)hint='Ability: '+(a==='can'?'✓ Yes':'✕ No');
 if(n===19)hint='Frequency: '+({always:'100% · ●●●●●●●',usually:'80% · ●●●●●●○',sometimes:'30% · ●●○○○○○',never:'0% · ○○○○○○○'}[a]||'');
 if(n===14)hint='Action: '+({open:'📖 Open',close:'📕 Close','sit down':'🪑 ↓ Sit','stand up':'🧍 ↑ Stand'}[a]||'');
 if(n===20)hint={and:'Together: A + B',but:'Contrast: A ↔ B',or:'Choose: A / B'}[a];
 if(n===10){const xy={in:[80,65],on:[80,25],under:[80,115],behind:[110,43]}[a];return '<svg class="kg-position-hint" viewBox="0 0 160 140" role="img" aria-label="Position clue"><circle cx="'+xy[0]+'" cy="'+xy[1]+'" r="12" fill="#ea9149"/><rect x="45" y="40" width="70" height="50" rx="5" fill="'+(a==='behind'?'#80bfcf':'#80bfcf55')+'" stroke="#2b728b" stroke-width="3"/></svg>';}
 return hint?'<p class="kg-english-clue" lang="en">'+esc(hint)+'</p>':'';
}
function balon(q){return '<p>Cümleyi tamamla</p>'+clue(q)+'<h2 class="kg-sentence kg-question-card" lang="en">'+esc(q.before)+(q.joinBefore?'':' ')+'<span class="kg-blank">___</span> '+esc(q.after)+'</h2>';}
function dy(q){return '<p>İpucuna göre cümle doğru mu, yanlış mı?</p>'+clue(q)+'<article class="kg-card kg-question-card"><h2 lang="en">'+esc(q.sentence)+'</h2></article><div class="kg-streak" aria-live="polite">'+(streak>=2?'🔥 '+streak+' seri':'')+'</div>';}
function sohbet(q){return '<div class="kg-chat-head"><span>'+esc(topic.chat.name[0])+'</span><b>'+esc(topic.chat.name)+'<small>çevrimiçi</small></b></div><div class="kg-chat"><div class="kg-message kg-typing" role="status">… yazıyor</div></div>';}
function durum(q){const icons={sabah:'☀️',ogle:'🌤️',aksam:'🌆',gece:'☾',insan:'👋'};return '<article class="kg-card kg-scene-'+esc(q.scene)+'"><span class="kg-scene-icon" aria-hidden="true">'+(icons[q.scene]||'💬')+'</span>'+(q.time?'<small>'+esc(q.time)+'</small>':'')+'<h2>'+esc(q.sceneTr)+'</h2><p>Ne dersin?</p><div class="kg-time"><i></i></div></article>';}
function choice(o){if(game==='kova')return '<span class="kg-bucket" '+(o.color?'style="--paint:'+esc(o.color)+'"':'')+'><span aria-hidden="true">'+esc(o.icon||'')+'</span><svg viewBox="0 0 100 90" aria-hidden="true"><path d="M22 24Q50 -8 78 24" fill="none" stroke="currentColor" stroke-width="5"/><path d="M14 24H86L77 82H23Z" fill="'+(o.color||'#b3dcf5')+'" stroke="currentColor" stroke-width="3"/><ellipse cx="50" cy="24" rx="36" ry="7" fill="'+(o.color||'#e9f6ff')+'" stroke="currentColor" stroke-width="3"/></svg></span>';
 if(game==='balon')return '<svg class="kg-balloon" viewBox="0 0 140 150" aria-hidden="true"><ellipse cx="70" cy="58" rx="62" ry="51" fill="'+['#b4deff','#ffc3d6','#c7eeb5','#ffe5a0'][o.palette%4]+'" stroke="currentColor" stroke-width="2"/><path d="M64 109L76 109L70 116Z M70 116Q58 132 70 145" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>'+esc(o.label)+'</span>';
 return '<span lang="en">'+esc(o.label)+'</span>';}
function play(){clearTimeout(timer);if(index>=questions.length){finish();return;}const q=questions[index],token=epoch;const box=root.querySelector('.kg-content');box.innerHTML='<div class="kg-hud"><b>Soru '+(index+1)+' / '+questions.length+'</b><span>✓ '+correct+' doğru</span></div><progress aria-label="Oyun ilerlemesi" value="'+index+'" max="'+questions.length+'"></progress><main class="kg-stage kg-'+game+'">'+({kova,cark,balon,dy,sohbet,durum}[game])(q)+'</main><div class="kg-options kg-options-'+game+'" '+(['cark','sohbet'].includes(game)?'hidden':'')+'>'+q.options.map((o,i)=>'<button type="button" data-pick="'+i+'" aria-label="'+esc(o.label)+'">'+choice(o)+'</button>').join('')+'</div><div class="kg-feedback" aria-live="polite"></div><p class="kg-run-quota">'+(practice()?(guest()?'XP kazanmak için giriş yap':'Öğretmen için alıştırma · XP yok'):'Bugün '+quota.get(quotaKey(topic,game))+' XP hakkın kaldı')+'</p>';
 const showOptions=()=>{if(token!==epoch||!root)return;box.querySelector('.kg-options').hidden=false;box.querySelector('[data-pick]')?.focus({preventScroll:true});};
 box.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>answer(q.options[Number(b.dataset.pick)].id));
 if(game==='cark')box.querySelector('[data-spin]').onclick=e=>{e.currentTarget.disabled=true;const duration=reduced()?80:3000;box.querySelector('.kg-wheel').style.transition='transform '+duration+'ms cubic-bezier(.15,.7,.2,1)';box.querySelector('.kg-wheel').style.transform='rotate('+(1440-(q.slice+.5)*360/q.slices.length)+'deg)';timer=setTimeout(()=>{if(token!==epoch||!root)return;box.querySelector('[data-wheel-question]').hidden=false;box.querySelector('[data-spin]').hidden=true;showOptions();},duration);};
 if(game==='sohbet')timer=setTimeout(()=>{if(token!==epoch||!root)return;box.querySelector('.kg-chat').innerHTML='<div class="kg-message"><b lang="en">'+esc(q.say)+'</b><small>'+esc(q.tr)+'</small></div>';speak(q.say);showOptions();},reduced()?80:800);
 if(!['cark','sohbet'].includes(game))showOptions();
 box.dataset.questionAt=String(performance.now());
}
function answer(id){if(!root||picks.length!==index)return;const q=questions[index],good=id===q.correct,token=epoch,box=root.querySelector('.kg-content');picks.push(id);if(good){correct++;streak++;}else streak=0;
 box.querySelectorAll('[data-pick]').forEach(b=>{b.disabled=true;const option=q.options[+b.dataset.pick];b.classList.toggle('kg-right',option.id===q.correct);b.classList.toggle('kg-wrong',option.id===id&&!good);});
 if(game==='balon')box.querySelector('.kg-blank').textContent=q.answer;
 if(game==='dy'&&q.shown!==q.answer){box.querySelector('.kg-card h2').innerHTML=esc(q.before)+(q.joinBefore?'':' ')+'<del>'+esc(q.shown)+'</del> '+esc(q.after);}
 if(game==='dy'&&streak>=2)box.querySelector('.kg-streak').textContent='🔥 '+streak+' seri';
 if(game==='sohbet'){const msg=document.createElement('div');msg.className='kg-message kg-mine';msg.innerHTML='<b lang="en">'+esc(q.correct)+'</b><small>'+esc(q.rightTr)+(good?'':' · Doğru cevap buydu')+'</small>';box.querySelector('.kg-chat').append(msg);}
 const late=game==='durum'&&performance.now()-Number(box.dataset.questionAt)>8000;
 box.querySelector('.kg-feedback').innerHTML='<b>'+(good?(late?'Doğru, biraz yavaştın':'Harika!'):'Birlikte öğrenelim!')+'</b><span lang="en">'+(game==='dy'?'Doğrusu: ':'')+esc(q.en)+'</span><span>'+esc(game==='sohbet'?q.rightTr:q.tr)+'</span>'+(q.rule?'<small>'+esc(q.rule)+'</small>':'');
 speak(q.en);const delay=good?(q.rule?1500:1100):q.rule?2600:2200;
 timer=setTimeout(()=>{if(token!==epoch||!root)return;index++;play();},reduced()?Math.max(700,delay):delay);
}
async function finish(){clearTimeout(timer);const token=epoch,box=root.querySelector('.kg-content');box.innerHTML='<p role="status">Sonucun hesaplanıyor…</p>';
 try{let d;if(run){d=await api('konuOyunBitir',{runId:run,picks});}else{d={dogru:correct,toplam:questions.length,yuzde:Math.round(correct/questions.length*100),xp:0,sebep:guest()?'guest':'practice'};}
 if(token!==epoch||owner!==who()||!root)return;if(d.yo)window.dmApplyRewardState?.(d.yo,owner);
 if(d.xpHakkiKaldi!==undefined)quota.set(quotaKey(topic,game),d.xpHakkiKaldi);
 const labels={guest:'XP kazanmak için giriş yap',practice:'Öğretmen için alıştırma · XP yok',accuracy:'70 XP için en az %80 gerekli',daily_limit:'Bu oyundan bugünkü XP hakkın doldu, yarın yine kazanabilirsin',too_fast:'Oyun çok hızlı tamamlandı. Öğrenmek için biraz zaman ayır; bu tur XP yok.'};
 box.innerHTML='<section class="kg-result"><div class="kg-trophy" aria-hidden="true">'+(d.yuzde>=80?'🏆':'😊')+'</div><h2>%'+d.yuzde+'</h2><p>'+d.dogru+' / '+d.toplam+' doğru</p><b class="kg-prize">'+(d.xp>0?'+'+d.xp+' XP kazandın':esc(labels[d.sebep]||'Bu tur XP yok.'))+'</b><button type="button" class="kg-primary" data-again>Tekrar oyna</button><button type="button" data-other>Diğer oyun</button><button type="button" data-topics>Konulara dön</button></section>';
 box.querySelector('[data-again]').onclick=()=>start(game);box.querySelector('[data-other]').onclick=()=>start(topic.games.find(g=>g!==game));box.querySelector('[data-topics]').onclick=()=>close();box.querySelector('[data-again]').focus();
 }catch(e){if(token!==epoch||!root)return;box.innerHTML='<p role="alert">'+esc(e.message)+'</p><p>XP doğrulanamadı. Konulara dönüp yeniden oynayabilirsin.</p><button type="button">Konulara dön</button>';box.querySelector('button').onclick=()=>close();}
}
window.addEventListener('popstate',()=>{if(root)close(true);});document.addEventListener('dm:login',()=>{if(root)close();quota.clear();});
window.dmTopicGames={mount,close};
})();
