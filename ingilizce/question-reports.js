(()=>{'use strict';
const labels={audio_missing:'Ses gelmiyor',audio_wrong:'Seslendirme hatalı',image_wrong:'Görsel yanlış',image_missing:'Görsel eksik veya açılmıyor',grading:'Cevabım yanlış değerlendirildi',translation:'Cümlenin çevirisi yanlış',spelling:'Yazım hatası var',other:'Başka bir sorun var'};
const teacherToken=()=>{try{return JSON.parse(sessionStorage.getItem('dm_tp_session')||'null')?.teacherToken||''}catch{return ''}};
const admin=()=>!!window.dmTeacherPortalMode&&window.dmTeacherVerifiedAdmin===true&&window.dmTeacherVerifiedAdminToken===teacherToken();
async function call(islem,payload={},teacher=false){const t=teacher?teacherToken():localStorage.getItem('ing_token')||'';const r=await fetch('https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api',{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({islem,t,...payload})});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.mesaj||'İşlem başarısız.');return d;}
const el=(tag,text)=>{const x=document.createElement(tag);if(text)x.textContent=text;return x};
function sheet(title){const veil=el('div');veil.className='qr-veil';const panel=el('section');panel.className='qr-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',title);const head=el('header'),close=el('button','×');close.type='button';close.setAttribute('aria-label','Kapat');close.onclick=()=>veil.remove();head.append(el('h2',title),close);panel.append(head);veil.append(panel);document.body.append(veil);return panel;}
const icons={
 flag:'M5 21V4m0 1c5-5 9 4 14 0v10c-5 4-9-5-14 0',
 close:'m6 6 12 12M18 6 6 18',
 audio_missing:'M3 9h4l5-5v16l-5-5H3zm13 1 5 5m0-5-5 5',
 audio_wrong:'M3 9h4l5-5v16l-5-5H3zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
 image_wrong:'M21 13V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7M3 17l5-5 3 3 4-4m1 5 5 5m0-5-5 5M8 7h.01',
 image_missing:'M3 4h18v16H3zM3 17l5-5 4 4 3-3 6 4M8 8h.01',
 grading:'M4 12l5 5L20 6',
 translation:'M3 5h12M9 3v2m4 0c-1 5-5 9-10 11m3-7c1 2 3 4 6 5m1 7 4-9 4 9m-7-3h6',
 spelling:'m4 16-1 5 5-1L20 8a2.8 2.8 0 0 0-4-4L4 16zm10-10 4 4',
 other:'M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm3 6h.01m4 0h.01m4 0h.01'
};
function icon(name){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 const path=document.createElementNS(svg.namespaceURI,'path');
 svg.setAttribute('viewBox','0 0 24 24');
 svg.setAttribute('aria-hidden','true');
 path.setAttribute('d',icons[name]);
 svg.append(path);
 return svg;
}
function report(snapshot){
 if(!snapshot||document.querySelector('.qr-student'))return;
 const origin=document.activeElement;
 const p=sheet('Sorun bildir');
 const veil=p.parentElement;
 veil.classList.add('qr-student-veil');
 p.classList.add('qr-student');
 const head=p.querySelector('header'),title=head.querySelector('h2'),close=head.querySelector('button');
 const badge=el('span');
 badge.className='qr-title-icon';
 badge.append(icon('flag'));
 const heading=el('div');
 heading.append(title,el('p','Bir veya daha fazla seçenek işaretleyebilirsin.'));
 head.prepend(badge,heading);
 close.replaceChildren(icon('close'));

 const form=el('form'),fields=el('div'),options=el('div');
 fields.className='qr-fields';
 options.className='qr-options';
 options.setAttribute('role','group');
 options.setAttribute('aria-label','Sorun türü');
 for(const [key,value] of Object.entries(labels)){
  const label=el('label'),input=el('input'),art=el('span'),mark=el('span');
  label.className='qr-option';
  input.type='checkbox';
  input.value=key;
  art.className='qr-icon';
  art.append(icon(key));
  mark.className='qr-check';
  mark.setAttribute('aria-hidden','true');
  label.append(input,art,el('span',value),mark);
  options.append(label);
 }
 const noteLabel=el('label','Açıklama'),note=el('textarea');
 noteLabel.className='qr-note-label';
 noteLabel.append(el('small','İsteğe bağlı'),note);
 note.placeholder='Sorunla ilgili ayrıntı ekle';
 note.rows=2;
 note.maxLength=500;
 fields.append(options,noteLabel);

 const footer=el('footer'),submit=el('button','Bildirimi gönder'),status=el('p');
 footer.className='qr-actions';
 submit.type='submit';
 submit.disabled=true;
 status.setAttribute('role','status');
 footer.append(status,submit);
 form.append(fields,footer);
 p.append(form);

 const viewport=window.visualViewport;
 function fit(){
  veil.style.setProperty('--qr-height',viewport.height+'px');
  veil.style.setProperty('--qr-top',viewport.offsetTop+'px');
 }
 function dismiss(){
  viewport?.removeEventListener('resize',fit);
  viewport?.removeEventListener('scroll',fit);
  veil.remove();
  if(origin?.isConnected)origin.focus({preventScroll:true});
 }
 if(viewport){
  fit();
  viewport.addEventListener('resize',fit);
  viewport.addEventListener('scroll',fit);
 }
 close.onclick=dismiss;
 veil.addEventListener('click',e=>{if(e.target===veil)dismiss();});
 veil.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
   e.preventDefault();
   e.stopPropagation();
   dismiss();
  }else if(e.key==='Tab'){
   const controls=[...p.querySelectorAll('button:enabled,input:enabled,textarea:enabled')];
   const edge=e.shiftKey?controls[0]:controls.at(-1);
   if(document.activeElement===edge){
    e.preventDefault();
    (e.shiftKey?controls.at(-1):controls[0]).focus();
   }
  }
 });
 close.focus({preventScroll:true});

 let sending=false;
 form.onchange=()=>{submit.disabled=sending||!options.querySelector('input:checked');};
 form.onsubmit=async e=>{
  e.preventDefault();
  const reasons=[...options.querySelectorAll('input:checked')].map(input=>input.value);
  if(submit.disabled||!reasons.length)return;
  sending=true;
  submit.disabled=true;
  submit.textContent='Gönderiliyor…';
  status.textContent='';
  status.removeAttribute('data-error');
  try{
   await call('questionReport',{snapshot,reasons,note:note.value});
   status.textContent='Bildirimin alındı. Teşekkürler!';
   form.querySelectorAll('input,textarea').forEach(input=>input.disabled=true);
   submit.textContent='Gönderildi';
   form.onchange=null;
   if(p.isConnected)close.focus({preventScroll:true});
  }catch(e){
   status.dataset.error='true';
   status.textContent=e.message||'Bildirim gönderilemedi. Tekrar dene.';
   submit.textContent='Tekrar dene';
   submit.disabled=!options.querySelector('input:checked');
  }finally{
   sending=false;
  }
 };
}
async function openAdmin(){if(!admin())return;const p=sheet('Soru Hata Raporları'),body=el('div');p.append(body);async function load(){body.textContent='Yükleniyor…';try{const {reports}=await call('questionReportList',{},true);body.replaceChildren();const groups=new Map();for(const r of reports){if(!groups.has(r.fingerprint))groups.set(r.fingerprint,[]);groups.get(r.fingerprint).push(r);}const filter=el('select');for(const [v,t] of [['all','Tümü'],['pending','Bekliyor'],['reviewing','İnceleniyor'],['resolved','Çözüldü']]){const o=el('option',t);o.value=v;filter.append(o);}const list=el('div');body.append(el('p',groups.size+' farklı soru · '+reports.length+' bildirim'),filter,list);function paint(){list.replaceChildren();for(const rows of groups.values()){const r=rows[0];if(filter.value!=='all'&&r.status!==filter.value)continue;const box=el('article');box.append(el('h3',r.snapshot.task.prompt||r.snapshot.task.label||'Soru'),el('p',r.snapshot.route+' · '+r.snapshot.chapter+' · '+(Number(r.snapshot.cursor)+1)+'. adım · '+rows.length+' öğrenci'),el('p',[...new Set(rows.flatMap(x=>x.reasons))].map(x=>labels[x]||x).join(' · ')));const detail=el('details');detail.append(el('summary','Soru ve bildirim ayrıntıları'),el('pre',JSON.stringify(rows.map(x=>({student:x.student_id,date:x.created_at,note:x.note,snapshot:x.snapshot})),null,2)));box.append(detail);const select=el('select');for(const [v,t] of [['pending','Bekliyor'],['reviewing','İnceleniyor'],['resolved','Çözüldü']]){const o=el('option',t);o.value=v;select.append(o);}select.value=r.status;select.onchange=async()=>{select.disabled=true;try{await call('questionReportStatus',{fingerprint:r.fingerprint,status:select.value},true);rows.forEach(x=>x.status=select.value);paint();}catch(e){alert(e.message);select.value=r.status;select.disabled=false;}};box.append(select);list.append(box);}if(!list.children.length)list.append(el('p','Bildirim yok.'));}filter.onchange=paint;paint();}catch(e){body.textContent=e.message;}}const refresh=el('button','Yenile');refresh.onclick=load;p.append(refresh);load();}
function tile(){const parent=document.querySelector('#tpDashboard .tp-real-tools');if(!parent)return;const old=parent.querySelector('[data-question-reports]');if(!admin()){old?.remove();return;}if(old)return;const b=el('button');b.dataset.questionReports='1';b.append(el('span','⚠'),el('strong','Soru Hata Raporları'),el('small','Öğrenci bildirimleri'));b.onclick=openAdmin;parent.append(b);}
const st=el('style');st.textContent=`.qr-veil{position:fixed;inset:0;z-index:2147483647;background:#0008;display:flex;align-items:flex-end;justify-content:center}.qr-panel{box-sizing:border-box;width:min(100%,650px);max-height:90dvh;overflow:auto;background:#fff;color:#17363b;border-radius:22px 22px 0 0;padding:20px 20px calc(20px + env(safe-area-inset-bottom));font:15px/1.4 system-ui}.qr-panel header{display:flex;align-items:center;justify-content:space-between}.qr-panel h2{font-size:21px}.qr-panel label{display:flex;align-items:center;gap:10px;padding:10px 0}.qr-panel input{width:20px;height:20px}.qr-panel textarea{box-sizing:border-box;width:100%;min-height:75px;margin:10px 0}.qr-panel button,.qr-panel select{padding:10px;border:0;border-radius:10px;background:#187f58;color:#fff;font:700 15px system-ui}.qr-panel button:disabled{opacity:.5}.qr-panel article{border:1px solid #ddd;border-radius:12px;margin:12px 0;padding:12px}.qr-panel pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}.qr-panel details{margin:8px 0}@media(prefers-color-scheme:dark){.qr-panel{background:#202b40;color:#fff}}
.qr-student-veil{
  inset:var(--qr-top,0px) 0 auto;height:var(--qr-height,100dvh);box-sizing:border-box;
  align-items:center;padding:max(12px,env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) max(12px,env(safe-area-inset-bottom,0px)) max(12px,env(safe-area-inset-left,0px));
  background:#10223e81;
}
.qr-panel.qr-student{
  --qr-surface:#fff;--qr-text:#172a47;--qr-muted:#4e627a;--qr-tile:#f4f7fc;--qr-line:#e1e8f3;
  --qr-accent:#126b50;--qr-active:#e9f8f0;--qr-selected:#2b946c;
  --qr-icon:#315cb8;--qr-icon-bg:#e4ecff;--qr-disabled:#e8edf5;--qr-error:#a32238;
  display:flex;flex-direction:column;gap:12px;width:min(100%,520px);min-height:0;max-height:100%;
  overflow:hidden;padding:16px;border:1px solid var(--qr-line);border-radius:24px;
  background:var(--qr-surface);color:var(--qr-text);box-shadow:0 18px 55px #0c1d4042;
  font:14px/1.25 Nunito,system-ui,sans-serif;
}
html[data-dm-theme="night"] .qr-panel.qr-student{
  --qr-surface:#17253d;--qr-text:#f4f8ff;--qr-muted:#b9c9dd;--qr-tile:#22324e;--qr-line:#354969;
  --qr-accent:#a0e9c7;--qr-active:#173f39;--qr-selected:#66c9a4;
  --qr-icon:#acd1ff;--qr-icon-bg:#314c76;--qr-disabled:#2a3a54;--qr-error:#ffb2bc;
}
.qr-student header{
  display:grid!important;position:static!important;visibility:visible!important;grid-template-columns:38px minmax(0,1fr) 42px;
  align-items:center;gap:9px;flex:none;
}
.qr-student h2{display:block!important;margin:0;color:var(--qr-text);font-size:22px;font-weight:900;line-height:1.1}
.qr-student header p{margin:3px 0 0;color:var(--qr-muted);font-size:12px}
.qr-student :is(.qr-title-icon,.qr-icon,header button){display:grid;place-items:center;flex:none}
.qr-student .qr-title-icon{width:38px;height:38px;border-radius:12px;color:var(--qr-accent);background:var(--qr-active)}
.qr-student header button{width:42px;height:42px;padding:0;border:0;border-radius:12px;color:var(--qr-muted);background:var(--qr-tile)}
.qr-student svg{display:block;width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.qr-student .qr-title-icon svg{width:21px;height:21px}
.qr-student form{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;margin:0}
.qr-student .qr-fields{min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:3px;margin:-3px}
.qr-student .qr-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.qr-student .qr-option{
  position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:6px;
  min-height:50px;margin:0;padding:6px;box-sizing:border-box;cursor:pointer;overflow-wrap:anywhere;
  border:1px solid var(--qr-line);border-radius:12px;background:var(--qr-tile);color:var(--qr-text);
  font-size:clamp(12px,3.4vw,14px);font-weight:800;line-height:1.12;
}
.qr-student .qr-icon{width:26px;height:26px;border-radius:8px;color:var(--qr-icon);background:var(--qr-icon-bg)}
.qr-student .qr-icon svg{width:15px;height:15px}
.qr-student .qr-option input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}
.qr-student .qr-check{
  display:grid;place-items:center;width:15px;height:15px;box-sizing:border-box;border:1px solid var(--qr-muted);
  border-radius:5px;background:var(--qr-surface);
}
.qr-student .qr-option:has(input:checked){border-color:var(--qr-selected);background:var(--qr-active)}
.qr-student input:checked~.qr-check{border-color:#137452;background:#137452}
.qr-student input:checked~.qr-check::after{content:'';width:6px;height:3px;border:solid #fff;border-width:0 0 2px 2px;transform:translateY(-1px) rotate(-45deg)}
.qr-student :is(button,textarea):focus-visible,.qr-student .qr-option:has(input:focus-visible){outline:2px solid var(--qr-icon);outline-offset:1px}
.qr-student .qr-note-label{display:block;margin-top:11px;padding:0;color:var(--qr-text);font-size:13px;font-weight:800}
.qr-student .qr-note-label small{margin-inline-start:6px;color:var(--qr-muted);font-size:11px;font-weight:650}
.qr-student textarea{
  display:block;width:100%;min-height:56px;margin:4px 0 0;padding:7px 9px;resize:vertical;
  border:1px solid var(--qr-line);border-radius:11px;background:var(--qr-tile);color:var(--qr-text);font:16px/1.25 Nunito,system-ui,sans-serif;
}
.qr-student textarea::placeholder{color:var(--qr-muted)}
.qr-student .qr-actions{flex:none;padding-top:10px}
.qr-student .qr-actions p{margin:0 0 5px;color:var(--qr-accent);font-size:13px;font-weight:800}
.qr-student .qr-actions p:empty{margin:0}
.qr-student .qr-actions p[data-error]{color:var(--qr-error)}
.qr-student .qr-actions button{
  width:100%;min-height:44px;padding:8px;border-radius:12px;background:#137452;color:#fff;
  box-shadow:0 2px #0e543e;font:850 15px/1.2 Nunito,system-ui,sans-serif;
}
.qr-student .qr-actions button:disabled{opacity:1;background:var(--qr-disabled);color:var(--qr-muted);box-shadow:none}
@media(max-width:540px){.qr-student-veil{align-items:flex-end}.qr-panel.qr-student{padding:12px;gap:10px}}
@media(max-width:350px){.qr-student .qr-option{gap:4px}.qr-student .qr-icon{width:21px;height:23px}}
`;document.head.append(st);new MutationObserver(tile).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('dm:teacher-admin-role-verified',tile);window.dmQuestionReports={report,openAdmin};tile();
})();