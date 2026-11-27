/* Keep the teacher workspace open while child screens come and go. */
(()=>{'use strict';
const style=document.createElement('link');style.rel='stylesheet';style.href='teacher-workspace.css?v=20261110-spacious-home-3';document.head.append(style);
const selectedStyle=document.createElement('link');selectedStyle.rel='stylesheet';selectedStyle.href='teacher-dashboard-selected.css?v=20261115-design1';document.head.append(selectedStyle);
const $=id=>document.getElementById(id),token=()=>{try{return JSON.parse(sessionStorage.getItem('dm_tp_session')||'null')?.teacherToken||sessionStorage.getItem('ing_ogr_token')||'';}catch{return sessionStorage.getItem('ing_ogr_token')||'';}};
const ownedToolReady=new Promise(resolve=>{
 const script=document.createElement('script');script.src='teacher-owned-tools.js?v=20261112-sinif-yok';
 script.onload=()=>resolve(true);script.onerror=()=>resolve(false);document.head.append(script);
});
async function openOwnedTool(key){
 if(!token()){window.yoToast?.('Öğretmen hesabınla giriş yapmalısın.');return;}
 const loaded=await ownedToolReady;
 if(!loaded||typeof window.dmTeacherOwnedTools?.[key]!=='function'){window.yoToast?.('Sınıf araçları yüklenemedi. Sayfayı yenile.');return;}
 try{await window.dmTeacherOwnedTools[key]();}catch(e){window.yoToast?.(e.message||'Sınıf aracı açılamadı.');}
}

let active=false,total=0,registrations=0,messages=0,reading=false,lastRead=0,menuSeen=false;
async function api(op,data={}){const r=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:op,t:token(),...data})});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.mesaj||'Bildirimler alınamadı.');return d;}
function paintBadge(){for(const b of document.querySelectorAll('[data-profile="teacher"]')){let badge=b.querySelector('.dm-teacher-count');if(!badge){badge=document.createElement('span');badge.className='dm-teacher-count';b.append(badge);}badge.textContent=String(total);badge.hidden=total===0;b.setAttribute('aria-label','Öğretmen Paneli'+(total?' · '+total+' bildirim':''));}}
async function refresh(force=false){if(!token()||reading||document.hidden||!force&&Date.now()-lastRead<60000)return;reading=true;try{const d=await api('teacherNotificationSummary');total=d.total||0;registrations=d.registrations||0;messages=d.messages||0;lastRead=Date.now();paintBadge();const board=$('dmTeacherDesignV2');if(board){const badge=board.querySelector('[data-v2-chat-count]');if(badge){badge.textContent=String(messages);badge.hidden=!messages;}}}catch(e){console.warn('[Öğretmen bildirimleri]',e.message);}finally{reading=false;}}
function visible(el){return !!el&&el.getClientRects().length>0&&(el.checkVisibility?el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}):getComputedStyle(el).visibility!=='hidden');}
const childSelector='.rubric-modal,.cog-perde,.sm-overlay,.dm-member-overlay,.dm-account-overlay,.dm-perde,.yo-modal,.yo-perde,#yoModalPerde,#omSifreModal,#odModal,#duyuruYonetimModal,.game-modal-overlay,.seviye-harita-overlay,#rallyGame,#meteorGame,#wordWheel,#papiCards,#dmTeacherOral,#mlThemeList,#dmStoryLesson,.gso-overlay';
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
  [/ödev ver|ödev/i,'📝','Ödev ve etkinlikleri düzenle'],
  [/rubrik/i,'📊','Öğrencilerin becerilerini değerlendir'],
  [/ders içi performans/i,'📈','Ders içindeki gelişimi takip et'],
  [/sınıf oyun/i,'🎮','Oyunları sınıfınla birlikte oyna'],
  [/duyuru/i,'📣','Sınıfına duyuru gönder'],
  [/bekleyen kayıt/i,'📥','Yeni öğrenci başvurularını incele'],
  [/öğrenci sohbet/i,'💬','Öğrenci mesajlarını yanıtla'],
  [/öğretmen hesabımı sil/i,'🛡️','Hesap ayarlarını yönet'],
  [/gizlilik|kvkk/i,'🔒','Gizlilik ve veri ayarlarını incele'],
  [/zayıf nokta/i,'🎯','Sınıfının gelişime açık konularını gör'],
  [/veli özet/i,'👨‍👩‍👧','Öğrenci gelişimini velilerle paylaş'],
  [/öğrenci şifresi/i,'🔑','Öğrenci erişim sorunlarını çöz'],
  [/seviye sınav/i,'📑','Dil seviyelerini ve sonuçları incele'],
  [/sözlü yap/i,'🎤','Kelime bilgisi için sözlü uygula']
 ];
 const fallbackIcons=['🧑‍🏫','📘','🏫','🗓️','📝','📈','🗂️','🏅','🧠','🧮','📌','🎨','📎','🔔'];
 let cardIndex=0;
 for(const b of [...content.querySelectorAll('.ogretmen-menu-btn')]){
  const raw=(b.dataset.dmTeacherTitle||b.textContent||'').trim();
  // The teacher practice entry is a real tool and must remain visible.
  if(!b.dataset.dmTeacherCard){
   const entry=tools.find(([re])=>re.test(raw));
   const title=raw.replace(/^[^\p{L}\p{N}]+/u,'').trim();
   const old=b.querySelector('span:not(.ogretmen-menu-rozet)');
   if(old){old.textContent=title;old.classList.add('dm-teacher-card-title');}
   else{const label=document.createElement('span');label.className='dm-teacher-card-title';label.textContent=title;b.prepend(label);}
   const mark=document.createElement('span');mark.className='dm-teacher-card-icon';mark.setAttribute('aria-hidden','true');mark.textContent=entry?.[1]||fallbackIcons[cardIndex%fallbackIcons.length];b.prepend(mark);
   const description=entry?.[2]||'';
   // Do not repeat the title as a subtitle or add generic filler under every card.
   if(description&&description.toLocaleLowerCase('tr')!==title.toLocaleLowerCase('tr')){const note=document.createElement('small');note.textContent=description;b.append(note);}
   // Older cards may contain the title a second time as their own text node.
   [...b.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()===title).forEach(n=>n.remove());
   b.dataset.dmTeacherTitle=title;b.dataset.dmTeacherCard='1';
  }
  cardIndex++;
  const show=!query||b.dataset.dmTeacherTitle.toLocaleLowerCase('tr').includes(query);
  const shouldHide=!show||b.dataset.dmHomeRelocated==='1';if(b.hidden!==shouldHide)b.hidden=shouldHide;if(show&&!b.hidden)count++;
 }
 const empty=hero.querySelector('.dm-teacher-no-results');if(empty.hidden===(count>0))empty.hidden=!(count>0);
}

