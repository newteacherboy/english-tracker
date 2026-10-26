/* Diji-Medu: one account-selected route, using the existing two progress engines. */
(()=>{'use strict';
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const Y=()=>typeof yo!=='undefined'&&yo?yo:null,who=()=>typeof aktifOgrenciAdi!=='undefined'?String(aktifOgrenciAdi||''):'';
const img=(name,cls='')=>'<img class="'+cls+'" src="route-assets/'+name+'" alt="" decoding="async">';
const art=(name,cls='')=>img(name+'.svg',cls);
const tell=m=>window.yoToast?.(m);
let preview=null,latest=null,epoch=0,sceneOwner='';
/* 1–8. sınıf öğrencileri Öğrenme Yolu'na seviye testinden sonra geçer (sunucu: startPath.learningRoute). */
const learningNeedsTest=()=>window.dmProgression?.status?.()?.startPath?.learningRoute==='needs-test';
function purpose(){if(preview)return preview;return Y()?.dmLearningPurpose==='independent'&&!learningNeedsTest()?'independent':'school';}
/* Öğrenme Yolu'nu seçmiş ama (kural sonrası) testi olmayan sınıf öğrencileri: uygulamaya girince
   seçim Okul Yolum olarak kaydedilir ve doğrudan Macera parkuru açılır. Öbür tarafa geçmek isteyen testi çözer. */
let learningRedirectOwner='';
document.addEventListener('dm:progression-status',async()=>{const owner=who();if(!owner||learningRedirectOwner===owner||Y()?.dmLearningPurpose!=='independent'||!learningNeedsTest())return;learningRedirectOwner=owner;
 const ok=await setPurpose('school',{reopen:true});
 if(ok&&owner===who())tell('Okul Yolum’dasın. Öğrenme Yolu’na geçmek için önce 24 soruluk seviye testini çözmelisin.');
});
function askLearningTest(){
 // Zorunlu: Öğrenme Yolu'na geçmek isteyen sınıf öğrencisine doğrudan seviye testi açılır.
 const owner=who(),done=()=>{document.removeEventListener('dm:start-point-chosen',chosen);};
 const chosen=e=>{if(e.detail?.owner&&e.detail.owner!==owner)return;done();document.addEventListener('dm:progression-status',()=>{if(owner===who()&&!learningNeedsTest())setPurpose('independent');},{once:true});window.dmProgression?.refresh?.(true);};
 document.addEventListener('dm:start-point-chosen',chosen);
 const v=window.dmStartPlacement?.open?.({source:'learning-route'});
 if(!v){done();tell('Öğrenme Yolu için önce seviye testini çözmen gerekiyor. Test şu an açılamadı; Profil › Seviye Testi’nden deneyebilirsin.');}
}
function week(){const d=new Date(Date.now()+10800000);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
function heading(o={}){return '<header class="rt-top"><h1>'+ (purpose()==='school'?'Okul Yolum':'Öğrenme Yolum')+'</h1><div class="rt-wallet"><button type="button" data-rt-wallet="energy" aria-label="Enerji bilgileri">⚡ <b data-dm-energy>'+esc(o.energy??'–')+'</b></button><button type="button" data-rt-wallet="gold" aria-label="Mağaza ve altın">🪙 <b data-dm-gold>'+esc(o.gold??Y()?.altin??0)+'</b></button></div></header>';}
let weeklyClaimOwner='',weeklyError='';
function weekly(){return window.dmRouteMissions?.markup('weekly')||'<section class="rt-week rt-card"><p>Haftalık görevler hazırlanıyor…</p></section>';}

async function claimWeekly(){const owner=who();if(!owner||weeklyClaimOwner)return;weeklyClaimOwner=owner;weeklyError='';refreshCards();try{
 const r=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:'haftalikHedefOdulAl',ogrenci:owner,t:localStorage.getItem('ing_token')||''})}),d=await r.json();if(!r.ok||!d.ok||!d.haftaHedef)throw Error(d.mesaj||d.message||'Ödül şu an alınamadı. Tekrar dene.');if(owner!==who())return;
 if(d.yo&&window.dmApplyRewardState)window.dmApplyRewardState(d.yo,owner);else if(Number.isFinite(Number(d.altin)))Y().altin=Number(d.altin);
 Y().haftaHedef=d.haftaHedef;window.yoKaydet?.();if(d.newlyAwarded)tell('🎉 Hedef tamamlandı! +'+(d.awardedGold||0)+' altın');
 }catch(e){if(owner===who())weeklyError=e.message;}finally{if(weeklyClaimOwner===owner)weeklyClaimOwner='';if(owner===who())refreshCards();}}

function tasks(){return window.dmRouteMissions?.markup('daily')||'<section class="rt-tasks rt-card"><p>Günlük görevler hazırlanıyor…</p></section>';}

