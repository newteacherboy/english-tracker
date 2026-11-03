/* Diji-Medu Premium Oyunlar — Kelime Eşleştirme / match-3.
 * Word Bank remains client-side; only one server request is required per game start.
 * Account trial rights are decided by the premium-word-match edge function.
 */
(()=>{'use strict';
const API='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/premium-word-match';
const SIZE=7,MOVES=20,FREE=3;
const $=(sel,root=document)=>root.querySelector(sel);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v==null?'':v).normalize('NFKC').trim().toLocaleLowerCase('en');
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const currentName=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const isTeacher=()=>window.dmTeacherPortalMode||currentName().toLowerCase()==='teacher';
const en=w=>String(w.ingilizce??w.english??w.en??'').trim();
const tr=w=>String(w.turkce??w.turkish??w.tr??'').trim();
let overlay=null,state=null,selected=null,prior=null,eventsBound=false;
function loadStyle(){if(document.getElementById('pwmStyle'))return;const l=document.createElement('link');l.id='pwmStyle';l.rel='stylesheet';l.href='premium-word-match.css?v=20261103-1';document.head.append(l);}
function bank(){
 const list=Array.isArray(window.masterKelimeHavuzu)?window.masterKelimeHavuzu:[];
 const seen=new Set();
 return list.map(w=>({en:en(w),tr:tr(w),grade:Number(w.sinif??w.class_no),unit:Number(w.unite??w.unit_no)})).filter(w=>{
  const key=norm(w.en);
  if(!w.en||!w.tr||w.en.length>11||!Number.isInteger(w.grade)||w.grade<1||w.grade>8||!Number.isInteger(w.unit)||w.unit<1||seen.has(w.grade+':'+w.unit+':'+key))return false;
  seen.add(w.grade+':'+w.unit+':'+key);return true;
 });
}
function scope(){return bank().filter(w=>w.grade===state.grade&&w.unit===state.unit);}
function units(){return [...new Set(bank().filter(w=>w.grade===state.grade).map(w=>w.unit))].sort((a,b)=>a-b);}
function trialMsg(data){if(isTeacher())return 'Öğretmen ön izlemesi · ödülsüz';if(!data)return '3 seferlik ücretsiz oynama hakkı';return data.premium?'👑 Premium üye · sınırsız oynama':'🎁 Kalan ücretsiz oyun: '+data.remaining+' / '+FREE;}
async function access(action,runId){
 if(isTeacher())return {ok:true,allowed:true,premium:true,remaining:3};
 const token=localStorage.getItem('ing_token');
 if(!token)throw Error('Oyuna başlamak için hesabına giriş yapmalısın.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({t:token,action,runId}),signal:controller.signal,cache:'no-store'});
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
 if(available.length<5)throw Error('Bu ünitede en az 5 kısa ve farklı kelime gerekli. Başka bir ünite seç.');
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
 const shape=['✦','♥','★','✿','◆','✧','●','✺'][idx%8];
 return '<button type="button" class="pwm-tile pwm-c'+(idx%8)+(selected===i?' chosen':'')+'" data-idx="'+i+'" aria-label="'+esc(word)+'"><i aria-hidden="true">'+shape+'</i><b>'+esc(word)+'</b></button>';
}
function boardDraw(){
 const board=$('[data-wm-board]',overlay);if(!board)return;
 board.innerHTML=state.board.map(tileHtml).join('');
 board.querySelectorAll('[data-idx]').forEach(el=>el.onclick=()=>tap(Number(el.dataset.idx)));
}
function drawHeads(){
 $('[data-wm-score]',overlay).textContent=state.score.toLocaleString('tr-TR');
 $('[data-wm-moves]',overlay).textContent=state.moves;
 $('[data-wm-level]',overlay).textContent=state.grade+'. Sınıf · '+state.unit+'. Ünite';
 $('[data-wm-progress]',overlay).style.width=Math.min(100,state.score/6000*100)+'%';
 const goals=$('[data-wm-goals]',overlay);
 goals.innerHTML=state.goals.map(w=>'<span class="'+(state.goalsDone[w]>=3?'done':'')+'">'+esc(w)+' <b>'+Math.min(3,state.goalsDone[w])+'/3</b></span>').join('');
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
 let reward=0;groups.forEach(g=>{reward+=pointFor(g.indices.length)*chain;state.goalsDone[g.word]=(state.goalsDone[g.word]||0)+1;});
 state.score+=reward;drawHeads();showMeaning(main.word,reward,chain);
 sound('good');await delay(390);
 for(const idx of unique)state.board[idx]=null;cascadeFill();boardDraw();
}
async function resolveMatches(groups){
 let chain=1;
 while(groups.length&&chain<=14){
  await explode(groups,chain);groups=matches(state.board);chain++;
 }
 if(!potential(state.board)){state.board=freshBoard();boardDraw();alertText('Yeni hamleler için şekerler karıştırıldı!');}
 const complete=state.goals.every(w=>state.goalsDone[w]>=3);
 if(state.moves<=0||complete){finish(complete);return;}
 state.busy=false;drawHeads();
}
async function swap(a,b){
 if(state.busy||state.phase!=='playing'||a===b)return;
 const nearby=Math.abs(a-b)===SIZE||(Math.floor(a/SIZE)===Math.floor(b/SIZE)&&Math.abs(a-b)===1);
 if(!nearby&&state.boosterMode!=='swap'){alertText('Yan yana iki şekeri yer değiştir!');selected=null;boardDraw();return;}
 if(state.board[a]===state.board[b]){selected=null;boardDraw();return;}
 state.busy=true;const x=state.board[a];state.board[a]=state.board[b];state.board[b]=x;selected=null;boardDraw();
 await delay(150);const g=matches(state.board);
 if(!g.length){const z=state.board[a];state.board[a]=state.board[b];state.board[b]=z;boardDraw();state.busy=false;alertText('Bu hamle eşleşme oluşturmadı.');return;}
 if(state.boosterMode==='swap'){state.boosters.swap--;state.boosterMode=null;}
 state.moves--;await resolveMatches(g);
}
function tap(i){
 if(!state||state.phase!=='playing'||state.busy)return;
 if(state.boosterMode==='row'||state.boosterMode==='color'){useBlast(i);return;}
 if(selected==null){selected=i;boardDraw();return;}
 const prev=selected;swap(prev,i);
}
async function useBlast(i){
 const mode=state.boosterMode;if(!mode||state.boosters[mode]<=0)return;
 state.boosterMode=null;state.boosters[mode]--;state.moves--;state.busy=true;selected=null;
 const indices=mode==='row'?Array.from({length:SIZE},(_,j)=>Math.floor(i/SIZE)*SIZE+j):state.board.map((w,j)=>w===state.board[i]?j:-1).filter(j=>j>=0);
 const groups=[{word:state.board[i],indices}];await explode(groups,1);
 await resolveMatches(matches(state.board));drawHeads();
}
function boost(which){
 if(!state||state.phase!=='playing'||state.busy||!state.boosters[which])return;
 if(which==='shuffle'){state.boosters.shuffle--;state.board=freshBoard();selected=null;boardDraw();drawHeads();alertText('Şekerlerin yeri değişti!');return;}
 state.boosterMode=which;selected=null;boardDraw();alertText(which==='swap'?'Yer değiştireceğin iki şekeri seç.':which==='row'?'Patlatmak istediğin satırdan bir şekere dokun.':'Patlatacağın kelimeye dokun.');
}
function finish(success){
 state.phase='finished';state.busy=false;
 $('[data-wm-stage]',overlay).hidden=true;
 const done=$('[data-wm-result]',overlay);done.hidden=false;
 done.innerHTML='<div class="pwm-result-medal">🏆</div><h2>'+(success?'Kelime Ustası!':'Oyun tamamlandı!')+'</h2><p>Toplam puan</p><strong>'+state.score.toLocaleString('tr-TR')+'</strong><p>'+state.grade+'. sınıf · '+state.unit+'. ünite kelimelerini çalıştın.</p><button class="pwm-btn" type="button" data-new>Yeniden Oyna</button><button class="pwm-btn pwm-secondary" type="button" data-home>Oyunlara Dön</button>';
 $('[data-new]',done).onclick=()=>{state.phase='setup';setup();};
 $('[data-home]',done).onclick=close;
}
function close(){
 if(!overlay)return;const old=overlay;overlay=null;state=null;selected=null;
 old.remove();window.dmViewHistory?.leave(old);window.dmGameViewport?.sync();prior?.focus?.({preventScroll:true});
}
function gradeUnit(){
 const grades=$('[data-wm-grade]',overlay),un=$('[data-wm-unit]',overlay);
 grades.innerHTML='';
 for(let i=1;i<=8;i++){const o=document.createElement('option');o.value=i;o.textContent=i+'. Sınıf';o.disabled=!!window.dmGameAccess?.reason(i);grades.append(o);}
 grades.value=String(state.grade);
 if(grades.selectedOptions[0]?.disabled)grades.value=String([...grades.options].find(o=>!o.disabled)?.value||1);
 state.grade=Number(grades.value);
 const update=()=>{
  state.grade=Number(grades.value);const n=units();un.innerHTML='';
  n.forEach(unit=>{const o=document.createElement('option');o.value=unit;o.textContent=unit+'. Ünite';o.disabled=!!window.dmGameAccess?.reason(state.grade,unit);un.append(o);});
  const chosen=[...un.options].find(o=>!o.disabled);un.value=String(chosen?.value||'');state.unit=Number(un.value||0);
  const num=scope().length;
  alertText(chosen?'Seçilen ünite kelimeleri hazır.':'Bu sınıfta oynanabilecek ünite henüz bulunamadı.');
 };
 grades.onchange=update;un.onchange=()=>{state.unit=Number(un.value);alertText('');};update();
}
async function setup(){
 if(!overlay||!state)return;
 const active=state;
 state.phase='setup';state.busy=false;
 $('[data-wm-result]',overlay).hidden=true;$('[data-wm-stage]',overlay).hidden=true;
 const intro=$('[data-wm-intro]',overlay);intro.hidden=false;
 intro.innerHTML='<div class="pwm-hero"><img src="papi-welcome-v2.png" alt="Papi" onerror="this.style.display=\'none\'"><div class="pwm-cauldron">✦<span>📖</span>✦</div></div><div class="pwm-intro-panel"><div class="pwm-crown">👑 PREMIUM OYUN</div><h2>İngilizce Kelime Eşleştirme</h2><p>3 seferlik ücretsiz oynama hakkı. Sonrasında premium üyelere sınırsız oynama.</p><p class="pwm-rules">Aynı kelimelerden en az üçünü yan yana getir, şekerleri patlat ve Türkçe anlamlarını keşfet! Art arda eşleşmelerle süper kombolar kazan.</p><strong data-wm-remaining>Oyun hakkı kontrol ediliyor…</strong><div class="pwm-select"><label>Sınıf seç<select data-wm-grade></select></label><label>Ünite seç<select data-wm-unit></select></label></div><div class="pwm-rates"><span>3’lü +100</span><span>4’lü +250</span><span>5’li +500</span></div><button type="button" class="pwm-btn" data-wm-start>▶ OYUNA BAŞLA</button><p class="pwm-small" data-wm-status role="status">Kelimeler Word Bank’ten rastgele seçilir.</p></div>';
 gradeUnit();
 const startBtn=$('[data-wm-start]',intro);
 startBtn.onclick=start;
 try{const rights=await access('check');if(!overlay||state!==active||state.phase!=='setup')return;state.rights=rights;$('[data-wm-remaining]',intro).textContent=trialMsg(rights);startBtn.disabled=!rights.allowed;if(!rights.allowed)alertText('Üç ücretsiz oyun hakkın doldu. Sınırsız oyun için Premium üyelik gerekir.');}
 catch(e){if(!overlay||state!==active||state.phase!=='setup')return;startBtn.disabled=true;$('[data-wm-remaining]',intro).textContent='Hak kontrolü başarısız';alertText(e.message);}
}
async function start(){
 if(!overlay||!state||state.busy||state.phase!=='setup')return;
 if(!state.unit)return alertText('Önce bir ünite seç.');
 const why=window.dmGameAccess?.reason(state.grade,state.unit);if(why)return alertText(why);
 try{state.words=pickWords();}catch(e){return alertText(e.message);}
 state.busy=true;
 const startBtn=$('[data-wm-start]',overlay);startBtn.disabled=true;alertText('Oyun hazırlanıyor…');
 const active=state;const runId=state.startRunId||(state.startRunId=typeof crypto.randomUUID==='function'?crypto.randomUUID():null);
 try{
  const rights=await access('start',runId);
  if(!overlay||state!==active||state.phase!=='setup')return;
  if(!rights.allowed){state.busy=false;startBtn.disabled=true;$('[data-wm-remaining]',overlay).textContent=trialMsg(rights);return alertText('Ücretsiz oynama hakların bitti. Premium üyelik gerekli.');}
  state.rights=rights;state.phase='playing';state.busy=false;state.runId=runId;state.score=0;state.moves=MOVES;state.goals=state.words.slice(0,3).map(w=>w.en);state.goalsDone={};state.boosterMode=null;state.boosters={shuffle:1,swap:1,row:1,color:1};
  state.board=freshBoard();
  $('[data-wm-intro]',overlay).hidden=true;$('[data-wm-stage]',overlay).hidden=false;
  boardDraw();drawHeads();alertText('Aynı kelimelerden 3 veya daha fazlasını eşleştir!');
 }catch(e){if(!overlay||state!==active)return;state.busy=false;startBtn.disabled=false;alertText(e.message);}
}
function open(){
 close();loadStyle();prior=document.activeElement;
 state={phase:'setup',grade:Number(window.dmGameAccess?.rule?.()?.cls)||1,unit:1,busy:false,rights:null,startRunId:null};
 overlay=document.createElement('section');overlay.id='premiumWordMatchOverlay';overlay.className='pwm-overlay game-modal-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Premium İngilizce Kelime Eşleştirme');
 overlay.innerHTML='<div class="pwm-shell"><header class="pwm-header"><button type="button" data-wm-close aria-label="Oyundan çık">‹</button><div><small>✨ DİJİ MEDU • PREMIUM OYUNLAR ✨</small><h1>İngilizce Kelime Eşleştirme</h1></div><span>👑</span></header><div class="pwm-content"><div data-wm-intro></div><div data-wm-stage hidden><div class="pwm-hud"><span>PUAN <strong data-wm-score>0</strong></span><span>HAMLE <strong data-wm-moves>20</strong></span><span class="pwm-level" data-wm-level></span></div><div class="pwm-starbar"><i data-wm-progress></i><b>⭐</b><b>⭐</b><b>⭐</b></div><div class="pwm-goals" data-wm-goals></div><div class="pwm-board-box"><div class="pwm-combo" data-wm-combo hidden></div><div class="pwm-board" data-wm-board></div></div><div class="pwm-meaning" data-wm-meaning aria-live="polite"><span>3 kelimeyi eşleştir, anlamını öğren!</span></div><p class="pwm-message" data-wm-status role="status"></p><div class="pwm-boosters" data-wm-boosters><button type="button" data-booster="shuffle"><span>🔀</span>Karıştır<small>×1</small></button><button type="button" data-booster="swap"><span>🔁</span>Yer Değiştir<small>×1</small></button><button type="button" data-booster="row"><span>⚡</span>Satır Patlat<small>×1</small></button><button type="button" data-booster="color"><span>🧪</span>Kelime Patlat<small>×1</small></button></div><div class="pwm-game-note">Büyük Eşleşme = Büyük Ödül! 3’lü +100 • 4’lü +250 • 5’li +500</div></div><div data-wm-result class="pwm-result" hidden></div></div></div>';
 document.body.append(overlay);
 $('[data-wm-close]',overlay).onclick=close;
 overlay.querySelectorAll('[data-booster]').forEach(b=>b.onclick=()=>boost(b.dataset.booster));
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
 if(!eventsBound){document.addEventListener('dm:login',close);eventsBound=true;}
 setup();window.dmGameViewport?.sync();
}
window.premiumKelimeEslestirmeAc=open;
window.dmPremiumWordMatch={open,close,potential,matches,pointFor};
loadStyle();
})();