function openNoticeMailCenter(){
 if(!token()){window.yoToast?.('Bu alan için öğretmen oturumu gerekiyor.');return;}
 const existing=document.getElementById('dmNoticeMailCenter');if(existing){existing.remove();return;}
 const shade=document.createElement('div');shade.id='dmNoticeMailCenter';shade.className='dm-teacher-child';shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');shade.setAttribute('aria-label','Duyuru ve Mail Yönetim Merkezi');
 shade.style.cssText='position:fixed;inset:0;z-index:2147483620;background:#133044b8;display:flex;align-items:center;justify-content:center;padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));box-sizing:border-box';
 const panel=document.createElement('section');panel.style.cssText='background:#f8fcfd;color:#153e53;border-radius:20px;width:min(900px,100%);height:min(850px,100%);max-height:100%;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;padding:14px;font:inherit;box-shadow:0 18px 70px #09293555';
 const rules=[
 ['Öğretmen uyarısı / cezası','1 · Kritik','İlgili öğrenci; okunma veya itiraz kaydı tutulur','Öncelikli; güvenli ilk ekran'],
 ['E-posta doğrulama','2 · Hesap','Doğrulanmamış öğrenci','Oyunlar sekmesinde ilk giriş; kapanırsa 10 dakika sonra uygun ekran'],
 ['Başlangıç ve seviye tespiti','3 · Tanıtım','Yeni veya uygun öğrenci','Uygun giriş / ilk yönlendirme'],
 ['Lig değişikliği','4 · Sosyal','Sırası değişen öğrenci','Arkadaşlar sekmesine girişte; yalnızca yeni değişiklik'],
 ['Haftalık sınav ve diğer hatırlatmalar','5 · Normal','Koşullara uyan öğrenci','İlk 5 aktif dakika sonrası; arada 5 dakika; oturumda en çok 3']
 ];
 const mails=[
 ['Pazar lig özeti','Pazar 19.00','Planlanan saat; sunucu görevinin aktifliği ayrıca doğrulanmalı'],
 ['Haftalık lig hatırlatması','Pazartesi öğlen','Sunucu çalışması ayrıca doğrulanmalı'],
 ['Üç günde bir otomatik ileti','3 günde bir','Sunucu çalışması ayrıca doğrulanmalı'],
 ['Öğrenci hatırlatma grupları','Günlük, tekrarsız hedefleme','Günlük kota 240; sunucu çalışması ayrıca doğrulanmalı']
 ];
 const h=document.createElement('header');h.style.cssText='display:flex;align-items:flex-start;justify-content:space-between;gap:12px';h.innerHTML='<div><small>ÖĞRETMEN ARAÇLARI</small><h2 style="margin:4px 0">📣 Duyuru ve Mail Yönetim Merkezi</h2><p style="margin:4px 0;color:#537385">Kural envanteri ve kontrol ekranı</p></div>';
 const close=document.createElement('button');close.type='button';close.textContent='✕ Kapat';close.style.cssText='border:0;border-radius:12px;padding:12px;background:#e4f1f3;color:#13465b;font-weight:700';close.onclick=()=>shade.remove();h.append(close);panel.append(h);
 const nav=document.createElement('nav');nav.style.cssText='display:flex;flex:0 0 auto;overflow-x:auto;gap:8px;margin:10px 0;padding-bottom:4px';panel.append(nav);
 const content=document.createElement('div');content.style.cssText='flex:1;min-height:0;min-width:0;overflow:auto;overscroll-behavior:contain;overflow-wrap:anywhere';panel.append(content);
 function table(headers,rows){const t=document.createElement('table');t.style.cssText='width:100%;border-collapse:collapse;font-size:13px';const tr=document.createElement('tr');for(const x of headers){const th=document.createElement('th');th.textContent=x;th.style.cssText='text-align:left;border-bottom:2px solid #c7e0e7;padding:10px 6px';tr.append(th)}t.append(tr);for(const row of rows){const r=document.createElement('tr');for(const x of row){const td=document.createElement('td');td.textContent=x;td.style.cssText='border-bottom:1px solid #dde9ed;padding:10px 6px;vertical-align:top';r.append(td)}t.append(r)}return t;}
 async function editRemoteRules(){
  content.replaceChildren();
  const heading=document.createElement('h3');heading.textContent='Merkezi Kural Ayarları';content.append(heading);
  const notice=document.createElement('p');notice.textContent='Kurallar yönetici veritabanına kaydedilir. Henüz eski duyuru ve mail zamanlayıcılarına otomatik uygulanmaz.';content.append(notice);
  const holder=document.createElement('div');holder.textContent='Kurallar yükleniyor…';content.append(holder);
  try{
    const response=await api('communicationRulesList');
    holder.replaceChildren();
    for(const rule of response.rules||[]){
      const card=document.createElement('article');card.style.cssText='margin:12px 0;padding:14px;border:1px solid #c6dfe5;border-radius:14px;background:white';
      const label=document.createElement('strong');label.textContent=rule.title;
      const status=document.createElement('label');status.style.cssText='display:flex;align-items:center;gap:8px;margin:10px 0';
      const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=rule.enabled;status.append(enabled,document.createTextNode('Etkin'));
      const caption=document.createElement('small');caption.textContent=rule.category==='mail'?'Mail kuralı':'Duyuru kuralı';
      const area=document.createElement('textarea');area.value=JSON.stringify(rule.settings,null,2);area.setAttribute('aria-label',rule.title+' JSON ayarları');area.rows=4;area.style.cssText='width:100%;font:12px monospace;padding:9px;border:1px solid #bfd5dc;border-radius:10px';
      const save=document.createElement('button');save.type='button';save.textContent='Değişiklikleri kaydet';save.style.cssText='margin:8px 0;border:0;background:#087c78;color:white;padding:10px;border-radius:10px;cursor:pointer';
      const feedback=document.createElement('p');feedback.setAttribute('role','status');
      save.onclick=async()=>{save.disabled=true;feedback.textContent='Kaydediliyor…';try{
        const settings=JSON.parse(area.value);
        const result=await api('communicationRulesSave',{key:rule.key,enabled:enabled.checked,settings});
        feedback.textContent=result.notice||'Kaydedildi.';rule.settings=result.rule.settings;
      }catch(e){feedback.textContent='Kaydedilemedi: '+e.message;}finally{save.disabled=false;}};
      card.append(label,caption,status,area,save,feedback);holder.append(card);
    }
    if(!response.rules?.length)holder.textContent='Kural kaydı bulunamadı.';
  }catch(e){holder.textContent='Ayarlar yüklenemedi: '+e.message;}
 }
 function emailCenter(){
  content.innerHTML=`<style>
  #dmNoticeMailCenter [data-mail-form]{display:grid;gap:12px;min-width:0;font-size:14px}
  #dmNoticeMailCenter [data-mail-form] *{box-sizing:border-box;min-width:0}
  #dmNoticeMailCenter [data-mail-form] [hidden]{display:none!important}
  #dmNoticeMailCenter .mail-card{padding:14px;border:1px solid #cfe3e6;border-radius:16px;background:#fff;display:grid;gap:12px}
  #dmNoticeMailCenter .mail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px}
  #dmNoticeMailCenter [data-mail-form] label{display:grid;gap:5px;font-weight:650}
  #dmNoticeMailCenter [data-mail-form] input:not([type=checkbox]),#dmNoticeMailCenter [data-mail-form] select,#dmNoticeMailCenter [data-mail-form] textarea{width:100%;max-width:100%;padding:11px;border:1px solid #bed5db;border-radius:10px;background:#f8fcfd;color:#153e53;font:inherit}
  #dmNoticeMailCenter [data-mail-form] button{padding:11px;border:1px solid #c9e0e4;border-radius:11px;background:#eaf5f5;color:#15515c;font:inherit;font-weight:700;white-space:normal}
  #dmNoticeMailCenter [data-mail-form] button:disabled{opacity:.5;cursor:not-allowed}
  #dmNoticeMailCenter [data-mail-form] [data-queue],#dmNoticeMailCenter [data-mail-form] [data-preview]{background:#087d78;color:white;border:0}
  #dmNoticeMailCenter [data-mail-form] [data-recipients]{max-height:240px;overflow:auto;overflow-wrap:anywhere}
  #dmNoticeMailCenter [data-mail-form] input[type=checkbox]{width:20px;height:20px;flex:0 0 20px;appearance:auto;accent-color:#087d78}
  </style><div data-mail-form><div><h3 style="margin:0">E-posta merkezi</h3><small>Brevo · Yalnızca yönetici</small></div>
  <section class="mail-card"><strong>1 · Alıcılar</strong><div class="mail-grid"><label>Gönderim türü<select data-mode><option value="news">İzinli Papi haberleri</option><option value="verify">Doğrulama hatırlatması</option></select></label><label>Hesap türü<select data-role><option value="all">Tümü</option><option value="student">Öğrenciler</option><option value="teacher">Öğretmenler</option></select></label><label>Üyelik<select data-plan><option value="all">Tümü</option><option value="free">Free</option><option value="pro">Pro</option><option value="premium_pro">Premium Pro</option></select></label><label>E-posta onayı<select data-verification><option value="all">Tümü</option><option value="yes">Onaylayanlar</option><option value="no">Onaylamayanlar</option></select></label></div><input data-search placeholder="Kullanıcı adı veya e-posta ara" maxlength="100"><button type="button" data-preview>Alıcıları getir</button><div data-result role="status">Önce alıcıları getir.</div><button type="button" data-all disabled>Uygun alıcıları seç (en fazla 200)</button><div data-recipients></div></section>
  <section class="mail-card"><strong>2 · Mesaj</strong><label>Hazır şablon<select data-template><option value="">Serbest yaz</option><option value="news">Yeni gelişmeler</option><option value="welcome">Hoş geldin</option><option value="event">Etkinlik duyurusu</option></select></label><input data-subject placeholder="Mail konusu" maxlength="120"><textarea data-message rows="5" maxlength="5000" placeholder="Mesajını yaz… {{username}} ile kişiselleştir."></textarea><details><summary>İsteğe bağlı ayarlar</summary><div class="mail-grid"><label>Görsel adresi<input data-image type="url" placeholder="https://app.dijimedu.com/…"></label><label>Buton bağlantısı<input data-link type="url" placeholder="https://app.dijimedu.com/…"></label><label>Gönderim zamanı<input data-schedule type="datetime-local"></label></div></details><button type="button" data-test>Yönetici adresime test gönder</button><div data-test-result role="status"></div></section>
  <section class="mail-card"><strong>3 · Gönderim</strong><div data-summary role="status"></div><label style="display:flex;align-items:center"><input type="checkbox" data-confirm> Seçili alıcılara gönderimi onaylıyorum.</label><button type="button" data-queue disabled>Gönder</button><div data-send-result role="status"></div></section>
  <details class="mail-card"><summary>Kota ve gönderim geçmişi</summary><button type="button" data-stats>Brevo istatistikleri</button><div data-stats-list role="status"></div><button type="button" data-history>Gönderim geçmişi</button><div data-history-list></div></details></div>`;

  const form=content.querySelector('[data-mail-form]'),get=k=>form.querySelector('[data-'+k+']'),status=get('result'),list=get('recipients'),send=get('queue'),all=get('all');
  let current=[],signature='',busy=false,epoch=0;
  const values=()=>({...Object.fromEntries(['mode','role','plan','verification','search','subject','message','image','link'].map(k=>[k,get(k).value])),sendAfter:get('schedule').value?new Date(get('schedule').value).toISOString():''});
  const selected=()=>[...list.querySelectorAll('input:checked')].map(x=>x.value);
  const audienceKey=()=>JSON.stringify(Object.fromEntries(['mode','role','plan','verification','search'].map(k=>[k,get(k).value])));
  const renderStatus=()=>{const n=selected().length,verify=get('mode').value==='verify',ready=verify||!!(get('subject').value.trim()&&get('message').value.trim());const reason=busy?'Gönderiliyor…':signature!==audienceKey()?'Önce alıcıları getir.':!n?'En az bir uygun alıcı seç.':n>200?'En fazla 200 alıcı seç.':!ready?'Konu ve mesajı doldur.':!get('confirm').checked?'Gönderim onayını işaretle.':'';send.disabled=!!reason;send.textContent=busy?'Gönderiliyor…':n+' kişiye gönder';get('summary').textContent=n+' alıcı seçildi'+(reason?' · '+reason:' · Gönderime hazır');};
  const invalidate=()=>{epoch++;signature='';current=[];list.replaceChildren();get('confirm').checked=false;send.disabled=true;all.disabled=true;status.textContent='Alıcıları yeniden getir.';renderStatus();};
  ['mode','role','plan','verification','search'].forEach(k=>get(k).addEventListener('input',()=>{invalidate();const verify=get('mode').value==='verify';for(const k of ['subject','message','image','link','schedule','test','template'])get(k).disabled=verify;if(verify){get('schedule').value='';get('verification').value='no';}else if(k==='mode')get('verification').value='all';}));
  ['subject','message','image','link','schedule'].forEach(k=>get(k).addEventListener('input',()=>{get('confirm').checked=false;renderStatus();}));
  get('template').onchange=()=>{const t={news:['Diji-Medu’dan yeni haberler','Merhaba {{username}}, yeni öğrenme etkinliklerimizi keşfet!'],welcome:['Diji-Medu’ya hoş geldin','Merhaba {{username}}, İngilizce macerana Papi ile devam et!'],event:['Diji-Medu etkinliği','Merhaba {{username}}, yeni etkinliğimizi uygulama üzerinden inceleyebilirsin.']}[get('template').value];if(t){get('subject').value=t[0];get('message').value=t[1];get('confirm').checked=false;renderStatus();}};
  get('test').onclick=async()=>{if(!window.confirm('Yalnızca kayıtlı yönetici adresine test maili gönderilsin mi?'))return;const button=get('test');button.disabled=true;try{await api('adminEmailTest',{...values(),confirm:true});get('test-result').textContent='Test maili kuyruğa alındı.';}catch(e){get('test-result').textContent=e.message;}finally{button.disabled=get('mode').value==='verify';}};
  get('confirm').onchange=renderStatus;list.onchange=renderStatus;
  get('preview').onclick=async()=>{invalidate();const seq=epoch,params=values();get('preview').disabled=true;try{const d=await api('adminEmailPreview',params);if(!form.isConnected||seq!==epoch)return;signature=audienceKey();current=d.items||[];status.textContent=d.total+' eşleşen hesap · '+d.eligible+' uygun alıcı'+(d.truncated?' · İlk 500 gösteriliyor; aramayı daralt.':'');for(const u of current){const line=document.createElement('label');line.style.cssText='display:flex;gap:8px;align-items:center;padding:8px;border-bottom:1px solid #dbe4e7';const c=document.createElement('input');c.type='checkbox';c.value=u.id;c.disabled=!u.eligible;const info=document.createElement('span');info.style.cssText='overflow-wrap:anywhere;flex:1';info.textContent=u.username+' · '+u.email+' · '+(u.role==='teacher'?'Öğretmen':'Öğrenci')+' · '+u.plan+' · '+(u.eligible?'Uygun':'Gönderilemez');line.append(c,info);list.append(line);}all.disabled=!current.some(u=>u.eligible);}catch(e){status.textContent=e.message;}finally{get('preview').disabled=false;renderStatus();}};
  all.onclick=()=>{let n=0;for(const c of list.querySelectorAll('input'))c.checked=!c.disabled&&n++<200;renderStatus();};
  send.onclick=async()=>{if(busy||send.disabled)return;busy=true;renderStatus();try{const d=await api('adminEmailQueue',{...values(),ids:selected(),confirm:true});invalidate();get('send-result').textContent='Kuyruğa alınan: '+d.queued+' · Atlanan: '+d.skipped+' · Hatalı: '+d.failed+' (teslimat onayı değildir).';}catch(e){get('send-result').textContent=e.message;}finally{busy=false;get('confirm').checked=false;renderStatus();}};renderStatus();
  get('stats').onclick=async()=>{const host=get('stats-list');host.textContent='Yükleniyor…';try{const d=await api('adminEmailStats');if(!host.isConnected)return;host.replaceChildren();const p=document.createElement('p');p.textContent='Bugünkü gönderim denemesi (UTC): '+d.attemptsToday;host.append(p);if(d.provider){const v=d.provider;host.append(table(['Brevo · '+v.period,'Değer'],[['Gönderim isteği',v.requests??'—'],['Teslim',v.delivered??'—'],['Tekil açılma',v.uniqueOpens??'—'],['Tekil tıklama',v.uniqueClicks??'—'],['Kalıcı hata',v.hardBounces??'—'],['Geçici hata',v.softBounces??'—'],...(v.plans||[]).map(x=>['Kredi · '+x.type,String(x.credits??'—')+' '+(x.creditsType||'')])]));}else{const e=document.createElement('p');e.textContent=d.providerError;host.append(e);}}catch(e){host.textContent=e.message;}};
  get('history').onclick=async()=>{const host=get('history-list');host.textContent='Yükleniyor…';try{const d=await api('adminEmailHistory');if(!host.isConnected)return;host.replaceChildren(table(['Konu','Alıcı','Durum'],(d.items||[]).map(x=>[x.subject,x.to_email,x.sent_at?'Gönderildi':x.attempts>=5?'Başarısız':'Kuyrukta'])));}catch(e){host.textContent=e.message;}};
 }
 const pages={
 'Merkezi Ayarlar':editRemoteRules,
 'E-posta Gönder':emailCenter,
 'Genel Bakış':async()=>{content.innerHTML='<h3>Genel Bakış</h3><p>5 duyuru kuralı · 4 mail kuralı</p><p role="status">Mail kuyruğu ve günlük kullanım yükleniyor…</p>';const el=content.querySelector('[role="status"]');try{const d=await api('communicationStats');if(!el.isConnected)return;const s=d.summary;el.textContent='Bugün gönderilen: '+s.sentToday+' · Gönderim denemesi: '+s.attemptsToday+' · Kuyrukta: '+s.queued+' · Hata kaydı bulunan bekleyen: '+s.failedPending;}catch(e){el.textContent='Canlı sayılar henüz okunamıyor: '+e.message;}},
 'Duyurular':()=>{content.innerHTML='<h3>Uygulama içi duyurular</h3>';content.append(table(['Duyuru','Öncelik','Hedef','Gösterim kuralı'],rules));},
 'Mailler':()=>{content.innerHTML='<h3>Otomatik e-postalar</h3><p>Mail teslim raporları ve kota kullanımının sunucudan okunması henüz gerekli.</p>';content.append(table(['Görev','Planlanan zaman','Kontrol'],mails));},
 'Ekran Kuralları':()=>{content.innerHTML='<h3>Gösterim kuralları</h3><p><b>Kesinti yasak:</b> Oyun, test, Ders Çalış konusu veya sorusu, parkur soru alanı, sonuç ve ödül aşamaları.</p><p><b>Uygun yüzeyler:</b> Parkur, Oyunlar, Arkadaşlar, Ders Çalış, Mağaza ve Profil ana ekranları.</p><p><b>Öncelik:</b> Öğretmen uyarısı → hesap doğrulama → başlangıç / seviye → lig → normal hatırlatmalar.</p><p><b>Özel:</b> Enerji bitişi kendi zorunlu akışını korur.</p>';},
 'Kayıtlar ve Taslaklar':()=>{content.innerHTML='<h3>Kayıtlar ve taslaklar</h3><p>Öğrenci bazlı gösterim geçmişi, mail teslim raporu, taslak düzenleyici ve güvenli önizleme için sunucu uç noktaları henüz bağlanmadı. Bu bölüm hazır olmayan işlemleri yapılmış gibi göstermez.</p>';}
 };
 for(const [name,render] of Object.entries(pages)){const b=document.createElement('button');b.type='button';b.textContent=name;b.style.cssText='flex:0 0 auto;white-space:nowrap;border:1px solid #bad9de;border-radius:12px;background:white;color:#175363;padding:9px 12px;font-weight:700';b.onclick=()=>{for(const x of nav.children)x.style.background='white';b.style.background='#c6f3e6';render()};nav.append(b)}
 nav.firstElementChild.click();shade.append(panel);document.body.append(shade);shade.addEventListener('click',e=>{if(e.target===shade)shade.remove()});
}



