(()=>{'use strict';
 const endpoint='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/splash-settings';
 const names={'23-nisan':'23 Nisan','19-mayis':'19 Mayıs','30-agustos':'30 Ağustos','29-ekim':'29 Ekim','10-kasim':'10 Kasım','15-temmuz':'15 Temmuz','ramazan-ayi':'Ramazan ayı','ramazan-bayrami':'Ramazan Bayramı','kurban-bayrami':'Kurban Bayramı'};
 const available={'23-nisan':[1,2],'19-mayis':[1,2],'30-agustos':[1,2],'29-ekim':[1,2],'10-kasim':[1,2],'15-temmuz':[1],'ramazan-ayi':[2],'ramazan-bayrami':[1],'kurban-bayrami':[2]};
 const teacher=()=>{try{return JSON.parse(sessionStorage.getItem('dm_tp_session')||'null')}catch{return null}};
 const isOwner=()=>document.documentElement.classList.contains('dm-teacher-portal')&&teacher()?.name==='teacher'&&!!teacher()?.teacherToken;
 async function request(method='GET',data=null){
  const res=await fetch(endpoint,{method,headers:{'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
  const json=await res.json().catch(()=>({ok:false,message:'Sunucu yanıtı okunamadı'}));
  if(!res.ok||!json.ok)throw Error(json.message||'Ayarlar alınamadı.');
  return json;
 }
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 function open(){
  if(!isOwner())return;
  document.querySelector('#dmSplashSettings')?.remove();
  const modal=document.createElement('div');modal.id='dmSplashSettings';modal.className='dm-splash-shade';
  modal.innerHTML='<section class="dm-splash-panel" role="dialog" aria-modal="true" aria-labelledby="dmSplashTitle"><button type="button" class="dm-splash-close" aria-label="Kapat">×</button><h2 id="dmSplashTitle">🦜 Giriş Animasyonları</h2><p class="dm-splash-note">Tüm öğrencilerin açılış ekranını yönet. Değişiklikler sunucuda saklanır.</p><p class="dm-splash-feedback" role="status">Ayarlar yükleniyor…</p><div class="dm-splash-body" hidden></div></section>';
  document.body.append(modal);const close=()=>modal.remove();
  modal.querySelector('.dm-splash-close').onclick=close;
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  modal.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  const body=modal.querySelector('.dm-splash-body'),feedback=modal.querySelector('.dm-splash-feedback');
  modal.querySelector('.dm-splash-close').focus();
  request().then(data=>{
   const initial=data.config||{mode:'auto',disabled:[],manual:null};
   body.hidden=false;feedback.textContent='';
   const choices=Object.entries(names).map(([id,name])=>'<label class="dm-splash-row"><input type="checkbox" data-holiday="'+id+'" '+(!initial.disabled?.includes(id)?'checked':'')+'><span>'+esc(name)+'</span><small>'+(available[id].length===2?'Her yıl değişen iki tasarım':'Tek tasarım')+'</small></label>').join('');
   const options=Object.entries(names).map(([id,name])=>available[id].map(n=>'<option value="'+id+'-'+n+'.jpg">'+esc(name)+' — Tasarım '+n+'</option>').join('')).join('');
   body.innerHTML='<fieldset class="dm-splash-modes"><legend>Gösterim modu</legend><label><input type="radio" name="dmSplashMode" value="auto"> Otomatik takvim</label><label><input type="radio" name="dmSplashMode" value="normal"> Normal Papi girişi</label><label><input type="radio" name="dmSplashMode" value="manual"> Seçtiğim özel tasarım</label></fieldset><label class="dm-splash-manual">Özel tasarım seç<select id="dmSplashVariant">'+options+'</select></label><div class="dm-splash-preview"><img alt="Seçilen giriş animasyonunun ön izlemesi"></div><h3>Özel günleri aç / kapat</h3><p class="dm-splash-note">İşareti kaldırılan özel gün otomatik gösterilmez.</p><div class="dm-splash-choices">'+choices+'</div><button type="button" class="dm-splash-save">Ayarları Kaydet</button>';
   const mode=body.querySelectorAll('[name=dmSplashMode]'),variant=body.querySelector('#dmSplashVariant'),img=body.querySelector('.dm-splash-preview img'),man=body.querySelector('.dm-splash-manual');
   (body.querySelector('[value="'+esc(initial.mode||'auto')+'"]')||body.querySelector('[value=auto]')).checked=true;
   variant.value=initial.manual?.file||'29-ekim-2.jpg';
   function update(){const selected=body.querySelector('[name=dmSplashMode]:checked')?.value;man.hidden=selected!=='manual';img.src='holiday-splashes/'+variant.value;img.loading='lazy';}
   mode.forEach(x=>x.addEventListener('change',update));variant.addEventListener('change',update);update();
   body.querySelector('.dm-splash-save').onclick=async()=>{
    const btn=body.querySelector('.dm-splash-save');btn.disabled=true;feedback.textContent='Kaydediliyor…';
    const file=variant.value,id=file.replace(/-\d+\.jpg$/,'');
    const config={mode:body.querySelector('[name=dmSplashMode]:checked')?.value||'auto',disabled:[...body.querySelectorAll('[data-holiday]:not(:checked)')].map(x=>x.dataset.holiday),manual:{id,file}};
    try{const updated=await request('POST',{teacherToken:teacher()?.teacherToken,config});
     try{localStorage.setItem('dm-splash-preferences',JSON.stringify(updated.config))}catch(_){}
     feedback.textContent='✓ Ayarlar kaydedildi. Sonraki girişlerde tüm cihazlarda uygulanacak.';
    }catch(error){feedback.textContent='Kaydedilemedi: '+error.message;}finally{btn.disabled=false;}
   };
  }).catch(e=>feedback.textContent=e.message);
 }
 function mount(){
  if(!isOwner())return;
  const menu=document.querySelector('#tpDashboard .tp-dash-menu');if(!menu||menu.querySelector('[data-dm-splash-open]'))return;
  const btn=document.createElement('button');btn.type='button';btn.dataset.dmSplashOpen='1';btn.textContent='🎨 Giriş Animasyonları';
  const settings=menu.querySelector('[data-dash=settings]');if(settings)menu.insertBefore(btn,settings);else menu.append(btn);
  btn.onclick=open;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 const observer=new MutationObserver(mount);observer.observe(document.body,{subtree:true,childList:true});
 window.dmTeacherSplashSettings={open};
})();
