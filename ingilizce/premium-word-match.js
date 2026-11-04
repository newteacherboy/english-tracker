/* Premium Oyunlar · Candy Papiş (v2, 3 Kas 2026).
   - Şekerlerin üstünde Word Bank kelimeleri yazar; eşleşince Türkçesi belirir.
   - 100 bölüm / 5 dünya. Her bölüm 5 enerji. Premium olmayanların 3 ücretsiz denemesi var.
   - Hak, enerji, ödül, bölüm ilerlemesi ve güçlendiriciler sunucuda (premium-games) tutulur.
   - iPhone belleği için: tek canvas, şeker+kelime görüntüleri önbellekte, ağır CSS filtresi yok. */
(()=>{'use strict';
if(window.dmPwm)return;
const V='20261103-v2-2',A='premium-assets/kelime-eslestirme/';
const API=(typeof apiURL!=='undefined'?apiURL:'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api').replace(/diji-api.*$/,'premium-games');
const WORLDS=['Büyü Kütüphanesi','Kristal Mağara','Gökyüzü Şatosu','Büyülü Bahçe','Yıldız Kulesi'];
const BGS=['bg-1-buyu-kutuphanesi','bg-2-kristal-magara','bg-3-gokyuzu-satosu','bg-4-buyulu-bahce','bg-5-yildiz-kulesi'];
const CANDIES=['candy-pink-oval','candy-red-flower','candy-blue-star','candy-yellow-drop','candy-green-heart','candy-orange-cloud','candy-purple-square'];
const BOOSTERS=[['karistir','Karıştır','Karışık Düzen','booster-karistir',40],['degistir','Yer Değiştir','2 Şekli Değiştir','booster-yer-degistir',60],['satir','Satır Patlat','Tüm Satırı Temizle','booster-satir-patlat',80],['renk','Renk Patlat','Aynı Renklerin Hepsini Temizle','booster-renk-patlat',120]];
const COMBO_WORDS=['','','Harika!','Süper!','Muhteşem!'];
const FALLBACK=[['book','kitap'],['apple','elma'],['house','ev'],['cat','kedi'],['school','okul'],['dog','köpek'],['water','su'],['tree','ağaç'],['sun','güneş'],['milk','süt'],['car','araba'],['bird','kuş'],['pen','kalem'],['door','kapı'],['fish','balık'],['ball','top'],['chair','sandalye'],['bread','ekmek'],['rain','yağmur'],['moon','ay'],['flower','çiçek'],['window','pencere'],['friend','arkadaş'],['teacher','öğretmen']];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('tr-TR');
const who=()=>String(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi||'');
const store={get(k){try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const uuid=()=>crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));

/* ---------- yükleme ---------- */
function css(){if(document.getElementById('pwmCss'))return;const l=document.createElement('link');l.id='pwmCss';l.rel='stylesheet';l.href='premium-word-match.css?v='+V;document.head.append(l);}
function script(src){return new Promise((ok,no)=>{if(window.dmPwmCore)return ok();const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(Error('Oyun yüklenemedi. İnternetini kontrol et.'));document.head.append(s);});}
const imgs={};
function img(name){if(!imgs[name]){const i=new Image();i.decoding='async';i.src=A+name+'.webp';imgs[name]=i;}return imgs[name];}
function ready(i){return i.complete&&i.naturalWidth>0;}
async function preload(names){await Promise.all(names.map(n=>{const i=img(n);return ready(i)?0:(i.decode?i.decode().catch(()=>0):new Promise(r=>{i.onload=i.onerror=r;}));}));}

/* ---------- sunucu ---------- */
function token(){return who().toLowerCase()==='teacher'?(sessionStorage.getItem('ing_ogr_token')||localStorage.getItem('ing_token')||''):(localStorage.getItem('ing_token')||'');}
async function api(op,data={}){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),15000);
 try{const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op,...data,t:token()}),signal:ctl.signal,cache:'no-store'});
  let d=null;try{d=await r.json();}catch{}
  if(!r.ok||!d||d.ok===false){const e=Error(d?.mesaj||'Bağlantı kurulamadı. Tekrar dene.');e.code=d?.hata;throw e;}return d;
 }catch(e){if(e.name==='AbortError')throw Error('Bağlantı gecikti. Tekrar dene.');throw e;}finally{clearTimeout(timer);}
}

/* ---------- ses (Web Audio ile üretilir, dosya indirilmez) ---------- */
const sound={on:store.get('dm_pwm_sound')!==false,ctx:null,music:null,
 ac(){if(!this.on)return null;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;this.ctx??=new AC();if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});return this.ctx;}catch{return null;}},
 tone(freq,dur=.12,type='sine',vol=.05,slide=0,delay=0){const a=this.ac();if(!a)return;const t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*slide),t+dur);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+.02);o.onended=()=>{o.disconnect();g.disconnect();};},
 noise(dur=.15,vol=.04,freq=1800,delay=0){const a=this.ac();if(!a)return;const t=a.currentTime+delay,n=Math.floor(a.sampleRate*dur),b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=b;f.type='bandpass';f.frequency.value=freq;g.gain.value=vol;s.connect(f);f.connect(g);g.connect(a.destination);s.start(t);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};},
 scale:[523.25,587.33,659.25,783.99,880,1046.5,1174.66,1318.5,1567.98,1760],
 swap(){this.noise(.09,.03,2400);},
 pop(combo,i=0){const f=this.scale[Math.min(this.scale.length-1,combo-1+i)];this.tone(f,.16,'triangle',.06);this.tone(f*2,.1,'sine',.025,0,.03);},
 bad(){this.tone(220,.16,'square',.025,.6);this.tone(170,.18,'square',.02,.6,.08);},
 stripe(){this.tone(500,.35,'sawtooth',.03,3.2);this.noise(.3,.03,3200);},
 bomb(){this.noise(.5,.07,700);this.tone(140,.6,'sine',.08,.4);[0,1,2,3].forEach(i=>this.tone(900+i*240,.18,'triangle',.03,0,.08*i));},
 create(){this.tone(1046,.25,'sine',.05,1.5);this.tone(1568,.3,'triangle',.03,1.2,.06);},
 star(i){this.tone([1046.5,1318.5,1568][i]||1568,.5,'sine',.07);this.tone(([1046.5,1318.5,1568][i]||1568)*2,.4,'triangle',.02,0,.05);},
 win(){[523,659,784,1046,1318].forEach((f,i)=>this.tone(f,.32,'triangle',.06,0,i*.11));},
 fail(){[392,349,311,262].forEach((f,i)=>this.tone(f,.32,'triangle',.05,0,i*.16));},
 tick(){this.tone(1400,.05,'sine',.025);},
 /* Hafif arka plan müziği: pentatonik arpej + yumuşak bas, 104 bpm. */
 startMusic(){if(!this.on||this.music)return;const a=this.ac();if(!a)return;let step=0,next=a.currentTime+.1;const notes=[0,2,4,7,9,7,4,2],bass=[130.81,174.61,196,146.83],beat=60/104/2;
  const master=a.createGain();master.gain.value=.55;master.connect(a.destination);
  const play=(f,t,d,type,vol)=>{const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.05);o.onended=()=>{o.disconnect();g.disconnect();};};
  const timer=setInterval(()=>{if(!this.ctx)return;while(next<a.currentTime+.4){const bar=Math.floor(step/8)%4,root=bass[bar];const n=notes[step%8];play(root*2*Math.pow(2,n/12),next,beat*.9,'triangle',.022);if(step%8===0)play(root/2,next,beat*7,'sine',.035);if(step%4===2)play(root*4*Math.pow(2,notes[(step+3)%8]/12),next,beat*.5,'sine',.008);step++;next+=beat;}},120);
  this.music={timer,master};},
 stopMusic(){if(!this.music)return;clearInterval(this.music.timer);try{this.music.master.gain.setTargetAtTime(0,this.ctx.currentTime,.05);const m=this.music.master;setTimeout(()=>m.disconnect(),300);}catch{}this.music=null;},
 close(){this.stopMusic();try{this.ctx?.close();}catch{}this.ctx=null;}
};
const buzz=ms=>{try{navigator.vibrate?.(ms);}catch{}};

