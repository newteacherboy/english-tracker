/* One compact status strip, reused across the six destinations. No economy writes. */
(()=>{'use strict';
const visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
const hud=document.createElement('div');hud.className='dm-papi-wallet dm-unified-wallet';hud.setAttribute('aria-label','Enerji, altın, XP, kuş tüyü ve bildirimler');
hud.innerHTML='<i class="dm-pw-art dm-pw-papi" aria-hidden="true"></i>'+['energy','gold','xp'].map(key=>'<button type="button" data-pw="'+key+'"><i class="dm-pw-art dm-pw-'+key+'" aria-hidden="true"></i><span class="dm-pw-copy"><b data-pw-value></b>'+(key==='time'?'<small data-pw-minutes></small>':'')+'</span></button>').join('');
const daily=document.createElement('button');daily.type='button';daily.className='dm-daily-streak-button';daily.dataset.dmDailyStreak='';daily.hidden=true;
daily.className+=' dm-tuy-button';daily.innerHTML='<svg class="dm-tuy-icon" viewBox="0 0 40 40" aria-hidden="true"><path d="M33 4C20 6 10 16 8 30l-3 6 3-1c14-2 24-12 25-31z" fill="#1FB5A8"/><path d="M33 4C22 12 14 22 6 36" stroke="#0E7C73" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg><b data-daily-count>·</b><small>Tüy</small>';daily.setAttribute('aria-label',"Papi'nin Kanadı");daily.onclick=()=>window.DijiDailyGift?.open();
const buttons=Object.fromEntries([...hud.querySelectorAll('[data-pw]')].map(e=>[e.dataset.pw,e]));
buttons.energy.onclick=()=>window.dijiEnerjiPaneliAc?.();buttons.gold.onclick=()=>window.magazaAc?.();buttons.xp.onclick=()=>window.dmIlerlememAc?.();
const activity='#dmStoryLesson,#bzPerde #bzAlan,.game-modal-overlay,#meteorGame,#wordWheel,#papiCards,#harfBahcesiOverlay,#baOyunEkrani,#kpKelimeOyunEkrani,#kmPanel .km-sec,#seviyeDisLinkOverlay';
const selectors=['#tab-dunya .rt-medal-header','#tab-dunya .rt-top','#tab-aktiviteler .gg-brand','#tab-meduakis.active.fr-home-view .fr-wallet-host','#tab-derscalis .su-levels-heading','#tab-magaza .ds-header','.dc-fullscreen-overlay.active header'];
const finite=n=>Number.isFinite(Number(n))?Math.max(0,Math.floor(Number(n))):0;
const format=n=>finite(n).toLocaleString('tr-TR');
const compact=n=>finite(n)>=10000?new Intl.NumberFormat('tr-TR',{notation:'compact',maximumFractionDigits:1}).format(finite(n)):format(n);
let seen={owner:''},clearSince=0;
// Ödüller, gösterge gerçekten görünürken uçar: sonuç ekranı, panel ya da başka bir katman göstergenin
// üstündeyse kazanımlar bekletilir ve ekran kapanınca hepsi birden göstergeye uçar.
// Göstergenin üstündeki eleman büyük bir katmana (sonuç ekranı, panel, modal) aitse gösterge kapalı sayılır.
// Küçük rozetler ya da aynı başlığın parçaları sayılmaz; değerler orada takılı kalmasın.
function coveredBy(hit){
 for(let e=hit;e&&e!==document.body&&e!==document.documentElement;e=e.parentElement){
  if(e===hud||e.contains(hud))return false;
  const r=e.getBoundingClientRect();if(r.width>=innerWidth*.6&&r.height>=innerHeight*.4)return true;
 }
 return false;
}
function onTop(){
 if(!visible(hud))return false;
 return Object.values(buttons).every(e=>{const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
  if(x<0||y<0||x>innerWidth||y>innerHeight)return false;return !coveredBy(document.elementFromPoint(x,y));});
}
function detach(){window.dmNotificationCenter?.detach();hud.parentElement?.classList.remove('dm-has-wallet');hud.remove();}
function run(){
 if(typeof aktifOgrenciAdi==='undefined'||!aktifOgrenciAdi){detach();return;}
 if([...document.querySelectorAll(activity)].some(visible)){detach();return;}
 const friends=document.getElementById('tab-meduakis');
 const host=visible(friends)?friends.querySelector('.fr-wallet-host'):selectors.flatMap(s=>[...document.querySelectorAll(s)]).find(visible);
 if(visible(friends)&&!friends.classList.contains('fr-home-view')){detach();return;}if(!host){detach();return;}
 if(hud.parentElement!==host){detach();host.prepend(hud);host.classList.add('dm-has-wallet');window.dispatchEvent(new Event('resize'));}
 const dailyVisible=!!window.DijiDailyGift&&!window.dmGuestMode&&!['teacher','dijimedu_demo'].includes(String(aktifOgrenciAdi).toLowerCase())&&!window.dmTeacherPortalMode&&(!window.siniftaOynananOgrenci)&&(!!window.DijiPapiWing||!!host.closest('#tab-dunya'));
 if(dailyVisible){daily.hidden=false;if(daily.parentElement!==hud)hud.append(daily);window.dmNotificationCenter?.mount(hud);}else{daily.remove();window.dmNotificationCenter?.detach();}hud.classList.toggle('dm-has-daily-streak',dailyVisible);hud.classList.toggle('dm-has-center',dailyVisible&&!!window.dmNotificationCenter);window.DijiDailyGift?.decorateButton(daily);if(dailyVisible)window.DijiDailyGift?.onParkurVisible();
 const y=typeof yo==='undefined'?{}:yo||{},time=window.dmActiveTime?.summary()||{stars:0,seconds:0},level=window.dmProgression?.level?.()||1;
 const energy=window.genelEnerjiKalan,values={energy:energy==null?'—':format(energy),gold:compact(y.altin),xp:compact(y.totalXp),};
 const labels={energy:'Enerji paketleri · '+values.energy,gold:'Altınlarım ve mağaza · '+format(y.altin)+' altın',xp:'XP ve ilerlemem · '+format(y.totalXp)+' XP · Seviye '+level};
 const owner=String(aktifOgrenciAdi),raw={energy:energy==null?null:finite(energy),gold:finite(y.altin),xp:finite(y.totalXp)};
 // Ödül A: when a value grows while the strip is on screen, icons fly in and the number counts up.
 if(seen.owner!==owner){seen={owner};}
 const ready=onTop();
 if(!ready)clearSince=0;else if(!clearSince){clearSince=performance.now();setTimeout(schedule,380);}
 const settled=ready&&performance.now()-clearSince>=350; // kapanış geçişi bitsin, kullanıcı uçuşu görsün
 const shown={};
 for(const key of ['energy','gold','xp']){const before=seen[key],now=raw[key];if(now==null)continue;
  if(before!=null&&now>before&&!settled){shown[key]=before;continue;} // göstergede eski değer kalsın, artış sonra uçarak gelsin
  seen[key]=now;
  if(before!=null&&now>before&&window.dmRewardFx){const e=buttons[key],text=e.querySelector('[data-pw-value]');window.dmRewardFx.fly({kind:key,amount:now-before,target:e,counter:text,fromValue:before,toValue:now,format:key==='energy'?format:compact});}}
 for(const [key,value0] of Object.entries(values)){const e=buttons[key],text=e.querySelector('[data-pw-value]');if(text.dataset.dmCounting)continue;const value=key in shown?(key==='energy'?format:compact)(shown[key]):value0;if(text.textContent!==value)text.textContent=value;if(e.getAttribute('aria-label')!==labels[key]){e.setAttribute('aria-label',labels[key]);e.title=labels[key];}}

}
function refresh(){run();if(typeof aktifOgrenciAdi!=='undefined'&&aktifOgrenciAdi)window.dmDayNightTheme?.updateHint();}
let queued=false;function schedule(){if(queued||document.hidden)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}
// Destination changes update in the next frame; value-only changes retain the icon DOM.
const relevant=selectors.join(',')+','+activity+',.dc-fullscreen-overlay,#panel-alani';
new MutationObserver(ms=>{if(ms.some(m=>{
 if(hud.contains(m.target)||m.target===hud)return false;
 if(m.type==='attributes')return m.target.matches?.(relevant);
 const nodes=[...m.addedNodes,...m.removedNodes].filter(n=>n.nodeType===1&&n!==hud);
 return nodes.some(n=>n.matches(relevant)||n.querySelector(relevant))||nodes.length>0&&m.target.matches?.(relevant);
} ))schedule();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
setInterval(()=>{if(!document.hidden)refresh();},1000);
for(const name of ['dm:time','dm:login','dm:state','dm:view-restored'])document.addEventListener(name,schedule);
document.addEventListener('visibilitychange',schedule);
window.DijiMeduPapiWallet={refresh};refresh();
})();
