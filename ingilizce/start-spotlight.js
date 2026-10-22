/* Başla butonu vurgusu: başlangıç ekranı açıkken butonda animasyon + animasyonla aynı ritimde döngü müzik.
   Parkur başlangıçları → "Macera Halesi": buton nefes alır, içinden ışık geçer, dışına renkli hale dalgaları yayılır.
     Müzik 120 BPM: her ölçü (2 sn) bir nefes; ölçü başında hale + derin vuruş, nefesle yükselen arp.
   Oyun başlangıçları → "Yıldız Kıvılcımı": yıldızlar parlar, buton zıplar.
     Müzik 150 BPM: her ölçü (1,6 sn) bir zıplama; zıplamada "boing", her yıldızda bir çan sesi.
   Ekran kapanınca, buton gizlenince/devre dışı kalınca, Başla'ya basılınca ya da uygulama arka plana geçince durur.
   Müzik kodla üretilip <audio> ile çalınır (iPhone sessiz modunda Web Audio susar; <audio> çalar). Ses ayarına uyar. */
(()=>{'use strict';
const PARKUR=['.sp-adventure-entry #bzOyna','.sp-learning-entry .sp-start'];
const GAME=[
 '.rr-main[data-start]',            // Kelime Rallisi
 '.mt-start',                       // Meteor
 'form .ww-main[type="submit"]',    // Kelime Çarkı
 '.hb-primary[data-start]',         // Harf Bahçesi ve benzerleri
 '.mv-primary[data-start]',         // Mola Vakti
 'button[onclick*="OyunuBaslat()"]',// Klasik oyunlar
 'button[onclick="kelimeYarismasiBaslat()"]'
];
const SEL=PARKUR.concat(GAME).join(',');
const isParkur=b=>PARKUR.some(s=>b.matches(s));
const muted=()=>{try{return window.dmSoundEnabled===false||window.dmSesAcik===false||localStorage.getItem('dm_sound_muted')==='1';}catch{return false;}};

/* ---------- Görünüm ---------- */
const css=`
.dmss-halo{position:relative!important;animation:dmssBreath 2s ease-in-out infinite!important}
.dmss-halo::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:1;
 background:linear-gradient(110deg,transparent 38%,rgba(255,255,255,.5) 50%,transparent 62%) no-repeat;background-size:300% 100%;
 animation:dmssSweep 2s ease-in-out infinite}
@keyframes dmssBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes dmssSweep{0%,15%{background-position:120% 0}60%,100%{background-position:-20% 0}}
.dmss-hop{animation:dmssHop 1.6s ease-in-out infinite!important}
@keyframes dmssHop{0%,70%,100%{transform:translateY(0)}78%{transform:translateY(-7px)}86%{transform:translateY(0)}92%{transform:translateY(-2px)}}
.dmss-layer{position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483000}
.dmss-ring{position:absolute;box-sizing:border-box;border:3px solid #ffc861;opacity:0;animation:dmssRing 2s ease-out infinite}
.dmss-ring:nth-child(2){border-color:#b18cff;animation-delay:1s}
@keyframes dmssRing{0%{transform:scale(1);opacity:.95}80%,100%{transform:scale(1.13,1.5);opacity:0}}
.dmss-spark{position:absolute;color:#f5b93a;animation:dmssTw 1.6s ease-in-out infinite;filter:drop-shadow(0 0 3px #ffe08a)}
.dmss-spark svg{display:block;width:100%;height:100%;fill:currentColor}
@keyframes dmssTw{0%,100%{transform:scale(0) rotate(0);opacity:0}45%{transform:scale(1) rotate(45deg);opacity:1}70%{opacity:.8}}
@media (prefers-reduced-motion:reduce){.dmss-halo,.dmss-hop,.dmss-halo::before,.dmss-ring,.dmss-spark{animation:none!important}.dmss-ring{opacity:.6}}`;
const style=document.createElement('style');style.id='dmStartSpotlightCss';style.textContent=css;document.head.append(style);

// Hale ve yıldızlar ekrana sabit, tıklanamaz bir katmanda çizilir; butonun metnine ve stillerine dokunulmaz.
const STAR='<svg viewBox="0 0 24 24"><path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/></svg>';
const SPARKS=[[.04,-.25,14,.2],[.9,-.35,18,.7],[1.02,.85,14,1.1],[.3,1.25,11,.45],[.62,-.4,12,.95]];
let layer=null,layerBtn=null,layerFrame=0;
function layerOn(btn,parkur){
 layerBtn=btn;layer?.remove();layer=document.createElement('div');layer.className='dmss-layer';layer.setAttribute('aria-hidden','true');
 layer.innerHTML=parkur?'<i class="dmss-ring"></i><i class="dmss-ring"></i>':SPARKS.map(([,,s,d])=>'<i class="dmss-spark" style="width:'+s+'px;height:'+s+'px;margin:-'+s/2+'px 0 0 -'+s/2+'px;animation-delay:'+d+'s">'+STAR+'</i>').join('');
 document.body.append(layer);
 const cs=getComputedStyle(btn),radius=parseFloat(cs.borderTopLeftRadius)||16,drop=Math.max(0,Number((cs.boxShadow.match(/(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px/)||[])[2])||0);
 const place=()=>{if(!layerBtn||!layer)return;const r=layerBtn.getBoundingClientRect();
  if(parkur)[...layer.children].forEach(el=>{el.style.left=r.left+'px';el.style.top=r.top+'px';el.style.width=r.width+'px';el.style.height=(r.height+drop)+'px';el.style.borderRadius=radius+'px';});
  else [...layer.children].forEach((el,i)=>{el.style.left=(r.left+r.width*SPARKS[i][0])+'px';el.style.top=(r.top+r.height*SPARKS[i][1])+'px';});
  layerFrame=requestAnimationFrame(place);};
 cancelAnimationFrame(layerFrame);place();
}
function layerOff(){layerBtn=null;cancelAnimationFrame(layerFrame);layer?.remove();layer=null;}
// Müzik başladığı anda animasyonları baştan başlat: vuruşlar hareketle üst üste gelsin.
function syncAnimations(){try{document.getAnimations().forEach(a=>{if(String(a.animationName||'').startsWith('dmss'))a.currentTime=0;});}catch{}}

/* ---------- Müzik: kodla üretilip WAV olarak <audio> ile döngüde çalınır ---------- */
const RATE=22050,hz=m=>440*Math.pow(2,(m-69)/12);
function note(c,t,freq,len,vol,type='sine',attack=.005){const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0005,t+len);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+len+.05);}
function bell(c,t,m,len,vol){note(c,t,hz(m),len,vol);note(c,t,hz(m)*2.01,len*.5,vol*.25);}
function boom(c,t,vol){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(95,t);o.frequency.exponentialRampToValueAtTime(42,t+.35);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+.55);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.6);}
function hat(c,t,vol){const n=Math.floor(RATE*.05),b=c.createBuffer(1,n,RATE),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;f.type='highpass';f.frequency.value=6000;g.gain.value=vol;s.connect(f);f.connect(g);g.connect(c.destination);s.start(t);}
function boing(c,t){const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(260,t);o.frequency.exponentialRampToValueAtTime(820,t+.11);o.frequency.exponentialRampToValueAtTime(560,t+.24);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.16,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.32);}
const SCORES={
 // 120 BPM, ölçü = 2 sn = bir nefes. Do – La minör – Fa – Sol.
 parkur:{bars:4,bar:2,draw(c,b,t){const ch=[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,59]][b];
  boom(c,t,.55);                                                       // hale dalgası çıkarken derin vuruş
  ch.forEach(m=>{const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=hz(m);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.045,t+1);g.gain.linearRampToValueAtTime(.008,t+1.95);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+2);}); // nefesle şişen akor
  [24,24,24,24,36,36,36,36].forEach((up,i)=>bell(c,t+i*.125,ch[i%4]+up,.5,.05)); // nefes alırken yükselen arp
  bell(c,t+1.05,ch[3]+36,.9,.05);                                      // ışık butonun ortasından geçerken parıltı
  boom(c,t+1,.18);hat(c,t+.5,.05);hat(c,t+1.5,.05);}},
 // 150 BPM, ölçü = 1,6 sn = bir zıplama. Do – Fa – Sol – Do.
 game:{bars:4,bar:1.6,draw(c,b,t){const root=[48,53,55,48][b],penta=[84,86,88,91,93,96];
  [0,.4,.8,1.2].forEach((x,i)=>note(c,t+x,hz(root+(i%2?7:0)),.18,.22,'triangle'));       // zıplayan bas
  [.2,.6,1,1.4].forEach(x=>{[root+12,root+16,root+19].forEach(m=>note(c,t+x,hz(m+12),.12,.035,'square'));hat(c,t+x,.04);}); // ara vuruş akorları
  [.07,.22,.92,1.17,1.42].forEach((x,i)=>bell(c,t+x,penta[(i+b*2)%penta.length],.35,.06)); // her yıldız parlamasında çan
  boing(c,t+1.248);}}                                                  // buton zıplarken
};
const cache={};
async function render(kind){
 if(cache[kind])return cache[kind];
 const S=SCORES[kind],O=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!O)return null;
 const len=S.bars*S.bar,c=new O(1,Math.ceil(len*RATE),RATE);
 for(let b=0;b<S.bars;b++)S.draw(c,b,b*S.bar);
 const buf=await new Promise((ok,no)=>{c.oncomplete=e=>ok(e.renderedBuffer);const p=c.startRendering();if(p&&p.then)p.then(ok,no);});
 return cache[kind]=cache[kind]||URL.createObjectURL(wav(buf.getChannelData(0)));
}
function wav(data){let peak=0;for(const v of data)peak=Math.max(peak,Math.abs(v));const k=peak?.8/peak:1,n=data.length,out=new DataView(new ArrayBuffer(44+n*2));
 const w=(o,s)=>[...s].forEach((ch,i)=>out.setUint8(o+i,ch.charCodeAt(0)));
 w(0,'RIFF');out.setUint32(4,36+n*2,true);w(8,'WAVEfmt ');out.setUint32(16,16,true);out.setUint16(20,1,true);out.setUint16(22,1,true);out.setUint32(24,RATE,true);out.setUint32(28,RATE*2,true);out.setUint16(32,2,true);out.setUint16(34,16,true);w(36,'data');out.setUint32(40,n*2,true);
 for(let i=0;i<n;i++)out.setInt16(44+i*2,Math.max(-1,Math.min(1,data[i]*k))*32767,true);
 return new Blob([out],{type:'audio/wav'});}
