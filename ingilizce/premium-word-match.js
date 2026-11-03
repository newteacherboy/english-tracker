/* Diji-Medu Premium Oyunlar — Kelime Eşleştirme / match-3.
 * Word Bank remains client-side; only one server request is required per game start.
 * Account trial rights are decided by the premium-word-match edge function.
 */
(()=>{'use strict';
const API='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/premium-word-match';
const SIZE=6,MOVES=22,FREE=3;
const $=(sel,root=document)=>root.querySelector(sel);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v==null?'':v).normalize('NFKC').trim().toLocaleLowerCase('en');
const targetFor=level=>Math.min(3000,1200+Math.max(0,level-1)*150);
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const currentName=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const isTeacher=()=>window.dmTeacherPortalMode||currentName().toLowerCase()==='teacher';
const en=w=>String(w.ingilizce??w.english??w.en??'').trim();
const tr=w=>String(w.turkce??w.turkish??w.tr??'').trim();
let overlay=null,state=null,prior=null,eventsBound=false,pointerStart=null;
const still=s=>!!overlay&&state===s&&overlay.isConnected;
function loadStyle(){if(document.getElementById('pwmStyle'))return;const l=document.createElement('link');l.id='pwmStyle';l.rel='stylesheet';l.href='premium-word-match.css?v=20261103-2';document.head.append(l);}
function bank(){
 const list=Array.isArray(window.masterKelimeHavuzu)?window.masterKelimeHavuzu:[];
 const seen=new Set();
 return list.map(w=>({en:en(w),tr:tr(w),grade:Number(w.sinif??w.class_no),unit:Number(w.unite??w.unit_no)})).filter(w=>{
  const key=norm(w.en);
  if(!w.en||!w.tr||w.en.length>12||!Number.isInteger(w.grade)||w.grade<1||w.grade>8||!Number.isInteger(w.unit)||w.unit<1||seen.has(w.grade+':'+w.unit+':'+key))return false;
  seen.add(w.grade+':'+w.unit+':'+key);return true;
 });
}
function levelList(){
 const pairs=new Map();
 for(const word of bank()){const id=word.grade+':'+word.unit;if(!pairs.has(id))pairs.set(id,[]);
  pairs.get(id).push(word);
 }
 return [...pairs.entries()].filter(([,words])=>new Set(words.map(w=>norm(w.en))).size>=5)
   .map(([id])=>{const [grade,unit]=id.split(':').map(Number);return {grade,unit};})
   .sort((a,b)=>a.grade-b.grade||a.unit-b.unit);
}
function setLevel(level){
 const list=levelList();
 if(!list.length)throw Error('Word Bank kelimeleri henüz yüklenmedi. Sayfayı yenileyip tekrar dene.');
 state.level=Math.max(1,Math.min(list.length,Number(level)||1));
 const item=list[state.level-1];state.grade=item.grade;state.unit=item.unit;
}
function scope(){return bank().filter(w=>w.grade===state.grade&&w.unit===state.unit);}

function trialMsg(data){if(isTeacher())return 'Öğretmen ön izlemesi · ödülsüz';if(!data)return '3 seferlik ücretsiz oynama hakkı';return data.premium?'👑 Premium üye · sınırsız oynama':'🎁 Kalan ücretsiz oyun: '+data.remaining+' / '+FREE;}
async function access(action,runId,extras={}){
 if(isTeacher())return {ok:true,allowed:true,premium:true,remaining:3,level:Number(state?.level)||1};
 const token=localStorage.getItem('ing_token');
 if(!token)throw Error('Oyuna başlamak için hesabına giriş yapmalısın.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({t:token,action,runId,...extras}),signal:controller.signal,cache:'no-store'});
  const result=await r.json();
  if(!r.ok||!result.ok)throw Error(result.message||'Oyun hakkı doğrulanamadı.');
  return result;
 }finally{clearTimeout(timeout);}
}
function alertText(msg){const stage=state?.phase==='playing'?$('[data-wm-stage]',overlay):null;const node=(stage&&$('[data-wm-status]',stage))||$('[data-wm-status]',overlay);if(node)node.textContent=msg;}
function sound(type){
 if(window.dmSesAcik===false||window.dmSoundEnabled===false)return;
 try{window.genelSesEfektiCal?.(type==='good'?'dogru':'yanlis');}catch(_){}
}
function say(word){if(!word||window.dmSoundEnabled===false)return;try{const utter=new SpeechSynthesisUtterance(word);utter.lang='en-US';utter.rate=.83;window.speechSynthesis?.cancel();window.speechSynthesis?.speak(utter);}catch(_){}}
function pickWords(){
 const pool=scope();const seen=new Map(pool.map(w=>[norm(w.en),w]));
 const available=[...seen.values()];
 if(available.length<5)throw Error('Bu seviyenin kelime havuzu yeterli değil. Oyunu tekrar aç.');
 const memKey='dm_wm_recent:'+currentName()+':'+state.grade+':'+state.unit;
 let old=[];try{old=JSON.parse(sessionStorage.getItem(memKey)||'[]');}catch(_){}
 const fresh=shuffle(available.filter(w=>!old.includes(norm(w.en))));
 const items=[...fresh,...shuffle(available.filter(w=>old.includes(norm(w.en))))].slice(0,Math.min(8,available.length));
 // Do not reuse the same short deck when the scope contains enough vocabulary.
 try{sessionStorage.setItem(memKey,JSON.stringify(items.map(w=>norm(w.en)).slice(-8)));}catch(_){}
 return shuffle(items);
}
const randomWord=()=>state.words[Math.floor(Math.random()*state.words.length)].en;
function matches(board){
 const groups=[];
 for(let y=0;y<SIZE;y++){let x=0;while(x<SIZE){let end=x+1;while(end<SIZE&&board[y*SIZE+x]&&board[y*SIZE+x]===board[y*SIZE+end])end++;if(end-x>=3)groups.push({word:board[y*SIZE+x],indices:Array.from({length:end-x},(_,i)=>y*SIZE+x+i)});x=end;}}
 for(let x=0;x<SIZE;x++){let y=0;while(y<SIZE){let end=y+1;while(end<SIZE&&board[y*SIZE+x]&&board[y*SIZE+x]===board[end*SIZE+x])end++;if(end-y>=3)groups.push({word:board[y*SIZE+x],indices:Array.from({length:end-y},(_,i)=>(y+i)*SIZE+x)});y=end;}}
 return groups;
}
function potential(board){
 for(let p=0;p<board.length;p++)for(const q of [p+1,p+SIZE]){
  if(q>=board.length||(q===p+1&&p%SIZE===SIZE-1)||board[p]===board[q])continue;
  const a=board[p];board[p]=board[q];board[q]=a;const yes=matches(board).length>0;board[q]=board[p];board[p]=a;if(yes)return true;
 }return false;
}
function freshBoard(){
 for(let run=0;run<90;run++){
  const b=[];
  for(let i=0;i<SIZE*SIZE;i++){
   const used=new Set();
   if(i%SIZE>1&&b[i-1]===b[i-2])used.add(b[i-1]);
   if(i>=SIZE*2&&b[i-SIZE]===b[i-SIZE*2])used.add(b[i-SIZE]);
   const options=state.words.map(w=>w.en).filter(w=>!used.has(w));
   b.push(options[Math.floor(Math.random()*options.length)]||randomWord());
  }
  if(potential(b))return b;
 }
 return shuffle(Array.from({length:SIZE*SIZE},randomWord));
}
function cascadeFill(){
 for(let x=0;x<SIZE;x++){
  const keep=[];for(let y=SIZE-1;y>=0;y--)if(state.board[y*SIZE+x])keep.push(state.board[y*SIZE+x]);
  for(let y=SIZE-1;y>=0;y--)state.board[y*SIZE+x]=keep[SIZE-1-y]||randomWord();
 }
}
function pointFor(n){return n>=5?500+100*(n-5):n===4?250:100;}
function tileHtml(word,i){
 const idx=state.words.findIndex(w=>w.en===word);
 const shape=['♥','★','✿','◆','✦','●','✧','✺'][Math.max(0,idx)%8];
 const label=esc(word).replace(/\s+/g,'<wbr> ');
 const two=word.length>8?' pwm-long':'';
 return '<button type="button" class="pwm-tile pwm-c'+(Math.max(0,idx)%8)+two+'" data-idx="'+i+'" aria-label="'+esc(word)+'" title="'+esc(word)+'"><i aria-hidden="true">'+shape+'</i><b>'+label+'</b></button>';
}
function boardDraw(){
 const board=$('[data-wm-board]',overlay);if(!board||!state)return;
 board.innerHTML=state.board.map(tileHtml).join('');
}
function swipeStart(e){
 const tile=e.target.closest?.('[data-idx]');
 if(!tile||!state||state.phase!=='playing'||state.busy)return;
 if(state.boosterMode==='row'||state.boosterMode==='color')return;
 pointerStart={id:e.pointerId,index:Number(tile.dataset.idx),x:e.clientX,y:e.clientY};
 try{tile.setPointerCapture(e.pointerId);}catch(_){}
}
function swipeEnd(e){
 const p=pointerStart;if(!p||e.pointerId!==p.id)return;
 pointerStart=null;
 if(!state||state.phase!=='playing'||state.busy)return;
 const dx=e.clientX-p.x,dy=e.clientY-p.y;
 if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;
 const horizontal=Math.abs(dx)>Math.abs(dy),n=p.index+(horizontal?(dx>0?1:-1):(dy>0?SIZE:-SIZE));
 if(n<0||n>=SIZE*SIZE||(horizontal&&Math.floor(n/SIZE)!==Math.floor(p.index/SIZE)))return;
 e.preventDefault();swap(p.index,n);
}
function boardClick(e){
 const tile=e.target.closest?.('[data-idx]');if(!tile||!state||state.phase!=='playing'||state.busy)return;
 if(state.boosterMode==='row'||state.boosterMode==='color')useBlast(Number(tile.dataset.idx));
}
function boardKeyboard(e){
 const tile=e.target.closest?.('[data-idx]');if(!tile||!state||state.phase!=='playing'||state.busy)return;
 const dirs={ArrowLeft:-1,ArrowRight:1,ArrowUp:-SIZE,ArrowDown:SIZE};
 if(!(e.key in dirs))return;
 e.preventDefault();
 const p=Number(tile.dataset.idx),n=p+dirs[e.key];
 if(n<0||n>=SIZE*SIZE||(Math.abs(dirs[e.key])===1&&Math.floor(p/SIZE)!==Math.floor(n/SIZE)))return;
 swap(p,n);
}

function drawHeads(){
 if(!overlay||!state)return;
 $('[data-wm-score]',overlay).textContent=state.score.toLocaleString('tr-TR');
 $('[data-wm-moves]',overlay).textContent=state.moves;
 $('[data-wm-level]',overlay).textContent='Seviye '+state.level+' · '+state.grade+'. Sınıf '+state.unit+'. Ünite';
 const target=targetFor(state.level),track=$('[data-wm-progress]',overlay);
 track.style.width=Math.min(100,100*state.score/target)+'%';
 const amount=$('[data-wm-target]',overlay);if(amount)amount.textContent=state.score.toLocaleString('tr-TR')+' / '+target.toLocaleString('tr-TR')+' puan';
 const goals=$('[data-wm-goals]',overlay);
 goals.innerHTML=state.goals.map(w=>{const count=Math.max(0,Number(state.goalsDone[w])||0);return '<span class="'+(count>=3?'done':'')+'">'+esc(w)+' <b>'+Math.min(3,count)+'/3</b></span>';}).join('');
 $('[data-wm-boosters]',overlay).querySelectorAll('[data-booster]').forEach(b=>{
  const n=state.boosters[b.dataset.booster]||0;b.disabled=state.busy||n===0;b.querySelector('small').textContent='×'+n;
 });
}

function showMeaning(word,bonus,combo){
 const w=state.words.find(x=>x.en===word),panel=$('[data-wm-meaning]',overlay);
 panel.innerHTML='<strong>'+esc(w?.en||word)+'</strong><span>= '+esc(w?.tr||'')+'</span><b>+'+bonus.toLocaleString('tr-TR')+' puan</b>';
 panel.classList.remove('pwm-show');void panel.offsetWidth;panel.classList.add('pwm-show');
 if(combo>1){const c=$('[data-wm-combo]',overlay);c.textContent=(combo>=3?'SÜPER KOMBO x':'KOMBO x')+combo;c.hidden=false;setTimeout(()=>{if(c.isConnected)c.hidden=true;},1400);}
 say(word);
}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function explode(groups,chain=1){
 const unique=new Set(groups.flatMap(g=>g.indices)),main=groups.reduce((a,b)=>!a||b.indices.length>a.indices.length?b:a,null);
 for(const idx of unique){const el=$('[data-idx="'+idx+'"]',overlay);el?.classList.add('pwm-burst');}
 let reward=0;groups.forEach(g=>{reward+=pointFor(g.indices.length)*chain;state.goalsDone[g.word]=(Number(state.goalsDone[g.word])||0)+1;});
 state.score+=reward;drawHeads();showMeaning(main.word,reward,chain);
 sound('good');await delay(390);
 for(const idx of unique)state.board[idx]=null;cascadeFill();boardDraw();
}
async function resolveMatches(groups){
 const session=state;let chain=1;
 while(still(session)&&groups.length&&chain<=12){
  await explode(groups,chain);
  if(!still(session))return;
  groups=matches(session.board);chain++;
 }
 if(!still(session))return;
 if(groups.length||!potential(session.board)){session.board=freshBoard();boardDraw();alertText('Yeni hamleler için şekerler karıştırıldı!');}
 const reached=session.score>=targetFor(session.level);
 if(session.moves<=0||reached){await finish(reached);return;}
 session.busy=false;drawHeads();
}
async function swap(a,b){
 if(!state||state.busy||state.phase!=='playing'||a===b)return;
 const session=state;
 const nearby=Math.abs(a-b)===SIZE||(Math.floor(a/SIZE)===Math.floor(b/SIZE)&&Math.abs(a-b)===1);
 if(!nearby&&session.boosterMode!=='swap')return;
 if(session.board[a]===session.board[b])return;
 session.busy=true;drawHeads();
 const x=session.board[a];session.board[a]=session.board[b];session.board[b]=x;boardDraw();
 await delay(125);if(!still(session))return;
 const groups=matches(session.board);
 if(!groups.length){
  const old=session.board[a];session.board[a]=session.board[b];session.board[b]=old;
  boardDraw();session.busy=false;drawHeads();alertText('Bu kaydırma eşleşme oluşturmadı.');
  return;
 }
 if(session.boosterMode==='swap'){session.boosters.swap--;session.boosterMode=null;}
 session.moves--;await resolveMatches(groups);
}

async function useBlast(i){
 const mode=state.boosterMode;if(!mode||state.boosters[mode]<=0)return;
 state.boosterMode=null;state.boosters[mode]--;state.moves--;state.busy=true;
 const indices=mode==='row'?Array.from({length:SIZE},(_,j)=>Math.floor(i/SIZE)*SIZE+j):state.board.map((w,j)=>w===state.board[i]?j:-1).filter(j=>j>=0);
 const groups=[{word:state.board[i],indices}];await explode(groups,1);
 await resolveMatches(matches(state.board));drawHeads();
}
function boost(which){
 if(!state||state.phase!=='playing'||state.busy||!state.boosters[which])return;
 if(which==='shuffle'){state.boosters.shuffle--;state.board=freshBoard();boardDraw();drawHeads();alertText('Şekerlerin yeri değişti!');return;}
 state.boosterMode=which;boardDraw();alertText(which==='swap'?'Yer değiştireceğin iki şekeri seç.':which==='row'?'Patlatmak istediğin satırdan bir şekere dokun.':'Patlatacağın kelimeye dokun.');
}
async function finish(success){
 const finished=state;if(!still(finished))return;
 finished.phase='finished';finished.busy=true;
 const done=$('[data-wm-result]',overlay);
 $('[data-wm-stage]',overlay).hidden=true;done.hidden=false;
 done.innerHTML='<div class="pwm-result-medal">'+(success?'👑':'⭐')+'</div><h2>'+(success?'SEVİYE TAMAMLANDI!':'Oyun tamamlandı!')+'</h2><p>Kazanılan oyun puanı</p><strong>'+finished.score.toLocaleString('tr-TR')+'</strong><p>'+finished.grade+'. sınıf · '+finished.unit+'. ünite</p><p data-wm-save aria-live="polite"></p><button class="pwm-btn" type="button" data-new disabled>'+(success?'Sonraki seviyeye geç':'Yeniden oyna')+'</button><button class="pwm-btn pwm-secondary" type="button" data-home>Oyunlardan Çık</button>';
 $('[data-home]',done).onclick=close;
 const next=$('[data-new]',done),msg=$('[data-wm-save]',done);
 if(success){
  msg.textContent='Yeni seviye hesabına kaydediliyor…';
  try{
   const saved=await access('complete',finished.runId,{level:finished.level,score:finished.score});
   if(!still(finished))return;
   if(!saved.unlocked)throw Error('Seviye kaydedilemedi.');
   finished.level=Number(saved.level)||finished.level+1;
   msg.textContent='✨ Yeni seviye açıldı! Kaydedildi.';
  }catch(err){if(!still(finished))return;msg.textContent='⚠️ '+err.message+' · Tekrar dene.';next.textContent='Kaydı tekrar dene';next.disabled=false;next.onclick=()=>finish(true);return;}
 }else msg.textContent='Bu turu tekrar oynayabilirsin.';
 if(!still(finished))return;next.disabled=false;
 next.onclick=()=>{if(!still(finished))return;finished.phase='setup';finished.startRunId=null;setup(true);};
}

function close(){
 if(!overlay)return;const old=overlay;overlay=null;state=null;pointerStart=null;
 old.remove();window.dmViewHistory?.leave(old);window.dmGameViewport?.sync();prior?.focus?.({preventScroll:true});
}
async function setup(replay=false){
 if(!overlay||!state)return;
 const current=state;
 state.phase='setup';state.busy=false;
 $('[data-wm-result]',overlay).hidden=true;
 $('[data-wm-stage]',overlay).hidden=true;
 const intro=$('[data-wm-intro]',overlay);intro.hidden=false;
 intro.innerHTML='<div class="pwm-hero"><img src="papi-welcome-v2.png" alt="Papi"><div class="pwm-cauldron">✦<span>📖</span>✦</div></div><div class="pwm-intro-panel"><div class="pwm-crown">👑 PREMIUM OYUN</div><h2>Kelime Şekerleri</h2><p>3 seferlik ücretsiz oynama hakkı; sonrasında Premium üyelere sınırsız oynama.</p><strong data-wm-remaining>Oyun hazırlanıyor…</strong><p class="pwm-rules">Şekerleri parmağınla kaydır; aynı kelimeden üç veya fazlasını birleştir!</p><p class="pwm-small" data-wm-status role="status">Word Bank kelimeleri yükleniyor.</p><button type="button" class="pwm-btn" data-wm-start hidden>Tekrar dene</button></div>';
 const retry=$('[data-wm-start]',intro);
 retry.onclick=()=>{current.startRunId=null;setup();};
 try{
  const rights=await access('check');
  if(!still(current)||current.phase!=='setup')return;
  current.rights=rights;setLevel(Number(rights.level)||current.level||1);
  $('[data-wm-remaining]',intro).textContent=trialMsg(rights)+' · Seviye '+current.level;
  if(!rights.allowed){alertText('Ücretsiz 3 oyun hakkın doldu. Premium üyelikle sınırsız oynayabilirsin.');return;}
  await start();
 }catch(err){if(!still(current)||current.phase!=='setup')return;alertText(err.message);retry.hidden=false;}
}
async function start(){
 if(!state||!overlay||state.busy||state.phase!=='setup')return;
 const current=state;
 try{current.words=pickWords();}catch(err){alertText(err.message);return;}
 current.busy=true;
 const runId=current.startRunId||(current.startRunId=crypto.randomUUID());
 alertText('Kelime şekerleri hazırlanıyor…');
 try{
  const rights=await access('start',runId);
  if(!still(current)||current.phase!=='setup')return;
  if(!rights.allowed){current.busy=false;return alertText('Ücretsiz oyun hakkı doldu. Premium üyelik gerekli.');}
  current.rights=rights;setLevel(Number(rights.level)||current.level);
  // Start and check resolve the same server-side level; protect against changed sessions.
  current.words=pickWords();
  current.phase='playing';current.busy=false;current.runId=runId;
  current.score=0;current.moves=MOVES;
  current.goals=current.words.slice(0,3).map(w=>w.en);
  current.goalsDone=Object.fromEntries(current.goals.map(w=>[w,0]));
  current.boosterMode=null;current.boosters={shuffle:1,swap:1,row:1,color:1};
  current.board=freshBoard();
  $('[data-wm-intro]',overlay).hidden=true;$('[data-wm-stage]',overlay).hidden=false;
  boardDraw();drawHeads();alertText('Şekeri parmağınla kaydır! Aynı kelimeden 3 veya fazlasını birleştir.');
 }catch(err){if(!still(current))return;current.busy=false;alertText(err.message);const retry=$('[data-wm-start]',overlay);if(retry)retry.hidden=false;}
}

function open(){
 close();loadStyle();prior=document.activeElement;
 state={phase:'setup',level:1,grade:1,unit:1,busy:false,rights:null,startRunId:null};
 overlay=document.createElement('section');overlay.id='premiumWordMatchOverlay';overlay.className='pwm-overlay game-modal-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Premium İngilizce Kelime Eşleştirme');
 overlay.innerHTML='<div class="pwm-shell"><header class="pwm-header"><button type="button" data-wm-close aria-label="Oyundan çık">‹</button><div><small>✨ DİJİ MEDU • PREMIUM OYUNLAR ✨</small><h1>İngilizce Kelime Eşleştirme</h1></div><span>👑</span></header><div class="pwm-content"><div data-wm-intro></div><div data-wm-stage hidden><div class="pwm-hud"><span>PUAN <strong data-wm-score>0</strong></span><span>HAMLE <strong data-wm-moves>22</strong></span><span class="pwm-level" data-wm-level></span></div><div class="pwm-starbar"><i data-wm-progress></i><b>⭐</b><b>⭐</b><b>⭐</b></div><p class="pwm-target" data-wm-target>0 / 1200 puan</p><div class="pwm-goals" data-wm-goals></div><div class="pwm-board-box"><div class="pwm-combo" data-wm-combo hidden></div><div class="pwm-board" data-wm-board></div></div><div class="pwm-meaning" data-wm-meaning aria-live="polite"><span>3 kelimeyi eşleştir, anlamını öğren!</span></div><p class="pwm-message" data-wm-status role="status"></p><div class="pwm-boosters" data-wm-boosters><button type="button" data-booster="shuffle"><span>🔀</span>Karıştır<small>×1</small></button><button type="button" data-booster="swap"><span>🔁</span>Yer Değiştir<small>×1</small></button><button type="button" data-booster="row"><span>⚡</span>Satır Patlat<small>×1</small></button><button type="button" data-booster="color"><span>🧪</span>Kelime Patlat<small>×1</small></button></div><div class="pwm-game-note">Büyük Eşleşme = Büyük Ödül! 3’lü +100 • 4’lü +250 • 5’li +500</div></div><div data-wm-result class="pwm-result" hidden></div></div></div>';
 document.body.append(overlay);
 const board=$('[data-wm-board]',overlay);
 board.addEventListener('pointerdown',swipeStart);
 board.addEventListener('pointerup',swipeEnd);
 board.addEventListener('pointercancel',()=>{pointerStart=null;});
 board.addEventListener('click',boardClick);
 board.addEventListener('keydown',boardKeyboard);
 $('[data-wm-close]',overlay).onclick=close;
 overlay.querySelectorAll('[data-booster]').forEach(b=>b.onclick=()=>boost(b.dataset.booster));
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
 if(!eventsBound){document.addEventListener('dm:login',close);eventsBound=true;}
 setup();window.dmGameViewport?.sync();
}
window.premiumKelimeEslestirmeAc=open;
window.dmPremiumWordMatch={open,close,potential,matches,pointFor,targetFor,levelList};
loadStyle();
})();