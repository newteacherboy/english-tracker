/* Independent server-validated Premium routes for Tower and solo Word Goal. */
(() => {
 'use strict';
 const games={'word-goal':{title:'Kelime Golü',image:'games-assets/kelime-golu-stadium-v1.webp',hint:'Doğru anlamın olduğu köşeye dokun!'}};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
 const token=()=>window.dmTeacherPortalMode?sessionStorage.getItem('ing_ogr_token')||'':localStorage.getItem('ing_token')||'';
 let root=null,state=null,epoch=0,ticker=null,transition=null,origin=null;
 let goal3d=null;
 function closeGoal3d(){
  if(!goal3d)return;const g=goal3d;goal3d=null;window.removeEventListener('message',g.listener);clearInterval(g.guard);g.root.remove();document.body.style.overflow=g.overflow;window.dmViewHistory?.leave?.(g.root);g.origin?.focus?.({preventScroll:true});
 }
 function openGoal3d(){
  if(!who()||!token()||window.dmGuestMode){window.yoToast?.('Önce hesabına giriş yap.');return}
  close();const owner=token(),account=who(),origin=document.activeElement,root=document.createElement('section'),frame=document.createElement('iframe');
  root.id='dmWordGoal3D';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Kelime Golü 3D');
  root.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#102b36;display:flex;flex-direction:column;overflow:hidden';
  frame.title='Kelime Golü 3D';frame.allow='autoplay';frame.style.cssText='width:100%;height:100%;border:0;flex:1;min-height:0';frame.src='word-goal-3d/index.html?v=20261127-2';root.append(frame);document.body.append(root);
  const g=goal3d={root,frame,owner,account,origin,overflow:document.body.style.overflow,busy:false};document.body.style.overflow='hidden';
  const same=()=>goal3d===g&&token()===owner&&who()===account&&!window.dmTeacherPortalMode;
  const send=(type,extra={})=>{if(same())frame.contentWindow?.postMessage({channel:'dm-word-goal-3d',type,...extra},location.origin)};
  const native=()=>typeof window.dmAndroidAds?.show==='function'&&window.dmAndroidPlacements?.rewardEnabled?.()!==false&&window.dmAndroidPlacements?.rewardAllowed?.('energy')!==false;
  const legacy=()=>typeof window.DijiReklam?.oyunReklamiIzle==='function'&&window.DijiReklam?.reklamGosterilsinMi?.()===true;
  const eligible=()=>same()&&!window.dmAdsDisabled&&!window.dmGuestMode&&!window.dmAndroidIsTeacher?.()&&account.toLowerCase()!=='dijimedu_demo'&&(native()||legacy());
  const key='dm-goal3d-ad:'+account;
  function pending(){try{const p=JSON.parse(localStorage.getItem(key)||'null');return p?.id&&p.expiresAt>Date.now()?p:null}catch{return null}}
  function persist(p){try{if(p)localStorage.setItem(key,JSON.stringify(p));else localStorage.removeItem(key)}catch{}}
  async function ad(){
   if(g.busy||!same())return;let offer=pending();if(!offer&&!eligible()){send('ad-state',{busy:false,message:'Ödüllü reklam şu anda kullanılamıyor.'});return;}
   g.busy=true;send('ad-state',{busy:true,message:'Reklam hakkı kontrol ediliyor…'});
   try{
    if(!offer){
     const prepared=await window.dmPremiumPlayOffer.request('ad-prepare','word-goal',{},owner);if(!same())return;
     offer={id:prepared.offerId,expiresAt:Date.now()+15*60000};if(!offer.id)throw Error('Reklam hazırlanamadı.');
     const result=legacy()?await window.DijiReklam.oyunReklamiIzle(offer.id):await window.dmAndroidAds.show('energy');
     if(!same())return;if(result?.test||!result?.completed)throw Error('Reklam tamamlanmadı. Oyun hakkı değişmedi.');persist(offer);
    }
    const d=await window.dmPremiumPlayOffer.request('ad-redeem','word-goal',{offerId:offer.id},owner);if(!same())return;
    if(!d.claimed){send('ad-state',{busy:false,message:'Ödül doğrulanıyor. Birazdan tekrar kontrol edebilirsin.'});return;}
    persist(null);send('ad-state',{busy:false,ready:true,message:'Bir oyun hakkı eklendi.'});
   }catch(e){send('ad-state',{busy:false,message:e?.message||'Reklam şu anda kullanılamıyor.'})}finally{g.busy=false;send('capabilities',{ads:eligible()||!!pending()})}
  }
  g.listener=e=>{if(e.origin!==location.origin||e.source!==frame.contentWindow||!same()||e.data?.channel!=='dm-word-goal-3d')return;
   if(e.data.type==='ready')send('capabilities',{ads:eligible()||!!pending()});
   else if(e.data.type==='close'&&!g.busy)closeGoal3d();
   else if(e.data.type==='ad')ad();
   else if(e.data.type==='plans'&&!g.busy){closeGoal3d();if(window.DMSatis?.planlar)window.DMSatis.planlar('premium-oyunlar','premium_pro');else window.yoToast?.('Üyelik bilgilerini Mağaza bölümünden inceleyebilirsin.');}
  };
  window.addEventListener('message',g.listener);g.guard=setInterval(()=>{if(!same())closeGoal3d()},1000);window.dmViewHistory?.track?.(root,{close:()=>{if(!g.busy)closeGoal3d()}});
 }

 (window.dmNativeAnswerScopes||=[]).push(()=>!!root?.isConnected||!!goal3d?.root?.isConnected);
 function alive(s){return s===state&&s.owner===who()&&s.token===token()&&!!root?.isConnected;}
 const savedKey=s=>'dm-premium-skill:'+s.key+':'+s.owner;
 function save(){try{localStorage.setItem(savedKey(state),JSON.stringify({runId:state.runId,picks:state.picks}));}catch{}}
 function saved(s){try{return JSON.parse(localStorage.getItem(savedKey(s))||'null');}catch{return null;}}
 function close(){closeGoal3d();epoch++;clearInterval(ticker);clearTimeout(transition);const old=root;root=null;state=null;old?.remove();window.speechSynthesis?.cancel();window.dmViewHistory?.leave?.(old);window.dmGameViewport?.sync?.();origin?.focus?.();}
 function plans(){window.dmPremiumIntro?.plans('premium-oyunlar')?.();}
 async function api(op,data={}){
  const s=state,controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const url=(typeof apiURL==='string'?apiURL:'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api').replace(/diji-api.*$/,'premium-games');
   if(op==='start'&&s.team)data={...data,teamTicket:await window.dmTeam.premiumTicket(data.runId)};
   const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:s.key,op,t:s.token,...data}),signal:controller.signal});
   const result=await response.json();if(!response.ok||result.ok===false){const e=Error(result.mesaj||'Oyun yüklenemedi. Tekrar dene.');e.code=result.hata;throw e;}
   if(result.teamPoints)window.dmTeam?.credited(result.teamPoints);
   return result;
  }catch(e){if(e.name==='AbortError')throw Error('Bağlantı gecikti. Aynı oyunu tekrar deneyebilirsin.');throw e;}finally{clearTimeout(timeout);}
 }
 function status(text){const n=root?.querySelector('[data-status]');if(n)n.textContent=text;}
 function panel(title,copy,actions){
  root.dataset.gamePhase='setup';root.dataset.musicPaused='true';root.querySelector('[data-pause]').hidden=true;
  const body=root.querySelector('.psg-body');body.innerHTML='<div class="psg-panel"><h2>'+esc(title)+'</h2><p>'+esc(copy)+'</p><p data-status role="status"></p><div class="psg-actions"></div></div>';
  actions.forEach(([label,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;body.querySelector('.psg-actions').append(b);});
 }
 async function open(key,options){
  if(key==='word-goal'&&!options?.team&&!window.dmTeacherPortalMode&&!(typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci)&&who().toLowerCase()!=='teacher')return openGoal3d();
  if(key==='tower'){window.yoToast?.('Bu oyun yayından kaldırıldı.');return;}
  if(!games[key])return;close();origin=document.activeElement;
  if(!who()||!token()){window.yoToast?.('Önce hesabına giriş yap.');return;}
  const s=state={key,owner:who(),token:token(),picks:[],phase:'loading',busy:false,sound:true,team:options?.team===true};
  root=document.createElement('section');root.id='premiumSkillGame';root.className='psg-overlay game-modal-overlay psg-'+key;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','psgTitle');
  root.innerHTML='<div class="psg-shell"><header class="psg-header"><button type="button" data-back aria-label="Geri dön">‹</button><h2 id="psgTitle">'+games[key].title+'</h2><button type="button" data-sound aria-label="Sesi kapat" aria-pressed="true">♫</button><button type="button" data-pause aria-label="Duraklat" hidden>Ⅱ</button><button type="button" data-close aria-label="Kapat">×</button></header><main class="psg-body"></main></div>';
  root.querySelector('[data-back]').onclick=()=>s.phase==='setup'||s.phase==='loading'?close():open(s.key);root.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);root.querySelector('[data-pause]').onclick=togglePause;
  root.querySelector('[data-sound]').onclick=e=>{s.sound=!s.sound;e.currentTarget.textContent=s.sound?'♫':'♪';e.currentTarget.setAttribute('aria-pressed',String(s.sound));e.currentTarget.setAttribute('aria-label',s.sound?'Sesi kapat':'Sesi aç');root.dataset.musicPaused=String(!s.sound||s.phase!=='play'||s.paused);const music=root.querySelector('.dm-game-music');if(s.sound&&music?.getAttribute('aria-pressed')==='false')music.click();};
  root.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const buttons=[...root.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length);const i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}};
  document.body.append(root);window.dmViewHistory?.track?.(root,{close});window.dmGameViewport?.sync?.();root.querySelector('[data-close]').focus();
  await loadStatus(s);
 }
 async function loadStatus(s){
  panel('Oyun hazırlanıyor…','',[]);
  try{const d=await api('status');if(!alive(s))return;s.info=d;if(d.activeRunId){const pending=saved(s);if(pending?.runId!==d.activeRunId){s.runId=d.activeRunId;s.picks=[];save();}}intro();}
  catch(e){if(alive(s))panel('Oyun yüklenemedi',e.message,[['Tekrar dene',()=>loadStatus(s)]]);}
 }
 function intro(){
  const s=state,d=s.info,g=games[s.key];s.phase='setup';
  const pending=saved(s),canResume=!!pending?.runId;
  const actions=d.completed?[['Oyunlara dön',close]]:d.remaining>0||canResume?[[canResume?'Kaldığın oyuna devam et':`Seviye ${d.level} · Başla · ⚡ 5`,start]]:[['Başla',()=>window.dmPremiumPlayOffer?.open({game:s.key,onReady:async()=>{if(!alive(s))return;await loadStatus(s);if(alive(s))start();},onPlans:close})],['Oyunlara dön',close]];
  panel(g.title,`Seviye ${d.level} / 160 · Kolaydan zora ilerle. ${g.hint} ${d.premium?'Sınırsız oyun hakkı.':d.remaining+' günlük oyun hakkın kaldı.'}`,actions);
  root.dataset.gamePhase='intro';
  const level=Math.max(1,Math.min(160,Number(d.level)||1)),done=d.completed?160:level-1;
  const card=root.querySelector('.psg-panel');card.classList.add('psg-intro');
  card.querySelector('h2').textContent=g.title;
  card.querySelector('p').textContent=s.key==='tower'?'Kelimeleri bil, renkli blokları üst üste diz. Papi ile kuleni yükselt!':'Topun üzerindeki kelimeyi oku. Doğru anlamın olduğu köşeye şut çek!';
  const scene=document.createElement('div');scene.className='psg-intro-stage psg-intro-'+s.key;scene.setAttribute('aria-hidden','true');
  scene.innerHTML=s.key==='tower'?'<div class="psg-intro-stack">'+[0,1,2,3].map(i=>block(i)).join('')+'</div><span class="psg-intro-word">apple = elma</span>':'<div class="psg-intro-goal"></div><span class="psg-intro-target">elma ✓</span><div class="psg-intro-ball"><b>apple</b></div>';
  scene.insertAdjacentHTML('beforeend','<img class="psg-intro-papi" src="profile-assets/papi-selam.png" alt="">');
  card.prepend(scene);
  const course=level<=80?Math.floor((level-1)/10)+1+'. sınıf kelimeleri':['A1','A2','B1','B2'][Math.floor((level-81)/20)]+' kelimeleri';
  const from=Math.max(1,Math.min(156,level-2));
  const progress=document.createElement('section');progress.className='psg-course';progress.setAttribute('aria-label','Seviye ilerlemen');
  progress.innerHTML='<div class="psg-course-heading"><strong>Seviye '+level+' <small>/ 160</small></strong><span>'+esc(course)+'</span></div><progress value="'+done+'" max="160" aria-label="Tamamlanan seviyeler"></progress><small>'+done+' seviye tamamlandı'+(d.completed?' · Tüm yolculuk bitti!':' · 12 soruda en az 9 doğru')+'</small><ol class="psg-course-route">'+Array.from({length:5},(_,i)=>{const n=from+i;return '<li class="'+(d.completed||n<level?'is-done':n===level?'is-current':'is-locked')+'"'+(n===level?' aria-current="step"':'')+'><b>'+n+'</b><span>'+(d.completed||n<level?'✓':n===level?'Şimdi':'Sonraki')+'</span></li>';}).join('')+'</ol>';
  card.querySelector('.psg-actions').before(progress);
  const rights=document.createElement('p');rights.className='psg-rights';rights.textContent=canResume?'Yarım kalan seviyen hazır · Yeniden enerji harcanmaz':d.completed?'160 seviyenin tamamını bitirdin!':d.premium?'Sınırsız oyun hakkın var · Giriş 5 enerji':d.remaining>0?'Bugün '+d.remaining+' oyun hakkın var · Giriş 5 enerji':'Bugünkü oyun hakkın bitti';
  card.querySelector('.psg-actions').before(rights);
 }
 async function start(){
  const s=state;if(s.busy)return;s.busy=true;root.querySelectorAll('.psg-actions button').forEach(b=>b.disabled=true);status('Bölüm hazırlanıyor…');
  const pending=saved(s);s.runId=s.runId||pending?.runId||crypto.randomUUID();s.picks=pending?.runId===s.runId&&Array.isArray(pending.picks)?pending.picks:[];save();
  try{
   const d=await api('start',{runId:s.runId});if(!alive(s))return;
   if(d.runId!==s.runId)s.picks=[];s.runId=d.runId;s.rounds=d.rounds;s.info=d;s.phase='play';s.paused=false;s.started=Date.now();
   if(d.result){showResult({...d,...d.result});return;}
   s.picks=s.picks.filter(n=>Number.isInteger(n)&&n>=-1&&n<=3).slice(0,s.rounds.length);save();
   if(typeof d.energy==='number'){window.genelEnerjiKalan=d.energy;window.headerEnerjiGoster?.(d.energy,d.energyMax);}
   root.dataset.gamePhase='play';root.dataset.musicPaused=String(!s.sound);root.querySelector('[data-pause]').hidden=false;
   renderQuestion();ticker=setInterval(tick,100);
  }catch(e){if(alive(s)){if(e.code==='hak'){s.runId=null;localStorage.removeItem(savedKey(s));s.info.remaining=0;intro();root.querySelector('.psg-actions button')?.click();}else{status(e.message);window.DijiMeduPapiFeedback?.energyDenied(e);root.querySelectorAll('.psg-actions button').forEach(b=>b.disabled=false);}}}
  finally{if(alive(s))s.busy=false;}
 }
 const block=(i,falling=false)=>'<i class="psg-block'+(falling?' psg-falling':'')+'" style="--i:'+i+';--hue:'+(i*57%360)+'deg"></i>';
 function renderQuestion(){
  const s=state;if(s.picks.length===s.rounds.length){finish();return;}
  const index=s.picks.length,q=s.rounds[index],tower=s.key==='tower';s.locked=false;s.remaining=Math.max(10000,20000-Math.floor((s.info.playedLevel-1)/20)*1000);s.duration=s.remaining;s.last=Date.now();
  const correct=s.picks.filter((n,i)=>n===s.rounds[i].answer).length;
  root.querySelector('.psg-body').innerHTML='<div class="psg-hud"><span>Seviye <b>'+s.info.playedLevel+'</b></span><span>'+(tower?'Kat':'Gol')+' <b>'+correct+'</b></span><span>Soru <b>'+(index+1)+'/'+s.rounds.length+'</b></span><span data-time></span></div><div class="psg-time"><i></i></div>'+
  (tower?'<div class="psg-tower-scene"><img class="psg-papi" src="papi-welcome-v2.png" alt="Papi"><div class="psg-platform"></div><div class="psg-stack">'+Array.from({length:Math.min(correct,6)},(_,i)=>block(i)).join('')+block(Math.min(correct,6),true)+'</div></div><div class="psg-question"><button type="button" data-speak aria-label="Kelimeyi dinle">♫</button><h3>“'+esc(q.en)+'” ne demek?</h3></div><div class="psg-answers">'+q.options.map((v,n)=>'<button type="button" data-answer="'+n+'">'+esc(v)+'</button>').join('')+'</div>':
  '<div class="psg-pitch"><div class="psg-stands"></div><div class="psg-net"></div><div class="psg-keeper">'+''+'</div>'+q.options.map((v,n)=>'<button type="button" class="psg-target psg-target-'+n+'" data-answer="'+n+'">'+esc(v)+'</button>').join('')+'<div class="psg-ball">'+''+'<b lang="en">'+esc(q.en)+'</b></div></div>')+
  '<div class="psg-feedback" role="status">'+games[s.key].hint+'</div><div class="psg-pause" hidden><h3>Oyun duraklatıldı</h3><button type="button" data-resume>Devam et</button></div>';
  root.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>answer(Number(b.dataset.answer)));
  root.querySelector('[data-resume]').onclick=togglePause;
  const speak=root.querySelector('[data-speak]');if(speak)speak.onclick=()=>{if(!s.sound)return;const u=new SpeechSynthesisUtterance(q.en);u.lang='en-US';u.rate=.85;window.speechSynthesis?.cancel();window.speechSynthesis?.speak(u);};
  tick();
 }
 function tick(){
  const s=state;if(!s)return;if(!alive(s))return close();const now=Date.now(),delta=now-s.last;s.last=now;
  if(s.phase!=='play'||s.paused||s.locked)return;s.remaining=Math.max(0,s.remaining-delta);
  root.querySelector('[data-time]').textContent=Math.ceil(s.remaining/1000)+' sn';root.querySelector('.psg-time i').style.width=(s.remaining/s.duration*100)+'%';if(!s.remaining)answer(-1);
 }
 function togglePause(){const s=state;if(s?.phase!=='play'||s.locked)return;s.paused=!s.paused;s.last=Date.now();root.querySelector('.psg-pause').hidden=!s.paused;root.dataset.musicPaused=String(s.paused||!s.sound);root.querySelector('[data-pause]').setAttribute('aria-label',s.paused?'Devam et':'Duraklat');}
 function answer(n){
  const s=state;if(s?.phase!=='play'||s.locked||s.paused)return;s.locked=true;
  const q=s.rounds[s.picks.length],good=n===q.answer;s.picks.push(n);save();
  root.querySelectorAll('[data-answer]').forEach(b=>{b.disabled=true;b.classList.toggle('psg-correct',Number(b.dataset.answer)===q.answer);b.classList.toggle('psg-wrong',Number(b.dataset.answer)===n&&!good);});
  if(s.sound)window.genelSesEfektiCal?.(good?'dogru':'yanlis');
  const feedback=root.querySelector('.psg-feedback');feedback.textContent=good?(s.key==='tower'?'Harika! Blok yerleşti.':'GOOOL!'):(n<0?'Süre doldu. ':s.key==='tower'?'Tekrar deneyebilirsin. ':'Kurtarış! ')+q.en+' = '+q.options[q.answer];
  if(s.key==='tower')root.querySelector('.psg-tower-scene').classList.add(good?'psg-drop':'psg-wobble');
  else if(n>=0){
   const ball=root.querySelector('.psg-ball'),target=root.querySelector('[data-answer="'+n+'"]'),keeper=root.querySelector('.psg-keeper');
   const a=ball.getBoundingClientRect(),b=target.getBoundingClientRect(),k=keeper.getBoundingClientRect();
   ball.style.setProperty('--dx',(b.left+b.width/2-a.left-a.width/2)+'px');ball.style.setProperty('--dy',(b.top+b.height/2-a.top-a.height/2)+'px');ball.classList.add('psg-shot');
   if(!good){const facing=n%2===0?-1:1,diveWidth=root.querySelector('.psg-pitch').clientWidth*.46;keeper.style.setProperty('--dx',(b.left+b.width/2-k.left-k.width/2-facing*diveWidth*.35)+'px');keeper.style.setProperty('--dy',(b.top+b.height/2-k.top-k.height/2+diveWidth*.25)+'px');keeper.style.setProperty('--facing',String(facing));keeper.classList.add('psg-save');}
  }
  transition=setTimeout(()=>{if(alive(s))renderQuestion();},good?1000:1700);
 }
 async function finish(){
  const s=state;if(s.phase==='saving')return;s.phase='saving';clearInterval(ticker);panel('Sonuç kaydediliyor…','',[]);
  try{const d=await api('finish',{runId:s.runId,selections:s.picks});if(!alive(s))return;showResult(d);}
  catch(e){if(alive(s)){s.phase='save-error';panel('Sonuç kaydedilemedi',e.message,[['Kaydı tekrar dene',finish]]);}}
 }
 function showResult(d){
  const s=state,key=s.key,runId=s.runId,played=Number(d.playedLevel)||Number(s.info.playedLevel)||1,next=Math.min(160,Number(d.level)||played);
  s.phase='result';s.info=d;clearInterval(ticker);clearTimeout(transition);try{localStorage.removeItem(savedKey(s));}catch{}s.runId=null;s.picks=[];
  if(d.yo)window.dmApplyRewardState?.(d.yo,s.owner);window.dmProgression?.refresh?.(true);
  const note=d.completed?'160 seviyenin tamamı bitti!':d.passed?'Seviye '+played+' tamamlandı · Seviye '+next+' açıldı!':'Seviye '+played+' · İlerlemek için en az 9 doğru yapmalısın.';
  const result={oyunAdi:games[key].title+' · Seviye '+played,oyunKey:'premium-'+key,runId,baslik:d.completed?'Muhteşem bir yolculuk!':d.passed?'Seviye tamamlandı!':'Birlikte tekrar deneyelim!',isim:s.owner,
   dogru:d.correct,yanlis:d.wrong,puan:d.score,sureSaniye:s.started?Math.max(1,Math.round((Date.now()-s.started)/1000)):undefined,
   siralamaYok:true,parkurGecti:!!d.passed,parkurYildiz:Number(d.stars)||0,savedReward:{xp:d.xp,gold:d.gold},resultNote:note,
   devamEtiketi:d.completed?'OYUNLARA DÖN':d.passed?'SONRAKİ SEVİYE':'TEKRAR DENE',tekrarEtiketi:'OYUNLARA DÖN',
   devamFn:d.completed?close:()=>open(key),tekrarFn:d.completed?null:close};
  const show=window.dmSonucA?.showSaved?o=>window.dmSonucA.showSaved(o):window.dmShowSavedResult;
  if(typeof show==='function'){
   close();show(result);
   const mascot=document.querySelector('#genelSonucOverlay .gso-maskot');
   if(mascot)mascot.innerHTML='<img class="dm-result-papi psg-result-3d" src="'+(d.passed?'papi-reward-v2.png':'papi-help-v2.png')+'" alt="'+(d.passed?'Kutlayan Papi':'Sana yardımcı olan Papi')+'">';
   const primary=document.getElementById('gsoDevamBtn'),secondary=document.getElementById('gsoTekrarBtn');
   if(primary)primary.textContent=d.completed?'OYUNLARA DÖN':d.passed?'SONRAKİ SEVİYE':'TEKRAR DENE';
   if(secondary)secondary.textContent='OYUNLARA DÖN';
   window.dmGameViewport?.sync?.();
  }else{
   panel(result.baslik,`${d.correct} / ${d.total} doğru · ${d.xp} XP · ${d.gold} altın`,[...(!d.completed?[[d.passed?'Sonraki seviye':'Tekrar dene',()=>loadStatus(s)]]:[]),['Oyunlara dön',close]]);
   root.querySelector('.psg-panel').insertAdjacentHTML('afterbegin','<img class="psg-result-papi" src="papi-reward-v2.png" alt="Papi">');
   const progress=document.createElement('p');progress.className='psg-result-note';progress.textContent=note;root.querySelector('.psg-actions').before(progress);
  }
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&state?.phase==='play'&&!state.paused&&!state.locked)togglePause();});
 document.addEventListener('dm:login',close);
 window.dmPremiumSkillGames={open,close};
})();

