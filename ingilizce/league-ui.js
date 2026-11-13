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
const empty=()=>({rows:[],visualRows:[],loaded:false,busy:false,error:'',at:0});
let states={weekly:empty(),alltime:empty()};
function reset(){if(owner===who())return;owner=who();epoch++;mode='weekly';selected=null;limit=30;states={weekly:empty(),alltime:empty()};}
function onScreen(){return typeof maSekme!=='undefined'&&maSekme==='lig'&&!(typeof maProfilId!=='undefined'&&maProfilId)&&root.classList.contains('active');}
/* One individual Papi character per bot, cropped from the same parkur badge artwork. */
const virtualAvatarAssets={
 1:{src:'parkur-badges/v2/school-03.webp',col:4,row:0,cols:5,rows:4}, // Şimşek
 2:{src:'parkur-badges/v2/papi-01.webp',col:1,row:1,cols:4,rows:2}, // Roket
 3:{src:'parkur-badges/v2/school-03.webp',col:0,row:1,cols:5,rows:4}, // Ninja
 4:{src:'parkur-badges/v2/school-02.webp',col:2,row:1,cols:4,rows:3}, // Kaptan
 5:{src:'parkur-badges/v2/papi-01.webp',col:2,row:1,cols:4,rows:2}, // Yıldız
 6:{src:'parkur-badges/v2/school-02.webp',col:1,row:2,cols:4,rows:3}, // Turbo
 7:{src:'parkur-badges/v2/papi-01.webp',col:0,row:0,cols:4,rows:2}, // Gezgin
 8:{src:'parkur-badges/v2/papi-01.webp',col:1,row:0,cols:4,rows:2}, // Bilge
 9:{src:'parkur-badges/v2/papi-01.webp',col:3,row:0,cols:4,rows:2}, // Neşeli
 10:{src:'parkur-badges/v2/school-03.webp',col:3,row:3,cols:5,rows:4} // Fırtına
};
function virtualAvatar(bot,size=44){
 const id=Number(bot?.bot_id||String(bot?.id||'').replace('virtual-',''))||1;
 const art=virtualAvatarAssets[id]||virtualAvatarAssets[1];
 const x=art.col/(art.cols-1)*100,y=art.row/(art.rows-1)*100;
 return '<span role="img" aria-label="'+esc(bot?.name||'Papi')+'" class="dm-virtual-papi-img" style="--papi-size:'+size+'px;background-image:url('+art.src+');background-size:'+art.cols*100+'% '+art.rows*100+'%;background-position:'+x+'% '+y+'%"></span>';
}
function avatar(name,size=38,virtual=false){if(virtual)return '<span class="dm-lig-avatar dm-lig-papi" style="--size:'+size+'px">'+virtualAvatar(typeof virtual==='object'?virtual:{name,id:'virtual-1'},size)+'</span>';let html='';try{html=window.karakterSvg?.(name,size)||'';}catch{}
 if(!html){const icon=window.ogrenciMaskotSec?.(name)||'🦜';html='<span aria-hidden="true">'+esc(icon)+'</span>';}
 return '<span class="dm-lig-avatar" style="--size:'+size+'px">'+html+'</span>';
}
function row(p,own=false){return '<button type="button" class="dm-lig-row'+(own?' dm-lig-self':'')+(p.is_virtual?' dm-lig-virtual':'')+'" data-lig-person="'+esc(p.name)+'"'+(p.is_virtual?' data-virtual-rival="true"':'')+'><span class="dm-lig-rank">'+fmt(p.displayRank??p.rank)+'</span>'+avatar(p.name,38,p.is_virtual?p:false)+'<span class="dm-lig-person"><b>'+esc(p.name)+'</b>'+(p.is_virtual?'<small class="dm-lig-virtual-label">Sanal Rakip</small>':'')+(own?'<small>Senin sıralaman'+(mode==='weekly'?' · '+esc(leagues[p.league]?.short||''):'')+'</small>':'')+'</span><strong>'+fmt(p.xp)+' XP</strong>'+(own?'<span aria-hidden="true">›</span>':'')+'</button>';}
function podium(rows,large){const top=rows.slice(0,3);return '<div class="dm-lig-podium '+(large?'dm-lig-podium-large':'dm-lig-podium-cards')+'">'+(large?[1,0,2]:[0,1,2]).map(i=>{
 const p=top[i];if(!p)return '<div class="dm-lig-podium-empty" aria-hidden="true"></div>';
 return '<button type="button" class="dm-lig-place dm-lig-place-'+(i+1)+(p.is_virtual?' dm-lig-virtual':'')+'" data-lig-person="'+esc(p.name)+'"'+(p.is_virtual?' data-virtual-rival="true"':'')+' aria-label="'+(i+1)+'. '+esc(p.name)+', '+fmt(p.xp)+' XP">'+(!large?'<span class="dm-lig-medal">'+['👑','🥈','🥉'][i]+'</span>':'')+avatar(p.name,large?128:60,p.is_virtual?p:false)+(large?'<span class="dm-lig-step"><b>'+ (i+1)+'</b></span>':'')+'<span class="dm-lig-winner"><b>'+esc(p.name)+'</b><strong>'+fmt(p.xp)+' XP</strong>'+(p.is_virtual?'<small class="dm-lig-virtual-label">Sanal Rakip</small>':'')+'</span></button>';
}).join('')+'</div>';}
function journey(rows,me){
 const ownRows=me?rows.filter(p=>p.league===me.league).sort((a,b)=>a.rank-b.rank):[];
 const higher=me?ownRows.filter(p=>p.rank<me.rank).at(-1):null;
 const gap=higher?Math.max(1,Math.trunc(higher.xp)-Math.trunc(me.xp)+1):null;
 const label=higher?'Bir üst sıra için':me?.rank===1?'Zirvedesin!':'İlk adımını at!';
 const value=gap!==null?fmt(gap)+' XP':me?.rank===1?'Harika gidiyorsun':'XP kazanmaya başla';
 return '<section class="dm-lig-journey"><h3>Senin zirve yolculuğun</h3><p>'+(me?'Daha yukarısı seninle mümkün!':'Öğren, puan topla, sıralamaya katıl!')+'</p><div class="dm-lig-gap"><span aria-hidden="true">▂▅▇ ↑</span><span><small>'+label+'</small><b>'+value+'</b></span></div>'+ (me?avatar(me.name,100):'')+'</section>';
}
async function dmVirtualLeagueRows(real){
 const uri='https://nxfqlutulxqzqgwewssd.supabase.co/rest/v1/rpc/dm_virtual_league_entries';
 try{
  const response=await fetch(uri,{method:'POST',headers:{'Content-Type':'application/json',apikey:'sb_publishable_K9h4CnyaL8xb8B98o8aaFw_s9cMikuF'},body:'{}'});
  if(!response.ok)throw Error('virtual league unavailable');
  const data=await response.json();
  const bots=Array.isArray(data)?data.filter(x=>x?.is_virtual===true&&Number.isInteger(x.bot_id)&&x.bot_id>0&&x.bot_id<=10&&leagues[x.league]&&typeof x.name==='string'&&x.name.length<=60&&Number.isFinite(Number(x.xp))).map(x=>({id:'virtual-'+x.bot_id,name:x.name,league:x.league,xp:Math.max(0,Math.trunc(Number(x.xp))),rank:0,is_virtual:true})):[];
  // Qualified real players always stand above practice bots. Bots cannot block the podium.
  for(const code of Object.keys(leagues)){
   const qualified=real.filter(x=>x.league===code&&Number(x.xp)>200).sort((a,b)=>Number(b.xp)-Number(a.xp));
   if(!qualified.length)continue;
   const podiumFloor=Number(qualified[Math.min(2,qualified.length-1)].xp);
   for(const bot of bots.filter(x=>x.league===code))bot.xp=Math.min(bot.xp,Math.max(0,podiumFloor-1));
  }
  const combined=[...real.map(x=>({...x})),...bots];
  for(const league of Object.keys(leagues)){
   combined.filter(x=>x.league===league).sort((a,b)=>Number(b.xp)-Number(a.xp)||Number(!!a.is_virtual)-Number(!!b.is_virtual)||String(a.name).localeCompare(String(b.name),'tr')).forEach((p,i)=>p.displayRank=i+1);
  }
  return combined;
 }catch(e){console.warn('[Lig sanal rakip]',e?.message||e);return [];}
}