/* ---------- kelimeler ---------- */
const accessCache=new Map();
function allowed(w){const k=w.sinif+':'+w.unite;if(!accessCache.has(k)){let ok=true;try{ok=!window.dmGameAccess?.reason?.(Number(w.sinif),Number(w.unite));}catch{}accessCache.set(k,ok);}return accessCache.get(k);}
function wordPool(){
 const seen=new Set(),out=[];
 for(const w of window.masterKelimeHavuzu||[]){
  const en=String(w.ingilizce??w.en??'').trim(),tr=String(w.turkce??w.tr??'').trim();
  if(!en||!tr||en.length>8||en.length<2||!/^[a-z][a-z'-]*$/i.test(en))continue;
  const k=en.toLowerCase();if(seen.has(k)||!allowed(w))continue;seen.add(k);out.push({en:k,tr:tr.split(/[,;/]/)[0].trim().slice(0,16)});
 }
 return out;
}
function pickWords(n){
 let pool=wordPool();if(pool.length<n)pool=FALLBACK.map(([en,tr])=>({en,tr}));
 const a=pool.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
 return a.slice(0,n);
}

/* ---------- durum ---------- */
let root=null,owner='',status=null,practice=false,view='home',world=1,epoch=0,navKey='',origin=null,parent=null,watch=null,pendingYo=null,earned={xp:0,gold:0};
let G=null; // aktif oyun

const $=s=>root?.querySelector(s);
function shell(){
 origin=document.activeElement;parent=window.dmViewHistory?.capture?.();
 root=document.createElement('section');root.id='pwmRoot';root.className='pwm';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Candy Papiş');
 root.innerHTML=`<div class="pwm-bg" aria-hidden="true"></div>
 <header class="pwm-top">
  <button type="button" class="pwm-round" data-back aria-label="Oyunlardan çık"><svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg></button>
  <div class="pwm-title"><img class="pwm-title-book" src="${A}icon-books.webp" alt=""><div><b>Premium Oyun</b><strong>Candy Papiş</strong></div><small>✦ Kelimeleri Eşleştir, Öğren, Puan Kazan! ✦</small></div>
  <div class="pwm-top-right"><span class="pwm-energy" title="Enerji"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg><b data-energy>–</b></span><button type="button" class="pwm-round" data-sound aria-label="Sesi aç veya kapat"></button></div>
 </header>
 <img class="pwm-witch" src="${A}char-witch-idle.webp" alt="" aria-hidden="true">
 <div class="pwm-badge" aria-hidden="true"><img src="${A}icon-crown.webp" alt=""><span>PREMIUM<br>OYUN</span></div>
 <main class="pwm-stage"></main>
 <div class="pwm-modal" hidden></div>
 <div class="pwm-toast" role="status" hidden></div>`;
 document.body.append(root);document.body.classList.add('pwm-active');window.dmPapiNotices?.pause?.();
 $('[data-back]').onclick=()=>back();
 $('[data-sound]').onclick=()=>{sound.on=!sound.on;store.set('dm_pwm_sound',sound.on);paintSound();if(sound.on){if(G)sound.startMusic();sound.tick();}else{sound.stopMusic();}};
 paintSound();
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();back();}});
 window.dmViewHistory?.track?.(root,{parent,close:()=>close(true),back:()=>back(true)});
 navKey=uuid();try{history.pushState({...history.state,dmPwm:navKey},'');}catch{}
 watch=setInterval(()=>{if(owner!==who())close();},700);
}
function paintSound(){const b=$('[data-sound]');if(!b)return;b.setAttribute('aria-pressed',String(sound.on));b.innerHTML=sound.on?'<svg viewBox="0 0 24 24"><path d="M3 9h4l5-4v14l-5-4H3zM16 8q5 4 0 8"/></svg>':'<svg viewBox="0 0 24 24"><path d="M3 9h4l5-4v14l-5-4H3zM17 9l5 6m0-6-5 6"/></svg>';}
function setBg(w){const bg=$('.pwm-bg');if(bg)bg.style.backgroundImage=`url(${A}${BGS[(w-1)%5]}.webp)`;}
function toast(msg){const t=$('.pwm-toast');if(!t)return;t.textContent=msg;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>{t.hidden=true;},2600);}
function energy(v){if(v===undefined||v===null)return;const e=$('[data-energy]');if(e)e.textContent=v;if(status?.energyMax)window.headerEnerjiGoster?.(v,status.energyMax);}
function adopt(d){status={...status,...d};energy(d.energy);}

function modal(html,cls=''){const m=$('.pwm-modal');m.hidden=false;m.className='pwm-modal '+cls;m.innerHTML='<div class="pwm-card" role="document">'+html+'</div>';setTimeout(()=>m.querySelector('button:not(:disabled)')?.focus({preventScroll:true}),30);return m.querySelector('.pwm-card');}
function hideModal(){const m=$('.pwm-modal');if(m){m.hidden=true;m.replaceChildren();}}
const isPremium=()=>practice||!!status?.premium;
const remaining=()=>isPremium()?Infinity:Math.max(0,Number(status?.remaining??0));

/* ---------- açılış ---------- */
async function open(){
 if(root)return;
 if(!who()){window.yoToast?.('Premium oyunlar için hesabına giriş yap.');return;}
 owner=who();epoch++;earned={xp:0,gold:0};pendingYo=null;css();shell();setBg(1);
 $('.pwm-stage').innerHTML='<div class="pwm-loading"><img src="'+A+'icon-crown.webp" alt=""><p>Büyü kitabı açılıyor…</p></div>';
 const ticket=epoch;
 try{
  const [d]=await Promise.all([api('status'),script('premium-word-match-core.js?v='+V),preload(['char-witch-idle','icon-crown','icon-star-full','icon-star-empty','icon-lock']),(window.masterKelimeHavuzu?.length?0:window.dijiKelimeHavuzunuYukle?.().catch(()=>0))]);
  if(ticket!==epoch||!root)return;
  practice=!!d.practice;adopt(d);world=Math.min(5,Math.ceil(Math.max(1,d.level||1)/20));setBg(world);
  preload([...CANDIES,'candy-rainbow-bomb','fx-stripe-h','fx-stripe-v','tile-ice','tile-chain','fx-sparkle','fx-burst']);
  if(!isPremium()&&remaining()<=0)return comingSoon();
  home();
  if(!isPremium()&&!store.get('dm_pwm_trial_seen:'+owner.toLowerCase()))trialPopup();
 }catch(e){if(ticket===epoch&&root){$('.pwm-stage').innerHTML='';const c=modal('<h2 class="pwm-ribbon-title">Oyun açılamadı</h2><p>'+esc(e.message)+'</p><div class="pwm-actions"><button type="button" class="pwm-btn" data-retry>Tekrar dene</button><button type="button" class="pwm-btn ghost" data-x>Çık</button></div>');c.querySelector('[data-retry]').onclick=()=>{close();open();};c.querySelector('[data-x]').onclick=()=>close();}}
}