// Verify role for this teacher token, never from a possibly stale device flag.
let dmAdminRoleToken='',dmAdminRoleVerified=false,dmAdminRolePendingToken='';
function dmVerifyAdminRole(){
 const current=token();
 if(!window.dmTeacherPortalMode||!current)return;
 if(dmAdminRoleToken===current||dmAdminRolePendingToken===current)return;
 dmAdminRolePendingToken=current;
 void api('ogretmenBilgim').then(info=>{
  if(token()!==current)return;
  dmAdminRoleVerified=info.yonetici===true;dmAdminRoleToken=current;window.dmTeacherVerifiedAdmin=dmAdminRoleVerified;window.dmTeacherVerifiedAdminToken=current;window.dispatchEvent(new Event('dm:teacher-admin-role-verified'));
  $('dmTeacherDesignV2')?.dmSyncAdminTools?.(dmAdminRoleVerified);
 }).catch(()=>{
  if(token()!==current)return;
  dmAdminRoleVerified=false;dmAdminRoleToken=current;
  window.dmTeacherVerifiedAdmin=false;window.dmTeacherVerifiedAdminToken=current;window.dispatchEvent(new Event('dm:teacher-admin-role-verified'));
  $('dmTeacherDesignV2')?.dmSyncAdminTools?.(false);
 }).finally(()=>{if(dmAdminRolePendingToken===current)dmAdminRolePendingToken='';});
}
const dmTeacherPremiumGames=[
 ['Kaptan Pilot Papi','✈️','premiumBulutUcusuAc']
];
function dmOpenTeacherPremium(fn){
 if(!token()){window.yoToast?.('Öğretmen oturumu gerekli.');return;}
 const open=window[fn];
 if(typeof open==='function')open();
 else window.yoToast?.('Oyun yüklenemedi. Tekrar dene.');
}

