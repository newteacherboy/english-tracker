(function(){'use strict';
const name=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||''),student=()=>name()&&name().toLowerCase()!=='teacher'&&!(typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci),key=()=> 'dm_game_pending:'+name().toLowerCase(),reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const scopes=new Map(),inflight=new Set(),scoreStatus=new Map();let activeRun='',speechTimer,voiceGeneration=0;
function scope(game){if(window.dmSelectedIntro?.key===game)return {classNo:Number(dmSelectedIntro.classNo),units:game==='cumle'?[0]:dmSelectedIntro.units.slice()};const prefixes={ky:'ky',jp:'jp',hafiza:'hafiza',bosluk:'bosluk',yagmur:'yagmur',asmaca:'asmaca',kelimebul:'kelimebul',eslestirme:'es',tren:'tren'};const prefix=prefixes[game];const root=prefix&&document.getElementById(prefix+'SinifGrid');const selected=root?.querySelector('.sinif-btn.active,.sinif-btn.secili');const classNo=Number(selected?.textContent.match(/\d+/)?.[0]||0);const box=prefix&&document.getElementById(prefix+'UniteBox');const units=[...(box?.querySelectorAll('.unite-chip.active,.unite-chip.selected,.unite-chip.secili')||[])].map(x=>Number(x.textContent.match(/\d+/)?.[0])).filter(Number.isFinite);return {classNo,units:units.length?units:[0]};}
window.dmGameScope=scope;
function read(){try{return JSON.parse(localStorage.getItem(key())||'[]');}catch{return [];}}
function stash(o){const q=read();if(!q.some(x=>x.runId===o.runId)){q.push(o);localStorage.setItem(key(),JSON.stringify(q.slice(-100)));}}
function remove(id){localStorage.setItem(key(),JSON.stringify(read().filter(x=>x.runId!==id)));}
function count(el,total,prefix=''){if(!el)return;const start=performance.now(),tick=now=>{const ratio=reduced()?1:Math.min(1,(now-start)/950),n=Math.round(total*(1-Math.pow(1-ratio,3)));el.textContent=prefix+n.toLocaleString('tr-TR');if(ratio<1&&el.isConnected)requestAnimationFrame(tick);};requestAnimationFrame(tick);}
function resultStatus(text){const e=document.getElementById('dmRewardStatus');if(e)e.textContent=text;}
function showReward(d,run){if(activeRun!==run)return;const e=document.getElementById('dmRewardCards');if(e){e.hidden=false;count(e.querySelector('[data-xp]'),d.xp,'+');count(e.querySelector('[data-gold]'),d.gold,'+');e.querySelector('.dm-earned-fill').style.width=d.xp?'100%':'0%';}resultStatus(d.reason==='cooldown'?'Bu ünite için ödülünü aldın. Yeni ödül: '+new Date(d.nextRewardAt).toLocaleString('tr-TR')+'. Bu tur yalnızca sıralamaya kaydedilir.':d.reason==='no_correct'?'Bu tur XP ve altın kazanılmadı.':'XP ve altının hesabına kaydedildi.');}
async function claim(o){if(!student()||inflight.has(o.runId))return;inflight.add(o.runId);const owner=name();try{const r=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:'seviyeOyunOdulu',ogrenci:owner,t:localStorage.getItem('ing_token')||'',...o}),keepalive:true});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.mesaj||'Ödül kaydedilemedi');if(owner!==name())return;remove(o.runId);if(typeof yo!=='undefined'&&d.yo){if(Number(d.yo.dmRewardVersion||0)>=Number(yo.dmRewardVersion||0)){for(const k of ['altin','guncelleme','dmRewardVersion','xpGun','log'])if(d.yo[k]!==undefined)yo[k]=d.yo[k];}yo.totalXp=Math.max(Number(yo.totalXp||0),Number(d.yo.totalXp||0));DijiProgressRules.migrate(yo);localStorage.setItem('ing_yo_'+owner,JSON.stringify(yo));window.yoArayuzTazele?.();window.dmProgressPanel?.paint?.();window.dmProgression?.refresh(true);}showReward(d,o.runId);}catch(e){if(activeRun===o.runId)resultStatus('Ödül henüz kaydedilemedi. Bağlantı geldiğinde tekrar denenecek; bu tur için ikinci ödül verilmez.');}finally{inflight.delete(o.runId);}}
window.ocOdulVer=function(o){if(!student()||!o?.runId||o.puanSurum!==3)return null;const s=scopes.get(o.runId)||o.rewardScope||scope(o.oyunKey);const data={runId:o.runId,game:o.oyunKey,classNo:s.classNo,units:s.units,correct:o.oyunKey==='ba'&&!o.parkurGecti?0:o.dogru,wrong:o.yanlis,seconds:Math.max(.01,Number(o.sureSaniye||o.sure)),firstClear:!!o.parkurIlk,stars:o.parkurYildiz||o.yildiz,boost:Number(o.odulCarpan)>1||window.dmGameBonusFlags?.().xpBoost&&window.dmGameBonusFlags?.().goldBoost?2:window.dmGameBonusFlags?.().xpBoost?3:window.dmGameBonusFlags?.().goldBoost?4:1};stash(data);claim(data);return {pending:true,al:0,xp:0};};
const original=window.fetch;window.fetch=async function(url,opt){let body;try{body=JSON.parse(opt?.body||'null');}catch{}if(body?.islem==='ekVeriKaydet'&&body.anahtar==='yo'){try{const v=typeof body.deger==='string'?JSON.parse(body.deger):body.deger;DijiProgressRules.migrate(v);body.deger=JSON.stringify(v);opt={...opt,body:JSON.stringify(body)};}catch{}}if(body&&/LiderlikKaydet$/.test(body.islem)&&!body.runId){const code=({kelimeLiderlikKaydet:'ky',jeopardyLiderlikKaydet:'jp',konusmaLiderlikKaydet:'kp'}[body.islem])||body.islem.replace('LiderlikKaydet','');const result=window.OC?.sonlandir(code);if(result?.runId){body.runId=result.runId;opt={...opt,body:JSON.stringify(body)};}}if(body?.runId&&/LiderlikKaydet$/.test(body.islem)){const s={classNo:Number(String(body.sinif||'').match(/\d+/)?.[0]||0),units:(String(body.unite||'').match(/\d+/g)||['0']).map(Number)};scopes.set(body.runId,s);}const r=await original.call(this,url,opt);if(body&&/LiderlikKaydet$/.test(body.islem)){r.clone().json().then(d=>{const message=r.ok&&d.status==='success'&&!d.kuyrukta?'✓ Sonucun liderlik tablosuna kaydedildi. En iyi skorun sıralanır.':'Sonuç kaydı tamamlanamadı. Bağlantı geldiğinde yeniden denenecek.';if(body.runId)scoreStatus.set(body.runId,message);if(body.runId&&body.runId!==activeRun)return;const el=document.getElementById('dmLeaderboardStatus');if(el)el.textContent=message;}).catch(()=>{});}return r;};
const oldResult=window.genelSonucEkraniGoster;window.genelSonucEkraniGoster=function(o){if(['dikte','cumle'].includes(o?.oyunKey)){o.siralamaYok=false;o.isim=name();}const r=oldResult.apply(this,arguments);activeRun=o?.runId||'';const card=document.querySelector('#genelSonucOverlay .gso-kart');if(!card)return r;card.classList.add('dm-result-card');const mascot=card.querySelector('.gso-maskot,.gso-avatar,.gso-kus');if(mascot)mascot.innerHTML='<img class="dm-result-papi" src="papi-reward-v2.png" alt="Kutlayan Papi">';else{let p=card.querySelector('.dm-result-papi');if(!p){p=document.createElement('img');p.className='dm-result-papi';p.src='papi-reward-v2.png';p.alt='Kutlayan Papi';card.querySelector('#gsoBaslik')?.before(p);}}
card.querySelector('#dmRewardCards')?.remove();card.querySelector('#dmRewardStatus')?.remove();card.querySelector('#dmLeaderboardStatus')?.remove();card.querySelector('#ekOdulSerit')?.remove();const xp=document.createElement('div');xp.id='dmRewardCards';xp.className='dm-reward-cards';xp.hidden=false;xp.innerHTML='<div><small>KAZANILAN XP</small><strong data-xp>…</strong><div class="dm-earned-track"><i class="dm-earned-fill"></i></div></div><div><small>KAZANILAN ALTIN</small><strong data-gold>…</strong></div>';card.querySelector('.gso-istat')?.before(xp);const status=document.createElement('p');status.id='dmRewardStatus';status.className='dm-result-status';status.setAttribute('role','status');status.textContent=student()?'Ödülün hesabına kaydediliyor…':'Sınıf etkinliği · öğrenci hesabına ödül yazılmaz.';xp.after(status);const lb=document.createElement('p');lb.id='dmLeaderboardStatus';lb.className='dm-result-status';lb.textContent=o?.siralamaYok?'Parkur ilerlemen durak haritasında gösterilir.':scoreStatus.get(activeRun)|| (o?.leaderboardSaved?'✓ Sonucun liderlik tablosuna kaydedildi.':'Sonucun sıralamaya kaydediliyor…');status.after(lb);count(document.getElementById('gsoPuan'),Number(o?.puan)||0);if(['dikte','cumle'].includes(o?.oyunKey)&&student())saveExtraLeaderboard(o);if(!student()){count(xp.querySelector('[data-xp]'),0,'+');count(xp.querySelector('[data-gold]'),0,'+');}return r;};window.genelSonucEkraniGoster._oc=oldResult._oc;
async function saveExtraLeaderboard(o){const run=o.runId,s=o.rewardScope||scope(o.oyunKey);try{const r=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:o.oyunKey+'LiderlikKaydet',isim:name(),runId:run,sinif:s.classNo+'. Sınıf',unite:s.units.join(','),dogru:o.dogru,yanlis:o.yanlis,puan:o.puan,puanTemel:o.temelPuan,puanSurum:3,suresaniye:o.sureSaniye})});const d=await r.json();if(!r.ok||d.status!=='success')return;const list=await fetch(apiURL+'?islem='+o.oyunKey+'LiderlikTumunuGetir&sinif='+encodeURIComponent(s.classNo+'. Sınıf')+'&donem=hafta&puanSurum=3&_='+Date.now()).then(r=>r.json());if(activeRun===run)window.genelSonucSiralamaCiz?.(Array.isArray(list)?list:list.liste||[],name());}catch{if(activeRun===run){const e=document.getElementById('dmLeaderboardStatus');if(e)e.textContent='Sıralama bağlantısı tamamlanamadı. Sonucun tekrar denenecek.';}}}
window.genelKomboGoster=function(n){if(!n||n%5!==0)return;document.querySelector('.dm-combo-celebration')?.remove();window.genelSesEfektiCal?.('kombo',n);const e=document.createElement('div');e.className='dm-combo-celebration';e.setAttribute('role','status');e.innerHTML='<div class="dm-combo-orbit"></div><img src="papi-reward-v2.png" alt="Kutlayan Papi"><div><small>HARİKA SERİ!</small><strong>'+n+' KOMBO</strong><span>Papi seninle gurur duyuyor!</span></div>';document.body.append(e);setTimeout(()=>e.remove(),2100);};
// Start speech in the click handler: deferring speak can lose mobile user activation.
function listeningStatus(message){
 const target=document.getElementById('bzD1')?.parentElement||document.querySelector('.yo-dikte-dinle');
 if(!target){if(message)window.yoToast?.(message);return;}
 let el=target.parentElement.querySelector('.dm-listening-status');
 if(!el){el=document.createElement('p');el.className='dm-listening-status';el.setAttribute('role','status');el.style.cssText='font-size:13px;line-height:1.4;color:inherit;margin:8px 0';target.after(el);}
 el.textContent=message;el.hidden=!message;
}
function englishVoice(){
 try{const voices=window.speechSynthesis.getVoices();return voices.find(v=>/^en[-_]US/i.test(v.lang)&&v.localService)||voices.find(v=>/^en/i.test(v.lang)&&v.localService)||voices.find(v=>/^en[-_]US/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||null;}catch{return null;}
}
if('speechSynthesis'in window){englishVoice();window.speechSynthesis.addEventListener?.('voiceschanged',englishVoice);}
// All existing cards, games and lessons use this shared native speech path.
if('speechSynthesis'in window&&typeof window.SpeechSynthesisUtterance==='function'){
 const synth=window.speechSynthesis,nativeSpeak=window.dmNativeSpeechSpeak||synth.speak.bind(synth);
 synth.speak=function(u){
  if(!u||!String(u.text||'').trim())return;
  voiceGeneration++;clearTimeout(speechTimer);const ticket=voiceGeneration;
  try{
   synth.resume();
   if(!/^tr/i.test(u.lang||'')){
    const voice=englishVoice();u.lang=voice?.lang||u.lang||'en-US';u.voice=voice;
   }
   u.volume=1;
   const onstart=u.onstart,onend=u.onend,onerror=u.onerror;let started=false;
   u.onstart=function(e){if(ticket===voiceGeneration){started=true;clearTimeout(speechTimer);listeningStatus('');}onstart?.call(this,e);};
   u.onend=function(e){if(ticket===voiceGeneration)clearTimeout(speechTimer);onend?.call(this,e);};
   u.onerror=function(e){
    if(ticket===voiceGeneration&&!['canceled','interrupted'].includes(e.error)){
     clearTimeout(speechTimer);
     listeningStatus(e.error==='not-allowed'?'Sesi başlatmak için Dinle düğmesine tekrar dokun.':['voice-unavailable','language-unavailable','synthesis-unavailable'].includes(e.error)?'İngilizce okuma sesi bulunamadı. Telefonun metinden sese ayarlarında İngilizce sesini etkinleştirip tekrar dene.':'Ses açılamadı. Telefonun medya sesini kontrol edip Dinle düğmesine tekrar dokun.');
    }
    onerror?.call(this,e);
   };
   window.dmCurrentUtterance=u;listeningStatus('');nativeSpeak(u);
   if(!started)speechTimer=setTimeout(()=>{if(ticket===voiceGeneration&&!started)listeningStatus('Ses başlamadı. Medya sesini ve telefonun İngilizce metinden sese ayarını kontrol edip Dinle düğmesine tekrar dokun.');},4000);
  }catch{listeningStatus('Ses açılamadı. Dinle düğmesine tekrar dokun.');}
 };
}
window.dmListen=function(text,slow=false){
 const value=String(text||'').trim();if(!value)return;
 if(!('speechSynthesis'in window)||typeof window.SpeechSynthesisUtterance!=='function'){listeningStatus('Bu cihazda sesli okuma desteklenmiyor. Chrome ile açıp tekrar dene.');return;}
 const u=new window.SpeechSynthesisUtterance(value);u.lang='en-US';u.rate=slow?.35:.85;u.pitch=1;
 window.speechSynthesis.cancel();window.speechSynthesis.speak(u);
};

window.addEventListener('online',()=>read().forEach(claim));setInterval(()=>{if(navigator.onLine&&student())read().forEach(claim);},15000);
})();
