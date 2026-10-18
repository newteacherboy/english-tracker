/* Keep the teacher workspace open while child screens come and go. */
(()=>{'use strict';
const style=document.createElement('link');style.rel='stylesheet';style.href='teacher-workspace.css?v=20261018-children-2';document.head.append(style);
const $=id=>document.getElementById(id),token=()=>sessionStorage.getItem('ing_ogr_token')||'';
let active=false,total=0,registrations=0,messages=0,reading=false,lastRead=0,menuSeen=false;
async function api(op){const r=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:op,t:token()})});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.mesaj||'Bildirimler alınamadı.');return d;}
function paintBadge(){for(const b of document.querySelectorAll('[data-profile="teacher"]')){let badge=b.querySelector('.dm-teacher-count');if(!badge){badge=document.createElement('span');badge.className='dm-teacher-count';b.append(badge);}badge.textContent=String(total);badge.hidden=total===0;b.setAttribute('aria-label','Öğretmen Paneli'+(total?' · '+total+' bildirim':''));}}
async function refresh(force=false){if(!token()||reading||document.hidden||!force&&Date.now()-lastRead<60000)return;reading=true;try{const d=await api('teacherNotificationSummary');total=d.total||0;registrations=d.registrations||0;messages=d.messages||0;lastRead=Date.now();paintBadge();}catch(e){console.warn('[Öğretmen bildirimleri]',e.message);}finally{reading=false;}}
function visible(el){return !!el&&el.getClientRects().length>0&&(el.checkVisibility?el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}):getComputedStyle(el).visibility!=='hidden');}
const childSelector='.rubric-modal,.cog-perde,.sm-overlay,.dm-member-overlay,.dm-account-overlay,.dm-perde,.yo-modal,.yo-perde,#yoModalPerde,#omSifreModal,#odModal,.game-modal-overlay,.seviye-harita-overlay,#rallyGame,#meteorGame,#wordWheel,#papiCards,#dmTeacherOral,#mlThemeList,#dmStoryLesson,.gso-overlay';
function children(){return [...document.querySelectorAll(childSelector)].filter(x=>x.id!=='ogretmenMenuModal'&&x.id!=='sifreModal'&&(visible(x)||x.closest('#ogretmenMenuModal')&&['flex','block','grid'].includes(x.style.display)));}
const original=window.ogretmenPaneliAc;window.ogretmenPaneliAc=function(){active=true;const r=original?.apply(this,arguments);refresh(true);return r;};
document.addEventListener('click',e=>{
 const menu=$('ogretmenMenuModal');if(!menu)return;
 if(menu.contains(e.target)){
  if(e.target.closest('.game-close-btn')){active=false;menuSeen=false;menu.classList.remove('dm-teacher-open');return;}
  if(e.target.closest('button')){active=true;setTimeout(maintain,0);}
 }else if(active&&e.target.closest('.dm-teacher-child'))setTimeout(()=>{maintain();refresh(true);},0);
},true);
document.addEventListener('keydown',e=>{if(!active||e.key!=='Escape')return;if(visible($('dmTeacherOral'))){e.preventDefault();e.stopImmediatePropagation();window.dmTeacherOral?.close();return;}if(visible($('rallyGame')))return;const list=children();if(list.length){e.preventDefault();e.stopImmediatePropagation();const top=list.at(-1);const close=top.querySelector('.game-close-btn,.yo-kapat,.cog-x,.dm-x,.dm-account-close,.dm-member-close,[aria-label="Kapat"],[data-close]');if(close)close.click();else top.style.display='none';setTimeout(maintain,0);}else{active=false;menuSeen=false;$('ogretmenMenuModal').style.display='none';}},true);
async function teacherPlacements(){const v=window.dmMemberUI.sheet('Seviye sınavı sonuçları','<p>Yükleniyor…</p>','dmTeacherPlacements');v.el.classList.add('dm-teacher-child');try{const d=await api('teacherPlacementResults');v.body.replaceChildren();for(const item of d.results){const box=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=item.student+' · '+item.result.level;p.textContent='Yazma: '+(item.result.writing||'Örnek bırakılmadı')+'\n\nKonuşma dökümü: '+(item.result.speaking||'Örnek bırakılmadı');p.style.whiteSpace='pre-wrap';box.append(h,p);v.body.append(box);}if(!d.results.length)v.body.textContent='Henüz tamamlanmış sınav yok.';}catch(e){v.body.textContent=e.message;}}
function decorateWorkspace(menu){
 const content=menu.querySelector('.rubric-content');if(!content)return;
 let hero=$('dmTeacherHero');if(!hero){hero=document.createElement('section');hero.id='dmTeacherHero';hero.className='dm-teacher-hero';hero.innerHTML='<div class="dm-teacher-hero-top"><img src="papi-help-v2.png" alt="Papi"><div><small>SINIFININ ÖĞRENME MERKEZİ</small><h2>Öğretmen Paneli</h2><p>Planla, öğrencilerini destekle, gelişimi takip et.</p></div></div><div class="dm-teacher-stats"><span>🆕 <b data-teacher-registrations>0</b> kayıt</span><span>💬 <b data-teacher-messages>0</b> mesaj</span></div><label class="dm-teacher-search">🔎 <input type="search" placeholder="Ödev, rapor, oyun…" aria-label="Öğretmen panelinde araç ara"></label><p class="dm-teacher-no-results" hidden>Bu aramaya uygun araç bulunamadı.</p>';content.prepend(hero);hero.querySelector('input').addEventListener('input',()=>decorateWorkspace(menu));}
 hero.querySelector('[data-teacher-registrations]').textContent=registrations;hero.querySelector('[data-teacher-messages]').textContent=messages;
 const query=hero.querySelector('input').value.toLocaleLowerCase('tr').trim();let count=0;
 const tools=[
  [/ödev ver|ödev/i,'📚','Ödev ve etkinlikleri düzenle'],
  [/rubrik/i,'📊','Öğrencilerin becerilerini değerlendir'],
  [/ders içi performans/i,'⚡','Ders içindeki gelişimi takip et'],
  [/sınıf oyun/i,'🎮','Oyunları sınıfınla birlikte oyna'],
  [/duyuru/i,'📣','Sınıfına duyuru gönder'],
  [/bekleyen kayıt/i,'📥','Yeni öğrenci başvurularını incele'],
  [/öğrenci sohbet/i,'💬','Öğrenci mesajlarını yanıtla'],
  [/öğretmen hesabımı sil/i,'🛡️','Hesap ayarlarını yönet'],
  [/gizlilik|kvkk/i,'🔒','Gizlilik ve veri ayarlarını incele'],
  [/zayıf nokta/i,'🎯','Sınıfının gelişime açık konularını gör'],
  [/veli özet/i,'👨‍👩‍👧','Öğrenci gelişimini velilerle paylaş'],
  [/öğrenci şifresi/i,'🔑','Öğrenci erişim sorunlarını çöz'],
  [/seviye sınav/i,'🧭','Dil seviyelerini ve sonuçları incele'],
  [/sözlü yap/i,'🎤','Kelime bilgisi için sözlü uygula']
 ];
 for(const b of [...content.querySelectorAll('.ogretmen-menu-btn')]){
  const raw=(b.dataset.dmTeacherTitle||b.textContent||'').trim();
  if(/kelime rallisi.*öğretmen denemesi/i.test(raw)){b.remove();continue;}
  if(!b.dataset.dmTeacherCard){
   const entry=tools.find(([re])=>re.test(raw));
   const title=raw.replace(/^[^\p{L}\p{N}]+/u,'').trim();
   const old=b.querySelector('span:not(.ogretmen-menu-rozet)');
   if(old){old.textContent=title;old.classList.add('dm-teacher-card-title');}
   else{const label=document.createElement('span');label.className='dm-teacher-card-title';label.textContent=title;b.prepend(label);}
   const mark=document.createElement('span');mark.className='dm-teacher-card-icon';mark.setAttribute('aria-hidden','true');mark.textContent=entry?.[1]||'🧩';b.prepend(mark);
   const note=document.createElement('small');note.textContent=entry?.[2]||'Sınıfın için aç ve düzenle';b.append(note);
   b.dataset.dmTeacherTitle=title;b.dataset.dmTeacherCard='1';
  }
  const show=!query||b.dataset.dmTeacherTitle.toLocaleLowerCase('tr').includes(query);
  b.hidden=!show;if(show)count++;
 }
 hero.querySelector('.dm-teacher-no-results').hidden=count>0;
}
function maintain(){
 const menu=$('ogretmenMenuModal');if(!menu)return;if(!token()){active=false;menuSeen=false;return;}
 if(visible(menu))active=true;
 // Move child dialogs out of hidden legacy containers and above every workspace layer.
 if(!active)return;
 if(menu.parentElement!==document.body)document.body.append(menu);menu.classList.add('dm-teacher-open');const dialogs=children();menu.classList.toggle('dm-teacher-obscured',dialogs.length>0);const display=dialogs.length?'none':'flex';if(menu.style.display!==display)menu.style.display=display;if(!$('dmPlacementTeacherButton')){const b=document.createElement('button');b.id='dmPlacementTeacherButton';b.className='ogretmen-menu-btn';b.textContent='📋 Seviye sınavı sonuçları ve örnekler';b.onclick=teacherPlacements;menu.querySelector('.rubric-content').append(b);}
 for(const el of dialogs){if(el.parentElement!==document.body)document.body.append(el);if(!el.classList.contains('dm-teacher-child'))el.classList.add('dm-teacher-child');if(el.style.getPropertyValue('z-index')!=='2147483620')el.style.setProperty('z-index','2147483620','important');}
 if(!$('dmTeacherRallyButton')){const b=document.createElement('button');b.id='dmTeacherRallyButton';b.className='ogretmen-menu-btn';b.textContent='🏎️ Kelime Rallisi · Öğretmen Denemesi';b.onclick=async()=>{try{await window.dmLazyGames?.ready();window.ralliOyunAc?.();}catch(e){window.yoToast?.(e.message);}};menu.querySelector('.rubric-content').append(b);}
 if(!$('dmTeacherOralButton')){const b=document.createElement('button');b.id='dmTeacherOralButton';b.className='ogretmen-menu-btn';b.textContent='🎙️ Sözlü Yap · Kelime sor, 100 XP kazandır';b.onclick=()=>window.dmTeacherOral?.open();menu.querySelector('.rubric-content').append(b);}
 if(!menuSeen){menuSeen=true;api('teacherNotificationRead').then(()=>refresh(true)).catch(()=>{});}
 decorateWorkspace(menu);paintBadge();
}
window.dmOpenMeteor=()=>window.dmMeteor?.open();window.dmOpenWordWheel=()=>window.dmWordWheel?.open();window.dmOpenPapiCards=()=>window.dmPapiCards?.open();
// One catalog drives help, study practice links and teacher assignments.
const keyByFunction={kelimeYarismasiAc:'ky',jpOyunAc:'jp',boslukOyunAc:'bosluk',hafizaOyunAc:'hafiza',yagmurOyunAc:'yagmur',asmacaOyunAc:'asmaca',kelimebulOyunAc:'kelimebul',esOyunAc:'eslestirme',trenOyunAc:'tren',dikteAc:'dikte',cumleAc:'cumle',harfBahcesiAc:'harfbahcesi',meteorAc:'meteor',kelimeCarkiAc:'kelimecarki',papiKartlariAc:'papi_kartlari'};
function catalog(){return (window.DM_FEATURE_CATALOG||[]).filter(f=>f.code&&f.name);}
window.dmAssignmentGames=function(fallback=[]){const items=new Map(fallback.map(x=>[x[0],x]));for(const f of catalog().filter(x=>x.group==='Oyunlar')){const fn=(f.functions||[]).find(x=>typeof window[x]==='function');const key=f.assignmentKey||keyByFunction[fn]||(f.code.startsWith('oyun_')?f.code.slice(5):null);if(key&&fn&&!['aktiviteler','tek_kisilik','iki_kisilik'].includes(f.code))items.set(key,[key,f.icon||'🎮',f.name,fn]);}return [...items.values()];};
const guide={parkur:'Profilim → Parkur Değiştir ile 1–8. sınıf veya A1–B2 yolunu seç. İlerlemen korunur.',ders:'Seviyeni ve konunu seç; açıklama, kelime ve testlerle çalış. Arama alanıyla konuları bul.',zor_kelimeler:'Yanlış cevapladığın kelimeler hesabına kaydedilir. İki seçenekli tekrar sorusunda doğru bilince listeden silinir.',seviye_tespit:'40 soruluk CEFR odaklı ön değerlendirmede okuma, dinleme ve dil kullanımını ölç. Yazma ve konuşma örneklerini öğretmenine bırak.',ogretmen_sohbet:'Profilim → Öğretmene Mesaj Gönder. Öğretmen koduna bağlıysan kendi öğretmenine, bağımsızsan Diji-Medu öğretmen hesabına ulaşır.',odevler:'Öğretmen panelinde sınıf ve şube seçerek konu veya oyun ödevi ver. Ders konularını arayabilirsin.'};
let studySignature='',helpSignature='';
function installCatalog(){
 const items=catalog();if(!items.length)return;
 $('dmStudyPracticeCatalog')?.remove();
 const help=$('yardimIcerikAlani');if(visible($('yardimModal'))&&help){const sig=items.map(x=>x.code+'|'+x.name+'|'+x.description).join(';');let box=$('dmFeatureHelp');if(!box){box=document.createElement('section');box.id='dmFeatureHelp';box.className='dm-catalog-help';help.prepend(box);helpSignature='';}if(sig!==helpSignature){helpSignature=sig;box.replaceChildren();for(const f of items){const a=document.createElement('article'),h=document.createElement('strong'),p=document.createElement('p');h.textContent=f.name;p.textContent=f.description||f.howTo||guide[f.code]||(f.group==='Oyunlar'?'Oyunlar sekmesinden '+f.name+' oyununu aç; varsa sınıf ve ünite seçip başlat.':f.group+' bölümündeki '+f.name+' özelliğini kullan.');a.append(h,p);box.append(a);}}const q=String($('yardimAramaInput')?.value||'').toLocaleLowerCase('tr');for(const a of box.children)a.hidden=!!q&&!a.textContent.toLocaleLowerCase('tr').includes(q);}
}
window.dmTeacherWorkspace={paintBadge,refresh};
const watcher=new MutationObserver(()=>{if(active)maintain();});for(const el of document.querySelectorAll('.rubric-modal,.sm-overlay,.yo-modal,.yo-perde,#yoModalPerde,#odModal,#omSifreModal'))watcher.observe(el,{attributes:true,attributeFilter:['style']});
new MutationObserver(ms=>{if(active&&ms.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&(n.matches?.(childSelector)||n.querySelector?.(childSelector)))))maintain();}).observe(document.body,{childList:true});
const report=$('yoModal');if(report)watcher.observe(report,{attributes:true,attributeFilter:['class','style']});
setInterval(()=>{if(document.hidden)return;maintain();refresh();installCatalog();},1200);
document.addEventListener('dm:login',()=>{total=0;lastRead=0;active=false;menuSeen=false;refresh(true);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true);});
refresh(true);
})();