function trialPopup(){
 const left=remaining();
 const c=modal(`<button type="button" class="pwm-x" data-x aria-label="Kapat">×</button>
  <div class="pwm-trial-crown"><img src="${A}icon-crown.webp" alt=""></div>
  <h2 class="pwm-ribbon-title">3 seferlik ücretsiz<br>oynama hakkı</h2>
  <div class="pwm-trial-row"><img src="${A}icon-gift.webp" alt=""><p>Sonrasında <b>premium üyelere sınırsız</b> oynama.</p><img src="${A}icon-infinity.webp" alt=""></div>
  <p class="pwm-pill"><img src="${A}icon-dice.webp" alt="">Her oynayışta farklı kelimeler gelir.</p>
  <p class="pwm-pill"><img src="${A}icon-books.webp" alt="">Kelimeler Word Bank’ten rastgele çekilir.</p>
  <p class="pwm-trial-left">Kalan ücretsiz hakkın: <b>${left} / 3</b> · Her bölüm 5 enerji</p>
  <div class="pwm-actions"><button type="button" class="pwm-btn gold" data-x>Hadi Başlayalım!</button></div>`,'trial');
 c.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{store.set('dm_pwm_trial_seen:'+owner.toLowerCase(),true);hideModal();sound.tick();});
}

function comingSoon(){
 // Android uygulamasında abonelik satılır; web ve iOS'ta eski "yakında" ekranı kalır.
 const shop=!!window.dmAndroidBilling?.available, plan=window.dmAndroidPlan?.plan||'free';
 view='soon';$('.pwm-stage').innerHTML='';
 const c=modal(`<img class="pwm-soon-art" src="${A}yakinda-art.webp" alt="Büyücü kız taçlı sandığa bakıyor">
  <h2 class="pwm-ribbon-title">${shop?(plan==='pro'?'Bugünkü hakkın bitti':'Premium Oyunlar açılsın mı?'):'Premium çok yakında!'}</h2>
  <p>${plan==='pro'?'Pro ile bugünkü 5 bölümünü oynadın. Yarın yeniden açılır, <b>Premium Pro</b> ile hemen <b>sınırsız</b> oynayabilirsin.':shop?'3 ücretsiz oyun hakkını kullandın. <b>Pro</b> ile günde 5 bölüm, <b>Premium Pro</b> ile <b>sınırsız</b> oynayabilirsin.':'3 ücretsiz oyun hakkını kullandın. Premium paket açıldığında <b>Kelime Eşleştirme</b> ve tüm premium oyunları <b>sınırsız</b> oynayabileceksin.'}</p>
  <ul class="pwm-soon-list"><li>✦ 100 bölüm, 5 büyülü dünya</li><li>✦ Oyunlar arasında en yüksek ödül</li><li>✦ Her bölümde yeni kelimeler</li></ul>
  <p class="pwm-muted">Bu sırada diğer oyunlarla XP ve altın kazanmaya devam edebilirsin.</p>
  <div class="pwm-actions">${shop?'<button type="button" class="pwm-btn gold big" data-plans>Planları gör</button><button type="button" class="pwm-btn ghost" data-x>Tamam</button>':'<button type="button" class="pwm-btn gold" data-x>Tamam</button>'}</div>`,'soon');
 c.querySelector('[data-x]').onclick=()=>close();
 c.querySelector('[data-plans]')?.addEventListener('click',()=>{close();window.dmAndroidBilling.open('premium-oyunlar');});
}

/* ---------- bölüm haritası ---------- */
function home(){
 view='home';root.dataset.view='home';G=null;sound.stopMusic();hideModal();setBg(world);
 const lv=status?.level||1,stars=status?.stars||{};
 const levels=[];for(let i=(world-1)*20+1;i<=world*20;i++){const s=Number(stars[i]||0),locked=i>lv;levels.push(`<button type="button" class="pwm-lv${locked?' locked':''}${i===lv?' current':''}" data-lv="${i}" ${locked?'aria-disabled="true"':''} aria-label="Seviye ${i}${locked?', kilitli':', '+s+' yıldız'}"><b>${i}</b>${locked?`<img src="${A}icon-lock.webp" alt="">`:`<span class="pwm-lv-stars">${[1,2,3].map(k=>`<i class="${k<=s?'on':''}"></i>`).join('')}</span>`}</button>`);}
 const total=Object.values(stars).reduce((a,b)=>a+Number(b||0),0);
 $('.pwm-stage').innerHTML=`<section class="pwm-home">
  <div class="pwm-home-head"><div class="pwm-plan">${isPremium()?`<img src="${A}icon-infinity.webp" alt=""><span><b>${practice?'Sınıf modu':'Premium'}</b><small>${practice?'Ödül işlenmez':'Sınırsız oyun'}</small></span>`:`<img src="${A}icon-gift.webp" alt=""><span><b>${remaining()} / 3</b><small>ücretsiz hak</small></span>`}</div>
   <div class="pwm-plan"><img src="${A}icon-star-full.webp" alt=""><span><b>${total} / 300</b><small>yıldız</small></span></div></div>
  <nav class="pwm-worlds" aria-label="Dünyalar">${WORLDS.map((n,i)=>{const w=i+1,open=lv>(w-1)*20;return `<button type="button" data-world="${w}" aria-pressed="${w===world}" ${open?'':'aria-disabled="true"'}><span>${w}</span><small>${n}</small></button>`;}).join('')}</nav>
  <h2 class="pwm-world-name">${WORLDS[world-1]}</h2>
  <div class="pwm-levels">${levels.join('')}</div>
  <div class="pwm-home-actions"><button type="button" class="pwm-btn gold big" data-play>▶ Seviye ${lv}’i Oyna</button><button type="button" class="pwm-btn ghost" data-shop><img src="${A}booster-renk-patlat.webp" alt="">Güçlendiriciler</button></div>
 </section>`;
 $('[data-play]').onclick=()=>levelCard(lv);
 $('[data-shop]').onclick=()=>shop();
 root.querySelectorAll('[data-world]').forEach(b=>b.onclick=()=>{if(b.getAttribute('aria-disabled')){toast('Bu dünya önceki bölümleri bitirince açılır.');return;}world=+b.dataset.world;sound.tick();home();});
 root.querySelectorAll('[data-lv]').forEach(b=>b.onclick=()=>{if(b.classList.contains('locked')){toast('Önce Seviye '+lv+'’i geç!');sound.bad();return;}sound.tick();levelCard(+b.dataset.lv);});
 root.querySelector('.pwm-lv.current')?.scrollIntoView?.({block:'nearest'});
}

function goalChip(g,words,live=false){
 if(g.type==='ice')return `<span class="pwm-goal" data-goal="ice"><img src="${A}tile-ice.webp" alt=""><em>Buz</em><b>${live?g.have+'/':''}${g.need}</b></span>`;
 if(g.type==='lock')return `<span class="pwm-goal" data-goal="lock"><img src="${A}tile-chain.webp" alt=""><em>Zincir</em><b>${live?g.have+'/':''}${g.need}</b></span>`;
 return `<span class="pwm-goal" data-goal="${g.type}"><img src="${A}${CANDIES[g.type]}.webp" alt=""><em>${esc(words[g.type]?.en||'')}</em><b>${live?g.have+'/':''}${g.need}</b></span>`;
}