/* Teacher home shortcuts reuse the existing working panel actions. */
const dmHomeActions=[
 ['Ödev Ver','📝','Sınıfına ödev ve etkinlik gönder','ödev ver'],
 ['Duyurular','📣','Öğrencilerine duyuru gönder','duyurular'],
 ['Öğrenci Sohbetleri','💬','Öğrencilerinden gelen mesajları yanıtla','öğrenci sohbetleri'],
 ['Raporlar','📊','Sınıfın ve öğrencilerin gelişimini takip et',null]
];
const dmReportActions=[
 ['Ders İçi Performans','📈','ders içi performans'],
 ['Sınıfın Zayıf Noktaları','🎯','sınıfın zayıf noktaları'],
 ['Haftalık Veli Özetleri','👨‍👩‍👧','haftalık veli özetleri'],
 ['Seviye Sınavı Sonuçları','📑','seviye sınavı sonuçları']
];
const dmKey=x=>String(x||'').toLocaleLowerCase('tr').replace(/[^a-z0-9çğıöşü]+/g,' ').trim();
function dmOriginalTool(label){
 const menu=$('ogretmenMenuModal');if(!menu)return null;
 const key=dmKey(label);
 return [...menu.querySelectorAll('.ogretmen-menu-btn')].find(b=>
   dmKey(b.dataset.dmTeacherTitle||b.textContent).includes(key));
}
function dmOpenCanonicalOral(){
 if(!token()){window.yoToast?.('Sözlü yapmak için öğretmen hesabınla giriş yap.');return;}
 const oral=window.dmTeacherOral?.open;
 if(typeof oral!=='function'){window.yoToast?.('Sözlü Yap ekranı yüklenemedi. Sayfayı yenile.');return;}
 Promise.resolve(oral()).catch(e=>window.yoToast?.(e?.message||'Sözlü açılamadı.'));
}
function dmUseTool(label){
 const launch=()=>{
  const btn=dmOriginalTool(label);
  if(!btn){window.yoToast?.('Bu öğretmen aracı henüz hazır değil: '+label);return;}
  btn.click();
 };
 if(!token()){window.yoToast?.('Öğretmen oturumu gerekli.');return;}
 // The panel must be prepared first so existing handlers and teacher authorization remain intact.
 if(!dmOriginalTool(label))window.dmTeacherWorkspace?.prepare?.();
 if(!dmOriginalTool(label)&&typeof window.ogretmenPaneliAc==='function'){
  window.ogretmenPaneliAc();setTimeout(launch,100);return;
 }
 launch();
}
function dmReportDialog(){void openOwnedTool('reports');}

