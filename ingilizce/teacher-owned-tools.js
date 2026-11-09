/* Teacher-owned class tools: one source of truth for class, branch and pupils. */
(()=>{'use strict';
 const ENDPOINT='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/teacher-classes';
 const $=s=>document.querySelector(s);
 const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const token=()=>{try{return JSON.parse(sessionStorage.getItem('dm_tp_session')||'null')?.teacherToken||sessionStorage.getItem('ing_ogr_token')||'';}catch{return sessionStorage.getItem('ing_ogr_token')||'';}};
 async function ownClasses(){
  const t=token();if(!t)throw Error('Öğretmen hesabınla giriş yapmalısın.');
  const res=await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json','x-diji-token':t},body:JSON.stringify({action:'list'})});
  const d=await res.json();if(!res.ok||!d.ok)throw Error(d.mesaj||'Sınıflar yüklenemedi.');
  return (d.classes||[]).filter(x=>x&&x.id&&x.classNo>=1&&x.classNo<=8);
 }
 async function call(islem,data){
  const t=token();if(!t)throw Error('Öğretmen hesabınla giriş yapmalısın.');
  const res=await fetch(apiURL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({islem,t,...data})});
  const d=await res.json();if(!res.ok||!d.ok)throw Error(d.mesaj||d.message||'İşlem tamamlanamadı.');return d;
 }
 const style=document.createElement('style');style.textContent=`
 .dm-owned-veil{position:fixed;inset:0;z-index:2147483646;background:#0c193cb8;display:grid;place-items:center;padding:14px}
 .dm-owned-panel{width:min(100%,540px);max-height:93dvh;overflow-y:auto;background:#fffefa;color:#1a3548;border-radius:21px;padding:19px;box-shadow:0 15px 50px #0003;font:600 14px/1.45 system-ui}
 .dm-owned-panel h2{font-size:20px;margin:0 0 5px}.dm-owned-panel p{font-size:13px;color:#456278;margin:4px 0 12px}
 .dm-owned-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.dm-owned-close{background:#e9eef3;color:#234;border:0;border-radius:50%;width:36px;height:36px;font-size:23px}
 .dm-owned-panel label{display:flex;flex-direction:column;gap:5px;margin:10px 0;font-size:13px;font-weight:800}
 .dm-owned-panel input,.dm-owned-panel select,.dm-owned-panel textarea{box-sizing:border-box;width:100%;border:1px solid #b8ced5;border-radius:10px;background:#fff;padding:10px;color:#153e4a;font:inherit}
 .dm-owned-panel button{cursor:pointer;font:inherit}.dm-owned-action{background:#117d90;color:white;border:0;border-radius:12px;min-height:43px;padding:9px 14px;font-weight:900}
 .dm-owned-action:disabled{opacity:.55;cursor:wait}.dm-owned-outline{background:#eff6f6;border:1px solid #bad2d5;color:#225a68;border-radius:11px;padding:8px 11px;font-weight:800}
 .dm-owned-list{display:flex;flex-direction:column;gap:9px}.dm-owned-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px;border-radius:13px;border:1px solid #d8e7e9;background:#f5faf9}
 .dm-owned-row strong{font-size:14px}.dm-owned-row small{display:block;color:#64777e;font-size:11px}.dm-owned-buttons{display:flex;gap:6px}
 .dm-owned-plus{background:#d9f8e7;color:#176843;border:0;border-radius:10px;padding:8px 13px;font-size:18px!important;font-weight:900!important}
 .dm-owned-minus{background:#ffe3e1;color:#a52525;border:0;border-radius:10px;padding:8px 13px;font-size:18px!important;font-weight:900!important}
 .dm-owned-status{min-height:20px;color:#267462!important;font-size:12px!important}.dm-owned-switches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:10px 0}
 .dm-owned-switches button{background:#ebf7fc;color:#145b7b;border:1px solid #bcd8e7;border-radius:11px;padding:10px}
 .dm-owned-panel ul{padding-left:21px}.dm-owned-panel li{margin-bottom:6px}
 @media(prefers-reduced-motion:reduce){.dm-owned-panel *{animation:none!important}}
 `;
 document.head.append(style);
 let sheet=null,classes=[],current=null;
 function modal(title,description){
  sheet?.remove();sheet=document.createElement('div');sheet.className='dm-owned-veil';
  sheet.innerHTML='<section class="dm-owned-panel" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="dm-owned-top"><h2>'+esc(title)+'</h2><button type="button" class="dm-owned-close" aria-label="Kapat">×</button></div><p>'+esc(description||'')+'</p><div data-owned-body>Yükleniyor…</div><p class="dm-owned-status" role="status" aria-live="polite"></p></section>';
  document.body.append(sheet);sheet.querySelector('.dm-owned-close').onclick=()=>{sheet.remove();sheet=null;};
  sheet.onclick=e=>{if(e.target===sheet){sheet.remove();sheet=null;}};
  return sheet;
 }
 const status=text=>{if(sheet)sheet.querySelector('.dm-owned-status').textContent=String(text||'');};
 const body=()=>sheet?.querySelector('[data-owned-body]');
 const heading=c=>[c.name||c.classNo+'. Sınıf',c.classNo+'. sınıf / '+c.branch+' şubesi'].join(' · ');
 const selectedClass=()=>classes.find(c=>c.id===$('[data-owned-class]')?.value)||null;
 const classOptions=()=>classes.map(c=>'<option value="'+esc(c.id)+'">'+esc(heading(c))+' ('+(c.students||[]).length+' öğrenci)</option>').join('');
 async function bootstrap(title,desc,render){
  modal(title,desc);
  try{classes=await ownClasses();if(!sheet)return;
   if(!classes.length){body().innerHTML='<p>Henüz oluşturulmuş sınıfın yok. Önce Sınıf Oluştur bölümünden sınıf ve şube tanımla.</p>';return;}
   body().innerHTML='<label>Benim sınıfım<select data-owned-class>'+classOptions()+'</select></label><div data-owned-extra></div>';
   const draw=()=>{current=selectedClass();if(current)render(current,$('[data-owned-extra]'));};
   $('[data-owned-class]').onchange=()=>{status('');draw();};draw();
  }catch(e){if(body())body().textContent=e.message;}
 }
 const roster=c=>(c.students||[]).filter(p=>p&&p.id);
 async function openPerformance(){
  await bootstrap('➕ Artı-Eksi Ver','Sadece sana ait sınıflardaki öğrencilerin listelenir.',(c,host)=>{
   host.innerHTML='<p>'+esc(c.classNo+'-'+c.branch)+' · '+roster(c).length+' bağlı öğrenci</p><div class="dm-owned-list">'+roster(c).map(p=>
    '<div class="dm-owned-row"><div><strong>'+esc(p.fullName||p.username)+'</strong><small>'+esc(p.username)+'</small></div><div class="dm-owned-buttons"><button class="dm-owned-minus" data-owned-score="-2" data-student="'+esc(p.id)+'" aria-label="Eksi ver">−</button><button class="dm-owned-plus" data-owned-score="0.3" data-student="'+esc(p.id)+'" aria-label="Artı ver">+</button></div></div>').join('')+'</div>';
   if(!roster(c).length)host.innerHTML+='<p>Bu şubede henüz öğrenci bulunmuyor.</p>';
   host.querySelectorAll('[data-owned-score]').forEach(b=>b.onclick=async()=>{
    b.disabled=true;try{const d=await call('teacherPortalPerformance',{studentId:b.dataset.student,delta:Number(b.dataset.ownedScore)});
     status('Puan güncellendi. Yeni genel puan: '+d.points);
    }catch(e){status(e.message);}finally{b.disabled=false;}
   });
  });
 }
 async function openAnnouncement(){
  await bootstrap('📢 Sınıfına Duyuru Yap','Duyurular yalnızca seçtiğin kendi sınıfına veya içindeki bir öğrenciye gönderilir.',(c,host)=>{
   host.innerHTML='<form data-owned-form><label>Alıcı<select name="studentId"><option value="">Tüm '+esc(c.classNo+'-'+c.branch)+' sınıfı</option>'+roster(c).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.fullName||p.username)+'</option>').join('')+'</select></label>'+
    '<label>Başlık<input name="title" maxlength="120" minlength="3" required></label><label>Duyuru<textarea name="message" maxlength="2000" minlength="3" rows="5" required></textarea></label>'+
    '<button class="dm-owned-action" type="submit">Duyuru Gönder</button></form>';
   const form=host.querySelector('form');form.onsubmit=async e=>{e.preventDefault();const b=form.querySelector('[type=submit]');b.disabled=true;
    try{const d=await call('teacherPortalAnnouncement',{classId:c.id,studentId:form.elements.studentId.value,title:form.elements.title.value,message:form.elements.message.value});
     status('Duyuru '+d.studentCount+' öğrenciye gönderildi.');form.reset();
    }catch(error){status(error.message);}finally{b.disabled=false;}
   };
  });
 }
 async function openHomework(){
  await bootstrap('📝 Ödev Ver','Yalnızca öğretmenin oluşturduğu sınıf/şubelere ödev verilebilir.',(c,host)=>{
   host.innerHTML='<p><b>'+esc(c.classNo+'-'+c.branch)+'</b> · '+roster(c).length+' öğrenci</p><form data-owned-form>'+
    '<label>Ödev türü<select name="kind"><option value="oyun">Tek kişilik oyun</option><option value="ders">Ders Çalış konusu</option></select></label>'+
    '<div data-owned-game><label>Oyun<select name="game"><option value="hafiza">Hafıza Sandığı</option><option value="asmaca">Harf Avı</option><option value="kelime">Kelime Laboratuvarı</option><option value="bosluk">Eksik Harf</option><option value="yagmur">Hız Fırtınası</option><option value="jeopardy">Risk Balonları</option><option value="eslestirme">Eşleştirme</option><option value="tren">Kelime Treni</option></select></label><label>Ünite (boşsa tümü)<input name="units" placeholder="Örnek: 1,2"></label><label>Hedef<select name="stars"><option value="2">2 yıldız</option><option value="1">1 yıldız</option><option value="3">3 yıldız</option></select></label></div>'+
    '<div data-owned-lesson hidden><label>Seviye<select name="level"><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select></label><label>Alan<select name="category"><option value="grammar">Dil Bilgisi</option><option value="vocab">Kelime</option><option value="comm">İletişim</option><option value="pron">Telaffuz</option></select></label><label>Ders konusu<input name="topic" maxlength="160" placeholder="Ders Çalış bölümündeki konu adı"></label></div>'+
    '<label>Son teslim tarihi<input type="date" name="dueDate"></label><label>Öğretmen notu<textarea name="note" maxlength="500" rows="2"></textarea></label>'+
    '<button class="dm-owned-action" type="submit">Bu sınıfa ödev ver</button></form>';
   const f=host.querySelector('form'),sync=()=>{host.querySelector('[data-owned-game]').hidden=f.elements.kind.value!=='oyun';host.querySelector('[data-owned-lesson]').hidden=f.elements.kind.value!=='ders';};
   f.elements.kind.onchange=sync;sync();
   f.onsubmit=async e=>{e.preventDefault();const b=f.querySelector('[type=submit]');b.disabled=true;try{
    const data={classId:c.id,kind:f.elements.kind.value,game:f.elements.game.value,units:f.elements.units.value.split(',').map(x=>Number(x.trim())).filter(Number.isInteger),
     stars:Number(f.elements.stars.value),level:f.elements.level.value,category:f.elements.category.value,topic:f.elements.topic.value,dueDate:f.elements.dueDate.value,note:f.elements.note.value};
    const d=await call('teacherPortalAssignment',data);status('Ödev '+d.studentCount+' öğrenciye verildi.');f.reset();sync();
   }catch(error){status(error.message);}finally{b.disabled=false;}};
  });
 }
 async function openReports(){
  await bootstrap('📊 Raporlar','Sadece seçili sınıf ve şubedeki öğrencilerin raporlarını görüntüle.',(c,host)=>{
   host.innerHTML='<div class="dm-owned-switches">'+[['performance','Ders İçi Performans'],['weak','Sınıfın Zayıf Noktaları'],['parent','Haftalık Veli Özetleri'],['exam','Seviye Sınavı Sonuçları']].map(([k,v])=>'<button type="button" data-report="'+k+'">'+esc(v)+'</button>').join('')+'</div><div data-report-output><p>Görmek istediğin raporu seç.</p></div>';
   host.querySelectorAll('[data-report]').forEach(btn=>btn.onclick=async()=>{const output=host.querySelector('[data-report-output]');output.textContent='Rapor yükleniyor…';
    try{const data=await call('teacherPortalClassAnalytics',{classId:c.id});
     if(btn.dataset.report==='weak'){
      const wrong=data.summary?.wrongByGame||[];output.innerHTML='<h3>Sınıfın Zayıf Noktaları</h3>'+(wrong.length?'<ul>'+wrong.map(x=>'<li>'+esc(x[0])+': '+Number(x[1])+' yanlış</li>').join('')+'</ul>':'<p>Bu hafta yeterli yanlış cevap verisi bulunmuyor.</p>');
     }else if(btn.dataset.report==='exam'){
      const exams=(data.rubrics||[]).filter(x=>x.exam_score!==null&&x.exam_score!==undefined);
      output.innerHTML='<h3>Seviye Sınavı Sonuçları</h3>'+(exams.length?'<ul>'+exams.map(x=>'<li>'+esc(data.students?.find(p=>p.id===x.student_id)?.name||'Öğrenci')+': '+Number(x.exam_score)+'</li>').join('')+'</ul>':'<p>Bu sınıfta henüz seviye sınavı sonucu yok.</p>');
     }else if(btn.dataset.report==='parent'){
      const sm=data.summary||{};output.innerHTML='<h3>Haftalık Veli Özeti</h3><p>'+esc(c.classNo+'-'+c.branch)+' · Oynanan oyun: '+Number(sm.plays||0)+' · Doğru: '+Number(sm.correct||0)+' · Yanlış: '+Number(sm.wrong||0)+'</p><p>Özet yalnızca öğretmene gösterilir; velilere otomatik gönderilmez.</p>';
     }else{
      const students=data.students||[];output.innerHTML='<h3>Ders İçi Performans</h3>'+(students.length?'<div class="dm-owned-list">'+students.map(p=>'<div class="dm-owned-row"><strong>'+esc(p.name)+'</strong><span>'+Number(p.points||0)+' puan</span></div>').join('')+'</div>':'<p>Bu sınıfta henüz öğrenci yok.</p>');
     }
    }catch(error){output.textContent=error.message;}
   });
  });
 }

 // Preserve the full original Ödev Ver layout (tabs, topic browser, game choices,
 // units, stars and deadline). Only the teacher-owned class selector and sending
 // operation are replaced; do not show the simplified form above.
 let legacyHomeworkSaveInstalled=false,legacyClassList=[];
 function legacyClassFromForm(){
  const grade=Number(document.getElementById('odSinif')?.value);
  const branch=String(document.getElementById('odSube')?.value||'');
  return legacyClassList.find(c=>Number(c.classNo)===grade&&String(c.branch||'')===branch)||null;
 }
 function setLegacyHomeworkClasses(){
  const gradeSelect=document.getElementById('odSinif'),branchSelect=document.getElementById('odSube');
  if(!gradeSelect||!branchSelect)return;
  const grades=[...new Set(legacyClassList.map(c=>Number(c.classNo)))].sort((a,b)=>a-b);
  const selectedGrade=grades.includes(Number(gradeSelect.value))?Number(gradeSelect.value):grades[0];
  gradeSelect.replaceChildren(...grades.map(n=>new Option(n+'. sınıf',String(n))));
  gradeSelect.value=String(selectedGrade);
  const fillBranch=()=>{
   const grade=Number(gradeSelect.value),choices=legacyClassList.filter(c=>Number(c.classNo)===grade);
   branchSelect.replaceChildren(...choices.map(c=>new Option(c.branch+' şubesi'+(c.name?' · '+c.name:''),c.branch)));
   const count=choices.find(c=>c.branch===branchSelect.value)?.students?.length??choices[0]?.students?.length??0;
   const label=document.getElementById('odHedefSayi');if(label)label.textContent='👥 Bu ödev '+count+' öğrenciye gidecek';
  };
  // Avoid legacy handler reintroducing non-owned branches from globalDataCache.
  const originalGradeChange=gradeSelect.onchange;
  gradeSelect.onchange=()=>{originalGradeChange?.call(gradeSelect);fillBranch();};
  branchSelect.onchange=()=>{const current=legacyClassFromForm();document.getElementById('odHedefSayi').textContent='👥 Bu ödev '+(current?.students?.length||0)+' öğrenciye gidecek';};
  fillBranch();
 }
 async function legacyHomework(){
  const teacherToken=token();
  if(!teacherToken){window.yoToast?.('Öğretmen hesabınla giriş yapmalısın.');return;}
  // Load authoritative classes before the original modal so no global class
  // data is ever displayed as a selector.
  legacyClassList=await ownClasses();
  if(!legacyClassList.length){window.yoToast?.('Önce Sınıflarım bölümünden sınıf oluştur.');return;}
  sessionStorage.setItem('ing_ogr_token',teacherToken);
  if(typeof window.odevEkraniAc!=='function')throw Error('Ödev Ver ekranı yüklenmedi.');
  await window.odevEkraniAc();
  const nativeModal=document.getElementById('odModal');
  if(!nativeModal)throw Error('Önceki Ödev Ver ekranı bulunamadı.');
  // The legacy homework overlay may be nested inside a transformed/stacked
  // teacher dashboard. Portal it to body so it cannot sit behind that dashboard.
  if(nativeModal.parentElement!==document.body)document.body.appendChild(nativeModal);
  nativeModal.style.position='fixed';
  nativeModal.style.inset='0';
  nativeModal.style.zIndex='2147483646';
  nativeModal.style.visibility='visible';
  nativeModal.style.display='flex';
  setLegacyHomeworkClasses();
  // Keep the original modal at the front even when another dashboard redraw
  // happens during the async class lookup.
  nativeModal.style.zIndex='2147483646';
  nativeModal.querySelector('button:not([disabled]),[tabindex="0"]')?.focus({preventScroll:true});
  const button=document.getElementById('odVer');
  if(!button)throw Error('Ödev Ver butonu bulunamadı.');
  if(legacyHomeworkSaveInstalled)return;
  legacyHomeworkSaveInstalled=true;
  button.addEventListener('click',async event=>{
   // Stop the former unscoped API request before its inline onclick runs.
   event.preventDefault();event.stopImmediatePropagation();
   const selected=legacyClassFromForm(),result=document.getElementById('odSonuc');
   const report=(message,good=false)=>{result.className='od-sonuc '+(good?'iyi':'kotu');result.textContent=message;};
   if(!selected){report('Yalnızca kendi oluşturduğun sınıf ve şubeyi seç.');return;}
   const pickedLessons=[...document.querySelectorAll('#odKonular input[data-k]:checked')].map(x=>{
    const [level,category,...topic]=x.dataset.k.split('|');
    return {kind:'ders',level,category,topic:topic.join('|')};
   });
   const pickedGames=[...document.querySelectorAll('#odOyunlar input[data-o]:checked')].map(x=>({
    kind:'oyun',game:x.dataset.o,
    units:[...document.querySelectorAll('#odUniteler [data-u].sec')].map(u=>Number(u.dataset.u)).filter(Number.isInteger),
    stars:Number(document.querySelector('#odHedef [data-y].sec')?.dataset.y||2)
   }));
   const jobs=[...pickedLessons,...pickedGames];
   if(!jobs.length){report('En az bir ders konusu veya oyun seç.');return;}
   if(!window.confirm(selected.classNo+'. sınıf '+selected.branch+' şubesi için '+jobs.length+' ödev verilsin mi?'))return;
   button.disabled=true;button.textContent='Gönderiliyor…';
   let added=0,failed=null;
   try{
    for(const job of jobs){
     await call('teacherPortalAssignment',{classId:selected.id,...job,
      dueDate:document.getElementById('odSon')?.value||'',
      note:document.getElementById('odNot')?.value||''});
     added++;
    }
    report(added+' ödev '+(selected.students||[]).length+' öğrenci için oluşturuldu. ✅',true);
    document.querySelectorAll('#odKonular input[data-k]:checked,#odOyunlar input[data-o]:checked').forEach(el=>{
     el.checked=false;el.parentElement?.classList.remove('sec');
    });
   }catch(e){failed=e;report(added+' ödev gönderildi; kalanlar gönderilemedi: '+e.message);}
   finally{button.disabled=false;button.textContent='📝 Ödevi ver';}
  },true);
 }


 // Original announcement management dialog; keep theme, image, frequency and list.
 // Only the audience choices come from the current teacher's real classrooms.
 let announced=null;
 async function legacyAnnouncement(){
  const classes=await ownClasses();
  if(!classes.length){window.yoToast?.('Önce Sınıflarım bölümünden sınıf oluştur.');return;}
  const modal=document.getElementById('duyuruYonetimModal');
  if(!modal)throw Error('Önceki Duyuru Yönetimi ekranı yüklenemedi.');
  const currentToken=token();sessionStorage.setItem('ing_ogr_token',currentToken);
  if(typeof window.ogretmenMenuDuyuruAc==='function')window.ogretmenMenuDuyuruAc();
  else{document.getElementById('ogretmenMenuModal')?.style.setProperty('display','none');modal.style.display='flex';}
  modal.classList.add('dm-own-class-announcements');
  modal.style.zIndex='2147483645';
  modal.style.display='flex';
  const targetArea=document.getElementById('duyuruHedefSecimAlani');
  const originalEvery=document.getElementById('duyuruHerkesCb')?.closest('label');
  if(originalEvery)originalEvery.style.display='none';
  if(targetArea)targetArea.style.display='none';
  // The legacy extension re-draws target chips every second. They must never
  // expose a platform-wide selection to a regular classroom teacher.
  if(!document.getElementById('dmOwnAnnouncementStyle')){
   const st=document.createElement('style');st.id='dmOwnAnnouncementStyle';
   st.textContent='#duyuruYonetimModal.dm-own-class-announcements #cogDuyuruHedef,#duyuruYonetimModal.dm-own-class-announcements #duyuruHedefSecimAlani{display:none!important}';
   document.head.append(st);
  }
  let pick=document.getElementById('dmLegacyOwnAnnouncementSelects');
  if(!pick){
   pick=document.createElement('div');pick.id='dmLegacyOwnAnnouncementSelects';pick.className='rubric-field';
   pick.innerHTML='<label for="dmOwnAnnClass">Sınıf / Şube</label><select id="dmOwnAnnClass" required></select><label for="dmOwnAnnStudent" style="margin-top:8px">Alıcı</label><select id="dmOwnAnnStudent"></select>';
   const message=document.getElementById('duyuruMesajInput');
   if(!message)throw Error('Duyuru alanı bulunamadı.');
   message.closest('.rubric-field')?.insertAdjacentElement('afterend',pick);
  }
  const cls=pick.querySelector('#dmOwnAnnClass'),stu=pick.querySelector('#dmOwnAnnStudent');
  cls.replaceChildren(new Option('Sınıf / şube seç',''),...classes.map(c=>new Option((c.name?c.name+' · ':'')+c.classNo+'. sınıf / '+c.branch+' şubesi',c.id)));
  const fill=()=>{
   const selected=classes.find(c=>c.id===cls.value);
   stu.replaceChildren(new Option('Sınıfın tamamına',''),...(selected?.students||[]).map(p=>new Option(p.fullName||p.username,p.id)));
  };
  cls.onchange=fill;if(classes.length===1)cls.value=classes[0].id;fill();
  // Capture the original publish button before its inline onclick can send
  // an old unscoped 'duyuruEkle' request.
  const publish=[...modal.querySelectorAll('button')].find(b=>b.getAttribute('onclick')?.includes('duyuruEkleGonder'));
  if(!publish)throw Error('Eski Duyuruyu Yayınla butonu bulunamadı.');
  if(announced?.button===publish){announced.classes=classes;return;}
  announced={button:publish,classes};
  publish.addEventListener('click',async e=>{
   e.preventDefault();e.stopImmediatePropagation();
   const chosen=(announced.classes||[]).find(c=>c.id===cls.value);
   const msg=document.getElementById('duyuruEkleSonucMesaj');
   const say=x=>{if(msg)msg.textContent=x;};
   if(!chosen){say('Önce kendi sınıfını seç.');return;}
   const title=document.getElementById('duyuruBaslikInput')?.value?.trim()||'';
   const message=document.getElementById('duyuruMesajInput')?.value?.trim()||'';
   if(title.length<3||message.length<3){say('Başlık ve mesaj en az üç karakter olmalı.');return;}
   publish.disabled=true;
   try{
    const d=await call('teacherPortalAnnouncement',{classId:chosen.id,studentId:stu.value,title,message,
     imageLink:document.getElementById('duyuruGorselInput')?.value||'',
     theme:document.getElementById('duyuruTemaSelect')?.value||'mavi',
     displayLimit:Number(document.getElementById('duyuruGosterimSelect')?.value||0)});
    say('Duyuru '+d.studentCount+' öğrenciye gönderildi.');
    document.getElementById('duyuruBaslikInput').value='';
    document.getElementById('duyuruMesajInput').value='';
   }catch(err){say(err.message||'Duyuru gönderilemedi.');}
   finally{publish.disabled=false;}
  },true);
 }
 window.dmTeacherOwnedTools={performance:openPerformance,announcements:openAnnouncement,homework:openHomework,legacyHomework,legacyAnnouncement,reports:openReports,classes:ownClasses};
})();