function levelCard(level){
 const cfg=window.dmPwmCore.levelConfig(level);const words=pickWords(cfg.types);
 const best=Number(status?.stars?.[level]||0);
 const c=modal(`<button type="button" class="pwm-x" data-x aria-label="Kapat">×</button>
  <h2 class="pwm-ribbon-title">Seviye ${level}</h2>
  <div class="pwm-best">${[1,2,3].map(k=>`<img src="${A}icon-star-${k<=best?'full':'empty'}.webp" alt="">`).join('')}</div>
  <h3>Hedef (Görev)</h3><div class="pwm-goals">${cfg.goals.map(g=>goalChip(g,words)).join('')}</div>
  <p class="pwm-muted">${cfg.moves} hamle · Hedef puan ${fmt(cfg.stars[0])}</p>
  <h3>Bu bölümün kelimeleri</h3>
  <ul class="pwm-words">${words.map((w,i)=>`<li><img src="${A}${CANDIES[i]}.webp" alt=""><b>${esc(w.en)}</b><span>${esc(w.tr)}</span></li>`).join('')}</ul>
  <div class="pwm-actions"><button type="button" class="pwm-btn gold big" data-go>Başla <span class="pwm-cost">⚡ 5</span></button></div>
  <p class="pwm-muted small">${isPremium()?(practice?'Sınıf modu: enerji ve ödül işlenmez.':'Premium: sınırsız oyun.'):'Bu bölüm 1 ücretsiz hakkını kullanır (kalan '+remaining()+'/3).'}</p>`,'level');
 c.querySelector('[data-x]').onclick=()=>{hideModal();};
 c.querySelector('[data-go]').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Hazırlanıyor…';try{await start(level,cfg,words);}catch(err){b.disabled=false;b.innerHTML='Başla <span class="pwm-cost">⚡ 5</span>';if(err.code==='hak'){status.remaining=0;comingSoon();return;}toast(err.message);if(err.code==='enerji')sound.bad();}};
}

/* ---------- oyun ---------- */
async function start(level,cfg,words){
 const ticket=epoch,runId=uuid();
 const d=await api('start',{runId,level});
 if(ticket!==epoch||!root)return;
 adopt(d);
 await preload([...CANDIES,'candy-rainbow-bomb','fx-stripe-h','fx-stripe-v','tile-ice','tile-chain','fx-sparkle','fx-burst',...BOOSTERS.map(b=>b[3])]);
 if(ticket!==epoch||!root)return;
 hideModal();
 const st=window.dmPwmCore.create(cfg,(Math.random()*2**31)|0);
 G={level,cfg,words,st,runId,started:Date.now(),busy:false,mode:null,sel:null,over:false,pieces:new Map(),particles:[],floats:[],beams:[],shake:0,idle:performance.now(),hint:null,cell:48,dpr:1,cache:new Map(),boosters:{...(status?.boosters||{})},usedBooster:false,lastScore:0};
 world=cfg.world;setBg(world);
 game();sound.startMusic();
}

function game(){
 view='game';root.dataset.view='game';const g=G;
 $('.pwm-stage').innerHTML=`<section class="pwm-game">
  <div class="pwm-info">
   <div class="pwm-goalcard"><div class="pwm-lvribbon"><img src="${A}deco-potion.webp" alt="">Seviye ${g.level}</div><small class="pwm-goal-label">✦ Hedef (Görev) ✦</small><p class="pwm-goal-text">Aşağıdaki kelimeleri eşleştir ve topla!</p><div class="pwm-goals" data-goals></div></div>
   <div class="pwm-scorecard"><div class="pwm-score"><small>Puan</small><b data-score>0</b></div><div class="pwm-starbar"><div class="pwm-stars">${[0,1,2].map(i=>`<img data-star="${i}" src="${A}icon-star-empty.webp" alt="">`).join('')}</div><div class="pwm-bar"><i data-bar></i></div><small data-target>Hedef Puan: ${fmt(g.cfg.stars[2])}</small></div><div class="pwm-moves"><small>Hamle</small><b data-moves>${g.st.moves}</b></div></div>
  </div>
  <div class="pwm-board"><canvas aria-label="Kelime şekerleri tahtası. Yan yana iki şekeri kaydırarak yer değiştir; aynı kelimeden üç tane yan yana gelince patlar." role="img"></canvas><div class="pwm-combo" aria-live="polite" hidden></div><div class="pwm-mode" hidden></div></div>
  <div class="pwm-rewards"><div class="pwm-strip-title"><img src="${A}icon-gift.webp" alt="">Büyük Eşleşme = Büyük Ödül!</div><div class="pwm-chips"><span><i>★</i>3’lü Eşleşme<b>+100 Puan</b></span><span><i>★★</i>4’lü Eşleşme<b>+250 Puan</b></span><span class="gold"><i>♛</i>5’li Eşleşme<b>+500 Puan + Özel Hediye!</b></span></div></div>
  <div class="pwm-boosters">${BOOSTERS.map(([k,n,s,icon])=>`<button type="button" class="pwm-boost" data-boost="${k}" aria-label="${n}: ${s}"><span class="pwm-boost-ic"><img src="${A}${icon}.webp" alt=""><em data-count="${k}"></em></span><b>${n}</b><small>(${s})</small></button>`).join('')}</div>
  <img class="pwm-deco-book" src="${A}deco-vocabulary-book.webp" alt="" aria-hidden="true"><span class="pwm-deco-label" aria-hidden="true">Vocabulary<small>(Kelime Defteri)</small></span>
  <img class="pwm-deco-chest" src="${A}icon-chest-open.webp" alt="" aria-hidden="true"><img class="pwm-deco-cat" src="${A}char-cat.webp" alt="" aria-hidden="true">
 </section>`;
 $('.pwm-witch').src=A+'char-witch-idle.webp';
 root.querySelectorAll('[data-boost]').forEach(b=>b.onclick=()=>booster(b.dataset.boost));
 paintHud(true);paintBoosters();
 const cv=$('.pwm-board canvas');g.canvas=cv;g.ctx=cv.getContext('2d');
 g.ro=new ResizeObserver(()=>sizeBoard());g.ro.observe($('.pwm-board'));sizeBoard();
 syncPieces(g.st.board,true);
 cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',move);cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',()=>{g.drag=null;});
 g.frame=requestAnimationFrame(loop);
}

function sizeBoard(){
 const g=G;if(!g)return;const box=$('.pwm-board');if(!box)return;
 const w=box.clientWidth,h=box.clientHeight;const size=Math.max(200,Math.floor(Math.min(w,h)));
 g.size=size;g.cell=size/g.st.cols;g.dpr=Math.min(2,window.devicePixelRatio||1);
 g.canvas.style.width=g.canvas.style.height=size+'px';g.canvas.width=g.canvas.height=Math.round(size*g.dpr);
 g.ctx.setTransform(g.dpr,0,0,g.dpr,0,0);g.cache.clear();
}