// Read only students scoped to the authenticated teacher portal.
let dmRosterCache=null,dmRosterAt=0;
async function dmRoster(force=false){
 if(!force&&dmRosterCache&&Date.now()-dmRosterAt<60000)return dmRosterCache;
 const result=await api('teacherPortalStudents');
 dmRosterCache=Array.isArray(result.items)?result.items:Array.isArray(result.students)?result.students:[];
 dmRosterAt=Date.now();return dmRosterCache;
}
function dmStudentList(){
 document.getElementById('dmV2StudentsDialog')?.remove();
 const dialog=document.createElement('div');dialog.id='dmV2StudentsDialog';dialog.className='dm-teacher-child';
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Öğrencilerim');
 dialog.innerHTML='<section class="dm-v2-student-panel"><header><h2>👥 Öğrencilerim</h2><button type="button" aria-label="Kapat">✕</button></header><p data-roster-status>Öğrenciler yükleniyor…</p><div data-roster-list></div></section>';
 dialog.querySelector('header button').onclick=()=>dialog.remove();
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.remove();});
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();dialog.remove();}});
 document.body.append(dialog);
 dmRoster(true).then(items=>{
  if(!dialog.isConnected)return;
  dialog.querySelector('[data-roster-status]').textContent=items.length?items.length+' bağlı öğrenci':'Henüz bağlı öğrenci bulunmuyor.';
  const list=dialog.querySelector('[data-roster-list]');
  for(const item of items){
   const row=document.createElement('article');row.className='dm-v2-student-row';
   const name=document.createElement('strong');name.textContent=item.username||item.name||item.student||'Öğrenci';
   const details=document.createElement('span');
   const cls=item.class_no??item.classNo??item.sinif;
   const branch=item.branch??item.sube;
   const progress=item.progress?.percent??item.progress_percent??item.progressPercent;
   details.textContent=[cls?'Sınıf: '+cls+(branch?' / '+branch:''):'Sınıf bilgisi yok',Number.isFinite(Number(progress))&&progress!==undefined&&progress!==null?'İlerleme: %'+Number(progress):'İlerleme verisi yok'].join(' · ');
   row.append(name,details);list.append(row);
  }
 }).catch(e=>{if(dialog.isConnected)dialog.querySelector('[data-roster-status]').textContent='Öğrenciler yüklenemedi: '+e.message;});
 dialog.querySelector('header button').focus();
}
async function dmUpdateTeacherDashboard(board){
 if(!board?.isConnected||!token())return;
 const now=Date.now();
 if(now-Number(board.dataset.rosterCheckedAt||0)<60000)return;
 board.dataset.rosterCheckedAt=String(now);
 try{
  const items=await dmRoster();if(!board.isConnected)return;
  const classes=new Set(items.map(x=>[x.class_no??x.classNo??x.sinif,x.branch??x.sube??''].join('/')).filter(x=>!x.startsWith('/')));
  board.querySelector('[data-v2-students]').textContent=String(items.length);
  board.querySelector('[data-v2-classes]').textContent=String(classes.size);
 }catch(e){
  board.querySelector('[data-v2-students]').textContent='—';
  board.querySelector('[data-v2-classes]').textContent='—';
  board.querySelector('[data-v2-students]').title=e.message;
 }
 const badge=board.querySelector('[data-v2-chat-count]');
 if(badge){badge.textContent=String(messages);badge.hidden=!messages;}
}
function dmRemoveTeacherBottomTab(){
 if(!window.dmTeacherPortalMode)return;
 const nav=document.getElementById('bottomNavMobile');
 nav?.querySelectorAll('[data-ekran="tab-teacher-portal"]').forEach(x=>{x.hidden=true;x.style.display='none';});
}
function dmMidnightHome(board,openOriginal){
 const icon=name=>`<img class="dm-approved-icon" src="teacher-dashboard-assets/${name}.svg" alt="" aria-hidden="true">`;
 board.className='dm-v2-dashboard dm-midnight-home dm-approved-home';
 board.innerHTML=`
  <header class="dm-midnight-brand"><span><i aria-hidden="true">${icon('cap')}</i> Diji Medu</span><span>Öğretmen Paneli</span></header>
  <section class="dm-midnight-hero dm-midnight-raised dm-approved-welcome" aria-labelledby="dmTeacherGreeting">
   <img src="papi-help-v2.png" alt="">
   <div>
    <h1 id="dmTeacherGreeting">Merhaba Öğretmenim!</h1>
    <p>Sınıfının gelişimini birlikte takip edelim.</p>
    <div class="dm-midnight-stats">
     <button type="button" class="dm-midnight-raised" data-home-students><i aria-hidden="true">${icon('people')}</i><span><b data-v2-students>—</b>Öğrenci</span></button>
     <button type="button" class="dm-midnight-raised" data-home-classes><i aria-hidden="true">${icon('school')}</i><span><b data-v2-classes>—</b>Sınıf</span></button>
    </div>
   </div>
   <img class="dm-approved-school" src="teacher-dashboard-assets/school.svg" alt="" aria-hidden="true">
  </section>
  <button type="button" class="dm-midnight-parkur-switch" data-teacher-parkur-switch aria-label="Kişisel Parkur hesabıma geç">
   <span aria-hidden="true" class="dm-approved-sprout">${icon('leaf')}</span><strong>Kişisel Parkur’a Geç</strong><span aria-hidden="true" class="dm-approved-next">${icon('arrow-right')}</span>
  </button>
  <section class="dm-midnight-section" aria-labelledby="dmHomeShortcuts">
   <h2 id="dmHomeShortcuts"><i aria-hidden="true">${icon('bolt')}</i> Hızlı Erişim</h2>
   <div class="dm-midnight-shortcuts"></div>
  </section>
  <section class="dm-midnight-section" aria-labelledby="dmHomeActions">
   <h2 id="dmHomeActions"><i aria-hidden="true">${icon('sparkle')}</i> Hızlı İşlemler</h2>
   <div class="dm-midnight-actions"></div>
  </section>`;
 const classes=()=>window.dmTeacherClassesOpen?window.dmTeacherClassesOpen():openOriginal('classroom');
 board.querySelector('[data-home-students]').onclick=dmStudentList;
 board.querySelector('[data-home-classes]').onclick=classes;
 // The active V2 homepage replaces the legacy teacher home, so its own
 // switch is needed. The boot layer restores the real personal learner session.
 const personalParkur=board.querySelector('[data-teacher-parkur-switch]');
 personalParkur.onclick=()=>window.dmTeacherPortalParkur?.();
 const add=(target,label,art,run)=>{
  const button=document.createElement('button');
  button.type='button';button.className='dm-midnight-raised dm-approved-tile';
  button.innerHTML=`<i aria-hidden="true">${art}</i><strong>${label}</strong>`;
  button.onclick=run;target.append(button);
  return button;
 };
 const shortcuts=board.querySelector('.dm-midnight-shortcuts');
 add(shortcuts,'Sözlü Yap',icon('mic'),dmOpenCanonicalOral);
 add(shortcuts,'Sınıf Oluştur',icon('people-add'),()=>openOriginal('classroom'));
 add(shortcuts,'Raporlar',icon('chart'),dmReportDialog);
 add(shortcuts,'Artı-Eksi Ver',icon('plus-minus'),()=>openOwnedTool('performance'));
 const actions=board.querySelector('.dm-midnight-actions');
 add(actions,'Ödev Ver',icon('clipboard'),()=>openOwnedTool('legacyHomework'));
 add(actions,'Sınıfına Duyuru Yap',icon('megaphone'),()=>openOwnedTool('legacyAnnouncement'));
 const chat=add(actions,'Öğrenci Sohbetleri',icon('chat'),()=>dmUseTool('öğrenci sohbetleri'));
 const badge=document.createElement('span');badge.className='dm-v2-chat-badge';badge.dataset.v2ChatCount='';badge.hidden=true;chat.querySelector('i').after(badge);
 add(actions,'Raporlar',icon('chart'),dmReportDialog);
 add(actions,'Yarışma Yaptır',icon('games'),()=>openOriginal('game'));
 add(actions,'Konu Anlat',icon('books'),()=>openOriginal('study'));
 // Direct access to the actual teacher-owned classroom and comprehensive reports.
 add(actions,'Sınıflarım',icon('school'),classes);
 add(actions,'Sınıf Raporları',icon('report'),()=>{
  if(window.dmTeacherReportsOpen)window.dmTeacherReportsOpen();
  else window.yoToast?.('Sınıf raporları yüklenemedi. Sayfayı yenile.');
 });
 // No "Tüm araçlar" DOM is created for regular teachers.
 board.dmSyncAdminTools=verified=>{
  const previous=board.querySelector('.dm-midnight-tools');
  if(!verified){previous?.remove();return;}
  if(previous)return;
  const details=document.createElement('details');details.className='dm-midnight-tools';
  details.innerHTML='<summary class="dm-midnight-raised"><i aria-hidden="true"></i> Tüm araçlar <span aria-hidden="true">›</span></summary><div class="dm-midnight-extra"></div>';
  board.append(details);
  const extra=details.querySelector('.dm-midnight-extra');
  add(extra,'Öğretmen Paneli',icon('cap'),()=>openOriginal('teacher'));
  add(extra,'Öğrenciler',icon('people'),dmStudentList);
  add(extra,'Rubrik','📈',()=>dmUseTool('rubrik'));
  if(window.dmAdminGiftOpen)add(extra,'Hediye Üyelik','🎁',()=>window.dmAdminGiftOpen());
  if(window.dmAdminAdsOpen)add(extra,'Reklam Ayarları','📺',()=>window.dmAdminAdsOpen());
  if(window.dmAdminPushOpen)add(extra,'Bildirim Gönder','🔔',()=>window.dmAdminPushOpen());
 };
 board.dmSyncAdminTools(dmAdminRoleToken===token()&&dmAdminRoleVerified);
}
function dmHome(){
 const portal=$('tpTeacherHome');
 const current=portal?.querySelector('#dmTeacherDesignV2');
 if(current){dmVerifyAdminRole();current.dmSyncAdminTools?.(dmAdminRoleToken===token()&&dmAdminRoleVerified);if(visible(current))dmUpdateTeacherDashboard(current);return;}
 const heading=[...(portal||document).querySelectorAll('h1,h2,h3')].find(h=>dmKey(h.textContent).includes('merhaba öğretmenim')&&visible(h));
 if(!heading)return;
 dmVerifyAdminRole();
 const originalCards=[...(portal||document).querySelectorAll('button,a,[role="button"],article,div')]
  .filter(el=>el.children.length<12&&dmKey(el.textContent).includes('yeni bir konu anlat')&&dmKey(el.textContent).length<180)
  .sort((a,b)=>a.querySelectorAll('*').length-b.querySelectorAll('*').length);
 const sample=originalCards[0];if(!sample)return;
 const oldGrid=sample.parentElement;
 if(!oldGrid||oldGrid.closest('#ogretmenMenuModal'))return;
 // Find only the shared home content container, never the full document or mobile dock.
 let container=heading.parentElement;
 while(container&&!container.contains(oldGrid))container=container.parentElement;
 if(!container||container===document.body||container===document.documentElement||container.contains(document.getElementById('bottomNavMobile')))return;
 if(container.querySelector(':scope > #dmTeacherDesignV2')){dmUpdateTeacherDashboard(container.querySelector('#dmTeacherDesignV2'));dmRemoveTeacherBottomTab();return;}
 const findCard=term=>[...oldGrid.querySelectorAll('button,a,[role="button"]')].find(x=>dmKey(x.textContent).includes(dmKey(term)));
 const original={study:findCard('yeni bir konu anlat'),game:findCard('öğrencilerle oyun oyna'),oral:findCard('sözlü yap'),teacher:findCard('öğretmen paneline git'),classroom:findCard('sınıf oluştur')};
 const openOriginal=key=>{const card=original[key];if(card)card.click();else if(key==='teacher')window.ogretmenPaneliAc?.();else if(key==='oral')dmOpenCanonicalOral();};
 const board=document.createElement('section');board.id='dmTeacherDesignV2';board.className='dm-v2-dashboard';
 if(container.closest('#tpTeacherHome'))dmMidnightHome(board,openOriginal);
 else{
 board.innerHTML=`<nav class="dm-v2-sidebar" aria-label="Öğretmen araçları">
  <strong class="dm-v2-logo">🎓<span>Diji Medu</span></strong>
  <div data-v2-nav></div>
 </nav><main class="dm-v2-content">
  <header class="dm-v2-banner"><div><small>DİJİ MEDU · ÖĞRETMEN PANELİ</small><h2>Sınıfın kontrolünde,<br>gelişim hep takibinde! 🚀</h2><p>Ödev, duyuru ve raporlar tek bir yerde.</p></div><img src="papi-help-v2.png" alt="Papi"></header>
  <div class="dm-v2-stats" aria-label="Öğretmen özeti">
    <div>👥 <b data-v2-students>—</b><small>Öğrenci</small></div>
    <div>🏫 <b data-v2-classes>—</b><small>Sınıf</small></div>
    <div>🎮 <b>Oyunlar</b><small>Sınıf etkinlikleri</small></div>
    <div>📝 <b>Ödevler</b><small>Öğrenci çalışmaları</small></div>
  </div>
  <h3>⚡ Hızlı İşlemler</h3>
  <div class="dm-v2-actions" data-v2-actions></div>
  <div class="dm-v2-secondary" data-v2-secondary></div>
  <h3>✨ Hızlı Erişim</h3>
  <div class="dm-v2-quick" data-v2-quick></div>
 </main>`;
 const add=(target,label,emoji,description,run,cls='')=>{
  const button=document.createElement('button');button.type='button';button.className='dm-v2-action '+cls;
  button.innerHTML='<span aria-hidden="true">'+emoji+'</span><strong>'+label+'</strong><small>'+description+'</small><i aria-hidden="true">›</i>';
  button.addEventListener('click',run);target.append(button);
 };
 const actions=board.querySelector('[data-v2-actions]');
 add(actions,'Ödev Ver','📋','Sınıfına yeni ödev gönder',()=>openOwnedTool('legacyHomework'),'v2-mint');
 add(actions,'Sınıfına Duyuru Yap','📣','Öğrencilerini bilgilendir',()=>openOwnedTool('legacyAnnouncement'),'v2-peach');
 add(actions,'Öğrenci Sohbetleri','💬','Mesajları oku ve yanıtla',()=>dmUseTool('öğrenci sohbetleri'),'v2-pink');
 const chatBadge=document.createElement('span');chatBadge.className='dm-v2-chat-badge';chatBadge.dataset.v2ChatCount='';chatBadge.hidden=true;actions.lastElementChild.append(chatBadge);
 const secondary=board.querySelector('[data-v2-secondary]');
 add(secondary,'Raporlar','📊','Performans, zayıf noktalar, veli özetleri ve sınav sonuçları',dmReportDialog,'v2-lavender');
 add(secondary,'Yarışma Yaptır','🎮','Oyunlar sekmesine geç ve sınıfınla eğlen',()=>openOriginal('game'),'v2-green v2-feature');
 add(secondary,'Konu Anlat','📚','Yeni konuyu anlat, birlikte öğren',()=>openOriginal('study'),'v2-feature v2-peach');
 const quick=board.querySelector('[data-v2-quick]');
 add(quick,'Artı Eksi Ver','➕','Ders içi performans puanları',()=>openOwnedTool('performance'));

 
 add(quick,'Sınıf Oluştur','🏫','Yeni sınıf oluştur',()=>openOriginal('classroom'));
 add(quick,'Sözlü Yap','🎤','Sözlü değerlendirme',dmOpenCanonicalOral);
 // Çoklu sınıf ve sınıf raporları (4 Kas 2026); yönetici için hediye üyelik.
 add(quick,'Sınıfım','🏆','Sınıf ligi ve öğrenci sıralaması',()=>window.dmTeacherLeagueOpen?window.dmTeacherLeagueOpen():window.yoToast?.('Sınıfım yüklenemedi. Sayfayı yenile.'));
 if(window.dmTeacherClassesOpen)add(quick,'Sınıflarım','🗂️','Sınıf kodları ve öğrenci taşıma',()=>window.dmTeacherClassesOpen());
 if(window.dmTeacherReportsOpen)add(quick,'Sınıf Raporları','📈','Süre, doğruluk, zor kelimeler',()=>window.dmTeacherReportsOpen());
 try{if(window.dmAdminGiftOpen&&sessionStorage.getItem('ing_ogr_yonetici')==='1')add(quick,'Hediye Üyelik','🎁','Plan hediye et',()=>window.dmAdminGiftOpen());}catch{}
 try{if(window.dmAdminAdsOpen&&sessionStorage.getItem('ing_ogr_yonetici')==='1')add(quick,'Reklam Ayarları','📺','Tek tuşla kapat',()=>window.dmAdminAdsOpen());}catch{}
 try{if(window.dmAdminPushOpen&&sessionStorage.getItem('ing_ogr_yonetici')==='1')add(quick,'Bildirim Gönder','🔔','Android ve iPhone',()=>window.dmAdminPushOpen());}catch{}
 const nav=board.querySelector('[data-v2-nav]');
 for(const [icon,title,run] of [['⌂','Ana Sayfa',()=>board.scrollIntoView({behavior:'smooth'})],['👥','Öğrenciler',dmStudentList],['🏆','Sınıfım',()=>window.dmTeacherLeagueOpen?.()],['🏫','Sınıflarım',()=>window.dmTeacherClassesOpen?window.dmTeacherClassesOpen():openOriginal('classroom')],['📋','Ödevler',()=>dmUseTool('ödev ver')],['📣','Duyurular',()=>dmUseTool('duyurular')],['📊','Raporlar',dmReportDialog],['📈','Rubrik',()=>dmUseTool('rubrik')],['⚙','Öğretmen Paneli',()=>openOriginal('teacher')]]){
  const button=document.createElement('button');button.type='button';button.innerHTML='<span>'+icon+'</span>'+title;button.addEventListener('click',run);nav.append(button);
 }
 }
 const dashboardText=container.textContent||'';
 const students=dashboardText.match(/(\\d+)\\s*öğrenci/i);const classes=dashboardText.match(/(\\d+)\\s*sınıf/i);
 if(students)board.querySelector('[data-v2-students]').textContent=students[1];
 if(classes)board.querySelector('[data-v2-classes]').textContent=classes[1];
 // Preserve original live handlers and content in the DOM, but remove it from layout.
 const shell=document.createElement('div');shell.className='dm-v2-legacy';shell.hidden=true;
 while(container.firstChild)shell.append(container.firstChild);
 container.append(board,shell);container.classList.add('dm-v2-host');dmUpdateTeacherDashboard(board);dmRemoveTeacherBottomTab();
}
function dmHideOldActions(menu){
 if(!document.querySelector('[data-dm-home-action="raporlar"]'))return;
 // Show relocated actions only on the teacher home page, not as duplicates in the tools grid.
 for(const [title,, ,target] of dmHomeActions){
  if(!target)continue;
  const b=dmOriginalTool(target);if(b){b.dataset.dmHomeRelocated='1';b.hidden=true;}
 }
 for(const [title,,target] of dmReportActions){
  const b=dmOriginalTool(target);if(b){b.dataset.dmHomeRelocated='1';b.hidden=true;}
 }
 $('dmTeacherRallyButton')?.remove();
}