const duelGames=[
 {key:'kelime',title:'Kelime Laboratuvarı',gate:'oyun_kelime',min:3,icon:'🔤'},
 {key:'hafiza',title:'Hafıza Sandığı',gate:'oyun_hafiza',min:6,icon:'🧠'},
 {key:'bosluk',title:'Eksik Harf',gate:'oyun_bosluk',min:11,icon:'🔡'},
 {key:'asmaca',title:'Harf Avı',gate:'oyun_asmaca',min:14,icon:'🔍'},
 {key:'jeopardy',title:'Risk Balonları',gate:'oyun_jeopardy',min:22,icon:'🎈'},
 {key:'yagmur',title:'Hız Fırtınası',gate:'oyun_yagmur',min:28,icon:'🌪️'}
];
const papiImg='<img src="friends-assets/papi-fencer.webp" alt="Diji Medu maskotu Papi" class="dm-lig-duel-papi">';
const duelApi='https://nxfqlutulxqzqgwewssd.supabase.co/rest/v1/rpc/';
const duelKey='sb_publishable_K9h4CnyaL8xb8B98o8aaFw_s9cMikuF';
let duelContext=null,duelSheet=null,duelBusy=false;
async function duelRequest(op,args={}){
 const token=localStorage.getItem('ing_token')||'';
 if(!token)throw Error('Düello için öğrenci hesabına giriş yapmalısın.');
 const response=await fetch(duelApi+op,{method:'POST',headers:{'Content-Type':'application/json',apikey:duelKey},body:JSON.stringify({p_token:token,...args})});
 const data=await response.json();
 if(!response.ok)throw Error('Düello sunucusuna bağlanılamadı.');
 return data;
}
function duelModal(content){
 if(!duelSheet){duelSheet=document.createElement('div');duelSheet.className='dm-lig-duel-overlay';duelSheet.id='dmVirtualDuel';document.body.appendChild(duelSheet);}
 duelSheet.innerHTML='<section class="dm-lig-duel-dialog" role="dialog" aria-modal="true" aria-label="Papi Sanal Düello"><button type="button" class="dm-lig-duel-close" aria-label="Kapat">×</button>'+content+'</section>';
 duelSheet.querySelector('.dm-lig-duel-close').onclick=closeDuelModal;
 duelSheet.onclick=e=>{if(e.target===duelSheet)closeDuelModal();};
 return duelSheet;
}
function closeDuelModal(){duelSheet?.remove();duelSheet=null;duelBusy=false;duelContext=null;}
function duelButton(name,variant='primary'){return '<button type="button" class="dm-lig-duel-action dm-lig-duel-'+variant+'">'+name+'</button>';}
function duelMessage(message){const el=duelSheet?.querySelector('.dm-lig-duel-message');if(el)el.textContent=String(message||'');}
const accessLevel=()=>window.dmProgression?.earlyAccess?.()?40:level();
function openRealDuel(){
 if(accessLevel()<20){window.dmProgression?.require?.('duello');const msg='🔒 Gerçek arkadaş düellosu 20. seviyede açılır (şu an '+level()+'. seviyedesin). Papi rakipleriyle pratik yapabilirsin.';if(duelSheet?.querySelector('.dm-lig-duel-message')){duelMessage(msg);const el=duelSheet.querySelector('.dm-lig-duel-message');el.classList.remove('dm-lig-duel-warn');void el.offsetWidth;el.classList.add('dm-lig-duel-warn');}else window.yoToast?.(msg);return;}
 closeDuelModal();window.dmRealDuelAc?.();
}
function showDuelPlans(message='İki ücretsiz düellonu tamamladın.'){
 const m=duelModal('<div class="dm-lig-duel-hero">'+papiImg+'<h2>Papi ile maceraya devam!</h2><p>'+esc(message)+'</p></div><p>Yeni sanal düellolar için Pro veya Premium planlarını inceleyebilirsin. Satın almak zorunda değilsin; diğer oyunlar açık kalır.</p>'+
 duelButton('Pro ve Premium Paketleri','primary')+duelButton('Gerçek Arkadaşla Düello','secondary')+'<p class="dm-lig-duel-message"></p>');
 m.querySelector('.dm-lig-duel-primary').onclick=()=>{
  if(typeof window.DMSatis?.planlar==='function'){closeDuelModal();window.DMSatis.planlar('sanal-duello');}
  else if(window.dmAndroidBilling?.available&&typeof window.dmAndroidBilling.open==='function'){closeDuelModal();window.dmAndroidBilling.open('sanal-duello');}
  else duelMessage('Satın alma seçenekleri bu platformda henüz kullanılamıyor. Diğer ücretsiz oyunlarla devam edebilirsin.');
 };
 m.querySelector('.dm-lig-duel-secondary').onclick=openRealDuel;
}
async function openVirtualInfo(bot){
 duelContext={bot,run:null,owner:who(),status:null};
 const m=duelModal('<div class="dm-lig-duel-hero">'+papiImg+'<h2>'+esc(bot.name)+'</h2><span class="dm-lig-duel-tag">Sanal Rakip</span></div>'+
 '<p><b>Merhaba! Ben Papi takımından bir antrenman rakibiyim.</b> Gerçek öğrenci değilim. Buradaki XP puanım gerçek lig dereceni, haftalık ödüllerini veya yükselmeni etkilemez.</p>'+
 '<p>İlk denemende kolay, ikinci denemende daha güçlü bir Papi ile yarışacaksın. Sonucu senin cevapların belirler; kimsenin kazanması önceden ayarlanmaz.</p>'+
 '<p class="dm-lig-duel-free">🎁 İlk 2 sanal düello ücretsiz. Kazanırsan en fazla 120 XP ve 50 altın!</p>'+
 duelButton('Sanal Rakiple Düello','primary')+duelButton('Gerçek Arkadaşla Düello','secondary')+'<p class="dm-lig-duel-message" aria-live="polite">Hakların kontrol ediliyor…</p>');
 m.querySelector('.dm-lig-duel-primary').onclick=()=>openVirtualGames(bot);
 m.querySelector('.dm-lig-duel-secondary').onclick=openRealDuel;
 try{
  const status=await duelRequest('dm_virtual_duel_status');
  if(!duelContext||duelContext.bot.id!==bot.id||duelContext.owner!==who())return;
  if(!status.ok)throw Error(status.message||'Düello bilgileri alınamadı.');
  duelContext.status=status;
  duelMessage(status.freeRemaining>0?'Ücretsiz düello hakkın: '+status.freeRemaining+'/2':status.allowed?'Ücretsiz hakların tamamlandı. Mevcut planınla devam edebilirsin.':'Ücretsiz hakların tamamlandı. Yeni düellolar için paketleri inceleyebilirsin.');
 }catch(e){duelMessage(e.message||'Haklar kontrol edilemedi.');}
}
function openVirtualGames(bot){
 if(!duelContext||duelContext.owner!==who())return;
 if(duelContext.status&&!duelContext.status.allowed)return showDuelPlans();
 const available=duelGames.filter(g=>accessLevel()>=g.min&&window.dmProgression?.allowed?.(g.gate)!==false);
 const content='<div class="dm-lig-duel-hero">'+papiImg+'<h2>Oyununu Seç!</h2><p>'+esc(bot.name)+' seni bekliyor.</p></div>'+
 '<p>Açık tek kişilik oyunlarının kısa düello sürümlerinden birini seç. İki yarışmacının ilerlemesini aynı anda göreceksin.</p>'+
 '<div class="dm-lig-duel-games">'+available.map(g=>'<button type="button" data-virtual-game="'+g.key+'"><b>'+g.icon+' '+esc(g.title)+'</b><small>Düello sürümü</small></button>').join('')+'</div>'+
 '<p class="dm-lig-duel-message" aria-live="polite"></p>';
 const m=duelModal(content);
 m.querySelectorAll('[data-virtual-game]').forEach(b=>b.onclick=()=>void beginVirtualDuel(bot,b.dataset.virtualGame));
}
async function beginVirtualDuel(bot,key){return beginNativeVirtualDuel(bot,key);}
async function beginLegacyVirtualDuel(bot,key){
 if(duelBusy)return;duelBusy=true;
 try{
  duelMessage('Düello başlatılıyor…');
  const resuming=!!duelContext?.status?.activeRun;
  const d=resuming?await duelRequest('dm_virtual_duel_resume'):await duelRequest('dm_virtual_duel_start',{p_bot:Number(bot.id.replace('virtual-','')),p_game:key});
  if(d.paywall){duelBusy=false;return showDuelPlans(d.message);}
  if(!d.ok)throw Error(d.message||'Düello başlatılamadı.');
  if(!duelContext||duelContext.owner!==who())return;
  duelContext.run=d.runId;duelContext.game=duelGames.find(g=>g.key===(d.game||key));
  if(resuming){const original=states.weekly.visualRows.find(p=>p.id==='virtual-'+d.botId);if(original)duelContext.bot=original;}
  duelContext.difficulty=d.difficulty;
  displayDuelQuestion(d);
 }catch(e){duelMessage(e.message||'Oyun başlatılamadı.');}
 finally{duelBusy=false;}
}
function duelScores(d){
 return '<div class="dm-lig-duel-scores"><div><b>👤 Sen</b><strong>'+fmt(d.yourScore||0)+' / 6</strong><span class="dm-lig-duel-track"><i style="width:'+Math.min(100,Number(d.yourScore||0)/6*100)+'%"></i></span></div>'+
 '<span class="dm-lig-duel-versus">VS</span><div>'+papiImg+'<b>Papi</b><strong>'+fmt(d.botScore||0)+' / 6</strong><span class="dm-lig-duel-track"><i style="width:'+Math.min(100,Number(d.botScore||0)/6*100)+'%"></i></span></div></div>';
}
function displayDuelQuestion(d){
 if(!duelContext||!duelContext.run)return;
 const q=d.question;if(!q||!Array.isArray(q.options))return;
 const modeText=duelContext.difficulty==='easy'?'Kolay rakip':'Güçlü rakip';
 const m=duelModal('<div class="dm-lig-duel-head"><h2>'+esc(duelContext.game?.title||'Sanal Düello')+'</h2><span>'+modeText+'</span></div>'+
 duelScores(d)+'<p class="dm-lig-duel-step">Soru '+(Number(d.step)+1)+' / 6</p>'+
 '<h3 class="dm-lig-duel-word">'+esc(q.english)+'</h3><p>Doğru Türkçe anlamı seç!</p>'+
 '<div class="dm-lig-duel-options">'+q.options.map((a,i)=>'<button type="button" data-virtual-answer="'+i+'">'+esc(a)+'</button>').join('')+'</div>'+
 '<p class="dm-lig-duel-message" aria-live="polite"></p>');
 m.querySelectorAll('[data-virtual-answer]').forEach(b=>b.onclick=()=>void answerVirtualDuel(Number(b.dataset.virtualAnswer)));
}
async function answerVirtualDuel(choice){
 if(duelBusy||!duelContext?.run)return;duelBusy=true;
 const m=duelSheet;m?.querySelectorAll('[data-virtual-answer]').forEach(b=>b.disabled=true);
 try{
  const d=await duelRequest('dm_virtual_duel_answer',{p_run:duelContext.run,p_choice:choice});
  if(!d.ok)throw Error(d.message||'Cevap kaydedilemedi.');
  duelMessage(d.correct?'Harika, doğru cevap!':'Doğru cevap: '+(d.rightAnswer||''));
  if(d.finished){
   duelContext.run=null;
   setTimeout(()=>{if(duelSheet===m){showDuelResult(d);document.dispatchEvent(new Event('dm:state'));}},600);
  }else{
   setTimeout(()=>{if(duelSheet===m)displayDuelQuestion(d);},600);
  }
 }catch(e){duelMessage(e.message||'Cevap gönderilemedi.');m?.querySelectorAll('[data-virtual-answer]').forEach(b=>b.disabled=false);}
 finally{duelBusy=false;}
}
function showDuelResult(d){
 const bot=duelContext?.bot;
 const m=duelModal('<div class="dm-lig-duel-hero">'+papiImg+'<h2>'+(d.won?'Düelloyu kazandın!':'Güzel mücadele!')+'</h2><p>'+(d.won?'Tebrikler! Papi ile pratik yapmak harika gidiyor.':'Papi bu tur güçlüydü. İstersen yine pratik yapabilirsin.')+'</p></div>'+
 duelScores({...d,step:6})+'<div class="dm-lig-duel-rewards"><b>+'+fmt(d.xp||0)+' XP</b><b>+'+fmt(d.gold||0)+' altın</b></div>'+
 '<p>Sonuç, verdiğin gerçek cevaplarla hesaplandı. Sanal Papi haftalık lig ödüllerini etkilemez.</p>'+duelButton('Tamam','primary'));
 m.querySelector('.dm-lig-duel-primary').onclick=()=>{closeDuelModal();};
}