let SILENT='';
const player=new Audio();player.loop=true;player.preload='auto';player.setAttribute('playsinline','');player.volume=.7;
let unlocked=false,want=null;
// iPhone, sesi yalnızca bir dokunuşla açar. İlk dokunuşta oynatıcıyı sessizce çalıp aç; sonra kod çalabilir.
function unlock(){if(muted())return;
 if(want&&player.paused&&player.dataset.kind===want){player.play().then(syncAnimations).catch(()=>{});return;} // önceki deneme engellendiyse bu dokunuşla çal
 if(unlocked)return;unlocked=true;if(!want){SILENT=SILENT||URL.createObjectURL(wav(new Float32Array(2205)));player.src=SILENT;delete player.dataset.kind;player.play().then(()=>{if(!want)player.pause();}).catch(()=>{unlocked=false;});}render('parkur');render('game');}
['touchend','click','keydown'].forEach(ev=>document.addEventListener(ev,unlock,{capture:true,passive:true}));
async function musicOn(kind){
 want=kind;if(muted())return;
 const url=await render(kind);if(want!==kind||!url)return;
 if(player.dataset.kind!==kind){player.src=url;player.dataset.kind=kind;}
 try{player.currentTime=0;}catch{}
 player.play().then(()=>{if(want===kind)syncAnimations();else player.pause();}).catch(()=>{});
}
function musicOff(){want=null;try{player.pause();player.currentTime=0;}catch{}}