function installWorkspaceTools(menu){
 if(!$('dmPlacementTeacherButton')){const b=document.createElement('button');b.id='dmPlacementTeacherButton';b.className='ogretmen-menu-btn';b.textContent='📋 Seviye sınavı sonuçları ve örnekler';b.onclick=teacherPlacements;menu.querySelector('.rubric-content').append(b);}

 if(!$('dmNoticeMailCenterButton')){const b=document.createElement('button');b.id='dmNoticeMailCenterButton';b.className='ogretmen-menu-btn';b.textContent='📣 Duyuru ve Mail Yönetim Merkezi';b.onclick=openNoticeMailCenter;menu.querySelector('.rubric-content').append(b);}
 if(!$('dmTeacherOralButton')){const b=document.createElement('button');b.id='dmTeacherOralButton';b.className='ogretmen-menu-btn';b.textContent='🎙️ Sözlü Yap · Kelime sor, ±20 XP değerlendir';b.onclick=()=>window.dmTeacherOral?.open();menu.querySelector('.rubric-content').append(b);}
 const content=menu.querySelector('.rubric-content');
 const firstTool=content.querySelector('.ogretmen-menu-btn');
 for(const [title,emoji,fn] of dmTeacherPremiumGames){
   const id='dmTeacherPremium'+fn;
   if($(id))continue;
   const b=document.createElement('button');b.id=id;b.type='button';b.className='ogretmen-menu-btn';
   b.textContent=emoji+' '+title;
   b.onclick=()=>dmOpenTeacherPremium(fn);
   content.insertBefore(b,firstTool);
 }
}
function maintain(){
 const menu=$('ogretmenMenuModal');if(!menu)return;if(!token()){active=false;menuSeen=false;return;}
 if(visible(menu))active=true;
 // Move child dialogs out of hidden legacy containers and above every workspace layer.
 if(!active)return;
 if(menu.parentElement!==document.body)document.body.append(menu);menu.classList.add('dm-teacher-open');installWorkspaceTools(menu);const dialogs=children();menu.classList.toggle('dm-teacher-obscured',dialogs.length>0);const display=window.dmTeacherPortalMode?'none':dialogs.length?'none':'flex';if(menu.style.display!==display)menu.style.display=display;
 for(const el of dialogs){if(el.parentElement!==document.body)document.body.append(el);if(!el.classList.contains('dm-teacher-child'))el.classList.add('dm-teacher-child');const front=el.id==='odModal'||el.id==='duyuruYonetimModal';const layer=front?'2147483646':'2147483620';if(el.style.getPropertyValue('z-index')!==layer||el.style.getPropertyPriority('z-index')!=='important')el.style.setProperty('z-index',layer,'important');}



 if(!menuSeen){menuSeen=true;api('teacherNotificationRead').then(()=>refresh(true)).catch(()=>{});}
 decorateWorkspace(menu);dmHideOldActions(menu);paintBadge();
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
window.dmTeacherWorkspace={paintBadge,refresh,prepare(){const menu=$('ogretmenMenuModal');if(menu){installWorkspaceTools(menu);decorateWorkspace(menu);}}};
const watcher=new MutationObserver(()=>{if(active)maintain();});for(const el of document.querySelectorAll('.rubric-modal,.sm-overlay,.yo-modal,.yo-perde,#yoModalPerde,#odModal,#omSifreModal'))watcher.observe(el,{attributes:true,attributeFilter:['style']});
new MutationObserver(ms=>{if(active&&ms.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&(n.matches?.(childSelector)||n.querySelector?.(childSelector)))))maintain();}).observe(document.body,{childList:true});
const report=$('yoModal');if(report)watcher.observe(report,{attributes:true,attributeFilter:['class','style']});
setInterval(()=>{if(document.hidden)return;maintain();dmHome();if(window.dmTeacherPortalMode)window.dmDayNightTheme?.updateHint();dmRemoveTeacherBottomTab();refresh();installCatalog();},1200);
document.addEventListener('dm:login',()=>{total=0;lastRead=0;active=false;menuSeen=false;dmAdminRoleToken='';dmAdminRoleVerified=false;dmAdminRolePendingToken='';window.dmTeacherVerifiedAdmin=false;window.dmTeacherVerifiedAdminToken='';window.dispatchEvent(new Event('dm:teacher-admin-role-verified'));$('dmTeacherDesignV2')?.dmSyncAdminTools?.(false);refresh(true);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true);});
refresh(true);
})();
