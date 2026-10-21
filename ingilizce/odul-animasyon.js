/* Ödül ve kombo animasyonları (yalnızca görünüm; ekonomiye dokunmaz).
   - fly(): kazanılan enerji/altın/XP ikonları kaynaktan saçılıp göstergeye uçar,
     gösterge hafifçe büyür ve sayı eski değerden yenisine tek tek artar ("Ödül A").
   - combo(): kompakt kombo şeridi + ilerleme çizgisinde tek bir parıltı ("Kombo B").
   - Ders ekranlarında (Macera Parkuru, Öğrenme Yolu) enerji arttığında ikonlar
     ekrandaki enerji göstergesine otomatik uçar. Ana sayfa şeridini papi-wallet.js yönetir. */
(()=>{'use strict';
if(window.dmRewardFx)return;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const visible=e=>!!e&&e.isConnected&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
const ICONS={
 energy:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="#F0B429" stroke="#B07800" stroke-width="1"/></svg>',
 gold:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#F2B33D"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#D99413" stroke-width="2"/></svg>',
 xp:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="#7C5CE0"/></svg>'
};
const point=src=>{
 if(src&&typeof src.getBoundingClientRect==='function'&&visible(src)){const r=src.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}
 if(src&&Number.isFinite(src.x)&&Number.isFinite(src.y))return src;
 return {x:innerWidth/2,y:innerHeight*.66};
};
function layer(){let l=document.getElementById('dmRewardLayer');if(!l){l=document.createElement('div');l.id='dmRewardLayer';l.setAttribute('aria-hidden','true');document.body.append(l);}return l;}
function pulse(target){
 if(!target)return;target.classList.remove('dm-reward-pulse');void target.offsetWidth;target.classList.add('dm-reward-pulse');
 setTimeout(()=>target.classList.remove('dm-reward-pulse'),700);
}
// Count the first text node so labels like "24 / 30" keep their small suffix.
function countUp(el,from,to,{duration=600,format=n=>String(n)}={}){
 if(!el)return Promise.resolve();
 const node=[...el.childNodes].find(n=>n.nodeType===3&&n.nodeValue.trim())||el.firstChild;
 const write=v=>{if(node&&node.nodeType===3)node.nodeValue=format(v);else el.textContent=format(v);};
 from=Math.floor(Number(from));to=Math.floor(Number(to));
 if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from||reduced()){write(to);return Promise.resolve();}
 el.dataset.dmCounting='1';write(from);
 return new Promise(done=>{
  const start=performance.now(),span=to-from;
  const step=now=>{const t=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-t,3);write(Math.round(from+span*eased));
   if(t<1&&el.isConnected)requestAnimationFrame(step);else{write(to);delete el.dataset.dmCounting;done();}};
  requestAnimationFrame(step);
 });
}
/* kind: energy | gold | xp. target: gösterge (düğme/çip). counter: sayının yazıldığı eleman. */
function fly({kind='gold',amount=1,from,target,counter,fromValue,toValue,format}={}){
 if(!target||!visible(target))return Promise.resolve();
 const end=point(target),start=point(from),n=Math.max(1,Math.min(kind==='energy'?5:6,Math.ceil(Number(amount)||1)));
 const arrive=reduced()?0:780+n*55;
 if(!reduced()){
  const l=layer();
  for(let i=0;i<n;i++){
   const icon=document.createElement('span');icon.className='dm-reward-icon dm-reward-'+kind;icon.innerHTML=ICONS[kind]||ICONS.gold;
   const angle=(-150+i*(120/Math.max(1,n-1)))*Math.PI/180,spread=34+(i%2)*16;
   icon.style.left=(start.x-12)+'px';icon.style.top=(start.y-12)+'px';
   icon.style.setProperty('--sx',Math.round(Math.cos(angle)*spread)+'px');icon.style.setProperty('--sy',Math.round(Math.sin(angle)*spread-10)+'px');
   icon.style.setProperty('--dx',Math.round(end.x-start.x)+'px');icon.style.setProperty('--dy',Math.round(end.y-start.y)+'px');
   icon.style.animationDelay=(i*55)+'ms';
   l.append(icon);setTimeout(()=>icon.remove(),1100+i*55);
  }
 }
 if(counter&&Number.isFinite(Number(fromValue)))countUpHold(counter,fromValue,format);
 return new Promise(done=>setTimeout(()=>{pulse(target);
  const finished=counter&&Number.isFinite(Number(toValue))?countUp(counter,fromValue,toValue,{duration:Math.min(900,350+Math.abs(toValue-fromValue)*40),format}):Promise.resolve();
  const tag=document.createElement('span');tag.className='dm-reward-plus';tag.textContent='+'+Math.max(1,Math.round(Number(amount)||1));
  if(!reduced()){const r=target.getBoundingClientRect();tag.style.left=(r.right-10)+'px';tag.style.top=(r.top-6)+'px';layer().append(tag);setTimeout(()=>tag.remove(),950);}
  finished.then(done);
 },arrive));
}
// Keep the old number on screen until the icons land.
function countUpHold(el,value,format=n=>String(n)){const node=[...el.childNodes].find(n=>n.nodeType===3&&n.nodeValue.trim())||el.firstChild;el.dataset.dmCounting='1';if(node&&node.nodeType===3)node.nodeValue=format(value);else el.textContent=format(value);}

