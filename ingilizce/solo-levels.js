/* Student-only linear levels. Native games retain their controls, entry fee and result screen. */
(()=>{'use strict';
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const student=()=>!!who()&&who().toLowerCase()!=='teacher'&&!window.dmTeacherPortalMode&&!(typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci);
let active=null,launching=false,epoch=0;
const names={ky:'Kelime Laboratuvarı',jp:'Risk Balonları',bosluk:'Eksik Harf',hafiza:'Hafıza Sandığı',yagmur:'Hız Fırtınası',kelimebul:'Şifre Kırıcı',eslestirme:'Eş Bul',tren:'Kelime Treni',dikte:'Kulak Dedektifi',cumle:'Cümle Ustası',harfbahcesi:'Harf Bahçesi',fener:'Papi’nin Feneri',canavar:'Canavar Avcısı'};
const starters={ky:'kelimeYarismasiBaslat',jp:'jeopardyOyunuBaslat',bosluk:'boslukOyunuBaslat',hafiza:'hafizaOyunuBaslat',yagmur:'yagmurOyunuBaslat',kelimebul:'kelimebulOyunuBaslat',eslestirme:'esOyunuBaslat',tren:'trenOyunuBaslat'};
const reopen={golu:'kelimeGoluAc',ky:'kelimeYarismasiAc',jp:'jpOyunAc',bosluk:'boslukOyunAc',hafiza:'hafizaOyunAc',yagmur:'yagmurOyunAc',kelimebul:'kelimebulOyunAc',eslestirme:'esOyunAc',tren:'trenOyunAc',dikte:'dikteAc',cumle:'cumleAc',harfbahcesi:'harfBahcesiAc',fener:'papiFeneriAc',canavar:'canavarAvcisiAc',kule:'dengesizKuleAc'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(islem,body){const owner=who(),r=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem,ogrenci:owner,...body})}),d=await r.json();if(owner!==who())throw Error('Hesap değişti.');if(!r.ok||!d.ok)throw Error(d.mesaj||'Seviye yüklenemedi. Tekrar dene.');return d;}
function scope(game){return student()&&(active?.game===game||active?.game==='golu'&&game==='ky')&&active.owner===who()?{classNo:active.classNo,units:active.units.slice(),soloLevel:active.number,...(active.game==='golu'?{soloVariant:'golu'}:{})}:null;}
function bank(game){return scope(game)?active.words.map(w=>({ingilizce:w.en,turkce:w.tr,en:w.en,tr:w.tr,sinif:active.classNo,unite:w.unit||1})):null;}
async function open(game,native){
 if(!student())return native();const turn=++epoch,owner=who();active=null;
 document.getElementById('dmSoloLevelIntro')?.remove();
 const root=document.createElement('div');root.id='dmSoloLevelIntro';root.className='hb-overlay game-modal-overlay';root.innerHTML='<section class="hb-card" role="dialog" aria-modal="true" aria-labelledby="dmSoloTitle"><header><h2 id="dmSoloTitle"></h2><button type="button" data-close aria-label="Kapat">×</button></header><div class="hb-body"><div class="hb-intro"><img src="papi-welcome-v2.png" alt="Papi"></div><h3 data-stage></h3><p>Her seviyede 12 soru. Bir sonraki seviye için en az 9 doğru yap.</p><p>12 doğru: %100 · 11 doğru: %80 · 10 doğru: %60 · 9 doğru: %35 ödül</p><p>Giriş: 3 enerji</p><p data-status role="status">Seviyen yükleniyor…</p><button type="button" class="hb-primary" data-start disabled>Oyuna başla</button><button type="button" data-retry hidden>Tekrar yükle</button></div></section>';
 root.querySelector('h2').textContent=names[game];document.body.append(root);
 const close=()=>{++epoch;root.remove();window.dmViewHistory?.leave(root);};root.querySelector('[data-close]').onclick=close;
 root.onkeydown=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const buttons=[...root.querySelectorAll('button:not(:disabled):not([hidden])')],i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}};
 window.dmViewHistory?.track(root,{parent:window.dmViewHistory.capture(),close});root.querySelector('[data-close]').focus();
 try{
  const stage=await api('soloLevelStatus',{game});if(turn!==epoch||owner!==who()||!root.isConnected)return;
  root.querySelector('[data-stage]').textContent='Seviye '+stage.number+' / '+stage.totalLevels+' · '+stage.label;
  root.querySelector('[data-status]').textContent=stage.allCompleted?'Tüm seviyeleri tamamladın! Son seviyeyi tekrar oynayabilirsin.':'İlerlemen hesabına kaydedilir.';
  const b=root.querySelector('[data-start]');b.disabled=false;b.onclick=async()=>{
   if(turn!==epoch||owner!==who()||b.disabled)return;b.disabled=true;active={...stage,game,owner};launching=true;
   try{root.remove();window.dmViewHistory?.leave(root);await native();if(starters[game])await window[starters[game]]();else if(game==='golu')document.querySelector('#kelimeGolu [data-start]')?.click();else if(game==='harfbahcesi')document.querySelector('#harfBahcesiOverlay [data-start]')?.click();else if(['fener','canavar','kule'].includes(game))document.querySelector('#soloArcadeOverlay [data-start]')?.click();}
   catch(e){window.yoToast?.(e.message);active=null;}finally{launching=false;}
  };
 }catch(e){if(root.isConnected){root.querySelector('[data-status]').textContent=e.message;const b=root.querySelector('[data-retry]');b.hidden=false;b.onclick=()=>open(game,native);}}
}
let resultInstalled=false;
function installResult(){if(resultInstalled)return;const original=window.genelSonucEkraniGoster;if(!original||original.dmSoloLevels)return;
 const wrapped=async function(o){
  const game=o?.oyunKey,runId=o?.runId||window.OC?.sonuc(game)?.runId;
  const priorNext=document.getElementById('gsoDevamBtn');if(priorNext){priorNext.onclick=()=>window.genelSonucKapat?.('devam');priorNext.textContent='Devam Et';}
  if(!scope(game)||!runId)return original.call(this,o);
  const owner=who(),stage=active;
  // Display the established result first; progression controls stay locked until server verification succeeds.
  original.call(this,o);const next=document.getElementById('gsoDevamBtn'),retry=document.getElementById('gsoTekrarBtn'),heading=document.getElementById('gsoAlt');
  next.disabled=true;retry.disabled=true;next.textContent='Seviye doğrulanıyor…';
  async function complete(){try{
   next.disabled=true;await window.dmVerifiedGames.flush(runId);const result=await api('soloLevelComplete',{game:stage.game,runId});if(owner!==who()||active!==stage)return;
   document.getElementById('gsoDogruluk').textContent='%'+Math.round(result.correct/12*100);
   heading.textContent=names[stage.game]+' · Seviye '+stage.number+' · '+result.correct+'/12 doğru';
   document.getElementById('gsoBaslik').textContent=result.passed?(result.allCompleted?'Tüm seviyeler tamamlandı!':'Seviye tamamlandı!'):'Tekrar deneyelim!';
   const again=()=>{window.genelSonucKapat?.('devam');window[reopen[stage.game]]();};
   retry.disabled=false;retry.textContent='Tekrar Dene';
   // Failed runs replay the same level. Passing runs open the next saved level.
   next.disabled=false;next.textContent=result.passed&&!result.allCompleted?'Sonraki Seviye':'Tekrar Dene';next.onclick=again;
  }catch(e){if(owner!==who())return;next.disabled=false;next.textContent='Seviye kaydını tekrar dene';next.onclick=complete;heading.textContent=e.message;}}
  await complete();
 };
 Object.assign(wrapped,original);wrapped.dmSoloLevels=true;window.genelSonucEkraniGoster=wrapped;resultInstalled=true;
}
window.dmSoloLevels={needs:game=>student()&&!launching&&!!names[game],open,scope,bank,get active(){return student()&&active?.owner===who()?active:null;},student};
document.addEventListener('dm:login',()=>{++epoch;active=null;document.getElementById('dmSoloLevelIntro')?.remove();});
installResult();setTimeout(installResult,1600);
})();
