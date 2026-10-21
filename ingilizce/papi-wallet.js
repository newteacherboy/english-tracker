/* One compact status strip, reused across the six destinations. No economy writes. */
(()=>{'use strict';
const visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
const hud=document.createElement('div');hud.className='dm-papi-wallet dm-unified-wallet';hud.setAttribute('aria-label','Enerji, altın, XP ve aktif kullanım yıldızları');
hud.innerHTML='<i class="dm-pw-art dm-pw-papi" aria-hidden="true"></i>'+['energy','gold','xp','time'].map(key=>'<button type="button" data-pw="'+key+'"><i class="dm-pw-art dm-pw-'+key+'" aria-hidden="true"></i><span class="dm-pw-copy"><b data-pw-value></b>'+(key==='time'?'<small data-pw-minutes></small>':'')+'</span></button>').join('');
const buttons=Object.fromEntries([...hud.querySelectorAll('[data-pw]')].map(e=>[e.dataset.pw,e]));
buttons.time.onclick=()=>window.dmActiveTime?.panel();buttons.energy.onclick=()=>window.dijiEnerjiPaneliAc?.();buttons.gold.onclick=()=>window.magazaAc?.();buttons.xp.onclick=()=>window.dmIlerlememAc?.();
const activity='#dmStoryLesson,#bzPerde #bzAlan,.game-modal-overlay,#meteorGame,#wordWheel,#papiCards,#harfBahcesiOverlay,#baOyunEkrani,#kpKelimeOyunEkrani,#kmPanel .km-sec,#seviyeDisLinkOverlay';
const selectors=['#tab-dunya .rt-top','#tab-aktiviteler .gg-brand','#tab-meduakis .akis-baslik','#tab-derscalis .su-levels-heading','#tab-magaza .ds-header','.dc-fullscreen-overlay.active header'];
const finite=n=>Number.isFinite(Number(n))?Math.max(0,Math.floor(Number(n))):0;
const format=n=>finite(n).toLocaleString('tr-TR');
const compact=n=>finite(n)>=10000?new Intl.NumberFormat('tr-TR',{notation:'compact',maximumFractionDigits:1}).format(finite(n)):format(n);
let seen={owner:''};
function detach(){hud.parentElement?.classList.remove('dm-has-wallet');hud.remove();}
function run(){
 if(typeof aktifOgrenciAdi==='undefined'||!aktifOgrenciAdi){detach();return;}
 if([...document.querySelectorAll(activity)].some(visible)){detach();return;}
 const host=selectors.flatMap(s=>[...document.querySelectorAll(s)]).find(visible);if(!host){detach();return;}
 if(hud.parentElement!==host){detach();host.prepend(hud);host.classList.add('dm-has-wallet');window.dispatchEvent(new Event('resize'));}
 const y=typeof yo==='undefined'?{}:yo||{},time=window.dmActiveTime?.summary()||{stars:0,seconds:0},level=window.dmProgression?.level?.()||1;
 const energy=window.genelEnerjiKalan,values={energy:energy==null?'—':format(energy),gold:compact(y.altin),xp:compact(y.totalXp),time:compact(time.stars)};
 const labels={energy:'Enerji paketleri · '+values.energy,gold:'Altınlarım ve mağaza · '+format(y.altin)+' altın',xp:'XP ve ilerlemem · '+format(y.totalXp)+' XP · Seviye '+level,time:'Aktif kullanım yıldızları · '+format(time.stars)+' yıldız · '+format(finite(time.seconds)/60)+' dakika'};
 const owner=String(aktifOgrenciAdi),raw={energy:energy==null?null:finite(energy),gold:finite(y.altin),xp:finite(y.totalXp)};
 // Ödül A: when a value grows while the strip is on screen, icons fly in and the number counts up.
 if(seen.owner!==owner){seen={owner};}
 for(const key of ['energy','gold','xp']){const before=seen[key],now=raw[key];if(now==null)continue;seen[key]=now;
  if(before!=null&&now>before&&window.dmRewardFx&&visible(hud)){const e=buttons[key],text=e.querySelector('[data-pw-value]');window.dmRewardFx.fly({kind:key,amount:now-before,target:e,counter:text,fromValue:before,toValue:now,format:key==='energy'?format:compact});}}
 for(const [key,value] of Object.entries(values)){const e=buttons[key],text=e.querySelector('[data-pw-value]');if(text.dataset.dmCounting)continue;if(text.textContent!==value)text.textContent=value;if(e.getAttribute('aria-label')!==labels[key]){e.setAttribute('aria-label',labels[key]);e.title=labels[key];}}
 const minutes=compact(finite(time.seconds)/60)+' dk',small=buttons.time.querySelector('[data-pw-minutes]');if(small.textContent!==minutes)small.textContent=minutes;
}
let queued=false;function schedule(){if(queued||document.hidden)return;queued=true;requestAnimationFrame(()=>{queued=false;run();});}
// Destination changes update in the next frame; value-only changes retain the icon DOM.
const relevant=selectors.join(',')+','+activity+',.dc-fullscreen-overlay,#panel-alani';
new MutationObserver(ms=>{if(ms.some(m=>{
 if(hud.contains(m.target)||m.target===hud)return false;
 if(m.type==='attributes')return m.target.matches?.(relevant);
 const nodes=[...m.addedNodes,...m.removedNodes].filter(n=>n.nodeType===1&&n!==hud);
 return nodes.some(n=>n.matches(relevant)||n.querySelector(relevant))||nodes.length>0&&m.target.matches?.(relevant);
} ))schedule();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
setInterval(()=>{if(!document.hidden)run();},1000);
for(const name of ['dm:time','dm:login','dm:state','dm:view-restored'])document.addEventListener(name,schedule);
document.addEventListener('visibilitychange',schedule);
window.DijiMeduPapiWallet={refresh:run};run();
})();
