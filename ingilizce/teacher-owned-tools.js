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
 window.dmTeacherOwnedTools={performance:openPerformance,announcements:openAnnouncement,homework:openHomework,reports:openReports,classes:ownClasses};
})();