/* Native Papi match: the real selected solo game's own screen and verified reward result. */
const nativeGameConfig={
 kelime:{opener:'kelimeYarismasiAc',root:'kelimeYarismaOverlay',score:'ky'},
 hafiza:{opener:'hafizaOyunAc',root:'hafizaOyunOverlay',score:'hafiza'},
 bosluk:{opener:'boslukOyunAc',root:'boslukOyunOverlay',score:'bosluk'},
 asmaca:{opener:'asmacaOyunAc',root:'asmacaOyunOverlay',score:'asmaca'},
 jeopardy:{opener:'jpOyunAc',root:'jpOyunOverlay',score:'jp'},
 yagmur:{opener:'yagmurOyunAc',root:'yagmurOyunOverlay',score:'yagmur'}
};
let nativeDuel=null,nativeTicker=null;
function stopNativeHud(){if(nativeTicker)clearInterval(nativeTicker);nativeTicker=null;document.getElementById('dmVirtualNativeHud')?.remove();}
function nativeHudTick(){
 const d=nativeDuel;
 if(!d||d.owner!==who()){stopNativeHud();nativeDuel=null;return;}
 const overlay=document.getElementById(d.config.root);
 if(!overlay||overlay.style.display==='none'||getComputedStyle(overlay).display==='none'){const h=document.getElementById('dmVirtualNativeHud');if(h)h.hidden=true;return;}
 let hud=document.getElementById('dmVirtualNativeHud');
 if(!hud){
  hud=document.createElement('div');hud.id='dmVirtualNativeHud';hud.className='dm-native-duel-hud';
  hud.innerHTML='<div class="dm-native-side"><strong>Sen</strong><b data-player-value>Oyun devam ediyor</b><span class="dm-native-track"><i data-player-bar></i></span></div>'+
   '<b class="dm-native-versus">VS</b><div class="dm-native-side dm-native-duel-bot">'+virtualAvatar(d.bot,28)+'<strong>'+esc(d.bot.name)+'</strong><b data-bot-value>0 XP</b><span class="dm-native-track"><i data-bot-bar></i></span></div>'+
   '<small class="dm-native-note">Papi sanal rakiptir · gerçek lig ödüllerini etkilemez</small>';
  overlay.appendChild(hud);
 }
 hud.hidden=false;
 const active=window.OC?.aktif;
 if(active?.oyun===d.config.score&&!active.bitti){
  d.started=true;
  const good=Number(active.dogru||0),bad=Number(active.yanlis||0),total=good+bad;
  hud.querySelector('[data-player-value]').textContent=total>0?good+' doğru':'Oyun devam ediyor';
  hud.querySelector('[data-player-bar]').style.width=Math.min(100,good/Math.max(6,total)*100)+'%';
 }
 if(d.started&&!d.finished&&!active?.pauseAt){
  const elapsed=Math.max(0,(Date.now()-d.playAt)/1000);
  const target=d.difficulty==='easy'?25:70;
  const value=Math.round(target*Math.min(1,elapsed/(d.difficulty==='easy'?85:65)));
  hud.querySelector('[data-bot-value]').textContent=value+' XP';
  hud.querySelector('[data-bot-bar]').style.width=Math.min(100,value/120*100)+'%';
 }
}
async function openVirtualDirect(bot){
 if(!bot?.is_virtual)return;
 duelContext={bot,owner:who(),status:null,run:null};
 const m=duelModal('<div class="dm-lig-duel-hero">'+virtualAvatar(bot,80)+'<h2>'+esc(bot.name)+'</h2><span class="dm-lig-duel-tag">Sanal Rakip</span></div>'+
 '<p>Bu Papi gerçek bir öğrenci değildir. Lig ödüllerini ve yükselmeni etkilemez. Kendi oyununda Papi ile karşılaş!</p>'+
 '<p class="dm-lig-duel-free">İlk düellon kolay, ikincisi zorlu · 2 ücretsiz hak · Kazanırsan en fazla 120 XP ve 50 altın</p>'+
 '<p class="dm-lig-duel-message" aria-live="polite">Oyunlar hazırlanıyor…</p>');
 try{
  const status=await duelRequest('dm_virtual_duel_status');
  if(!duelContext||duelContext.owner!==who()||duelContext.bot.id!==bot.id||duelSheet!==m)return;
  if(!status.ok)throw Error(status.message||'Düello bilgileri yüklenemedi.');
  duelContext.status=status;
  if(!status.allowed)return showDuelPlans();
  openVirtualGames(bot);
 }catch(e){duelMessage(e.message||'Düello açılamadı.');}
}
async function openVirtualSelection(){
 let bots=states.weekly.visualRows.filter(p=>p.is_virtual);
 if(!bots.length){
  try{const res=await fetch(duelApi+'dm_virtual_league_entries',{method:'POST',headers:{'Content-Type':'application/json',apikey:duelKey},body:'{}'});
   if(!res.ok)throw Error('Rakip listesi yüklenemedi.');
   const rows=await res.json();
   bots=rows.filter(p=>p.is_virtual===true&&p.bot_id>=1&&p.bot_id<=10).map(p=>({id:'virtual-'+p.bot_id,name:p.name,is_virtual:true,league:p.league,xp:p.xp}));
  }catch(e){window.yoToast?.(e.message);return;}
 }
 const m=duelModal('<h2>Papi Rakibini Seç</h2><p>10 sanal rakipten birini seç. Hepsi gerçek lig sıralamandan bağımsızdır.</p>'+
 '<div class="dm-lig-duel-games dm-virtual-rivals">'+bots.sort((a,b)=>Number(a.id.slice(8))-Number(b.id.slice(8))).map(p=>
 '<button type="button" data-bot-select="'+esc(p.id)+'">'+virtualAvatar(p,56)+'<b>'+esc(p.name)+'</b><small>Sanal rakip</small></button>').join('')+'</div>');
 m.querySelectorAll('[data-bot-select]').forEach(b=>b.onclick=()=>{const p=bots.find(x=>x.id===b.dataset.botSelect);if(p)void openVirtualDirect(p);});
}
function openDuelChooser(){
 const m=duelModal('<div class="dm-lig-duel-hero"><img src="friends-assets/papi-fencer.webp" class="dm-lig-duel-papi" alt="Papi"><h2>Düello Başlat</h2><p>Nasıl yarışmak istersin?</p></div>'+
 duelButton(accessLevel()<20?'🔒 Gerçek Arkadaşlarla Düello · Sv. 20':'Gerçek Arkadaşlarla Düello','secondary')+duelButton('Papi Sanal Rakipleriyle Oyna','primary')+
 '<p class="dm-lig-duel-message" aria-live="polite">Papi ile ilk 2 düello ücretsiz. Gerçek arkadaş düellosu 20. seviyede açılır.</p>');
 m.querySelector('.dm-lig-duel-secondary').onclick=openRealDuel;
 m.querySelector('.dm-lig-duel-primary').onclick=()=>void openVirtualSelection();
}
async function beginNativeVirtualDuel(bot,key){
 if(duelBusy)return;
 const config=nativeGameConfig[key];if(!config)return duelMessage('Bu oyun henüz düelloya uygun değil.');
 duelBusy=true;
 try{
  duelMessage('Gerçek oyun açılıyor…');
  const d=await duelRequest('dm_virtual_duel_native_start',{p_bot:Number(bot.id.replace('virtual-','')),p_game:key});
  if(d.paywall)return showDuelPlans(d.message);
  if(!d.ok)throw Error(d.message||'Düello başlatılamadı.');
  const activeBot=states.weekly.visualRows.find(p=>p.id==='virtual-'+d.botId)||bot;
  const actualGame=d.game||key,actualConfig=nativeGameConfig[actualGame];
  if(!actualConfig)throw Error('Yarım kalan düellonun oyunu bulunamadı.');
  nativeDuel={owner:who(),bot:activeBot,runId:d.runId,game:actualGame,difficulty:d.difficulty,config:actualConfig,playAt:Date.now(),started:false,finished:false};
  closeDuelModal();stopNativeHud();
  const opener=window[nativeDuel.config.opener];
  if(typeof opener!=='function')throw Error('Bu oyun henüz yüklenemedi.');
  await Promise.resolve(opener());
  nativeDuel.playAt=Date.now();
  nativeTicker=setInterval(nativeHudTick,500);
  nativeHudTick();
 }catch(e){
  stopNativeHud();nativeDuel=null;
  window.yoToast?.(e.message||'Oyun açılamadı.');duelMessage(e.message);
 }finally{duelBusy=false;}
}
document.addEventListener('dm:reward-result',async event=>{
 const d=nativeDuel,proof=event.detail;
 if(!d||d.finished||!proof?.ok||proof.game!==d.config.score||!proof.runId||d.owner!==who()||!d.started)return;
 d.finished=true;stopNativeHud();
 try{
  const result=await duelRequest('dm_virtual_duel_native_complete',{p_duel:d.runId,p_native_run:String(proof.runId)});
  if(!result.ok){d.finished=false;window.yoToast?.(result.message||'Düello sonucu doğrulanamadı.');return;}
  nativeDuel=null;
  if(result.yo){document.dispatchEvent(new Event('dm:state'));window.dmProgression?.refresh?.(true);}
  const m=duelModal('<div class="dm-lig-duel-hero">'+virtualAvatar(d.bot,80)+'<h2>'+(result.won?'Papi\'yi yendin!':'Papi bu kez kazandı!')+'</h2>'+
  '<p>Gerçek oyundaki doğrulanmış performansına göre sonuçlandı.</p></div>'+
  '<div class="dm-lig-duel-rewards"><b>+'+fmt(result.xp||0)+' XP</b><b>+'+fmt(result.gold||0)+' altın</b></div>'+
  '<p>Sanal rakipler gerçek lig sıralamanı etkilemez.</p>'+duelButton('Tamam','primary'));
  m.querySelector('.dm-lig-duel-primary').onclick=closeDuelModal;
 }catch(e){d.finished=false;window.yoToast?.(e.message||'Düello sonucu alınamadı.');}
});

