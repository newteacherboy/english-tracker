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
    document.querySelectorAll('.sm-overlay').forEach(x=>x.remove());
    if(!document.getElementById('smStyle')){
      const s=document.createElement('style');s.id='smStyle';s.textContent=`.sm-overlay{position:fixed;inset:0;z-index:10000002;background:#123e36aa;display:flex;align-items:center;justify-content:center;padding:12px}.sm-dialog{width:100%;max-width:720px;max-height:90dvh;overflow:auto;padding:20px;background:#fffdf4;border-radius:24px;color:#173f34;box-shadow:0 16px 60px #113c3655}.sm-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.sm-dialog h3{font-size:21px;margin:0 0 12px}.sm-dialog p{line-height:1.5;margin:8px 0}.sm-dialog button{padding:10px 14px;border:0;border-radius:12px;background:#137d66;color:white;font:800 14px inherit;cursor:pointer}.sm-dialog button:disabled{opacity:.5}.sm-dialog button:focus-visible{outline:3px solid #efb643;outline-offset:3px}.sm-dialog input,.sm-dialog select,.sm-dialog textarea{width:100%;box-sizing:border-box;padding:11px;border:2px solid #cde3db;border-radius:12px;background:white;color:#173f34;font:inherit;margin:4px 0 10px}.sm-dialog label{display:block;font-weight:800;font-size:13px}.sm-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.sm-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #e0e9dd}.sm-row small{display:block;color:#587266;margin-top:4px}.sm-status{color:#9c3417;white-space:pre-line;margin:10px 0;min-height:22px}.sm-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.sm-dialog textarea{min-height:160px}.sm-dialog [hidden]{display:none!important}@media(max-width:480px){.sm-pair{grid-template-columns:1fr}.sm-dialog{padding:16px}}`;document.head.appendChild(s);
    }
    const p=document.createElement('div');p.className='sm-overlay';p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');p.setAttribute('aria-label',title);
    p.innerHTML=`<div class="sm-dialog"><div class="sm-heading"><h3>${esc(title)}</h3><button type="button" class="sm-close" aria-label="Kapat">✕</button></div>${content}<div class="sm-status" role="status" aria-live="polite"></div></div>`;
    const close=()=>{p.remove();document.removeEventListener('keydown',key);};const key=e=>{if(e.key==='Escape')close();};
    p.querySelector('.sm-close').onclick=close;p.onclick=e=>{if(e.target===p)close();};document.addEventListener('keydown',key);document.body.appendChild(p);
    return {p,$:s=>p.querySelector(s),message:s=>p.querySelector('.sm-status').textContent=s||''};
  }
  function classSelect(id){return `<select id="${id}">${[1,2,3,4,5,6,7,8].map(n=>`<option value="${n}">${n}. sınıf</option>`).join('')}</select>`;}
  function openCreate(){
    const m=modal('Öğrenci hesabı ekle',`<p>Öğrenciler onaylı olarak doğrudan sana bağlanır. Hesap sayısına sınır yok. Telefon ve e-posta için 15 günlük süre öğrencinin ilk girişinde başlar.</p><label>Varsayılan okul (isteğe bağlı)<input id="smSchool" maxlength="120"></label><div class="sm-pair"><label>Varsayılan sınıf${classSelect('smClass')}</label><label>Varsayılan şube<input id="smBranch" maxlength="10" placeholder="A"></label></div><label for="smLines">Her satıra bir öğrenci</label><p><small>kullanıcı adı; şifre; sınıf; şube<br>Sınıf ve şube boşsa yukarıdaki seçim kullanılır. Şifre en az 6 karakter olmalı.</small></p><textarea id="smLines" autocomplete="off" spellcheck="false" placeholder="ogrenci01; gucluSifre01; 5; A&#10;ogrenci02; gucluSifre02; 5; A"></textarea><button type="button" id="smCreate">Öğrencileri kaydet</button><div id="smCreated" aria-live="polite"></div>`);
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
      m.message('');m.$('#smList').innerHTML=r.liste.map((s,i)=>`<div class="sm-row"><span><b>${esc(s.username)}</b><small>${esc(s.school||'Okul belirtilmedi')} · ${esc(s.class_no||'—')}/${esc(s.branch||'—')} · ${esc(s.status)}</small></span><button type="button" data-edit="${i}">Düzenle</button></div>`).join('')||'<p>Öğrenci bulunamadı.</p>';
      m.$('#smPrev').disabled=page===0;m.$('#smNext').disabled=(page+1)*50>=r.toplam;m.$('#smCount').textContent=`${r.toplam} öğrenci · sayfa ${page+1}`;
      m.p.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(r.liste[Number(b.dataset.edit)]));
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
  window.dmStudentManagement={openCreate,openAdmin};
})();
