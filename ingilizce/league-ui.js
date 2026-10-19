/* Efsaneler: lifetime podium. Weekly leagues: summit journey and compact top three. */
(()=>{'use strict';
if(window.dmLeagueUI)return;
const root=document.getElementById('tab-meduakis');if(!root)return;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.max(0,Math.trunc(Number(n)||0)).toLocaleString('tr-TR');
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const norm=x=>String(x||'').trim().toLocaleLowerCase('tr-TR');
const level=()=>Number(window.dmProgression?.level?.()||1);
const leagues={sampiyon:{name:'Şampiyonlar Ligi',short:'Şampiyonlar',icon:'🏆',level:15},super:{name:'Süper Lig',short:'Süper',icon:'⭐',level:10},yerel:{name:'Yerel Lig',short:'Yerel',icon:'🌱',level:5}};
let mode='weekly',selected=null,limit=30,epoch=0,owner=who();
const empty=()=>({rows:[],loaded:false,busy:false,error:'',at:0});
let states={weekly:empty(),alltime:empty()};
function reset(){if(owner===who())return;owner=who();epoch++;mode='weekly';selected=null;limit=30;states={weekly:empty(),alltime:empty()};}
function onScreen(){return typeof maSekme!=='undefined'&&maSekme==='lig'&&!(typeof maProfilId!=='undefined'&&maProfilId)&&root.classList.contains('active');}
function avatar(name,size=38){let html='';try{html=window.karakterSvg?.(name,size)||'';}catch{}
 if(!html){const icon=window.ogrenciMaskotSec?.(name)||'🦜';html='<span aria-hidden="true">'+esc(icon)+'</span>';}
 return '<span class="dm-lig-avatar" style="--size:'+size+'px">'+html+'</span>';
}
function row(p,own=false){return '<button type="button" class="dm-lig-row'+(own?' dm-lig-self':'')+'" data-lig-person="'+esc(p.name)+'"><span class="dm-lig-rank">'+fmt(p.rank)+'</span>'+avatar(p.name)+'<span class="dm-lig-person"><b>'+esc(p.name)+'</b>'+(own?'<small>Senin sıralaman'+(mode==='weekly'?' · '+esc(leagues[p.league]?.short||''):'')+'</small>':'')+'</span><strong>'+fmt(p.xp)+' XP</strong>'+(own?'<span aria-hidden="true">›</span>':'')+'</button>';}
function podium(rows,large){const top=rows.slice(0,3);return '<div class="dm-lig-podium '+(large?'dm-lig-podium-large':'dm-lig-podium-cards')+'">'+(large?[1,0,2]:[0,1,2]).map(i=>{
 const p=top[i];if(!p)return '<div class="dm-lig-podium-empty" aria-hidden="true"></div>';
 return '<button type="button" class="dm-lig-place dm-lig-place-'+(i+1)+'" data-lig-person="'+esc(p.name)+'" aria-label="'+(i+1)+'. '+esc(p.name)+', '+fmt(p.xp)+' XP">'+(!large?'<span class="dm-lig-medal">'+['👑','🥈','🥉'][i]+'</span>':'')+avatar(p.name,large?128:60)+(large?'<span class="dm-lig-step"><b>'+ (i+1)+'</b></span>':'')+'<span class="dm-lig-winner"><b>'+esc(p.name)+'</b><strong>'+fmt(p.xp)+' XP</strong></span></button>';
}).join('')+'</div>';}
function journey(rows,me){
 const ownRows=me?rows.filter(p=>p.league===me.league).sort((a,b)=>a.rank-b.rank):[];
 const higher=me?ownRows.filter(p=>p.rank<me.rank).at(-1):null;
 const gap=higher?Math.max(1,Math.trunc(higher.xp)-Math.trunc(me.xp)+1):null;
 const label=higher?'Bir üst sıra için':me?.rank===1?'Zirvedesin!':'İlk adımını at!';
 const value=gap!==null?fmt(gap)+' XP':me?.rank===1?'Harika gidiyorsun':'XP kazanmaya başla';
 return '<section class="dm-lig-journey"><h3>Senin zirve yolculuğun</h3><p>'+(me?'Daha yukarısı seninle mümkün!':'Öğren, puan topla, sıralamaya katıl!')+'</p><div class="dm-lig-gap"><span aria-hidden="true">▂▅▇ ↑</span><span><small>'+label+'</small><b>'+value+'</b></span></div>'+ (me?avatar(me.name,100):'')+'</section>';
}
function render(){reset();if(mode==='alltime'&&level()<15)mode='weekly';
 const state=states[mode],me=state.rows.find(p=>norm(p.name)===norm(who()));
 let code=selected||me?.league||'yerel';if(!leagues[code]||level()<leagues[code].level)code='yerel';
 const rows=mode==='alltime'?state.rows:[...state.rows].filter(p=>p.league===code).sort((a,b)=>a.rank-b.rank);
 const title=mode==='alltime'?'Efsaneler Ligi':leagues[code].name;
 const tabs='<nav class="dm-lig-period" aria-label="Sıralama dönemi"><button type="button" data-lig-mode="weekly" aria-pressed="'+(mode==='weekly')+'">Haftalık</button><button type="button" data-lig-mode="alltime" aria-pressed="'+(mode==='alltime')+'" aria-disabled="'+(level()<15)+'" data-dm-league-level="15">'+(level()<15?'🔒 ':'')+'Tüm Zamanlar'+(level()<15?'<small>15. seviye</small>':'')+'</button></nav>';
 const choices=mode==='weekly'?'<nav class="dm-lig-choices" aria-label="Haftalık ligler">'+Object.entries(leagues).map(([k,l])=>'<button type="button" data-lig-code="'+k+'" data-dm-league-level="'+l.level+'" aria-disabled="'+(level()<l.level)+'" aria-pressed="'+(k===code)+'">'+l.icon+' '+l.short+(level()<l.level?'<small>🔒 '+l.level+'. seviye</small>':'')+'</button>').join('')+'</nav>':'';
 let content='';
 if(!state.loaded&&state.busy)content='<p class="dm-lig-message" role="status">Sıralama yükleniyor…</p>';
 else if(state.error&&!state.loaded)content='<p class="dm-lig-message" role="alert">Sıralama yüklenemedi. <button type="button" data-lig-retry>Yeniden dene</button></p>';
 else content=(mode==='weekly'?journey(state.rows,me):'')+(rows.length?podium(rows,mode==='alltime')+'<div class="dm-lig-list">'+rows.slice(3,limit).map(p=>row(p)).join('')+'</div>'+(rows.length>limit?'<button type="button" class="dm-lig-more" data-lig-more>Diğer öğrencileri göster</button>':''):'<p class="dm-lig-message">'+(mode==='alltime'?'15. seviyeye ulaşan öğrenciler burada sıralanacak.':'Bu ligde henüz öğrenci yok.')+'</p>');
 return '<section class="dm-lig dm-lig-'+mode+'" aria-label="'+title+'"><header class="dm-lig-header"><button type="button" data-lig-back aria-label="Arkadaşlara dön">‹</button><h2>'+title+'</h2><img src="friends-assets/papi-league.png" alt="" width="54" height="54"></header><div class="dm-lig-caption"><span>'+(mode==='alltime'?'Toplam XP · Her zaman güncel':'Haftalık yarışma XP’si')+'</span><small>'+(mode==='alltime'?'ⓘ Haftalık sıfırlanmaz':'ⓘ Her pazartesi yeni hafta')+'</small></div>'+tabs+choices+content+(state.error&&state.loaded?'<p role="status" class="dm-lig-message">Güncelleme alınamadı. Son sıralama gösteriliyor. <button type="button" data-lig-retry>Yenile</button></p>':'')+(me?'<aside class="dm-lig-my-place" aria-label="Senin sıralaman">'+row(me,true)+'</aside>':'')+(mode==='weekly'?'<details class="dm-lig-rules"><summary>Lig kuralları ve haftalık ödüller</summary><p>Yerel Lig 5. seviyede açılır. Süper Lig için 10. seviye ve haftalık 750 yarışma XP’si; Şampiyonlar Ligi için 15. seviye ve haftalık 1800 yarışma XP’si gerekir. Joker ve günlük çarpanlar yarışma XP’sine eklenmez. Katılım her hafta yeniden değerlendirilir.</p><p>Şampiyonlar Ligi ilk 10 altın ödülleri: 500, 350, 250, 180, 140, 110, 90, 75, 60, 50. Süper Lig ilk iki: 30 ve 20 altın. Yerel Lig: katılım rozeti. Sonuçlar pazartesi 00.05’te kesinleşir; ödül ilk girişte bir kez eklenir.</p></details>':'<p class="dm-lig-footnote">15. seviyeden itibaren · Güncel toplam XP · Haftalık sıfırlanmaz</p>')+'</section>';
}
function draw(){if(!onScreen())return;const old=root.querySelector('.dm-lig');if(old)old.outerHTML=render();}
async function load(force=false){reset();const scope=mode,state=states[scope];if(state.busy||!force&&Date.now()-state.at<60000)return;
 if(scope==='alltime'&&level()<15)return;const ticket=epoch,account=who();state.busy=true;state.error='';draw();
 try{const result=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:'seviyeLigListesi',kapsam:scope,ogrenci:account,t:localStorage.getItem('ing_token')||'',...(force?{_:Date.now()}:{})})});const d=await result.json();
  if(!result.ok||d.ok===false||!Array.isArray(d.liste)||scope==='alltime'&&d.kapsam!=='alltime')throw Error('Lig verisi alınamadı.');
  if(account!==who()||ticket!==epoch)return;
  state.rows=d.liste;state.loaded=true;state.at=Date.now();
 }catch(e){if(account===who()&&ticket===epoch)state.error=String(e.message||'Güncellenemedi');}
 finally{if(account===who()&&ticket===epoch){state.busy=false;draw();}}
}
window.maLigHtml=function(){reset();if(!states[mode].busy&&Date.now()-states[mode].at>=60000)queueMicrotask(()=>{if(onScreen())load();});return render();};
root.addEventListener('click',e=>{
 const b=e.target.closest('[data-lig-mode],[data-lig-code],[data-lig-person],[data-lig-back],[data-lig-more],[data-lig-retry]');if(!b)return;
 if(b.hasAttribute('data-lig-back'))return window.maSekmeSec?.('hub');
 if(b.hasAttribute('data-lig-person'))return window.maAkisKisiAc?.(b.dataset.ligPerson);
 if(b.hasAttribute('data-lig-mode')){if(b.dataset.ligMode==='alltime'&&level()<15){window.yoToast?.('🔒 Efsaneler Ligi 15. seviyede açılır.');return;}mode=b.dataset.ligMode;limit=30;draw();void load();return;}
 if(b.hasAttribute('data-lig-code')){const k=b.dataset.ligCode;if(level()<leagues[k].level)return;selected=k;limit=30;draw();return;}
 if(b.hasAttribute('data-lig-more')){limit+=30;draw();return;}
 if(b.hasAttribute('data-lig-retry'))void load(true);
});
document.addEventListener('dm:login',()=>{owner='';reset();});
document.addEventListener('dm:state',()=>{for(const state of Object.values(states))state.at=0;if(onScreen())void load();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&onScreen())void load();});
setInterval(()=>{if(!document.hidden&&onScreen())void load();},60000);
window.dmLeagueUI={refresh:()=>load(true),render};
})();