/* Şeker + kelime görüntüsü bir kez çizilip saklanır. */
function sprite(t,s){
 const g=G,key=t+':'+s+':'+Math.round(g.cell*g.dpr);let c=g.cache.get(key);if(c)return c;
 const px=Math.max(24,Math.round(g.cell*g.dpr));c=document.createElement('canvas');c.width=c.height=px;const x=c.getContext('2d');
 if(s===3){const im=img('candy-rainbow-bomb');if(ready(im))x.drawImage(im,px*.06,px*.06,px*.88,px*.88);else{x.fillStyle='#fff';x.beginPath();x.arc(px/2,px/2,px*.4,0,7);x.fill();}}
 else{
  const im=img(CANDIES[t]);if(ready(im))x.drawImage(im,px*.04,px*.04,px*.92,px*.92);else{x.fillStyle=['#f472b6','#ef4444','#38bdf8','#facc15','#4ade80','#fb923c','#a855f7'][t];x.beginPath();x.arc(px/2,px/2,px*.42,0,7);x.fill();}
  if(s===1||s===2){const st=img(s===1?'fx-stripe-h':'fx-stripe-v');x.globalAlpha=.95;if(ready(st))x.drawImage(st,px*.12,px*.12,px*.76,px*.76);x.globalAlpha=1;}
  const word=G.words[t]?.en||'';let fs=px*.3;x.font=`900 ${fs}px Nunito, "Baloo 2", system-ui, sans-serif`;
  while(x.measureText(word).width>px*.74&&fs>px*.12){fs-=1;x.font=`900 ${fs}px Nunito, "Baloo 2", system-ui, sans-serif`;}
  x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=Math.max(2,px*.07);x.strokeStyle='rgba(255,255,255,.95)';x.strokeText(word,px/2,px*.52);x.fillStyle='#3b1260';x.fillText(word,px/2,px*.52);
 }
 g.cache.set(key,c);return c;
}

/* Parça görüntü konumları (hücre biriminde). */
function syncPieces(board,instant=false){
 const g=G,seen=new Set();
 board.forEach((row,r)=>row.forEach((p,c)=>{if(!p)return;seen.add(p.id);let v=g.pieces.get(p.id);
  if(!v){v={id:p.id,x:c,y:instant?r:-1,sc:1,al:1};g.pieces.set(p.id,v);}
  Object.assign(v,{t:p.t,s:p.s,lock:p.lock,r,c});if(instant){v.x=c;v.y=r;}}));
 for(const id of [...g.pieces.keys()])if(!seen.has(id)&&!g.pieces.get(id).dying)g.pieces.delete(id);
 g.ice=(g.st.ice||[]).map(r=>r.slice());
}
function tween(list,ms,ease=t=>1-Math.pow(1-t,3)){
 if(reduced())ms=Math.min(ms,60);
 const t0=performance.now(),from=list.map(x=>({...x.obj}));
 return new Promise(res=>{const step=()=>{if(!G){res();return;}const k=Math.min(1,(performance.now()-t0)/ms),e=ease(k);list.forEach((x,i)=>{for(const key in x.to)x.obj[key]=from[i][key]+(x.to[key]-from[i][key])*e;});if(k<1)requestAnimationFrame(step);else res();};requestAnimationFrame(step);});
}
const bounce=t=>{const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375;};

async function play(steps){
 const g=G;
 for(const s of steps){
  if(!G||G!==g)return;
  if(s.kind==='swap'||s.kind==='swapback'){
   const list=[];s.board.forEach((row,r)=>row.forEach((p,c)=>{if(!p)return;const v=g.pieces.get(p.id);if(v&&(v.x!==c||v.y!==r))list.push({obj:v,to:{x:c,y:r}});}));
   sound.swap();await tween(list,150);syncPieces(s.board);
   if(s.kind==='swapback'){sound.bad();buzz(20);g.shake=6;}
  }else if(s.kind==='clear'){
   const centre={x:0,y:0};let n=0;
   for(const x of s.cleared){if(x.unlocked)continue;const v=g.pieces.get(x.p.id);if(v){v.dying=true;centre.x+=x.c;centre.y+=x.r;n++;burst(x.c,x.r,x.p.t,x.why!=='match'?6:4);}}
   for(const f of s.fx){if(f.kind==='row')g.beams.push({kind:'row',r:f.r,life:1});else if(f.kind==='col')g.beams.push({kind:'col',c:f.c,life:1});else g.beams.push({kind:'color',r:f.r,c:f.c,t:f.t,life:1,targets:s.cleared.filter(x=>x.why==='color').map(x=>[x.r,x.c])});}
   if(s.fx.some(f=>f.kind==='color')){sound.bomb();buzz([30,30,60]);g.shake=12;}else if(s.fx.length){sound.stripe();buzz(30);g.shake=7;}
   s.matched.forEach((m,i)=>sound.pop(s.combo,i));
   if(n){centre.x/=n;centre.y/=n;g.floats.push({x:centre.x+.5,y:centre.y+.5,text:'+'+fmt(s.gain),life:1,big:s.gain>=500});
    const m=s.matched[0];if(m&&m.t>=0&&g.words[m.t])g.floats.push({x:centre.x+.5,y:centre.y+.05,text:g.words[m.t].en+' = '+g.words[m.t].tr,life:1.3,word:true});}
   const dying=s.cleared.filter(x=>!x.unlocked).map(x=>g.pieces.get(x.p.id)).filter(Boolean);
   await tween(dying.map(v=>({obj:v,to:{sc:1.25}})),70);
   await tween(dying.map(v=>({obj:v,to:{sc:0,al:0}})),150);
   dying.forEach(v=>g.pieces.delete(v.id));
   syncPieces(s.board);
   const born=s.created.map(c=>g.pieces.get(c.id)).filter(Boolean);
   if(born.length){sound.create();born.forEach(v=>{v.sc=.2;burst(v.x,v.y,v.t,8,true);});await tween(born.map(v=>({obj:v,to:{sc:1}})),220,t=>1+2.2*Math.pow(t-1,3)+1.2*Math.pow(t-1,2));}
   G.st.score=s.score;paintHud(false,s.goals);
   if(s.combo>=2)combo(s.combo,s.gain);
  }else if(s.kind==='fall'){
   syncPieces(s.board);
   const list=[];for(const sp of s.spawned){const v=g.pieces.get(sp.id);if(v){v.y=sp.r-sp.drop-.25;v.x=sp.c;}}
   s.board.forEach((row,r)=>row.forEach((p,c)=>{if(!p)return;const v=g.pieces.get(p.id);if(v&&Math.abs(v.y-r)>.01)list.push({obj:v,to:{y:r}});}));
   const far=Math.max(1,...list.map(x=>x.to.y-x.obj.y));
   await tween(list,Math.min(420,170+far*45),bounce);
  }else if(s.kind==='shuffle'){
   showMode('Karıştırılıyor…');sound.stripe();
   const list=[];s.board.forEach((row,r)=>row.forEach((p,c)=>{if(!p)return;const v=g.pieces.get(p.id);if(v)list.push({obj:v,to:{x:c,y:r}});}));
   await tween(list,420);syncPieces(s.board);showMode('');
  }else if(s.kind==='magic'){
   for(const [r,c] of s.cells){burst(c,r,0,5,true);sound.tick();await sleep(70);}
   syncPieces(s.board);g.cache.clear();G.st.score=s.score;paintHud();
  }
 }
 if(G===g){syncPieces(g.st.board);}
}