/* ---------- Hangi buton aktif? ---------- */
let active=null;const pressed=new Set();
const shown=b=>!b.disabled&&!b.closest('[hidden]')&&(b.checkVisibility?b.checkVisibility({opacityProperty:true,visibilityProperty:true}):b.getClientRects().length>0);
function release(){if(!active)return;pressed.add(active);active.classList.remove('dmss-halo','dmss-hop');active.removeEventListener('pointerdown',release);layerOff();musicOff();active=null;}
function scan(){
 frame=0;
 if(document.hidden){release();return;}
 pressed.forEach(b=>{if(!b.isConnected||!shown(b))pressed.delete(b);});
 const list=[...document.querySelectorAll(SEL)].filter(b=>!pressed.has(b)&&shown(b));
 const pick=list.find(isParkur)||list[list.length-1]||null;
 if(pick===active){if(active&&!want&&!muted())musicOn(isParkur(active)?'parkur':'game');return;}
 release();if(!pick)return;
 active=pick;const parkur=isParkur(pick);
 pick.classList.add(parkur?'dmss-halo':'dmss-hop');layerOn(pick,parkur);
 pick.addEventListener('pointerdown',release,{once:true});
 musicOn(parkur?'parkur':'game');
}
let frame=0;const schedule=()=>{if(!frame)frame=setTimeout(scan,120);};
new MutationObserver(list=>{if(list.some(m=>!(layer&&layer.contains(m.target))))schedule();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled','class','style','open']});
document.addEventListener('visibilitychange',schedule);
document.addEventListener('click',e=>{if(active&&e.target.closest?.(SEL)===active)release();},true);
window.dmStartSpotlight={stop:release,refresh:schedule,playing:()=>!player.paused&&!!player.dataset.kind&&player.dataset.kind};
schedule();
})();