function schoolInfo(s){const label=String(s?.label||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i'),grade=/(\d+)\.\s*sinif/.exec(label),unit=/(\d+)\.\s*unite/.exec(label),part=/·\s*(\d+)\s*\/\s*(\d+)/.exec(label);const explicit=Number(s?.classNo??s?.sinif??s?.grade),parsed=Number(grade?.[1]),encoded=Math.floor((Number(s?.no)-200000)/10000);return {grade:[explicit,parsed,encoded].find(n=>Number.isInteger(n)&&n>=1&&n<=8)||1,unit:s?.unitNo??s?.unite??unit?.[1]??'Karışık',part:Number(s?.part??part?.[1]??1),count:Number(part?.[2]||1)};}

function node(s,i,current,learn){
 const state=s.done?'done':s.current||i===current?'current':s.available?'open':'locked',label=learn?s.cefr+' · '+s.title:s.label;
 const attrs=learn?'data-rt="chapter" data-chapter="'+s.id+'"':'data-rt="school-stop" data-b="'+s.b+'" data-d="'+s.d+'"';
 const visual=learn?(state==='current'?icon('play'):icon(['book','chat','bulb','atom','leaf'][i%5])):'<b class="rt-tile-number">'+routeNumber(s,i,false)+'</b>'+(state==='locked'?'<i class="rt-tile-lock">'+icon('lock')+'</i>':'');
 return '<button type="button" class="rt-node '+state+(learn?'':' dm-adventure-node')+'" '+attrs+' aria-label="'+esc((label||'Bölüm')+(state==='done'?', tamamlandı':state==='current'?', sıradaki':state==='locked'?', kilitli':', açık'))+'" '+(!s.available?'disabled':'')+' '+(state==='current'?'aria-current="step"':'')+'><span class="rt-tile-art" aria-hidden="true">'+visual+'</span></button>';
}
function chestReady(){return (window.dmActiveTime?.unclaimed?.().length||0)>0||Object.values(window.dmProgression?.status?.()?.chests||{}).some(state=>state==='ready');}
function chestMarkup(){const ready=chestReady();return '<button type="button" class="rt-map-chest'+(ready?' is-ready':'')+'" data-rt="chests" aria-label="'+(ready?'Kazandığın sandığı aç':'Parkur sandıklarını göster')+'">'+img('chest-three.svg','rt-chest-art')+'<span class="rt-v3-chest-label">Sandık</span><span class="rt-chest-open"'+(ready?'':' hidden')+'>AÇ</span></button>';}
/* Harita yan kartlarındaki rozetler: Planım bitmediyse kırmızı 1, Görevler bitmediyse kırmızı nokta,
   alınacak görev ödülü varsa yeşil sayı, açılacak sandık varsa yeşil sayı. */
function toolBadge(button,kind,text,label){if(!button)return;let b=button.querySelector(':scope>.rt-tool-badge');if(!kind){b?.remove();button.removeAttribute('data-badge');return;}
 if(!b){b=document.createElement('span');b.className='rt-tool-badge';button.append(b);}b.className='rt-tool-badge is-'+kind+(text?'':' is-dot');b.textContent=text;b.setAttribute('aria-label',label);b.setAttribute('role','status');button.dataset.badge=kind;}
function paintToolBadges(){
 const plan=window.dmLearningCompanion?.planState?.(),missions=window.dmRouteMissions?.badge?.(),chests=Object.values(window.dmProgression?.status?.()?.chests||{}).filter(state=>state==='ready').length+(window.dmActiveTime?.unclaimed?.().length||0);
 document.querySelectorAll('.rt-v3-tools').forEach(tools=>{
  const p=tools.querySelector('[data-rt="plan"]'),m=tools.querySelector('[data-rt="missions"]'),c=tools.querySelector('[data-rt="chests"]');
  toolBadge(p,plan&&plan.done<plan.total?'red':'',plan&&plan.done<plan.total?'1':'','Bugünkü planın tamamlanmadı');
  if(missions?.claimable)toolBadge(m,'green',String(missions.claimable),missions.claimable+' görev ödülü alınmayı bekliyor');
  else toolBadge(m,missions?.open?'red':'','','Tamamlanmamış görevlerin var');
  toolBadge(c,chests?'green':'',chests?String(chests):'',chests+' sandık açılmayı bekliyor');
  const open=c?.querySelector('.rt-chest-open');if(open)open.hidden=true;
 });
}
if(typeof document!=='undefined'&&typeof document.createElement==='function'&&document.head&&!document.getElementById('rtToolBadgeStyle')){const st=document.createElement('style');st.id='rtToolBadgeStyle';st.textContent='body #tab-dunya .rt-v3-tools>button .rt-tool-badge{position:absolute;top:-7px;right:6px;min-width:22px;height:22px;padding:0 6px;box-sizing:border-box;border-radius:11px;display:flex;align-items:center;justify-content:center;font:800 12px/1 system-ui,sans-serif;color:#fff;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.18);z-index:2;pointer-events:none}body #tab-dunya .rt-v3-tools>button .rt-tool-badge.is-red{background:#e5484d}body #tab-dunya .rt-v3-tools>button .rt-tool-badge.is-green{background:#1f9d55}body #tab-dunya .rt-v3-tools>button .rt-tool-badge.is-dot{min-width:14px;width:14px;height:14px;padding:0;top:-4px;right:10px}';document.head.append(st);}
if(typeof setInterval==='function')setInterval(()=>{if(!document.hidden&&document.querySelector('.rt-v3-tools'))paintToolBadges();},2000);
window.dmPaintToolBadges=paintToolBadges;
function paintChests(){const ready=chestReady();document.querySelectorAll('.rt-map-chest').forEach(b=>{b.classList.toggle('is-ready',ready);b.setAttribute('aria-label',ready?'Kazandığın sandığı aç':'Parkur sandıklarını göster');const label=b.querySelector('.rt-chest-open');if(label)label.hidden=true;});paintToolBadges();}
document.addEventListener('dm:time',paintChests);
async function refreshChests(){await window.dmProgression?.refresh?.(true);paintChests();}
function routeTitle(s,learn){
 if(learn)return String(s?.title||'Öğrenme durağı').replace(/^\d+\.\s*Durak\s*·\s*/i,'');
 return window.dmParkurDurakAdi?.(s.b,s.d)||('Kelime çalışması · '+schoolInfo(s).part);
}
function routeNumber(s,i,learn){if(learn)return Number(/^([0-9]+)\./.exec(s.title||'')?.[1]||i+1);const group=(latest?.allSteps||latest?.steps||[]).filter(x=>schoolInfo(x).grade===schoolInfo(s).grade),at=group.findIndex(x=>x.b===s.b&&x.d===s.d);return at>=0?at+1:Number(s.d??i)+1;}
function routeGroup(s,learn){const info=schoolInfo(s);return learn?(s.theme||s.cefr+' · Öğrenme Yolu'):(info.grade+'. Sınıf · Ünite '+info.unit);}
let routeMap=null,mapSerial=0,mapResize=null;
const ROW=144,TOP=78;
function mapX(i,learn){return (learn?[40,30,40,42,40]:[49,39,49,59,49])[i%5];}
/* Her durağın üstünde başarıya göre 3 yıldız: Okul Yolum yo.baYildiz[durak no], Öğrenme Yolum yo.mlYildiz[bölüm id].
   Kaydı olmayan eski tamamlanmış duraklar en az 1 yıldız gösterir; tamamlanmamış duraklarda yıldızlar boştur. */
function stopStars(step,learn){const y=typeof yo!=='undefined'&&yo?yo:null,saved=Number(learn?y?.mlYildiz?.[step.id]:y?.baYildiz?.[step.no])||0;return step.done?Math.max(1,Math.min(3,saved)):0;}
function starsMarkup(step,learn){const n=stopStars(step,learn);return '<span class="rt-v3-stars'+(n?' is-earned':'')+'" role="img" aria-label="'+n+' / 3 yıldız">'+[0,1,2].map(i=>'<i class="'+(i<n?'on':'')+'">★</i>').join('')+'</span>';}
if(typeof document!=='undefined'&&typeof document.createElement==='function'&&document.head&&!document.getElementById('rtStopStarStyle')){const st=document.createElement('style');st.id='rtStopStarStyle';st.textContent='body #tab-dunya .rt-v3-stop .rt-v3-stars{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);display:flex;gap:1px;pointer-events:none;z-index:3}body #tab-dunya .rt-v3-stop .rt-v3-stars i{font-style:normal;font-size:12px;line-height:1;color:#d9d6e3;text-shadow:0 1px 0 #fff}body #tab-dunya .rt-v3-stop .rt-v3-stars i.on{color:#f5b301;text-shadow:0 1px 0 #b7790033}body #tab-dunya .rt-v3-stop .rt-v3-stars i:nth-child(2){transform:translateY(-3px)}';document.head.append(st);}
function mapRows(map,from,to){
 const {steps,current,learn}=map,visible=steps.slice(from,to),point=i=>[mapX(i,learn),TOP+i*ROW];
 const first=Math.max(0,from-1),last=Math.min(steps.length,to+1);
 const curve=Array.from({length:last-first},(_,k)=>first+k).map((i,k)=>{const [x,y]=point(i),[px,py]=point(i-1);return k?'C'+px+' '+(py+ROW/2)+' '+x+' '+(y-ROW/2)+' '+x+' '+y:'M'+x+' '+y;}).join(' ');
 return '<svg class="rt-flow-trail" viewBox="0 0 100 '+map.height+'" preserveAspectRatio="none" aria-hidden="true"><path d="'+curve+'"/></svg>'+visible.map((step,k)=>{
  const i=from+k,state=step.done?'done':i===current?'current':step.available?'open':'locked',prev=steps[i-1],group=routeGroup(step,learn),boundary=!prev||group!==routeGroup(prev,learn);
  return (boundary?'<div class="rt-flow-theme" style="top:'+(TOP+i*ROW-61)+'px"><b>'+esc(group)+'</b></div>':'')+'<div class="rt-stop rt-v3-stop '+state+'" data-route-index="'+i+'" style="--x:'+mapX(i,learn)+'%;--y:'+(TOP+i*ROW)+'px">'+node(step,i,current,learn)+(learn?'<span class="rt-v3-number" aria-hidden="true">'+routeNumber(step,i,true)+'</span>':'')+(step.done?'<span class="rt-v3-check" aria-hidden="true">✓</span>':'')+starsMarkup(step,learn)+'<span class="rt-stop-label">'+esc(routeTitle(step,learn))+'</span>'+(i===current?'<img class="rt-flow-papi" src="route-assets/'+(learn?'papi-english.webp':'papi-school.webp')+'" alt="Papi">':'')+'</div>';
 }).join('');
}
/* Bilgi Adaları: artwork and live controls are separate layers. All access and
   rewards continue to use the existing school progression engine. */
function islandMarkup(steps,current,learn=false){
 const active=steps[current],all=learn?steps:(latest?.allSteps||steps);
 const focus=learn?current:Math.max(0,all.findIndex(s=>s.b===active?.b&&s.d===active?.d));
 const from=Math.max(0,Math.min(focus-2,all.length-4)),visible=all.slice(from,from+4);
 const info=schoolInfo(active),group=all.filter(s=>learn?s.cefr===active?.cefr:schoolInfo(s).grade===info.grade),done=group.filter(s=>s.done).length;
 routeMap={steps:all,current:focus,learn,key:++mapSerial};
 const slots=learn?[[45.3,73.9,30,6],[68.1,58.9,25,5.2],[54.7,47.4,28,5.4],[67.3,32.6,19,4]]:[[37.3,75.8,24,5.7],[62.6,60.6,21,5.3],[49,47.3,24,5.8],[58.8,31.5,18,4.5]];
 const title=learn?'Öğrenme Yolum · Gökyüzü Akademisi':'Okul Yolum · Bilgi Adaları';
 const target=s=>learn?'data-rt="chapter" data-chapter="'+s.id+'"':'data-rt="school-stop" data-b="'+s.b+'" data-d="'+s.d+'"';
 return '<section class="bi-scene'+(learn?' bi-sky':'')+'" aria-label="'+title+'">'+
 '<h1 class="bi-sr">'+title+'</h1>'+
 '<button type="button" class="bi-progress" data-rt="all" aria-label="Tüm geçmiş ve gelecek bölümler · '+done+' / '+group.length+' durak tamamlandı"><b>'+(learn?esc((active?.cefr||'')+' · '+(active?.theme||active?.title||'Öğrenme Yolum')):info.grade+'. Sınıf · Ünite '+esc(info.unit))+'</b><span><progress value="'+done+'" max="'+Math.max(1,group.length)+'"></progress><strong>'+done+' / '+group.length+'</strong></span></button>'+
 '<div class="bi-world"><div class="bi-stages">'+visible.map((s,k)=>{
 const state=from+k===focus?'current':s.done?'done':s.available?'open':'locked',n=routeNumber(s,from+k,learn),[x,y,w,h]=slots[k];
 return '<div class="bi-stop '+state+'" style="--bi-x:'+x+'%;--bi-y:'+y+'%;--bi-w:'+w+'%;--bi-h:'+h+'%" data-route-index="'+(from+k)+'">'+
 '<button type="button" class="bi-node" '+target(s)+' '+(!s.available?'disabled':'')+' '+(state==='current'?'aria-current="step"':'')+' aria-label="'+esc(n+'. Durak · '+(s.label||s.title||'')+' · '+(s.done?'Tamamlandı':s.available?'Oyna':'Kilitli'))+'"><b>'+n+'</b>'+(s.done?'<i class="bi-check" aria-hidden="true">✓</i>':state==='locked'?'<span class="bi-lock" aria-hidden="true">'+icon('lock')+'</span>':'')+'</button>'+
 (state==='current'?'<img class="bi-mascot" src="route-assets/bilgi-mascot.webp" alt="Maskotun şu anki bölümünde" decoding="async">':'')+'</div>';
 }).join('')+'</div></div>'+
 '<aside class="rt-v3-tools bi-tools" aria-label="Parkur araçları"><button type="button" data-rt="plan" aria-label="Planım · Bugünün dersleri"><img class="bi-tool-icon" src="route-assets/bilgi-icons/calendar.webp" alt="" decoding="async"><span class="bi-sr">Planım</span></button><button type="button" data-rt="missions" aria-label="Günlük ve haftalık görevler"><img class="bi-tool-icon" src="route-assets/bilgi-icons/tasks.webp" alt="" decoding="async"><span class="bi-sr">Görevler</span></button><button type="button" data-rt="chests" aria-label="Parkur sandıklarını göster"><img class="bi-tool-icon" src="route-assets/bilgi-icons/chest.webp" alt="" decoding="async"><span class="bi-sr">Sandık</span></button><button type="button" data-rt="other-route" aria-label="'+(learn?'Okul Yolum’a geç':'Öğrenme Yolum’a geç')+'">'+icon('switch')+'<span class="bi-sr">Parkur değiştir</span></button></aside>'+
 (active?.available?'<button type="button" class="bi-continue" '+(learn?'data-rt="continue"':target(active))+'>Devam et <span aria-hidden="true">➜</span></button>':'<p class="bi-empty" role="status">Parkurun hazırlanıyor…</p>')+'</section>';
}
function pathMarkup(steps,current,learn){
 const active=steps[current],all=learn?steps:(latest?.allSteps||steps);
 const focus=learn?current:Math.max(0,all.findIndex(x=>x.b===active?.b&&x.d===active?.d));
 const group=all.filter(x=>learn?x.cefr===active?.cefr:schoolInfo(x).grade===schoolInfo(active).grade),done=group.filter(x=>x.done).length,total=group.length,info=schoolInfo(active),level=learn?(active?.cefr||'A1'):info.grade+'. Sınıf';
 const map={steps:all,current:focus,learn,key:++mapSerial,height:Math.max(300,TOP+all.length*ROW),from:Math.max(0,focus-5),to:Math.min(all.length,focus+9)};routeMap=map;
 return '<section class="rt-path rt-v3-map" data-route-map="'+map.key+'" aria-label="'+esc(level)+' · Öğrenme durakları"><header class="rt-v3-summary"><button type="button" class="rt-v3-level" data-rt="all" aria-label="'+(learn?'Öğrenme Yolum':'Okul Yolum')+' tüm durakları göster">'+icon('book')+'<span><b>'+esc(level)+(learn?'':' · Ünite '+info.unit)+'</b><small>'+done+' / '+total+' durak tamamlandı</small><progress value="'+done+'" max="'+Math.max(1,total)+'" aria-label="'+esc(level)+' ilerlemesi"></progress></span></button><button type="button" class="rt-v3-switch" data-rt="switch-route" aria-label="Parkur değiştir">'+icon('switch')+'</button></header><div class="rt-v3-canvas"><div class="rt-v3-art" aria-hidden="true"></div><div class="rt-v3-scroll" tabindex="0" role="region" aria-label="'+(learn?'Öğrenme Yolu':'Okul Yolum')+' · tüm durakları kaydırarak keşfet"><div class="rt-flow-world" style="height:'+map.height+'px">'+mapRows(map,map.from,map.to)+'</div></div><aside class="rt-v3-tools" aria-label="Parkur araçları"><button type="button" data-rt="plan">'+icon('calendar')+'<span>Planım</span><small>Bugünün dersleri</small></button><button type="button" data-rt="missions">'+icon('tasks')+'<span>Görevler</span><small>Günlük ve haftalık</small></button>'+chestMarkup()+'</aside></div><div class="rt-continue">'+(active?.available?'<button type="button" class="rt-start '+(learn?'':'dm-map-continue')+'" '+(learn?'data-rt="continue"':'data-rt="school-stop" data-b="'+active.b+'" data-d="'+active.d+'"')+'>'+icon('play')+' Devam et</button>':'<span class="rt-v3-empty">Parkurun hazırlanıyor…</span>')+'</div></section>';
}
function mountScrollable(root){
 const el=root?.querySelector?.('[data-route-map]');if(!el?.querySelector||!routeMap||Number(el.dataset.routeMap)!==routeMap.key)return;
 const map=routeMap,scroll=el.querySelector('.rt-v3-scroll'),world=el.querySelector('.rt-flow-world');if(!scroll||scroll.dataset.bound)return;
 scroll.dataset.bound='1';let queued=false;
 function draw(){queued=false;if(!el.isConnected||map!==routeMap)return;const from=Math.max(0,Math.floor((scroll.scrollTop-TOP)/ROW)-4),to=Math.min(map.steps.length,Math.ceil((scroll.scrollTop+scroll.clientHeight)/ROW)+5);if(from!==map.from||to!==map.to){map.from=from;map.to=to;world.innerHTML=mapRows(map,from,to);}}
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(draw);}
 scroll.addEventListener('scroll',schedule,{passive:true});
 const focus=()=>{if(!el.isConnected||map!==routeMap)return;scroll.scrollTop=Math.max(0,TOP+map.current*ROW-scroll.clientHeight*.45);draw();};
 requestAnimationFrame(focus);mapResize?.disconnect();if(typeof ResizeObserver==='function'){mapResize=new ResizeObserver(schedule);mapResize.observe(scroll);}
}
function icon(name){const paths={play:'M8 4l12 8-12 8z',lock:'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',chat:'M3 4h18v13H9l-6 4zM7 8h10M7 12h6',bulb:'M9 18h6M9 21h6M8 14a7 7 0 1 1 8 0l-1 4H9z',atom:'M12 10v4M10 12h4M3 7c4-7 22 4 18 10S-1 13 3 7M3 17C-1 11 17 0 21 7S7 24 3 17',leaf:'M4 20C1 7 10 2 21 3c0 11-5 19-17 17zM4 20L17 7',book:'M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3zM12 6v15',map:'M3 5l6-2 6 3 6-2v15l-6 2-6-3-6 2zM9 3v15M15 6v15',switch:'M4 7h16l-4-4M20 17H4l4 4',calendar:'M5 5h14v16H5zM8 3v4M16 3v4M5 10h14M9 14h2M14 14h2M9 17h2',tasks:'M9 5H5v16h14V5h-4M9 3h6v5H9zM8 14l2 2 5-5'};return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[name]+'"/></svg>';}
function missionsDialog(period='daily'){
 const view=dialog('Görevlerim','<div class="rt-v3-mission-tabs" role="tablist" aria-label="Görev dönemi"><button type="button" role="tab" aria-selected="true" data-mission-tab="daily">Günlük</button><button type="button" role="tab" aria-selected="false" data-mission-tab="weekly">Haftalık</button></div><div data-mission-panel="daily">'+(window.dmRouteMissions?.passport('daily')||tasks())+'</div><div data-mission-panel="weekly" hidden>'+(window.dmRouteMissions?.passport('weekly')||weekly())+'</div>');
 view.el.classList.add('mp-missions');
 if(period==='weekly'){view.el.querySelectorAll('[data-mission-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.missionTab===period)));view.el.querySelectorAll('[data-mission-panel]').forEach(p=>p.hidden=p.dataset.missionPanel!==period);}
 view.el.addEventListener('click',e=>{const tab=e.target.closest('[data-mission-tab]');if(tab){view.el.querySelectorAll('[data-mission-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===tab)));view.el.querySelectorAll('[data-mission-panel]').forEach(p=>p.hidden=p.dataset.missionPanel!==tab.dataset.missionTab);return;}const task=e.target.closest('[data-rt="task"]');if(task){view.close();runTask(task.dataset.event);}});
}
function runTask(ev){if(ev==='review')window.dmWrongWords?.review?.();else if(['game','oyun','yildiz3'].includes(ev))window.aktivitelerTamEkranAc?.();else if(ev==='ders')window.dersCalisTamEkranAc?.();else window.dmLearningRoute.continue();}
let lastRenderedSchoolGrade=0;
document.addEventListener('dm:progression-status',e=>{const grade=Number(e.detail?.startPath?.startGrade);if(!who()||e.detail?.owner&&e.detail.owner!==who()||!Number.isInteger(grade)||grade<1||grade>8||lastRenderedSchoolGrade===grade||purpose()!=='school'||!document.querySelector('#dmParkurScroll .rt-root'))return;lastRenderedSchoolGrade=grade;window.dunyaAc?.();});
function scene(o={}){
 latest=o;sceneOwner=who();const learn=purpose()==='independent',grade=chosenSchoolGrade();if(!learn)lastRenderedSchoolGrade=grade;
 const steps=learn?(o.steps||[]):(o.allSteps?.length?o.allSteps:o.steps||[]);
 const original=(o.steps||[])[Number(o.current)||0];
 let current=steps.findIndex(x=>x.b===original?.b&&x.d===original?.d);
 if(!learn&&grade){
  let requested=steps.findIndex(x=>schoolInfo(x).grade>=grade&&x.available&&!x.done);
  if(requested<0){for(let i=steps.length-1;i>=0;i--)if(schoolInfo(steps[i]).grade===grade&&steps[i].available){requested=i;break;}}
  if(requested<0)requested=steps.findIndex(x=>schoolInfo(x).grade===grade);
  if(requested>=0)current=requested;
 }
 current=Math.max(0,Math.min(steps.length-1,current));
 return '<div class="rt-root '+(learn?'rt-english':'rt-school')+'" data-route-design="3">'+(learn?'<div class="rt-route-area" role="status">Öğrenme yolun hazırlanıyor…</div>':'')+(learn?'':islandMarkup(steps,current))+'</div>';
}

async function paintLearning(root,force=false){const owner=who(),turn=++epoch;try{const info=await window.dmStoryPath.overview({force});if(!root.isConnected||owner!==who()||turn!==epoch||purpose()!=='independent')return;if(!info?.chapters?.length)throw Error('Parkur içeriği henüz hazır değil.');const cur=Math.max(0,info.chapters.findIndex(c=>c.current));const area=root.querySelector('.rt-route-area');root.querySelectorAll('.rt-badge,.rt-banner,.rt-completion-count,.rt-path,.bi-sky').forEach(el=>el.remove());const summary='';if(area)area.outerHTML=summary;else root.insertAdjacentHTML('afterbegin',summary);root.insertAdjacentHTML('beforeend',islandMarkup(info.chapters,cur,true));mountScrollable(root);}catch(e){if(!root.isConnected||owner!==who()||turn!==epoch)return;const area=root.querySelector('.rt-route-area');if(area){area.innerHTML='<p>Öğrenme yolun yüklenemedi.</p><button type="button" data-rt="retry">Tekrar dene</button>';}}}
let cardStamp='';if(typeof window.setInterval==='function')window.setInterval(()=>{if(document.hidden)return;paintChests();const stamp=JSON.stringify([Y()?.log,Y()?.haftaHedef,Y()?.lig?.xp,tasks()]);if(stamp!==cardStamp){cardStamp=stamp;refreshCards();}},1500);
function refreshCards(){paintChests();document.querySelectorAll('.mp-missions [data-mission-panel]').forEach(p=>{p.innerHTML=window.dmRouteMissions?.passport(p.dataset.missionPanel)||'';});document.querySelectorAll('.rt-week').forEach(el=>el.outerHTML=weekly());document.querySelectorAll('.rt-tasks').forEach(el=>el.outerHTML=tasks());}
let routeSaveInProgress=false;
function chosenSchoolGrade(){const sp=window.dmProgression?.status?.()?.startPath;const authoritative=Number(sp?.startGrade);if(Number.isInteger(authoritative)&&authoritative>=1&&authoritative<=8)return authoritative;const cache=typeof globalDataCache!=='undefined'&&Array.isArray(globalDataCache)?globalDataCache:[],student=cache.find(x=>String(x.ogrenci||'').trim().toLocaleLowerCase('tr')===who().trim().toLocaleLowerCase('tr')),accountGrade=Number(student?.Sinif);if(Number.isInteger(accountGrade)&&accountGrade>=1&&accountGrade<=8)return accountGrade;const remembered=Number(Y()?.dmSchoolStartGrade);return Number.isInteger(remembered)&&remembered>=1&&remembered<=8?remembered:0;}

function selectSchoolGrade(){
 return new Promise(resolve=>{
  const {el,close}=dialog('Okul Yolum · Sınıfını seç','<p>Hangi sınıftan başlamak istersin? Seçimin diğer parkurdaki ilerlemeni ve ödüllerini silmez.</p><div class="rt-choices rt-grade-choices">'+Array.from({length:8},(_,i)=>'<button type="button" data-school-grade="'+(i+1)+'">'+(i+1)+'. Sınıf</button>').join('')+'</div><p class="rt-status">Sınıfını daha sonra Parkur Değiştir bölümünden değiştirebilirsin.</p>');
  let finished=false;
  const finish=n=>{if(finished)return;finished=true;close();resolve(n);};
  el.querySelectorAll('[data-school-grade]').forEach(b=>b.onclick=()=>finish(Number(b.dataset.schoolGrade)));
  el.querySelector('.rt-close').addEventListener('click',()=>finish(null));
  el.addEventListener('click',e=>{if(e.target===el)finish(null);});
  el.addEventListener('keydown',e=>{if(e.key==='Escape')finish(null);});
 });
}
async function setPurpose(p,{save=true,reopen=true,schoolGrade=null,chooseGrade=false}={}){
 if(!['school','independent'].includes(p)||routeSaveInProgress)return false;
 const owner=who();
 if(!Y()||!owner){tell('Hesap bilgilerin hazırlanıyor, kısa süre sonra tekrar dene.');return false;}
 if(p==='independent'&&window.dmProgression&&!window.dmProgression.status?.()){
  // Başlangıç bilgisi henüz gelmediyse (açılışın ilk saniyeleri) karar vermeden önce bekle.
  await new Promise(done=>{const t=setTimeout(done,4000);document.addEventListener('dm:progression-status',()=>{clearTimeout(t);done();},{once:true});window.dmProgression?.refresh?.(true);});
  if(owner!==who())return false;
 }
 if(p==='independent'&&learningNeedsTest()){askLearningTest();return false;}
 routeSaveInProgress=true;
 let state=null,previous=null,changed=false;
 try{
  // Readiness includes the initial server version, not merely the local yo
  // object. Do not change any route selection before this resolves.
  if(save&&typeof window.dmMemberSaveReady==='function')await window.dmMemberSaveReady(owner);
  else if(save&&typeof window.dmPrepareMemberState==='function')await window.dmPrepareMemberState();
  if(owner!==who())return false;
  state=Y();
  if(!state)return false;
  previous=state.dmLearningPurpose;
  preview=null;
  if(previous===p){if(reopen)await window.dunyaAc?.();return true;}
  state.dmLearningPurpose=p;changed=true;
  window.yoKaydet?.();
  if(save){
   if(typeof window.yoHemenKaydet!=='function')throw Error('Kaydetme bağlantısı henüz hazır değil.');
   let saved=false,lastError=null;
   for(let attempt=0;attempt<3;attempt++){
    if(owner!==who()||Y()!==state)return false;
    if(attempt)await new Promise(resolve=>setTimeout(resolve,300*attempt));
    try{
     await window.yoHemenKaydet(true);
     saved=true;break;
    }catch(e){lastError=e;}
   }
   if(!saved)throw lastError||Error('Kaydetme işlemi tamamlanamadı.');
   if(owner!==who()||Y()!==state)return false;
  }
  if(reopen)await window.dunyaAc?.();
  return true;
 }catch(e){
  if(changed&&owner===who()&&Y()===state){
   state.dmLearningPurpose=previous;
   window.yoKaydet?.();
  }
  tell(e?.message||'Parkur seçimin kaydedilemedi. Bağlantını kontrol edip tekrar deneyebilirsin.');
  return false;
 }finally{routeSaveInProgress=false;}
}
function dialog(title,html){const parent=window.dmViewHistory?.capture();document.getElementById('rtDialog')?.remove();const prior=document.activeElement,el=document.createElement('div');el.id='rtDialog';el.className='rt-overlay';el.innerHTML='<section class="rt-dialog" role="dialog" aria-modal="true" aria-labelledby="rtDialogTitle"><button type="button" class="rt-close" aria-label="Kapat">×</button><h2 id="rtDialogTitle">'+esc(title)+'</h2>'+html+'</section>';const close=()=>{el.remove();window.dmViewHistory?.leave(el);prior?.focus?.({preventScroll:true});};el.onclick=e=>{if(e.target===el||e.target.closest('.rt-close'))close();};el.onkeydown=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const f=[...el.querySelectorAll('button,a,input')].filter(b=>!b.disabled&&b.getClientRects().length),i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length]?.focus();}};document.body.append(el);window.dmViewHistory?.track(el,{parent,close});el.querySelector('button').focus();return {el,close};}
function goal(){const {el,close}=dialog('Haftalık hedefini seç','<img class="dm-goal-papi" src="papi-welcome-v2.png" alt="Papi"><p>Kendine uygun bir hedef seç. Her küçük adım sayılır!</p><div class="rt-choices">'+[1000,1500,2500].map((n,i)=>'<button type="button" data-goal="'+n+'"><span>'+['🌱','🚀','🏆'][i]+'</span><strong>'+n+' XP</strong><small>'+['Rahat başlangıç','Dengeli ilerleme','Büyük hedef'][i]+'</small></button>').join('')+'</div><p class="rt-status" role="status"></p>');el.querySelectorAll('[data-goal]').forEach(b=>b.onclick=async()=>{const owner=who();el.querySelectorAll('[data-goal]').forEach(x=>x.disabled=true);try{if(!Y()||!owner)throw Error('Hesap bilgilerin hazırlanıyor.');const r=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:'haftalikHedefSec',ogrenci:owner,xp:Number(b.dataset.goal),t:localStorage.getItem('ing_token')||''})}),d=await r.json();if(!r.ok||!d.ok||!d.haftaHedef)throw Error(d.mesaj||'Hedef kaydedilemedi.');if(owner!==who()){close();return;}Y().haftaHedef=d.haftaHedef;window.yoKaydet?.();refreshCards();close();}catch(e){el.querySelector('.rt-status').textContent=e.message;el.querySelectorAll('[data-goal]').forEach(x=>x.disabled=false);}});}
function allSchool(){if(window.dmSchoolJourney?.open){window.dmSchoolJourney.open(latest?.allSteps||latest?.steps||[]);return;}const {el,close}=dialog('Okul Yolum','<div class="rt-all">'+(latest?.allSteps||latest?.steps||[]).map(s=>'<button type="button" data-b="'+s.b+'" data-d="'+s.d+'" '+(!s.available?'disabled':'')+'>'+esc(s.label)+' '+(s.done?'✓':s.available?'▶':'🔒')+'</button>').join('')+'</div><small>1–8. sınıf · tüm üniteler ve bölümler</small>');el.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const original=document.querySelector('.rt-root .dm-adventure-node[data-b="'+b.dataset.b+'"][data-d="'+b.dataset.d+'"]');if(original){close();original.click();}else{const host=$('dmParkurScroll');const trigger=document.createElement('button');trigger.className='dm-adventure-node';trigger.dataset.b=b.dataset.b;trigger.dataset.d=b.dataset.d;host.append(trigger);window.dmSchoolStopOpen?.(+b.dataset.b,+b.dataset.d);trigger.remove();close();}});}
function mount(host){const root=host?.querySelector('.rt-root');if(!root)return;if(!host.dataset.rtBound){host.dataset.rtBound='1';host.addEventListener('click',e=>{const b=e.target.closest('[data-rt]');if(!b||b.disabled)return;const action=b.dataset.rt;if(action==='school-stop'){if(!b.onclick)window.dmSchoolStopOpen?.(Number(b.dataset.b),Number(b.dataset.d));return;}if(action==='plan'){window.dmLearningCompanion?.openPlan?.();return;}if(action==='missions'){missionsDialog();return;}if(action==='chests'){window.dmProgression?.chests?.();return;}if(action==='all'){e.preventDefault();e.stopPropagation();if(purpose()==='independent'){if(typeof window.dmStoryPath?.openAll==='function')window.dmStoryPath.openAll();else tell('Bölüm listesi yüklenemedi.');}else allSchool();return;}if(action==='other-route'){e.preventDefault();e.stopPropagation();b.disabled=true;Promise.resolve(setPurpose(purpose()==='independent'?'school':'independent')).finally(()=>{if(b.isConnected)b.disabled=false;});return;}if(action==='switch-route'){e.preventDefault();e.stopPropagation();window.dmMemberExperience?.chooseRoute(true);}else if(action==='goal')goal();else if(action==='claim-goal')claimWeekly();else if(action==='retry')window.dunyaAc?.();else if(action==='continue')window.dmStoryPath.continueRoute().catch(e=>tell(e.message));else if(action==='chapter')window.dmStoryPath.open(Number(b.dataset.chapter));else if(action==='all')purpose()==='independent'?window.dmStoryPath.openAll():allSchool();else if(action==='task'){const ev=b.dataset.event;runTask(ev);}});}if(purpose()==='independent')paintLearning(root);refreshChests();fit();mountScrollable(root);}
function fit(){const host=$('dmParkurScroll');if(!host?.querySelector('.rt-root'))return;const nav=$('bottomNavMobile'),vp=window.visualViewport;host.style.setProperty('--rt-space',Math.max(280,(nav?.getBoundingClientRect().top||(vp?.height||innerHeight))-host.getBoundingClientRect().top-10)+'px');}
/* Remove superseded header tabs even if legacy scripts regenerate them after login. */
function removeLegacyTopTabs(){const screen=document.getElementById('tab-dunya');if(!screen)return;screen.querySelectorAll('.dm-parkur-tabs,#pkSekmeler').forEach(el=>el.remove());}
const oldTabScreen=document.getElementById('tab-dunya');if(oldTabScreen){removeLegacyTopTabs();new MutationObserver(removeLegacyTopTabs).observe(oldTabScreen,{childList:true,subtree:true});}
window.dmOpenMissions=missionsDialog;window.dmRefreshRouteCards=refreshCards;window.dmParkurBaslik=heading;window.dmParkurSahne=scene;window.dmParkurMapMount=mount;
window.dmLearningRoute={purpose, set:setPurpose,preview:async p=>{preview=p;await window.dunyaAc?.();},continue:()=>purpose()==='independent'?window.dmStoryPath.continueRoute():document.querySelector('.bi-continue,.rt-start')?.click(),settings:()=>{const {el,close}=dialog('Öğrenme Yolum','<p>Yolunu değiştirsen de iki parkurdaki ilerlemen korunur.</p><div class="rt-choices"><button data-purpose="school">'+art('book')+'Okul Yolum<small>1. sınıftan 8. sınıfa</small></button><button data-purpose="independent">'+art('path')+'İngilizce Yolum<small>Tematik günlük İngilizce</small></button></div>');el.querySelectorAll('[data-purpose]').forEach(b=>{b.setAttribute('aria-pressed',String(purpose()===b.dataset.purpose));b.onclick=async()=>{close();await setPurpose(b.dataset.purpose,{chooseGrade:b.dataset.purpose==='school'});};});}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-rt-wallet]');if(b)(b.dataset.rtWallet==='gold'?window.magazaAc:window.dijiEnerjiPaneliAc)?.();});
function refreshLearning(){if(purpose()!=='independent')return;document.querySelectorAll('.rt-root').forEach(root=>paintLearning(root,true));}
document.addEventListener('dm:learning-progress',e=>{if(e.detail?.owner===who()){refreshLearning();refreshChests();}});document.addEventListener('dm:story-close',refreshLearning);
let routeFrame=0;
function reconcileVisibleRoute(){
 if(routeFrame)return;
 routeFrame=requestAnimationFrame(()=>{
  routeFrame=0;const host=$('dmParkurScroll'),screen=$('tab-dunya'),root=host?.querySelector('.rt-root');
  if(!root||!screen?.classList.contains('active')||!screen.getClientRects().length||sceneOwner!==who()||!latest)return;
  const learn=purpose()==='independent';
  if(root.classList.contains('rt-english')!==learn||!routeMap||root.querySelector('.rt-route-area')){
   root.outerHTML=scene(latest);mount(host);
  }else{fit();mountScrollable(root);}
 });
}
document.addEventListener('dm:state',()=>{preview=null;refreshCards();reconcileVisibleRoute();});
document.addEventListener('dm:login',()=>{weeklyClaimOwner='';weeklyError='';preview=null;lastRenderedSchoolGrade=0;if(sceneOwner!==who())latest=null;routeMap=null;mapResize?.disconnect();epoch++;reconcileVisibleRoute();});window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
// School route uses its own theme and expanded grade/unit navigator.
if(typeof document!=='undefined'&&document.createElement&&document.head&&!document.querySelector('script[data-dm-school-journey]')){const loader=document.createElement('script');loader.src='school-journey.js?v=20261022-kombo-1';loader.defer=true;loader.dataset.dmSchoolJourney='1';document.head.append(loader);}
})();
