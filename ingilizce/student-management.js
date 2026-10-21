(function(){
  'use strict';
  const API='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function request(body){
    const t=sessionStorage.getItem('ing_ogr_token');
    if(!t)return {ok:false,mesaj:'Öğretmen paneline tekrar giriş yap.'};
    try{return await (await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,t})})).json();}
    catch{return {ok:false,mesaj:'Bağlantı kurulamadı. Listeyi kontrol ederek tekrar dene.'};}
  }
  function modal(title,content){
    const teacherMenu=document.getElementById('ogretmenMenuModal');
    if(teacherMenu)teacherMenu.style.display='none';
    document.querySelectorAll('.sm-overlay').forEach(x=>{if(x.dmClose)x.dmClose();else x.remove();});
    if(!document.getElementById('smStyle')){
      const s=document.createElement('style');s.id='smStyle';s.textContent=`.sm-overlay{position:fixed;inset:0;z-index:100000120;background:#123e36aa;display:flex;align-items:center;justify-content:center;padding:12px}.sm-dialog{width:100%;max-width:720px;max-height:90dvh;overflow:auto;padding:20px;background:#fffdf4;border-radius:24px;color:#173f34;box-shadow:0 16px 60px #113c3655}.sm-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.sm-dialog h3{font-size:21px;margin:0 0 12px}.sm-dialog p{line-height:1.5;margin:8px 0}.sm-dialog button{padding:10px 14px;border:0;border-radius:12px;background:#137d66;color:white;font:800 14px inherit;cursor:pointer}.sm-dialog button:disabled{opacity:.5}.sm-dialog button:focus-visible{outline:3px solid #efb643;outline-offset:3px}.sm-dialog input,.sm-dialog select,.sm-dialog textarea{width:100%;box-sizing:border-box;padding:11px;border:2px solid #cde3db;border-radius:12px;background:white;color:#173f34;font:inherit;margin:4px 0 10px}.sm-dialog label{display:block;font-weight:800;font-size:13px}.sm-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.sm-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #e0e9dd}.sm-row small{display:block;color:#587266;margin-top:4px}.sm-status{color:#9c3417;white-space:pre-line;margin:10px 0;min-height:22px}.sm-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.sm-dialog textarea{min-height:160px}.sm-dialog [hidden]{display:none!important}@media(max-width:480px){.sm-pair{grid-template-columns:1fr}.sm-dialog{padding:16px}}`;document.head.appendChild(s);
    }
    const p=document.createElement('div');p.className='sm-overlay';p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');p.setAttribute('aria-label',title);
    p.innerHTML=`<div class="sm-dialog"><div class="sm-heading"><h3>${esc(title)}</h3><button type="button" class="sm-close" aria-label="Kapat">✕</button></div>${content}<div class="sm-status" role="status" aria-live="polite"></div></div>`;
    const close=()=>{p.remove();document.removeEventListener('keydown',key);};const key=e=>{if(e.key==='Escape')close();};
    p.dmClose=close;p.querySelector('.sm-close').onclick=close;p.onclick=e=>{if(e.target===p)close();};document.addEventListener('keydown',key);document.body.appendChild(p);
    return {p,close,$:s=>p.querySelector(s),message:s=>p.querySelector('.sm-status').textContent=s||''};
  }
  function classSelect(id){return `<select id="${id}">${[1,2,3,4,5,6,7,8].map(n=>`<option value="${n}">${n}. sınıf</option>`).join('')}</select>`;}
  function openCreate(){
    const m=modal('Öğrenci hesabı ekle',`<p>Öğrenciler onaylı olarak doğrudan sana bağlanır. Hesap sayısına sınır yok. Telefon ve e-posta için 15 günlük süre öğrencinin ilk girişinde başlar.</p><p><b>Kullanıcı adı takma ad olmalı</b> (ör. <code>yildiz42</code>; boşluksuz, 3-20 karakter). Liglerde herkes bunu görür, öğrencinin gerçek adını yazma.</p><label>Varsayılan okul (isteğe bağlı)<input id="smSchool" maxlength="120"></label><div class="sm-pair"><label>Varsayılan sınıf${classSelect('smClass')}</label><label>Varsayılan şube<input id="smBranch" maxlength="10" placeholder="A"></label></div><label for="smLines">Her satıra bir öğrenci</label><p><small>kullanıcı adı; şifre; sınıf; şube<br>Sınıf ve şube boşsa yukarıdaki seçim kullanılır. Şifre en az 6 karakter olmalı.</small></p><textarea id="smLines" autocomplete="off" spellcheck="false" placeholder="ogrenci01; gucluSifre01; 5; A&#10;ogrenci02; gucluSifre02; 5; A"></textarea><button type="button" id="smCreate">Öğrencileri kaydet</button><div id="smCreated" aria-live="polite"></div>`);
    m.$('#smClass').value='5';
    m.$('#smCreate').onclick=async()=>{
      const lines=m.$('#smLines').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      if(!lines.length)return m.message('En az bir öğrenci satırı ekle.');
      const rows=lines.map(line=>{const [k,s,c,b,...extra]=line.split(';').map(x=>x.trim());return {kullanici:k,sifre:s,sinif:Number(c||m.$('#smClass').value),sube:b||m.$('#smBranch').value.trim(),okul:m.$('#smSchool').value.trim(),extra};});
      const names=new Set();
      for(let i=0;i<rows.length;i++) {const r=rows[i];if(r.extra.length||!r.kullanici||r.sifre.length<6||!Number.isInteger(r.sinif)||r.sinif<1||r.sinif>8||!r.sube||names.has(r.kullanici.toLowerCase()))return m.message(`${i+1}. satırı kontrol et. Kullanıcı adları benzersiz, şifre en az 6 karakter, sınıf ve şube dolu olmalı.`);names.add(r.kullanici.toLowerCase());delete r.extra;}
      const button=m.$('#smCreate');button.disabled=true;let done=0;
      try{
        while(done<rows.length){
          m.message(`${done}/${rows.length} öğrenci kaydedildi…`);
          const batch=rows.slice(done,done+25),r=await request({islem:'ogretmenOgrenciOlustur',ogrenciler:batch});
          if(!r.ok){m.message(`${done} öğrenci kaydedildi. ${r.mesaj||'Kalan grup kaydedilemedi.'}`);return;}
          done+=batch.length;m.$('#smLines').value=lines.slice(done).join('\n');
          const note=document.createElement('p');note.textContent='Kaydedildi: '+r.ogrenciler.map(x=>x.username).join(', ');m.$('#smCreated').appendChild(note);
        }
        m.message(`${done} öğrenci kaydedildi. Kullanıcı adı ve belirlediğin şifreyle giriş yapabilirler.`);
      }finally{button.disabled=false;}
    };
  }
  async function openAdmin(){
    const m=modal('Yönetici · Öğrenci hesapları',`<p>Tüm kayıtlı öğrencilerin kullanıcı adı, yeni şifre, okul, sınıf ve şube bilgilerini düzenleyebilirsin. Kullanıcı adı veya şifre değişince öğrenci yeniden giriş yapar.</p><label>Öğrenci ara<input id="smSearch" type="search" placeholder="Kullanıcı adı"></label><button id="smFind" type="button">Ara</button><div id="smList"></div><div class="sm-actions"><button id="smPrev" type="button">Önceki</button><button id="smNext" type="button">Sonraki</button><span id="smCount"></span></div>`);
    let page=0,search='',busy=false;
    async function list(){
      if(busy)return;busy=true;m.message('Yükleniyor…');
      const r=await request({islem:'yoneticiOgrenciler',sayfa:page,arama:search});busy=false;
      if(!m.p.isConnected)return;
      if(!r.ok){m.$('#smList').textContent='';m.message(r.mesaj);return;}
      m.message('');m.$('#smList').innerHTML=r.liste.map((s,i)=>`<div class="sm-row"><span><b>${esc(s.username)}</b><small>${esc(s.school||'Okul belirtilmedi')} · ${esc(s.class_no||'—')}/${esc(s.branch||'—')} · ${esc(s.status)}</small></span><div class="sm-actions"><button type="button" data-edit="${i}">Düzenle</button><button type="button" class="sm-delete" data-delete="${i}">Öğrenciyi sil</button></div></div>`).join('')||'<p>Öğrenci bulunamadı.</p>';
      m.$('#smPrev').disabled=page===0;m.$('#smNext').disabled=(page+1)*50>=r.toplam;m.$('#smCount').textContent=`${r.toplam} öğrenci · sayfa ${page+1}`;
      m.p.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(r.liste[Number(b.dataset.edit)]));
      m.p.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>confirmDelete(r.liste[Number(b.dataset.delete)]));
    }
    function confirmDelete(s){
      const d=modal('Öğrenci hesabını sil',`<p><b>${esc(s.username)}</b> hesabı ve bağlı ilerlemesi kalıcı olarak silinecek. Diğer öğrenciler etkilenmez.</p><form id="smDeleteForm" class="sm-delete-form"><label for="smDeletePassword">Kendi yönetici şifren<input id="smDeletePassword" type="password" required maxlength="256" autocomplete="current-password"></label><div class="sm-actions"><button type="button" id="smDeleteCancel">Vazgeç</button><button type="submit" id="smDeleteConfirm" class="sm-delete">Öğrenciyi kalıcı olarak sil</button></div></form>`);
      d.$('#smDeleteCancel').onclick=()=>{d.close();openAdmin();};
      d.$('#smDeleteForm').onsubmit=async event=>{
        event.preventDefault();const input=d.$('#smDeletePassword'),password=input.value;if(!password)return d.message('Kendi yönetici şifreni gir.');
        d.$('#smDeleteConfirm').disabled=true;d.message('Şifren doğrulanıyor…');input.value='';
        const r=await request({islem:'yoneticiOgrenciSil',id:s.id,sonGuncelleme:s.updated_at,onayKullanici:s.username,mevcutSifre:password});
        if(!d.p.isConnected)return;
        if(!r.ok){d.message(r.mesaj||'Öğrenci silinemedi.');d.$('#smDeleteConfirm').disabled=false;input.focus();return;}
        d.close();await openAdmin();
      };
      d.$('#smDeletePassword').focus();
    }
    function edit(s){
      const e=modal('Öğrenci bilgilerini düzenle',`<form id="smEdit"><label>Kullanıcı adı<input id="smUsername" maxlength="50" required autocomplete="off" value="${esc(s.username)}"></label><label>Yeni şifre (boş bırakılırsa korunur)<input id="smPassword" type="password" minlength="6" maxlength="64" autocomplete="new-password"></label><label>Okul<input id="smEditSchool" maxlength="120" value="${esc(s.school||'')}"></label><div class="sm-pair"><label>Sınıf${classSelect('smEditClass')}</label><label>Şube<input id="smEditBranch" maxlength="10" required value="${esc(s.branch||'')}"></label></div><button type="submit" id="smSave">Değişiklikleri kaydet</button></form>`);
      e.$('#smEditClass').value=String(s.class_no||5);
      e.$('#smEdit').onsubmit=async ev=>{
        ev.preventDefault();const b=e.$('#smSave');b.disabled=true;e.message('Kaydediliyor…');
        const r=await request({islem:'yoneticiOgrenciKaydet',id:s.id,sonGuncelleme:s.updated_at,kullanici:e.$('#smUsername').value,okul:e.$('#smEditSchool').value,sinif:Number(e.$('#smEditClass').value),sube:e.$('#smEditBranch').value,yeniSifre:e.$('#smPassword').value});
        b.disabled=false;e.message(r.mesaj);if(r.ok){s=r.ogrenci;e.$('#smPassword').value='';}
      };
    }
    m.$('#smFind').onclick=()=>{search=m.$('#smSearch').value.trim();page=0;list();};
    m.$('#smSearch').onkeydown=e=>{if(e.key==='Enter')m.$('#smFind').click();};
    m.$('#smPrev').onclick=()=>{page--;list();};m.$('#smNext').onclick=()=>{page++;list();};
    await list();
  }
  async function openContacts(){
    const m=modal('Yönetici · Üye iletişim listesi',`<p>Tüm öğrenci hesaplarının e-posta ve telefonlarını toplu görebilir, kopyalayabilir veya Excel için indirebilirsin. Bu bilgiler kişisel veridir; yalnızca uygulama işleri için kullan, toplu e-posta yalnızca kayıtta izin veren (✉️ İzinli) üyelere gönderilmeli.</p><label style="display:flex;align-items:center;gap:8px;font-weight:800"><input id="scOnlyConsent" type="checkbox" style="width:auto;margin:0"> Sadece mail izni olanları göster</label><div class="sm-pair"><label>Kullanıcı adı ara<input id="scSearch" type="search" placeholder="Boş = hepsi"></label><label>Sınıf<select id="scClass"><option value="0">Tüm sınıflar</option>${[1,2,3,4,5,6,7,8].map(n=>`<option value="${n}">${n}. sınıf</option>`).join('')}</select></label></div><div class="sm-actions"><button type="button" id="scLoad">Listele</button><button type="button" id="scCopyMail" disabled>📧 İzinli e-postaları kopyala</button><button type="button" id="scCopyPhone" disabled>📱 Telefonları kopyala</button><button type="button" id="scCsv" disabled>⬇️ Excel (CSV) indir</button></div><p id="scSummary"></p><div id="scTable" style="overflow:auto"></div>`);
    let rows=[],allRows=[];
    const consentLabel=v=>v==='var'?'✉️ İzinli':v==='cikti'?'🚫 Abonelikten çıktı':'— İzin yok';
    const uniq=a=>[...new Set(a.filter(Boolean))];
    async function copy(text,btn,label){
      try{await navigator.clipboard.writeText(text);}catch{const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();}
      const o=btn.textContent;btn.textContent='✓ '+label+' kopyalandı';setTimeout(()=>{btn.textContent=o;},1800);
    }
    async function load(){
      const b=m.$('#scLoad');b.disabled=true;m.message('Yükleniyor…');
      const r=await request({islem:'yoneticiIletisimListesi',arama:m.$('#scSearch').value.trim(),sinif:Number(m.$('#scClass').value)});
      b.disabled=false;if(!m.p.isConnected)return;
      if(!r.ok){m.message(r.mesaj||'Liste alınamadı.');return;}
      m.message('');allRows=r.liste||[];m.$('#scSummary').textContent=`${r.toplam} öğrenci · ${r.emailSayisi} e-posta (${r.izinliSayisi} izinli) · ${r.telefonSayisi} telefon`;render();
    }
    function render(){
      rows=m.$('#scOnlyConsent').checked?allRows.filter(x=>x.mailIzni==='var'):allRows;
      ['#scCopyMail','#scCopyPhone','#scCsv'].forEach(x=>m.$(x).disabled=!rows.length);
      m.$('#scTable').innerHTML=rows.length?`<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;border-bottom:2px solid #cde3db"><th style="padding:6px">Kullanıcı</th><th style="padding:6px">Sınıf</th><th style="padding:6px">E-posta</th><th style="padding:6px">Mail izni</th><th style="padding:6px">Telefon</th></tr></thead><tbody>${rows.map(x=>`<tr style="border-bottom:1px solid #e0e9dd"><td style="padding:6px"><b>${esc(x.kullanici)}</b>${x.okul?`<br><small>${esc(x.okul)}</small>`:''}</td><td style="padding:6px">${esc(x.sinif||'—')}/${esc(x.sube||'—')}</td><td style="padding:6px;word-break:break-all">${x.email?`<a href="mailto:${esc(x.email)}">${esc(x.email)}</a>${x.emailOnayli?' ✓':''}`:'—'}</td><td style="padding:6px;white-space:nowrap">${x.email?consentLabel(x.mailIzni):'—'}</td><td style="padding:6px;white-space:nowrap">${x.telefon?`<a href="tel:${esc(x.telefon)}">${esc(x.telefon)}</a>`:'—'}</td></tr>`).join('')}</tbody></table><p><small>✓ = e-posta doğrulanmış</small></p>`:'<p>Öğrenci bulunamadı.</p>';
    }
    m.$('#scLoad').onclick=load;
    m.$('#scOnlyConsent').onchange=render;
    m.$('#scSearch').onkeydown=e=>{if(e.key==='Enter')load();};
    m.$('#scCopyMail').onclick=e=>copy(uniq(rows.filter(x=>x.mailIzni==='var').map(x=>x.email)).join(', '),e.target,'İzinli e-postalar');
    m.$('#scCopyPhone').onclick=e=>copy(uniq(rows.map(x=>x.telefon)).join('\n'),e.target,'Telefonlar');
    m.$('#scCsv').onclick=()=>{
      const c=v=>{let t=String(v??'');if(/^[=+\-@]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};
      const lines=[['Kullanıcı adı','Okul','Sınıf','Şube','Durum','E-posta','E-posta doğrulandı','Mail izni','Telefon','Kayıt tarihi'].map(c).join(';')]
        .concat(rows.map(x=>[x.kullanici,x.okul,x.sinif,x.sube,x.durum,x.email,x.emailOnayli?'Evet':'Hayır',x.mailIzni==='var'?'Var':x.mailIzni==='cikti'?'Abonelikten çıktı':'Yok',x.telefon,(x.kayit||'').slice(0,10)].map(c).join(';')));
      const blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`dijimedu-uye-iletisim-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    };
    await load();
  }
  window.dmStudentManagement={openCreate,openAdmin,openContacts};
})();
