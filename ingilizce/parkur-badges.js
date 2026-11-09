/* Collectibles are derived from completed stops, so they follow the account on every device. */
(function(root){
 'use strict';
 const STEP=5, CELL=256;
 const sets={
  'papi-01':['İlk Maceralar','Bir sonraki adım, yepyeni bir keşif!'],
  'school-02':['Okul Maceraları','Her durakta yeni bir yeteneğini ortaya çıkar!'],
  'school-03':['Sanat ve Spor','Sahne senin, sıradaki durağa gücünü göster!'],
  'school-04':['Doğa ve Meslekler','Merakını takip et, daha keşfedecek çok şey var!'],
  'school-05':['Oyun ve Keşif','Bir sonraki macerada neler yapabileceğini göster!'],
  'learning-02':['Gökyüzünden Uzaya','Kanatlarını aç, sıradaki keşif seni bekliyor!'],
  'learning-03':['Gökyüzü Maceraları','Daha yükseğe uç, her durakta gökyüzü biraz daha yakın!'],
  'learning-04':['Uzak Galaksiler','Rotanı yıldızlara çevir, keşfin daha yeni başlıyor!']
 };
 function sheet(file,cols,names,start=0,rows=Math.ceil(names.length/cols)){
  return names.map((name,index)=>({
   name,set:sets[file][0],cheer:sets[file][1],src:'parkur-badges/v2/'+file+'.webp',col:(index+start)%cols,row:Math.floor((index+start)/cols),cols,rows
  }));
 }
 const school=[
  ...sheet('papi-01',4,['Kaşif','Kitap Kurdu','Laboratuvar','Sahne'],0,2),
  ...sheet('school-02',4,['Ressam','Sporcu','Bahçıvan','Aşçı','Müzisyen','Fotoğrafçı','Kaptan','Kuklacı','Robotçu','Bisikletçi','Kardan Adam','Mezun']),
  ...sheet('school-03',5,['Balerin','Basketbolcu','Tenisçi','Yüzücü','Buz Patencisi','Eskrimci','Bando Davulcusu','Kemancı','Orkestra Şefi','Dansçı','Heykeltıraş','Origami Ustası','Çizer','Tiyatrocu','Pandomimci','Jonglör','Sihirbaz','Uçurtmacı','Okçu','Jimnastikçi']),
  ...sheet('school-04',5,['Arıcı','Dalgıç','Orman Korucusu','Fosil Avcısı','Çiçekçi','Çiftçi','Hava Gözlemcisi','Veteriner','İtfaiyeci','Kütüphaneci','Marangoz','Mimar','Jeolog','Saatçi','Seramikçi','Fırıncı','Kargo Görevlisi','Fener Bekçisi','Makinist','Hayvan Bakıcısı']),
  ...sheet('school-05',5,['Dedektif','Satranç Ustası','Yapbozcu','İzci','Dağcı','Kanocu','Tekerlekli Patenci','Kaykaycı','Masa Tenisçisi','Karateci','Hokey Kalecisi','Oyun Hakemi','Kart Ustası','Baloncukçu','Kumdan Kale Ustası','Kâğıt Uçakçı','Ağaç Ev Ustası','Mini Golfçü','Kukla Tasarımcısı','Piknik Rehberi'])
 ].map(art=>({...art,name:art.name+' Papi'}));
 const learning=[
  ...sheet('papi-01',4,['Gezgin Papi','Gökyüzü Pilotu','Yıldız Avcısı','Uzay Kaptanı'],4,2),
  ...sheet('learning-02',4,['Ay Kâşifi','Meteor Sörfçüsü','Galaksi Rehberi','Bulut Postacısı','Kuyruklu Yıldız Papi','Uydu Tamircisi','Gezegen Bahçıvanı','Kutup Işığı Papi','Güneş Yelkencisi','Kozmik Davulcu','Yörünge Yarışçısı','Samanyolu Muhafızı']),
  ...sheet('learning-03',5,['Bulut Çobanı','Gökkuşağı Dokumacısı','Fırtına Takipçisi','Rüzgâr Yelkencisi','Paraşütçü Papi','Gün Doğumu Ressamı','Ay Kayıkçısı','Zeplin Tamircisi','Bulut Heykeltıraşı','Hava Balonu Bilimcisi','Gece Seyrüsefercisi','Gökyüzü Kuryesi','Gök Gürültüsü Davulcusu','Sis Kâşifi','Göç Rehberi','Şimşek Yakalayıcısı','Buz Bulutu Rehberi','Gökyüzü Bahçıvanı','Gökyüzü Kondüktörü','Bulut Kalesi Bekçisi']),
  ...sheet('learning-04',5,['Ay Gezgini','Halka Toplayıcısı','Kara Delik Araştırmacısı','Bulutsu Dalgıcı','Ötegezegen Haritacısı','Uzay Dilbilimcisi','Uzay Aşçısı','Kozmik Kütüphaneci','Uzay Arkeoloğu','Yıldız Madencisi','Solucan Deliği İzcisi','Yerçekimi Patencisi','Yörünge Kontrolörü','Gezegen Ses Avcısı','Uzay Botanikçisi','Asteroit Kurtarıcısı','Kuyruklu Yıldız Fotoğrafçısı','Yıldız Tozu Kimyacısı','Tutulma Gözlemcisi','Galaksi Elçisi'])
 ];
 // Three standalone, complete Papi portraits replace damaged atlas cells.
 // Keep route milestone positions and all other 129 collectible figures unchanged.
 const standalone=(art,filename)=>({...art,src:'parkur-badges/v3/'+filename,col:0,row:0,cols:1,rows:1,cell:512});
 school[6]=standalone(school[6],'bahcivan-papi.png'); // school-02: row 0, column 2
 school[14]=standalone(school[14],'kaptan-papi.png'); // school-02: row 1, column 2
 learning[1]=standalone(learning[1],'gokyuzu-pilotu-papi.png'); // papi-01: row 1, column 1
 const title={school:'Okul Yolum',learning:'Öğrenme Yolu'};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function milestones(steps,route){
  const list=route==='school'?school:learning;
  const result=new Map();
  let group=null,number=0,passed=0,ordinal=0;
  steps.forEach((step,index)=>{
   const scope=route==='school'?Number(step.grade||/^(\d+)\./.exec(step.label||'')?.[1]):0;
   if(scope!==group){group=scope;number=0;passed=0;}
   number++;
   if(step.done)passed++;
   if(number%STEP!==0)return;
   const art=list[ordinal++%list.length];
   const label=(scope?scope+'. Sınıf · ':'')+number+'. Durak';
   result.set(index,{art,route,number,passed,earned:passed===STEP,first:index-STEP+1,
    id:route+':'+(route==='school'?step.no??scope+'-'+number:step.id??number),label});
   passed=0;
  });
  return result;
 }
 function artMarkup(art){
  const x=art.cols===1?0:art.col/(art.cols-1)*100,y=art.rows===1?0:art.row/(art.rows-1)*100;
  return '<span class="dm-route-badge-art" aria-hidden="true" style="background-image:url('+art.src+');background-size:'+
   art.cols*100+'% '+art.rows*100+'%;background-position:'+x+'% '+y+'%"></span>';
 }
 function mapMarkup(badge,y,fresh){
  return '<button type="button" class="dm-route-badge-map'+(badge.earned?' is-earned':'')+(fresh?' is-new':'')+
   '" data-rt="route-badge" data-badge-index="'+(badge.first+STEP-1)+'" style="--badge-y:'+y+'px" aria-haspopup="dialog" aria-label="'+
   esc(badge.art.name+' · '+badge.label+(badge.earned?' · Kazanıldı':' · '+badge.passed+'/'+STEP+' durak'))+'">'+artMarkup(badge.art)+
   '<span class="dm-route-badge-stars" aria-hidden="true">★ ★ ★</span></button>';
 }
 function badgeStatus(badge){
  if(badge.earned)return 'Bu rozeti kazandın! Başarılarım koleksiyonunda seni bekliyor.';
  const range=(badge.number-STEP+1)+'–'+badge.number;
  return range+'. durakları tamamlayınca açılır. '+badge.passed+'/'+STEP+' durak tamamlandı.';
 }
 if(typeof module==='object'&&module.exports){module.exports={milestones,school,learning,mapMarkup,badgeStatus};return;}
 const account=()=>String(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi||'').trim().toLocaleLowerCase('tr');
 const member=()=>!!account()&&account()!=='teacher'&&!root.dmGuestMode&&!root.dmTeacherPortalMode&&
  !(typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci);
 const sharingItem=badge=>({kind:'badge',id:badge.id,name:badge.art.name,caption:title[badge.route]+' · '+badge.label,
  sprite:{src:badge.art.src,x:badge.art.col*(badge.art.cell||CELL),y:badge.art.row*(badge.art.cell||CELL),size:badge.art.cell||CELL}});
 const visible=el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
 const blockers='[role="dialog"],#genelSonucOverlay,#dmLevelUp,.ml-overlay,.bz-perde,.gso-overlay';
 let pending=[],shown=new Set(),timer=0,dialog=null;
 function schedule(){
  if(timer||!pending.length)return;
  timer=setTimeout(flush,250);
 }
 function flush(){
  timer=0;
  if(!pending.length)return;
  if(!member()||account()!==pending[0].owner){pending=[];return;}
  if(document.hidden||!document.querySelector('#tab-dunya.active'))return;
  if(dialog||[...document.querySelectorAll(blockers)].some(visible)){schedule();return;}
  showBadge(pending.shift().badge,true);
 }
 function showBadge(badge,celebration=false){
  if(!badge||dialog)return;
  const previous=document.activeElement,overlay=document.createElement('div');
  const confetti=celebration?'<div class="dm-route-badge-confetti" aria-hidden="true">'+
   Array.from({length:12},(_,i)=>'<i style="--i:'+i+'"></i>').join('')+'</div>':'';
  overlay.className='dm-route-badge-overlay';
  overlay.innerHTML='<section class="dm-route-badge-dialog'+(badge.earned?'':' is-locked')+
   '" role="dialog" aria-modal="true" aria-labelledby="dmRouteBadgeTitle">'+confetti+
   '<small class="dm-route-badge-set">'+esc(badge.art.set)+' Seti</small>'+
   '<h2 id="dmRouteBadgeTitle">'+(celebration?'Rozet kazandın!':badge.earned?'Kazanılan rozet':'Kilitli rozet')+'</h2>'+
   artMarkup(badge.art)+'<h3>'+esc(badge.art.name)+'</h3>'+
   '<small>'+esc(title[badge.route]+' · '+badge.label)+'</small>'+
   '<p>'+esc(badgeStatus(badge))+'</p><strong>'+esc(badge.art.cheer)+'</strong>'+
   '<button type="button">'+(celebration?'Devam et':'Tamam')+'</button></section>';
  const close=()=>{
   if(dialog!==overlay)return;
   dialog=null;overlay.remove();root.dmViewHistory?.leave(overlay);
   previous?.focus?.({preventScroll:true});schedule();
  };
  dialog=overlay;const parent=root.dmViewHistory?.capture();document.body.append(overlay);
  root.dmViewHistory?.track(overlay,{parent,close});
  const button=overlay.querySelector('button');button.onclick=close;button.focus();
  overlay.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(e.key==='Tab'){e.preventDefault();button.focus();}};
 }
 function celebrate(badge){
  if(!member()||!badge?.earned)return;
  const owner=account(),key=owner+':'+badge.id;
  if(shown.has(key))return;
  shown.add(key);pending.push({owner,badge});schedule();
 }
 function collection(host){
  if(!host||!member())return;
  host.nextElementSibling?.matches('.dm-route-badge-collection')&&host.nextElementSibling.remove();
  const section=document.createElement('section'),owner=account();
  section.className='dm-route-badge-collection';
  section.innerHTML='<h3>Parkur Rozetlerim</h3>'+Object.entries(title).map(([route,name])=>
   '<details open><summary>'+name+'</summary><div data-route-badge-list="'+route+'" aria-live="polite">Rozetler yükleniyor…</div></details>').join('');
  host.after(section);
  async function fill(route,read){
   const list=section.querySelector('[data-route-badge-list="'+route+'"]');
   try{
    const steps=await read();
    if(!section.isConnected||owner!==account())return;
    if(!Array.isArray(steps))throw Error('Parkur yüklenemedi');
    const earned=[...milestones(steps,route).values()].filter(b=>b.earned);
    if(!earned.length){list.textContent='Her 5 durağı tamamladığında bir Papi rozeti kazanırsın.';return;}
    list.innerHTML='<ul>'+earned.map((b,i)=>'<li><button type="button" data-route-badge="'+i+'">'+artMarkup(b.art)+
     '<b>'+esc(b.art.name)+'</b><small>'+esc(b.label)+'</small><span>Rozeti indir</span></button></li>').join('')+'</ul>';
    list.onclick=e=>{
     const button=e.target.closest('[data-route-badge]');
     if(button&&owner===account())root.dmSharing?.open(sharingItem(earned[+button.dataset.routeBadge]));
    };
   }catch{
    if(!section.isConnected||owner!==account())return;
    list.innerHTML='<p>Rozetler yüklenemedi.</p><button type="button">Tekrar dene</button>';
    list.querySelector('button').onclick=()=>fill(route,read);
   }
  }
  void fill('school',()=>root.dmSchoolBadgeRows());
  void fill('learning',async()=>(await root.dmStoryPath.overview()).chapters);
 }
 document.addEventListener('dm:login',()=>{
  pending=[];shown.clear();clearTimeout(timer);timer=0;
  if(dialog){root.dmViewHistory?.leave(dialog);dialog.remove();dialog=null;}
  document.querySelectorAll('.dm-route-badge-collection').forEach(el=>el.remove());
 });
 document.addEventListener('visibilitychange',schedule);
 root.dmRouteBadges={milestones,mapMarkup,celebrate,collection,inspect:showBadge,resume:schedule};
})(globalThis);