function burst(x,y,t,n=4,gold=false){
 const g=G;if(!g||reduced())return;if(g.particles.length>140)return;
 const col=gold?'#ffd75e':['#ff7ac8','#ff5a5a','#5cc8ff','#ffd84d','#6ee06e','#ff9b3d','#b06cff'][t]||'#fff';
 for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,sp=.04+Math.random()*.07;g.particles.push({x:x+.5,y:y+.5,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-.03,life:1,col,size:.08+Math.random()*.1,star:i%2===0});}
}
function combo(n,gain){
 const el=$('.pwm-combo');if(!el)return;
 const big=n>=5;el.innerHTML=big?`<div class="pwm-burst"></div><img class="pwm-combo-crown" src="${A}icon-crown.webp" alt=""><strong>SÜPER<br>KOMBO <span>x${n}</span></strong><em>+${fmt(Math.max(500,gain))}<small>BONUS PUAN</small></em>`:`<strong class="small">${COMBO_WORDS[Math.min(4,n)]||'Muhteşem!'} <span>x${n}</span></strong>`;
 el.className='pwm-combo'+(big?' big':'');el.hidden=false;void el.offsetWidth;el.classList.add('show');
 if(big){$('.pwm-witch').src=A+'char-witch-cheer.webp';sound.win();buzz([20,40,20,40,60]);}
 clearTimeout(combo.t);combo.t=setTimeout(()=>{el.hidden=true;el.classList.remove('show');if(G&&!G.over)$('.pwm-witch').src=A+'char-witch-idle.webp';},big?1500:900);
}
function showMode(text){const m=$('.pwm-mode');if(!m)return;m.textContent=text;m.hidden=!text;}

function paintHud(first=false,goals){
 const g=G;if(!g)return;const st=g.st;
 const goalsEl=$('[data-goals]');const list=goals||st.goals;
 if(goalsEl){if(first||!goalsEl.children.length)goalsEl.innerHTML=list.map(x=>goalChip(x,g.words,true)).join('');
  else list.forEach(x=>{const el=goalsEl.querySelector(`[data-goal="${x.type}"] b`);if(el){const t=x.have+'/'+x.need;if(el.textContent!==t){el.textContent=t;el.parentElement.classList.remove('bump');void el.offsetWidth;el.parentElement.classList.add('bump');}el.parentElement.classList.toggle('done',x.have>=x.need);}});}
 const sc=$('[data-score]');if(sc){const from=g.lastScore,to=st.score;g.lastScore=to;if(first||to===from)sc.textContent=fmt(to);else countUp(sc,from,to);}
 const mv=$('[data-moves]');if(mv){mv.textContent=st.moves;mv.parentElement.classList.toggle('low',st.moves<=5);}
 const top=g.cfg.stars[2],bar=$('[data-bar]');if(bar)bar.style.transform=`scaleX(${Math.min(1,st.score/top)})`;
 g.cfg.stars.forEach((v,i)=>{const s=root.querySelector(`[data-star="${i}"]`);if(!s)return;const on=st.score>=v;if(on&&!s.dataset.on){s.dataset.on='1';s.src=A+'icon-star-full.webp';s.classList.add('pop');if(!first)sound.star(i);}});
}
function countUp(el,from,to){const t0=performance.now(),d=420;const f=()=>{const k=Math.min(1,(performance.now()-t0)/d);el.textContent=fmt(Math.round(from+(to-from)*k));if(k<1&&el.isConnected)requestAnimationFrame(f);};requestAnimationFrame(f);}

