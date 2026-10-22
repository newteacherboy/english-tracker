/* Başla butonu vurgusu: başlangıç ekranı açıkken butonda animasyon + kısa döngü müzik.
   Parkur başlangıçları → "Macera Halesi" (C), oyun başlangıçları → "Yıldız Kıvılcımı" (B).
   Ekran kapanınca, buton gizlenince/devre dışı kalınca ya da butona basılınca ikisi de durur.
   Müzik kodla üretilir; ses dosyası yok. Uygulamanın ses kapatma ayarına uyar. */
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
@property --dmss-ang{syntax:"<angle>";inherits:false;initial-value:0deg}
.dmss-halo{position:relative!important;animation:dmssBreath 2s ease-in-out infinite!important}
.dmss-halo::after{content:"";position:absolute;inset:-6px;border-radius:inherit;padding:4px;pointer-events:none;z-index:2;
 background:conic-gradient(from var(--dmss-ang),#ffd36b,#ff7aa8,#a98bff,#6be3ff,#ffd36b);
 -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
 mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);animation:dmssSpin 2.2s linear infinite}
@keyframes dmssSpin{to{--dmss-ang:360deg}}
@keyframes dmssBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
.dmss-hop{animation:dmssHop 1.6s ease-in-out infinite!important}
@keyframes dmssHop{0%,70%,100%{transform:translateY(0)}78%{transform:translateY(-6px)}86%{transform:translateY(0)}92%{transform:translateY(-2px)}}
.dmss-sparks{position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483000}
.dmss-sparks i{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;color:#f5b93a;animation:dmssTw 1.6s ease-in-out infinite;filter:drop-shadow(0 0 3px #ffe08a)}
.dmss-sparks i svg{display:block;width:100%;height:100%;fill:currentColor}
@keyframes dmssTw{0%,100%{transform:scale(0) rotate(0);opacity:0}45%{transform:scale(1) rotate(45deg);opacity:1}70%{opacity:.8}}
@media (prefers-reduced-motion:reduce){.dmss-halo,.dmss-hop,.dmss-halo::after,.dmss-sparks i{animation-duration:6s!important}}`;
const style=document.createElement('style');style.id='dmStartSpotlightCss';style.textContent=css;document.head.append(style);

// Kıvılcımlar butonun içine değil, ekrana sabit bir katmana konur (buton metni değişse de bozulmaz).
const SPARKS=[[.04,-.25,14,.2],[.9,-.35,18,.7],[1.02,.85,14,1.1],[.3,1.25,11,.45],[.62,-.4,12,.95]];
let sparkLayer=null,sparkBtn=null,sparkFrame=0;
function sparksOn(btn){
 sparkBtn=btn;
 if(!sparkLayer){sparkLayer=document.createElement('div');sparkLayer.className='dmss-sparks';sparkLayer.setAttribute('aria-hidden','true');
  sparkLayer.innerHTML=SPARKS.map(([,, s,d])=>'<i style="width:'+s+'px;height:'+s+'px;margin:-'+s/2+'px 0 0 -'+s/2+'px;animation-delay:'+d+'s"><svg viewBox="0 0 24 24"><path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/></svg></i>').join('');}
 document.body.append(sparkLayer);
 const place=()=>{if(!sparkBtn)return;const r=sparkBtn.getBoundingClientRect();[...sparkLayer.children].forEach((el,i)=>{el.style.left=(r.left+r.width*SPARKS[i][0])+'px';el.style.top=(r.top+r.height*SPARKS[i][1])+'px';});sparkFrame=requestAnimationFrame(place);};
 cancelAnimationFrame(sparkFrame);place();
}
function sparksOff(){sparkBtn=null;cancelAnimationFrame(sparkFrame);sparkLayer?.remove();}

/* ---------- Müzik ---------- */
const TRACKS={
 game:{bpm:138,wave:'square',vol:.09,cut:4000,lead:[67,72,76,79,null,76,79,84,74,77,81,84,83,null,79,null],bass:[48,null,55,null,48,null,55,null,50,null,57,null,55,null,59,null],kick:[0,4,8,12],tom:[]},
 parkur:{bpm:112,wave:'sawtooth',vol:.16,cut:1800,lead:[62,null,69,67,null,65,67,null,62,null,69,72,null,71,69,null],bass:[38,null,null,38,null,null,38,null,41,null,null,41,null,null,43,null],kick:[0,3,6,8,11,14],tom:[7,15]}
};
let ctx=null,master=null,timer=0,track=null,step=0,next=0;
const hz=m=>440*Math.pow(2,(m-69)/12);
function audio(){if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ctx=new A();}return ctx;}
// iOS: ses ancak bir dokunuşla açılır. Başlangıç ekranı zaten bir dokunuşla açıldığı için o anda kilidi aç.
['pointerdown','touchend','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(muted())return;const c=audio();if(c&&c.state!=='running')c.resume?.().catch(()=>{});},{capture:true,passive:true}));
function tone(t,m,len,wave,vol,cut){const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type=wave;o.frequency.value=hz(m);f.type='lowpass';f.frequency.value=cut;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.0008,t+len);o.connect(f);f.connect(g);g.connect(master);o.start(t);o.stop(t+len+.05);o.onended=()=>{o.disconnect();f.disconnect();g.disconnect();};}
function drum(t,tom){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(tom?180:120,t);o.frequency.exponentialRampToValueAtTime(tom?90:40,t+.15);g.gain.setValueAtTime(tom?.5:.8,t);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(g);g.connect(master);o.start(t);o.stop(t+.22);o.onended=()=>{o.disconnect();g.disconnect();};}
function tick(){if(!track||!master)return;const T=TRACKS[track],d=60/T.bpm/2;
 while(next<ctx.currentTime+.15){const i=step%16;
  if(T.lead[i]!=null)tone(next,T.lead[i],d*.9,T.wave,T.vol,T.cut);
  if(T.bass[i]!=null)tone(next,T.bass[i],d*1.6,'triangle',.18,900);
  if(T.kick.includes(i))drum(next,false);if(T.tom.includes(i))drum(next,true);
  next+=d;step++;}}
function musicOn(kind){
 if(track===kind)return;musicOff();if(muted())return;
 const c=audio();if(!c)return;c.resume?.().catch(()=>{});
 master=c.createGain();master.gain.setValueAtTime(0,c.currentTime);master.gain.linearRampToValueAtTime(.35,c.currentTime+.4);master.connect(c.destination);
 track=kind;step=0;next=c.currentTime+.06;tick();timer=setInterval(tick,60);
}
function musicOff(){clearInterval(timer);timer=0;track=null;if(master&&ctx){const m=master;m.gain.cancelScheduledValues(ctx.currentTime);m.gain.setTargetAtTime(0,ctx.currentTime,.04);setTimeout(()=>m.disconnect(),250);}master=null;}

/* ---------- Hangi buton aktif? ---------- */
let active=null;const pressed=new Set();
const shown=b=>!b.disabled&&!b.closest('[hidden]')&&(b.checkVisibility?b.checkVisibility({opacityProperty:true,visibilityProperty:true}):b.getClientRects().length>0);
function release(){if(!active)return;pressed.add(active);active.classList.remove('dmss-halo','dmss-hop');active.removeEventListener('pointerdown',release);sparksOff();musicOff();active=null;}
function scan(){
 frame=0;
 if(document.hidden){release();return;}
 pressed.forEach(b=>{if(!b.isConnected||!shown(b))pressed.delete(b);});
 const list=[...document.querySelectorAll(SEL)].filter(b=>!pressed.has(b)&&shown(b));
 const pick=list.find(isParkur)||list[list.length-1]||null;
 if(pick===active){if(active&&!track&&!muted())musicOn(isParkur(active)?'parkur':'game');return;}
 release();if(!pick)return;
 active=pick;const parkur=isParkur(pick);
 pick.classList.add(parkur?'dmss-halo':'dmss-hop');if(!parkur)sparksOn(pick);
 pick.addEventListener('pointerdown',release,{once:true});
 musicOn(parkur?'parkur':'game');
}
let frame=0;const schedule=()=>{if(!frame)frame=setTimeout(scan,120);};
new MutationObserver(list=>{if(list.some(m=>!(sparkLayer&&sparkLayer.contains(m.target))))schedule();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled','class','style','open']});
document.addEventListener('visibilitychange',schedule);
document.addEventListener('click',e=>{if(active&&e.target.closest?.(SEL)===active)release();},true);
window.dmStartSpotlight={stop:release,refresh:schedule};
schedule();
})();