/* Kombo B: üst çubuğun altında ince şerit + ilerleme çizgisinde tek parıltı. */
function combo(root,{streak=3,gain=0,text}={}){
 const host=root&&root.isConnected?root:document.body;
 host.querySelector(':scope>.dm-combo-strip')?.remove();
 const el=document.createElement('div');el.className='dm-combo-strip';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 const label=text||(streak+' doğru üst üste!');
 el.setAttribute('aria-label',label+(gain>0?' '+gain+' enerji kazandın.':''));
 el.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-7 1-10z"/></svg><span class="dm-combo-text"></span>'+(gain>0?'<b>+'+gain+' ⚡</b>':'');
 el.querySelector('.dm-combo-text').textContent=label;
 // Place the strip right under the visible top bar of the current screen.
 const bar=[...(host.querySelectorAll?host.querySelectorAll('.dm-school-lesson-head,.ml-shell,.gg-top'):[])].find(visible);
 const top=bar?Math.max(8,(bar.matches('.ml-shell')?bar.querySelector('.ml-progress')||bar:bar).getBoundingClientRect().bottom+8):Math.max(12,(window.visualViewport?.offsetTop||0)+70);
 el.style.top=top+'px';
 host.append(el);setTimeout(()=>el.remove(),reduced()?2200:1900);
 host.classList.remove('dm-combo-glow');void host.offsetWidth;host.classList.add('dm-combo-glow');setTimeout(()=>host.classList.remove('dm-combo-glow'),1200);
 return el;
}

/* Ders ekranları: enerji arttığında ekrandaki enerji göstergesine uçur. */
const lessonTargets=[
 {root:'#bzPerde',chip:'.rq-wallet[aria-label="Enerji"]',value:'[data-rq-energy]',source:'.dm-combo-strip,.bz-geri-bildirim'},
 {root:'#dmStoryLesson',chip:'.ml-wallet-chip[aria-label="Enerji"]',value:'[data-ml-energy]',source:'.dm-combo-strip,.ml-feedback:not(:empty)'}
];
let lastEnergy=null,lastOwner='';
setInterval(()=>{
 const owner=typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||''),now=Number(window.genelEnerjiKalan);
 if(owner!==lastOwner){lastOwner=owner;lastEnergy=Number.isFinite(now)?now:null;return;}
 if(!Number.isFinite(now))return;
 const before=lastEnergy;lastEnergy=now;
 if(before===null||now<=before)return;
 for(const t of lessonTargets){
  const root=document.querySelector(t.root);if(!visible(root))continue;
  const chip=[...root.querySelectorAll(t.chip)].find(visible);if(!chip)continue;
  const counter=chip.querySelector(t.value);
  const source=[...root.querySelectorAll(t.source)].find(visible);
  fly({kind:'energy',amount:now-before,from:source,target:chip,counter,fromValue:before,toValue:now});
  break;
 }
},150);

window.dmRewardFx={fly,countUp,combo,pulse};
})();
