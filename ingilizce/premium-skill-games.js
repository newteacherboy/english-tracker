/* Independent server-validated Premium routes for Tower and solo Word Goal. */
(() => {
 'use strict';
 const games={tower:{title:'Dengesiz Kule',image:'arcade-assets/city.webp',hint:'Doğru cevabı seç, bloğu yerleştir!'},'word-goal':{title:'Kelime Golü',image:'games-assets/kelime-golu-stadium-v1.webp',hint:'Doğru anlamın olduğu köşeye dokun!'}};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
 const token=()=>window.dmTeacherPortalMode?sessionStorage.getItem('ing_ogr_token')||'':localStorage.getItem('ing_token')||'';
 let root=null,state=null,epoch=0,ticker=null,transition=null,origin=null;
 (window.dmNativeAnswerScopes||=[]).push(()=>!!root?.isConnected);
 function alive(s){return s===state&&s.owner===who()&&s.token===token()&&!!root?.isConnected;}
 const savedKey=s=>'dm-premium-skill:'+s.key+':'+s.owner;
 function save(){try{localStorage.setItem(savedKey(state),JSON.stringify({runId:state.runId,picks:state.picks}));}catch{}}
 function saved(s){try{return JSON.parse(localStorage.getItem(savedKey(s))||'null');}catch{return null;}}
 function close(){epoch++;clearInterval(ticker);clearTimeout(transition);const old=root;root=null;state=null;old?.remove();window.speechSynthesis?.cancel();window.dmViewHistory?.leave?.(old);window.dmGameViewport?.sync?.();origin?.focus?.();}
 function plans(){window.dmPremiumIntro?.plans('premium-oyunlar')?.();}
 async function api(op,data={}){
  const s=state,controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const url=(typeof apiURL==='string'?apiURL:'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api').replace(/diji-api.*$/,'premium-games');
   const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:s.key,op,t:s.token,...data}),signal:controller.signal});
   const result=await response.json();if(!response.ok||result.ok===false)throw Error(result.mesaj||'Oyun yüklenemedi. Tekrar dene.');
   return result;
  }catch(e){if(e.name==='AbortError')throw Error('Bağlantı gecikti. Aynı oyunu tekrar deneyebilirsin.');throw e;}finally{clearTimeout(timeout);}
 }
 function status(text){const n=root?.querySelector('[data-status]');if(n)n.textContent=text;}
 function panel(title,copy,actions){
  root.dataset.gamePhase='setup';root.dataset.musicPaused='true';root.querySelector('[data-pause]').hidden=true;
  const body=root.querySelector('.psg-body');body.innerHTML='<div class="psg-panel"><h2>'+esc(title)+'</h2><p>'+esc(copy)+'</p><p data-status role="status"></p><div class="psg-actions"></div></div>';
  actions.forEach(([label,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;body.querySelector('.psg-actions').append(b);});
 }
 async function open(key){
  if(!games[key])return;close();origin=document.activeElement;
  if(!who()||!token()){window.yoToast?.('Önce hesabına giriş yap.');return;}
  const s=state={key,owner:who(),token:token(),picks:[],phase:'loading',busy:false,sound:true};
  root=document.createElement('section');root.id='premiumSkillGame';root.className='psg-overlay game-modal-overlay psg-'+key;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','psgTitle');
  root.innerHTML='<div class="psg-shell"><header class="psg-header"><button type="button" data-close aria-label="Oyundan çık">‹</button><h2 id="psgTitle">'+games[key].title+'</h2><button type="button" data-sound aria-label="Sesi kapat" aria-pressed="true">♫</button><button type="button" data-pause aria-label="Duraklat" hidden>Ⅱ</button><button type="button" data-close aria-label="Kapat">×</button></header><main class="psg-body"></main></div>';
  root.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);root.querySelector('[data-pause]').onclick=togglePause;
  root.querySelector('[data-sound]').onclick=e=>{s.sound=!s.sound;e.currentTarget.textContent=s.sound?'♫':'♪';e.currentTarget.setAttribute('aria-pressed',String(s.sound));e.currentTarget.setAttribute('aria-label',s.sound?'Sesi kapat':'Sesi aç');root.dataset.musicPaused=String(!s.sound||s.phase!=='play'||s.paused);};
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
  const actions=d.completed?[['Oyunlara dön',close]]:d.remaining>0||canResume?[[canResume?'Kaldığın oyuna devam et':`Seviye ${d.level} · Başla · ⚡ 5`,start]]:[['Premium ile sınırsız oyna',plans],['Oyunlara dön',close]];
  panel(g.title,`Seviye ${d.level} / 160 · Kolaydan zora ilerle. ${g.hint} ${d.premium?'Sınırsız oyun hakkı.':d.remaining+' günlük oyun hakkın kaldı.'}`,actions);
  const image=document.createElement('img');image.src=g.image;image.alt='';image.className='psg-cover';root.querySelector('.psg-panel').prepend(image);
 }
 async function start(){
  const s=state;if(s.busy)return;s.busy=true;root.querySelectorAll('.psg-actions button').forEach(b=>b.disabled=true);status('Bölüm hazırlanıyor…');
  const pending=saved(s);s.runId=s.runId||pending?.runId||crypto.randomUUID();s.picks=pending?.runId===s.runId&&Array.isArray(pending.picks)?pending.picks:[];save();
  try{
   const d=await api('start',{runId:s.runId});if(!alive(s))return;
   if(d.runId!==s.runId)s.picks=[];s.runId=d.runId;s.rounds=d.rounds;s.info=d;s.phase='play';s.paused=false;
   if(d.result){showResult({...d,...d.result});return;}
   s.picks=s.picks.filter(n=>Number.isInteger(n)&&n>=-1&&n<=3).slice(0,s.rounds.length);save();
   if(typeof d.energy==='number'){window.genelEnerjiKalan=d.energy;window.headerEnerjiGoster?.(d.energy,d.energyMax);}
   root.dataset.gamePhase='play';root.dataset.musicPaused=String(!s.sound);root.querySelector('[data-pause]').hidden=false;
   renderQuestion();ticker=setInterval(tick,100);
  }catch(e){if(alive(s)){status(e.message);root.querySelectorAll('.psg-actions button').forEach(b=>b.disabled=false);}}
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
  const s=state;s.phase='result';s.info=d;try{localStorage.removeItem(savedKey(s));}catch{}s.runId=null;s.picks=[];
  if(d.yo)window.dmApplyRewardState?.(d.yo,s.owner);window.dmProgression?.refresh?.(true);
  panel(d.passed?'Bölüm tamamlandı!':'Bir kez daha dene',`${d.correct} / ${d.total} doğru · ${d.xp} XP · ${d.gold} altın`,[...(!d.completed?[[d.passed?'Sonraki bölüm':'Tekrar oyna',()=>loadStatus(s)]]:[]),['Oyunlara dön',close]]);
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&state?.phase==='play'&&!state.paused&&!state.locked)togglePause();});
 document.addEventListener('dm:login',close);
 window.dmPremiumSkillGames={open,close};
})();