function weeklyPreview(){
 reset();
 const state=states.weekly,me=(state.visualRows.length?state.visualRows:state.rows).find(p=>norm(p.name)===norm(who()));
 const code=me?.league||'yerel';
 return {title:leagues[code]?.name||leagues.yerel.name,me,
  top:(state.visualRows.length?state.visualRows:state.rows).filter(p=>p.league===code).sort((a,b)=>(a.displayRank??a.rank)-(b.displayRank??b.rank)).slice(0,3),
  loaded:state.loaded,error:state.error};
}
function render(){reset();if(mode==='alltime'&&accessLevel()<15)mode='weekly';
 const state=states[mode],me=(mode==='weekly'&&state.visualRows.length?state.visualRows:state.rows).find(p=>norm(p.name)===norm(who()));
 let code=selected||me?.league||'yerel';if(!leagues[code]||accessLevel()<leagues[code].level)code='yerel';
 const rows=mode==='alltime'?state.rows:[...(state.visualRows.length?state.visualRows:state.rows)].filter(p=>p.league===code).sort((a,b)=>(a.displayRank??a.rank)-(b.displayRank??b.rank));
 const title=mode==='alltime'?'Efsaneler Ligi':leagues[code].name;
 const tabs='<nav class="dm-lig-period" aria-label="Sıralama dönemi"><button type="button" data-lig-mode="weekly" aria-pressed="'+(mode==='weekly')+'">Haftalık</button><button type="button" data-lig-mode="alltime" aria-pressed="'+(mode==='alltime')+'" aria-disabled="'+(accessLevel()<15)+'" data-dm-league-level="15">'+(accessLevel()<15?'🔒 ':'')+'Tüm Zamanlar'+(accessLevel()<15?'<small>15. seviye</small>':'')+'</button></nav>';
 const choices=mode==='weekly'?'<nav class="dm-lig-choices" aria-label="Haftalık ligler">'+Object.entries(leagues).map(([k,l])=>'<button type="button" data-lig-code="'+k+'" data-dm-league-level="'+l.level+'" aria-disabled="'+(accessLevel()<l.level)+'" aria-pressed="'+(k===code)+'">'+l.icon+' '+l.short+(accessLevel()<l.level?'<small>🔒 '+l.level+'. seviye</small>':'')+'</button>').join('')+'</nav>':'';
 let content='';
 if(!state.loaded&&state.busy)content='<p class="dm-lig-message" role="status">Sıralama yükleniyor…</p>';
 else if(state.error&&!state.loaded)content='<p class="dm-lig-message" role="alert">Sıralama yüklenemedi. <button type="button" data-lig-retry>Yeniden dene</button></p>';
 else content=(mode==='weekly'?journey(state.rows,me):'')+(rows.length?podium(rows,mode==='alltime')+'<div class="dm-lig-list">'+rows.slice(3,limit).map(p=>row(p)).join('')+'</div>'+(rows.length>limit?'<button type="button" class="dm-lig-more" data-lig-more>Diğer öğrencileri göster</button>':''):'<p class="dm-lig-message">'+(mode==='alltime'?'15. seviyeye ulaşan öğrenciler burada sıralanacak.':'Bu ligde henüz öğrenci yok.')+'</p>');
 return '<section class="dm-lig dm-lig-'+mode+'" aria-label="'+title+'"><header class="dm-lig-header"><button type="button" data-lig-back aria-label="Arkadaşlara dön">‹</button><h2>'+title+'</h2><img src="friends-assets/papi-league.png" alt="" width="54" height="54"></header><div class="dm-lig-caption"><span>'+(mode==='alltime'?'Toplam XP · Her zaman güncel':'Haftalık yarışma XP’si')+'</span><small>'+(mode==='alltime'?'ⓘ Haftalık sıfırlanmaz':'ⓘ Her pazartesi yeni hafta')+'</small></div>'+tabs+choices+content+(state.error&&state.loaded?'<p role="status" class="dm-lig-message">Güncelleme alınamadı. Son sıralama gösteriliyor. <button type="button" data-lig-retry>Yenile</button></p>':'')+(me?'<aside class="dm-lig-my-place" aria-label="Senin sıralaman">'+row(me,true)+'</aside>':'')+(mode==='weekly'?'<details class="dm-lig-rules"><summary>Lig kuralları ve haftalık ödüller</summary><p>Yerel Lig 5. seviyede açılır. Süper Lig için 10. seviye ve haftalık 750 yarışma XP’si; Şampiyonlar Ligi için 15. seviye ve haftalık 1800 yarışma XP’si gerekir. Joker ve günlük çarpanlar yarışma XP’sine eklenmez. Katılım her hafta yeniden değerlendirilir.</p><p>Şampiyonlar Ligi ilk 10 altın ödülleri: 500, 350, 250, 180, 140, 110, 90, 75, 60, 50. Süper Lig ilk iki: 30 ve 20 altın. Yerel Lig: katılım rozeti. Sonuçlar pazartesi 00.05’te kesinleşir; ödül ilk girişte bir kez eklenir.</p></details>':'<p class="dm-lig-footnote">15. seviyeden itibaren · Güncel toplam XP · Haftalık sıfırlanmaz</p>')+'</section>';
}
function draw(){if(!onScreen())return;const old=root.querySelector('.dm-lig');if(old)old.outerHTML=render();}
async function load(force=false,scope=mode){reset();const state=states[scope];if(state.busy||!force&&Date.now()-state.at<60000)return;
 if(scope==='alltime'&&accessLevel()<15)return;const ticket=epoch,account=who();state.busy=true;state.error='';draw();
 try{const result=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:'seviyeLigListesi',kapsam:scope,ogrenci:account,t:localStorage.getItem('ing_token')||'',...(force?{_:Date.now()}:{})})});const d=await result.json();
  if(!result.ok||d.ok===false||!Array.isArray(d.liste)||scope==='alltime'&&d.kapsam!=='alltime')throw Error('Lig verisi alınamadı.');
  if(account!==who()||ticket!==epoch)return;
  state.rows=d.liste;state.visualRows=scope==='weekly'?await dmVirtualLeagueRows(d.liste):[];state.loaded=true;state.at=Date.now();
 }catch(e){if(account===who()&&ticket===epoch)state.error=String(e.message||'Güncellenemedi');}
 finally{if(account===who()&&ticket===epoch){state.busy=false;draw();if(scope==='weekly')root.dispatchEvent(new Event('dm:weekly-league'));}}
}
window.maLigHtml=function(){reset();if(!states[mode].busy&&Date.now()-states[mode].at>=60000)queueMicrotask(()=>{if(onScreen())load();});return render();};
root.addEventListener('click',e=>{
 const b=e.target.closest('[data-lig-mode],[data-lig-code],[data-lig-person],[data-lig-back],[data-lig-more],[data-lig-retry]');if(!b)return;
 if(b.hasAttribute('data-lig-back'))return window.maSekmeSec?.('hub');
 if(b.hasAttribute('data-lig-person')){if(b.hasAttribute('data-virtual-rival')){const bot=states.weekly.visualRows.find(p=>p.is_virtual&&p.name===b.dataset.ligPerson);if(bot)void openVirtualDirect(bot);return;}return window.maAkisKisiAc?.(b.dataset.ligPerson);}
 if(b.hasAttribute('data-lig-mode')){if(b.dataset.ligMode==='alltime'&&accessLevel()<15){window.yoToast?.('🔒 Efsaneler Ligi 15. seviyede açılır.');return;}mode=b.dataset.ligMode;limit=30;draw();void load();return;}
 if(b.hasAttribute('data-lig-code')){const k=b.dataset.ligCode;if(accessLevel()<leagues[k].level)return;selected=k;limit=30;draw();return;}
 if(b.hasAttribute('data-lig-more')){limit+=30;draw();return;}
 if(b.hasAttribute('data-lig-retry'))void load(true);
});
document.addEventListener('dm:login',()=>{owner='';reset();});
document.addEventListener('dm:progression-status',()=>{if(onScreen())draw();});
document.addEventListener('dm:state',()=>{for(const state of Object.values(states))state.at=0;if(onScreen())void load();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&onScreen())void load();});
setInterval(()=>{if(!document.hidden&&onScreen())void load();},180000); // [Kota] 1 dk -> 3 dk
window.dmLeagueUI={refresh:()=>load(true),render,weeklyPreview,openVirtualDirect,openVirtualSelection,openDuelChooser,virtualAvatar,refreshWeekly:()=>load(false,'weekly'),openWeekly:()=>{mode='weekly';selected=null;limit=30;window.maSekmeSec?.('lig');}};
})();