/* ---------- çizim döngüsü ---------- */
function loop(now){
 const g=G;if(!g||!root)return;g.frame=requestAnimationFrame(loop);
 const {ctx:x,cell:C,size}=g;x.clearRect(0,0,size,size);
 x.save();if(g.shake>0){x.translate((Math.random()-.5)*g.shake,(Math.random()-.5)*g.shake);g.shake*=.86;if(g.shake<.4)g.shake=0;}
 // hücre zemini
 for(let r=0;r<g.st.rows;r++)for(let c=0;c<g.st.cols;c++){x.fillStyle=(r+c)%2?'rgba(76,30,120,.55)':'rgba(96,44,148,.55)';x.fillRect(c*C+1,r*C+1,C-2,C-2);
  if(g.ice?.[r]?.[c]>0){const im=img('tile-ice');if(ready(im)){x.globalAlpha=.8;x.drawImage(im,c*C+1,r*C+1,C-2,C-2);x.globalAlpha=1;}}}
 if(g.sel){x.strokeStyle='#ffe27a';x.lineWidth=3;x.strokeRect(g.sel[1]*C+2,g.sel[0]*C+2,C-4,C-4);}
 if(g.mode==='satir'&&g.hover!=null){x.fillStyle='rgba(255,226,122,.25)';x.fillRect(0,g.hover*C,size,C);}
 // ipucu
 const idle=now-g.idle>6000&&!g.busy&&!g.over;if(idle&&!g.hint)g.hint=window.dmPwmCore.findMove(g.st);
 const wig=idle&&g.hint?Math.sin(now/120)*.06:0;
 // parçalar
 for(const v of g.pieces.values()){
  if(v.y<-1.2)continue;const sp=sprite(v.t,v.s);const isHint=wig&&g.hint&&g.hint.some(([r,c])=>v.r===r&&v.c===c&&!v.dying);
  const sc=v.sc*(isHint?1+wig:1)*(v.s===3?1+Math.sin(now/180)*.04:1);const sz=C*sc;
  x.globalAlpha=Math.max(0,Math.min(1,v.al));x.drawImage(sp,v.x*C+(C-sz)/2,v.y*C+(C-sz)/2,sz,sz);
  if(v.lock){const ch=img('tile-chain');if(ready(ch))x.drawImage(ch,0,64,256,128,v.x*C+C*.02,v.y*C+C*.6,C*.96,C*.42);}
  x.globalAlpha=1;
 }
 // ışınlar
 for(const b of g.beams){x.globalAlpha=Math.max(0,b.life);const grad=b.kind==='row'?x.createLinearGradient(0,0,size,0):x.createLinearGradient(0,0,0,size);grad.addColorStop(0,'rgba(255,255,255,0)');grad.addColorStop(.5,'rgba(255,245,190,.95)');grad.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=grad;
  if(b.kind==='row')x.fillRect(0,b.r*C+C*.3,size,C*.4);else if(b.kind==='col')x.fillRect(b.c*C+C*.3,0,C*.4,size);
  else{x.strokeStyle='rgba(255,240,170,.9)';x.lineWidth=3;for(const [r,c] of b.targets||[]){x.beginPath();x.moveTo(b.c*C+C/2,b.r*C+C/2);x.lineTo(c*C+C/2+(Math.random()-.5)*6,r*C+C/2+(Math.random()-.5)*6);x.stroke();}}
  b.life-=.05;}
 g.beams=g.beams.filter(b=>b.life>0);x.globalAlpha=1;
 // parçacıklar
 const spark=img('fx-sparkle');
 for(const p of g.particles){p.x+=p.vx;p.y+=p.vy;p.vy+=.004;p.life-=.03;x.globalAlpha=Math.max(0,p.life);
  if(p.star&&ready(spark)){const s=p.size*C*2.2;x.drawImage(spark,p.x*C-s/2,p.y*C-s/2,s,s);}else{x.fillStyle=p.col;x.beginPath();x.arc(p.x*C,p.y*C,p.size*C*.6,0,7);x.fill();}}
 g.particles=g.particles.filter(p=>p.life>0);x.globalAlpha=1;
 // yüzen yazılar
 for(const f of g.floats){f.y-=.012;f.life-=.017;x.globalAlpha=Math.max(0,Math.min(1,f.life*1.6));const fs=f.word?Math.max(13,C*.32):f.big?C*.5:C*.38;
  x.font=`900 ${fs}px Nunito, system-ui, sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=f.word?5:4;
  const tx=Math.max(x.measureText(f.text).width/2+6,Math.min(size-x.measureText(f.text).width/2-6,f.x*C));
  if(f.word){const w=x.measureText(f.text).width+20;x.fillStyle='rgba(60,18,100,.88)';roundRect(x,tx-w/2,f.y*C-fs*.75,w,fs*1.5,fs*.6);x.fill();x.fillStyle='#fff3b0';x.fillText(f.text,tx,f.y*C);}
  else{x.strokeStyle='#5a1d8c';x.strokeText(f.text,tx,f.y*C);x.fillStyle='#ffe066';x.fillText(f.text,tx,f.y*C);}}
 g.floats=g.floats.filter(f=>f.life>0);x.globalAlpha=1;
 x.restore();
}
function roundRect(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}

/* ---------- dokunma ---------- */
function cellAt(e){const g=G,r=g.canvas.getBoundingClientRect();const c=Math.floor((e.clientX-r.left)/g.cell),row=Math.floor((e.clientY-r.top)/g.cell);return row>=0&&c>=0&&row<g.st.rows&&c<g.st.cols?[row,c]:null;}
function down(e){const g=G;if(!g||g.busy||g.over)return;sound.ac();g.idle=performance.now();g.hint=null;const at=cellAt(e);if(!at)return;
 try{g.canvas.setPointerCapture(e.pointerId);}catch{}
 if(g.mode==='satir'){useRow(at[0]);return;}
 if(g.mode==='renk'){useColor(at);return;}
 g.drag={at,x:e.clientX,y:e.clientY,moved:false};}
function move(e){const g=G;if(!g)return;if(g.mode==='satir'){const at=cellAt(e);g.hover=at?at[0]:null;}
 const d=g.drag;if(!d||d.moved||g.busy)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.max(Math.abs(dx),Math.abs(dy))<g.cell*.32)return;
 d.moved=true;const to=Math.abs(dx)>Math.abs(dy)?[d.at[0],d.at[1]+(dx>0?1:-1)]:[d.at[0]+(dy>0?1:-1),d.at[1]];g.sel=null;swap(d.at,to);}
function up(){const g=G;if(!g)return;const d=g.drag;g.drag=null;if(!d||d.moved||g.busy)return;
 if(g.sel&&window.dmPwmCore.adjacent(g.sel,d.at)){const a=g.sel;g.sel=null;swap(a,d.at);}else{g.sel=g.sel&&g.sel[0]===d.at[0]&&g.sel[1]===d.at[1]?null:d.at;sound.tick();}}

async function swap(a,b){
 const g=G;if(!g||g.busy||g.over)return;if(b[0]<0||b[1]<0||b[0]>=g.st.rows||b[1]>=g.st.cols)return;
 const core=window.dmPwmCore;
 if(g.mode==='degistir'){if(!core.adjacent(a,b))return;if(!await spendBooster('degistir'))return;g.busy=true;g.mode=null;showMode('');const r=core.boosterSwap(g.st,a,b);await play(r.steps);g.busy=false;return settle();}
 const p=g.st.board[a[0]][a[1]],q=g.st.board[b[0]][b[1]];if(p?.lock||q?.lock){toast('Zincirli şeker yer değiştiremez. Yanında eşleşme yaparak zinciri kır!');sound.bad();return;}
 g.busy=true;const r=core.trySwap(g.st,a,b);await play(r.steps);g.busy=false;
 if(r.ok)settle();
}
async function settle(){
 const g=G;if(!g||g.over)return;paintHud();g.idle=performance.now();g.hint=null;
 const core=window.dmPwmCore;
 if(core.goalsDone(g.st)){g.over=true;return win();}
 if(g.st.moves<=0){g.over=true;return lose();}
 if(g.st.moves===5)toast('Son 5 hamle!');
}

/* ---------- güçlendiriciler ---------- */
function paintBoosters(){if(!G)return;for(const [k] of BOOSTERS){const el=root.querySelector(`[data-count="${k}"]`);if(!el)continue;const n=practice?'∞':Number(G.boosters[k]||0);el.textContent=n===0?'+':n;el.classList.toggle('plus',n===0);root.querySelector(`[data-boost="${k}"]`)?.setAttribute('aria-pressed',String(G.mode===k));}}
async function spendBooster(k){
 const g=G;if(practice)return true;
 if(Number(g.boosters[k]||0)<1){shop(k);return false;}
 try{const d=await api('use',{kind:k,runId:g.runId});g.boosters={...d.boosters};status.boosters=d.boosters;paintBoosters();g.usedBooster=true;return true;}
 catch(e){toast(e.message);return false;}
}
async function booster(k){
 const g=G;if(!g||g.busy||g.over)return;sound.ac();
 if(g.mode===k){g.mode=null;showMode('');paintBoosters();return;}
 if(!practice&&Number(g.boosters[k]||0)<1){shop(k);return;}
 const core=window.dmPwmCore;
 if(k==='karistir'){if(!await spendBooster(k))return;g.busy=true;await play(core.boosterShuffle(g.st));g.busy=false;settle();return;}
 g.mode=k;g.sel=null;paintBoosters();
 showMode(k==='satir'?'Patlatmak istediğin satıra dokun':k==='renk'?'Bir şekere dokun: o kelimenin hepsi patlar':'Yer değiştirecek iki komşu şekeri kaydır');
}
async function useRow(r){const g=G;if(!await spendBooster('satir'))return;g.mode=null;showMode('');paintBoosters();g.busy=true;g.beams.push({kind:'row',r,life:1});await play(window.dmPwmCore.boosterRow(g.st,r));g.busy=false;settle();}
async function useColor(at){const g=G;if(!await spendBooster('renk'))return;g.mode=null;showMode('');paintBoosters();g.busy=true;await play(window.dmPwmCore.boosterColor(g.st,at[0],at[1]));g.busy=false;settle();}

function shop(focus){
 const b=status?.boosters||{};const gold=typeof yo!=='undefined'?Number(yo?.altin||0):Number(status?.gold||0);
 const c=modal(`<button type="button" class="pwm-x" data-x aria-label="Kapat">×</button><h2 class="pwm-ribbon-title">Güçlendiriciler</h2>
  <p class="pwm-muted">Altınla al, zor bölümlerde kullan. Altının: <b data-gold>${fmt(gold)}</b></p>
  <div class="pwm-shop">${BOOSTERS.map(([k,n,s,icon,price])=>`<div class="pwm-shop-item${focus===k?' focus':''}"><img src="${A}${icon}.webp" alt=""><div><b>${n}</b><small>${s}</small><em>Sende: <span data-have="${k}">${practice?'∞':Number(b[k]||0)}</span></em></div><button type="button" class="pwm-btn gold" data-buy="${k}" ${practice?'disabled':''}>🪙 ${price}</button></div>`).join('')}</div>`,'shopm');
 c.querySelector('[data-x]').onclick=()=>hideModal();
 c.querySelectorAll('[data-buy]').forEach(btn=>btn.onclick=async()=>{btn.disabled=true;try{const d=await api('buy',{kind:btn.dataset.buy});status.boosters=d.boosters;if(G)G.boosters={...d.boosters};if(d.yo){pendingYo=d.yo;window.dmApplyRewardState?.(d.yo,owner);}c.querySelector(`[data-have="${btn.dataset.buy}"]`).textContent=d.boosters[btn.dataset.buy];c.querySelector('[data-gold]').textContent=fmt(d.yo?.altin??d.gold);paintBoosters();sound.create();}catch(e){toast(e.message);sound.bad();}finally{btn.disabled=false;}});
}

/* ---------- bölüm sonu ---------- */
async function win(){
 const g=G;$('.pwm-witch').src=A+'char-witch-cheer.webp';
 const cb=$('.pwm-combo');if(cb){cb.innerHTML=`<div class="pwm-burst"></div><strong>BÜYÜ<br>YAĞMURU!</strong><em>Kalan hamleler puana dönüşüyor</em>`;cb.className='pwm-combo big';cb.hidden=false;void cb.offsetWidth;cb.classList.add('show');}
 sound.win();await sleep(1100);if(cb)cb.hidden=true;
 if(G!==g)return;const steps=window.dmPwmCore.bonus(g.st);g.cache.clear();await play(steps);paintHud();await sleep(300);
 finish(true);
}
async function lose(){sound.fail();$('.pwm-witch').src=A+'char-witch-idle.webp';await sleep(500);finish(false);}
async function finish(won){
 const g=G;if(!g)return;sound.stopMusic();
 const body={runId:g.runId,score:g.st.score,won,moves:g.st.movesUsed,seconds:Math.round((Date.now()-g.started)/1000)};
 const c=modal('<h2 class="pwm-ribbon-title">'+(won?'Tebrikler!':'Hamlen bitti')+'</h2><p class="pwm-muted">Sonucun kaydediliyor…</p>','result');
 let d=null;
 for(let i=0;i<3&&!d;i++){try{d=await api('finish',body);}catch(e){if(i===2){c.innerHTML='<h2 class="pwm-ribbon-title">Sonucun bekliyor</h2><p>'+esc(e.message)+'</p><p class="pwm-muted small">Aynı sonucu yeniden kaydetmek ikinci kez ödül vermez.</p><div class="pwm-actions"><button type="button" class="pwm-btn gold" data-r>Tekrar dene</button><button type="button" class="pwm-btn ghost" data-h>Haritaya dön</button></div>';c.querySelector('[data-r]').onclick=()=>finish(won);c.querySelector('[data-h]').onclick=()=>home();return;}await sleep(900);}}
 if(G!==g)return;adopt(d);if(d.yo)pendingYo=d.yo;earned.xp+=Number(d.xp||0);earned.gold+=Number(d.gold||0);
 const stars=won?Math.max(1,Number(d.stars||window.dmPwmCore.stars(g.st)||1)):0;
 const next=won&&g.level<100,outOfPlays=!isPremium()&&remaining()<=0;
 c.innerHTML=`<img class="pwm-result-char" src="${A}${won?'char-witch-cheer':'char-witch-idle'}.webp" alt="">
  <h2 class="pwm-ribbon-title">${won?'Seviye '+g.level+' tamam!':'Hamlen bitti'}</h2>
  ${won?`<div class="pwm-result-stars">${[0,1,2].map(i=>`<img data-rs="${i}" src="${A}icon-star-empty.webp" alt="">`).join('')}</div>`:`<p>Hedeflere çok yaklaştın! Güçlendiricilerle tekrar dene.</p>`}
  <p class="pwm-result-score">Puan <b>${fmt(g.st.score)}</b></p>
  <div class="pwm-reward"><span><i class="xp">★</i><b>+${fmt(d.xp||0)}</b> XP</span><span><i class="coin"></i><b>+${fmt(d.gold||0)}</b> altın</span></div>
  ${practice?'<p class="pwm-muted small">Sınıf modu: ödül işlenmez.</p>':''}
  <p class="pwm-muted small">Bu bölümde öğrendiğin kelimeler: ${g.words.map(w=>'<b>'+esc(w.en)+'</b> ('+esc(w.tr)+')').join(', ')}</p>
  <div class="pwm-actions">${outOfPlays?'<button type="button" class="pwm-btn gold" data-soon>Premium yakında</button>':next?`<button type="button" class="pwm-btn gold big" data-next>Sonraki Seviye ›</button>`:''}${!outOfPlays?`<button type="button" class="pwm-btn ${next?'ghost':'gold'}" data-again>${won?'Tekrar oyna':'Tekrar dene'} <span class="pwm-cost">⚡ 5</span></button>`:''}<button type="button" class="pwm-btn ghost" data-map>Haritaya dön</button></div>`;
 c.querySelector('[data-next]')?.addEventListener('click',()=>{G=null;levelCard(g.level+1);});
 c.querySelector('[data-again]')?.addEventListener('click',()=>{G=null;levelCard(g.level);});
 c.querySelector('[data-map]')?.addEventListener('click',()=>{stopGame();home();});
 c.querySelector('[data-soon]')?.addEventListener('click',()=>{stopGame();comingSoon();});
 if(won){for(let i=0;i<stars;i++){await sleep(380);const s=c.querySelector(`[data-rs="${i}"]`);if(!s)break;s.src=A+'icon-star-full.webp';s.classList.add('pop');sound.star(i);buzz(25);}}
}
function stopGame(){if(!G)return;cancelAnimationFrame(G.frame);G.ro?.disconnect();G=null;sound.stopMusic();}

/* ---------- kapanış ---------- */
function back(fromPop=false){
 if(G&&!G.over&&view==='game'){
  const c=modal('<h2 class="pwm-ribbon-title">Oyun duraklatıldı</h2><p>Çıkarsan bu bölüm biter ve kullandığın hak/enerji geri gelmez.</p><div class="pwm-actions"><button type="button" class="pwm-btn gold" data-c>▶ Devam et</button><button type="button" class="pwm-btn ghost" data-q>Bölümden çık</button></div>','pause');
  if(fromPop){try{history.pushState({...history.state,dmPwm:navKey},'');}catch{}}
  c.querySelector('[data-c]').onclick=()=>hideModal();c.querySelector('[data-q]').onclick=()=>{const g=G;g.over=true;hideModal();finish(false);};return;
 }
 if(view==='game'&&G?.over){stopGame();home();if(fromPop){try{history.pushState({...history.state,dmPwm:navKey},'');}catch{}}return;}
 close(fromPop);
}
function close(fromPop=false){
 if(!root)return;const old=root;epoch++;stopGame();sound.close();clearInterval(watch);
 window.dmViewHistory?.leave?.(old);old.remove();root=null;document.body.classList.remove('pwm-active');window.dmPapiNotices?.resume?.();
 if(pendingYo){window.dmApplyRewardState?.(pendingYo,owner);pendingYo=null;}
 window.dmGamesUI?.refresh?.();origin?.focus?.({preventScroll:true});
 if(!fromPop&&history.state?.dmPwm===navKey){try{history.back();}catch{}}navKey='';view='home';
}

window.dmPwm={open,close,api,hint:()=>G?window.dmPwmCore.findMove(G.st):null,state:()=>G?.st||null};
window.premiumKelimeEslestirmeAc=open;
})();
